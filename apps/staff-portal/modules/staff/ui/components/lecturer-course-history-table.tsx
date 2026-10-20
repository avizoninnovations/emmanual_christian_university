"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { Input } from "@workspace/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";

type CoursePeriod = NonNullable<ReturnType<typeof useQuery<typeof api.allocations.getLecturerCoursePeriods>>>[number];

export function LecturerCourseHistoryTable({ periods }: { periods: CoursePeriod[] }) {
  const [search, setSearch] = useState("");
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  const filtered = useMemo(() => periods.map(({ period, courses }) => ({
    period,
    courses: courses.filter((course) => `${course.code} ${course.title} ${course.programName} ${course.departmentName}`.toLowerCase().includes(search.trim().toLowerCase())),
  })).filter(({ courses }) => courses.length > 0), [periods, search]);

  return <section className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-3 py-3">
        <div><h2 className="text-sm font-semibold">Course assignments</h2><p className="text-xs text-muted-foreground">Choose a semester row to view its courses.</p></div>
        <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search course assignments" placeholder="Search courses..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 rounded-sm pl-9" /></div>
      </div>
      {filtered.length === 0 ? <div className="px-4 py-12 text-center"><BookOpen className="mx-auto mb-2 size-7 text-muted-foreground/60" /><p className="text-sm text-muted-foreground">{periods.length === 0 ? "No teaching assignments recorded yet." : "No courses match this search."}</p></div> : <div className="w-full divide-y divide-border/60 border-y border-border/60">{filtered.map(({ period, courses }) => {
        const isOpen = openPeriodId === period._id;
        return <Collapsible key={period._id} open={isOpen} onOpenChange={(open) => setOpenPeriodId(open ? period._id : null)}>
          <CollapsibleTrigger asChild><Button variant="ghost" className="group h-auto min-h-12 w-full justify-between gap-3 rounded-none px-3 py-3 text-left hover:bg-muted/40">
            <span className="flex min-w-0 items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/8 text-primary"><BookOpen className="size-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">Semester: {period.name} {period.year}</span><span className="block text-xs text-muted-foreground">{period.startDate} – {period.endDate}</span></span></span>
            <span className="flex shrink-0 items-center gap-3"><Badge variant="secondary" className="rounded-sm">{courses.length} {courses.length === 1 ? "course" : "courses"}</Badge><ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" /></span>
          </Button></CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border/50 px-2 pb-2 pt-1 sm:px-3">
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Semester</TableHead><TableHead>Course</TableHead><TableHead>Program</TableHead><TableHead>Hours</TableHead><TableHead>Stream</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>{courses.map((course) => <TableRow key={course.allocationId}>
                <TableCell className="min-w-40 whitespace-nowrap">{period.name} {period.year} · Sem {period.term}</TableCell>
                <TableCell className="min-w-56"><span className="block font-medium">{course.title}</span><span className="font-mono text-xs text-muted-foreground">{course.code}</span></TableCell>
                <TableCell className="min-w-40">{course.programName}<span className="block text-xs text-muted-foreground">Year {course.yearOfStudy} · Curriculum semester {course.semester}</span></TableCell>
                <TableCell className="tabular-nums">—</TableCell><TableCell>None</TableCell>
                <TableCell className="text-right"><Button asChild size="sm" variant="ghost" className="h-8 rounded-sm whitespace-nowrap px-2 text-primary"><Link href={`/courses/${course.courseId}`}>Manage Class Results</Link></Button></TableCell>
              </TableRow>)}</TableBody>
            </Table></div>
          </CollapsibleContent>
        </Collapsible>;
      })}</div>}
    </section>;
}
