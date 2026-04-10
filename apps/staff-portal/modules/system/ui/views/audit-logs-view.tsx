"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { 
  Search, Filter, List, Clock, User, Shield, 
  Activity, ArrowRight, Download, Calendar,
  Eye, Info, Globe, Monitor, Laptop, Smartphone,
  Copy, Check, MapPin, X, SlidersHorizontal, Calendar as CalendarIcon,
  Trash2, RefreshCcw, ChevronLeft, ChevronRight
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@workspace/ui/components/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup
} from "@workspace/ui/components/select";
import { Calendar as CalendarComponent } from "@workspace/ui/components/calendar";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Local accessible field components for the pagination design.
 */
const Field = ({ children, className, orientation }: { children: React.ReactNode; className?: string; orientation?: "horizontal" | "vertical" }) => (
  <div className={cn("flex items-center gap-3", orientation === "vertical" && "flex-col items-start", className)}>{children}</div>
);

const FieldLabel = ({ children, htmlFor, className }: { children: React.ReactNode; htmlFor: string; className?: string }) => (
  <label htmlFor={htmlFor} className={cn("text-xs font-semibold text-muted-foreground whitespace-nowrap", className)}>
    {children}
  </label>
);

// ── Helpers ──
function parseUA(ua?: string) {
  if (!ua) return null;
  
  // Browser Detection
  let browser = "Web Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  // OS Detection
  let os = "Desktop OS";
  if (ua.includes("Windows NT 10.0")) {
    os = "Windows 10/11"; 
  }
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os };
}

