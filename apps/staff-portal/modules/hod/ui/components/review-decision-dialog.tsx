"use client";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@workspace/ui/components/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import type { ClassKey } from "../../hooks/use-hod-scope";

const schema = z.object({ reason: z.string().trim().max(2000) });
export function ReviewDecisionDialog({ courseId, periodId, rows, decision, close }: ClassKey & {
  rows: { studentId: Id<"students">; revision: number }[];
  decision: "approve" | "return" | "withdraw"; close: () => void;
}) {
  const review = useMutation(api.markReview.review);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: "" } });
  const save = form.handleSubmit(async ({ reason }) => {
    if (decision !== "approve" && !reason) { form.setError("reason", { message: "Enter a reason" }); return; }
    try { await review({ courseId, periodId, rows, decision, reason }); toast.success(`Decision saved for ${rows.length} student(s)`); close(); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not review these results")); }
  });
  const subject = rows.length === 1 ? "this result" : `${rows.length} selected results`;
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle className="capitalize">{decision} {subject}</DialogTitle></DialogHeader>
    <p className="text-sm text-muted-foreground">{decision === "approve" ? "These submitted marks will become visible to the selected students." : decision === "withdraw" ? "The published results will be hidden from the selected students." : "These submitted marks will be returned to the lecturer for correction."}</p>
    <Form {...form}><form onSubmit={save} className="space-y-4"><FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Reason {decision === "approve" ? "(optional)" : ""}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
      <Button type="submit" disabled={form.formState.isSubmitting}>Confirm {decision}</Button></form></Form>
  </DialogContent></Dialog>;
}
