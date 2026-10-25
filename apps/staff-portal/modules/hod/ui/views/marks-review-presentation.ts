import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";

export type ReviewCourse = FunctionReturnType<typeof api.hod.courses>["page"][number];

export function getMarksReviewPresentation(course: ReviewCourse) {
  const missingCount = Math.max(course.studentCount - course.marksEnteredCount, 0);
  const actionKind = course.hasSubmitted ? "review"
    : course.fullyApproved ? "approved"
      : missingCount > 0 ? "missing" : "open";

  return {
    missingCount,
    actionKind,
    actionLabel: actionKind === "review" ? "Review submitted marks"
      : actionKind === "approved" ? "View approved marks"
        : actionKind === "missing" ? "View missing marks" : "Open course unit",
    highlightAction: actionKind !== "open",
  } as const;
}
