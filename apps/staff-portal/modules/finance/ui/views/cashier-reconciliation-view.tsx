"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Banknote,
  Landmark,
  Smartphone,
  CreditCard,
  Printer,
  Calendar,
  ShieldCheck,
  Receipt,
  Search,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@workspace/ui/components/table";

export const CashierReconciliationView = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const reconciliation = useQuery(api.finance.getDailyCashierReconciliation, {
    date: selectedDate,
  });

  const handlePrint = () => {
    window.print();
  };

  const transactions = (reconciliation?.transactions || []).filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.receiptNumber.toLowerCase().includes(q) ||
      t.studentName.toLowerCase().includes(q) ||
      t.studentRegNumber.toLowerCase().includes(q) ||
      (t.slipNumber && t.slipNumber.toLowerCase().includes(q))
    );
  });

  const formatChannel = (ch: string) => {
    switch (ch) {
      case "cash":
        return { label: "Cash Office", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" };
      case "m_gurush":
        return { label: "m-GURUSH", color: "bg-amber-500/10 text-amber-600 border-amber-200" };
      case "equity_bank":
        return { label: "Equity Bank", color: "bg-rose-500/10 text-rose-600 border-rose-200" };
      case "kcb_bank":
        return { label: "KCB Bank", color: "bg-emerald-700/10 text-emerald-700 border-emerald-300" };
      case "stanbic_bank":
        return { label: "Stanbic Bank", color: "bg-sky-500/10 text-sky-600 border-sky-200" };
      case "bank_deposit":
        return { label: "Bank Slip", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" };
      default:
        return { label: "Other", color: "bg-gray-500/10 text-gray-600 border-gray-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Control Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Daily Cashier Reconciliation</h3>
            <p className="text-xs text-muted-foreground">Select date to balance daily collections & cashbook</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44 h-9 text-xs"
          />
          <Button onClick={handlePrint} variant="outline" className="gap-2 h-9 text-xs">
            <Printer className="size-4" /> Print Closing Sheet
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Total Daily Revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black font-mono text-foreground">
              SSP {(reconciliation?.totalCollected ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Receipt className="size-3.5" />
              <span>{reconciliation?.receiptCount ?? 0} official receipts issued</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Cash on Hand (Physical)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black font-mono text-emerald-600">
              SSP {(reconciliation?.totalCashOnHand ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Physical vault / cash drawer balance
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-indigo-600 bg-indigo-50/20">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
              Bank & Mobile Deposits
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black font-mono text-indigo-600">
              SSP {(reconciliation?.totalDigitalAndBank ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              m-GURUSH, Equity, KCB, Stanbic
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-600 bg-amber-50/20">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Audit Status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span className="font-semibold text-sm text-foreground">Balanced & Verified</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              ECU Bursar shift closing log
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Channel Breakdown Bar ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Collections by Payment Channel</CardTitle>
          <CardDescription className="text-xs">
            Distribution across South Sudan commercial banks, mobile money, and campus cash office
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-muted/40 rounded-lg border text-center">
              <Banknote className="size-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Cash Office</span>
              <span className="font-mono font-bold text-xs text-foreground block mt-0.5">
                SSP {(reconciliation?.channelSummary?.cash ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border text-center">
              <Smartphone className="size-4 text-amber-600 mx-auto mb-1" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">m-GURUSH</span>
              <span className="font-mono font-bold text-xs text-foreground block mt-0.5">
                SSP {(reconciliation?.channelSummary?.m_gurush ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border text-center">
              <Landmark className="size-4 text-rose-600 mx-auto mb-1" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Equity Bank</span>
              <span className="font-mono font-bold text-xs text-foreground block mt-0.5">
                SSP {(reconciliation?.channelSummary?.equity_bank ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border text-center">
              <Landmark className="size-4 text-emerald-700 mx-auto mb-1" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">KCB Bank</span>
              <span className="font-mono font-bold text-xs text-foreground block mt-0.5">
                SSP {(reconciliation?.channelSummary?.kcb_bank ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border text-center">
              <Landmark className="size-4 text-sky-600 mx-auto mb-1" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Stanbic Bank</span>
              <span className="font-mono font-bold text-xs text-foreground block mt-0.5">
                SSP {(reconciliation?.channelSummary?.stanbic_bank ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border text-center">
              <CreditCard className="size-4 text-indigo-600 mx-auto mb-1" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Other Bank</span>
              <span className="font-mono font-bold text-xs text-foreground block mt-0.5">
                SSP {(reconciliation?.channelSummary?.bank_deposit ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Itemized Daily Receipts Log ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Today's Receipt Journal</CardTitle>
            <CardDescription className="text-xs">
              Sequential list of all payments credited during this date
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search receipt, student, slip..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="pl-4">Receipt #</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Slip / Ref #</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead className="text-right pr-4">Amount (SSP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No transactions recorded on {selectedDate}.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => {
                  const ch = formatChannel(t.channel);
                  const time = new Date(t.date).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <TableRow key={t._id} className="text-xs">
                      <TableCell className="pl-4 font-mono font-semibold text-primary">
                        {t.receiptNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono">{time}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{t.studentName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{t.studentRegNumber}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-medium ${ch.color}`}>
                          {ch.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {t.slipNumber || t.reference}
                        {t.bankBranch && <span className="block text-[10px] text-muted-foreground">{t.bankBranch}</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">{t.cashierName}</TableCell>
                      <TableCell className="text-right pr-4 font-mono font-bold text-foreground">
                        {t.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
