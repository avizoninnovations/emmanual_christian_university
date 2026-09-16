"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Banknote,
  Search,
  Filter,
  TrendingUp,
  CreditCard,
  UserCheck,
  Receipt,
  Download,
  Plus,
  Zap,
  Coins,
  ShieldAlert,
  Printer,
  ChevronRight,
  Landmark,
  Smartphone,
  Award,
  Calendar,
  Pencil,
  Trash2,
  MoreHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@workspace/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { PaymentFormDialog } from "../components/payment-form-dialog";
import { ReceiptPreviewModal, ReceiptData } from "../components/receipt-preview-modal";
import { StudentStatementModal } from "../components/student-statement-modal";
import { FeeWaiverDialog } from "../components/fee-waiver-dialog";
import { FeeStructureDialog } from "../components/fee-structure-dialog";
import { InvoiceGeneratorDialog } from "../components/invoice-generator-dialog";

export const FinanceView = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [search, setSearch] = useState<string>("");
  const [programFilter, setProgramFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilter] = useState<string>("ALL");

  // Dialog State
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isStatementOpen, setIsStatementOpen] = useState<boolean>(false);
  const [isWaiverOpen, setIsWaiverOpen] = useState<boolean>(false);
  const [isFeeStructOpen, setIsFeeStructOpen] = useState<boolean>(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);

  // Selected entities
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<Id<"students"> | null>(null);
  const [editingFeeStruct, setEditingFeeStruct] = useState<any | null>(null);

  // Queries
  const periods = useQuery(api.academic.getPeriods);
  const programs = useQuery(api.academic.getPrograms, {});
  const activePeriod = periods?.find((p) => p.status === "active");

  const effectivePeriodId =
    periodFilter !== "ALL"
      ? (periodFilter as Id<"academicPeriods">)
      : activePeriod?._id;

  const summary = useQuery(api.finance.getFinancialSummary, {
    periodId: effectivePeriodId,
  });

  const studentLedgers = useQuery(api.finance.getStudentLedgers, {
    periodId: effectivePeriodId,
    programId: programFilter !== "ALL" ? (programFilter as Id<"programs">) : undefined,
    status:
      statusFilter !== "ALL"
        ? (statusFilter as "cleared" | "partial" | "pending")
        : undefined,
    search: search.trim() || undefined,
  });

  const feeStructures = useQuery(api.finance.getFeeStructures, {
    periodId: effectivePeriodId,
  });

  const transactions = useQuery(api.finance.getAllTransactions, {
    periodId: effectivePeriodId,
  });

  const deleteFeeStructure = useMutation(api.finance.deleteFeeStructure);

  const handleDeleteFeeStructure = async (id: Id<"feeStructures">) => {
    if (!confirm("Are you sure you want to delete this fee structure?")) return;
    try {
      await deleteFeeStructure({ id });
      toast.success("Fee structure removed.");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete fee structure.");
    }
  };

  const handleOpenReceiptFromRow = (t: any) => {
    setActiveReceipt({
      receiptNumber: t.receiptNumber,
      date: t.date,
      studentName: t.studentName,
      studentRegNumber: t.studentRegNumber,
      programName: t.programName,
      amount: t.amount,
      currency: "SSP",
      method: t.method || "cash",
      reference: t.reference,
      notes: t.notes,
    });
    setIsReceiptOpen(true);
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">University Financial Operations</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {activePeriod ? `${activePeriod.name} (${activePeriod.year})` : "All Periods"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage tuition billing, payment recording, fee structures, and examination clearance.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsInvoiceOpen(true)}
          >
            <Zap className="size-4 text-amber-600" /> Run Invoicing
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditingFeeStruct(null);
              setIsFeeStructOpen(true);
            }}
          >
            <Coins className="size-4 text-primary" /> New Fee Schedule
          </Button>

          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={() => {
              setTargetStudentId(null);
              setIsPaymentOpen(true);
            }}
          >
            <Banknote className="size-4" /> Record Payment
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-3">
          <TabsList className="grid grid-cols-4 w-full sm:w-[580px]">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="ledgers" className="gap-2">
              <UserCheck className="size-3.5" /> Student Clearance
            </TabsTrigger>
            <TabsTrigger value="structures" className="gap-2">
              <Coins className="size-3.5" /> Fee Structures
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="size-3.5" /> Transactions
            </TabsTrigger>
          </TabsList>

          {/* Academic Period Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline">Period:</span>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Period Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Academic Periods</SelectItem>
                {periods?.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} ({p.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: OVERVIEW & ANALYTICS
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                      Total Invoiced
                    </span>
                    <p className="text-2xl font-bold font-mono mt-1">
                      SSP {(summary?.totalExpected || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary?.totalStudentsInvoiced || 0} active student ledger(s)
                    </p>
                  </div>
                  <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <CreditCard className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      Total Collected
                    </span>
                    <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                      SSP {(summary?.totalCollected || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      {summary?.collectionRate || 0}% collection rate
                    </p>
                  </div>
                  <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                      Outstanding Arrears
                    </span>
                    <p className="text-2xl font-bold font-mono text-rose-600 mt-1">
                      SSP {(summary?.totalOutstanding || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-rose-600 mt-1 font-medium">Pending collection</p>
                  </div>
                  <div className="size-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <ShieldAlert className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                      Exam Clearance
                    </span>
                    <p className="text-2xl font-bold font-mono text-primary mt-1">
                      {summary?.clearedCount || 0}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {summary?.totalStudentsInvoiced || 0}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Students fully cleared</p>
                  </div>
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <UserCheck className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collection Methods & Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Banknote className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Cash Collections</span>
                    <p className="text-lg font-bold font-mono">
                      SSP {(summary?.methodTotals?.cash || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Landmark className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Bank Transfers & Slips</span>
                    <p className="text-lg font-bold font-mono">
                      SSP {(summary?.methodTotals?.bank || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Mobile Money (m-GURUSH)</span>
                    <p className="text-lg font-bold font-mono">
                      SSP {(summary?.methodTotals?.mobile_money || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments Preview */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Recent Payment Transactions</CardTitle>
                <CardDescription className="text-xs">
                  Latest payments verified and recorded by the finance office.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-primary"
                onClick={() => setActiveTab("transactions")}
              >
                View all transactions <ChevronRight className="size-3" />
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="pl-6">Receipt No.</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount (SSP)</TableHead>
                    <TableHead className="text-right pr-6">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {!transactions || transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No payment transactions recorded yet. Click <strong>Record Payment</strong> above to log an entry.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.slice(0, 5).map((t) => (
                      <TableRow key={t._id} className="hover:bg-muted/40">
                        <TableCell className="pl-6 font-mono font-bold text-primary">
                          {t.receiptNumber}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{t.studentName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{t.studentRegNumber}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(t.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="capitalize">{t.method || "cash"}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                          {t.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-primary"
                            onClick={() => handleOpenReceiptFromRow(t)}
                          >
                            <Receipt className="size-3" /> Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: STUDENT LEDGERS & CLEARANCE DIRECTORY
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="ledgers" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">Student Financial Ledgers & Clearance</CardTitle>
                  <CardDescription className="text-xs">
                    Track individual student balances, payment progress, and examination eligibility.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search name or reg no..."
                      className="pl-8 h-9 text-xs"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <Select value={programFilter} onValueChange={setProgramFilter}>
                    <SelectTrigger className="h-9 w-40 text-xs">
                      <SelectValue placeholder="Program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Programs</SelectItem>
                      {programs?.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-36 text-xs">
                      <SelectValue placeholder="Clearance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="cleared">Cleared</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="pl-6">Reg No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">Billed (SSP)</TableHead>
                    <TableHead className="text-right">Paid (SSP)</TableHead>
                    <TableHead className="text-right">Outstanding (SSP)</TableHead>
                    <TableHead>Clearance</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {!studentLedgers ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Loading student ledgers...
                      </TableCell>
                    </TableRow>
                  ) : studentLedgers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No student billing ledgers found matching your filters.
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs"
                            onClick={() => setIsInvoiceOpen(true)}
                          >
                            <Zap className="size-3.5 text-amber-600" /> Run Semester Invoicing
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentLedgers.map((l) => (
                      <TableRow key={l._id} className="hover:bg-muted/40">
                        <TableCell className="pl-6 font-mono font-bold text-foreground">
                          {l.studentRegNumber}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">{l.studentName}</p>
                          <p className="text-[11px] text-muted-foreground">{l.studentEmail}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="font-medium text-foreground">{l.programCode}</span>
                          <span className="block text-[11px] truncate max-w-[140px]">{l.programName}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {l.totalDue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-emerald-600">
                          {l.totalPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-rose-600">
                          {l.balance.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              l.status === "cleared"
                                ? "text-emerald-600 border-emerald-300 bg-emerald-50 text-[10px] font-bold"
                                : l.status === "partial"
                                ? "text-amber-600 border-amber-300 bg-amber-50 text-[10px] font-bold"
                                : "text-rose-600 border-rose-300 bg-rose-50 text-[10px] font-bold"
                            }
                          >
                            {l.status?.toUpperCase() || "PENDING"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetStudentId(l.studentId);
                                  setIsStatementOpen(true);
                                }}
                                className="gap-2"
                              >
                                <FileSpreadsheet className="size-3.5 text-primary" /> View Statement
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetStudentId(l.studentId);
                                  setIsPaymentOpen(true);
                                }}
                                className="gap-2 text-emerald-600 font-medium"
                              >
                                <Banknote className="size-3.5" /> Record Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetStudentId(l.studentId);
                                  setIsWaiverOpen(true);
                                }}
                                className="gap-2 text-purple-600"
                              >
                                <Award className="size-3.5" /> Apply Waiver / Aid
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: FEE STRUCTURES MANAGEMENT
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="structures" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold">Academic Fee Schedules</CardTitle>
                <CardDescription className="text-xs">
                  Configure tuition, registration, and laboratory fees for each academic program and semester.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="gap-2 bg-primary"
                onClick={() => {
                  setEditingFeeStruct(null);
                  setIsFeeStructOpen(true);
                }}
              >
                <Plus className="size-4" /> Add Fee Schedule
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="pl-6">Program</TableHead>
                    <TableHead>Academic Period</TableHead>
                    <TableHead className="text-right">Tuition</TableHead>
                    <TableHead className="text-right">Registration</TableHead>
                    <TableHead className="text-right">Library & ICT</TableHead>
                    <TableHead className="text-right">Activity & Other</TableHead>
                    <TableHead className="text-right font-bold">Total Fees</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {!feeStructures || feeStructures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No fee structures defined for this period. Click <strong>Add Fee Schedule</strong> to configure one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    feeStructures.map((f) => (
                      <TableRow key={f._id} className="hover:bg-muted/40">
                        <TableCell className="pl-6">
                          <p className="font-bold text-foreground">{f.programName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {f.programCode} · {f.programLevel}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{f.periodName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {f.currency} {(f.tuitionFee || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(f.registrationFee || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {((f.libraryFee || 0) + (f.ictFee || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {((f.activityFee || 0) + (f.otherFees || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {f.currency} {f.totalFee.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingFeeStruct(f);
                                setIsFeeStructOpen(true);
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-rose-500 hover:text-rose-700"
                              onClick={() => handleDeleteFeeStructure(f._id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: TRANSACTION & AUDIT LEDGER
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold">Transaction Ledger & Audit Trail</CardTitle>
                <CardDescription className="text-xs">
                  Chronological record of all fee receipts, direct bank deposits, mobile money payments, and waivers.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => window.print()}
              >
                <Printer className="size-4" /> Print Ledger
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40 text-xs">
                  <TableRow>
                    <TableHead className="pl-6">Receipt Number</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method & Reference</TableHead>
                    <TableHead className="text-right">Amount (SSP)</TableHead>
                    <TableHead className="text-right pr-6">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {!transactions || transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No transactions found for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t._id} className="hover:bg-muted/40">
                        <TableCell className="pl-6 font-mono font-bold text-primary">
                          {t.receiptNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{t.studentName}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{t.studentRegNumber}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.programName}</TableCell>
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
                        <TableCell>
                          <span className="font-medium capitalize">{t.method}</span>
                          <span className="block text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
                            {t.reference}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                          {t.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-primary hover:text-primary"
                            onClick={() => handleOpenReceiptFromRow(t)}
                          >
                            <Receipt className="size-3" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─────────────────────────────────────────────────────────────
          MODALS & DIALOGS
      ───────────────────────────────────────────────────────────── */}
      {/* 1. Payment Recording Dialog */}
      <PaymentFormDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        preselectedStudentId={targetStudentId}
        onPaymentSuccess={(receipt) => {
          setActiveReceipt(receipt);
          setIsReceiptOpen(true);
        }}
      />

      {/* 2. Official ECU Receipt Preview & Print Modal */}
      <ReceiptPreviewModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        receipt={activeReceipt}
      />

      {/* 3. Comprehensive Student Financial Statement Modal */}
      <StudentStatementModal
        open={isStatementOpen}
        onOpenChange={setIsStatementOpen}
        studentId={targetStudentId}
        onOpenPaymentForStudent={(id) => {
          setTargetStudentId(id);
          setIsPaymentOpen(true);
        }}
        onViewReceipt={(receipt) => {
          setActiveReceipt(receipt);
          setIsReceiptOpen(true);
        }}
      />

      {/* 4. Fee Waiver & Scholarship Dialog */}
      <FeeWaiverDialog
        open={isWaiverOpen}
        onOpenChange={setIsWaiverOpen}
        preselectedStudentId={targetStudentId}
      />

      {/* 5. Fee Structure Definition Dialog */}
      <FeeStructureDialog
        open={isFeeStructOpen}
        onOpenChange={setIsFeeStructOpen}
        editingStructure={editingFeeStruct}
      />

      {/* 6. Bulk Semester Invoice Generator */}
      <InvoiceGeneratorDialog
        open={isInvoiceOpen}
        onOpenChange={setIsInvoiceOpen}
      />
    </div>
  );
};
