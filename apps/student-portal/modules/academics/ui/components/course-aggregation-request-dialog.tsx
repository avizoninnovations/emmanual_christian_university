"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Textarea } from "@workspace/ui/components/textarea";

const requestSchema = z.object({ reason: z.string().trim().min(10, "Please explain your reason in at least 10 characters.").max(1000, "Keep your reason under 1,000 characters.") });
type Candidate = FunctionReturnType<typeof api.courseUnitAggregations.availableCourses>["courses"][number];

export function CourseAggregationRequestDialog({ course, open, busy, onOpenChange, onSubmit }: {
  course: Candidate | null; open: boolean; busy?: boolean; onOpenChange: (open: boolean) => void; onSubmit: (reason: string) => Promise<void>;
}) {
  const form = useForm<z.infer<typeof requestSchema>>({ resolver: zodResolver(requestSchema), defaultValues: { reason: "" } });
  useEffect(() => { if (open) form.reset({ reason: "" }); }, [open, course?.courseId, form]);
  async function submit(values: z.infer<typeof requestSchema>) {
    await onSubmit(values.reason);
    form.reset({ reason: "" });
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Request a missed paper</DialogTitle>
        <DialogDescription>{course ? `${course.code} · ${course.title} · ${course.creditUnits} CU` : "Select one of your enrolled course units."} The assigned lecturer reviews your request first, followed by the HOD.</DialogDescription></DialogHeader>
      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <FormField control={form.control} name="reason" render={({ field }) => <FormItem>
          <FormLabel>Reason you missed the paper</FormLabel>
          <FormControl><Textarea rows={5} placeholder="Explain why you could not sit the paper. Include relevant circumstances." {...field} /></FormControl>
          <FormDescription>Include the genuine circumstances the lecturer and HOD should consider.</FormDescription><FormMessage />
        </FormItem>} />
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy || form.formState.isSubmitting}>{(busy || form.formState.isSubmitting) && <Loader2 className="mr-2 size-4 animate-spin" />}Request missed paper</Button></DialogFooter>
      </form></Form>
    </DialogContent>
  </Dialog>;
}
