"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@workspace/backend/_generated/api";
import {
  Award,
  Printer,
  Loader2,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export function AcademicResultsView() {
  const [transcriptView, setTranscriptView] = useState<"semester" | "curriculum">("semester");
  const data = useQuery(api.student_portal.getMyAcademicResults);
  const curriculumGroups = useMemo(() => {
    if (!data) return [];
    const groups = new Map<number, typeof data.semesters>();
    data.semesters.forEach((semester) => semester.courses.forEach((course) => {
      const key = (course.yearOfStudy ?? 1) * 10 + (course.plannedSemester ?? 1);
      const rows = groups.get(key) ?? [];
      const existing = rows.find((row) => row.periodId === semester.periodId);
      if (existing) existing.courses.push(course);
      else rows.push({ ...semester, courses: [course] });
      groups.set(key, rows);
    }));
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [data]);

  if (!data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Retrieving examination results and transcripts...</p>
      </div>
    );
  }

  const { student, semesters, cumulative } = data;
  const displaySemesters = transcriptView === "semester"
    ? semesters
    : curriculumGroups.map(([key, rows]) => {
        const year = Math.floor(key / 10);
        const term = key % 10;
        const first = rows[0]!;
        const courses = rows.flatMap((row) => row.courses);
        const approved = courses.filter((course) => course.status === "approved");
        const credits = approved.reduce((total, course) => total + course.creditUnits, 0);
        const gradePoints = credits > 0
          ? approved.reduce((total, course) => total + course.gradePoints * course.creditUnits, 0) / credits
          : 0;
        return {
          ...first,
          periodId: `curriculum-${year}-${term}`,
          periodName: `Year ${year}`,
          term,
          courses,
          semesterCreditUnits: credits,
          semesterGPA: Number(gradePoints.toFixed(2)),
        };
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="student-partial-transcript space-y-3 p-5 sm:p-6 lg:p-8 print:p-0">
      <h1 className="text-base font-semibold text-foreground">My Transcripts</h1>

      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 bg-card px-0 print:hidden" role="tablist" aria-label="Transcript views">
        <div className="flex items-center">
          {(["semester", "curriculum"] as const).map((view) => (
            <Button key={view} variant="ghost" role="tab" aria-selected={transcriptView === view} onClick={() => setTranscriptView(view)} className={`h-9 rounded-none px-4 text-xs ${transcriptView === view ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground"}`}>
              {view === "semester" ? "Semester Based" : "Curriculum Based"}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={handlePrint} className="mr-2 gap-2 text-primary"><Printer className="size-3.5" />Print Transcript</Button>
      </div>

      <Card className="gap-0 overflow-hidden rounded-lg border-0 py-0 shadow-sm ring-1 ring-foreground/5">
        <div className="relative flex min-h-12 items-center justify-between overflow-hidden bg-primary px-3 py-2 text-primary-foreground sm:px-5">
          <h2 className="text-sm font-medium">View your partial transcript</h2>
          <Award className="size-5" />
        </div>
        <CardContent className="p-3 sm:p-4">
          <div className="border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
              <span className="font-semibold uppercase text-foreground">{student.name}</span>
              <span className="text-muted-foreground">{student.programName}</span>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px]">
              <TranscriptMeta label="Registration number" value={student.registrationNumber} />
              <TranscriptMeta label="Access number" value={student.accessNumber || "—"} />
              <TranscriptMeta label="Faculty" value={student.facultyName} />
              <TranscriptMeta label="Current year" value={`Year ${student.yearOfStudy}`} />
              <TranscriptMeta label="Current semester" value={`Semester ${student.currentTerm}`} />
              <TranscriptMeta label="Current CGPA" value={cumulative.cgpa.toFixed(2)} />
            </dl>
          </div>

          {semesters.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="mx-auto mb-3 size-10 text-muted-foreground opacity-40" />
              <h3 className="text-sm font-semibold">No Examination Marks Published Yet</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Your marks will appear here once approved by the Academic Registrar.</p>
            </div>
          ) : (
            <div className="grid gap-x-10 gap-y-4 pt-3 lg:grid-cols-2">
              {displaySemesters.map((sem) => (
                <section key={sem.periodId} className="min-w-0 break-inside-avoid" aria-label={`${sem.periodName} semester ${sem.term}`}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2 border-b border-foreground/60 px-1 pb-0.5 text-[10px] font-semibold uppercase text-foreground">
                    <h3>{`${sem.periodName} ${sem.year} · Year ${sem.courses[0]?.yearOfStudy ?? 1}`}</h3>
                    <span>Semester {sem.term}</span>
                    <span className="text-right">GPA {sem.semesterGPA.toFixed(2)}</span>
                  </div>
                  <Table className="text-[10px]">
                    <TableHeader>
                      <TableRow className="h-5 hover:bg-transparent">
                        <TableHead className="h-5 px-1 text-[10px] font-semibold uppercase">Course</TableHead>
                        <TableHead className="h-5 w-16 px-1 text-center text-[10px] font-semibold uppercase">Mark</TableHead>
                        <TableHead className="h-5 w-10 px-1 text-center text-[10px] font-semibold uppercase">CU</TableHead>
                        <TableHead className="h-5 w-10 px-1 text-center text-[10px] font-semibold uppercase">GP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sem.courses.map((course) => (
                        <TableRow key={course.assessmentId || course.courseId} className="h-6 border-0 hover:bg-muted/30">
                          <TableCell className="max-w-0 truncate px-1 py-1 text-[10px] text-muted-foreground" title={course.title}>{course.title}</TableCell>
                          <TableCell className="px-1 py-1 text-center text-[10px] text-muted-foreground">{course.status === "approved" ? course.resultCode || course.finalScore : "—"}</TableCell>
                          <TableCell className="px-1 py-1 text-center text-[10px] text-muted-foreground">{course.creditUnits}</TableCell>
                          <TableCell className="px-1 py-1 text-center text-[10px] text-muted-foreground">{course.status === "approved" ? course.gradePoints.toFixed(1) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function TranscriptMeta({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-1"><dt className="text-muted-foreground">{label}:</dt><dd className="font-medium text-foreground">{value}</dd></div>;
}
