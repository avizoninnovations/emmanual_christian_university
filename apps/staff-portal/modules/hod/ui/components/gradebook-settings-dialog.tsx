"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@workspace/ui/components/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { parseNairobi } from "./mark-permission-dialog";
import type { ClassKey } from "../../hooks/use-hod-scope";
const schema = z.object({ deadline: z.string(), reviewerId: z.string() });

export function GradebookSettingsDialog({ courseId, periodId, close }: ClassKey & { close: () => void }) {
  const scope = useQuery(api.hod.context, {});
  const staff = usePaginatedQuery(api.hod.staffOptions, scope?.isAdmin ? {} : "skip", { initialNumItems: 50 });
  const configure = useMutation(api.hod.configureGradebook);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { deadline: "", reviewerId: "unchanged" } });
  const save = form.handleSubmit(async values => {
    const deadline = values.deadline ? parseNairobi(values.deadline) : undefined;
    if (deadline !== undefined && !Number.isFinite(deadline)) { form.setError("deadline", { message: "Choose a valid deadline" }); return; }
    try {
      await configure({ courseId, periodId, entriesCloseAt: deadline,
        reviewerId: values.reviewerId === "unchanged" ? undefined : values.reviewerId === "none" ? null : values.reviewerId });
      toast.success("Class settings saved"); close();
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not update class settings")); }
  });
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle>Class settings</DialogTitle></DialogHeader><Form {...form}><form onSubmit={save} className="space-y-4">
    <FormField control={form.control} name="deadline" render={({ field }) => <FormItem><FormLabel>New marks entry deadline (EAT)</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>} />
    {scope?.isAdmin && <FormField control={form.control} name="reviewerId" render={({ field }) => <FormItem><FormLabel>Independent HOD reviewer</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="unchanged">Keep current reviewer</SelectItem><SelectItem value="none">Department HOD only</SelectItem>{staff.results.filter(row => row.roles.includes("hod")).map(row => <SelectItem key={row._id} value={row.userId}>{row.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />}
    {staff.status === "CanLoadMore" && <Button type="button" variant="ghost" onClick={() => staff.loadMore(50)}>Load more reviewers</Button>}
    <Button type="submit" disabled={form.formState.isSubmitting}>Save settings</Button>
  </form></Form></DialogContent></Dialog>;
}
