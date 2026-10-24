"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  GraduationCap,
  Search,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useHodScope } from "../../hooks/use-hod-scope";
import { AllocationDialog } from "../components/allocation-dialog";
import { HodScopePicker } from "../components/hod-scope-picker";

type CourseFilter = "all" | "assigned" | "unassigned" | "review";

export function CourseAllocationView() {
  const scope = useHodScope();
  const courses = usePaginatedQuery(
    api.hod.courses,
    scope.departmentId && scope.periodId
      ? { departmentId: scope.departmentId, periodId: scope.periodId }
      : "skip",
    { initialNumItems: 25 },
  );
  const [assignment, setAssignment] = useState<{ id: Id<"courses">; title: string }>();
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [search, setSearch] = useState("");
  const selectedPeriod = scope.context?.periods.find(period => period._id === scope.periodId);
  const canAssign = scope.context?.isAdmin === true
    || selectedPeriod?.status === "active"
    || selectedPeriod?.status === "upcoming";

  const counts = useMemo(() => ({
    all: courses.results.length,
    assigned: courses.results.filter(course => Boolean(course.allocation)).length,
    unassigned: courses.results.filter(course => !course.allocation).length,
    review: courses.results.filter(course => course.hasSubmitted).length,
  }), [courses.results]);

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.results.filter(course => {
      const matchesFilter = filter === "all"
        || (filter === "assigned" && Boolean(course.allocation))
        || (filter === "unassigned" && !course.allocation)
        || (filter === "review" && course.hasSubmitted);
      const matchesSearch = !query
        || [course.title, course.code, course.programName, course.lecturerName]
          .some(value => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [courses.results, filter, search]);

  return (
    <div className="w-full space-y-5 p-4 lg:p-6">
      <HodScopePicker scope={scope} />
      {scope.departmentId && scope.periodId && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Course allocations</h1>
                <p className="text-sm text-muted-foreground">{selectedPeriod?.name} {selectedPeriod?.year}</p>
              </div>
            </div>
            {selectedPeriod && <Badge variant={selectedPeriod.status === "active" ? "secondary" : "outline"} className="capitalize">{selectedPeriod.status} period</Badge>}
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AllocationSummary label="Course units loaded" value={counts.all} icon={BookOpen} />
            <AllocationSummary label="Assigned" value={counts.assigned} icon={Check} />
            <AllocationSummary label="Awaiting assignment" value={counts.unassigned} icon={UserRound} />
            <AllocationSummary label="Marks for review" value={counts.review} icon={Clock3} />
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border bg-card p-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <h2 className="font-semibold">Teaching assignments</h2>
                <span className="text-xs text-muted-foreground">{courses.results.length} course units loaded</span>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search loaded course units"
                  placeholder="Search course units or lecturers"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="h-9 rounded-sm pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 border-b">
              <FilterButton label="All units" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
              <FilterButton label="Assigned" count={counts.assigned} active={filter === "assigned"} onClick={() => setFilter("assigned")} />
              <FilterButton label="Unassigned" count={counts.unassigned} active={filter === "unassigned"} onClick={() => setFilter("unassigned")} />
              <FilterButton label="Marks for review" count={counts.review} active={filter === "review"} onClick={() => setFilter("review")} />
            </div>

            {courses.status === "LoadingFirstPage" ? (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64 rounded-sm" />)}
              </div>
            ) : visibleCourses.length ? (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {visibleCourses.map(course => (
                  <CourseAllocationCard
                    key={course._id}
                    course={course}
                    periodId={scope.periodId!}
                    canAssign={canAssign}
                    onAssign={() => setAssignment({ id: course._id, title: course.code })}
                  />
                ))}
              </div>
            ) : (
              <Card className="rounded-sm py-0">
                <CardContent className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center">
                  <BookOpen className="size-7 text-muted-foreground" />
                  <p className="font-medium">{search ? "No matching course units" : "No course units in this view"}</p>
                  <p className="text-sm text-muted-foreground">
                    {search ? "Try another course, program, or lecturer name." : "Change the filter to see other course units."}
                  </p>
                  {(search || filter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
                      Clear filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {courses.status === "CanLoadMore" && (
              <div className="flex justify-center">
                <Button variant="outline" className="rounded-sm" onClick={() => courses.loadMore(25)}>
                  Load more course units
                </Button>
              </div>
            )}
          </section>
        </>
      )}
      {assignment && scope.periodId && scope.departmentId && (
        <AllocationDialog
          courseId={assignment.id}
          title={assignment.title}
          periodId={scope.periodId}
          departmentId={scope.departmentId}
          close={() => setAssignment(undefined)}
        />
      )}
    </div>
  );
}

function AllocationSummary({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card className="gap-0 rounded-sm py-0">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function FilterButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      aria-pressed={active}
      className={`h-10 gap-2 rounded-none border-b-2 px-1 text-sm hover:bg-transparent ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground"}`}
      onClick={onClick}
    >
      {label}<span className={`text-xs tabular-nums ${active ? "text-primary" : "text-muted-foreground"}`}>{count}</span>
    </Button>
  );
}

type Course = FunctionReturnType<typeof api.hod.courses>["page"][number];

function CourseAllocationCard({ course, periodId, canAssign, onAssign }: {
  course: Course;
  periodId: Id<"academicPeriods">;
  canAssign: boolean;
  onAssign: () => void;
}) {
  const assigned = Boolean(course.allocation);
  const blockedByReview = assigned && course.hasSubmitted;
  const lecturerInitials = String(course.lecturerName ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="group relative gap-0 overflow-hidden rounded-sm border-border/80 py-0 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
      <div className="flex items-start gap-3 border-b bg-muted/20 p-4 pl-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          <BookOpen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="rounded-sm bg-background font-mono text-xs">{course.code}</Badge>
            <Badge variant={assigned ? "secondary" : "outline"}>{assigned ? "Assigned" : "Needs lecturer"}</Badge>
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{course.programName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="rounded-sm bg-background text-xs">Year {course.yearOfStudy}</Badge>
            <Badge variant="outline" className="rounded-sm bg-background text-xs">Semester {course.semester}</Badge>
          </div>
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-sm border bg-muted/20 p-2.5">
          <Avatar className="size-9 rounded-sm">
            <AvatarFallback className="rounded-sm bg-muted text-xs font-semibold text-foreground">
              {assigned ? lecturerInitials : <UsersRound className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Assigned lecturer</p>
            <p className="truncate text-sm font-medium">{assigned ? course.lecturerName : "No lecturer assigned"}</p>
          </div>
          {course.hasSubmitted && <Badge variant="secondary" className="shrink-0 gap-1"><Clock3 className="size-3" />Review</Badge>}
        </div>

        {blockedByReview && (
          <p className="text-xs text-muted-foreground">Resolve submitted marks before reassigning this course.</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            size="sm"
            variant={assigned ? "outline" : "default"}
            className="rounded-sm shadow-none"
            disabled={!canAssign || blockedByReview}
            title={!canAssign ? "Historical assignments are locked" : blockedByReview ? "Review submitted marks before reassigning" : undefined}
            onClick={onAssign}
          >
            {assigned ? "Reassign lecturer" : "Assign lecturer"}
          </Button>
          <Button asChild size="sm" variant="ghost" className="rounded-sm px-2">
            <Link href={`/hod/review-queue/${course._id}?periodId=${periodId}`} aria-label={`Open ${course.code}`}>
              <span className="sr-only">Open class</span><ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
