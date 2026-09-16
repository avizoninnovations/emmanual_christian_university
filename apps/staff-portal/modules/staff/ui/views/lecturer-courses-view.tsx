"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  BookOpen,
  Users,
  Award,
  CalendarCheck,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  GraduationCap,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

export function LecturerCoursesView() {
  const [search, setSearch] = useState("");
  const courses = (useQuery(api.allocations.getLecturerCourses, {}) || []) as any[];

  const filteredCourses = courses.filter(
    (c: any) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.departmentName.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = courses.reduce((acc: number, c: any) => acc + (c.enrolledCount || 0), 0);
  const submittedCount = courses.filter((c: any) => c.gradebookStatus === "submitted").length;
  const approvedCount = courses.filter((c: any) => c.gradebookStatus === "approved").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1.5"
          >
            <CheckCircle2 className="size-3" /> HOD Approved
          </Badge>
        );
      case "submitted":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 border-blue-200 gap-1.5"
          >
            <Clock className="size-3" /> Submitted to HOD
          </Badge>
        );
      case "returned":
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-600 border-rose-200 gap-1.5"
          >
            <AlertCircle className="size-3" /> Returned for Revision
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1.5"
          >
            <FileSpreadsheet className="size-3" /> Grading in Progress
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Teaching Courses</h1>
            <Badge variant="outline" className="text-xs">
              {courses.length} Assigned
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student continuous assessments, final exams (30% CW / 70% Exam), and class attendance.
          </p>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Active Units
                </p>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Enrolled Students
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Users className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{submittedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Pending HOD Review
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Clock className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Approved & Finalized
                </p>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Award className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assigned courses..."
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Courses Grid ── */}
      {filteredCourses.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <BookOpen className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No Courses Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {courses.length === 0
              ? "You do not have any teaching courses allocated for the current active academic period. Please contact your Head of Department (HOD) for course allocation."
              : "No courses match your search term."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course: any) => (
            <Card
              key={course.allocationId}
              className="border shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {course.code}
                  </Badge>
                  {getStatusBadge(course.gradebookStatus)}
                </div>
                <CardTitle className="text-base font-semibold line-clamp-2 mt-2">
                  {course.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {course.programName} &bull; {course.departmentName}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 p-2 rounded-md">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Credit Units
                    </span>
                    <span className="font-medium text-sm">{course.creditUnits} CU</span>
                  </div>

                  <div className="bg-muted/50 p-2 rounded-md">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Academic Level
                    </span>
                    <span className="font-medium text-sm">
                      Year {course.yearOfStudy} : Sem {course.semester}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> {course.enrolledCount} Students Enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="size-3.5" /> 30% CW / 70% Exam
                  </span>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t bg-muted/20 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 text-xs gap-1 flex-1"
                >
                  <Link href={`/staff/attendance?courseId=${course.courseId}`}>
                    <CalendarCheck className="size-3.5 text-muted-foreground" />
                    Roll Call
                  </Link>
                </Button>

                <Button
                  size="sm"
                  asChild
                  className="h-8 text-xs gap-1 flex-1 bg-primary text-primary-foreground"
                >
                  <Link href={`/staff/courses/${course.courseId}`}>
                    <FileSpreadsheet className="size-3.5" />
                    Gradebook
                    <ChevronRight className="size-3 ml-auto" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
