"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { 
  Search, Filter, List, Clock, User, Shield, 
  Activity, ArrowRight, Download, Calendar
} from "lucide-react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { 
  Table, TableHead, TableHeader, TableRow, TableCell, TableBody 
} from "@workspace/ui/components/table";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

export const AuditLogsView = () => {
  const [search, setSearch] = useState("");
  const logs = useQuery(api.system.getAuditLogs, { limit: 100 });

  const filtered = (logs || []).filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.userName.toLowerCase().includes(search.toLowerCase()) ||
    l.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    l.resource.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full anim-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">System Audit Logs</h1>
          </div>
          <p className="text-sm text-muted-foreground">Monitor administrative actions and system-wide changes for transparency.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Activity Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Actions", val: logs?.length || 0, sub: "Last 100 items", icon: Activity, color: "text-blue-500" },
          { label: "Admin Actions", val: (logs || []).filter(l => l.action.includes("CREATE") || l.action.includes("DELETE")).length, sub: "High impact changes", icon: Shield, color: "text-rose-500" },
          { label: "Active Admins", val: new Set((logs || []).map(l => l.userId)).size, sub: "In this period", icon: User, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight">{s.val}</p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-medium">{s.sub}</p>
                </div>
                <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50">
                  <s.icon className={`size-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Logs Table ── */}
      <Card className="shadow-lg border-muted/20 overflow-hidden">
        <CardHeader className="bg-muted/5 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <List className="size-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search actions, admins or resources..." 
                  className="pl-9 h-10 shadow-sm" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <Filter className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20 hover:bg-muted/20 font-medium text-xs">
              <TableRow className="hover:bg-transparent border-b-muted/20">
                <TableHead className="pl-6 py-4">Admin</TableHead>
                <TableHead className="py-4">Action</TableHead>
                <TableHead className="py-4">Resource</TableHead>
                <TableHead className="py-4">Details</TableHead>
                <TableHead className="py-4 font-right pr-6">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs === undefined ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-medium">Crunching logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                        <Search className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No system logs found matching your criteria.</p>
                      <Button variant="ghost" size="sm" onClick={() => setSearch("")}>Clear Search</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log._id} className="group hover:bg-muted/30 transition-colors border-b-muted/20">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/20">
                          {log.userName.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="font-semibold text-sm leading-none">{log.userName}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{log.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] font-bold tracking-wider px-2 py-0.5",
                          log.action.includes("DELETE") ? "bg-rose-500/10 text-rose-600 border-rose-200" :
                          log.action.includes("CREATE") ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                          "bg-blue-500/10 text-blue-600 border-blue-200"
                        )}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 capitalize font-medium text-xs text-muted-foreground">
                      {log.resource}
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="text-xs font-medium max-w-[300px] line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                        {log.details}
                      </p>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Clock className="size-3" />
                          {format(log.timestamp, "HH:mm:ss")}
                        </div>
                        <p className="text-[10px] text-muted-foreground/50">{format(log.timestamp, "MMM dd, yyyy")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
