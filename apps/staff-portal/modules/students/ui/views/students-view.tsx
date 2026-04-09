"use client";

import { useState } from "react";
import {
  GraduationCap, Search, Filter, MoreHorizontal, User, Mail, Phone,
  CreditCard, BookOpen, AlertCircle, ArrowRight, CheckCircle2, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@workspace/ui/components/table";

/**
 * Students View
 * Uses mocked data pending schema updates for `students`.
 */

const MOCK_STUDENTS = [
  { id: "STU-26-001", name: "John Bosco", email: "jbosco@ecu-ssd.org", program: "BSc Information Tech", year: 1, status: "active", finance: "cleared" },
  { id: "STU-25-042", name: "Mary Achieng", email: "machieng@ecu-ssd.org", program: "Bachelor of Business Admin", year: 2, status: "active", finance: "pending" },
  { id: "STU-24-118", name: "Simon Peter", email: "speter@ecu-ssd.org", program: "Diploma in Theology", year: 3, status: "graduating", finance: "cleared" },
  { id: "STU-26-089", name: "Lucy Kiden", email: "lkiden@ecu-ssd.org", program: "BSc Computer Science", year: 1, status: "leave", finance: "cleared" },
];

export const StudentsView = () => {
  const [search, setSearch] = useState("");

  const filtered = MOCK_STUDENTS.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage enrolled students, academic records, and profiles.</p>
        </div>
      </div>

      {/* ── Warning Notice for Backend ── */}
      <Card className="border border-amber-200 bg-amber-500/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Backend schema required</p>
              <p className="text-sm text-muted-foreground">
                Currently using mock data. Implement the <code className="text-xs bg-muted px-1 py-0.5 rounded">students</code> schema 
                to link admissions into actual enrolled student records with academic progression and finance ledgers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Students", val: 842, sub: "All time", icon: User, color: "text-blue-500" },
          { label: "Currently Active", val: 760, sub: "Enrolled this semester", icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Financially Cleared", val: 610, sub: "Ready for exams", icon: CreditCard, color: "text-indigo-500" },
          { label: "Graduating Class", val: 145, sub: "Final year students", icon: GraduationCap, color: "text-purple-500" },
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
            <div className="flex items-center gap-4">
               <CardTitle className="text-base font-semibold">Enrolled Students</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search students by name or ID..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="size-4" /> Filter
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
                <TableHead>Program</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Finance</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(stu => (
                <TableRow key={stu.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="pl-6 font-mono text-xs font-medium">{stu.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {stu.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{stu.name}</p>
                        <p className="text-[10px] text-muted-foreground">{stu.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{stu.program}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">Yr {stu.year}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      stu.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                      stu.status === "graduating" ? "bg-purple-500/10 text-purple-600 border-purple-200" :
                      "bg-amber-500/10 text-amber-600 border-amber-200"
                    }>
                      {stu.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className={
                      stu.finance === "cleared" ? "text-emerald-600 border-emerald-200" :
                      "text-rose-600 border-rose-200 bg-rose-50"
                    }>
                      {stu.finance === "cleared" ? "Cleared" : "Balance Due"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                      Profile <ChevronRight className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
