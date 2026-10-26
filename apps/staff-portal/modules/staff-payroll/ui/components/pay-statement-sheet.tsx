"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function PayStatementSheet({
  statementId,
  open,
  onOpenChange,
}: {
  statementId: Id<"staffPayStatements"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useQuery(
    api.staffPayroll.getMyPayStatementDetails,
    statementId ? { statementId } : "skip",
  );
  const statement = data?.statement;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[96vw] overflow-hidden rounded-l-sm p-0 sm:w-[60vw] sm:max-w-2xl">
        {statement && data ? (
          <>
            <SheetHeader className="border-b px-6 py-5 pr-14 text-left">
              <SheetTitle>Salary statement</SheetTitle>
              <SheetDescription>
                {data.period?.label ?? "Pay period unavailable"}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100dvh-88px)]">
              <div className="space-y-6 p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Statement date
                    </p>
                    <p className="mt-1 font-medium">
                      {new Date(statement.statementDate).toLocaleDateString(
                        "en-GB",
                        { dateStyle: "long" },
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={
                      statement.status === "paid" ? "secondary" : "outline"
                    }
                    className="rounded-sm capitalize"
                  >
                    {statement.status}
                  </Badge>
                </div>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Earnings</h3>
                  <MoneyRow
                    label="Basic pay"
                    amount={statement.basicPay}
                    currency={statement.currency}
                  />
                  {statement.allowances.map((allowance, index) => (
                    <MoneyRow
                      key={`${allowance.label}-${index}`}
                      label={allowance.label}
                      amount={allowance.amount}
                      currency={statement.currency}
                    />
                  ))}
                  <MoneyRow
                    label="Gross pay"
                    amount={statement.grossPay}
                    currency={statement.currency}
                    strong
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Deductions</h3>
                  {statement.deductions.length ? (
                    statement.deductions.map((deduction, index) => (
                      <MoneyRow
                        key={`${deduction.label}-${index}`}
                        label={deduction.label}
                        amount={deduction.amount}
                        currency={statement.currency}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No deductions recorded.
                    </p>
                  )}
                  <MoneyRow
                    label="Net pay"
                    amount={statement.netPay}
                    currency={statement.currency}
                    strong
                  />
                </section>
                {statement.status === "paid" && (
                  <section className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Payment date
                      </p>
                      <p className="mt-1 text-sm">
                        {statement.paidAt
                          ? new Date(statement.paidAt).toLocaleDateString(
                              "en-GB",
                              { dateStyle: "medium" },
                            )
                          : "Not recorded"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Payment reference
                      </p>
                      <p className="mt-1 break-all font-mono text-sm">
                        {statement.paymentReference ?? "Not recorded"}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </ScrollArea>
          </>
        ) : open ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-8 h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function MoneyRow({
  label,
  amount,
  currency,
  strong = false,
}: {
  label: string;
  amount: number;
  currency: "SSP" | "USD";
  strong?: boolean;
}) {
  const value = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
  return (
    <div
      className={`flex items-center justify-between gap-4 text-sm ${strong ? "border-t pt-3 font-semibold" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
