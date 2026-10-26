"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Download, Printer } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

export function FinanceReportsView() {
  const periods = useQuery(api.academic.getPeriods);
  const activePeriod = periods?.find((period) => period.status === "active");
  const [periodId, setPeriodId] = useState<Id<"academicPeriods"> | "all" | null>(null);
  const effectivePeriodId = periodId === "all" ? undefined : periodId ?? activePeriod?._id;
  const summary = useQuery(api.finance.getFinancialSummary, { periodId: effectivePeriodId });
  const ledgers = useQuery(api.finance.getStudentLedgers, { periodId: effectivePeriodId });
  const debtors = (ledgers ?? []).filter((ledger) => ledger.balance > 0).sort((left, right) => right.balance - left.balance);

  function exportDebtors() {
    const lines = ["Registration number,Student,Program,Invoiced,Paid,Balance,Status", ...debtors.map((ledger) => [ledger.studentRegNumber, ledger.studentName, ledger.programName, ledger.totalDue, ledger.totalPaid, ledger.balance, ledger.status].map(csvValue).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ecu-finance-debtors.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full min-w-0 space-y-5 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodId ?? "active"} onValueChange={(value) => setPeriodId(value === "active" ? null : value === "all" ? "all" : value as Id<"academicPeriods">)}>
            <SelectTrigger className="w-56 rounded-sm"><SelectValue placeholder="Academic period" /></SelectTrigger>
            <SelectContent><SelectItem value="active">Current academic period</SelectItem><SelectItem value="all">All periods</SelectItem>{(periods ?? []).map((period) => <SelectItem key={period._id} value={period._id}>{period.name} · {period.year}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" className="rounded-sm" onClick={() => window.print()}><Printer className="mr-2 size-4" />Print</Button>
          <Button className="rounded-sm" onClick={exportDebtors} disabled={!debtors.length}><Download className="mr-2 size-4" />Export debtors</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="Invoiced" value={summary?.totalExpected} />
        <ReportMetric label="Collected" value={summary?.totalCollected} />
        <ReportMetric label="Outstanding" value={summary?.totalOutstanding} />
        <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Collection rate</p>{summary ? <p className="mt-1 text-2xl font-semibold tabular-nums">{summary.collectionRate}%</p> : <Skeleton className="mt-2 h-7 w-16" />}<p className="mt-1 text-xs text-muted-foreground">{summary?.clearedCount ?? 0} of {summary?.totalStudentsInvoiced ?? 0} accounts cleared</p></CardContent></Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Outstanding student accounts</h2><Badge variant="secondary">{debtors.length} accounts</Badge></div>
        <div className="w-full overflow-x-auto"><Table><TableHeader><TableRow className="bg-primary text-primary-foreground hover:bg-primary"><TableHead className="text-primary-foreground">#</TableHead><TableHead className="text-primary-foreground">Student</TableHead><TableHead className="text-primary-foreground">Program</TableHead><TableHead className="text-right text-primary-foreground">Invoiced</TableHead><TableHead className="text-right text-primary-foreground">Paid</TableHead><TableHead className="text-right text-primary-foreground">Outstanding</TableHead></TableRow></TableHeader><TableBody>
          {ledgers === undefined && Array.from({ length: 4 }, (_, index) => <TableRow key={index}><TableCell colSpan={6}><Skeleton className="h-7 w-full" /></TableCell></TableRow>)}
          {debtors.slice(0, 100).map((ledger, index) => <TableRow key={ledger._id}><TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell><TableCell><span className="block font-medium">{ledger.studentName}</span><span className="font-mono text-xs text-muted-foreground">{ledger.studentRegNumber}</span></TableCell><TableCell>{ledger.programName}</TableCell><TableCell className="text-right tabular-nums">{formatAmount(ledger.totalDue)}</TableCell><TableCell className="text-right tabular-nums">{formatAmount(ledger.totalPaid)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{formatAmount(ledger.balance)}</TableCell></TableRow>)}
          {ledgers && debtors.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">There are no outstanding student balances for this period.</TableCell></TableRow>}
        </TableBody></Table></div>
      </section>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value?: number }) {
  return <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p>{value === undefined ? <Skeleton className="mt-2 h-7 w-32" /> : <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAmount(value)}</p>}</CardContent></Card>;
}

function formatAmount(amount: number) { return `SSP ${amount.toLocaleString()}`; }
function csvValue(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
