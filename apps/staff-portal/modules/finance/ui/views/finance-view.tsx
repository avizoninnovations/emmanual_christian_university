"use client";

import { useState } from "react";
import {
  Banknote, Search, Filter, AlertCircle, TrendingUp, Building, 
  CreditCard, UserCheck, Receipt, Download, Plus, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@workspace/ui/components/table";

/**
 * Finance View
 * Uses mocked data pending schema updates for `feeStructures` and `studentLedger`.
 */
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { PaymentForm } from "../components/payment-form";

export const FinanceView = () => {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const ledgers = useQuery(api.finance.getAllLedgers, {});

  const filtered = (ledgers || []).filter(l => 
    l.studentId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage fee structures, student ledgers, and payments.</p>
        </div>
        <div className="flex items-center gap-2">
          {!isFormOpen && (
            <>
              <Button variant="outline" className="gap-2"><Plus className="size-4" /> New Fee Structure</Button>
              <Button className="gap-2" onClick={() => setIsFormOpen(true)}><Receipt className="size-4" /> Record Payment</Button>
            </>
          )}
        </div>
      </div>

      {isFormOpen ? (
        <PaymentForm onBack={() => setIsFormOpen(false)} />
      ) : (
        <>
          {/* ── Warning Notice for Backend ── */}
          <Card className="border border-amber-200 bg-amber-500/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex gap-3">
                <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Backend hooked up!</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Record Payment" to add financial records into the live database.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue (Sem)", val: "UGX 0", sub: "Expected this semester", icon: Banknote, color: "text-emerald-500" },
              { label: "Collected", val: "UGX 0", sub: "71% of expected", icon: TrendingUp, color: "text-blue-500" },
              { label: "Outstanding", val: "UGX 0", sub: "Pending from students", icon: CreditCard, color: "text-rose-500" },
              { label: "Cleared Students", val: 0, sub: "Ready for exams", icon: UserCheck, color: "text-indigo-500" },
            ].map(s => (
               <Card key={s.label} className="border shadow-sm">
                 <CardContent className="pt-5 pb-4">
                   <div className="flex items-start justify-between">
                     <div>
                       <p className="text-2xl font-bold">{s.val}</p>
                       <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
                     </div>
                     <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                       <s.icon className={`size-4 ${s.color}`} />
                     </div>
                   </div>
                 </CardContent>
               </Card>
            ))}
          </div>

          {/* ── Table ── */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <CardTitle className="text-base font-semibold">Student Ledgers (Current Semester)</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search student or ID..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Download className="size-4" /> Export Ledger
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6 w-28">Reg No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-right">Amount Due (UGX)</TableHead>
                    <TableHead className="text-right">Amount Paid (UGX)</TableHead>
                    <TableHead className="text-right">Balance (UGX)</TableHead>
                    <TableHead>Clearance</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers === undefined ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No ledgers found.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(l => {
                      const status = l.totalDue === l.totalPaid ? "cleared" : (l.totalPaid > 0 ? "partial" : "pending");
                      return (
                    <TableRow key={l._id} className="group cursor-pointer hover:bg-muted/50">
                      <TableCell className="pl-6 font-mono text-xs font-medium">{l._id.split('').slice(0, 8).join('')}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">Student Record</p>
                        <p className="text-[10px] text-muted-foreground">{l.studentId}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{l.totalDue.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">{l.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium text-rose-600">{(l.totalDue - l.totalPaid).toLocaleString()}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className={
                          status === "cleared" ? "text-emerald-600 border-emerald-200 bg-emerald-50" :
                          status === "partial" ? "text-amber-600 border-amber-200 bg-amber-50" :
                          "text-rose-600 border-rose-200 bg-rose-50"
                        }>
                          {status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" className="h-8 gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                          Details <ChevronRight className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
