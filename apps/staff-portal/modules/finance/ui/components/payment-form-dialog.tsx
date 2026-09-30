"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2, Banknote, Landmark, Smartphone, CreditCard, Search } from "lucide-react";
import { ReceiptData } from "./receipt-preview-modal";

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStudentId?: Id<"students"> | null;
  onPaymentSuccess?: (receipt: ReceiptData) => void;
}

export const PaymentFormDialog = ({
  open,
  onOpenChange,
  preselectedStudentId,
  onPaymentSuccess,
}: PaymentFormDialogProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preselectedStudentId || "");
  const [amount, setAmount] = useState<string>("");
  const [channel, setChannel] = useState<"cash" | "bank_deposit" | "m_gurush" | "equity_bank" | "kcb_bank" | "stanbic_bank" | "other">("cash");
  const [bankBranch, setBankBranch] = useState("Juba Main Branch");
  const [slipNumber, setSlipNumber] = useState("");
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const studentLedgers = useQuery(api.finance.getStudentLedgers, {});
  const recordPayment = useMutation(api.finance.recordPayment);

  // Sync preselected student when prop changes
  const activeStudentId = preselectedStudentId || selectedStudentId;
  const currentLedger = studentLedgers?.find((l) => l.studentId === activeStudentId);

  // Filter students for the selector
  const availableStudents = (studentLedgers || []).filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentRegNumber.toLowerCase().includes(q)
    );
  });

  const getMethodFromChannel = (ch: string): "cash" | "bank" | "mobile_money" | "other" => {
    if (ch === "cash") return "cash";
    if (ch === "m_gurush") return "mobile_money";
    if (["equity_bank", "kcb_bank", "stanbic_bank", "bank_deposit"].includes(ch)) return "bank";
    return "other";
  };

  const isBankChannel = ["equity_bank", "kcb_bank", "stanbic_bank", "bank_deposit"].includes(channel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeStudentId) {
      toast.error("Please select a student.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than zero.");
      return;
    }

    if (isBankChannel && !slipNumber.trim()) {
      toast.error("Please enter the bank deposit slip / teller receipt number.");
      return;
    }

    if (channel === "m_gurush" && !slipNumber.trim()) {
      toast.error("Please enter the m-GURUSH transaction reference ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      const computedMethod = getMethodFromChannel(channel);
      const effectiveRef =
        reference.trim() ||
        slipNumber.trim() ||
        `${channel.toUpperCase()}-${Date.now().toString().slice(-6)}`;

      const res = await recordPayment({
        studentId: activeStudentId as Id<"students">,
        amount: numAmount,
        method: computedMethod,
        channel,
        bankBranch: isBankChannel ? bankBranch.trim() : undefined,
        slipNumber: slipNumber.trim() || undefined,
        depositDate: isBankChannel ? depositDate : undefined,
        reference: effectiveRef,
        notes: notes.trim() || undefined,
      });

      toast.success(`Payment of SSP ${numAmount.toLocaleString()} recorded successfully!`);

      // Prepare receipt data
      const receiptData: ReceiptData = {
        receiptNumber: res.receiptNumber,
        date: Date.now(),
        studentName: currentLedger?.studentName || "Student",
        studentRegNumber: currentLedger?.studentRegNumber || "—",
        programName: currentLedger?.programName || "—",
        amount: numAmount,
        currency: "SSP",
        method: computedMethod,
        channel,
        bankBranch: isBankChannel ? bankBranch.trim() : undefined,
        slipNumber: slipNumber.trim() || undefined,
        depositDate: isBankChannel ? depositDate : undefined,
        reference: effectiveRef,
        notes: notes.trim() || undefined,
        balance: res.balance,
      };

      // Reset form
      setAmount("");
      setSlipNumber("");
      setReference("");
      setNotes("");
      onOpenChange(false);

      if (onPaymentSuccess) {
        onPaymentSuccess(receiptData);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Banknote className="size-5" />
            </div>
            Record Student Payment
          </DialogTitle>
          <DialogDescription>
            Enter tuition payment or fee collection details. An official receipt will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Student Selector / Info */}
          {!preselectedStudentId ? (
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student to credit..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search student..."
                        className="pl-8 h-8 text-xs"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {availableStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No active student ledgers found
                    </div>
                  ) : (
                    availableStudents.map((s) => (
                      <SelectItem key={s.studentId} value={s.studentId}>
                        <div className="flex items-center justify-between gap-3 text-xs w-full">
                          <span className="font-medium">{s.studentName}</span>
                          <span className="text-muted-foreground font-mono">{s.studentRegNumber}</span>
                          <span className="text-rose-600 font-medium">Bal: SSP {s.balance.toLocaleString()}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : (
            currentLedger && (
              <div className="p-3 bg-muted/40 rounded-lg border text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{currentLedger.studentName}</p>
                  <p className="text-muted-foreground font-mono">{currentLedger.studentRegNumber}</p>
                  <p className="text-muted-foreground text-[11px]">{currentLedger.programName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Balance Due</span>
                  <span className="font-mono font-bold text-rose-600 text-base">
                    SSP {currentLedger.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            )
          )}

          {/* Amount Field with Quick-Pay Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount (SSP)</Label>
              {currentLedger && currentLedger.balance > 0 && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-medium"
                    onClick={() => setAmount(Math.round(currentLedger.balance / 2).toString())}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="text-[11px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-medium"
                    onClick={() => setAmount(currentLedger.balance.toString())}
                  >
                    Full Balance
                  </button>
                </div>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="text-lg font-mono"
            />
          </div>

          {/* South Sudan Payment Channels Selector */}
          <div className="space-y-2">
            <Label>Payment Channel</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  channel === "cash"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setChannel("cash")}
              >
                <Banknote className="size-4 text-emerald-600" />
                <span>Cash Office</span>
              </button>
              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  channel === "m_gurush"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setChannel("m_gurush")}
              >
                <Smartphone className="size-4 text-amber-600" />
                <span>m-GURUSH</span>
              </button>
              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  channel === "equity_bank"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setChannel("equity_bank")}
              >
                <Landmark className="size-4 text-rose-600" />
                <span>Equity Bank</span>
              </button>
              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  channel === "kcb_bank"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setChannel("kcb_bank")}
              >
                <Landmark className="size-4 text-emerald-700" />
                <span>KCB Bank</span>
              </button>
              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  channel === "stanbic_bank"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setChannel("stanbic_bank")}
              >
                <Landmark className="size-4 text-sky-600" />
                <span>Stanbic Bank</span>
              </button>
              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  channel === "bank_deposit"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/40"
                }`}
                onClick={() => setChannel("bank_deposit")}
              >
                <CreditCard className="size-4 text-indigo-600" />
                <span>Other Bank</span>
              </button>
            </div>
          </div>

          {/* Conditional Bank Deposit Fields */}
          {isBankChannel && (
            <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Landmark className="size-3.5 text-primary" /> Bank Deposit Slip Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bankBranch" className="text-xs">Bank Branch</Label>
                  <Input
                    id="bankBranch"
                    placeholder="e.g. Juba Main, Yei Branch"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="depositDate" className="text-xs">Date of Deposit</Label>
                  <Input
                    id="depositDate"
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slipNumber" className="text-xs">Teller / Deposit Slip Number *</Label>
                <Input
                  id="slipNumber"
                  placeholder="e.g. SLIP-892011 / Teller #491"
                  value={slipNumber}
                  onChange={(e) => setSlipNumber(e.target.value)}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Conditional m-GURUSH Fields */}
          {channel === "m_gurush" && (
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-200/50 space-y-2">
              <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <Smartphone className="size-3.5 text-amber-600" /> m-GURUSH Mobile Money
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="slipNumber" className="text-xs">m-GURUSH Tx Reference ID *</Label>
                <Input
                  id="slipNumber"
                  placeholder="e.g. MG-2026-9810234"
                  value={slipNumber}
                  onChange={(e) => setSlipNumber(e.target.value)}
                  className="h-8 text-xs font-mono bg-white"
                  required
                />
              </div>
            </div>
          )}

          {/* Optional Internal Reference / Notes */}
          <div className="space-y-2">
            <Label htmlFor="reference">Internal Reference (Optional)</Label>
            <Input
              id="reference"
              placeholder="e.g. Bursar Book Voucher #402"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Paid by sponsor / guardian on behalf of student"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Recording...
                </>
              ) : (
                <>
                  <Banknote className="size-4" /> Confirm & Generate Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
