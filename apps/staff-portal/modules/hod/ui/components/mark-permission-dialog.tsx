"use client";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@workspace/ui/components/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { NairobiDateTimePicker, toNairobiDateTimeInput } from "./nairobi-date-time-picker";

const schema = z.object({ components: z.enum(["both", "coursework", "exam"]),
  expiresAt: z.string().min(1, "Choose an expiry"), reason: z.string().trim().max(2000) });
export const tomorrowNairobi = () => toNairobiDateTimeInput(Date.now() + 27 * 60 * 60 * 1000);
export const parseNairobi = (value: string) => Date.parse(`${value.length === 16 ? `${value}:00` : value}+03:00`);
export const displayDeadline = (value: number) => new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" });

export function MarkPermissionDialog({ courseId, periodId, studentId, studentName, mode, close }: {
  courseId: Id<"courses">; periodId: Id<"academicPeriods">; studentId: Id<"students">;
  studentName: string; mode: "grant" | "request"; close: () => void;
}) {
  const create = useMutation(api.markPermissions.create);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema),
    defaultValues: { components: "both", expiresAt: tomorrowNairobi(), reason: "" } });
  const save = form.handleSubmit(async values => {
    if (mode === "request" && values.reason.length < 3) { form.setError("reason", { message: "Enter a reason for requesting access." }); return; }
    const expiresAt = parseNairobi(values.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) { form.setError("expiresAt", { message: "Choose a future expiry" }); return; }
    try {
      await create({ courseId, periodId, studentId, mode, reason: mode === "request" ? values.reason : undefined, startsAt: Date.now(), expiresAt,
        components: values.components === "both" ? ["coursework", "exam"] : [values.components] });
      toast.success(mode === "grant" ? "Editing permission granted" : "Editing request sent to the HOD"); close();
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not save the permission")); }
  });
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle>{mode === "grant" ? "Grant editing access" : "Request editing access"} · {studentName}</DialogTitle>
    <DialogDescription>{mode === "grant" ? "Allow this lecturer to edit the selected marks until the expiry time." : "Request time-limited access to correct this student’s marks."}</DialogDescription></DialogHeader>
    <Form {...form}><form onSubmit={save} className="space-y-4">
      <FormField control={form.control} name="components" render={({ field }) => <FormItem><FormLabel>Allowed components</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="both">Coursework and examination</SelectItem><SelectItem value="coursework">Coursework only</SelectItem><SelectItem value="exam">Examination only</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
      <FormField control={form.control} name="expiresAt" render={({ field }) => <FormItem><FormLabel>Expires at</FormLabel><FormControl><NairobiDateTimePicker value={field.value} onChange={field.onChange} label="Choose permission expiry" /></FormControl><FormMessage /></FormItem>} />
      {mode === "request" && <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Why do you need access?</FormLabel><FormControl><Textarea placeholder="Explain what needs to be corrected" {...field} /></FormControl><FormMessage /></FormItem>} />}
      <Button type="submit" disabled={form.formState.isSubmitting}>{mode === "grant" ? "Grant permission" : "Send request"}</Button>
    </form></Form>
  </DialogContent></Dialog>;
}
