"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Award,
  BookOpen,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  Download,
  Loader2,
  Calendar,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full print:p-0">
      {/* ── Official Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Academic Results & Transcripts</h1>
            <Badge variant="outline" className="text-xs">
              4.0 GPA Standard
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Continuous assessment (30%) and final examination (70%) performance record.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 print:hidden">
          <Printer className="size-3.5" /> Print Unofficial Transcript
        </Button>
      </div>

      {/* ── Academic Standing & Cumulative Summary Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CGPA Card */}
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold text-foreground">
                  {cumulative.cgpa > 0 ? cumulative.cgpa.toFixed(2) : "—"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">/ 4.00</span>
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Cumulative GPA (CGPA)
                </p>
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Award className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Degree Honours Classification */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-blue-600 line-clamp-1">
                  {cumulative.cgpa > 0 ? cumulative.degreeClassification : "Under Review"}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Projected Degree Honours
                </p>
              </div>
              <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <GraduationCap className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Credit Units */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {cumulative.totalCreditUnits}{" "}
                  <span className="text-sm font-normal text-muted-foreground">CU</span>
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Cumulative Credit Units Earned
                </p>
              </div>
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <BookOpen className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── South Sudan Higher Education Grading Scale Legend ── */}
      <Card className="border shadow-sm print:hidden">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              South Sudan National University Grading Scale (4.0 GPA Model)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
              <div className="bg-muted/40 p-2 rounded-md">
                <span className="font-bold text-emerald-600">A (4.0)</span>
                <span className="text-[10px] text-muted-foreground block">&ge; 80% (Excellent)</span>
              </div>
              <div className="bg-muted/40 p-2 rounded-md">
                <span className="font-bold text-blue-600">B+ (3.5)</span>
                <span className="text-[10px] text-muted-foreground block">70 – 79% (Very Good)</span>
              </div>
              <div className="bg-muted/40 p-2 rounded-md">
                <span className="font-bold text-blue-600">B (3.0)</span>
                <span className="text-[10px] text-muted-foreground block">60 – 69% (Good)</span>
              </div>
              <div className="bg-muted/40 p-2 rounded-md">
                <span className="font-bold text-amber-600">C+ (2.5)</span>
                <span className="text-[10px] text-muted-foreground block">55 – 59% (Fairly Good)</span>
              </div>
              <div className="bg-muted/40 p-2 rounded-md">
                <span className="font-bold text-amber-600">C (2.0)</span>
                <span className="text-[10px] text-muted-foreground block">50 – 54% (Pass Mark)</span>
              </div>
              <div className="bg-muted/40 p-2 rounded-md">
                <span className="font-bold text-orange-600">D (1.0)</span>
                <span className="text-[10px] text-muted-foreground block">40 – 49% (Supplementary)</span>
              </div>
              <div className="bg-muted/40 p-2 rounded-md">
                <span className="font-bold text-rose-600">F (0.0)</span>
                <span className="text-[10px] text-muted-foreground block">&lt; 40% (Repeat)</span>
              </div>
            </div>
          </div>
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
        semesters.map((sem) => (
          <Card key={sem.periodId} className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {sem.periodName} ({sem.year})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Term {sem.term} Examination Session
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="outline" className="bg-background">
                    Semester Credits: {sem.semesterCreditUnits} CU
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold">
                    Semester GPA: {sem.semesterGPA.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6 w-32">Course Code</TableHead>
                    <TableHead>Course Title</TableHead>
                    <TableHead className="w-16 text-center">CU</TableHead>
                    <TableHead className="w-24 text-center">CW (30)</TableHead>
                    <TableHead className="w-24 text-center">Exam (70)</TableHead>
                    <TableHead className="w-24 text-center font-bold">Total (100)</TableHead>
                    <TableHead className="w-16 text-center">Grade</TableHead>
                    <TableHead className="w-16 text-center">GP</TableHead>
                    <TableHead className="text-right pr-6 w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sem.courses.map((course) => (
                    <TableRow key={course.assessmentId || course.courseId} className="hover:bg-muted/20">
                      <TableCell className="pl-6 font-mono font-bold text-sm">
                        {course.code}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {course.title}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {course.creditUnits}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {course.courseworkMarks}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {course.examMarks}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-sm">
                        <span className={course.finalScore >= 50 ? "text-foreground" : "text-rose-600 font-bold"}>
                          {course.finalScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            course.grade === "A"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 font-bold"
                              : course.grade.startsWith("B")
                              ? "bg-blue-500/10 text-blue-600 border-blue-200"
                              : course.grade.startsWith("C")
                              ? "bg-amber-500/10 text-amber-600 border-amber-200"
                              : course.grade === "D"
                              ? "bg-orange-500/10 text-orange-600 border-orange-200"
                              : "bg-rose-500/10 text-rose-600 border-rose-200 font-bold"
                          }
                        >
                          {course.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {course.gradePoints.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {course.isSupplementaryEligible ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 text-[10px]">
                            Supplementary Eligible
                          </Badge>
                        ) : course.isRetakeRequired ? (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200 text-[10px]">
                            Retake Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                            Passed
                          </Badge>
                        )}
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
