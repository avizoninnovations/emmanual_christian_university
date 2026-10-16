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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
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
  const [showInfo, setShowInfo] = useState(false);
  const data = useQuery(api.student_portal.getMyAcademicResults);

  if (!data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Retrieving examination results and transcripts...</p>
      </div>
    );
  }

  const { student, semesters, cumulative } = data;
  const curriculumGroups = useMemo(() => {
    const groups = new Map<number, typeof semesters>();
    semesters.forEach((semester) => semester.courses.forEach((course) => {
      const year = course.yearOfStudy ?? 1;
      const rows = groups.get(year) ?? [];
      const existing = rows.find((row) => row.periodId === semester.periodId);
      if (existing) existing.courses.push(course);
      else rows.push({ ...semester, courses: [course] });
      groups.set(year, rows);
    }));
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [semesters]);
  const displaySemesters = transcriptView === "semester"
    ? semesters
    : curriculumGroups.map(([year, rows]) => {
        const first = rows[0]!;
        const courses = rows.flatMap((row) => row.courses);
        const approved = courses.filter((course) => course.status === "approved");
        const credits = approved.reduce((total, course) => total + course.creditUnits, 0);
        const gradePoints = credits > 0
          ? approved.reduce((total, course) => total + course.gradePoints * course.creditUnits, 0) / credits
          : 0;
        return {
          ...first,
          periodId: `curriculum-year-${year}`,
          periodName: `Year ${year}`,
          courses,
          semesterCreditUnits: credits,
          semesterGPA: Number(gradePoints.toFixed(2)),
        };
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full print:p-0">
      {/* ── Official Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">My Transcripts</h1>
            <Badge variant="outline" className="text-xs">{student.programName}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            View your partial transcript by semester or curriculum year.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 print:hidden">
          <Printer className="size-3.5" /> Print Transcript
        </Button>
      </div>

      <Card className="shadow-sm print:hidden">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Important Information to Note</p>
            <p className="text-xs text-muted-foreground">View your partial transcript and academic progress.</p>
            {showInfo && <p className="mt-2 max-w-2xl text-sm text-slate-600">Only results released by the university are shown here. Contact the Academic Registrar if a published result appears to be missing.</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowInfo((value) => !value)} aria-expanded={showInfo}>
            {showInfo ? "Hide information" : "Show important information"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-sm print:hidden" role="tablist" aria-label="Transcript views">
        {(["semester", "curriculum"] as const).map((view) => (
          <Button key={view} variant="ghost" role="tab" aria-selected={transcriptView === view} onClick={() => setTranscriptView(view)} className={transcriptView === view ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-slate-600"}>
            {view === "semester" ? "Semester Based" : "Curriculum Based"}
          </Button>
        ))}
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200/70">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{student.name}</h2>
            <p className="text-sm text-slate-500">{student.programName}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div><dt className="text-xs text-slate-500">Registration number</dt><dd className="mt-1 font-medium text-slate-800">{student.registrationNumber}</dd></div>
            <div><dt className="text-xs text-slate-500">Faculty</dt><dd className="mt-1 font-medium text-slate-800">{student.facultyName}</dd></div>
            <div><dt className="text-xs text-slate-500">Current year</dt><dd className="mt-1 font-medium text-slate-800">Year {student.yearOfStudy}</dd></div>
            <div><dt className="text-xs text-slate-500">Current semester</dt><dd className="mt-1 font-medium text-slate-800">{student.currentSemester}</dd></div>
            <div><dt className="text-xs text-slate-500">Current CGPA</dt><dd className="mt-1 font-medium text-slate-800">{cumulative.cgpa.toFixed(2)}</dd></div>
            <div><dt className="text-xs text-slate-500">Academic standing</dt><dd className="mt-1 font-medium text-slate-800">{cumulative.academicStanding}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Semester Results Tables ── */}
      {semesters.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Award className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No Examination Marks Published Yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Your marks will appear here once approved by the Head of Department (HOD) and the Faculty Board of Examiners.
          </p>
        </Card>
      ) : (
        displaySemesters.map((sem) => (
          <Card key={sem.periodId} className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {transcriptView === "semester" ? `${sem.periodName} (${sem.year})` : sem.periodName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {transcriptView === "semester" ? `Term ${sem.term} Examination Session` : "Curriculum year results"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="outline" className="bg-background">
                    {transcriptView === "semester" ? "Semester Credits" : "Year Credits"}: {sem.semesterCreditUnits} CU
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold">
                    {transcriptView === "semester" ? "Semester GPA" : "Year GPA"}: {sem.semesterGPA.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Course</TableHead>
                    <TableHead className="w-28 text-center">Mark</TableHead>
                    <TableHead className="w-20 text-center">CU</TableHead>
                    <TableHead className="w-20 text-center">GP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sem.courses.map((course) => (
                    <TableRow key={course.assessmentId || course.courseId} className="hover:bg-muted/20">
                      <TableCell className="pl-6">
                        <span className="block font-medium text-sm text-foreground">{course.title}</span>
                        <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-sm">
                        <span className={course.status === "approved" ? "text-foreground" : "text-slate-400"}>
                          {course.status === "approved" ? course.finalScore : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {course.creditUnits}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {course.status === "approved" ? course.gradePoints.toFixed(1) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
