"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Sheet, WideSheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { toast } from "sonner";
import { useState } from "react";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

const schema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  payDate: z.string().date("Choose the date staff are due to be paid."),
});
type Values = z.infer<typeof schema>;

export function PayrollPeriodDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: Id<"staffPayPeriods">) => void;
}) {
  const createPeriod = useMutation(api.financePayroll.createPayrollPeriod);
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { month: new Date().getMonth() + 1, year: new Date().getFullYear(), payDate: new Date().toISOString().slice(0, 10) },
  });

  async function submit(values: Values) {
    setSaving(true);
    try {
      const id = await createPeriod(values);
      toast.success("Payroll period created.");
      onOpenChange(false);
      onCreated(id);
      form.reset(values);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not create the payroll period."));
    } finally {
      setSaving(false);
    }
  }

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <WideSheetContent className="rounded-sm">
      <SheetHeader><SheetTitle>New payroll period</SheetTitle><SheetDescription>Choose the month and scheduled pay date.</SheetDescription></SheetHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="month" render={({ field }) => <FormItem><FormLabel>Month</FormLabel><FormControl><Input type="number" min={1} max={12} {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="year" render={({ field }) => <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" min={2000} max={2100} {...field} /></FormControl><FormMessage /></FormItem>} />
          </div>
          <FormField control={form.control} name="payDate" render={({ field }) => <FormItem><FormLabel>Pay date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
          <SheetFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create period"}</Button></SheetFooter>
        </form>
      </Form>
    </WideSheetContent>
  </Sheet>;
}
