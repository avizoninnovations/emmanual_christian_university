"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import * as z from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";

export type StaffRequestType = "leave" | "exit" | "complaint";

const createRequestSchema = (type: StaffRequestType) => z.object({
  subject: z.string().trim().min(3).max(160),
  details: z.string().trim().min(10).max(10000),
  leaveType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  handoverPlan: z.string().optional(),
  proposedLastDay: z.string().optional(),
  complaintCategory: z.string().optional(),
  involvedPeople: z.string().optional(),
}).superRefine((values, context) => {
  if (type === "leave") {
    if (!values.leaveType) context.addIssue({ code: "custom", path: ["leaveType"], message: "Choose a leave type." });
    if (!values.startDate) context.addIssue({ code: "custom", path: ["startDate"], message: "Choose a start date." });
    if (!values.endDate) context.addIssue({ code: "custom", path: ["endDate"], message: "Choose an end date." });
    if (values.startDate && values.endDate && values.startDate > values.endDate) context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after start date." });
  }
  if (type === "exit" && !values.proposedLastDay) context.addIssue({ code: "custom", path: ["proposedLastDay"], message: "Enter your proposed last day." });
  if (type === "complaint" && !values.complaintCategory) context.addIssue({ code: "custom", path: ["complaintCategory"], message: "Choose a complaint category." });
});

type RequestValues = z.infer<ReturnType<typeof createRequestSchema>>;

const requestLabels: Record<StaffRequestType, string> = {
  leave: "Leave application",
  exit: "Exit application",
  complaint: "Complaint",
};

export function StaffServiceRequestForm({ type }: { type: StaffRequestType }) {
  const createDraft = useMutation(api.staffServices.createRequestDraft);
  const generateUploadUrl = useMutation(api.staffServices.generateServiceUploadUrl);
  const attachFile = useMutation(api.staffServices.attachRequestFile);
  const submitRequest = useMutation(api.staffServices.submitRequest);
  const [files, setFiles] = useState<File[]>([]);
  const form = useForm<RequestValues>({
    resolver: zodResolver(createRequestSchema(type)),
    defaultValues: { subject: "", details: "", leaveType: "", startDate: "", endDate: "", handoverPlan: "", proposedLastDay: "", complaintCategory: "", involvedPeople: "" },
  });

  async function onSubmit(values: RequestValues) {
    try {
      if (files.length > 10) throw new Error("Attach no more than 10 files.");
      const requestId = await createDraft({ type, ...values });
      for (const file of files) {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!response.ok) throw new Error(`Could not upload ${file.name}. Your draft has been saved.`);
        const body = await response.json() as { storageId: Id<"_storage"> };
        await attachFile({ requestId, fileId: body.storageId, fileName: file.name });
      }
      await submitRequest({ requestId });
      form.reset();
      setFiles([]);
      toast.success(`${requestLabels[type]} submitted.`);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, `Could not submit your ${requestLabels[type].toLowerCase()}.`));
    }
  }

  return <Card className="rounded-sm border-border/70 shadow-none">
    <CardHeader className="pb-3"><CardTitle className="text-base">New {requestLabels[type].toLowerCase()}</CardTitle></CardHeader>
    <CardContent>
      <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <Field form={form} name="subject" label="Subject" placeholder="Short summary" className="md:col-span-2" />
        {type === "leave" && <>
          <FormField control={form.control} name="leaveType" render={({ field }) => <FormItem><FormLabel>Leave type</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Choose leave type" /></SelectTrigger></FormControl><SelectContent>{["Annual leave", "Sick leave", "Study leave", "Compassionate leave", "Maternity / paternity leave", "Other"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
          <Field form={form} name="startDate" label="Start date" type="date" />
          <Field form={form} name="endDate" label="End date" type="date" />
          <Field form={form} name="handoverPlan" label="Handover plan" placeholder="Work coverage and contact arrangements" className="md:col-span-2" />
        </>}
        {type === "exit" && <Field form={form} name="proposedLastDay" label="Proposed last working day" type="date" />}
        {type === "complaint" && <>
          <FormField control={form.control} name="complaintCategory" render={({ field }) => <FormItem><FormLabel>Category</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger></FormControl><SelectContent>{["Workplace conduct", "Work conditions", "Safety", "Discrimination or harassment", "Other"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
          <Field form={form} name="involvedPeople" label="People involved (optional)" placeholder="Names or roles" className="md:col-span-2" />
        </>}
        <FormField control={form.control} name="details" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>{type === "complaint" ? "What happened?" : "Details"}</FormLabel><FormControl><Textarea rows={5} maxLength={10000} placeholder="Provide the information needed to review this request." {...field} /></FormControl><FormMessage /></FormItem>} />
        <div className="space-y-2 md:col-span-2"><label htmlFor="staff-service-files" className="text-sm font-medium">Supporting files (optional, up to 10 files)</label><Input id="staff-service-files" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={event => setFiles(Array.from(event.target.files ?? []))} className="rounded-sm" /><p className="text-xs text-muted-foreground">PDF, Word, or image files, up to 15 MB each.</p>{files.length > 0 && <p className="text-xs text-muted-foreground">{files.map(file => file.name).join(" · ")}</p>}</div>
        <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Submitting…" : "Submit request"}</Button></div>
      </form></Form>
    </CardContent>
  </Card>;
}

function Field({ form, name, label, placeholder, type = "text", className }: {
  form: ReturnType<typeof useForm<RequestValues>>;
  name: "subject" | "startDate" | "endDate" | "proposedLastDay" | "handoverPlan" | "involvedPeople";
  label: string;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return <FormField control={form.control} name={name} render={({ field }) => <FormItem className={className}><FormLabel>{label}</FormLabel><FormControl><Input type={type} placeholder={placeholder} {...field} value={field.value ?? ""} className="rounded-sm" /></FormControl><FormMessage /></FormItem>} />;
}
