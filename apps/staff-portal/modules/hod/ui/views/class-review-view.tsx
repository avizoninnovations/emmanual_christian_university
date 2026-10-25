"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowLeft, BookOpen, CalendarDays, CheckCheck, Clock3, MoreHorizontal, Search, X } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { useSidebar } from "@workspace/ui/components/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { MarkPermissionDialog, displayDeadline } from "../components/mark-permission-dialog";
import { ReviewDecisionDialog } from "../components/review-decision-dialog";
import { GradebookSettingsDialog } from "../components/gradebook-settings-dialog";
import type { ClassKey } from "../../hooks/use-hod-scope";

type Props = ClassKey & { onClose: () => void };
type Decision = { action: "approve" | "return" | "withdraw"; rows: { studentId: Id<"students">; revision: number }[] };

export function ClassReviewView({ courseId, periodId, onClose }: Props) {
  const { open: sidebarOpen, isMobile } = useSidebar();
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [selected, setSelected] = useState<Set<Id<"students">>>(new Set());
  const [decision, setDecision] = useState<Decision>();
  const [grantStudent, setGrantStudent] = useState<{ id: Id<"students">; name: string }>();
  const [settings, setSettings] = useState(false);
  const [search, setSearch] = useState("");
  const gradebook = useQuery(api.gradebook.getCourseGradebook, { courseId, periodId, cursor: cursors.at(-1) ?? null });
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return gradebook?.students.filter(row => !query || [row.studentName, row.studentRegNumber, row.studentAccessNumber]
      .some(value => value.toLowerCase().includes(query))) ?? [];
  }, [gradebook?.students, search]);
  const isActionable = (row: NonNullable<typeof gradebook>['students'][number]) =>
    (row.status === "submitted" && row.courseworkEntered && row.examEntered)
    || (row.status === "approved" && !row.publicationWithdrawn);
  const contentRegionStyle = {
    left: sidebarOpen && !isMobile ? "var(--sidebar-width)" : 0,
    width: sidebarOpen && !isMobile ? "calc(100% - var(--sidebar-width))" : "100%",
  };

  if (!gradebook) return <div className="fixed inset-y-0 z-20 overflow-y-auto bg-background p-5" style={contentRegionStyle} role="dialog" aria-modal="true" aria-label="Class marks">
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <Button variant="outline" onClick={onClose}><ArrowLeft className="mr-2 size-4" />Back to marks review</Button>
      <Skeleton className="h-28 rounded-sm" /><Skeleton className="h-14 rounded-sm" /><Skeleton className="h-[60vh] rounded-sm" />
    </div>
  </div>;

  const selectedRows = gradebook.students.filter(row => selected.has(row.studentId) && isActionable(row));
  const selectableVisibleStudents = visibleStudents.filter(isActionable);
  const submittedCount = gradebook.students.filter(row => row.status === "submitted").length;
  const approvedCount = gradebook.students.filter(row => row.status === "approved").length;
  const missingCount = gradebook.students.filter(row => !row.courseworkEntered || !row.examEntered).length;
  const entryDeadlinePassed = gradebook.freezeAtDeadline && !!gradebook.entriesCloseAt && Date.now() >= gradebook.entriesCloseAt;
  const canGrantAccess = (row: (typeof gradebook.students)[number]) => gradebook.isManager
    && (row.status === "approved" || ((row.status === "draft" || row.status === "returned")
      && (entryDeadlinePassed || gradebook.period.status !== "active" || row.requiresPermission)));
  const hasRowActions = (row: (typeof gradebook.students)[number]) =>
    (gradebook.canReview && (row.status === "submitted" || (row.status === "approved" && !row.publicationWithdrawn)))
    || canGrantAccess(row);
  const captureDecision = (action: Decision["action"]) => setDecision({ action, rows: selectedRows
    .filter(row => action === "withdraw" ? row.status === "approved" && !row.publicationWithdrawn : row.status === "submitted")
    .map(row => ({ studentId: row.studentId, revision: row.revision })) });
  const captureRowDecision = (row: (typeof gradebook.students)[number], action: Decision["action"]) =>
    setDecision({ action, rows: [{ studentId: row.studentId, revision: row.revision }] });
  const changePage = (next: (string | null)[]) => { setSelected(new Set()); setCursors(next); };

  return (
    <div className="fixed inset-y-0 z-20 flex flex-col overflow-hidden bg-background text-foreground" style={contentRegionStyle} role="dialog" aria-modal="true" aria-label="Class marks">
      <header className="shrink-0 border-b bg-background shadow-sm">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" size="sm" className="shrink-0" onClick={onClose}>
              <ArrowLeft className="mr-2 size-4" />Back
            </Button>
            <span className="hidden size-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary sm:flex"><BookOpen className="size-5" /></span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">Marks review <span className="px-1">/</span> {gradebook.course.code}</p>
              <h1 className="truncate text-base font-semibold sm:text-lg">{gradebook.course.title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {gradebook.isManager && <Button variant="outline" size="sm" onClick={() => setSettings(true)}><CalendarDays className="mr-2 size-4" /><span className="hidden sm:inline">Deadline settings</span></Button>}
            <Button variant="ghost" size="icon" aria-label="Close class marks" onClick={onClose}><X className="size-5" /></Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1800px] space-y-5 px-4 py-5 sm:px-6 lg:py-7">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-sm font-mono">{gradebook.course.code}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{gradebook.period.name} {gradebook.period.year} · Year {gradebook.course.yearOfStudy} · Semester {gradebook.course.semester}</p>
              {!gradebook.canReview && <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">An independent reviewer must approve marks for your own teaching course.</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryTile label="Students shown" value={gradebook.students.length} icon={<BookOpen className="size-4" />} />
              <SummaryTile label="Awaiting review" value={submittedCount} icon={<Clock3 className="size-4" />} />
              <SummaryTile label="Approved" value={approvedCount} icon={<CheckCheck className="size-4" />} />
              <SummaryTile label="Missing marks" value={missingCount} icon={<span className="text-sm font-bold">!</span>} />
            </div>
          </section>

          {gradebook.entriesCloseAt && <section className="flex flex-wrap items-center justify-between gap-3 rounded-sm border bg-muted/25 px-4 py-3">
            <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><CalendarDays className="size-4" /></span>
              <div><p className="text-xs font-medium text-muted-foreground">Marks entry deadline</p><p className="text-sm font-semibold">{displayDeadline(gradebook.entriesCloseAt)} EAT</p></div>
            </div>
            <Badge variant={entryDeadlinePassed ? "outline" : "secondary"}>{entryDeadlinePassed ? "Entry window closed" : gradebook.freezeAtDeadline ? "Freezes at deadline" : "Deadline set"}</Badge>
          </section>}

          <section className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {selectedRows.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-sm border bg-card p-3">
                <span className="mr-1 text-xs text-muted-foreground">{selectedRows.length} selected</span>
                {gradebook.canReview && selectedRows.some(row => row.status === "submitted") && <>
                  <Button size="sm" onClick={() => captureDecision("approve")}>Approve selected</Button>
                  <Button size="sm" variant="outline" onClick={() => captureDecision("return")}>Return selected</Button>
                </>}
                {gradebook.canReview && selectedRows.some(row => row.status === "approved" && !row.publicationWithdrawn) && <Button size="sm" variant="outline" onClick={() => captureDecision("withdraw")}>Withdraw published results</Button>}
              </div>}
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search students" placeholder="Search name or student number" value={search} onChange={event => setSearch(event.target.value)} className="h-10 bg-background pl-9" />
              </div>
            </div>

            <div className="overflow-hidden rounded-sm border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
                <p className="text-sm font-semibold">Student marks</p>
                <p className="text-xs text-muted-foreground">Showing {visibleStudents.length} of {gradebook.students.length} students on this page · 50 per page</p>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/70">
                    <TableRow>
                      <TableHead className="w-12 pl-4"><Checkbox aria-label="Select all eligible visible students" disabled={!selectableVisibleStudents.length || !gradebook.canReview} checked={selectableVisibleStudents.length > 0 && selectableVisibleStudents.every(row => selected.has(row.studentId))} onCheckedChange={checked => setSelected(current => { const next = new Set(current); for (const row of selectableVisibleStudents) checked ? next.add(row.studentId) : next.delete(row.studentId); return next; })} /></TableHead>
                      <TableHead className="w-12">No.</TableHead><TableHead>Student</TableHead><TableHead className="text-right">Coursework / 30</TableHead><TableHead className="text-right">Exam / 70</TableHead><TableHead className="text-right">Total / 100</TableHead><TableHead>Status</TableHead><TableHead className="w-16 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleStudents.map((row, index) => <TableRow key={row.studentId} className="hover:bg-muted/25">
                      <TableCell className="pl-4"><Checkbox aria-label={`Select ${row.studentName}`} disabled={!gradebook.canReview || !isActionable(row)} checked={selected.has(row.studentId)} onCheckedChange={checked => setSelected(current => { const next = new Set(current); checked ? next.add(row.studentId) : next.delete(row.studentId); return next; })} /></TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{index + 1 + (cursors.length - 1) * 50}</TableCell>
                      <TableCell className="min-w-64"><span className="block font-medium">{row.studentName}</span><span className="mt-1 block font-mono text-xs text-muted-foreground">{row.studentRegNumber} <span className="px-1">·</span> {row.studentAccessNumber}</span></TableCell>
                      <TableCell className="text-right tabular-nums">{row.courseworkEntered ? row.courseworkMarks : <MissingValue />}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.examEntered ? row.examMarks : <MissingValue />}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{row.courseworkEntered && row.examEntered ? row.finalScore : "—"}{row.approvedSnapshot && <span className="block text-xs font-normal text-muted-foreground">Published: {row.approvedSnapshot.finalScore}</span>}</TableCell>
                      <TableCell><MarkStatus status={row.status} /></TableCell>
                      <TableCell className="text-right">{hasRowActions(row) ? <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${row.studentName}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          {gradebook.canReview && row.status === "submitted" && <>
                            <DropdownMenuItem disabled={!row.courseworkEntered || !row.examEntered} onSelect={() => captureRowDecision(row, "approve")}>Approve result</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => captureRowDecision(row, "return")}>Return to lecturer</DropdownMenuItem>
                          </>}
                          {gradebook.canReview && row.status === "approved" && !row.publicationWithdrawn && <DropdownMenuItem onSelect={() => captureRowDecision(row, "withdraw")}>Withdraw published result</DropdownMenuItem>}
                          {canGrantAccess(row) && <DropdownMenuItem disabled={!!row.permission && row.permission.expiresAt > Date.now()} onSelect={() => setGrantStudent({ id: row.studentId, name: row.studentName })}>
                            {row.permission && row.permission.expiresAt > Date.now() ? `Editing access until ${displayDeadline(row.permission.expiresAt)}` : "Grant editing access"}
                          </DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    </TableRow>)}
                    {!visibleStudents.length && <TableRow><TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">{search ? "No students match this search." : "No registered students in this course and semester."}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 border-t bg-muted/15 p-3">
                <Button variant="outline" size="sm" disabled={cursors.length === 1} onClick={() => changePage(cursors.slice(0, -1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={gradebook.isDone} onClick={() => changePage([...cursors, gradebook.continueCursor])}>Next 50 students</Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      {decision && decision.rows.length > 0 && <ReviewDecisionDialog courseId={courseId} periodId={periodId} rows={decision.rows} decision={decision.action} close={() => { setDecision(undefined); setSelected(new Set()); }} />}
      {grantStudent && <MarkPermissionDialog courseId={courseId} periodId={periodId} studentId={grantStudent.id} studentName={grantStudent.name} mode="grant" close={() => setGrantStudent(undefined)} />}
      {settings && <GradebookSettingsDialog courseId={courseId} periodId={periodId} entriesCloseAt={gradebook.entriesCloseAt}
        freezeAtDeadline={gradebook.freezeAtDeadline} close={() => setSettings(false)} />}
    </div>
  );
}

function SummaryTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="min-w-28 rounded-sm border bg-card px-3 py-2.5"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[11px]">{label}</span></div><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>;
}

function MarkStatus({ status }: { status: string }) {
  const tone = status === "approved" ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : status === "submitted" ? "border-primary/20 bg-primary/10 text-primary"
      : status === "returned" ? "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`rounded-sm capitalize ${tone}`}>{status}</Badge>;
}

function MissingValue() {
  return <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Not entered</span>;
}
