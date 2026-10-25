"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import * as z from "zod";
import { api } from "@workspace/backend/_generated/api";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";

const schema = z.object({
  title: z.string().trim().min(3).max(120), startsAt: z.string().min(1), endsAt: z.string().min(1),
  selfDeadline: z.string().optional(), supervisorDeadline: z.string().optional(), anonymousFeedback: z.boolean(),
  minimumFeedbackCount: z.coerce.number().int().min(1).max(100),
}).refine(values => values.startsAt < values.endsAt, { path: ["endsAt"], message: "End date must be after start date." });

type Values = z.infer<typeof schema>;

export function ReviewCycleManager({ type }: { type: "performance" | "supervisor_feedback" }) {
  const cycles = usePaginatedQuery(api.staffReviews.getHrReviewCycles, {}, { initialNumItems: 20 });
  const create = useMutation(api.staffReviews.createReviewCycle);
  const close = useMutation(api.staffReviews.closeReviewCycle);
  const [busyId, setBusyId] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", startsAt: "", endsAt: "", selfDeadline: "", supervisorDeadline: "", anonymousFeedback: false, minimumFeedbackCount: 5 } });

  async function onSubmit(values: Values) {
    try {
      const timestamp = (date: string) => new Date(`${date}T23:59:59`).getTime();
      await create({
        type, title: values.title, startsAt: new Date(`${values.startsAt}T00:00:00`).getTime(), endsAt: timestamp(values.endsAt),
        ...(values.selfDeadline ? { selfDeadline: timestamp(values.selfDeadline) } : {}),
        ...(values.supervisorDeadline ? { supervisorDeadline: timestamp(values.supervisorDeadline) } : {}),
        anonymousFeedback: type === "supervisor_feedback" && values.anonymousFeedback,
        minimumFeedbackCount: type === "supervisor_feedback" ? values.minimumFeedbackCount : 1,
      });
      form.reset();
      toast.success("Review cycle opened.");
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not open the review cycle.")); }
  }

  async function closeCycle(cycleId: (typeof cycles.results)[number]["_id"]) {
    setBusyId(cycleId);
    try { await close({ cycleId }); toast.success("Review cycle closed."); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not close the review cycle.")); }
    finally { setBusyId(null); }
  }

  return <Card className="rounded-sm border-border/70 shadow-none">
    <CardHeader className="pb-3"><CardTitle className="text-base">Manage review cycles</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <CycleField form={form} name="title" label="Cycle name" type="text" />
        <CycleField form={form} name="startsAt" label="Opens" type="date" />
        <CycleField form={form} name="endsAt" label="Closes" type="date" />
        <CycleField form={form} name="selfDeadline" label="Staff submission deadline" type="date" />
        <CycleField form={form} name="supervisorDeadline" label="Reviewer deadline" type="date" />
        {type === "supervisor_feedback" && <>
          <FormField control={form.control} name="anonymousFeedback" render={({ field }) => <FormItem className="flex flex-row items-center gap-2 pt-7"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Hide respondent names from HR feedback view</FormLabel></FormItem>} />
          <CycleField form={form} name="minimumFeedbackCount" label="Minimum responses before review" type="number" />
        </>}
        <div className="flex items-end justify-end"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Opening…" : "Open cycle"}</Button></div>
      </form></Form>
      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Open cycles</h3>
        {cycles.results.filter(cycle => cycle.type === type).map(cycle => <div key={cycle._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 py-2"><div><p className="text-sm font-medium">{cycle.title}</p><p className="text-xs text-muted-foreground">{new Date(cycle.startsAt).toLocaleDateString("en-GB")} – {new Date(cycle.endsAt).toLocaleDateString("en-GB")}</p></div><Badge variant="outline" className="rounded-sm">Open</Badge><Button size="sm" variant="outline" disabled={busyId === cycle._id} onClick={() => void closeCycle(cycle._id)}>Close cycle</Button></div>)}
        {cycles.results.filter(cycle => cycle.type === type).length === 0 && <p className="text-sm text-muted-foreground">No open cycles.</p>}
        {cycles.status === "CanLoadMore" && <Button size="sm" variant="outline" onClick={() => cycles.loadMore(20)}>Load more cycles</Button>}
      </div>
    </CardContent>
  </Card>;
}

function CycleField({ form, name, label, type }: { form: ReturnType<typeof useForm<Values>>; name: "title" | "startsAt" | "endsAt" | "selfDeadline" | "supervisorDeadline" | "minimumFeedbackCount"; label: string; type: string }) {
  return <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={type} min={type === "number" ? 1 : undefined} {...field} value={field.value ?? ""} className="rounded-sm" /></FormControl><FormMessage /></FormItem>} />;
}
