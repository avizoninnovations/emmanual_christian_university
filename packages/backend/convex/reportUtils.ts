/**
 * Standardized academic rules for Emmanuel Christian Academy.
 * These functions are used by both the backend (Convex) and the frontend.
 */

/**
 * Calculates the grade based on the marks obtained (0-100).
 */
export const calculateGrade = (marks: number | null | undefined): string => {
  if (marks === null || marks === undefined) return "";
  
  if (marks >= 80) return "A";
  if (marks >= 75) return "A-";
  if (marks >= 70) return "B+";
  if (marks >= 65) return "B";
  if (marks >= 60) return "B-";
  if (marks >= 55) return "C+";
  if (marks >= 50) return "C";
  if (marks >= 45) return "C-";
  if (marks >= 40) return "D+";
  if (marks >= 35) return "D";
  if (marks >= 30) return "D-";
  return "E";
};

/**
 * Returns the professional remarks for a Given mark.
 */
export const getRemarks = (marks: number | null | undefined): string => {
  if (marks === null || marks === undefined) return "NOT SET";
  
  if (marks >= 80) return "EXCELLENT";
  if (marks >= 75) return "VERY GOOD";
  if (marks >= 70) return "GOOD";
  if (marks >= 65) return "QUITE GOOD";
  if (marks >= 60) return "FAIR GOOD";
  if (marks >= 55) return "SATISFACTORY";
  if (marks >= 50) return "AVERAGE";
  if (marks >= 45) return "BELOW AVERAGE";
  if (marks >= 40) return "NEEDS IMPROVEMENT";
  if (marks >= 35) return "WEAK";
  if (marks >= 30) return "POOR";
  return "FAIL";
};

/**
 * Formats a mark value for display (number or dash).
 */
export const formatMark = (marks: number | null | undefined): string => {
  return marks != null ? marks.toString() : "-";
};

/**
 * Formats a grade value for display (Grade or indicator).
 */
export const formatGrade = (grade: string | null | undefined): string => {
  return grade || "NOT SET";
};

/**
 * Calculates rankings (positions) for a class based on total marks.
 * Returns a Map of studentId -> position (1-based).
 */
export const calculateRankings = (studentStats: { studentId: string; totalMarks: number }[]): Map<string, number> => {
  const sortedStats = [...studentStats].sort((a, b) => b.totalMarks - a.totalMarks);
  const rankings = new Map<string, number>();
  
  let currentPos = 1;
  for (let i = 0; i < sortedStats.length; i++) {
    // Handle ties: if current student has same marks as previous, they get same position
    if (i > 0 && sortedStats[i].totalMarks === sortedStats[i - 1].totalMarks) {
      // Stay at currentPos
    } else {
      currentPos = i + 1;
    }
    rankings.set(sortedStats[i].studentId, currentPos);
  }
  
  return rankings;
};
