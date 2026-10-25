"use client";

import { useMemo, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CalendarDays, Eye, Search } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
import { AcademicActivityDetails } from "./academic-activity-details";

type Activity = FunctionReturnType<typeof api.hod.activity>["page"][number];

export function AcademicActivityView() {
  const scope = useHodScope();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null);
  const activity = usePaginatedQuery(
    api.hod.activity,
    scope.departmentId ? { departmentId: scope.departmentId } : "skip",
    { initialNumItems: 30 },
  );
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activity.results.filter(event => {
      if (selectedDate && toNairobiDateKey(new Date(event.createdAt)) !== toNairobiDateKey(selectedDate)) return false;
      return !query || [event.actorName, event.action, event.studentLabel, event.courseLabel, event.periodLabel, event.details]
        .some(value => value.toLowerCase().includes(query));
    });
  }, [activity.results, search, selectedDate]);

  return (
    <div className="w-full space-y-5 p-4 lg:p-6">
      <HodScopePicker scope={scope} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-lg font-semibold tracking-tight">Academic activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filteredEvents.length} of {activity.results.length} loaded activities</p></div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Popover>
            <PopoverTrigger asChild><Button type="button" variant="outline" aria-label="Filter activity by date" className="h-10 w-full justify-start rounded-sm font-normal sm:w-52">
              <CalendarDays className="size-4 text-muted-foreground" />{selectedDate ? formatActivityDate(selectedDate) : "All dates"}
            </Button></PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-2">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} captionLayout="dropdown"
                startMonth={new Date(2000, 0)} endMonth={new Date()} />
              {selectedDate && <Button type="button" variant="ghost" size="sm" className="w-full rounded-sm" onClick={() => setSelectedDate(undefined)}>Clear date filter</Button>}
            </PopoverContent>
          </Popover>
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
            {search || selectedDate ? "No activity matches these filters." : "No academic activity has been recorded for this department yet."}
          </TableCell></TableRow>}
        </TableBody>
      </Table>

      {activity.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => activity.loadMore(30)}>Load older activity</Button></div>}
      <AcademicActivityDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

function formatAction(action: string) { return action.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
function toNairobiDateKey(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function formatActivityDate(date: Date) { return date.toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "Africa/Nairobi" }); }
function formatActivityTime(timestamp: number) { return new Date(timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }); }
