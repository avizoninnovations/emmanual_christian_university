"use client";

import { useMemo, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { ClipboardCheck, LayoutGrid, List, Search } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
import { MarksReviewQueueCard } from "./marks-review-queue-card";
import { MarksReviewQueueTable } from "./marks-review-queue-table";
import { NominatedReviews } from "./nominated-reviews";

type QueueFilter = "noMarks" | "hasMarks" | "approved" | "independent" | "all";

export function MarksReviewQueueView() {
  const scope = useHodScope();
  const queue = usePaginatedQuery(
    api.hod.courses,
    scope.departmentId && scope.periodId
      ? { departmentId: scope.departmentId, periodId: scope.periodId }
      : "skip",
    { initialNumItems: 25 },
  );
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const period = scope.context?.periods.find(item => item._id === scope.periodId);
  const noMarksCount = queue.results.filter(course => !course.hasMarks).length;
  const hasMarksCount = queue.results.filter(course => course.hasMarks && !course.fullyApproved).length;
  const approvedCount = queue.results.filter(course => course.fullyApproved).length;
  const visibleCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return queue.results.filter(course => {
      if (filter === "noMarks" && course.hasMarks) return false;
      if (filter === "hasMarks" && (!course.hasMarks || course.fullyApproved)) return false;
      if (filter === "approved" && !course.fullyApproved) return false;
      return !query || [course.title, course.code, course.programName, course.lecturerName]
        .some(value => value.toLowerCase().includes(query));
    });
  }, [filter, queue.results, search]);

  return (
    <div className="w-full space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <ClipboardCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Marks review</h1>
            <p className="text-sm text-muted-foreground">{period ? `${period.name} · ${period.year}` : "Select a semester"}</p>
          </div>
        </div>
        <HodScopePicker scope={scope} />
      </div>

      {scope.departmentId && scope.periodId && (
        <>
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b">
              <div className="flex flex-wrap gap-x-5">
                <QueueFilterButton label="All" count={queue.results.length} active={filter === "all"} onClick={() => setFilter("all")} />
                <QueueFilterButton label="No marks" count={noMarksCount} active={filter === "noMarks"} onClick={() => setFilter("noMarks")} />
                <QueueFilterButton label="Marks entered" count={hasMarksCount} active={filter === "hasMarks"} onClick={() => setFilter("hasMarks")} />
                <QueueFilterButton label="Fully approved" count={approvedCount} active={filter === "approved"} onClick={() => setFilter("approved")} />
                <QueueFilterButton label="Independent review" active={filter === "independent"} onClick={() => setFilter("independent")} />
              </div>
              {filter !== "independent" && <TabsList className="border-0">
                <TabsTrigger value="grid" aria-label="Grid view" className="flex-none gap-2"><LayoutGrid />Grid</TabsTrigger>
                <TabsTrigger value="table" aria-label="Tabular view" className="flex-none gap-2"><List />Table</TabsTrigger>
              </TabsList>}
            </div>

            {filter !== "independent" ? <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-3 py-3">
                <p className="text-sm font-medium">{filterTitle(filter)}</p>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search marks review queue"
                    placeholder="Search course, program, or lecturer"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    className="h-10 rounded-sm bg-background pl-9"
                  />
                </div>
              </div>
              <div className="px-3 pt-2 text-xs text-muted-foreground">
                Marks entered includes any course unit with at least one student's marks. Course cards break out approved, pending, draft, and not-entered students.
                {queue.status === "CanLoadMore" && " Load more to update the counts."}
              </div>
              <div className="pt-3">
              <TabsContent value="grid" className="mt-0">
                {queue.status === "LoadingFirstPage" ? <QueueGridSkeleton /> : (
                  <QueueResults courses={visibleCourses} filter={filter} search={search} clear={() => { setSearch(""); setFilter("all"); }}>
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {visibleCourses.map(course => <MarksReviewQueueCard key={course._id} course={course} periodId={scope.periodId!} />)}
                    </div>
                  </QueueResults>
                )}
              </TabsContent>
              <TabsContent value="table" className="mt-0">
                {queue.status === "LoadingFirstPage" ? <Skeleton className="h-72 rounded-sm" /> : (
                  <QueueResults courses={visibleCourses} filter={filter} search={search} clear={() => { setSearch(""); setFilter("all"); }}>
                    <MarksReviewQueueTable courses={visibleCourses} periodId={scope.periodId!} />
                  </QueueResults>
                )}
              </TabsContent>
              {queue.status === "CanLoadMore" && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" className="rounded-sm" onClick={() => queue.loadMore(25)}>Load more course units</Button>
                </div>
              )}
              </div>
            </> : <div className="pt-4"><NominatedReviews /></div>}
          </Tabs>
        </>
      )}
    </div>
  );
}

function QueueFilterButton({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" aria-pressed={active} onClick={onClick}
      className={`h-10 gap-2 rounded-none border-b-2 px-1 text-sm hover:bg-transparent ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground"}`}>
      {label}{count !== undefined && <span className={`text-xs tabular-nums ${active ? "text-primary" : "text-muted-foreground"}`}>{count}</span>}
    </Button>
  );
}

function QueueResults({ courses, filter, search, clear, children }: {
  courses: { _id: string }[]; filter: QueueFilter; search: string; clear: () => void; children: React.ReactNode;
}) {
  if (courses.length) return children;
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-sm border border-dashed bg-card px-6 text-center">
      <ClipboardCheck className="size-8 text-muted-foreground/70" />
      <p className="font-medium">{search ? "No matching course units" : emptyTitle(filter)}</p>
      <p className="max-w-md text-sm text-muted-foreground">{search ? "Try a different course code, program, or lecturer name." : emptyDescription(filter)}</p>
      {(search || filter !== "all") && <Button variant="ghost" size="sm" onClick={clear}>Show all course units</Button>}
    </div>
  );
}

function filterTitle(filter: QueueFilter) {
  switch (filter) {
    case "all": return "All";
    case "noMarks": return "No marks entered";
    case "hasMarks": return "Course units with marks entered";
    case "approved": return "Fully approved results";
    case "independent": return "Independent reviews";
  }
}

function emptyTitle(filter: QueueFilter) {
  if (filter === "all") return "No course units found";
  if (filter === "noMarks") return "Every course unit has marks entered";
  if (filter === "hasMarks") return "No marks have been entered";
  if (filter === "approved") return "No course units are fully approved";
  return "No course units found";
}

function emptyDescription(filter: QueueFilter) {
  if (filter === "noMarks") return "Course units appear here when no student has any marks entered.";
  if (filter === "hasMarks") return "Course units appear here as soon as at least one student's marks are entered.";
  if (filter === "approved") return "A course unit appears here after every enrolled student has approved marks.";
  return "When lecturers submit marks for this semester, the course units will appear here.";
}

function QueueGridSkeleton() {
  return <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-56 rounded-sm" />)}</div>;
}
