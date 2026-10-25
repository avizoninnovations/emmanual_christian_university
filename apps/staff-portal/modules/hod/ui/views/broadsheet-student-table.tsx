import { Eye } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { decisionTone, type BroadsheetData, type BroadsheetStudent } from "./broadsheet-types";

type StudentTableProps = {
  data: BroadsheetData;
  onViewStudent: (student: BroadsheetStudent) => void;
};

export function BroadsheetStudentTable({ data, onViewStudent }: StudentTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">No.</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="text-center">Units marked</TableHead>
            <TableHead className="text-center">Attempted CU</TableHead>
            <TableHead className="text-center">Passed CU</TableHead>
            <TableHead className="text-center">Semester GPA</TableHead>
            <TableHead>Senate outcome</TableHead>
            <TableHead className="w-28 text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                No students are enrolled in this program year.
              </TableCell>
            </TableRow>
          ) : data.students.map((student, index) => (
            <TableRow key={student.studentId}>
              <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
              <TableCell>
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-muted-foreground">{student.registrationNumber}</div>
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {student.courseResults.length} / {data.courses.length}
              </TableCell>
              <TableCell className="text-center tabular-nums">{student.totalAttemptedCU}</TableCell>
              <TableCell className="text-center tabular-nums">{student.totalPassedCU}</TableCell>
              <TableCell className="text-center font-medium tabular-nums">
                {student.totalAttemptedCU > 0 ? student.gpa.toFixed(2) : "—"}
              </TableCell>
              <TableCell>
                <Badge className={`rounded-sm border-0 font-medium ${decisionTone(student.decisionType)}`}>
                  {student.decision}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="rounded-sm" onClick={() => onViewStudent(student)}>
                  <Eye className="mr-1.5 size-4" /> View marks
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
