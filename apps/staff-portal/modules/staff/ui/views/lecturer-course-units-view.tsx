"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { BookOpen, ChevronDown, ChevronRight, Home, Users } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { StaffDataSkeleton } from "@/modules/dashboard/ui/components/staff-data-skeleton";

type CoursePeriod = NonNullable<ReturnType<typeof useQuery<typeof api.allocations.getLecturerCoursePeriods>>>[number];

export function LecturerCourseUnitsView() {
  const [openSection, setOpenSection] = useState<string | null>("current");
  const periods = useQuery(api.allocations.getLecturerCoursePeriods, {});
  if (periods === undefined) return <StaffDataSkeleton label="your course units" />;

  const upcoming = periods.filter(({ period }) => period.status === "upcoming");
  const current = periods.filter(({ period }) => period.status === "active");
  const past = periods.filter(({ period }) => period.status === "completed");
  return <main className="mx-auto min-h-full w-full max-w-7xl space-y-5 p-4 md:p-6">
    <header className="flex h-8 items-center gap-2 text-sm">
      <Link href="/" className="flex items-center gap-1.5 text-primary hover:underline"><Home className="size-4" /><span>Home</span></Link>
      <ChevronRight className="size-4 text-muted-foreground" />
      <BookOpen className="size-5 text-muted-foreground" />
      <span className="font-semibold uppercase tracking-wide">Courses</span>
    </header>

    {periods.length === 0 && <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="flex flex-col items-center gap-2 py-12 text-center">
      <BookOpen className="size-8 text-muted-foreground/60" />
      <p className="font-medium">No course units assigned yet</p>
      <p className="max-w-lg text-sm text-muted-foreground">When your Head of Department assigns you course units, they will appear here under the semester they belong to.</p>
    </CardContent></Card>}

    <div className="space-y-2">
      <SemesterSection title="Next Semester" periods={upcoming} open={openSection === "next"} onOpenChange={(open) => setOpenSection(open ? "next" : null)} />
      <SemesterSection title="Current Semester" periods={current} open={openSection === "current"} onOpenChange={(open) => setOpenSection(open ? "current" : null)} />
      <SemesterSection title="Past Semesters" periods={past} open={openSection === "past"} onOpenChange={(open) => setOpenSection(open ? "past" : null)} />
    </div>
  </main>;
}

function SemesterSection({ title, periods, open, onOpenChange }: {
  title: string; periods: CoursePeriod[]; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  return <Collapsible open={open} onOpenChange={onOpenChange} className="overflow-hidden rounded-xl bg-card shadow-sm">
    <CollapsibleTrigger asChild><Button variant="ghost" className="group h-11 w-full justify-between rounded-none bg-muted/60 px-4 text-foreground data-[state=open]:bg-primary data-[state=open]:text-primary-foreground">
      <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"><BookOpen className="size-4" />{title}</span>
      <span className="flex items-center gap-2"><Badge variant="secondary" className="rounded-full">{periods.reduce((count, period) => count + period.courses.length, 0)}</Badge><ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" /></span>
    </Button></CollapsibleTrigger>
    <CollapsibleContent className="space-y-5 p-4">
      {periods.length === 0 ? <p className="px-2 py-4 text-sm text-muted-foreground">{title === "Next Semester" ? "No upcoming allocations yet. New assignments from your HOD will appear here." : title === "Current Semester" ? "No course units are assigned for the active semester." : "Completed semester allocations will appear here."}</p> : periods.map(({ period, courses }) => <section key={period._id} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold uppercase">{period.name} {period.year}</h2><p className="text-xs text-muted-foreground">Semester {period.term} · {period.startDate} – {period.endDate}</p></div><Badge variant="outline" className="rounded-full">{courses.length} {courses.length === 1 ? "unit" : "units"}</Badge></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <CourseUnitCard key={course.allocationId} course={course} />)}</div>
      </section>)}
    </CollapsibleContent>
  </Collapsible>;
}

function CourseUnitCard({ course }: { course: CoursePeriod["courses"][number] }) {
  return <Card className="overflow-hidden rounded-xl border-0 bg-background shadow-sm transition-shadow hover:shadow-md">
    <div aria-hidden="true" className="flex h-20 items-end bg-gradient-to-br from-muted via-muted/80 to-primary/10 p-3">
      <Badge variant="secondary" className="font-mono">{course.code}</Badge>
    </div>
    <CardContent className="space-y-3 p-4">
      <div className="min-h-12"><h3 className="line-clamp-2 text-sm font-semibold">{course.title}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{course.programName} · {course.departmentName}</p></div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline" className="rounded-full">Year {course.yearOfStudy} · Sem {course.semester}</Badge><Badge variant="outline" className="rounded-full">{course.creditUnits} CU</Badge></div>
      <div className="flex items-center justify-between border-t border-border/60 pt-3"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" />Teaching assignment</span><Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-primary"><Link href={`/courses/${course.courseId}`}>Open unit <ChevronRight className="size-3.5" /></Link></Button></div>
    </CardContent>
  </Card>;
}
