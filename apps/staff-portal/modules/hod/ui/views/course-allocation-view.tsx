"use client";

import { useMemo, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import {
  BookOpen,
  GraduationCap,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useHodScope } from "../../hooks/use-hod-scope";
import { AllocationDialog } from "../components/allocation-dialog";
import { HodScopePicker } from "../components/hod-scope-picker";
import { CourseAllocationCard, type Course } from "./course-allocation-card";
import { CourseAllocationTable } from "./course-allocation-table";

type CourseFilter = "all" | "assigned" | "unassigned";

export function CourseAllocationView() {
  const scope = useHodScope();
  const courses = usePaginatedQuery(
    api.hod.courses,
    scope.departmentId && scope.periodId
      ? { departmentId: scope.departmentId, periodId: scope.periodId }
      : "skip",
    { initialNumItems: 25 },
  );
  const [assignment, setAssignment] = useState<{
    id: Id<"courses">;
    title: string;
    allocationId?: Id<"courseAllocations">;
    currentLecturer?: { userId: string; name: string };
  }>();
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
  }), [courses.results]);

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.results.filter(course => {
      const matchesFilter = filter === "all"
        || (filter === "assigned" && Boolean(course.allocation))
        || (filter === "unassigned" && !course.allocation);
      const matchesSearch = !query
        || [course.title, course.code, course.programName, course.lecturerName]
          .some(value => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [courses.results, filter, search]);

  const openAssignment = (course: Course) => setAssignment({
    id: course._id,
    title: course.code,
    allocationId: course.allocation?._id,
    currentLecturer: course.allocation
      ? { userId: course.allocation.lecturerId, name: course.lecturerName }
      : undefined,
  });

  return (
    <div className="w-full space-y-5 p-4 lg:p-6">
      <HodScopePicker scope={scope} />
      {scope.departmentId && scope.periodId && (
        <>
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <GraduationCap className="size-5" />
                </span>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">Course allocations</h1>
                  <p className="text-sm text-muted-foreground">{selectedPeriod?.name} {selectedPeriod?.year}</p>
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="grid" className="gap-2">
                  <LayoutGrid className="size-4" />Grid view
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-2">
                  <List className="size-4" />Tabular view
                </TabsTrigger>
              </TabsList>
            </div>

            <section className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-sm border bg-card p-3">
                <div className="flex flex-wrap gap-x-5">
                  <FilterButton label="All units" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
                  <FilterButton label="Assigned" count={counts.assigned} active={filter === "assigned"} onClick={() => setFilter("assigned")} />
                  <FilterButton label="Unassigned" count={counts.unassigned} active={filter === "unassigned"} onClick={() => setFilter("unassigned")} />
                </div>
                <div className="w-full sm:max-w-sm">
                  <label htmlFor="course-allocation-search" className="mb-1.5 block text-xs font-medium text-foreground">Search course units</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="course-allocation-search"
                      aria-label="Search course units"
                      placeholder="Course, program, code, or lecturer"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      className="h-10 rounded-sm border-input bg-background pl-9 shadow-sm placeholder:text-muted-foreground/80 focus-visible:ring-2"
                    />
                  </div>
                </div>
              </div>

              <TabsContent value="grid" className="mt-0">
                {courses.status === "LoadingFirstPage" ? (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64 rounded-sm" />)}
                  </div>
                ) : visibleCourses.length ? (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {visibleCourses.map(course => <CourseAllocationCard key={course._id} course={course} canAssign={canAssign} onAssign={() => openAssignment(course)} />)}
                  </div>
                ) : <EmptyAllocations search={search} filter={filter} clearFilters={() => { setSearch(""); setFilter("all"); }} />}
              </TabsContent>
              <TabsContent value="table" className="mt-0">
                {courses.status === "LoadingFirstPage" ? (
                  <Skeleton className="h-72 rounded-sm" />
                ) : visibleCourses.length ? (
                  <CourseAllocationTable courses={visibleCourses} canAssign={canAssign} onAssign={openAssignment} />
                ) : (
                  <EmptyAllocations search={search} filter={filter} clearFilters={() => { setSearch(""); setFilter("all"); }} />
                )}
              </TabsContent>

              {courses.status === "CanLoadMore" && (
                <div className="flex justify-center">
                  <Button variant="outline" className="rounded-sm" onClick={() => courses.loadMore(25)}>
                    Load more course units
                  </Button>
                </div>
              )}
            </section>
          </Tabs>
        </>
      )}
      {assignment && scope.periodId && scope.departmentId && (
        <AllocationDialog
          courseId={assignment.id}
          title={assignment.title}
          periodId={scope.periodId}
          departmentId={scope.departmentId}
          close={() => setAssignment(undefined)}
          allocationId={assignment.allocationId}
          currentLecturer={assignment.currentLecturer}
        />
      )}
    </div>
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

function EmptyAllocations({ search, filter, clearFilters }: { search: string; filter: CourseFilter; clearFilters: () => void }) {
  return (
    <Card className="rounded-sm py-0">
      <CardContent className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center">
        <BookOpen className="size-7 text-muted-foreground" />
        <p className="font-medium">{search ? "No matching course units" : "No course units in this view"}</p>
        <p className="text-sm text-muted-foreground">
          {search ? "Try another course, program, or lecturer name." : "Change the assignment filter to see other course units."}
        </p>
        {(search || filter !== "all") && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
      </CardContent>
    </Card>
  );
}