export const AuditLogsView = () => {
  const [search, setSearch] = useState("");
  const [viewTarget, setViewTarget] = useState<any | null>(null);
  
  // ── Advanced Filter States ──
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>("all");
  const [locationSearch, setLocationSearch] = useState("");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // ── Pagination & State ──
  const [limit, setLimit] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // ── Discrete Paging Query ──
  const results = useQuery(
    api.system.getAuditLogs,
    {
      search: search || undefined,
      actions: selectedActions.length > 0 ? selectedActions : undefined,
      resource: selectedResource !== "all" ? selectedResource : undefined,
      location: locationSearch || undefined,
      startDate: dateRange.from?.getTime(),
      endDate: dateRange.to ? new Date(dateRange.to.getTime() + 86400000).getTime() : undefined,
      paginationOpts: { cursor, numItems: limit },
      pageSize: limit,
    }
  );
  
  // ── Global Aggregation Stats ──
  const stats = useQuery(
    api.system.getAuditStats,
    {
      search: search || undefined,
      actions: selectedActions.length > 0 ? selectedActions : undefined,
      resource: selectedResource !== "all" ? selectedResource : undefined,
      location: locationSearch || undefined,
      startDate: dateRange.from?.getTime(),
      endDate: dateRange.to ? new Date(dateRange.to.getTime() + 86400000).getTime() : undefined,
    }
  );

  const handleNextPage = () => {
    if (results?.continueCursor && !results.isDone) {
      setHistory(prev => [...prev, cursor === null ? "START" : cursor]);
      setCursor(results.continueCursor);
    }
  };

  const handlePrevPage = () => {
    if (history.length > 0) {
      const prev = [...history];
      const lastCursor = prev.pop();
      setHistory(prev);
      setCursor(lastCursor === "START" ? null : lastCursor || null);
    }
  };

  const resetPaging = () => {
    setCursor(null);
    setHistory([]);
  };

  // Reset pagination when search or filters change
  useEffect(() => {
    resetPaging();
  }, [search, selectedActions, selectedResource, locationSearch, dateRange.from, dateRange.to]);

  // ── Options ──
  const ACTION_OPTIONS = [
    "SIGN_IN", "SIGN_OUT", "SIGN_UP", 
    "CREATE_STAFF", "UPDATE_STAFF", "DELETE_STAFF", 
    "BAN_STAFF", "UNBAN_STAFF"
  ];
  const RESOURCE_OPTIONS = ["auth", "staff", "system", "academic"];
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];

  const filtered = results?.page || [];

  const exportCSV = () => {
    const headers = ["Admin", "Email", "Staff ID", "Action", "Resource", "Details", "Location", "IP Address", "Timestamp"];
    const rows = filtered.map(l => [
      l.userName,
      l.userEmail,
      l.staffId || "SYSTEM",
      l.action,
      l.resource,
      `"${l.details.replace(/"/g, '""')}"`,
      l.location || "N/A",
      l.ipAddress || "N/A",
      format(l.createdAt || l._creationTime, "yyyy-MM-dd HH:mm:ss")
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `ECU_Audit_Logs_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearch("");
    setDateRange({ from: undefined, to: undefined });
    setSelectedActions([]);
    setSelectedResource("all");
    setLocationSearch("");
    resetPaging();
  };

  const isFiltering = !!search || !!dateRange.from || selectedActions.length > 0 || selectedResource !== "all" || !!locationSearch;

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full anim-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">System Audit Logs</h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-tighter">Real-time Database Audit Trail</p>
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={!filtered.length}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Activity Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { 
            label: "Total Matched", 
            val: stats?.totalMatched ?? 0, 
            sub: "Exhaustive history match", 
            icon: Activity, 
            color: "text-blue-500" 
          },
          { 
            label: "Total Impact", 
            val: stats?.adminActions ?? 0, 
            sub: "Critical changes discovered", 
            icon: Shield, 
            color: "text-rose-500" 
          },
          { 
            label: "Global Admins", 
            val: stats?.activeAdmins ?? 0, 
            sub: "Unique contributors found", 
            icon: User, 
            color: "text-emerald-500" 
          },
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
              {/* ── Basic Search ── */}
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name, ID or details..." 
                  className="pl-9 h-10 shadow-sm" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>

              {/* ── Advanced Filters Side Sheet ── */}
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <Button 
                   variant={isFiltering ? "default" : "outline"} 
                   size="icon" 
                   className="h-10 w-10 shrink-0 shadow-sm"
                   onClick={() => setIsFilterSheetOpen(true)}
                >
                  <SlidersHorizontal className="size-4" />
                </Button>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                  <SheetHeader className="pb-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                          <Filter className="size-5" />
                      </div>
                      <div>
                        <SheetTitle className="text-xl">Advanced Filters</SheetTitle>
                        <SheetDescription className="font-mono text-[10px] uppercase tracking-wider">
                          Define target criteria for audit resolution
                        </SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="space-y-8 py-8">
                    {/* Date Range */}
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                         <Calendar className="size-3.5" /> Date Range
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground/50 ml-1">From</span>
                              <Input 
                                  type="date" 
                                  className="h-10 text-sm shadow-sm" 
                                  value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                                  onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : undefined }))}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground/50 ml-1">To</span>
                              <Input 
                                  type="date" 
                                  className="h-10 text-sm shadow-sm" 
                                  value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                                  onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : undefined }))}
                              />
                          </div>
                      </div>
                    </div>

                    <Separator className="bg-muted/50" />

                    {/* Resource Category */}
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <List className="size-3.5" /> System Resource
                      </Label>
                      <Select value={selectedResource} onValueChange={setSelectedResource}>
                          <SelectTrigger className="h-11 text-sm bg-muted/20">
                              <SelectValue placeholder="All academic & system resources" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Every Resource</SelectItem>
                              {RESOURCE_OPTIONS.map(r => (
                                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    </div>

                    <Separator className="bg-muted/50" />

                    {/* Actions (Checkbox List) */}
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Shield className="size-3.5" /> Action Types
                      </Label>
                      <div className="grid grid-cols-1 gap-1.5 p-3 border rounded-xl bg-muted/10">
                          {ACTION_OPTIONS.map(action => (
                              <div key={action} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-background/50 transition-colors cursor-pointer group">
                                  <Checkbox 
                                      id={`sheet-${action}`} 
                                      checked={selectedActions.includes(action)}
                                      onCheckedChange={(checked) => {
                                          setSelectedActions(prev => checked ? [...prev, action] : prev.filter(a => a !== action));
                                      }}
                                      className="border-muted-foreground/30"
                                  />
                                  <label htmlFor={`sheet-${action}`} className="text-xs font-bold leading-none cursor-pointer group-hover:text-primary transition-colors flex-1">
                                      {action.replace("_", " ")}
                                  </label>
                              </div>
                          ))}
                      </div>
                    </div>

                    <Separator className="bg-muted/50" />

                    {/* Geographic */}
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                         <Globe className="size-3.5" /> Geographic & Network
                      </Label>
                      <div className="relative">
                          <MapPin className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                          <Input 
                              placeholder="City, Country or IP address..." 
                              className="pl-10 h-11 text-sm shadow-sm bg-muted/20 border-transparent focus:border-primary"
                              value={locationSearch}
                              onChange={e => setLocationSearch(e.target.value)}
                          />
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-8 border-t flex flex-col gap-3">
                    <Button className="w-full h-12 gap-2 shadow-lg shadow-primary/20" onClick={() => setIsFilterSheetOpen(false)}>
                       <Check className="size-4" /> Apply Filter Logic
                    </Button>
                    <Button variant="ghost" className="w-full h-10 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold" onClick={() => {
                        clearFilters();
                        setIsFilterSheetOpen(false);
                    }}>
                      <RefreshCcw className="size-3.5 mr-2" /> Reset All Criteria
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* ── Active Filter Bar ── */}
          {isFiltering && (
            <div className="px-6 py-3 border-t bg-muted/5 flex flex-wrap items-center gap-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">ACTIVE FILTERS:</span>
               
               {dateRange.from && (
                <Badge variant="secondary" className="gap-1.5 h-6 text-[10px]">
                    <CalendarIcon className="size-3" />
                    {format(dateRange.from, "MMM d")} - {dateRange.to ? format(dateRange.to, "MMM d") : "Today"}
                    <X className="size-3 cursor-pointer hover:text-rose-500" onClick={() => setDateRange({ from: undefined, to: undefined })} />
                </Badge>
               )}

               {selectedResource !== "all" && (
                <Badge variant="secondary" className="gap-1.5 h-6 text-[10px] capitalize">
                    <List className="size-3" />
                    {selectedResource}
                    <X className="size-3 cursor-pointer hover:text-rose-500" onClick={() => setSelectedResource("all")} />
                </Badge>
               )}

               {selectedActions.map(action => (
                <Badge key={action} variant="secondary" className="gap-1.5 h-6 text-[10px]">
                    <Activity className="size-3" />
                    {action}
                    <X className="size-3 cursor-pointer hover:text-rose-500" onClick={() => setSelectedActions(prev => prev.filter(a => a !== action))} />
                </Badge>
               ))}

               {locationSearch && (
                <Badge variant="secondary" className="gap-1.5 h-6 text-[10px]">
                    <MapPin className="size-3" />
                    {locationSearch}
                    <X className="size-3 cursor-pointer hover:text-rose-500" onClick={() => setLocationSearch("")} />
                </Badge>
               )}

               <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                 Clear All
               </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20 hover:bg-muted/20 font-medium text-xs">
              <TableRow className="hover:bg-transparent border-b-muted/20">
                <TableHead className="pl-6 py-4">Admin</TableHead>
                <TableHead className="py-4">Action</TableHead>
                <TableHead className="py-4">Resource</TableHead>
                <TableHead className="py-4">Details</TableHead>
                <TableHead className="py-4">Timestamp</TableHead>
                <TableHead className="py-4 text-right pr-6 w-12">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground font-medium text-sm">
                      <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                      Fetching records...
                    </div>
                  </TableCell>
                </TableRow>
              ) : results.page.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground h-full">
                       <Shield className="size-12 opacity-10" />
                       <div className="space-y-1">
                         <p className="font-bold">No logs discovered</p>
                         <p className="text-xs max-w-[200px] mx-auto">Try adjusting your filters or search criteria.</p>
                       </div>
                       <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary hover:text-primary/80">
                         Reset Search
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                results.page.map((log: any) => (
                  <TableRow key={log._id} className="group hover:bg-muted/30 transition-colors border-b-muted/10">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs border border-primary/10">
                          {log.userName?.charAt(0) || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{log.userName || "Unknown Admin"}</p>
                          <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground/60">
                            <span className="uppercase tracking-tighter border-r pr-1.5 text-primary text-[8px] font-black">{log.staffId || "SYSTEM"}</span>
                            <span className="truncate">{log.userEmail}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={cn(
                        "font-mono text-[10px] tracking-tight py-0.5 border-muted-foreground/10",
                        log.action.includes("CREATE") && "bg-emerald-500/5 text-emerald-600 border-emerald-500/10",
                        log.action.includes("DELETE") && "bg-rose-500/5 text-rose-600 border-rose-500/10",
                        log.action.includes("SIGN") && "bg-blue-500/5 text-blue-600 border-blue-500/10"
                      )}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{log.resource}</p>
                    </TableCell>
                    <TableCell className="py-4 max-w-[300px]">
                      <p className="text-sm text-foreground/80 line-clamp-1 cursor-default" title={log.details}>
                        {log.details}
                      </p>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                          <Clock className="size-3" />
                          {format(log.createdAt || log._creationTime, "HH:mm:ss")}
                        </div>
                        <p className="text-[10px] text-muted-foreground/50">{format(log.createdAt || log._creationTime, "MMM dd, yyyy")}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <Button variant="ghost" size="icon" className="size-8 hover:bg-primary/5 hover:text-primary text-muted-foreground" onClick={() => setViewTarget(log)}>
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* ── Discrete Shadcn Pagination Footer ── */}
          <div className="px-6 py-4 bg-muted/5 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <Field orientation="horizontal" className="w-fit">
              <FieldLabel htmlFor="select-rows-per-page">Rows per page</FieldLabel>
              <Select 
                value={limit.toString()} 
                onValueChange={(v) => {
                  setLimit(parseInt(v));
                  resetPaging();
                }}
              >
                <SelectTrigger className="h-8 w-20 text-xs font-bold" id="select-rows-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {PAGE_SIZE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt.toString()} className="text-xs font-medium">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">
                  Page {history.length + 1}
                </span>
                {results?.continueCursor && !results.isDone && (
                  <span className="size-1 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handlePrevPage();
                      }}
                      className={cn(
                        "h-8 text-xs font-bold",
                        history.length === 0 && "opacity-30 cursor-not-allowed pointer-events-none"
                      )}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleNextPage();
                      }}
                      className={cn(
                        "h-8 text-xs font-bold",
                        (!results || results.isDone || !results.continueCursor) && "opacity-30 cursor-not-allowed pointer-events-none"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* ── View Detail Sheet ── */}
      <Sheet open={!!viewTarget} onOpenChange={(open: boolean) => !open && setViewTarget(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-12 rounded-xl flex items-center justify-center border",
                viewTarget?.action?.includes("DELETE") ? "bg-rose-500/10 text-rose-600 border-rose-200" :
                viewTarget?.action?.includes("CREATE") ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                "bg-blue-500/10 text-blue-600 border-blue-200"
              )}>
                <Shield className="size-6" />
              </div>
              <div>
                <SheetTitle className="text-xl">Audit Event Details</SheetTitle>
                <SheetDescription className="font-mono text-[10px] uppercase tracking-wider">
                  Event ID: {viewTarget?._id}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-8 py-4">
            {/* ── Event Summary ── */}
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Action Taken</p>
                 <Badge variant="secondary" className="font-mono text-xs">{viewTarget?.action}</Badge>
               </div>
               <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Resource</p>
                 <p className="text-sm font-semibold capitalize">{viewTarget?.resource}</p>
               </div>
            </div>

            {/* ── Actor Details ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="size-3" /> Initiating Administrator
              </h4>
              <Card className="shadow-none bg-muted/20 border-border/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="size-12 rounded-full bg-background flex items-center justify-center text-primary font-black text-lg border border-primary/10">
                    {viewTarget?.userName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{viewTarget?.userName}</p>
                    <p className="text-xs text-muted-foreground">{viewTarget?.userEmail}</p>
                    <div className="flex items-center gap-2 mt-1.5 font-mono">
                       <p className="text-[10px] text-muted-foreground/50 border px-1.5 py-0.5 rounded bg-muted/50 uppercase tracking-tighter">Staff ID: {viewTarget?.staffId || "SYSTEM"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Precise Timing ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="size-3" /> Precise Execution Time
              </h4>
              <div className="flex gap-4">
                 <div className="flex-1 p-3 rounded-lg border border-muted items-center flex gap-3">
                   <Calendar className="size-4 text-muted-foreground" />
                   <div>
                     <p className="text-[10px] text-muted-foreground uppercase font-bold">Date</p>
                     <p className="text-sm font-medium">{viewTarget && format(viewTarget.createdAt || viewTarget._creationTime, "PPPP")}</p>
                   </div>
                 </div>
                 <div className="flex-1 p-3 rounded-lg border border-muted items-center flex gap-3">
                   <Clock className="size-4 text-muted-foreground" />
                   <div>
                     <p className="text-[10px] text-muted-foreground uppercase font-bold">Clock Time</p>
                     <p className="text-sm font-medium">{viewTarget && format(viewTarget.createdAt || viewTarget._creationTime, "HH:mm:ss.SSS")}</p>
                   </div>
                 </div>
              </div>
            </div>

            {/* ── Security & Device ── */}
            {(viewTarget?.ipAddress || viewTarget?.userAgent || viewTarget?.location) && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Globe className="size-3" /> Security & Device DNA
                </h4>
                <div className="grid grid-cols-1 gap-3">
                   {viewTarget?.location && (
                     <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                       <MapPin className="size-4 text-emerald-600/60" />
                       <div className="flex-1">
                         <p className="text-[10px] text-muted-foreground uppercase font-bold text-emerald-600/60">Identified Location</p>
                         <p className="text-sm font-semibold">
                            {viewTarget.location === "Local Environment" ? "Local / Internal Network" : viewTarget.location}
                         </p>
                         {viewTarget.location === "Unknown" && (
                            <p className="text-[9px] text-muted-foreground/60 italic">Location tracking requires a non-local IP address</p>
                         )}
                       </div>
                     </div>
                   )}

                   {viewTarget?.ipAddress && (
                     <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/10 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <Globe className="size-4 text-secondary-foreground/60" />
                         <div>
                           <p className="text-[10px] text-muted-foreground uppercase font-bold">Network Point (IP)</p>
                           <p className="text-xs font-mono font-medium">{viewTarget.ipAddress}</p>
                         </div>
                       </div>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="size-8"
                         onClick={() => {
                           if (viewTarget?.ipAddress) navigator.clipboard.writeText(viewTarget.ipAddress);
                         }}
                       >
                         <Copy className="size-3" />
                       </Button>
                     </div>
                   )}

                   {viewTarget?.userAgent && (
                     <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center gap-4">
                       <Monitor className="size-5 text-secondary-foreground/60 shrink-0" />
                       <div className="flex-1 min-w-0">
                         <p className="text-[10px] text-muted-foreground uppercase font-bold">Device & Browser Registry</p>
                         
                         {/* Human Readable Summary */}
                         <div className="flex items-center gap-2 mt-1.5 mb-3">
                            {(() => {
                                const parsed = parseUA(viewTarget.userAgent);
                                return parsed ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
                                        <span className="text-xs font-bold leading-none">{parsed.os}</span>
                                        <span className="size-1 rounded-full bg-primary/30" />
                                        <span className="text-xs font-bold leading-none">{parsed.browser}</span>
                                    </div>
                                ) : (
                                    <Badge variant="outline">Unidentified Device</Badge>
                                );
                            })()}
                         </div>

                         {/* Full String */}
                         <div className="space-y-1 opacity-60">
                            <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Technical Signature</p>
                            <p className="text-[10px] font-medium leading-relaxed break-all select-all font-mono italic">
                                {viewTarget.userAgent}
                            </p>
                         </div>
                       </div>
                     </div>
                   )}
                </div>
              </div>
            )}

            {/* ── Description ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Info className="size-3" /> Event Payload & Details
              </h4>
              <div className="p-4 rounded-xl bg-muted/40 border border-muted text-sm leading-relaxed whitespace-pre-wrap font-medium h-fit max-h-[250px] overflow-y-auto custom-scrollbar">
                {viewTarget?.details}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end gap-3 pt-4">
               <Button variant="outline" onClick={() => setViewTarget(null)}>Close Inspector</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
