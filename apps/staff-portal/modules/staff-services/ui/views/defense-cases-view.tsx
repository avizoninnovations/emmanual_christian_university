"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import * as z from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Scale } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { SearchableSelect } from "@workspace/ui/components/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { StaffServiceRequestList } from "../components/staff-service-request-list";
import { StaffServiceRequestSheet } from "../components/staff-service-request-sheet";

const caseSchema = z.object({
  staffProfileId: z.string().min(1, "Choose a staff member."),
  caseReference: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(3).max(160),
  notice: z.string().trim().min(10).max(10000),
  responseDueAt: z.string().min(1, "Choose a response deadline."),
});
type CaseValues = z.infer<typeof caseSchema>;

export function DefenseCasesView() {
  const { roles } = useCurrentUser();
  const isHr = roles.some(role => ["hr_officer", "admin"].includes(role.toLowerCase()));
  const own = usePaginatedQuery(api.staffServices.getMyRequests, { type: "defense" }, { initialNumItems: 20 });
  const hrQueue = usePaginatedQuery(api.staffServices.getDefenseQueue, isHr ? {} : "skip", { initialNumItems: 20 });
  const [tab, setTab] = useState("mine");
  const [selected, setSelected] = useState<{ id: Id<"staffServiceRequests">; mode: "own" | "hr" } | null>(null);

  return <main className="min-h-full min-w-0 w-full space-y-5 p-4 md:p-6">
    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><Scale className="size-4" /></span><h1 className="text-xl font-semibold">My Defenses</h1></div>
    {isHr && <CreateDefenseCase />}
    <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="p-4 md:p-5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="mine">My cases <Count value={own.results.length} /></TabsTrigger>
          {isHr && <TabsTrigger value="review">Responses to review <Count value={hrQueue.results.length} /></TabsTrigger>}
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          <StaffServiceRequestList rows={own.results} isLoading={own.status === "LoadingFirstPage"} emptyLabel="You have no active defense cases." onDetails={row => setSelected({ id: row._id, mode: "own" })} />
          {own.status === "CanLoadMore" && <More onClick={() => own.loadMore(20)} />}
        </TabsContent>
        {isHr && <TabsContent value="review" className="mt-4">
          <StaffServiceRequestList rows={hrQueue.results} isLoading={hrQueue.status === "LoadingFirstPage"} emptyLabel="No staff responses are waiting for review." onDetails={row => setSelected({ id: row._id, mode: "hr" })} />
          {hrQueue.status === "CanLoadMore" && <More onClick={() => hrQueue.loadMore(20)} />}
        </TabsContent>}
      </Tabs>
    </CardContent></Card>
    <StaffServiceRequestSheet requestId={selected?.id ?? null} mode={selected?.mode ?? "own"} open={!!selected} onOpenChange={open => !open && setSelected(null)} />
  </main>;
}

function CreateDefenseCase() {
  const staff = usePaginatedQuery(api.staffServices.getActiveStaffOptions, {}, { initialNumItems: 100 });
  const create = useMutation(api.staffServices.createDefenseCase);
  const form = useForm<CaseValues>({ resolver: zodResolver(caseSchema), defaultValues: { staffProfileId: "", caseReference: "", subject: "", notice: "", responseDueAt: "" } });
  async function onSubmit(values: CaseValues) {
    try {
      await create({ ...values, staffProfileId: values.staffProfileId as Id<"staffProfiles">, responseDueAt: new Date(values.responseDueAt).getTime() });
      form.reset();
      toast.success("Defense notice issued to the staff member.");
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not open the defense case.")); }
  }
  const options = staff.results.map(person => ({ value: person.id, label: `${person.name} · ${person.staffId}`, keywords: person.staffId }));
  return <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="p-4 md:p-5">
    <h2 className="mb-4 text-sm font-semibold">Issue a response notice</h2>
    <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
      <FormField control={form.control} name="staffProfileId" render={({ field }) => <FormItem className="min-w-0"><FormLabel>Staff member</FormLabel><FormControl><SearchableSelect value={field.value} onValueChange={field.onChange} options={options} placeholder="Choose staff member" searchPlaceholder="Search staff…" disabled={staff.status === "LoadingFirstPage"} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="caseReference" render={({ field }) => <FormItem><FormLabel>Case reference</FormLabel><FormControl><Input maxLength={80} className="rounded-sm" {...field} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="subject" render={({ field }) => <FormItem><FormLabel>Subject</FormLabel><FormControl><Input maxLength={160} className="rounded-sm" {...field} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="responseDueAt" render={({ field }) => <FormItem><FormLabel>Response deadline</FormLabel><FormControl><Input type="datetime-local" className="rounded-sm" {...field} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="notice" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Notice details</FormLabel><FormControl><Textarea rows={4} maxLength={10000} {...field} /></FormControl><FormMessage /></FormItem>} />
      <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting || staff.status === "LoadingFirstPage"}>{form.formState.isSubmitting ? "Issuing notice…" : "Issue notice"}</Button></div>
    </form></Form>
  </CardContent></Card>;
}

function Count({ value }: { value: number }) { return <Badge variant="secondary" className="ml-1 rounded-sm px-1.5 py-0 text-xs tabular-nums">{value}</Badge>; }
function More({ onClick }: { onClick: () => void }) { return <div className="flex justify-center pt-3"><Button variant="outline" onClick={onClick}>Load more</Button></div>; }
