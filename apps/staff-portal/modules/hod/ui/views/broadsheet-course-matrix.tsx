import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { BroadsheetData } from "./broadsheet-types";

type CourseMatrixProps = { data: BroadsheetData };

export function BroadsheetCourseMatrix({ data }: CourseMatrixProps) {
  return (
    <div className="w-full overflow-auto">
      <Table className="min-w-max text-xs">
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="sticky left-0 z-20 min-w-14 bg-primary/5">No.</TableHead>
            <TableHead rowSpan={2} className="sticky left-14 z-20 min-w-52 bg-primary/5">Student</TableHead>
            {data.courses.map((course) => (
              <TableHead key={course._id} colSpan={4} className="min-w-40 text-center">
                <span className="font-semibold">{course.code}</span>
                <span className="ml-1 text-muted-foreground">{course.creditUnits} CU</span>
              </TableHead>
            ))}
            <TableHead rowSpan={2} className="min-w-20 text-center">Attempted CU</TableHead>
            <TableHead rowSpan={2} className="min-w-20 text-center">Passed CU</TableHead>
            <TableHead rowSpan={2} className="min-w-20 text-center">SGPA</TableHead>
            <TableHead rowSpan={2} className="min-w-56">Senate outcome</TableHead>
          </TableRow>
          <TableRow>
            {data.courses.map((course) => (
              <Fragment key={course._id}>
                <TableHead className="text-center">CW / 30</TableHead>
                <TableHead className="text-center">Exam / 70</TableHead>
                <TableHead className="text-center">Total / 100</TableHead>
                <TableHead className="text-center">Grade</TableHead>
              </Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.students.length === 0 ? (
            <TableRow><TableCell colSpan={data.courses.length * 4 + 6} className="h-28 text-center text-muted-foreground">No students found.</TableCell></TableRow>
          ) : data.students.map((student, index) => {
            const results = new Map(student.courseResults.map((result) => [result.courseId, result]));
            return (
              <TableRow key={student.studentId}>
                <TableCell className="sticky left-0 z-10 bg-background tabular-nums">{index + 1}</TableCell>
                <TableCell className="sticky left-14 z-10 bg-background">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-muted-foreground">{student.registrationNumber}</div>
                </TableCell>
                {data.courses.map((course) => {
                  const result = results.get(course._id);
                  return (
                    <Fragment key={course._id}>
                      <TableCell className="text-center tabular-nums">{result?.coursework ?? "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">{result?.exam ?? "—"}</TableCell>
                      <TableCell className="text-center font-medium tabular-nums">{result?.finalScore ?? "—"}</TableCell>
                      <TableCell className="text-center font-semibold">{result?.grade ?? "—"}</TableCell>
                    </Fragment>
                  );
                })}
                <TableCell className="text-center tabular-nums">{student.totalAttemptedCU}</TableCell>
                <TableCell className="text-center tabular-nums">{student.totalPassedCU}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{student.totalAttemptedCU ? student.gpa.toFixed(2) : "—"}</TableCell>
                <TableCell>{student.decision}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
