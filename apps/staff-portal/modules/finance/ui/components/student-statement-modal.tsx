"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Receipt,
  Plus,
  Loader2,
} from "lucide-react";
import { ReceiptData } from "./receipt-preview-modal";

interface StudentStatementModalProps {
  studentId: Id<"students"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPaymentForStudent?: (studentId: Id<"students">) => void;
  onViewReceipt?: (receipt: ReceiptData) => void;
}

export const StudentStatementModal = ({
  studentId,
  open,
  onOpenChange,
  onOpenPaymentForStudent,
  onViewReceipt,
}: StudentStatementModalProps) => {
  const profile = useQuery(
    api.finance.getStudentFinancialProfile,
    studentId ? { studentId } : "skip"
  );

  if (!studentId || profile === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { student, cumulativeDue, cumulativePaid, cumulativeBalance, overallStatus, ledgers, transactions } =
    profile;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 border-b bg-muted/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Student Financial Statement
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Full ledger and transaction history for official audit and examination clearance.
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={
                overallStatus === "cleared"
                  ? "text-emerald-600 border-emerald-300 bg-emerald-50 px-3 py-1 font-bold text-xs"
                  : overallStatus === "partial"
                  ? "text-amber-600 border-amber-300 bg-amber-50 px-3 py-1 font-bold text-xs"
                  : "text-rose-600 border-rose-300 bg-rose-50 px-3 py-1 font-bold text-xs"
              }
            >
              {overallStatus === "cleared" ? "FINANCIALLY CLEARED" : overallStatus === "partial" ? "PARTIAL CLEARANCE" : "PENDING CLEARANCE"}
            </Badge>
          </div>

          {/* Student Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Student Name</span>
              <span className="font-bold text-sm text-foreground">{student.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Reg Number</span>
              <span className="font-mono font-bold text-sm">{student.registrationNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Program</span>
              <span className="font-medium text-muted-foreground truncate">{student.programName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Current Level</span>
              <span className="font-medium">Year {student.yearOfStudy} (Sem {student.term})</span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Summary Balance Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-muted/40 border rounded-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Invoiced</span>
              <span className="text-lg font-bold font-mono">SSP {cumulativeDue.toLocaleString()}</span>
            </div>
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Total Paid</span>
              <span className="text-lg font-bold font-mono text-emerald-600">SSP {cumulativePaid.toLocaleString()}</span>
            </div>
            <div className="p-3.5 bg-rose-500/10 border border-rose-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">Current Balance</span>
              <span className="text-lg font-bold font-mono text-rose-600">SSP {cumulativeBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Semester Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Semester Billing Breakdown
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead>Academic Period</TableHead>
                    <TableHead className="text-right">Billed (SSP)</TableHead>
                    <TableHead className="text-right">Paid (SSP)</TableHead>
                    <TableHead className="text-right">Balance (SSP)</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {ledgers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No semester billing records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgers.map((l) => (
                      <TableRow key={l._id}>
                        <TableCell className="font-medium">{l.periodName}</TableCell>
                        <TableCell className="text-right font-mono">{l.totalDue.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">
                          {l.totalPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-rose-600">
                          {l.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              l.status === "cleared"
                                ? "text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]"
                                : l.status === "partial"
                                ? "text-amber-600 border-amber-200 bg-amber-50 text-[10px]"
                                : "text-rose-600 border-rose-200 bg-rose-50 text-[10px]"
                            }
                          >
                            {l.status?.toUpperCase() || "PENDING"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Transaction History Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Transaction & Receipt Ledger
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead>Receipt No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method / Ref</TableHead>
                    <TableHead className="text-right">Amount (SSP)</TableHead>
                    <TableHead className="text-right pr-4">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No transactions recorded for this student yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell className="font-mono font-semibold text-primary">
                          {t.receiptNumber || `REC-${t._id.slice(-6)}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(t.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              t.type === "payment"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : t.type === "waiver"
                                ? "bg-purple-50 text-purple-600 border-purple-200"
                                : "bg-gray-50 text-gray-600"
                            }
                          >
                            {t.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="capitalize">{t.method || "cash"}</span> · {t.reference}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {t.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {onViewReceipt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-primary hover:text-primary"
                              onClick={() =>
                                onViewReceipt({
                                  receiptNumber: t.receiptNumber || `ECU-${t._id.slice(-6)}`,
                                  date: t.date,
                                  studentName: student.name,
                                  studentRegNumber: student.registrationNumber,
                                  programName: student.programName,
                                  amount: t.amount,
                                  currency: "SSP",
                                  method: t.method || "cash",
                                  reference: t.reference,
                                  notes: t.notes,
                                  balance: cumulativeBalance,
                                })
                              }
                            >
                              <Receipt className="size-3" /> View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 flex sm:justify-between items-center">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="size-4" /> Print Statement
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {onOpenPaymentForStudent && (
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  onOpenChange(false);
                  onOpenPaymentForStudent(student._id);
                }}
              >
                <Plus className="size-4" /> Record Payment
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
