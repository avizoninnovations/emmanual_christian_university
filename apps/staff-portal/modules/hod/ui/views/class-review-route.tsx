"use client";
import { use } from "react";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { ClassReviewView } from "./class-review-view";
export function ClassReviewRoute({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ periodId?: string }> }) {
  const { courseId } = use(params); const { periodId } = use(searchParams);
  if (!periodId) return <p className="p-6 text-sm text-muted-foreground">Select an academic period to review this class.</p>;
  return <ClassReviewView courseId={courseId as Id<"courses">} periodId={periodId as Id<"academicPeriods">} />;
}
