"use client";

import { useState } from "react";
import {
  Users, UserPlus, Filter, Search, MoreHorizontal, FileText, CheckCircle2,
  XCircle, Clock, AlertCircle, UploadCloud, ChevronRight, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@workspace/ui/components/table";

/**
 * Admissions Pipeline View
 * Currently uses mocked state. Needs backend schema:
 * `applicants` (name, email, phone, appliedProgramId, status, docsUrl)
 */

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { ApplicantForm } from "../components/applicant-form";

export const AdmissionsView = () => {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const applicants = useQuery(api.admissions.getApplicants, {});

  const filtered = (applicants || []).filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Header (Always Visible) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admissions Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Review applicants, manage documents, and process enrollments.</p>
        </div>
        <div className="flex items-center gap-2">
          {!isFormOpen && (
            <>
              <Button variant="outline" className="gap-2"><Download className="size-4" /> Export</Button>
              <Button className="gap-2" onClick={() => setIsFormOpen(true)}><UserPlus className="size-4" /> Manual Entry</Button>
            </>
          )}
        </div>
      </div>

      {isFormOpen ? (
        <ApplicantForm onBack={() => setIsFormOpen(false)} />
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
                    Click "Manual Entry" above to add an applicant and test the live Convex mutation logic.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "New Applications", val: (applicants || []).filter(a => a.status === 'new').length, sub: "Pending review", icon: Users, color: "text-blue-500" },
              { label: "In Review", val: (applicants || []).filter(a => a.status === 'reviewing').length, sub: "Checking documents", icon: FileText, color: "text-amber-500" },
              { label: "Accepted", val: (applicants || []).filter(a => a.status === 'accepted').length, sub: "Pending enrollment", icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Rejected", val: (applicants || []).filter(a => a.status === 'rejected').length, sub: "Did not meet reqs", icon: XCircle, color: "text-rose-500" },
            ].map(s => (
              <Card key={s.label} className="border shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold">{s.val}</p>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
                    </div>
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                      <s.icon className={`size-4 ${s.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Pipeline View: List ── */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-base font-semibold">Applicant List</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search applicants..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                    <TableHead className="pl-6 w-24">ID</TableHead>
                    <TableHead>Applicant Details</TableHead>
                    <TableHead>Program ID</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicants === undefined ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No applicants found.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(app => (
                    <TableRow key={app._id} className="group">
                      <TableCell className="pl-6 font-mono text-xs">{app._id.split('').slice(0, 8).join('')}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{app.name}</p>
                        <p className="text-xs text-muted-foreground">{app.email}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{app.programId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(app.applicationDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          app.status === "new" ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                          app.status === "reviewing" ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                          app.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                          app.status === "enrolled" ? "bg-purple-500/10 text-purple-600 border-purple-200" :
                          "bg-rose-500/10 text-rose-600 border-rose-200"
                        }>
                          {app.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" className="h-8 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Review <ChevronRight className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
