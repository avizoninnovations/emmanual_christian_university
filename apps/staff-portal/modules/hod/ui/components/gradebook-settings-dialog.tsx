"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { parseNairobi } from "./mark-permission-dialog";
import { NairobiDateTimePicker, toNairobiDateTimeInput } from "./nairobi-date-time-picker";
import type { ClassKey } from "../../hooks/use-hod-scope";

const schema = z.object({ deadline: z.string(), reviewerId: z.string() });

export function GradebookSettingsDialog({ courseId, periodId, entriesCloseAt, close }: ClassKey & {
  entriesCloseAt?: number; close: () => void;
}) {
  const scope = useQuery(api.hod.context, {});
  const staff = usePaginatedQuery(api.hod.staffOptions, scope?.isAdmin ? {} : "skip", { initialNumItems: 50 });
  const configure = useMutation(api.hod.configureGradebook);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: {
    deadline: entriesCloseAt ? toNairobiDateTimeInput(entriesCloseAt) : "", reviewerId: "unchanged",
  } });
  const save = form.handleSubmit(async values => {
    const deadline = values.deadline ? parseNairobi(values.deadline) : null;
    if (deadline !== null && (!Number.isFinite(deadline) || deadline <= Date.now())) {
      form.setError("deadline", { message: "Choose a future deadline." });
      return;
    }
    try {
      await configure({ courseId, periodId, entriesCloseAt: deadline,
        reviewerId: values.reviewerId === "unchanged" ? undefined : values.reviewerId === "none" ? null : values.reviewerId });
      toast.success("Marks entry settings saved"); close();
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not update marks entry settings")); }
  });
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent>
    <DialogHeader><DialogTitle>Marks entry settings</DialogTitle></DialogHeader>
    <Form {...form}><form onSubmit={save} className="space-y-4">
      <FormField control={form.control} name="deadline" render={({ field }) => <FormItem>
        <FormLabel>Marks entry deadline (East Africa Time)</FormLabel>
        <FormControl><NairobiDateTimePicker value={field.value} onChange={field.onChange} label="Choose marks entry deadline" clearable /></FormControl>
        <FormMessage />
      </FormItem>} />
      <p className="text-sm text-muted-foreground">After the deadline, marks are locked. The HOD can grant time-limited editing access when needed.</p>
      {scope?.isAdmin && <FormField control={form.control} name="reviewerId" render={({ field }) => <FormItem>
        <FormLabel>Independent HOD reviewer</FormLabel><Select value={field.value} onValueChange={field.onChange}>
          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
            <SelectItem value="unchanged">Keep current reviewer</SelectItem><SelectItem value="none">Department HOD only</SelectItem>
            {staff.results.filter(row => row.roles.includes("hod")).map(row => <SelectItem key={row._id} value={row.userId}>{row.name}</SelectItem>)}
          </SelectContent>
        </Select><FormMessage />
      </FormItem>} />}
      {staff.status === "CanLoadMore" && <Button type="button" variant="ghost" onClick={() => staff.loadMore(50)}>Load more reviewers</Button>}
      <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={form.formState.isSubmitting}>Save settings</Button></div>
    </form></Form>
  </DialogContent></Dialog>;
}
