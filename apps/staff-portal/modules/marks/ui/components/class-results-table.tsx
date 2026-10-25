"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { displayDeadline } from "@/modules/hod/ui/components/mark-permission-dialog";
import { useClassResultsEntry } from "@/modules/marks/hooks/use-class-results-entry";

type EntryState = ReturnType<typeof useClassResultsEntry>;

export function ClassResultsTable({ entry, onRequestAccess }: { entry: EntryState; onRequestAccess: (student: { id: import("@workspace/backend/_generated/dataModel").Id<"students">; name: string }) => void }) {
  const { filteredStudents, students, currentScore, updateMark, isLocked } = entry;
  return <div className="w-full overflow-x-auto rounded-sm border border-border bg-card">
    <Table>
      <TableHeader><TableRow className="bg-muted/70 hover:bg-muted/70">
        <TableHead className="w-14 text-center">S/N.</TableHead><TableHead>Name</TableHead><TableHead>Access No.</TableHead><TableHead>Reg No.</TableHead>
        <TableHead className="w-36 text-center">CW Score / 30</TableHead><TableHead className="w-36 text-center">EXM Score / 70</TableHead>
        <TableHead className="w-32 text-center">Final Score</TableHead><TableHead className="w-32">Status</TableHead><TableHead className="w-40">Access</TableHead>
      </TableRow></TableHeader>
      <TableBody>{filteredStudents.length === 0 ? <TableRow><TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
        {students.length ? "No students match these filters." : "No students are registered for this course in this semester."}
      </TableCell></TableRow> : filteredStudents.map((student, index) => {
        const cw = currentScore(student.studentId, "coursework"); const exam = currentScore(student.studentId, "exam"); const finalScore = cw + exam;
        const values = entry.marks.get(student.studentId);
        const hasCoursework = values ? values.coursework !== "" : student.courseworkEntered;
        const hasExam = values ? values.exam !== "" : student.examEntered;
        const canEditCoursework = entry.editable(student, "coursework"); const canEditExam = entry.editable(student, "exam");
        return <TableRow key={student.studentId}>
          <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}.</TableCell><TableCell className="font-medium">{student.studentName}</TableCell>
          <TableCell className="font-mono text-sm">{student.studentAccessNumber}</TableCell><TableCell className="font-mono text-sm">{student.studentRegNumber}</TableCell>
          <TableCell><Input aria-label={`${student.studentName} coursework mark`} type="number" min={0} max={30} step="0.1" value={entry.marks.get(student.studentId)?.coursework ?? (student.courseworkEntered ? student.courseworkMarks : "")} onChange={event => updateMark(student.studentId, "coursework", event.target.value)} disabled={!canEditCoursework} className="mx-auto h-9 w-24 text-center tabular-nums" /></TableCell>
          <TableCell><Input aria-label={`${student.studentName} examination mark`} type="number" min={0} max={70} step="0.1" value={entry.marks.get(student.studentId)?.exam ?? (student.examEntered ? student.examMarks : "")} onChange={event => updateMark(student.studentId, "exam", event.target.value)} disabled={!canEditExam} className="mx-auto h-9 w-24 text-center tabular-nums" /></TableCell>
          <TableCell className="text-center font-semibold tabular-nums">{hasCoursework && hasExam ? finalScore.toFixed(finalScore % 1 ? 1 : 0) : "—"}</TableCell>
          <TableCell>
            <Badge variant="outline" className={`rounded-sm font-normal ${student.status === "approved" ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : student.status === "returned" ? "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" : student.status === "submitted" ? "border-primary/20 bg-primary/10 text-primary" : ""}`}>
              {student.status === "approved" ? (student.publicationWithdrawn ? "Publication withdrawn" : "Published") : student.status === "submitted" ? "Submitted to HOD" : student.status}
            </Badge>
            {student.status === "returned" && student.returnReason && <p className="mt-1 max-w-56 text-xs text-muted-foreground">{student.returnReason}</p>}
          </TableCell>
          <TableCell>
            {student.permission?.status === "requested" && student.permission.expiresAt > Date.now() ? <div><Badge variant="secondary" className="rounded-sm">Access requested</Badge><p className="mt-1 text-xs text-muted-foreground">Waiting for HOD</p>{student.permission.reason && <p className="mt-1 max-w-48 text-xs text-muted-foreground">{student.permission.reason}</p>}</div>
              : student.permission?.status === "granted" && student.permission.expiresAt > Date.now() ? <div><Badge variant="secondary" className="rounded-sm">Access granted</Badge><p className="mt-1 text-xs text-muted-foreground">Until {displayDeadline(student.permission.expiresAt)}</p></div>
              : student.permission && (["rejected", "revoked", "expired"].includes(student.permission.status) || (student.permission.status === "requested" && student.permission.expiresAt <= Date.now())) ? <div>
                <Badge variant="outline" className="rounded-sm capitalize">Access {student.permission.status === "requested" ? "request expired" : student.permission.status}</Badge>
                {student.permission.closedReason && <p className="mt-1 max-w-48 text-xs text-muted-foreground">{student.permission.closedReason}</p>}
                {entry.isLecturer && !entry.editable(student) && <Button size="sm" variant="ghost" className="mt-1 h-7 px-1" onClick={() => onRequestAccess({ id: student.studentId, name: student.studentName })}>Request again</Button>}
              </div>
              : student.permission?.status === "submitted" ? <Badge variant="outline" className="rounded-sm">Used for submission</Badge>
              : entry.isLecturer && !entry.editable(student) ? <Button size="sm" variant="ghost" onClick={() => onRequestAccess({ id: student.studentId, name: student.studentName })}>Request access</Button>
              : <span className="text-xs text-muted-foreground">{isLocked ? "Locked" : "Standard window"}</span>}
          </TableCell>
        </TableRow>;
      })}</TableBody>
    </Table>
    <div className="flex items-center justify-between border-t px-3 py-2 text-sm text-muted-foreground">
      <span>{students.length} students on this page</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!entry.canPreviousPage || entry.dirty} onClick={entry.previousPage}>Previous</Button><Button variant="outline" size="sm" disabled={!entry.canNextPage || entry.dirty} onClick={entry.nextPage}>Next 50</Button></div>
    </div>
  </div>;
}
