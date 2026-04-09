"use client";

import { useState } from "react";
import { ArrowLeft, Save, Banknote, Landmark, Smartphone } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { Id } from "@workspace/backend/_generated/dataModel";

interface PaymentFormProps {
  onBack: () => void;
}

export const PaymentForm = ({ onBack }: PaymentFormProps) => {
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [reference, setReference] = useState("");
  const [paymentType, setPaymentType] = useState<"SCHOOL FEES" | "GENERAL INCOME">("SCHOOL FEES");
  const [method, setMethod] = useState<"CASH" | "BANK" | "MOBILE">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const students = useQuery(api.students.getStudents, {}) || [];
  const recordTransaction = useMutation(api.finance.recordTransaction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount) {
      toast.error("Please enter a student and the payment amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordTransaction({
        studentId: studentId as Id<"students">,
        amount: Number(amount),
        type: "payment",
        reference: `${method} - ${reference || 'No Ref'}`,
      });
      toast.success("Payment recorded successfully.");
      onBack();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-sm border bg-card rounded-xl overflow-hidden mt-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-6 sm:p-8 pb-6 border-b bg-muted/10">
        <div className="flex gap-4">
          <Button variant="outline" size="icon" className="rounded-full size-10 shrink-0" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Record Income</h2>
            <p className="text-base text-muted-foreground mt-1">Log student payments or miscellaneous school revenue.</p>
          </div>
        </div>
        
        <div className="flex p-1 bg-muted/50 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setPaymentType("SCHOOL FEES")}
            className={`px-5 py-2 text-sm font-bold uppercase rounded-md transition-colors ${paymentType === "SCHOOL FEES" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            School Fees
          </button>
          <button
            type="button"
            onClick={() => setPaymentType("GENERAL INCOME")}
            className={`px-5 py-2 text-sm font-bold uppercase rounded-md transition-colors ${paymentType === "GENERAL INCOME" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            General Income
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Find Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="h-12 border-muted-foreground/30 bg-background text-base">
                <SelectValue placeholder="Search by Name, SIN or Class..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.registrationNumber} - {s.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-b py-8">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount to Record</Label>
              <div className="relative">
                <span className="absolute left-0 top-2 text-3xl font-bold text-muted-foreground">$</span>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value ? Number(e.target.value) : "")} 
                  required 
                  className="h-16 pl-8 border-none bg-transparent shadow-none text-3xl font-bold focus-visible:ring-0 px-0" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2 h-14">
                {[
                  { id: "CASH", label: "CASH", icon: Banknote },
                  { id: "BANK", label: "BANK", icon: Landmark },
                  { id: "MOBILE", label: "MOBILE", icon: Smartphone }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id as any)}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 text-sm font-bold transition-all ${
                      method === m.id ? "border-primary text-primary bg-primary/5" : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/10"
                    }`}
                  >
                    <m.icon className="size-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description / Notes (Optional)</Label>
            <Textarea 
              placeholder="Enter additional details..." 
              value={reference} 
              onChange={e => setReference(e.target.value)} 
              className="min-h-[100px] border-muted-foreground/30 bg-muted/10 text-base" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onBack} className="h-12 px-6">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="h-12 px-8 font-semibold gap-2">
              <Save className="size-4" />
              {isSubmitting ? "Processing..." : "Log Record"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
