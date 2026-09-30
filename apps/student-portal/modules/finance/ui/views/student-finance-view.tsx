"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  DollarSign,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
  CreditCard,
  Loader2,
  Calendar,
  Award,
  TrendingUp,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import Image from "next/image";
import Link from "next/link";

const channelLabels: Record<string, string> = {
  cash: "Cash Office",
  m_gurush: "m-GURUSH Mobile Money",
  equity_bank: "Equity Bank South Sudan",
  kcb_bank: "KCB Bank South Sudan",
  stanbic_bank: "Stanbic Bank South Sudan",
  bank_deposit: "Direct Bank Deposit",
  other: "Other Transfer",
};

export function StudentFinanceView() {
  const statement = useQuery(api.student_portal.getMyFinancialStatement);
  const profile = useQuery(api.student_portal.getMyProfile);

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  if (!statement || !profile) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading financial ledger and receipts...</p>
      </div>
    );
  }

  const { summary, semesterLedgers, transactions } = statement;
  const installments = summary.installments;
  const sponsor = summary.sponsor;
  const isCleared = summary.balance <= 0 || summary.status === "cleared";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full print:p-0">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Fee Statements & Payment Receipts</h1>
            <Badge variant="outline" className="text-xs uppercase">
              Currency: SSP
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track tuition invoicing, official ECU payment receipts, and semester clearance balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 print:hidden">
            <Printer className="size-3.5" /> Print Statement
          </Button>
          <Button size="sm" asChild className="gap-1.5 bg-primary text-primary-foreground print:hidden">
            <Link href="/finance/exam-card">
              <FileText className="size-3.5" /> Examination Card
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Financial Summary KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">SSP {summary.totalBilled.toLocaleString()}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Total Cumulative Invoiced
                </p>
              </div>
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  SSP {summary.totalPaid.toLocaleString()}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Total Amount Paid
                </p>
              </div>
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {summary.balance <= 0 ? (
                    <span className="text-emerald-600">SSP 0</span>
                  ) : (
                    <span className="text-rose-600">SSP {summary.balance.toLocaleString()}</span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Balance:
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase ${
                      isCleared
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                        : "bg-rose-500/10 text-rose-600 border-rose-200"
                    }`}
                  >
                    {summary.status}
                  </Badge>
                </div>
              </div>
              <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <DollarSign className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sponsor / Scholarship Information Banner (if sponsored) ── */}
      {sponsor && (
        <Card className="border-emerald-200 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Tuition Sponsorship: {sponsor.name}
                  </h3>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-300 capitalize">
                    {sponsor.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Coverage: <strong className="text-foreground">{sponsor.coveragePercentage}%</strong> of eligible university tuition fees.
                  {sponsor.code && ` (Code: ${sponsor.code})`}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs shrink-0">
              Active Beneficiary
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* ── 3-Stage South Sudan Tuition Installment Milestones ── */}
      {installments && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <CardTitle className="text-base font-semibold">
                    South Sudan Higher Education Installment Milestones
                  </CardTitle>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Official clearance thresholds: Course Registration (40%), Continuous Assessments (75%), and Final Examination Cards (100%).
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-mono w-fit">
                {installments.progressPercentage}% Cumulative Paid • {installments.currentStage}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, installments.progressPercentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Stage 1 */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  installments.registration.cleared
                    ? "bg-emerald-500/5 border-emerald-200"
                    : "bg-amber-500/5 border-amber-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Stage 1: Registration (40%)</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      installments.registration.cleared
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                        : "bg-amber-500/10 text-amber-600 border-amber-200"
                    }`}
                  >
                    {installments.registration.cleared ? "Eligible" : "Pending"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Target: <strong>SSP {installments.registration.target.toLocaleString()}</strong>
                </p>
                {installments.registration.balanceToClear > 0 && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    Shortfall: SSP {installments.registration.balanceToClear.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stage 2 */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  installments.midterm.cleared
                    ? "bg-emerald-500/5 border-emerald-200"
                    : "bg-muted/40 border-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Stage 2: Midterm / CA (75%)</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      installments.midterm.cleared
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {installments.midterm.cleared ? "Eligible" : "Pending"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Target: <strong>SSP {installments.midterm.target.toLocaleString()}</strong>
                </p>
                {installments.midterm.balanceToClear > 0 && (
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Shortfall: SSP {installments.midterm.balanceToClear.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stage 3 */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  installments.finalExam.cleared
                    ? "bg-emerald-500/5 border-emerald-200"
                    : "bg-rose-500/5 border-rose-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Stage 3: Final Exams (100%)</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      installments.finalExam.cleared
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                        : "bg-rose-500/10 text-rose-600 border-rose-200"
                    }`}
                  >
                    {installments.finalExam.cleared ? "Exam Card Active" : "Blocked"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Target: <strong>SSP {installments.finalExam.target.toLocaleString()}</strong>
                </p>
                {installments.finalExam.balanceToClear > 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Shortfall: SSP {installments.finalExam.balanceToClear.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Semester Breakdown Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Semester-by-Semester Fee Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Invoiced tuition charges and payment status per academic period.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6">Academic Period</TableHead>
                <TableHead className="text-right">Total Invoiced (SSP)</TableHead>
                <TableHead className="text-right">Total Paid (SSP)</TableHead>
                <TableHead className="text-right">Balance (SSP)</TableHead>
                <TableHead className="text-right pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semesterLedgers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                    No semester billing ledgers generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                semesterLedgers.map((sem, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-6 font-semibold text-sm">
                      {sem.periodName} ({sem.year})
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {sem.totalBilled.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600 font-semibold">
                      {sem.totalPaid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {sem.balance <= 0 ? (
                        <span className="text-muted-foreground">0</span>
                      ) : (
                        <span className="text-rose-600 font-bold">{sem.balance.toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge
                        variant="outline"
                        className={
                          sem.status === "cleared"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]"
                            : sem.status === "partial"
                            ? "bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]"
                            : "bg-rose-500/10 text-rose-600 border-rose-200 text-[10px]"
                        }
                      >
                        {(sem.status ?? "pending").toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Official Payment Receipts Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Official University Payment Receipts</CardTitle>
              <CardDescription className="text-xs">
                Verified payment transactions recorded by the ECU Finance Office across South Sudan banking & cash channels.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6">Receipt Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Channel & Details</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-xs">
                    No payment transactions recorded yet. Payments made to the Finance Office will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t: any) => (
                  <TableRow key={t._id} className="hover:bg-muted/20">
                    <TableCell className="pl-6 font-mono font-bold text-sm text-primary">
                      {t.receiptNumber || `ECU-REC-${new Date(t.createdAt).getFullYear()}-001`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">
                          {channelLabels[t.channel] || t.channel || t.method}
                        </span>
                        {t.slipNumber && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Slip: #{t.slipNumber} {t.bankBranch ? `(${t.bankBranch})` : ""}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm text-emerald-600">
                      SSP {t.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReceipt(t)}
                        className="h-7 text-xs gap-1 text-primary"
                      >
                        <Receipt className="size-3.5" /> View Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Official Receipt Modal ── */}
      <Dialog open={!!selectedReceipt} onOpenChange={(o) => !o && setSelectedReceipt(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="p-6 bg-muted/20 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center overflow-hidden">
                <Image src="/icon.png" alt="ECU Logo" width={40} height={40} className="object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-none">EMMANUEL CHRISTIAN UNIVERSITY</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Finance & Accounts Office &bull; Official Receipt</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Receipt Number</span>
                <span className="font-mono font-bold text-sm text-primary">
                  {selectedReceipt?.receiptNumber || "ECU-REC-2026-0001"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Payment Date</span>
                <span>{selectedReceipt ? new Date(selectedReceipt.createdAt).toLocaleDateString() : ""}</span>
              </div>
            </div>

            <div className="space-y-1 bg-muted/40 p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received From:</span>
                <span className="font-semibold">{profile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration No:</span>
                <span className="font-mono font-bold">{profile.registrationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Degree Program:</span>
                <span>{profile.program.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Channel:</span>
                <span className="capitalize font-medium">
                  {channelLabels[selectedReceipt?.channel] || selectedReceipt?.channel || selectedReceipt?.method}
                </span>
              </div>
              {selectedReceipt?.slipNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Deposit Slip #:</span>
                  <span className="font-mono font-bold">{selectedReceipt.slipNumber}</span>
                </div>
              )}
              {selectedReceipt?.bankBranch && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Branch:</span>
                  <span>{selectedReceipt.bankBranch}</span>
                </div>
              )}
              {selectedReceipt?.depositDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Deposit Date:</span>
                  <span>{selectedReceipt.depositDate}</span>
                </div>
              )}
            </div>

            <div className="border-t border-b py-3 text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Amount Paid</span>
              <p className="text-2xl font-extrabold text-emerald-600 font-mono">
                SSP {selectedReceipt?.amount.toLocaleString()}
              </p>
            </div>

            <div className="text-[10px] text-center text-muted-foreground">
              Official computer-generated receipt valid without physical signature. Verified by ECU Finance Office.
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setSelectedReceipt(null)}>
              Close
            </Button>
            <Button size="sm" onClick={() => window.print()} className="gap-1 bg-primary text-primary-foreground">
              <Printer className="size-3.5" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
