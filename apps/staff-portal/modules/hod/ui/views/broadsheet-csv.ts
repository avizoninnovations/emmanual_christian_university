import type { BroadsheetData } from "./broadsheet-types";

function escapeCsv(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadBroadsheetCsv(data: BroadsheetData): void {
  const courseHeaders = data.courses.flatMap((course) => [
    `${course.code} CW (30)`,
    `${course.code} EX (70)`,
    `${course.code} Total (100)`,
    `${course.code} Grade`,
  ]);
  const headers = [
    "Registration Number",
    "Student Name",
    ...courseHeaders,
    "Attempted CU",
    "Passed CU",
    "Semester GPA",
    "Academic Decision",
  ];
  const rows = data.students.map((student) => {
    const results = new Map(student.courseResults.map((result) => [result.courseId, result]));
    const marks = data.courses.flatMap((course) => {
      const result = results.get(course._id);
      return result
        ? [result.coursework, result.exam, result.finalScore, result.grade]
        : ["—", "—", "—", "—"];
    });
    return [
      student.registrationNumber,
      student.name,
      ...marks,
      student.totalAttemptedCU,
      student.totalPassedCU,
      student.gpa.toFixed(2),
      student.decision,
    ].map(escapeCsv);
  });
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ECU_Senate_Broadsheet_${data.program.code}_Year${data.yearOfStudy}_${data.period.name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
