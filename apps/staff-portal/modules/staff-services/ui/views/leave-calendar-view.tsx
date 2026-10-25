"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { CalendarDays } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Skeleton } from "@workspace/ui/components/skeleton";

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: dateValue(start), end: dateValue(end) };
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function LeaveCalendarView() {
  const [month, setMonth] = useState(() => new Date());
  const range = monthRange(month);
  const calendar = usePaginatedQuery(api.staffServices.getMyLeaveCalendar, { startDate: range.start, endDate: range.end }, { initialNumItems: 50 });
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return <main className="min-h-full min-w-0 w-full space-y-5 p-4 md:p-6">
    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><CalendarDays className="size-4" /></span><h1 className="text-xl font-semibold">Leave Calendar</h1></div>
    <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</Button><Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Today</Button><Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</Button></div>
      <p className="text-sm font-semibold">{monthLabel}</p>
      <div className="flex items-center gap-2"><label htmlFor="leave-calendar-start" className="text-xs text-muted-foreground">Range</label><Input id="leave-calendar-start" type="date" value={range.start} onChange={event => setMonth(new Date(`${event.target.value}T12:00:00`))} className="w-36 rounded-sm" /></div>
    </CardContent></Card>
    <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="p-0">
      <div className="w-full overflow-x-auto"><Table>
        <TableHeader><TableRow className="bg-primary/5 hover:bg-primary/5"><TableHead className="w-12">#</TableHead><TableHead>Staff member</TableHead><TableHead>Leave type</TableHead><TableHead>From</TableHead><TableHead>Through</TableHead></TableRow></TableHeader>
        <TableBody>{calendar.results.map((item, index) => <TableRow key={item.id}><TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell><TableCell className="font-medium">{item.staffName}</TableCell><TableCell>{item.leaveType}</TableCell><TableCell>{item.startDate}</TableCell><TableCell>{item.endDate}</TableCell></TableRow>)}
          {calendar.status === "LoadingFirstPage" && Array.from({ length: 4 }, (_, index) => <TableRow key={index}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
          {calendar.status !== "LoadingFirstPage" && calendar.results.length === 0 && <TableRow><TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">No approved leave is visible for this period.</TableCell></TableRow>}
        </TableBody>
      </Table></div>
    </CardContent></Card>
    {calendar.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => calendar.loadMore(50)}>Load more</Button></div>}
  </main>;
}
