"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { parseNairobi } from "./mark-permission-dialog";
import type { ClassKey } from "../../hooks/use-hod-scope";

const schema = z.object({ deadlineDate: z.string(), deadlineTime: z.string(), freezeAtDeadline: z.boolean(), reviewerId: z.string() });
const times = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);

function deadlineFields(timestamp?: number) {
  if (!timestamp) return { deadlineDate: "", deadlineTime: "" };
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(timestamp).map(part => [part.type, part.value]));
  return { deadlineDate: `${parts.year}-${parts.month}-${parts.day}`, deadlineTime: `${parts.hour}:${parts.minute}` };
}

export function GradebookSettingsDialog({ courseId, periodId, entriesCloseAt, freezeAtDeadline, close }: ClassKey & {
  entriesCloseAt?: number; freezeAtDeadline: boolean; close: () => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scope = useQuery(api.hod.context, {});
  const staff = usePaginatedQuery(api.hod.staffOptions, scope?.isAdmin ? {} : "skip", { initialNumItems: 50 });
  const configure = useMutation(api.hod.configureGradebook);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: {
    ...deadlineFields(entriesCloseAt), freezeAtDeadline, reviewerId: "unchanged",
  } });
  const save = form.handleSubmit(async values => {
    if (!!values.deadlineDate !== !!values.deadlineTime) {
      form.setError(values.deadlineDate ? "deadlineTime" : "deadlineDate", { message: "Choose both a date and time, or clear the deadline." });
      return;
    }
    const deadline = values.deadlineDate ? parseNairobi(`${values.deadlineDate}T${values.deadlineTime}`) : null;
    if (deadline !== null && (!Number.isFinite(deadline) || deadline <= Date.now())) {
      form.setError("deadlineDate", { message: "Choose a future deadline." });
      return;
    }
    try {
      await configure({ courseId, periodId, entriesCloseAt: deadline, freezeAtDeadline: values.freezeAtDeadline,
        reviewerId: values.reviewerId === "unchanged" ? undefined : values.reviewerId === "none" ? null : values.reviewerId });
      toast.success("Marks entry settings saved"); close();
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not update marks entry settings")); }
  });
  const selectedDate = form.watch("deadlineDate");
  const selectedTime = form.watch("deadlineTime");
  const calendarDate = selectedDate ? new Date(`${selectedDate}T12:00:00`) : undefined;
  const timeOptions = selectedTime && !times.includes(selectedTime) ? [...times, selectedTime].sort() : times;

  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent>
    <DialogHeader><DialogTitle>Marks entry settings</DialogTitle></DialogHeader>
    <Form {...form}><form onSubmit={save} className="space-y-4">
      <FormField control={form.control} name="deadlineDate" render={({ field }) => <FormItem>
        <FormLabel>Marks entry deadline (East Africa Time)</FormLabel>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}><PopoverTrigger asChild>
          <FormControl><Button type="button" variant="outline" className="w-full justify-start font-normal">
            <CalendarDays className="mr-2 size-4" />{field.value ? format(new Date(`${field.value}T12:00:00`), "PPP") : "Choose a date"}
            {selectedTime && <Badge variant="secondary" className="ml-auto">{selectedTime} EAT</Badge>}
          </Button></FormControl>
        </PopoverTrigger><PopoverContent align="start" className="w-auto p-0"><Calendar mode="single" selected={calendarDate}
          onSelect={date => { if (date) field.onChange(format(date, "yyyy-MM-dd")); setCalendarOpen(false); }}
          captionLayout="dropdown" fromYear={2020} toYear={2040} /></PopoverContent></Popover>
        <FormMessage />
      </FormItem>} />
      <FormField control={form.control} name="deadlineTime" render={({ field }) => <FormItem>
        <FormLabel>Deadline time</FormLabel><Select value={field.value || undefined} onValueChange={field.onChange}>
          <FormControl><SelectTrigger><SelectValue placeholder="Choose a time" /></SelectTrigger></FormControl>
          <SelectContent className="max-h-60">{timeOptions.map(time => <SelectItem key={time} value={time}>{time} EAT</SelectItem>)}</SelectContent>
        </Select><FormMessage />
      </FormItem>} />
      {(selectedDate || selectedTime) && <Button type="button" variant="ghost" size="sm" onClick={() => {
        form.setValue("deadlineDate", "", { shouldDirty: true }); form.setValue("deadlineTime", "", { shouldDirty: true });
      }}>Clear deadline</Button>}
      <FormField control={form.control} name="freezeAtDeadline" render={({ field }) => <FormItem className="flex items-start justify-between gap-4 rounded-sm border p-3">
        <div className="space-y-1"><FormLabel>Freeze marks at the deadline</FormLabel><FormDescription>When enabled, lecturers cannot edit or submit marks after the deadline without time-limited editing access.</FormDescription></div>
        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
      </FormItem>} />
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
