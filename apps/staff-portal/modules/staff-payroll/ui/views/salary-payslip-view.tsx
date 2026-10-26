"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { PayStatementSheet } from "../components/pay-statement-sheet";

export function SalaryPayslipView() {
  const statements = usePaginatedQuery(
    api.staffPayroll.getMyPayStatements,
    {},
    { initialNumItems: 20 },
  );
  const [selectedId, setSelectedId] = useState<Id<"staffPayStatements"> | null>(
    null,
  );

  return (
    <main className="min-h-full min-w-0 space-y-5 p-4 md:p-6 xl:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Salary Pay Slip</h1>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Pay period</TableHead>
              <TableHead>Statement date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Net pay</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statements.status === "LoadingFirstPage" &&
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-7 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {statements.results.map((statement, index) => (
              <TableRow key={statement._id}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {index + 1}
                </TableCell>
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
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-sm text-primary"
                    onClick={() => setSelectedId(statement._id)}
                  >
                    View statement
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {statements.status !== "LoadingFirstPage" &&
              statements.results.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    No salary statements have been issued to your account.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </div>
      {statements.status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={() => statements.loadMore(20)}
          >
            Load older statements
          </Button>
        </div>
      )}
      <PayStatementSheet
        statementId={selectedId}
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </main>
  );
}

function formatAmount(amount: number, currency: "SSP" | "USD") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
