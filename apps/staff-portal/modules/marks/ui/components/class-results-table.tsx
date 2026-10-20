"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table";
import { useClassResultsEntry } from "@/modules/marks/hooks/use-class-results-entry";

type EntryState = ReturnType<typeof useClassResultsEntry>;

export function ClassResultsTable({ entry }: { entry: EntryState }) {
  const { filteredStudents, students, currentScore, updateMark, isLocked, gradebook } = entry;
  return <div className="w-full overflow-x-auto rounded-sm border border-border bg-card">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/70 hover:bg-muted/70">
          <TableHead className="w-14 text-center">S/N.</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Access No.</TableHead>
          <TableHead>Reg No.</TableHead>
          <TableHead className="w-36 text-center">CW Score</TableHead>
          <TableHead className="w-36 text-center">EXM Score</TableHead>
          <TableHead className="w-32 text-center">Final Score</TableHead>
          <TableHead className="w-32">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredStudents.length === 0 ? <TableRow>
          <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
            {students.length ? "No students match these filters." : "No students are registered for this course in this semester."}
          </TableCell>
        </TableRow> : filteredStudents.map((student, index) => {
          const cw = currentScore(student.studentId, "coursework");
          const exam = currentScore(student.studentId, "exam");
          const finalScore = cw + exam;
          const status = gradebook?.overallStatus ?? student.status;
          return <TableRow key={student.studentId}>
            <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}.</TableCell>
            <TableCell className="font-medium">{student.studentName}</TableCell>
            <TableCell className="font-mono text-sm">{student.studentAccessNumber}</TableCell>
            <TableCell className="font-mono text-sm">{student.studentRegNumber}</TableCell>
            <TableCell>
              <Input aria-label={`${student.studentName} coursework mark`} type="number" min={0} max={30} step="0.1" value={entry.marks.get(student.studentId)?.coursework ?? student.courseworkMarks} onChange={(event) => updateMark(student.studentId, "coursework", event.target.value)} disabled={isLocked && !student.isUnlocked} className="mx-auto h-9 w-24 text-center tabular-nums" />
            </TableCell>
            <TableCell>
              <Input aria-label={`${student.studentName} examination mark`} type="number" min={0} max={70} step="0.1" value={entry.marks.get(student.studentId)?.exam ?? student.examMarks} onChange={(event) => updateMark(student.studentId, "exam", event.target.value)} disabled={isLocked && !student.isUnlocked} className="mx-auto h-9 w-24 text-center tabular-nums" />
            </TableCell>
            <TableCell className="text-center font-semibold tabular-nums">{finalScore.toFixed(finalScore % 1 ? 1 : 0)}</TableCell>
            <TableCell><Badge variant="outline" className="capitalize font-normal">{status}</Badge></TableCell>
          </TableRow>;
        })}
      </TableBody>
    </Table>
  </div>;
}
