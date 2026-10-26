"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowUpRight, BadgeCheck, Banknote, CalendarPlus, CircleDollarSign, FilePlus2, LockKeyhole, UsersRound } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { toast } from "sonner";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { PayrollPeriodDialog } from "../components/payroll-period-dialog";
import { PayrollStatementSheet } from "../components/payroll-statement-sheet";
import { PayrollPaymentDialog } from "../components/payroll-payment-dialog";

export function FinancePayrollView() {
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<Id<"staffPayPeriods"> | undefined>();
  const [statementPerson, setStatementPerson] = useState<PayrollPerson | null>(null);
  const [paymentPerson, setPaymentPerson] = useState<PayrollPerson | null>(null);
  const data = useQuery(api.financePayroll.getPayrollManagement, selectedPeriodId ? { payPeriodId: selectedPeriodId } : {});
  const publishPeriod = useMutation(api.financePayroll.publishPayrollPeriod);
  const closePeriod = useMutation(api.financePayroll.closePayrollPeriod);
  const period = data?.selectedPeriod;

  async function changePeriodStatus(action: "publish" | "close") {
    if (!period) return;
    try {
      if (action === "publish") {
        const result = await publishPeriod({ payPeriodId: period._id });
        toast.success(`${result.publishedCount} staff pay statement${result.publishedCount === 1 ? "" : "s"} published.`);
      } else {
        await closePeriod({ payPeriodId: period._id });
        toast.success("Payroll period closed.");
      }
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not update the payroll period."));
    }
  }

  const outstandingCount = data?.staff.filter((person) => person.statement?.status === "published").length ?? 0;
  const canClose = Boolean(period?.status === "published" && (data?.totals.preparedCount ?? 0) > 0 && outstandingCount === 0);

  return <main className="min-h-full w-full min-w-0 space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">Staff Payroll</h1></div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period?._id} onValueChange={(value) => setSelectedPeriodId(value as Id<"staffPayPeriods">)}>
          <SelectTrigger className="w-56 rounded-sm"><SelectValue placeholder="Select payroll period" /></SelectTrigger>
          <SelectContent>{(data?.periods ?? []).map((item) => <SelectItem key={item._id} value={item._id}>{item.label} · {item.status}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" className="rounded-sm" onClick={() => setPeriodDialogOpen(true)}><CalendarPlus className="mr-2 size-4" />New period</Button>
        {period?.status === "draft" && <Button className="rounded-sm" onClick={() => void changePeriodStatus("publish")} disabled={!data?.totals.preparedCount}><ArrowUpRight className="mr-2 size-4" />Publish to staff</Button>}
        {period?.status === "published" && <Button variant="outline" className="rounded-sm" onClick={() => void changePeriodStatus("close")} disabled={!canClose}><LockKeyhole className="mr-2 size-4" />Close payroll</Button>}
      </div>
    </header>

    {!data ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div> : data.periods.length === 0 ? <EmptyPayroll onCreate={() => setPeriodDialogOpen(true)} /> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PayrollMetric icon={UsersRound} label="Active staff" value={data.totals.staffCount} />
        <PayrollMetric icon={FilePlus2} label="Statements prepared" value={data.totals.preparedCount} />
        <PayrollMetric icon={BadgeCheck} label="Payments recorded" value={data.totals.paidCount} />
        <PayrollMetric icon={CircleDollarSign} label="Net payroll" value={formatAmount(data.totals.netPayroll, currencyFor(data.staff))} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">{period?.label ?? "Payroll statements"}</h2><p className="text-sm text-muted-foreground">{period ? `Pay date ${new Date(`${period.payDate}T00:00:00`).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : "Select a payroll period"}</p></div>
          {period && <Badge variant={period.status === "closed" ? "secondary" : "outline"} className="rounded-sm capitalize">{period.status}</Badge>}
        </div>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-primary hover:bg-primary">{["#", "Staff member", "Staff ID", "Roles", "Gross", "Deductions", "Net pay", "Status", "Action"].map((title) => <TableHead key={title} className="text-primary-foreground">{title}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {data.staff.map((person, index) => <PayrollRow key={person.staffProfileId} person={person} index={index} periodStatus={period?.status} onPrepare={() => setStatementPerson(person)} onRecordPayment={() => setPaymentPerson(person)} />)}
              {!data.staff.length && <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No active staff accounts were found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>
    </>}

    <PayrollPeriodDialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen} onCreated={setSelectedPeriodId} />
    {period && <PayrollStatementSheet open={!!statementPerson} onOpenChange={(open) => !open && setStatementPerson(null)} periodId={period._id} person={statementPerson} />}
    <PayrollPaymentDialog open={!!paymentPerson} onOpenChange={(open) => !open && setPaymentPerson(null)} statementId={paymentPerson?.statement?._id ?? null} staffName={paymentPerson?.name ?? "Staff member"} />
  </main>;
}

type PayrollPerson = NonNullable<ReturnType<typeof useQuery<typeof api.financePayroll.getPayrollManagement>>>["staff"][number];

function PayrollRow({ person, index, periodStatus, onPrepare, onRecordPayment }: { person: PayrollPerson; index: number; periodStatus?: string; onPrepare: () => void; onRecordPayment: () => void }) {
  const statement = person.statement;
  const deductions = statement?.deductions.reduce((total, item) => total + item.amount, 0) ?? 0;
  const hasEmptyRow = periodStatus === "draft" || (periodStatus === "published" && !statement);
  return <TableRow className="border-b border-border/70">
    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
    <TableCell><span className="block font-medium">{person.name}</span><span className="text-xs text-muted-foreground">{person.email}</span></TableCell>
    <TableCell className="font-mono text-xs">{person.staffId}</TableCell>
    <TableCell className="max-w-48 truncate text-xs capitalize">{person.roles.filter((role) => role !== "staff").join(", ") || "Staff"}</TableCell>
    <TableCell className="tabular-nums">{statement ? formatAmount(statement.grossPay, statement.currency) : "—"}</TableCell>
    <TableCell className="tabular-nums">{statement ? formatAmount(deductions, statement.currency) : "—"}</TableCell>
    <TableCell className="font-medium tabular-nums">{statement ? formatAmount(statement.netPay, statement.currency) : "—"}</TableCell>
    <TableCell>{statement ? <Badge variant={statement.status === "paid" ? "secondary" : "outline"} className="rounded-sm capitalize">{statement.status}</Badge> : <span className="text-xs text-muted-foreground">Not prepared</span>}</TableCell>
    <TableCell className="whitespace-nowrap">{hasEmptyRow && <Button variant="ghost" size="sm" className="rounded-sm text-primary" onClick={onPrepare}><FilePlus2 className="mr-1.5 size-4" />{statement ? "Edit" : "Prepare"}</Button>}{periodStatus === "published" && statement?.status === "published" && <Button variant="ghost" size="sm" className="rounded-sm text-primary" onClick={onRecordPayment}><Banknote className="mr-1.5 size-4" />Record payment</Button>}{statement?.status === "paid" && <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"><BadgeCheck className="size-4" />Paid</span>}</TableCell>
  </TableRow>;
}

function PayrollMetric({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string | number }) {
  return <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><Icon className="size-4" /></span><div><p className="text-sm text-muted-foreground">{label}</p><p className="font-semibold tabular-nums">{value}</p></div></CardContent></Card>;
}

function EmptyPayroll({ onCreate }: { onCreate: () => void }) {
  return <div className="flex min-h-60 flex-col items-center justify-center gap-3 border-y border-border/70 text-center"><CalendarPlus className="size-8 text-muted-foreground" /><h2 className="text-lg font-semibold">No payroll periods yet</h2><Button onClick={onCreate}>Create payroll period</Button></div>;
}

function currencyFor(staff: PayrollPerson[]) { return staff.find((person) => person.statement)?.statement?.currency ?? "SSP"; }
function formatAmount(amount: number, currency: string) { return `${currency} ${amount.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`; }
