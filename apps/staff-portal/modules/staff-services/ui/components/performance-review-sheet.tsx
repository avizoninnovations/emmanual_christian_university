"use client";

import { useEffect, useState } from "react";
import { useForm, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import * as z from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Button } from "@workspace/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

type ReviewMode = "own" | "supervisor" | "hr";
const selfSchema = z.object({ selfSummary: z.string().trim().min(10).max(5000), achievements: z.string().trim().min(10).max(5000), developmentGoals: z.string().trim().min(10).max(5000) });
const decisionSchema = z.object({ rating: z.string().min(1), comment: z.string().trim().min(10).max(5000) });
type SelfValues = z.infer<typeof selfSchema>;
type DecisionValues = z.infer<typeof decisionSchema>;

export function PerformanceReviewSheet({ reviewId, mode, open, onOpenChange }: { reviewId: Id<"staffPerformanceReviews"> | null; mode: ReviewMode; open: boolean; onOpenChange: (open: boolean) => void }) {
  const data = useQuery(api.staffReviews.getPerformanceReviewDetails, reviewId ? { reviewId } : "skip");
  const acknowledgeReview = useMutation(api.staffReviews.acknowledgePerformanceReview);
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-[94vw] overflow-hidden rounded-l-sm p-0 sm:w-[62vw] sm:max-w-none">
    {data && <>
      <SheetHeader className="border-b px-6 py-5 pr-14 text-left"><SheetTitle>{data.review.cycleTitle}</SheetTitle><SheetDescription>{data.review.staffName} · {data.review.status.replaceAll("_", " ")}</SheetDescription></SheetHeader>
      <ScrollArea className="h-[calc(100dvh-84px)]"><div className="space-y-5 p-6">
        {data.review.selfSummary && <ReviewSection title="Staff self-review" items={[["Summary", data.review.selfSummary], ["Achievements", data.review.achievements ?? ""], ["Development goals", data.review.developmentGoals ?? ""]]} />}
        {data.review.supervisorComment && <ReviewSection title={`Supervisor review · ${data.review.supervisorRating ?? "—"}/5`} items={[["Feedback", data.review.supervisorComment]]} />}
        {data.review.hrComment && <ReviewSection title={`HR final review · ${data.review.hrRating ?? "—"}/5`} items={[["Outcome", data.review.hrComment]]} />}
        {data.files.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold">Evidence</h3>{data.files.map(file => <a key={file._id} href={file.url ?? undefined} target="_blank" rel="noreferrer" className="block text-sm text-primary underline underline-offset-4">{file.fileName}</a>)}</section>}
        {mode === "own" && data.review.status === "self_review" && <SelfReviewForm reviewId={data.review._id} values={data.review} onComplete={() => onOpenChange(false)} />}
        {mode === "supervisor" && data.review.status === "supervisor_review" && <ReviewDecisionForm mode="supervisor" reviewId={data.review._id} onComplete={() => onOpenChange(false)} />}
        {mode === "hr" && data.review.status === "hr_review" && <ReviewDecisionForm mode="hr" reviewId={data.review._id} onComplete={() => onOpenChange(false)} />}
        {mode === "own" && data.review.status === "completed" && !data.review.acknowledgedAt && <Button onClick={() => void acknowledge(acknowledgeReview, data.review._id, onOpenChange)}>Acknowledge final review</Button>}
      </div></ScrollArea>
    </>}
    {!data && open && <p className="p-6 text-sm text-muted-foreground">Loading review…</p>}
  </SheetContent></Sheet>;
}

function SelfReviewForm({ reviewId, values, onComplete }: { reviewId: Id<"staffPerformanceReviews">; values: { selfSummary?: string; achievements?: string; developmentGoals?: string }; onComplete: () => void }) {
  const save = useMutation(api.staffReviews.saveSelfReview);
  const submit = useMutation(api.staffReviews.submitSelfReview);
  const uploadUrl = useMutation(api.staffServices.generateServiceUploadUrl);
  const attach = useMutation(api.staffReviews.attachPerformanceReviewFile);
  const [files, setFiles] = useState<File[]>([]);
  const form = useForm<SelfValues>({ resolver: zodResolver(selfSchema), defaultValues: { selfSummary: values.selfSummary ?? "", achievements: values.achievements ?? "", developmentGoals: values.developmentGoals ?? "" } });
  useEffect(() => form.reset({ selfSummary: values.selfSummary ?? "", achievements: values.achievements ?? "", developmentGoals: values.developmentGoals ?? "" }), [form, values]);

  async function uploadFiles() {
    if (files.length > 10) throw new Error("Choose no more than 10 evidence files.");
    for (const file of files) {
      const url = await uploadUrl({});
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!response.ok) throw new Error(`Could not upload ${file.name}.`);
      const body = await response.json() as { storageId: Id<"_storage"> };
      await attach({ reviewId, fileId: body.storageId, fileName: file.name });
    }
    setFiles([]);
  }

  async function persistValues(valuesToSave: SelfValues) {
    await save({ reviewId, ...valuesToSave });
    await uploadFiles();
  }

  async function saveDraft(valuesToSave: SelfValues) {
    try { await persistValues(valuesToSave); toast.success("Self-review saved."); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not save the self-review.")); }
  }

  async function submitReview(valuesToSubmit: SelfValues) {
    try { await persistValues(valuesToSubmit); await submit({ reviewId }); toast.success("Self-review submitted to your supervisor."); onComplete(); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit the self-review.")); }
  }

  return <Form {...form}><form className="space-y-4 border-t border-border pt-4">
    <h3 className="text-sm font-semibold">Your self-review</h3>
    <ReviewTextField form={form} name="selfSummary" label="Summary of your work" />
    <ReviewTextField form={form} name="achievements" label="Key achievements" />
    <ReviewTextField form={form} name="developmentGoals" label="Development goals" />
    <div className="space-y-2"><label htmlFor="review-evidence" className="text-sm font-medium">Evidence files (optional)</label><Input id="review-evidence" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={event => setFiles(Array.from(event.target.files ?? []))} /></div>
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={form.handleSubmit(saveDraft)}>Save draft</Button><Button type="button" disabled={form.formState.isSubmitting} onClick={form.handleSubmit(submitReview)}>{form.formState.isSubmitting ? "Saving…" : "Submit to supervisor"}</Button></div>
  </form></Form>;
}

function ReviewDecisionForm({ reviewId, mode, onComplete }: { reviewId: Id<"staffPerformanceReviews">; mode: "supervisor" | "hr"; onComplete: () => void }) {
  const submitSupervisor = useMutation(api.staffReviews.submitSupervisorReview);
  const finalize = useMutation(api.staffReviews.finalizePerformanceReview);
  const form = useForm<DecisionValues>({ resolver: zodResolver(decisionSchema), defaultValues: { rating: "", comment: "" } });
  async function onSubmit(values: DecisionValues) {
    const rating = Number(values.rating);
    try {
      if (mode === "supervisor") await submitSupervisor({ reviewId, rating, comment: values.comment });
      else await finalize({ reviewId, rating, comment: values.comment });
      toast.success(mode === "supervisor" ? "Supervisor review submitted to HR." : "Performance review finalized.");
      onComplete();
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit this review.")); }
  }
  return <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border-t border-border pt-4"><h3 className="text-sm font-semibold">{mode === "supervisor" ? "Supervisor assessment" : "HR final review"}</h3>
    <FormField control={form.control} name="rating" render={({ field }) => <FormItem><FormLabel>Rating</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Choose rating" /></SelectTrigger></FormControl><SelectContent>{[1, 2, 3, 4, 5].map(value => <SelectItem key={value} value={String(value)}>{value} / 5</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
    <ReviewTextField form={form} name="comment" label="Feedback" />
    <div className="flex justify-end"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Submitting…" : mode === "supervisor" ? "Send to HR" : "Finalize review"}</Button></div>
  </form></Form>;
}

function ReviewTextField<T extends FieldValues, N extends FieldPath<T>>({ form, name, label }: { form: UseFormReturn<T>; name: N; label: string }) {
  return <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><Textarea rows={4} maxLength={5000} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />;
}

function ReviewSection({ title, items }: { title: string; items: [string, string][] }) {
  return <section className="space-y-3"><h3 className="text-sm font-semibold">{title}</h3>{items.map(([label, value]) => <div key={label}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{value}</p></div>)}</section>;
}

async function acknowledge(acknowledgeReview: (args: { reviewId: Id<"staffPerformanceReviews"> }) => Promise<null>, reviewId: Id<"staffPerformanceReviews">, onOpenChange: (open: boolean) => void) {
  try {
    await acknowledgeReview({ reviewId });
    toast.success("Review acknowledged.");
    onOpenChange(false);
  } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not acknowledge this review.")); }
}
