"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import * as z from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { MessageSquareText } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { ReviewCycleManager } from "../components/review-cycle-manager";

const questions = [
  "Sets clear priorities and expectations",
  "Communicates decisions in a timely way",
  "Provides useful feedback and guidance",
  "Treats colleagues fairly and respectfully",
  "Supports staff development and problem solving",
] as const;
const feedbackSchema = z.object({
  q1: z.string().min(1), q2: z.string().min(1), q3: z.string().min(1), q4: z.string().min(1), q5: z.string().min(1),
  comment: z.string().max(3000),
});
type FeedbackValues = z.infer<typeof feedbackSchema>;

export function SupervisorFeedbackView() {
  const { roles } = useCurrentUser();
  const isHr = roles.some(role => ["hr_officer", "admin"].includes(role.toLowerCase()));
  const cycles = useQuery(api.staffReviews.getOpenReviewCycles, { type: "supervisor_feedback" });
  const previous = usePaginatedQuery(api.staffReviews.getMySupervisorFeedbackStatus, {}, { initialNumItems: 20 });
  const submit = useMutation(api.staffReviews.submitSupervisorFeedback);
  const [selectedCycle, setSelectedCycle] = useState<Id<"staffReviewCycles"> | null>(null);
  const [tab, setTab] = useState("feedback");
  const form = useForm<FeedbackValues>({ resolver: zodResolver(feedbackSchema), defaultValues: { q1: "", q2: "", q3: "", q4: "", q5: "", comment: "" } });

  async function onSubmit(values: FeedbackValues) {
    if (!selectedCycle) return toast.error("Choose a feedback cycle first.");
    try {
      await submit({ cycleId: selectedCycle, responses: questions.map((question, index) => ({ question, rating: Number(values[`q${index + 1}` as keyof FeedbackValues]) })), comment: values.comment || undefined });
      form.reset();
      setSelectedCycle(null);
      toast.success("Supervisor feedback submitted.");
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit supervisor feedback.")); }
  }

  return <main className="min-h-full min-w-0 w-full space-y-5 p-4 md:p-6">
    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><MessageSquareText className="size-4" /></span><h1 className="text-xl font-semibold">Supervisor Feedback</h1></div>
    {isHr && <ReviewCycleManager type="supervisor_feedback" />}
    <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="p-4 md:p-5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0"><TabsTrigger value="feedback">Give feedback</TabsTrigger><TabsTrigger value="history">My submissions <Badge variant="secondary" className="ml-1 rounded-sm px-1.5 py-0 text-xs tabular-nums">{previous.results.length}</Badge></TabsTrigger>{isHr && <TabsTrigger value="hr">HR feedback review</TabsTrigger>}</TabsList>
        <TabsContent value="feedback" className="mt-4 space-y-4">
          {cycles === undefined ? <p className="text-sm text-muted-foreground">Loading feedback cycles…</p> : cycles.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">There are no open supervisor feedback cycles.</p> : <>
            <Select value={selectedCycle ?? ""} onValueChange={value => setSelectedCycle(value as Id<"staffReviewCycles">)}><SelectTrigger className="max-w-md rounded-sm"><SelectValue placeholder="Choose a review cycle" /></SelectTrigger><SelectContent>{cycles.map(cycle => <SelectItem key={cycle._id} value={cycle._id}>{cycle.title}</SelectItem>)}</SelectContent></Select>
            {selectedCycle && <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">{questions.map((question, index) => <FormField key={question} control={form.control} name={`q${index + 1}` as keyof FeedbackValues} render={({ field }) => <FormItem className="grid gap-2 border-b border-border/70 pb-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"><FormLabel className="font-medium">{question}</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="rounded-sm"><SelectValue placeholder="Rating" /></SelectTrigger></FormControl><SelectContent>{[1, 2, 3, 4, 5].map(value => <SelectItem key={value} value={String(value)}>{value} / 5</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />)}
              <FormField control={form.control} name="comment" render={({ field }) => <FormItem><FormLabel>Additional comments (optional)</FormLabel><FormControl><Textarea rows={4} maxLength={3000} {...field} /></FormControl><FormMessage /></FormItem>} />
              <p className="text-xs text-muted-foreground">Feedback is visible to authorized Human Resources staff. If the cycle is marked anonymous, your name is hidden from the HR feedback view.</p>
              <div className="flex justify-end"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Submitting…" : "Submit feedback"}</Button></div>
            </form></Form>}
          </>}
        </TabsContent>
        <TabsContent value="history" className="mt-4 space-y-2">{previous.results.map(item => <div key={item._id} className="flex items-center justify-between gap-3 border-b border-border/70 py-3"><div><p className="text-sm font-medium">Supervisor feedback submitted</p><p className="text-xs text-muted-foreground">{new Date(item.submittedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</p></div><Badge variant="outline" className="rounded-sm">Submitted</Badge></div>)}{previous.results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">You have not submitted supervisor feedback yet.</p>}</TabsContent>
        {isHr && <TabsContent value="hr" className="mt-4"><HrFeedbackReview /></TabsContent>}
      </Tabs>
    </CardContent></Card>
  </main>;
}

function HrFeedbackReview() {
  const cycles = usePaginatedQuery(api.staffReviews.listReviewCyclesForHr, { type: "supervisor_feedback" }, { initialNumItems: 50 });
  const staff = usePaginatedQuery(api.staffServices.getActiveStaffOptions, {}, { initialNumItems: 100 });
  const [cycleId, setCycleId] = useState<Id<"staffReviewCycles"> | null>(null);
  const [supervisorId, setSupervisorId] = useState<Id<"staffProfiles"> | null>(null);
  const feedback = useQuery(api.staffReviews.getSupervisorFeedbackForHr, cycleId && supervisorId ? { cycleId, supervisorProfileId: supervisorId } : "skip");
  const cycle = cycles.results.find(item => item._id === cycleId);
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2"><Select value={cycleId ?? ""} onValueChange={value => setCycleId(value as Id<"staffReviewCycles">)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Choose feedback cycle" /></SelectTrigger><SelectContent>{cycles.results.map(item => <SelectItem key={item._id} value={item._id}>{item.title} · {item.status}</SelectItem>)}</SelectContent></Select><Select value={supervisorId ?? ""} onValueChange={value => setSupervisorId(value as Id<"staffProfiles">)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Choose supervisor" /></SelectTrigger><SelectContent>{staff.results.map(item => <SelectItem key={item.id} value={item.id}>{item.name} · {item.staffId}</SelectItem>)}</SelectContent></Select></div>
    {feedback?.withheld && <p className="rounded-sm bg-muted/40 p-4 text-sm text-muted-foreground">Responses are hidden until the cycle’s minimum response threshold is reached.</p>}
    {feedback?.results.map(item => <Card key={item._id} className="rounded-sm border-border/70 shadow-none"><CardHeader className="pb-2"><CardTitle className="text-sm">Submitted {new Date(item.submittedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}{!feedback.anonymous && " · confidential"}</CardTitle></CardHeader><CardContent className="space-y-2">{item.responses.map(response => <div key={response.question} className="flex justify-between gap-3 border-b border-border/60 py-1 text-sm"><span>{response.question}</span><Badge variant="outline" className="rounded-sm">{response.rating} / 5</Badge></div>)}{item.comment && <p className="whitespace-pre-wrap pt-2 text-sm text-muted-foreground">{item.comment}</p>}</CardContent></Card>)}
    {feedback?.hasMore && <p className="text-xs text-muted-foreground">Showing the most recent 500 responses. Narrow this review to one supervisor or cycle.</p>}
    {cycleId && supervisorId && feedback && feedback.results.length === 0 && !feedback.withheld && <p className="py-8 text-center text-sm text-muted-foreground">No feedback has been submitted for this cycle and supervisor.</p>}
  </div>;
}
