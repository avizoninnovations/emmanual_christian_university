"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { MarkPermissionDialog, displayDeadline } from "../components/mark-permission-dialog";
import { ReviewDecisionDialog } from "../components/review-decision-dialog";
import type { ClassKey } from "../../hooks/use-hod-scope";
import { GradebookSettingsDialog } from "../components/gradebook-settings-dialog";

export function ClassReviewView({ courseId, periodId }: ClassKey) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [selected, setSelected] = useState<Set<Id<"students">>>(new Set());
  const [decision, setDecision] = useState<{ action: "approve" | "return" | "withdraw"; rows: { studentId: Id<"students">; revision: number }[] }>();
  const [grantStudent, setGrantStudent] = useState<{ id: Id<"students">; name: string }>();
  const [settings, setSettings] = useState(false);
  const gradebook = useQuery(api.gradebook.getCourseGradebook, { courseId, periodId, cursor: cursors.at(-1) ?? null });
  if (!gradebook) return <Skeleton className="m-6 h-64" />;
  const selectedRows = gradebook.students.filter(row => selected.has(row.studentId));
  const captureDecision = (action: "approve" | "return" | "withdraw") => setDecision({ action, rows: selectedRows
    .filter(row => action === "withdraw" ? row.status === "approved" || !!row.approvedSnapshot : row.status === "submitted")
    .map(row => ({ studentId: row.studentId, revision: row.revision })) });
  const changePage = (next: (string | null)[]) => { setSelected(new Set()); setCursors(next); };
  return <div className="space-y-4 p-4 lg:p-6">
    <div className="flex flex-wrap justify-between gap-3"><Button asChild variant="ghost"><Link href="/hod/review-queue">Back to Marks Review</Link></Button>{gradebook.isManager && <Button variant="outline" onClick={() => setSettings(true)}>Class settings</Button>}</div>
    <div className="rounded-sm bg-primary/10 p-4"><h1 className="text-lg font-semibold">{gradebook.course.code} · {gradebook.course.title}</h1><p className="text-sm text-muted-foreground">{gradebook.period.name} {gradebook.period.year}{gradebook.entriesCloseAt ? ` · Entry closes ${displayDeadline(gradebook.entriesCloseAt)} EAT` : ""}</p></div>
    {!gradebook.canReview && <p className="text-sm text-muted-foreground">An independent reviewer must approve marks for your own teaching class.</p>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={!gradebook.canReview || !selectedRows.some(row => row.status === "submitted")} onClick={() => captureDecision("approve")}>Approve selected submitted marks</Button>
      <Button variant="outline" disabled={!gradebook.canReview || !selectedRows.some(row => row.status === "submitted")} onClick={() => captureDecision("return")}>Return selected</Button>
      <Button variant="ghost" disabled={!gradebook.canReview || !selectedRows.some(row => row.status === "approved" || !!row.approvedSnapshot)} onClick={() => captureDecision("withdraw")}>Withdraw published results</Button>
    </div>
    <div className="rounded-sm border bg-card"><Table><TableHeader><TableRow>
      <TableHead><Checkbox aria-label="Select page" checked={gradebook.students.length > 0 && gradebook.students.every(row => selected.has(row.studentId))} onCheckedChange={checked => setSelected(new Set(checked ? gradebook.students.map(row => row.studentId) : []))} /></TableHead>
      <TableHead>Student</TableHead><TableHead>CW / 30</TableHead><TableHead>Exam / 70</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Editing access</TableHead>
    </TableRow></TableHeader><TableBody>{gradebook.students.map(row => <TableRow key={row.studentId}>
      <TableCell><Checkbox aria-label={`Select ${row.studentName}`} checked={selected.has(row.studentId)} onCheckedChange={checked => setSelected(current => { const next = new Set(current); if (checked) next.add(row.studentId); else next.delete(row.studentId); return next; })} /></TableCell>
      <TableCell>{row.studentName}<span className="block text-xs text-muted-foreground">{row.studentRegNumber}</span></TableCell>
      <TableCell>{row.courseworkEntered ? row.courseworkMarks : "Missing"}</TableCell><TableCell>{row.examEntered ? row.examMarks : "Missing"}</TableCell>
      <TableCell>{row.courseworkEntered && row.examEntered ? row.finalScore : "—"}{row.approvedSnapshot && <span className="block text-xs text-muted-foreground">Published: {row.approvedSnapshot.finalScore}</span>}</TableCell>
      <TableCell><Badge variant="outline">{row.status}</Badge>{row.returnReason && <p className="max-w-48 text-xs text-muted-foreground">{row.returnReason}</p>}</TableCell>
      <TableCell>{gradebook.isManager && <Button size="sm" variant="ghost" onClick={() => setGrantStudent({ id: row.studentId, name: row.studentName })}>Grant access</Button>}{row.permission && <p className="text-xs text-muted-foreground">Until {displayDeadline(row.permission.expiresAt)} EAT</p>}</TableCell>
    </TableRow>)}{!gradebook.students.length && <TableRow><TableCell colSpan={7} className="h-28 text-center">No registered students in this course and semester.</TableCell></TableRow>}</TableBody></Table></div>
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={cursors.length === 1} onClick={() => changePage(cursors.slice(0, -1))}>Previous</Button><Button variant="outline" disabled={gradebook.isDone} onClick={() => changePage([...cursors, gradebook.continueCursor])}>Next 50 students</Button></div>
    {decision && decision.rows.length > 0 && <ReviewDecisionDialog courseId={courseId} periodId={periodId} rows={decision.rows} decision={decision.action} close={() => { setDecision(undefined); setSelected(new Set()); }} />}
    {grantStudent && <MarkPermissionDialog courseId={courseId} periodId={periodId} studentId={grantStudent.id} studentName={grantStudent.name} mode="grant" close={() => setGrantStudent(undefined)} />}
    {settings && <GradebookSettingsDialog courseId={courseId} periodId={periodId} close={() => setSettings(false)} />}
  </div>;
}
