"use client";
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
import { NominatedReviews } from "./nominated-reviews";

export function DepartmentCoursesView() {
  const scope = useHodScope();
  const { results, status, loadMore } = usePaginatedQuery(api.hod.courses,
    scope.departmentId && scope.periodId ? { departmentId: scope.departmentId, periodId: scope.periodId } : "skip", { initialNumItems: 25 });
  return <div className="w-full space-y-5 p-4 lg:p-6">
    <HodScopePicker scope={scope} />
    <NominatedReviews />
    {scope.departmentId && scope.periodId && <section className="rounded-sm border bg-card">
      <Table><TableHeader><TableRow><TableHead>Course unit</TableHead><TableHead>Program</TableHead><TableHead>Lecturer</TableHead><TableHead>Review</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{status === "LoadingFirstPage" ? <TableRow><TableCell colSpan={5}><Skeleton className="h-28" /></TableCell></TableRow>
          : results.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No course units in this department.</TableCell></TableRow>
          : results.map(course => <TableRow key={course._id}>
            <TableCell><span className="block font-medium">{course.title}</span><span className="text-xs text-muted-foreground">{course.code} · Year {course.yearOfStudy} · Semester {course.semester}</span></TableCell>
            <TableCell>{course.programName}</TableCell><TableCell>{course.lecturerName}</TableCell>
            <TableCell><Badge variant={course.hasSubmitted ? "secondary" : "outline"}>{course.hasSubmitted ? "Awaiting review" : "No pending submission"}</Badge></TableCell>
            <TableCell className="space-x-2 text-right">
              <Button asChild variant="ghost" size="sm"><Link href={`/hod/review-queue/${course._id}?periodId=${scope.periodId}`}>Open class</Link></Button>
            </TableCell>
          </TableRow>)}</TableBody></Table>
      {status === "CanLoadMore" && <Button variant="ghost" className="m-3" onClick={() => loadMore(25)}>Load more courses</Button>}
    </section>}
  </div>;
}
