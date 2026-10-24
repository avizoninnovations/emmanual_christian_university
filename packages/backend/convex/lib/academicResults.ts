import type { Doc } from "../_generated/dataModel.js";

/** Preserve legacy approved results; no unapproved score is a publication. */
export function publishedAssessment(mark: Doc<"studentAssessments">): Doc<"studentAssessments"> | null {
  if (mark.publicationWithdrawn) return null;
  if (mark.approvedSnapshot) return { ...mark, ...mark.approvedSnapshot, status: "approved" };
  return mark.status === "approved" ? mark : null;
}

export function approvedSnapshot(mark: Doc<"studentAssessments">, actorId?: string) {
  return {
    courseworkMarks: mark.courseworkMarks, examMarks: mark.examMarks, finalScore: mark.finalScore,
    courseworkEntered: mark.courseworkEntered !== false, examEntered: mark.examEntered !== false,
    grade: mark.grade, gradePoints: mark.gradePoints, resultCode: mark.resultCode,
    revision: mark.revision ?? 0, approvedBy: actorId,
    approvedAt: actorId ? Date.now() : mark.updatedAt,
  };
}

// Existing grading policy retained until ECU confirms the threshold differences.
export function calculateGrade(score: number): { grade: string; gradePoints: number } {
  if (score >= 80) return { grade: "A", gradePoints: 4.0 };
  if (score >= 70) return { grade: "B+", gradePoints: 3.5 };
  if (score >= 60) return { grade: "B", gradePoints: 3.0 };
  if (score >= 55) return { grade: "C+", gradePoints: 2.5 };
  if (score >= 50) return { grade: "C", gradePoints: 2.0 };
  if (score >= 40) return { grade: "D", gradePoints: 1.0 };
  return { grade: "F", gradePoints: 0.0 };
}
