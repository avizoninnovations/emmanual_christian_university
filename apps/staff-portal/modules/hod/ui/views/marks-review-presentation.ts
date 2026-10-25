import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";

export type ReviewCourse = FunctionReturnType<typeof api.hod.courses>["page"][number];

export function getMarksReviewPresentation(course: ReviewCourse) {
  const missingCount = Math.max(course.studentCount - course.marksEnteredCount, 0);

  return {
    missingCount,
    actionLabel: "View class marks",
    highlightAction: course.hasSubmitted || course.fullyApproved || missingCount > 0,
  } as const;
}
