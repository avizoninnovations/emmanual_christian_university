"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  BookOpen,
  Award,
  CalendarCheck,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Clock,
  ChevronRight,
  ShieldCheck,
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

export default function DashboardPage() {
  const profile = useQuery(api.student_portal.getMyProfile);
  const registeredCourses = useQuery(api.student_portal.getMyRegisteredCourses, {}) || [];
  const attendance = useQuery(api.student_portal.getMyAttendanceSummary, {});

  if (!profile) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading student portal...</p>
      </div>
    );
  }

  const totalCreditUnits = registeredCourses.reduce(
    (acc, c) => acc + (c.creditUnits || 0),
    0
  );
  const isFinanceCleared =
    profile.financial.balance <= 0 || profile.financial.clearanceStatus === "cleared";
  const isAttendanceCleared = (attendance?.overallPercentage ?? 100) >= 75;
  const isExamCardReady = isFinanceCleared && isAttendanceCleared && registeredCourses.length > 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Student Header Profile Banner ── */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome, {profile.name}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs font-semibold">
                {profile.registrationNumber}
              </Badge>
              <Badge
                variant="outline"
                className={
                  profile.academics.academicStanding === "Good Standing"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                    : "bg-amber-500/10 text-amber-600 border-amber-200"
                }
              >
                {profile.academics.academicStanding}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.program.name} ({profile.program.code}) &bull; Year {profile.yearOfStudy}, Semester {profile.semester} &bull;{" "}
              {profile.currentPeriod?.name || "Academic Session"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" asChild className="gap-1.5 bg-primary text-primary-foreground">
              <Link href="/academics/registration">
                Course Registration <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            {isExamCardReady && (
              <Button size="sm" variant="outline" asChild className="gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50">
                <Link href="/finance/exam-card">
                  <ShieldCheck className="size-3.5" /> Exam Card Ready
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Primary Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Course Load */}
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{registeredCourses.length} Units</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Enrolled Load: {totalCreditUnits} CU
                </p>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: CGPA & Degree Honours */}
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {profile.academics.cgpa > 0 ? profile.academics.cgpa.toFixed(2) : "—"} / 4.0
                </p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  {profile.academics.cgpa > 0 ? profile.academics.degreeClassification : "Awaiting Exam Marks"}
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Award className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Financial Balance */}
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {profile.financial.balance <= 0 ? (
                    <span className="text-emerald-600">SSP 0</span>
                  ) : (
                    <span className="text-rose-600">SSP {profile.financial.balance.toLocaleString()}</span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tuition Fees:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase ${
                      isFinanceCleared
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                        : "bg-rose-500/10 text-rose-600 border-rose-200"
                    }`}
                  >
                    {profile.financial.clearanceStatus}
                  </Badge>
                </div>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <DollarSign className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Attendance & Exam Eligibility */}
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {attendance?.overallPercentage ?? 100}%
                </p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  {isAttendanceCleared ? (
                    <span className="text-emerald-600 font-semibold">&ge; 75% Exam Eligible</span>
                  ) : (
                    <span className="text-rose-600 font-semibold">&lt; 75% Barred Risk</span>
                  )}
                </p>
              </div>
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <CalendarCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Action Notice Banners ── */}
      {registeredCourses.length === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="size-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Semester Course Registration is Open
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You have not yet enrolled for your semester course units. Complete your registration to attend lectures and sit exams.
                  </p>
                </div>
              </div>
              <Button size="sm" asChild className="shrink-0 bg-primary text-primary-foreground">
                <Link href="/academics/registration">Register Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Active Registered Courses Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Current Semester Course Units ({profile.currentPeriod?.name || "Active Term"})
              </CardTitle>
              <CardDescription className="text-xs">
                Your enrolled lecture units, instructors, and personal attendance tracking.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
              <Link href="/academics/courses">
                View All <ChevronRight className="size-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-32">Code</TableHead>
                <TableHead>Course Title</TableHead>
                <TableHead className="w-20 text-center">CU</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead className="w-32 text-center">Attendance</TableHead>
                <TableHead className="text-right pr-6 w-32">Exam Clearance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registeredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-xs">
                    No courses registered for this semester. Click &quot;Register Now&quot; above to enroll.
                  </TableCell>
                </TableRow>
              ) : (
                registeredCourses.map((c) => (
                  <TableRow key={c.registrationId} className="hover:bg-muted/20">
                    <TableCell className="pl-6 font-mono font-bold text-sm">
                      {c.code}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-foreground">
                      {c.title}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      <Badge variant="outline" className="bg-muted text-[11px]">
                        {c.creditUnits} CU
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.lecturerName}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      <span
                        className={
                          c.attendanceRate >= 75
                            ? "text-emerald-600 font-semibold"
                            : "text-rose-600 font-bold"
                        }
                      >
                        {c.attendanceRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {c.isEligibleForExam ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]"
                        >
                          Cleared (&ge; 75%)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-600 border-rose-200 text-[10px]"
                        >
                          Barred (&lt; 75%)
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
