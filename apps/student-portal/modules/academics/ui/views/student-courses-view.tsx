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
  const coursesResult = useQuery(api.student_portal.getMyRegisteredCourses, {});
  const profile = useQuery(api.student_portal.getMyProfile);

  if (!profile || coursesResult === undefined) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading course enrollments...</p>
      </div>
    );
  }

  const courses = coursesResult ?? [];

  const totalCredits = courses.reduce((acc: number, c: any) => acc + (c.creditUnits || 0), 0);

  return (
    <div className="w-full space-y-6 p-5 sm:p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Enrolled Courses</h1>
            <Badge variant="outline" className="text-xs">
              {courses.length} Units Enrolled ({totalCredits} CU)
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Your registered course units and retakes are shown together. Retake classes may be in a different programme year.</p>
        </div>

        <Button size="sm" asChild className="gap-1.5 bg-primary text-primary-foreground">
          <Link href="/academics/registration">
            Modify Course Registration <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* ── Current semester accordion ── */}
      {courses.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <BookOpen className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No Registered Courses</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">You have no enrolled course units for this semester.</p>
          <Button asChild size="sm" className="mt-4 bg-primary text-primary-foreground">
            <Link href="/academics/registration">Enroll in Semester Courses</Link>
          </Button>
        </Card>
      ) : (
        <details open className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <summary className="cursor-pointer list-none border-b bg-[#f7f7fb] px-5 py-4 font-semibold text-slate-800 marker:hidden">
            {profile.currentPeriod?.name || "Current Semester"} {profile.currentPeriod?.year ?? ""}
          </summary>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          {courses.map((course: any) => (
            <Card
              key={course.registrationId}
              className="flex flex-col justify-between overflow-hidden border-slate-100 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-4 mt-4 flex h-28 items-center justify-center rounded-lg bg-[#13785f] text-emerald-50">
                <BookOpen className="size-10 opacity-70" />
              </div>
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
                    {course.lecturerName} (Lecturer)
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4 pt-0">
                <Badge variant="outline" className="text-[10px]">{course.status === "registered" ? "ENROLLED" : course.status.toUpperCase()}</Badge>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 py-3">
                <span className="text-xs text-muted-foreground">Year {course.yearOfStudy} · Semester {course.semester}</span>
              </CardFooter>
            </Card>
          ))}
          </div>
        </details>
      )}
    </div>
  );
}
