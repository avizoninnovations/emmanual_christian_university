"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { toast } from "sonner";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

const schema = z.object({ paymentReference: z.string().trim().min(1, "Enter the transfer or payment reference.").max(100) });
type Values = z.infer<typeof schema>;

export function PayrollPaymentDialog({ statementId, staffName, open, onOpenChange }: {
  statementId: Id<"staffPayStatements"> | null;
  staffName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const markPaid = useMutation(api.financePayroll.recordStaffPayrollPayment);
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { paymentReference: "" } });

  async function submit(values: Values) {
    if (!statementId) return;
    setSaving(true);
    try {
      await markPaid({ statementId, paymentReference: values.paymentReference });
      toast.success("Payroll payment recorded. The staff member can now see the paid status.");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not record the salary payment."));
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-sm sm:max-w-md">
      <DialogHeader><DialogTitle>Record salary payment</DialogTitle><DialogDescription>{staffName} will see the paid status and reference on their salary statement.</DialogDescription></DialogHeader>
      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <FormField control={form.control} name="paymentReference" render={({ field }) => <FormItem><FormLabel>Payment reference</FormLabel><FormControl><Input placeholder="Bank transfer or transaction reference" {...field} /></FormControl><FormMessage /></FormItem>} />
        <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !statementId}>{saving ? "Recording…" : "Confirm payment"}</Button></DialogFooter>
      </form></Form>
    </DialogContent>
  </Dialog>;
}
