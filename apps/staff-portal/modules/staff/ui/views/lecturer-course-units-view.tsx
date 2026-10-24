"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { BookOpen, ChevronDown, ChevronRight, Users } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { StaffDataSkeleton } from "@/modules/dashboard/ui/components/staff-data-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { LecturerCourseHistoryTable } from "@/modules/staff/ui/components/lecturer-course-history-table";

type CoursePeriod = NonNullable<ReturnType<typeof useQuery<typeof api.allocations.getLecturerCoursePeriods>>>[number];

export function LecturerCourseUnitsView() {
  const [openSection, setOpenSection] = useState<string | null>("current");
  const [selectedPeriodId, setSelectedPeriodId] = useState("all");
  const periods = useQuery(api.allocations.getLecturerCoursePeriods, {});
  if (periods === undefined) return <StaffDataSkeleton label="your course units" />;

  const visiblePeriods = selectedPeriodId === "all" ? periods : periods.filter(({ period }) => period._id === selectedPeriodId);
  const upcoming = periods.filter(({ period }) => period.status === "upcoming");
  const current = periods.filter(({ period }) => period.status === "active");
  const past = periods.filter(({ period }) => period.status === "completed");
  return <main className="min-h-full w-full min-w-0 space-y-5 p-3 md:p-5">
    {periods.length === 0 && <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="flex flex-col items-center gap-2 py-12 text-center">
      <BookOpen className="size-8 text-muted-foreground/60" />
      <p className="font-medium">No course units assigned yet</p>
      <p className="max-w-lg text-sm text-muted-foreground">When your Head of Department assigns you course units, they will appear here under the semester they belong to.</p>
    </CardContent></Card>}

    <Tabs defaultValue="grid" className="min-w-0 space-y-4">
      <div className="min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-border/60">
        <TabsList aria-label="Course view" className="h-auto w-max min-w-full justify-start gap-3 rounded-none bg-transparent p-0 shadow-none">
          <TabsTrigger value="grid" className="h-11 flex-none cursor-pointer rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-3 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:bg-transparent hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none">Grid View</TabsTrigger>
          <TabsTrigger value="table" className="h-11 flex-none cursor-pointer rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-3 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:bg-transparent hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none">Tabular View</TabsTrigger>
        </TabsList>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-card px-4 py-3 shadow-sm">
        <div><p className="text-sm font-medium">Teaching history</p><p className="text-xs text-muted-foreground">{periods.length} {periods.length === 1 ? "semester" : "semesters"} · {periods.reduce((count, period) => count + period.courses.length, 0)} course assignments</p></div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Semester</span>
          <Select value={selectedPeriodId} onValueChange={(value) => { setSelectedPeriodId(value); setOpenSection(null); }}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teaching semesters</SelectItem>
              {periods.map(({ period }) => <SelectItem key={period._id} value={period._id}>{period.name} {period.year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <TabsContent value="grid" className="mt-0 focus-visible:outline-none">
        {selectedPeriodId === "all" ? <div className="space-y-2">
          <SemesterSection title="Next Semester" periods={upcoming} open={openSection === "next"} onOpenChange={(open) => setOpenSection(open ? "next" : null)} />
          <SemesterSection title="Current Semester" periods={current} open={openSection === "current"} onOpenChange={(open) => setOpenSection(open ? "current" : null)} />
          <SemesterSection title="Past Semesters" periods={past} open={openSection === "past"} onOpenChange={(open) => setOpenSection(open ? "past" : null)} />
        </div> : <div className="space-y-5">{visiblePeriods.map(({ period, courses }) => <section key={period._id} className="space-y-3"><SemesterHeading period={period} count={courses.length} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <CourseUnitCard key={course.allocationId} course={course} periodId={period._id} />)}</div></section>)}</div>}
      </TabsContent>
      <TabsContent value="table" className="mt-0 focus-visible:outline-none"><LecturerCourseHistoryTable periods={visiblePeriods} /></TabsContent>
    </Tabs>
  </main>;
}

function SemesterHeading({ period, count }: { period: CoursePeriod["period"]; count: number }) {
  return <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold uppercase">{period.name} {period.year}</h2><p className="text-xs text-muted-foreground">Semester {period.term} · {period.startDate} – {period.endDate}</p></div><Badge variant="outline" className="rounded-full">{count} {count === 1 ? "unit" : "units"}</Badge></div>;
}

function SemesterSection({ title, periods, open, onOpenChange }: {
  title: string; periods: CoursePeriod[]; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  return <Collapsible open={open} onOpenChange={onOpenChange} className="overflow-hidden rounded-md bg-card shadow-sm">
    <CollapsibleTrigger asChild><Button variant="ghost" className="group h-12 w-full justify-between rounded-none bg-muted/25 px-4 text-foreground hover:bg-muted/50 data-[state=open]:bg-muted/50">
      <span className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="size-4 text-primary" />{title}</span>
      <span className="flex items-center gap-2"><Badge variant="secondary" className="rounded-sm">{periods.reduce((count, period) => count + period.courses.length, 0)}</Badge><ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" /></span>
    </Button></CollapsibleTrigger>
    <CollapsibleContent className="space-y-5 p-4">
      {periods.length === 0 ? <p className="px-2 py-4 text-sm text-muted-foreground">{title === "Next Semester" ? "No upcoming allocations yet. New assignments from your HOD will appear here." : title === "Current Semester" ? "No course units are assigned for the active semester." : "Completed semester allocations will appear here."}</p> : periods.map(({ period, courses }) => <section key={period._id} className="space-y-3">
        <SemesterHeading period={period} count={courses.length} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <CourseUnitCard key={course.allocationId} course={course} periodId={period._id} />)}</div>
      </section>)}
    </CollapsibleContent>
  </Collapsible>;
}

function CourseUnitCard({ course, periodId }: { course: CoursePeriod["courses"][number]; periodId: string }) {
  return <Card className="overflow-hidden rounded-md border-0 bg-background shadow-sm transition-shadow hover:shadow-md">
    <div aria-hidden="true" className="flex h-20 items-end bg-gradient-to-br from-muted via-muted/80 to-primary/10 p-3">
      <Badge variant="secondary" className="font-mono">{course.code}</Badge>
    </div>
    <CardContent className="space-y-3 p-4">
      <div className="min-h-12"><h3 className="line-clamp-2 text-sm font-semibold">{course.title}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{course.programName} · {course.departmentName}</p></div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline" className="rounded-sm">Year {course.yearOfStudy} · Sem {course.semester}</Badge><Badge variant="outline" className="rounded-sm">{course.creditUnits} CU</Badge></div>
      <div className="flex items-center justify-between border-t border-border/60 pt-3"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" />Teaching assignment</span><Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-primary"><Link href={`/courses/${course.courseId}?periodId=${periodId}`}>Open unit <ChevronRight className="size-3.5" /></Link></Button></div>
    </CardContent>
  </Card>;
}
