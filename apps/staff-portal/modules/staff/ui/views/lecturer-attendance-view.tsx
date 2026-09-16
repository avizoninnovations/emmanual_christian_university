"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  CalendarCheck,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { CourseWorkspaceView } from "./course-workspace-view";

export function LecturerAttendanceView() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId");

  const courses = (useQuery(api.allocations.getLecturerCourses, {}) || []) as any[];
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].courseId);
    }
  }, [initialCourseId, courses]);

  if (courses.length === 0) {
    return (
      <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Class Attendance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Roll call tracking and exam eligibility policy enforcement (75% threshold).
            </p>
          </div>
        </div>

        <Card className="p-12 text-center border-dashed">
          <CalendarCheck className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No Courses Allocated</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            You do not currently have any active courses allocated for attendance tracking.
          </p>
        </Card>
      </div>
    );
  }

  const activeCourse = courses.find((c: any) => c.courseId === selectedCourseId);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header & Course Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Attendance & Roll Call</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record lecture sessions, log present/absent/late rolls, and track 75% exam clearance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select course unit..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c: any) => (
                  <SelectItem key={c.courseId} value={c.courseId}>
                    {c.code} - {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourseId && (
            <Button variant="outline" size="sm" asChild className="gap-1.5 h-9 text-xs">
              <Link href={`/staff/courses/${selectedCourseId}`}>
                <ExternalLink className="size-3.5" /> Course Hub
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Render Course Workspace in Attendance mode */}
      {selectedCourseId && (
        <CourseWorkspaceView courseId={selectedCourseId as Id<"courses">} />
      )}
    </div>
  );
}
