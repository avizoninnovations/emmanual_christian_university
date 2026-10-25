"use client";

import { useMemo, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Eye, Search } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
import { AcademicActivityDetails } from "./academic-activity-details";

type Activity = FunctionReturnType<typeof api.hod.activity>["page"][number];
type ActivityDateRange = "all" | "today" | "week" | "month";

export function AcademicActivityView() {
  const scope = useHodScope();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<ActivityDateRange>("all");
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null);
  const activity = usePaginatedQuery(
    api.hod.activity,
    scope.departmentId ? { departmentId: scope.departmentId } : "skip",
    { initialNumItems: 30 },
  );
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const cutoff = dateRange === "today" ? startOfToday(now)
      : dateRange === "week" ? now.getTime() - 7 * 24 * 60 * 60 * 1000
        : dateRange === "month" ? now.getTime() - 30 * 24 * 60 * 60 * 1000 : null;
    return activity.results.filter(event => {
      if (cutoff !== null && event.createdAt < cutoff) return false;
      return !query || [event.actorName, event.action, event.studentLabel, event.courseLabel, event.periodLabel, event.details]
        .some(value => value.toLowerCase().includes(query));
    });
  }, [activity.results, dateRange, search]);

  return (
    <div className="w-full space-y-5 p-4 lg:p-6">
      <HodScopePicker scope={scope} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-lg font-semibold tracking-tight">Academic activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filteredEvents.length} of {activity.results.length} loaded activities</p></div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Select value={dateRange} onValueChange={value => { if (isActivityDateRange(value)) setDateRange(value); }}>
            <SelectTrigger aria-label="Filter activity by date" className="h-10 w-full rounded-sm sm:w-48"><SelectValue placeholder="Date range" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem><SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem><SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search academic activity" placeholder="Search activity, staff, student..." value={search}
              onChange={event => setSearch(event.target.value)} className="h-10 rounded-sm bg-background pl-9" />
          </div>
        </div>
      </div>

      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead className="w-12">#</TableHead><TableHead>When</TableHead><TableHead>Staff member</TableHead>
          <TableHead>Activity</TableHead><TableHead>Related record</TableHead><TableHead className="w-16 text-right">Details</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {activity.status === "LoadingFirstPage" && <TableRow><TableCell colSpan={6}><Skeleton className="h-20 w-full" /></TableCell></TableRow>}
          {filteredEvents.map((event, index) => <TableRow key={event._id}>
            <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="whitespace-nowrap text-sm">{formatActivityTime(event.createdAt)}</TableCell>
            <TableCell className="max-w-52 truncate font-medium" title={event.actorName}>{event.actorName}</TableCell>
            <TableCell><span className="block font-medium">{formatAction(event.action)}</span><span className="text-xs text-muted-foreground">{event.periodLabel}</span></TableCell>
            <TableCell className="max-w-80"><span className="block truncate" title={event.courseLabel}>{event.courseLabel}</span>
              <span className="block truncate text-xs text-muted-foreground" title={event.studentLabel}>{event.studentLabel}</span></TableCell>
            <TableCell className="text-right"><Button variant="ghost" size="icon" aria-label={`View details for ${formatAction(event.action)}`} onClick={() => setSelectedEvent(event)}><Eye className="size-4" /></Button></TableCell>
          </TableRow>)}
          {activity.status !== "LoadingFirstPage" && filteredEvents.length === 0 && <TableRow><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
            {search || dateRange !== "all" ? "No activity matches these filters." : "No academic activity has been recorded for this department yet."}
          </TableCell></TableRow>}
        </TableBody>
      </Table>

      {activity.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => activity.loadMore(30)}>Load older activity</Button></div>}
      <AcademicActivityDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

function isActivityDateRange(value: string): value is ActivityDateRange { return ["all", "today", "week", "month"].includes(value); }
function startOfToday(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find(part => part.type === "year")?.value);
  const month = Number(parts.find(part => part.type === "month")?.value);
  const day = Number(parts.find(part => part.type === "day")?.value);
  return Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000;
}

function formatAction(action: string) { return action.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
function formatActivityTime(timestamp: number) { return new Date(timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }); }
