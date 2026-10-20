"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { toast } from "sonner";

export type EditableScore = number | "";
export type MarkEntry = { coursework: EditableScore; exam: EditableScore };
export type StudentFilter = "all" | "incomplete" | "complete" | "passed" | "below-pass";

export const MAX_COURSEWORK = 30;
export const MAX_EXAM = 70;
const PASS_MARK = 50;

export function useClassResultsEntry(courseId: Id<"courses">) {
  const course = useQuery(api.courses.getCourseById, { id: courseId });
  const gradebook = useQuery(api.marks.getCourseGradebook, { courseId });
  const saveGradebookDraft = useMutation(api.marks.saveGradebookDraft);
  const submitGradebookToHOD = useMutation(api.marks.submitGradebookToHOD);
  const [marks, setMarks] = useState<Map<Id<"students">, MarkEntry>>(new Map());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);

  useEffect(() => {
    if (!gradebook) return;
    setMarks(new Map(gradebook.students.map((student) => [student.studentId, {
      coursework: student.courseworkMarks,
      exam: student.examMarks,
    }])));
    setDirty(false);
  }, [gradebook]);

  const students = gradebook?.students ?? [];
  const currentScore = (studentId: Id<"students">, field: keyof MarkEntry) => {
    const score = marks.get(studentId)?.[field];
    return score === undefined ? 0 : score === "" ? 0 : score;
  };
  const filteredStudents = useMemo(() => students.filter((student) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [student.studentName, student.studentAccessNumber, student.studentRegNumber]
      .some((value) => value.toLowerCase().includes(query));
    const coursework = marks.get(student.studentId)?.coursework ?? student.courseworkMarks;
    const exam = marks.get(student.studentId)?.exam ?? student.examMarks;
    const cwScore = coursework === "" ? 0 : coursework;
    const examScore = exam === "" ? 0 : exam;
    const total = cwScore + examScore;
    const matchesFilter = filter === "all"
      || (filter === "incomplete" && (cwScore === 0 || examScore === 0))
      || (filter === "complete" && cwScore > 0 && examScore > 0)
      || (filter === "passed" && total >= PASS_MARK)
      || (filter === "below-pass" && cwScore > 0 && examScore > 0 && total < PASS_MARK);
    return matchesSearch && matchesFilter;
  }).sort((left, right) => sortAscending
    ? left.studentName.localeCompare(right.studentName)
    : right.studentName.localeCompare(left.studentName)), [students, marks, search, filter, sortAscending]);

  const average = (field: keyof MarkEntry) => students.length
    ? (students.reduce((sum, student) => sum + currentScore(student.studentId, field), 0) / students.length).toFixed(1)
    : "0.0";
  const averageFinal = students.length
    ? (students.reduce((sum, student) => sum + currentScore(student.studentId, "coursework") + currentScore(student.studentId, "exam"), 0) / students.length).toFixed(1)
    : "0.0";

  const updateMark = (studentId: Id<"students">, field: keyof MarkEntry, input: string) => {
    const maximum = field === "coursework" ? MAX_COURSEWORK : MAX_EXAM;
    const value: EditableScore = input === "" ? "" : Math.min(maximum, Math.max(0, Number(input)));
    setMarks((current) => {
      const next = new Map(current);
      const previous = next.get(studentId) ?? { coursework: 0, exam: 0 };
      next.set(studentId, { ...previous, [field]: value });
      return next;
    });
    setDirty(true);
  };

  const importCsv = (contents: string) => {
    const rows = contents.split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))).filter((row) => row.length >= 3);
    const dataRows = rows[0]?.[0]?.toLowerCase().includes("reg") ? rows.slice(1) : rows;
    const studentsByReg = new Map(students.map((student) => [student.studentRegNumber.toLowerCase(), student]));
    let imported = 0;
    const next = new Map(marks);
    for (const [registrationNumber, coursework, exam] of dataRows) {
      if (!registrationNumber || coursework === undefined || exam === undefined) continue;
      const student = studentsByReg.get(registrationNumber.toLowerCase());
      const cwValue = Number(coursework);
      const examValue = Number(exam);
      if (!student || coursework === "" || exam === "" || !Number.isFinite(cwValue) || !Number.isFinite(examValue)
        || cwValue < 0 || cwValue > MAX_COURSEWORK || examValue < 0 || examValue > MAX_EXAM) continue;
      next.set(student.studentId, { coursework: cwValue, exam: examValue });
      imported++;
    }
    if (imported) {
      setMarks(next);
      setDirty(true);
    }
    return imported;
  };

  const persist = async () => {
    if (!gradebook?.period) return false;
    await saveGradebookDraft({
      courseId,
      periodId: gradebook.period._id,
      marks: students.map((student) => ({
        studentId: student.studentId,
        courseworkMarks: currentScore(student.studentId, "coursework"),
        examMarks: currentScore(student.studentId, "exam"),
      })),
    });
    setDirty(false);
    return true;
  };

  const save = async () => {
    try {
      setSaving(true);
      if (await persist()) toast.success("Marks saved as a draft");
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not save marks"));
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!gradebook?.period) return;
    try {
      setSubmitting(true);
      if (dirty) await persist();
      await submitGradebookToHOD({ courseId, periodId: gradebook.period._id });
      toast.success("Marks sent to the Head of Department for review");
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not submit marks"));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    course, gradebook, students, filteredStudents, marks, search, setSearch,
    filter, setFilter, dirty, saving, submitting, sortAscending,
    toggleSort: () => setSortAscending((value) => !value),
    updateMark, importCsv, save, submit, currentScore, average, averageFinal,
    isLoading: course === undefined || gradebook === undefined,
    isLocked: gradebook?.overallStatus === "submitted" || gradebook?.overallStatus === "approved",
  };
}
