"use client";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@workspace/ui/components/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

const schema = z.object({ lecturerId: z.string().min(1, "Choose a lecturer"), reason: z.string().trim().min(3, "Enter a reason") });
export function AllocationDialog({ courseId, periodId, departmentId, title, close }: {
  courseId: Id<"courses">; periodId: Id<"academicPeriods">; departmentId: Id<"departments">; title: string; close: () => void;
}) {
  // The backend enforces department eligibility; this picker is scoped below through the course.
  const course = usePaginatedQuery(api.hod.staffOptions, { departmentId }, { initialNumItems: 50 });
  return <AllocationForm courseId={courseId} periodId={periodId} title={title} close={close} staff={course} />;
}
type StaffOptions = ReturnType<typeof usePaginatedQuery<typeof api.hod.staffOptions>>;
export function AllocationForm({ courseId, periodId, title, close, staff }: {
  courseId: Id<"courses">; periodId: Id<"academicPeriods">; title: string; close: () => void; staff: StaffOptions;
}) {
  const assign = useMutation(api.allocations.allocateLecturerToCourse);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { lecturerId: "", reason: "" } });
  const save = form.handleSubmit(async values => {
    try { await assign({ ...values, courseId, periodId }); toast.success("Teaching assignment saved"); close(); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not assign the lecturer")); }
  });
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle>Assign lecturer · {title}</DialogTitle></DialogHeader>
    <Form {...form}><form onSubmit={save} className="space-y-4">
      <FormField control={form.control} name="lecturerId" render={({ field }) => <FormItem><FormLabel>Lecturer</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select an eligible lecturer" /></SelectTrigger></FormControl><SelectContent>{staff.results.filter(row => row.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role))).map(row => <SelectItem key={row._id} value={row.userId}>{row.name} · {row.staffId}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
      {staff.status === "CanLoadMore" && <Button type="button" variant="ghost" onClick={() => staff.loadMore(50)}>Load more staff</Button>}
      <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Reason</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
      <Button type="submit" disabled={form.formState.isSubmitting}>Save assignment</Button>
    </form></Form>
  </DialogContent></Dialog>;
}
