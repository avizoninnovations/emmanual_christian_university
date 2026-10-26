"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Banknote, FileSpreadsheet, Landmark, ShieldAlert, UserCheck, Wallet, UsersRound } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

export function FinanceOfficeSummarySection() {
  const period = useQuery(api.calendar.getActivePeriod);
  const summary = useQuery(api.finance.getFinancialSummary, {
    periodId: period?._id,
  });

  return (
    <section aria-label="Finance overview" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Finance Office</p>
        </div>
        <Badge variant="outline">{period ? `Semester ${period.term} · ${period.year}` : "All periods"}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric icon={FileSpreadsheet} label="Invoiced" amount={summary?.totalExpected} detail={`${summary?.totalStudentsInvoiced ?? 0} student accounts`} />
        <FinanceMetric icon={Banknote} label="Collected" amount={summary?.totalCollected} detail={`${summary?.collectionRate ?? 0}% of invoiced fees`} accent />
        <FinanceMetric icon={ShieldAlert} label="Outstanding" amount={summary?.totalOutstanding} detail={`${summary?.pendingCount ?? 0} accounts unpaid`} />
        <FinanceMetric icon={UserCheck} label="Cleared" value={summary ? `${summary.clearedCount} / ${summary.totalStudentsInvoiced}` : undefined} detail="Accounts fully paid" />
      </div>
    </section>
  );
}

export function FinanceDashboardView() {
  const period = useQuery(api.calendar.getActivePeriod);
  const { roles } = useCurrentUser();
  const canManageFinance = roles.some((role) => ["finance", "bursar", "admin"].includes(role.toLowerCase()));

  return (
    <main className="min-h-full bg-muted/30 px-4 py-6 md:px-8 md:py-8">
      <div className="w-full space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ECU · Finance Office</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Finance overview</h1>
          </div>
          <Badge variant="outline">{period ? `${period.name} · Semester ${period.term}, ${period.year}` : "All academic periods"}</Badge>
        </header>

        <FinanceOfficeSummarySection />

        <section aria-label="Finance tasks" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FinanceAction href="/finance-office/accounts" icon={UserCheck} title="Student accounts" />
          <FinanceAction href="/finance-office/payments" icon={Wallet} title="Payments and receipts" />
          {canManageFinance && <FinanceAction href="/finance-office/fees" icon={FileSpreadsheet} title="Fees and invoicing" />}
          {canManageFinance && <FinanceAction href="/finance-office/sponsors" icon={Landmark} title="Sponsors and assistance" />}
          <FinanceAction href="/finance-office/reconciliation" icon={Banknote} title="Cash reconciliation" />
          {canManageFinance && <FinanceAction href="/finance-office/reports" icon={ArrowRight} title="Financial reports" />}
          {canManageFinance && <FinanceAction href="/finance-office/payroll" icon={UsersRound} title="Staff payroll" />}
        </section>
      </div>
    </main>
  );
}

function FinanceMetric({ icon: Icon, label, amount, value, detail, accent = false }: { icon: typeof Banknote; label: string; amount?: number; value?: string; detail: string; accent?: boolean }) {
  const display = value ?? (amount === undefined ? undefined : `SSP ${amount.toLocaleString()}`);
  return (
    <Card className="rounded-sm border-border/70 shadow-none">
      <CardContent className="flex items-center gap-4 p-4">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-sm ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="size-5" /></span>
        <div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p>{display === undefined ? <Skeleton className="mt-1 h-7 w-32" /> : <p className="mt-0.5 truncate text-xl font-semibold tabular-nums">{display}</p>}<p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

function FinanceAction({ href, icon: Icon, title }: { href: string; icon: typeof Banknote; title: string }) {
  return (
    <Card className="rounded-sm border-border/70 shadow-none transition-colors hover:border-primary/30 hover:bg-primary/[0.02]">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-3 text-base"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><Icon className="size-4" /></span>{title}</CardTitle></CardHeader>
      <CardContent className="pt-0"><Button asChild variant="ghost" size="sm" className="-ml-2 text-primary"><Link href={href}>Open section<ArrowRight className="ml-2 size-4" /></Link></Button></CardContent>
    </Card>
  );
}
