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
import { Loader2, Award, Search, AlertCircle } from "lucide-react";

interface FeeWaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStudentId?: Id<"students"> | null;
  onSuccess?: () => void;
}

export const FeeWaiverDialog = ({
  open,
  onOpenChange,
  preselectedStudentId,
  onSuccess,
}: FeeWaiverDialogProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preselectedStudentId || "");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("Church Partner Bursary");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const studentLedgers = useQuery(api.finance.getStudentLedgers, {});
  const recordWaiver = useMutation(api.finance.recordWaiver);

  const activeStudentId = preselectedStudentId || selectedStudentId;
  const currentLedger = studentLedgers?.find((l) => l.studentId === activeStudentId);

  const availableStudents = (studentLedgers || []).filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentRegNumber.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeStudentId) {
      toast.error("Please select a student.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid waiver amount.");
      return;
    }

    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      toast.error("Please specify a reason for the waiver/bursary.");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordWaiver({
        studentId: activeStudentId as Id<"students">,
        amount: numAmount,
        reason: finalReason,
        notes: notes.trim() || undefined,
      });

      toast.success(`Fee waiver of SSP ${numAmount.toLocaleString()} applied successfully!`);
      setAmount("");
      setCustomReason("");
      setNotes("");
      onOpenChange(false);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply fee waiver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Award className="size-5" />
            </div>
            Apply Fee Waiver / Scholarship
          </DialogTitle>
          <DialogDescription>
            Grant a tuition waiver, church bursary, or administrative credit to reduce the student's balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Student Selector */}
          {!preselectedStudentId ? (
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
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
                  {availableStudents.map((s) => (
                    <SelectItem key={s.studentId} value={s.studentId}>
                      <div className="flex items-center justify-between gap-3 text-xs w-full">
                        <span className="font-medium">{s.studentName}</span>
                        <span className="font-mono text-muted-foreground">{s.studentRegNumber}</span>
                        <span className="text-rose-600">Bal: {s.balance.toLocaleString()}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            currentLedger && (
              <div className="p-3 bg-muted/40 rounded-lg border text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{currentLedger.studentName}</p>
                  <p className="text-muted-foreground font-mono">{currentLedger.studentRegNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Current Due</span>
                  <span className="font-mono font-bold text-rose-600">
                    SSP {currentLedger.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            )
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="waiver-amount">Waiver Amount (SSP)</Label>
            <Input
              id="waiver-amount"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="text-lg font-mono"
            />
          </div>

          {/* Reason Category */}
          <div className="space-y-2">
            <Label>Waiver Category / Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Church Partner Bursary">Church Partner Bursary (EPC / Open Doors)</SelectItem>
                <SelectItem value="Academic Merit Scholarship">Academic Merit Scholarship</SelectItem>
                <SelectItem value="Need-based Financial Aid">Need-based Financial Aid</SelectItem>
                <SelectItem value="Staff Dependent Discount">Staff Dependent Discount</SelectItem>
                <SelectItem value="Administrative Fee Adjustment">Administrative Fee Adjustment</SelectItem>
                <SelectItem value="Other">Other (Custom Reason)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reason === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Specify Reason</Label>
              <Input
                id="custom-reason"
                placeholder="Enter specific reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="waiver-notes">Approval Notes / Reference</Label>
            <Textarea
              id="waiver-notes"
              placeholder="e.g. Approved by Vice-Chancellor / Finance Committee Minute #14"
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
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Applying...
                </>
              ) : (
                <>
                  <Award className="size-4" /> Grant Waiver
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
