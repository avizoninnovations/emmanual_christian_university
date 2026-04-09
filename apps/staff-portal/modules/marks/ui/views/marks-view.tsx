"use client";

import { useState } from "react";
import {
  FileText, Search, Filter, AlertCircle, CheckCircle2, Clock, 
  XOctagon, ChevronRight, BookOpen, UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@workspace/ui/components/table";

/**
 * Marks & Assessments View
 * Uses mocked data pending schema updates for university grading blocks.
 */

const MOCK_SUBMISSIONS = [
  { id: "SUB-882", course: "Data Structures", code: "CSC211", lecturer: "Dr. Lule", status: "pending", date: "2026-04-09", type: "Midterm" },
  { id: "SUB-881", course: "Old Testament Survey", code: "THE101", lecturer: "Rev. Okeny", status: "approved", date: "2026-04-08", type: "Final" },
  { id: "SUB-880", course: "Accounting Principles", code: "ACC102", lecturer: "Ms. Nakato", status: "pending", date: "2026-04-08", type: "Coursework 1" },
  { id: "SUB-879", course: "Software Engineering", code: "CSC312", lecturer: "Dr. Kizza", status: "rejected", date: "2026-04-07", type: "Final" },
];

export const MarksView = () => {
  const [search, setSearch] = useState("");

  const filtered = MOCK_SUBMISSIONS.filter(s => 
    s.course.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marks & Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve grade submissions from lecturers.</p>
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
                Currently using mock data. Implement the University-level <code className="text-xs bg-muted px-1 py-0.5 rounded">gradingScales</code> and 
                update <code className="text-xs bg-muted px-1 py-0.5 rounded">assessmentBlocks</code> schema to make this functional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", val: 12, sub: "Requires HOD approval", icon: Clock, color: "text-amber-500" },
          { label: "Approved", val: 45, sub: "Published to students", icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Rejected", val: 3, sub: "Returned to lecturer", icon: XOctagon, color: "text-rose-500" },
          { label: "Total Courses", val: 86, sub: "Active this semester", icon: BookOpen, color: "text-blue-500" },
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
             <CardTitle className="text-base font-semibold">HOD Review Queue</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search course or code..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                <TableHead className="pl-6 w-28">Ref</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Assessment Type</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(sub => (
                <TableRow key={sub.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{sub.id}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{sub.course}</p>
                    <p className="text-xs text-muted-foreground font-mono">{sub.code}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.type}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <UserCheck className="size-3.5 text-muted-foreground" />
                      {sub.lecturer}
                      <span className="text-[10px] text-muted-foreground">({sub.date})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      sub.status === "approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                      sub.status === "rejected" ? "bg-rose-500/10 text-rose-600 border-rose-200" :
                      "bg-amber-500/10 text-amber-600 border-amber-200"
                    }>
                      {sub.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                      Review <ChevronRight className="size-3" />
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
