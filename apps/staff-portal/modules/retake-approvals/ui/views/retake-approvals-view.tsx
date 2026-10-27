"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { Check, Eye, GraduationCap, Search, X } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Sheet, WideSheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";

type PendingReview = FunctionReturnType<typeof api.retakeRegistrations.pendingReviews>["page"][number];

export function RetakeApprovalsView() {
  const page = usePaginatedQuery(api.retakeRegistrations.pendingReviews, {}, { initialNumItems: 25 });
  const review = useMutation(api.retakeRegistrations.review);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PendingReview | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const term = search.trim().toLowerCase();
  const rows = page.results.filter(item => [item.studentName, item.registrationNumber, item.courseCode, item.courseTitle, item.periodName].some(value => value.toLowerCase().includes(term)));

  async function decide(decision: "approve" | "decline") {
    if (!selected) return;
    if (decision === "decline" && note.trim().length < 5) return toast.error("Add a short reason before declining this request.");
    setBusy(true);
    try {
      await review({ registrationId: selected._id, decision, note: note.trim() || undefined });
      toast.success(decision === "approve" ? "Retake approved and registered." : "Retake request declined.");
      setSelected(null);
      setNote("");
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not review this retake request.")); }
    finally { setBusy(false); }
  }

  return <main className="min-h-full min-w-0 space-y-4 p-3 md:p-5">
    <div className="flex items-center gap-2"><GraduationCap className="size-5 text-primary" /><h1 className="text-xl font-semibold">Retake Approvals</h1><Badge variant="secondary" className="ml-auto rounded-sm">{page.results.length}{page.status === "CanLoadMore" ? "+" : ""} pending</Badge></div>
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search student or course unit" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {page.status === "LoadingFirstPage" ? <div className="space-y-2">{[1, 2, 3].map(item => <Skeleton key={item} className="h-12 " />)}</div>
      : <div className="overflow-x-auto"><Table>
        <TableHeader><TableRow className="bg-primary/5 hover:bg-primary/5"><TableHead className="w-14 text-center">#</TableHead><TableHead>Student</TableHead><TableHead>Course unit</TableHead><TableHead>Failed in</TableHead><TableHead>Requested for</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((item, index) => <TableRow key={item._id}>
          <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
          <TableCell className="min-w-44"><span className="block font-medium">{item.studentName}</span><span className="font-mono text-xs text-muted-foreground">{item.registrationNumber}</span></TableCell>
          <TableCell className="min-w-48"><span className="block font-medium">{item.courseTitle}</span><span className="font-mono text-xs text-muted-foreground">{item.courseCode}</span></TableCell>
          <TableCell>{item.failedPeriodName} · {item.previousGrade}</TableCell><TableCell>{item.periodName}</TableCell>
          <TableCell><Button variant="ghost" size="sm" className="rounded-sm text-primary" onClick={() => { setSelected(item); setNote(""); }}><Eye className="mr-1.5 size-4" />Review</Button></TableCell>
        </TableRow>)}
        {rows.length === 0 && <TableRow><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">{page.results.length ? "No requests match your search." : "No off-semester retakes are awaiting approval."}</TableCell></TableRow>}</TableBody>
      </Table></div>}
    {page.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => page.loadMore(25)}>Load more requests</Button></div>}
    <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <WideSheetContent className="gap-0 overflow-y-auto rounded-l-sm p-0">
        {selected && <>
          <SheetHeader className="border-b bg-muted/20 px-6 py-5 pr-14 text-left"><SheetTitle>{selected.courseCode} · {selected.courseTitle}</SheetTitle><SheetDescription>Off-semester retake request · {selected.periodName}</SheetDescription><Badge variant="secondary" className="w-fit rounded-sm bg-amber-500/10 text-amber-700">Awaiting review</Badge></SheetHeader>
          <div className="space-y-5 px-6 py-5"><section><h2 className="text-sm font-semibold">Student</h2><p className="mt-2 text-sm">{selected.studentName}</p><p className="font-mono text-xs text-muted-foreground">{selected.registrationNumber}</p></section>
            <section><h2 className="text-sm font-semibold">Requested registration</h2><p className="mt-2 text-sm">{selected.courseCode} · {selected.courseTitle}</p><p className="mt-1 text-xs text-muted-foreground">For {selected.periodName}</p><p className="mt-1 text-xs text-muted-foreground">Previous failed attempt: {selected.failedPeriodName} · Grade {selected.previousGrade}</p></section>
            <label className="block text-sm font-medium" htmlFor="retake-decision-note">Decision note <span className="font-normal text-muted-foreground">(required to decline)</span><Textarea id="retake-decision-note" className="mt-2" rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Add a short note for the student" /></label>
            <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" disabled={busy} onClick={() => decide("decline")}><X className="mr-1.5 size-4" />Decline</Button><Button disabled={busy} onClick={() => decide("approve")}><Check className="mr-1.5 size-4" />Approve retake</Button></div>
          </div>
        </>}
      </WideSheetContent>
    </Sheet>
  </main>;
}
