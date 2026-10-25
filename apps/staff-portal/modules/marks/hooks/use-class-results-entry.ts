"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { toast } from "sonner";

export type EditableScore = number | "";
export type MarkEntry = { coursework: EditableScore; exam: EditableScore };
export type StudentFilter = "all" | "incomplete" | "complete" | "passed" | "below-pass";
export const MAX_COURSEWORK = 30;
export const MAX_EXAM = 70;
const PASS_MARK = 50;

type Gradebook = NonNullable<ReturnType<typeof useQuery<typeof api.gradebook.getCourseGradebook>>>;
type GradebookStudent = Gradebook["students"][number];

export function useClassResultsEntry(courseId: Id<"courses">) {
  const searchParams = useSearchParams();
  const requestedPeriodId = searchParams.get("periodId");
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const pageCursor = cursorHistory.at(-1) ?? null;
  const course = useQuery(api.courses.getCourseById, { id: courseId });
  const gradebook = useQuery(api.gradebook.getCourseGradebook, {
    courseId,
    ...(requestedPeriodId ? { periodId: requestedPeriodId as Id<"academicPeriods"> } : {}),
    cursor: pageCursor,
  });
  const saveGradebookDraft = useMutation(api.markEntry.saveGradebookDraft);
  const submitGradebookToHOD = useMutation(api.markEntry.submitGradebookToHOD);
  const [marks, setMarks] = useState<Map<Id<"students">, MarkEntry>>(new Map());
  const [baseline, setBaseline] = useState<Map<Id<"students">, MarkEntry>>(new Map());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);
  const [now, setNow] = useState(Date.now());
  const page = gradebook;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!page || dirty) return;
    const next = new Map(page.students.map(student => [student.studentId, {
      coursework: student.courseworkEntered ? student.courseworkMarks : "",
      exam: student.examEntered ? student.examMarks : "",
    } satisfies MarkEntry]));
    setMarks(next);
    setBaseline(next);
  }, [page, dirty]);

  const students = page?.students ?? [];
  const currentScore = (studentId: Id<"students">, field: keyof MarkEntry) => {
    const value = marks.get(studentId)?.[field];
    return value === undefined || value === "" ? 0 : value;
  };
  const editable = (student: GradebookStudent, field?: keyof MarkEntry) => {
    if (!page?.isLecturer || page.period.status === "upcoming") return false;
    const grant = student.permission;
    const actualGrant = !!grant && grant.status === "granted" && grant.startsAt <= now && now < grant.expiresAt;
    const ordinary = page.period.status === "active" && (!page.entriesCloseAt || now < page.entriesCloseAt)
      && ["draft", "returned"].includes(student.status) && !student.requiresPermission;
    if (ordinary) return true;
    return actualGrant && (!field || grant?.components.includes(field === "coursework" ? "coursework" : "exam"));
  };
  const filteredStudents = useMemo(() => students.filter(student => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [student.studentName, student.studentAccessNumber, student.studentRegNumber].some(value => value.toLowerCase().includes(query));
    const value = marks.get(student.studentId);
    const cw = value?.coursework ?? (student.courseworkEntered ? student.courseworkMarks : "");
    const exam = value?.exam ?? (student.examEntered ? student.examMarks : "");
    const total = Number(cw || 0) + Number(exam || 0);
    const matchesFilter = filter === "all" || (filter === "incomplete" && (cw === "" || exam === ""))
      || (filter === "complete" && cw !== "" && exam !== "") || (filter === "passed" && total >= PASS_MARK)
      || (filter === "below-pass" && cw !== "" && exam !== "" && total < PASS_MARK);
    return matchesSearch && matchesFilter;
  }).sort((left, right) => sortAscending ? left.studentName.localeCompare(right.studentName) : right.studentName.localeCompare(left.studentName)), [students, marks, search, filter, sortAscending]);
  const average = (field: keyof MarkEntry) => students.length ? (students.reduce((sum, student) => sum + currentScore(student.studentId, field), 0) / students.length).toFixed(1) : "0.0";
  const averageFinal = students.length ? (students.reduce((sum, student) => sum + currentScore(student.studentId, "coursework") + currentScore(student.studentId, "exam"), 0) / students.length).toFixed(1) : "0.0";
  const updateMark = (studentId: Id<"students">, field: keyof MarkEntry, input: string) => {
    const max = field === "coursework" ? MAX_COURSEWORK : MAX_EXAM;
    const value: EditableScore = input === "" ? "" : Number.isFinite(Number(input)) ? Math.min(max, Math.max(0, Number(input))) : "";
    setMarks(current => { const next = new Map(current); next.set(studentId, { ...(next.get(studentId) ?? { coursework: "", exam: "" }), [field]: value }); return next; });
    setDirty(true);
  };
  const changedStudents = () => students.filter(student => {
    const current = marks.get(student.studentId);
    const previous = baseline.get(student.studentId);
    return current && previous && (current.coursework !== previous.coursework || current.exam !== previous.exam);
  });
  const importCsv = (contents: string) => {
    const rows = contents.split(/\r?\n/).map(line => line.split(",").map(cell => cell.trim().replace(/^"|"$/g, ""))).filter(row => row.length >= 3);
    const dataRows = rows[0]?.[0]?.toLowerCase().includes("reg") ? rows.slice(1) : rows;
    const byReg = new Map(students.filter(student => editable(student)).map(student => [student.studentRegNumber.toLowerCase(), student]));
    const next = new Map(marks); let imported = 0;
    for (const [registrationNumber, coursework, exam] of dataRows) {
      const student = registrationNumber ? byReg.get(registrationNumber.toLowerCase()) : undefined;
      const cw = Number(coursework); const ex = Number(exam);
      if (!student || !Number.isFinite(cw) || cw < 0 || cw > MAX_COURSEWORK || !Number.isFinite(ex) || ex < 0 || ex > MAX_EXAM) continue;
      const previous = next.get(student.studentId) ?? { coursework: "", exam: "" };
      next.set(student.studentId, { coursework: editable(student, "coursework") ? cw : previous.coursework,
        exam: editable(student, "exam") ? ex : previous.exam }); imported++;
    }
    if (imported) { setMarks(next); setDirty(true); }
    return imported;
  };
  const persist = async () => {
    if (!page?.period) return [];
    const changed = changedStudents();
    if (!changed.length) { setDirty(false); return []; }
    const result = await saveGradebookDraft({ courseId, periodId: page.period._id, marks: changed.map(student => ({
      studentId: student.studentId, revision: student.revision,
      courseworkMarks: marks.get(student.studentId)?.coursework === "" ? null : Number(marks.get(student.studentId)?.coursework),
      examMarks: marks.get(student.studentId)?.exam === "" ? null : Number(marks.get(student.studentId)?.exam),
    })) });
    setDirty(false);
    return result.revisions;
  };
  const save = async () => { try { setSaving(true); const revisions = await persist(); if (revisions.length) toast.success("Changed marks saved as drafts"); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not save marks")); } finally { setSaving(false); } };
  const submit = async () => {
    if (!page?.period) return;
    try {
      setSubmitting(true);
      let revisions = dirty ? await persist() : [];
      const revisionByStudent = new Map(revisions.map(row => [row.studentId, row.revision]));
      const submitted = students.filter(student => editable(student) && (marks.get(student.studentId)?.coursework ?? "") !== "" && (marks.get(student.studentId)?.exam ?? "") !== "");
      if (!submitted.length) throw new Error("Enter both marks for at least one editable student before submitting.");
      await submitGradebookToHOD({ courseId, periodId: page.period._id, rows: submitted.map(student => ({ studentId: student.studentId, revision: revisionByStudent.get(student.studentId) ?? student.revision })) });
      toast.success(`${submitted.length} student marks sent to the Head of Department`);
      return true;
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit marks")); return false; }
    finally { setSubmitting(false); }
  };
  return {
    course, gradebook: page ?? gradebook, students, filteredStudents, marks, search, setSearch, filter, setFilter,
    dirty, saving, submitting, sortAscending, toggleSort: () => setSortAscending(value => !value), updateMark,
    importCsv, save, submit, currentScore, average, averageFinal, editable, isLecturer: !!page?.isLecturer,
    isLoading: course === undefined || gradebook === undefined || page === undefined,
    isLocked: !students.some(student => editable(student)), cursorHistory,
    previousPage: () => { if (dirty) return; setCursorHistory(history => history.slice(0, -1)); },
    nextPage: () => { if (dirty || !page || page.isDone) return; setCursorHistory(history => [...history, page.continueCursor]); },
    canNextPage: !!page && !page.isDone, canPreviousPage: cursorHistory.length > 1,
  };
}
