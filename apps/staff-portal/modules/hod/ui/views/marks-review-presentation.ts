import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";

export type ReviewCourse = FunctionReturnType<typeof api.hod.courses>["page"][number];

export function getMarksReviewPresentation(course: ReviewCourse) {
  const missingCount = Math.max(course.studentCount - course.marksEnteredCount, 0);
  const statusLabel = course.hasSubmitted && course.approvedCount > 0
    ? `Pending + approved · ${course.approvedCount} approved · ${course.submittedCount} pending · ${missingCount} not entered`
    : course.hasSubmitted
      ? `Awaiting review · ${course.submittedCount} pending · ${missingCount} not entered`
      : course.fullyApproved
        ? `Fully approved · ${course.approvedCount}/${course.studentCount}`
        : course.hasMarks
          ? `Marks entered · ${course.marksEnteredCount}/${course.studentCount} · ${missingCount} not entered`
          : course.studentCount > 0 ? `No marks entered · ${missingCount} not entered` : "No enrolled students";
  const actionKind = course.hasSubmitted ? "review"
    : course.fullyApproved ? "approved"
      : missingCount > 0 ? "missing" : "open";

  return {
    missingCount,
    statusLabel,
    actionKind,
    actionLabel: actionKind === "review" ? "Review submitted marks"
      : actionKind === "approved" ? "View approved marks"
        : actionKind === "missing" ? "View missing marks" : "Open course unit",
    highlightAction: actionKind !== "open",
  } as const;
}
