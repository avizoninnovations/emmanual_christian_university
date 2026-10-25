"use client";

import { useEffect, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { BookOpen, Check, Clock3, GraduationCap, Loader2, UserRound, X } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { AggregationRequest, RequestStatus } from "./aggregation-request-table";

const decisionSchema = z.object({ note: z.string().max(1000, "Keep the note under 1,000 characters.") });
type DecisionValues = z.infer<typeof decisionSchema>;

export function AggregationRequestDetails({ request, mode, busy, onClose, onDecision }: {
  request: AggregationRequest | null; mode?: "lecturer" | "hod"; busy?: boolean; onClose: () => void;
  onDecision: (decision: "approved" | "rejected", note?: string) => Promise<void>;
}) {
  const form = useForm<DecisionValues>({ resolver: zodResolver(decisionSchema), defaultValues: { note: "" } });
  useEffect(() => { form.reset({ note: "" }); }, [request?._id, form]);
  const canDecide = (mode === "lecturer" && request?.status === "pending_lecturer") || (mode === "hod" && request?.status === "pending_hod");
  async function decide(decision: "approved" | "rejected", values: DecisionValues) {
    const note = values.note.trim();
    if (decision === "rejected" && note.length < 5) {
      form.setError("note", { message: "Add a short reason when declining a request." });
      return;
    }
    await onDecision(decision, note || undefined);
  }

  return <Sheet open={!!request} onOpenChange={open => !open && onClose()}>
    <SheetContent className="w-[94vw] gap-0 overflow-y-auto rounded-l-sm p-0 sm:w-[62.5vw] sm:max-w-none">
      {request && <>
        <SheetHeader className="border-b bg-muted/20 px-6 py-6 pr-14 text-left">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"><BookOpen className="size-5" /></span>
            <div className="min-w-0"><SheetTitle className="text-xl">{request.courseCode} · {request.courseTitle}</SheetTitle>
              <SheetDescription className="mt-1">Missed-paper request · {request.periodName}</SheetDescription></div></div>
          <RequestStatus status={request.status} />
        </SheetHeader>
        <div className="space-y-6 px-6 py-5">
          {request.status === "withdrawn" && <p role="status" className="rounded-sm bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            The student withdrew this request{request.withdrawnAt ? ` on ${formatTime(request.withdrawnAt)}` : ""}. No review or approval is required.
          </p>}
          <section><SectionTitle icon={UserRound}>Student</SectionTitle><dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Name" value={request.studentName} /><Detail label="Registration number" value={request.registrationNumber} />
            <Detail label="Access number" value={request.accessNumber} /><Detail label="Program" value={request.programName} />
            <Detail label="Current year" value={`Year ${request.studentYear}`} /><Detail label="Course credit units" value={`${request.creditUnits} CU`} />
          </dl></section>
          <section><SectionTitle icon={GraduationCap}>Course and teaching assignment</SectionTitle><dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Course unit" value={`${request.courseCode} · ${request.courseTitle}`} /><Detail label="Department" value={request.departmentName} />
            <Detail label="Course program and sequence" value={`${request.courseProgramName} · Year ${request.courseYear}, Semester ${request.courseSemester}`} />
            <Detail label="Assigned lecturer" value={request.lecturerName} /><Detail label="Academic Period" value={request.periodName} />
          </dl></section>
          <section><SectionTitle icon={Clock3}>Student request</SectionTitle><p className="mt-3 whitespace-pre-wrap rounded-sm bg-muted/30 p-4 text-sm leading-6">{request.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">Submitted {formatTime(request.requestedAt)}</p></section>
          {(request.lecturerDecisionNote || request.hodDecisionNote) && <section><SectionTitle icon={Check}>Review notes</SectionTitle>
            {request.lecturerDecisionNote && <p className="mt-3 border-l-2 border-primary/30 pl-3 text-sm"><span className="font-medium">Lecturer:</span> {request.lecturerDecisionNote}</p>}
            {request.hodDecisionNote && <p className="mt-3 border-l-2 border-primary/30 pl-3 text-sm"><span className="font-medium">HOD:</span> {request.hodDecisionNote}</p>}
          </section>}
          {canDecide && <Form {...form}><form className="space-y-4 border-t pt-4" onSubmit={event => event.preventDefault()}>
            <FormField control={form.control} name="note" render={({ field }) => <FormItem>
              <FormLabel>Decision note <span className="font-normal text-muted-foreground">(required when declining)</span></FormLabel>
              <FormControl><Textarea rows={3} placeholder="Add a note for the student and the next reviewer." {...field} /></FormControl>
              <FormMessage />
            </FormItem>} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={form.handleSubmit(values => decide("rejected", values))}><X className="mr-1.5 size-4" />Decline request</Button>
              <Button type="button" disabled={busy} onClick={form.handleSubmit(values => decide("approved", values))}>
                {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Check className="mr-1.5 size-4" />}{mode === "lecturer" ? "Endorse for HOD review" : "Approve missed-paper request"}
              </Button>
            </div>
          </form></Form>}
        </div>
      </>}
    </SheetContent>
  </Sheet>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-b border-border/50 pb-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>;
}
function SectionTitle({ icon: Icon, children }: { icon: typeof BookOpen; children: ReactNode }) {
  return <h2 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" />{children}</h2>;
}
function formatTime(timestamp: number) { return new Date(timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }); }
