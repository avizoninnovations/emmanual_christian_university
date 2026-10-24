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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { SearchableSelect, type SearchableSelectOption } from "@workspace/ui/components/searchable-select";
import { Textarea } from "@workspace/ui/components/textarea";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

const UNASSIGNED_VALUE = "__unassigned__";
const schema = z.object({
  lecturerId: z.string().min(1, "Choose a lecturer or leave the course unassigned."),
  reason: z.string().trim().max(500, "Keep the reason under 500 characters.").optional(),
});

type CurrentLecturer = { userId: string; name: string };

export function AllocationDialog({ courseId, periodId, departmentId, title, close, allocationId, currentLecturer }: {
  courseId: Id<"courses">;
  periodId: Id<"academicPeriods">;
  departmentId: Id<"departments">;
  title: string;
  close: () => void;
  allocationId?: Id<"courseAllocations">;
  currentLecturer?: CurrentLecturer;
}) {
  const staff = usePaginatedQuery(api.hod.lecturerOptions, { departmentId }, { initialNumItems: 50 });
  return (
    <AllocationForm
      courseId={courseId}
      periodId={periodId}
      title={title}
      close={close}
      staff={staff}
      allocationId={allocationId}
      currentLecturer={currentLecturer}
    />
  );
}

type StaffOptions = ReturnType<typeof usePaginatedQuery<typeof api.hod.lecturerOptions>>;

function AllocationForm({ courseId, periodId, title, close, staff, allocationId, currentLecturer }: {
  courseId: Id<"courses">;
  periodId: Id<"academicPeriods">;
  title: string;
  close: () => void;
  staff: StaffOptions;
  allocationId?: Id<"courseAllocations">;
  currentLecturer?: CurrentLecturer;
}) {
  const assign = useMutation(api.allocations.allocateLecturerToCourse);
  const unassign = useMutation(api.allocations.deallocateLecturer);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { lecturerId: currentLecturer?.userId ?? "", reason: "" },
  });
  const currentLecturerInPage = staff.results.some(row => row.userId === currentLecturer?.userId);
  const lecturerOptions: SearchableSelectOption[] = [
    ...(allocationId ? [{ value: UNASSIGNED_VALUE, label: "Leave unassigned", keywords: "remove clear" }] : []),
    ...staff.results.map(row => ({
      value: row.userId,
      label: `${row.name} · ${row.staffId}`,
      keywords: row.staffId,
    })),
    ...(currentLecturer && !currentLecturerInPage
      ? [{ value: currentLecturer.userId, label: `${currentLecturer.name} · Currently assigned`, keywords: "current assigned" }]
      : []),
  ];
  const save = form.handleSubmit(async values => {
    const reason = values.reason?.trim() || undefined;
    const reasonArgs = reason ? { reason } : {};
    try {
      if (values.lecturerId === UNASSIGNED_VALUE && allocationId) {
        await unassign({ allocationId, ...reasonArgs });
        toast.success("Course unit is now unassigned");
      } else if (values.lecturerId !== UNASSIGNED_VALUE) {
        await assign({ courseId, lecturerId: values.lecturerId, periodId, ...reasonArgs });
        toast.success("Teaching assignment saved");
      }
      close();
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not save the teaching assignment"));
    }
  });

  return (
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{allocationId ? "Update lecturer assignment" : "Assign lecturer"} · {title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={save} className="min-w-0 w-full space-y-4">
            <FormField
              control={form.control}
              name="lecturerId"
              render={({ field }) => (
                <FormItem className="w-full min-w-0">
                  <FormLabel>Lecturer</FormLabel>
                  <FormControl className="w-full min-w-0">
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={lecturerOptions}
                      placeholder="Select a lecturer"
                      searchPlaceholder="Search lecturers by name or staff ID..."
                      emptyMessage="No eligible lecturers found."
                      aria-label="Lecturer"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {staff.status === "CanLoadMore" && (
              <Button type="button" variant="ghost" onClick={() => staff.loadMore(50)}>Load more staff</Button>
            )}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Textarea placeholder="Add a note about this change, if needed" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {allocationId ? "Save changes" : "Assign lecturer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
