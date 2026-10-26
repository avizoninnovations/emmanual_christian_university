"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileText, Wallet } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export function StaffFinanceView() {
  const [asOf] = useState(() => Date.now());
  const overview = useQuery(api.staffPayroll.getMyFinanceOverview, { asOf });
  const latest = overview?.latestStatement;

  return (
    <main className="min-h-full min-w-0 space-y-5 p-4 md:p-6 xl:p-8">
      <h1 className="text-xl font-semibold tracking-tight">My Finance</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Latest net pay"
          value={latest ? formatAmount(latest.netPay, latest.currency) : "—"}
          icon={<Wallet className="size-4" />}
        />
        <SummaryCard
          title="Latest pay period"
          value={latest?.periodLabel ?? "No statement yet"}
          icon={<FileText className="size-4" />}
        />
        <SummaryCard
          title="Payroll notices"
          value={overview ? String(overview.notices.length) : "…"}
          icon={<FileText className="size-4" />}
        />
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Recent pay statements</h2>
          <Button asChild variant="outline" size="sm" className="rounded-sm">
            <Link href="/workspace/salary-payslip">
              All statements <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableHead>Pay period</TableHead>
                <TableHead>Statement date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!overview &&
                Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {overview?.recentStatements.map((statement) => (
                <TableRow key={statement._id}>
                  <TableCell className="font-medium">
                    {statement.periodLabel}
                  </TableCell>
                  <TableCell>
                    {new Date(statement.statementDate).toLocaleDateString(
                      "en-GB",
                      { dateStyle: "medium" },
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statement.status === "paid" ? "secondary" : "outline"
                      }
                      className="rounded-sm capitalize"
                    >
                      {statement.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmount(statement.netPay, statement.currency)}
                  </TableCell>
                </TableRow>
              ))}
              {overview && overview.recentStatements.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    No salary statements have been issued to your account.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Payroll notices</h2>
        {overview ? (
          overview.notices.length ? (
            <div className="divide-y divide-border border-y">
              {overview.notices.map((notice) => (
                <article key={notice._id} className="space-y-1 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{notice.title}</h3>
                    <time className="text-xs text-muted-foreground">
                      {new Date(notice.publishedAt).toLocaleDateString(
                        "en-GB",
                        { dateStyle: "medium" },
                      )}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {notice.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-5 text-sm text-muted-foreground">
              There are no current payroll notices.
            </p>
          )
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-sm border-border/70 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-primary">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="truncate text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatAmount(amount: number, currency: "SSP" | "USD") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
