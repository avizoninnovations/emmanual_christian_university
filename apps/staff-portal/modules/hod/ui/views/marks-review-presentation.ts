import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";

export type ReviewCourse = FunctionReturnType<typeof api.hod.courses>["page"][number];

export function getMarksReviewPresentation(course: ReviewCourse) {
  const missingCount = Math.max(course.studentCount - course.marksEnteredCount, 0);

  return {
    missingCount,
    actionLabel: "View class marks",
    highlightAction: course.hasSubmitted || course.fullyApproved || missingCount > 0,
    buttonToneClassName: course.fullyApproved
      ? "border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
      : "",
  } as const;
}
