"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { toast } from "sonner";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

const schema = z.object({
  currency: z.enum(["SSP", "USD"]),
  basicPay: z.coerce.number().min(0),
  housing: z.coerce.number().min(0),
  transport: z.coerce.number().min(0),
  otherAllowanceLabel: z.string().max(80),
  otherAllowance: z.coerce.number().min(0),
  pension: z.coerce.number().min(0),
  paye: z.coerce.number().min(0),
  otherDeductionLabel: z.string().max(80),
  otherDeduction: z.coerce.number().min(0),
}).refine((values) => values.otherAllowance === 0 || values.otherAllowanceLabel.trim().length > 0, {
  path: ["otherAllowanceLabel"], message: "Name this allowance.",
}).refine((values) => values.otherDeduction === 0 || values.otherDeductionLabel.trim().length > 0, {
  path: ["otherDeductionLabel"], message: "Name this deduction.",
}).refine((values) => values.basicPay + values.housing + values.transport + values.otherAllowance >= values.pension + values.paye + values.otherDeduction, {
  path: ["otherDeduction"], message: "Deductions cannot exceed gross pay.",
});
type Values = z.infer<typeof schema>;
type Statement = {
  _id: Id<"staffPayStatements">;
  basicPay: number;
  currency: "SSP" | "USD";
  allowances: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; amount: number }>;
};

export function PayrollStatementSheet({ open, onOpenChange, periodId, person }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: Id<"staffPayPeriods">;
  person: { staffProfileId: Id<"staffProfiles">; name: string; staffId: string; statement: Statement | null } | null;
}) {
  const saveStatement = useMutation(api.financePayroll.savePayStatement);
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (open) form.reset(person ? valuesFromStatement(person.statement) : emptyValues());
  }, [form, open, person]);

  async function submit(values: Values) {
    if (!person) return;
    setSaving(true);
    const allowances = [
      { label: "Housing allowance", amount: values.housing },
      { label: "Transport allowance", amount: values.transport },
      ...(values.otherAllowance > 0 ? [{ label: values.otherAllowanceLabel.trim(), amount: values.otherAllowance }] : []),
    ].filter((item) => item.amount > 0);
    const deductions = [
      { label: "Pension contribution", amount: values.pension },
      { label: "PAYE", amount: values.paye },
      ...(values.otherDeduction > 0 ? [{ label: values.otherDeductionLabel.trim(), amount: values.otherDeduction }] : []),
    ].filter((item) => item.amount > 0);
    try {
      await saveStatement({ payPeriodId: periodId, staffProfileId: person.staffProfileId, currency: values.currency, basicPay: values.basicPay, allowances, deductions });
      toast.success("Pay statement prepared and linked to the staff member.");
      onOpenChange(false);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not prepare this pay statement."));
    } finally {
      setSaving(false);
    }
  }

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full overflow-y-auto rounded-sm sm:max-w-xl">
      <SheetHeader><SheetTitle>{person ? `Pay statement · ${person.name}` : "Pay statement"}</SheetTitle><SheetDescription>{person?.staffId} · The published statement appears in this employee’s Salary Pay Slip.</SheetDescription></SheetHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5 py-4">
          <FormField control={form.control} name="currency" render={({ field }) => <FormItem><FormLabel>Currency</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="SSP">SSP</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
          <PayInput control={form.control} name="basicPay" label="Basic pay" />
          <section className="space-y-3"><h3 className="text-sm font-semibold">Allowances</h3><div className="grid gap-3 sm:grid-cols-2"><PayInput control={form.control} name="housing" label="Housing" /><PayInput control={form.control} name="transport" label="Transport" /></div><div className="grid gap-3 sm:grid-cols-[1fr_10rem]"><PayInput control={form.control} name="otherAllowanceLabel" label="Other allowance name" text /><PayInput control={form.control} name="otherAllowance" label="Amount" /></div></section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">Deductions</h3><div className="grid gap-3 sm:grid-cols-2"><PayInput control={form.control} name="pension" label="Pension" /><PayInput control={form.control} name="paye" label="PAYE" /></div><div className="grid gap-3 sm:grid-cols-[1fr_10rem]"><PayInput control={form.control} name="otherDeductionLabel" label="Other deduction name" text /><PayInput control={form.control} name="otherDeduction" label="Amount" /></div></section>
          <SheetFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !person}>{saving ? "Saving…" : "Save statement"}</Button></SheetFooter>
        </form>
      </Form>
    </SheetContent>
  </Sheet>;
}

function PayInput({ control, name, label, text = false }: { control: ReturnType<typeof useForm<Values>>["control"]; name: keyof Values; label: string; text?: boolean }) {
  return <FormField control={control} name={name} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={text ? "text" : "number"} min={text ? undefined : 0} step={text ? undefined : "0.01"} {...field} /></FormControl><FormMessage /></FormItem>} />;
}

function emptyValues(): Values {
  return { currency: "SSP", basicPay: 0, housing: 0, transport: 0, otherAllowanceLabel: "", otherAllowance: 0, pension: 0, paye: 0, otherDeductionLabel: "", otherDeduction: 0 };
}

function valuesFromStatement(statement: Statement | null): Values {
  if (!statement) return emptyValues();
  const allowance = (label: string) => statement.allowances.find((item) => item.label.toLowerCase().includes(label))?.amount ?? 0;
  const deduction = (label: string) => statement.deductions.find((item) => item.label.toLowerCase().includes(label))?.amount ?? 0;
  const otherAllowance = statement.allowances.find((item) => !item.label.toLowerCase().includes("housing") && !item.label.toLowerCase().includes("transport"));
  const otherDeduction = statement.deductions.find((item) => !item.label.toLowerCase().includes("pension") && !item.label.toLowerCase().includes("paye"));
  return { currency: statement.currency, basicPay: statement.basicPay, housing: allowance("housing"), transport: allowance("transport"), otherAllowanceLabel: otherAllowance?.label ?? "", otherAllowance: otherAllowance?.amount ?? 0, pension: deduction("pension"), paye: deduction("paye"), otherDeductionLabel: otherDeduction?.label ?? "", otherDeduction: otherDeduction?.amount ?? 0 };
}
