"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  BookOpen,
  Users,
  Award,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  GraduationCap,
  Loader2,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

export function StudentCoursesView() {
  const courses = useQuery(api.student_portal.getMyRegisteredCourses, {}) || [];
  const profile = useQuery(api.student_portal.getMyProfile);

  if (!profile) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading course enrollments...</p>
      </div>
    );
  }

  const totalCredits = courses.reduce((acc: number, c: any) => acc + (c.creditUnits || 0), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">My Registered Courses</h1>
            <Badge variant="outline" className="text-xs">
              {courses.length} Units Enrolled ({totalCredits} CU)
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Active course units for {profile.currentPeriod?.name || "Current Semester"}.
          </p>
        </div>

        <Button size="sm" asChild className="gap-1.5 bg-primary text-primary-foreground">
          <Link href="/academics/registration">
            Modify Course Registration <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* ── Courses Grid ── */}
      {courses.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <BookOpen className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No Registered Courses</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            You haven&apos;t enrolled in any course units for this semester yet. Click below to register.
          </p>
          <Button asChild size="sm" className="mt-4 bg-primary text-primary-foreground">
            <Link href="/academics/registration">Enroll in Semester Courses</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course: any) => (
            <Card
              key={course.registrationId}
              className="border shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {course.code}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-muted">
                    {course.creditUnits} CU
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold line-clamp-2 mt-2">
                  {course.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  Instructor: {course.lecturerName}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                <div className="bg-muted/40 p-3 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Class Attendance:</span>
                    <span
                      className={`font-mono font-bold ${
                        course.attendanceRate >= 75 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {course.attendanceRate}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        course.attendanceRate >= 75 ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                      style={{ width: `${Math.min(100, course.attendanceRate)}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-muted-foreground pt-0.5">
                    {course.isEligibleForExam
                      ? "Eligible for final examination"
                      : "Risk of examination disqualification (< 75%)"}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <GraduationCap className="size-3.5" /> 30% CW / 70% Exam
                </span>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 text-primary">
                  <Link href="/academics/attendance">Attendance Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
