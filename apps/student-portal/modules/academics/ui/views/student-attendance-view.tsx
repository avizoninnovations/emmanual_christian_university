"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  Loader2,
} from "lucide-react";

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

export function StudentAttendanceView() {
  const attendance = useQuery(api.student_portal.getMyAttendanceSummary, {});

  if (!attendance) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading attendance records...</p>
      </div>
    );
  }

  const { overallPercentage, totalSessionsHeld, totalSessionsAttended, isOverallEligible, courseStats } =
    attendance;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Class Attendance & Exam Eligibility</h1>
            <Badge variant="outline" className="text-xs">
              75% MoHEST Policy
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track lecture session roll calls and ensure compliance with university examination clearance requirements.
          </p>
        </div>
      </div>

      {/* ── Policy Banner ── */}
      <Card className="border-blue-200 bg-blue-500/10 shadow-xs">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                South Sudan Ministry of Higher Education Examination Attendance Requirement
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-400">
                Under national quality assurance regulations, students must maintain at least <strong>75% attendance</strong> in each registered course to be cleared to sit for the final semester examination. Students falling below 75% are barred and awarded an automatic &quot;F&quot; grade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold text-foreground">{overallPercentage}%</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Overall Aggregate Attendance
                </p>
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <CalendarCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {totalSessionsAttended} / {totalSessionsHeld}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Sessions Attended (Present + Late)
                </p>
              </div>
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mt-1">
                  {isOverallEligible ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-sm font-bold">
                      <CheckCircle2 className="size-4 mr-1" /> Eligible for Exams
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-300 text-sm font-bold">
                      <AlertCircle className="size-4 mr-1" /> Barred Risk (&lt; 75%)
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">
                  Examination Clearance Gate
                </p>
              </div>
              <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <ShieldCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Per-Course Attendance Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Course-by-Course Attendance Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Individual session roll calls logged by your course instructors.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-32">Course Code</TableHead>
                <TableHead>Course Title</TableHead>
                <TableHead className="w-20 text-center">Sessions</TableHead>
                <TableHead className="w-20 text-center">Present</TableHead>
                <TableHead className="w-20 text-center">Late</TableHead>
                <TableHead className="w-20 text-center">Absent</TableHead>
                <TableHead className="w-32 text-center">Attendance %</TableHead>
                <TableHead className="text-right pr-6 w-36">Exam Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs">
                    No class attendance sessions logged yet for your registered courses.
                  </TableCell>
                </TableRow>
              ) : (
                courseStats.map((course: any) => (
                  <TableRow key={course.courseId} className="hover:bg-muted/20">
                    <TableCell className="pl-6 font-mono font-bold text-sm">
                      {course.code}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-foreground">
                      {course.title}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {course.totalSessions}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-emerald-600 font-semibold">
                      {course.presentCount}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-amber-600 font-semibold">
                      {course.lateCount}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-rose-600 font-semibold">
                      {course.absentCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`font-mono text-xs font-bold ${
                            course.percentage >= 75 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {course.percentage}%
                        </span>
                        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              course.percentage >= 75 ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                            style={{ width: `${Math.min(100, course.percentage)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {course.isEligibleForExam ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]"
                        >
                          <CheckCircle2 className="size-3 mr-1" /> Cleared (&ge; 75%)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-600 border-rose-200 text-[10px]"
                        >
                          <AlertCircle className="size-3 mr-1" /> Barred (&lt; 75%)
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
