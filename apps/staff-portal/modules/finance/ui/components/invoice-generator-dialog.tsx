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
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2, Zap, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

interface InvoiceGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const InvoiceGeneratorDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: InvoiceGeneratorDialogProps) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const periods = useQuery(api.academic.getPeriods);
  const programs = useQuery(api.academic.getPrograms, {});
  const applySemesterInvoices = useMutation(api.finance.applySemesterInvoices);

  // Default to the first active period if available
  const activePeriod = periods?.find((p) => p.status === "active");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetPeriod = selectedPeriodId || activePeriod?._id;
    if (!targetPeriod) {
      toast.error("Please select an academic period to generate invoices for.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await applySemesterInvoices({
        periodId: targetPeriod as Id<"academicPeriods">,
        programId:
          selectedProgramId && selectedProgramId !== "ALL"
            ? (selectedProgramId as Id<"programs">)
            : undefined,
      });

      toast.success(
        `Successfully invoiced ${result.invoicedCount} student(s) for ${result.periodName}. (${result.skippedCount} skipped)`
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate semester invoices.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap className="size-5" />
            </div>
            Run Semester Fee Invoicing
          </DialogTitle>
          <DialogDescription>
            Automatically apply configured program fee structures to all enrolled students for the upcoming semester.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Target Academic Period */}
          <div className="space-y-2">
            <Label>Academic Period (Semester)</Label>
            <Select
              value={selectedPeriodId || activePeriod?._id || ""}
              onValueChange={setSelectedPeriodId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select period to invoice..." />
              </SelectTrigger>
              <SelectContent>
                {periods?.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} ({p.year}) — Semester {p.term} {p.status === "active" ? "(Current Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Program Scope */}
          <div className="space-y-2">
            <Label>Program Scope</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="All academic programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Programs (University-wide)</SelectItem>
                {programs?.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning / Note Box */}
          <div className="p-3.5 bg-muted/40 border rounded-lg text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <AlertCircle className="size-4 text-amber-600" />
              <span>Safe & Non-Destructive Invoicing</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              This process only generates invoices for students who have not yet been billed for the selected period.
              Students who already have an invoice or payment record will not be duplicated.
            </p>
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
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Invoicing...
                </>
              ) : (
                <>
                  <Zap className="size-4" /> Run Invoicing
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
