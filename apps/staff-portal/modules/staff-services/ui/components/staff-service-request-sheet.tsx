"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Sheet, WideSheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

type ReviewMode = "own" | "supervisor" | "hr";

export function StaffServiceRequestSheet({ requestId, mode, open, onOpenChange }: {
  requestId: Id<"staffServiceRequests"> | null;
  mode: ReviewMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useQuery(api.staffServices.getRequestDetails, requestId ? { requestId } : "skip");
  const submitRequest = useMutation(api.staffServices.submitRequest);
  const withdraw = useMutation(api.staffServices.withdrawRequest);
  const reviewAsSupervisor = useMutation(api.staffServices.reviewAsSupervisor);
  const decideAsHr = useMutation(api.staffServices.decideAsHr);
  const updateClearance = useMutation(api.staffServices.updateExitClearanceTask);
  const submitDefense = useMutation(api.staffServices.submitDefenseResponse);
  const completeDefense = useMutation(api.staffServices.completeDefenseCase);
  const generateUploadUrl = useMutation(api.staffServices.generateServiceUploadUrl);
  const attachFile = useMutation(api.staffServices.attachRequestFile);
  const [note, setNote] = useState("");
  const [response, setResponse] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await action(); toast.success(success); onOpenChange(false); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not update this request.")); }
    finally { setBusy(false); }
  }

  async function uploadSelectedFiles() {
    if (!requestId || files.length > 10) throw new Error("Attach no more than 10 files.");
    for (const file of files) {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!result.ok) throw new Error(`Could not upload ${file.name}.`);
      const body = await result.json() as { storageId: Id<"_storage"> };
      await attachFile({ requestId, fileId: body.storageId, fileName: file.name });
    }
  }

  async function submitDefenseResponse() {
    if (response.trim().length < 10) return toast.error("Add a response with at least 10 characters.");
    setBusy(true);
    try { await uploadSelectedFiles(); await submitDefense({ requestId: requestId!, response }); toast.success("Response submitted to Human Resources."); onOpenChange(false); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit your response.")); }
    finally { setBusy(false); }
  }

  const request = data?.request;
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <WideSheetContent className="overflow-hidden rounded-l-sm p-0">
      {request && <>
        <SheetHeader className="border-b px-6 py-5 pr-14 text-left"><SheetTitle>{request.subject}</SheetTitle><SheetDescription className="capitalize">{request.type === "exit" ? "Exit application" : request.type} · {request.caseReference ?? request.status.replaceAll("_", " ")}</SheetDescription><Badge variant="outline" className="w-fit rounded-sm">{request.status.replaceAll("_", " ")}</Badge></SheetHeader>
        <ScrollArea className="h-[calc(100dvh-100px)]"><div className="space-y-6 p-6">
          <section className="grid gap-4 sm:grid-cols-2">
            {request.leaveType && <Detail label="Leave type" value={request.leaveType} />}
            {request.startDate && <Detail label="From" value={request.startDate} />}
            {request.endDate && <Detail label="Through" value={request.endDate} />}
            {request.proposedLastDay && <Detail label="Proposed last day" value={request.proposedLastDay} />}
            {request.complaintCategory && <Detail label="Category" value={request.complaintCategory} />}
            {request.involvedPeople && <Detail label="People involved" value={request.involvedPeople} />}
            {request.handoverPlan && <Detail label="Handover plan" value={request.handoverPlan} />}
          </section>
          <section className="space-y-2"><h3 className="text-sm font-semibold">Details</h3><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{request.details}</p></section>
          {request.type === "defense" && <section className="space-y-2"><h3 className="text-sm font-semibold">Staff response</h3>{request.response ? <p className="whitespace-pre-wrap text-sm leading-6">{request.response}</p> : <p className="text-sm text-muted-foreground">No response submitted yet.</p>}</section>}
          {data.files.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold">Attachments</h3><ul className="space-y-2">{data.files.map(file => <li key={file._id}><a className="text-sm text-primary underline underline-offset-4" href={file.url ?? undefined} target="_blank" rel="noreferrer">{file.fileName}</a><span className="ml-2 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</span></li>)}</ul></section>}
          {data.clearanceTasks.length > 0 && <section className="space-y-3"><h3 className="text-sm font-semibold">Exit clearance</h3>{data.clearanceTasks.map(task => <div key={task._id} className="flex flex-wrap items-center gap-3 border-b border-border/70 pb-3"><div className="min-w-48 flex-1"><p className="text-sm font-medium">{task.department}</p><p className="text-xs text-muted-foreground">{task.task}</p>{task.note && <p className="mt-1 text-xs">{task.note}</p>}</div><Badge variant="outline" className="rounded-sm capitalize">{task.status.replaceAll("_", " ")}</Badge>{mode === "hr" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void runAction(() => updateClearance({ taskId: task._id, status: task.status === "pending" ? "cleared" : "pending" }), task.status === "pending" ? "Clearance marked complete." : "Clearance reopened.")}>{task.status === "pending" ? "Mark cleared" : "Reopen"}</Button>}</div>)}</section>}
          {data.events.length > 0 && <section className="space-y-3"><h3 className="text-sm font-semibold">Request history</h3>{data.events.map(event => <div key={event._id} className="border-l-2 border-primary/20 pl-3"><p className="text-sm font-medium capitalize">{event.kind.replaceAll("_", " ")}</p>{event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}<p className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></div>)}</section>}
          {mode === "supervisor" && request.status === "supervisor_review" && <DecisionPanel note={note} setNote={setNote} disabled={busy} actions={[{ label: "Forward to HR", run: () => runAction(() => reviewAsSupervisor({ requestId: request._id, decision: "forward", note }), "Request forwarded to Human Resources.") }, { label: "Return to staff", run: () => runAction(() => reviewAsSupervisor({ requestId: request._id, decision: "return", note }), "Request returned to the staff member.") }, { label: "Decline", run: () => runAction(() => reviewAsSupervisor({ requestId: request._id, decision: "reject", note }), "Request declined.") }]} />}
          {mode === "hr" && request.status === "hr_review" && <DecisionPanel note={note} setNote={setNote} disabled={busy} actions={request.type === "complaint" ? [{ label: "Resolve complaint", run: () => runAction(() => decideAsHr({ requestId: request._id, decision: "resolve", note }), "Complaint marked resolved.") }, { label: "Return", run: () => runAction(() => decideAsHr({ requestId: request._id, decision: "return", note }), "Complaint returned for more information.") }] : [{ label: "Approve", run: () => runAction(() => decideAsHr({ requestId: request._id, decision: "approve", note }), request.type === "exit" ? "Exit request approved; clearance has started." : "Leave request approved.") }, { label: "Return", run: () => runAction(() => decideAsHr({ requestId: request._id, decision: "return", note }), "Request returned for more information.") }, { label: "Decline", run: () => runAction(() => decideAsHr({ requestId: request._id, decision: "reject", note }), "Request declined.") }]} />}
          {mode === "own" && request.status === "draft" && request.type !== "defense" && <Button disabled={busy} onClick={() => void runAction(() => submitRequest({ requestId: request._id }), "Request submitted.")}>Submit draft</Button>}
          {mode === "own" && request.type === "defense" && request.status === "response_due" && <section className="space-y-3 border-t border-border pt-4"><h3 className="text-sm font-semibold">Submit your response</h3><Textarea rows={6} value={response} onChange={event => setResponse(event.target.value)} placeholder="Enter your response to the notice." /><Input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={event => setFiles(Array.from(event.target.files ?? []))} /><Button disabled={busy} onClick={() => void submitDefenseResponse()}>{busy ? "Submitting…" : "Submit response"}</Button></section>}
          {mode === "hr" && request.type === "defense" && request.status === "response_submitted" && <DecisionPanel note={note} setNote={setNote} disabled={busy} actions={[{ label: "Close case with outcome", run: () => runAction(() => completeDefense({ requestId: request._id, outcome: note }), "Case outcome saved.") }]} />}
          {mode === "own" && ["draft", "submitted", "supervisor_review", "hr_review", "returned"].includes(request.status) && <Button variant="outline" disabled={busy} onClick={() => void runAction(() => withdraw({ requestId: request._id }), "Request withdrawn.")}>Withdraw request</Button>}
        </div></ScrollArea>
      </>}
      {!request && open && <p className="p-6 text-sm text-muted-foreground">Loading request details…</p>}
    </WideSheetContent>
  </Sheet>;
}

function DecisionPanel({ note, setNote, disabled, actions }: { note: string; setNote: (value: string) => void; disabled: boolean; actions: { label: string; run: () => void }[] }) {
  return <section className="space-y-3 border-t border-border pt-4"><h3 className="text-sm font-semibold">Decision</h3><Textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Add a note explaining the decision." /><div className="flex flex-wrap justify-end gap-2">{actions.map(action => <Button key={action.label} variant={action.label === "Decline" ? "destructive" : action.label.includes("Approve") || action.label.includes("Resolve") || action.label.includes("Forward") ? "default" : "outline"} disabled={disabled || note.trim().length < 3} onClick={action.run}>{action.label}</Button>)}</div></section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm">{value}</p></div>;
}
