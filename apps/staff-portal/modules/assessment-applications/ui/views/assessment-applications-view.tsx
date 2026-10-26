"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { Check, Clock3, Eye, FileText, Search, X } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";

type Application = FunctionReturnType<typeof api.assessmentApplications.forAssignedLecturer>["page"][number];
type Status = Application["status"];
const statusTabs: { value: Status | "all"; label: string }[] = [
  { value: "submitted", label: "With me" }, { value: "under_review", label: "In review" },
  { value: "approved", label: "Approved" }, { value: "rejected", label: "Declined" }, { value: "all", label: "All" },
];

export function AssessmentApplicationsView() {
  const { roles, isLoading } = useCurrentUser();
  const canReview = roles.some((role) => ["lecturer", "senior_lecturer", "hod"].includes(role.toLowerCase()));
  const applications = usePaginatedQuery(api.assessmentApplications.forAssignedLecturer, canReview ? {} : "skip", { initialNumItems: 25 });
  const review = useMutation(api.assessmentApplications.review);
  const [status, setStatus] = useState<Status | "all">("submitted");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (isLoading) return <main className="min-h-full min-w-0 space-y-4 p-3 md:p-5"><Skeleton className="h-10 w-full" /></main>;
  if (!canReview) return <main className="min-h-full min-w-0 p-3 md:p-5"><Alert><FileText className="size-4" /><AlertTitle>Lecturer access required</AlertTitle><AlertDescription>Assessment applications are reviewed by lecturers assigned to the student’s course unit. This account does not have lecturer review access.</AlertDescription></Alert></main>;
  const normalized = search.trim().toLowerCase();
  const all = applications.results;
  const filtered = all.filter(item => (status === "all" || item.status === status)
    && (!normalized || [item.studentName, item.registrationNumber, item.courseCode, item.courseTitle, item.periodName].some(value => value.toLowerCase().includes(normalized))));

  async function decide(decision: "under_review" | "approved" | "rejected") {
    if (!selected) return;
    if (decision === "rejected" && note.trim().length < 5) return toast.error("Add a short reason before declining this application.");
    setBusy(true);
    try {
      await review({ applicationId: selected._id, decision, note: note.trim() || undefined });
      toast.success(decision === "under_review" ? "Application marked as in review." : decision === "approved" ? "Application approved." : "Application declined.");
      setSelected(null);
      setNote("");
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not update this application.")); }
    finally { setBusy(false); }
  }

  return <main className="min-h-full min-w-0 space-y-4 p-3 md:p-5">
    <div className="flex items-center gap-2"><FileText className="size-5 text-primary" /><h1 className="text-xl font-semibold">Missed Assessment Applications</h1></div>
    <p className="text-sm text-muted-foreground">Review student requests for missed assessments in course units assigned to you.</p>
    <Tabs value={status} onValueChange={value => setStatus(value as Status | "all")}>
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
        {statusTabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">{tab.label}<span className="ml-1 tabular-nums">{tab.value === "all" ? all.length : all.filter(item => item.status === tab.value).length}</span></TabsTrigger>)}
      </TabsList>
    </Tabs>
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search student or course unit" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {applications.status === "LoadingFirstPage" ? <div className="space-y-2">{[1, 2, 3].map(row => <Skeleton key={row} className="h-12 w-full" />)}</div>
      : <div className="w-full overflow-x-auto"><Table>
        <TableHeader><TableRow className="bg-primary/5 hover:bg-primary/5"><TableHead className="w-14 text-center">#</TableHead><TableHead>Student</TableHead><TableHead>Course unit</TableHead><TableHead>Circumstance</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map((item, index) => <TableRow key={item._id}>
          <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
          <TableCell className="min-w-44"><span className="block font-medium">{item.studentName}</span><span className="font-mono text-xs text-muted-foreground">{item.registrationNumber}</span></TableCell>
          <TableCell className="min-w-48"><span className="block font-medium">{item.courseTitle}</span><span className="font-mono text-xs text-muted-foreground">{item.courseCode} · {item.periodName}</span></TableCell>
          <TableCell className="capitalize">{(item.applicationType ?? "other").replaceAll("_", " ")}</TableCell>
          <TableCell>{new Date(item.submittedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</TableCell>
          <TableCell><ApplicationStatus status={item.status} /></TableCell>
          <TableCell className="text-right"><Button variant="ghost" size="sm" className="rounded-sm text-primary" onClick={() => { setSelected(item); setNote(""); }}><Eye className="mr-1.5 size-4" />Details</Button></TableCell>
        </TableRow>)}
        {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">{all.length ? "No applications match these filters." : "No applications have been submitted for your course units."}</TableCell></TableRow>}</TableBody>
      </Table></div>}
    {applications.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => applications.loadMore(25)}>Load more applications</Button></div>}
    <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <SheetContent className="w-[94vw] gap-0 overflow-y-auto rounded-l-sm p-0 sm:w-[62.5vw] sm:max-w-none">
        {selected && <>
          <SheetHeader className="border-b bg-muted/20 px-6 py-5 pr-14 text-left"><SheetTitle>{selected.courseCode} · {selected.courseTitle}</SheetTitle><SheetDescription>Missed assessment application · {selected.periodName}</SheetDescription><ApplicationStatus status={selected.status} /></SheetHeader>
          <div className="space-y-6 px-6 py-5">
            <section><h2 className="text-sm font-semibold">Student</h2><p className="mt-2 text-sm">{selected.studentName}</p><p className="font-mono text-xs text-muted-foreground">{selected.registrationNumber}</p></section>
            <section><h2 className="text-sm font-semibold">Application</h2><dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2"><Detail label="Circumstance" value={(selected.applicationType ?? "other").replaceAll("_", " ")} /><Detail label="Submitted" value={new Date(selected.submittedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} /></dl><p className="mt-4 whitespace-pre-wrap rounded-sm bg-muted/30 p-4 text-sm leading-6">{selected.reason}</p>
              {selected.attachmentUrl && <a href={selected.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline"><FileText className="size-4" />Open supporting evidence</a>}
            </section>
            {selected.reviewNote && <section><h2 className="text-sm font-semibold">Decision note</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selected.reviewNote}</p></section>}
            {(selected.status === "submitted" || selected.status === "under_review") && <section className="space-y-3 border-t pt-4"><label className="block text-sm font-medium" htmlFor="assessment-review-note">Note <span className="font-normal text-muted-foreground">(required to decline)</span></label><textarea id="assessment-review-note" rows={3} value={note} onChange={event => setNote(event.target.value)} className="w-full rounded-sm border bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Add a note for the student" />
              <div className="flex flex-wrap justify-end gap-2">{selected.status === "submitted" && <Button variant="outline" disabled={busy} onClick={() => decide("under_review")}><Clock3 className="mr-1.5 size-4" />Start review</Button>}<Button variant="outline" disabled={busy} onClick={() => decide("rejected")}><X className="mr-1.5 size-4" />Decline</Button><Button disabled={busy} onClick={() => decide("approved")}><Check className="mr-1.5 size-4" />Approve</Button></div>
            </section>}
          </div>
        </>}
      </SheetContent>
    </Sheet>
  </main>;
}

function ApplicationStatus({ status }: { status: Status }) {
  const labels: Record<Status, string> = { submitted: "With lecturer", under_review: "In review", approved: "Approved", rejected: "Declined" };
  const colors: Record<Status, string> = { submitted: "bg-amber-500/10 text-amber-700", under_review: "bg-primary/10 text-primary", approved: "bg-emerald-500/10 text-emerald-700", rejected: "bg-destructive/10 text-destructive" };
  return <Badge variant="secondary" className={`w-fit rounded-sm ${colors[status]}`}>{labels[status]}</Badge>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-border/50 pb-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium capitalize">{value}</dd></div>;
}
