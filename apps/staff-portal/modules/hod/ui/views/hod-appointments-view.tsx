"use client";
import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

const schema = z.object({ staffUserId: z.string().min(1, "Choose a staff member"), reason: z.string().trim().min(3).max(1000) });
export function HODAppointmentsView() {
  const context = useQuery(api.hod.context, {});
  const [departmentId, setDepartmentId] = useState<Id<"departments">>();
  const activeDepartment = departmentId ?? context?.departments[0]?._id;
  const staff = usePaginatedQuery(api.hod.staffOptions, activeDepartment ? { departmentId: activeDepartment } : "skip", { initialNumItems: 20 });
  const appoint = useMutation(api.hod.appointHead);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { staffUserId: "", reason: "" } });
  const department = context?.departments.find(item => item._id === activeDepartment);
  const submit = form.handleSubmit(async values => {
    if (!activeDepartment) return;
    try { await appoint({ departmentId: activeDepartment, staffUserId: values.staffUserId, reason: values.reason }); toast.success("Head of Department appointed"); form.reset(); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not appoint this Head of Department")); }
  });
  const endAppointment = async () => {
    const reason = form.getValues("reason").trim();
    if (!activeDepartment || !department?.hodId || reason.length < 3) {
      form.setError("reason", { message: "Enter a reason before ending this appointment." }); return;
    }
    try { await appoint({ departmentId: activeDepartment, staffUserId: null, reason }); toast.success("Department head appointment ended"); form.reset(); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not end this appointment")); }
  };
  if (!context) return <Skeleton className="m-6 h-48" />;
  return <div className="w-full space-y-5 p-4 lg:p-6">
    <h1 className="text-xl font-semibold">Department Heads</h1>
    {!context.isAdmin && <p className="text-sm text-muted-foreground">Only system administrators can appoint or end a Head of Department appointment.</p>}
    {context.isAdmin && <section className="grid gap-4 rounded-sm border bg-card p-4 md:grid-cols-2">
      <div><label className="mb-2 block text-sm font-medium">Department</label><Select value={activeDepartment} onValueChange={value => { setDepartmentId(value as Id<"departments">); form.reset(); }}><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger><SelectContent>{context.departments.map(item => <SelectItem key={item._id} value={item._id}>{item.name}</SelectItem>)}</SelectContent></Select>
        {department && <p className="mt-2 text-sm text-muted-foreground">Current Head: {department.hodId ? staff.results.find(item => item.userId === department.hodId)?.name ?? "Assigned staff member" : "Not appointed"}</p>}</div>
      <Form {...form}><form onSubmit={submit} className="space-y-3">
        <FormField control={form.control} name="staffUserId" render={({ field }) => <FormItem><FormLabel>Appoint active staff member</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger></FormControl><SelectContent>{staff.results.map(person => <SelectItem key={person.userId} value={person.userId}>{person.name} · {person.email}</SelectItem>)}</SelectContent></Select><FormMessage />{staff.status === "CanLoadMore" && <Button type="button" size="sm" variant="ghost" onClick={() => staff.loadMore(20)}>Load more staff</Button>}</FormItem>} />
        <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Appointment reason</FormLabel><FormControl><Textarea {...field} placeholder="Record the appointment authority or reference" /></FormControl><FormMessage /></FormItem>} />
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!activeDepartment || form.formState.isSubmitting}>Appoint HOD</Button>{department?.hodId && <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={() => void endAppointment()}>End appointment</Button>}</div>
      </form></Form>
    </section>}
    <div className="rounded-sm border bg-card"><Table><TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Current HOD</TableHead><TableHead>Appointment</TableHead></TableRow></TableHeader><TableBody>{context.departments.map(item => <TableRow key={item._id}><TableCell>{item.name}</TableCell><TableCell>{item._id === activeDepartment ? staff.results.find(person => person.userId === item.hodId)?.name ?? (item.hodId ? "Assigned staff member" : "Not appointed") : item.hodId ? "Assigned staff member" : "Not appointed"}</TableCell><TableCell>{item.hodId ? "Active" : "—"}</TableCell></TableRow>)}{!context.departments.length && <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No departments are available for your account.</TableCell></TableRow>}</TableBody></Table></div>
  </div>;
}
