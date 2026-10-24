"use client";
import { useState } from "react";
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { BookOpen, ClipboardCheck, KeyRound, UsersRound } from "lucide-react";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
import { AllocationDialog } from "../components/allocation-dialog";
import { NominatedReviews } from "./nominated-reviews";

export function DepartmentCoursesView({ mode }: { mode: "overview" | "allocations" | "review" }) {
  const scope = useHodScope();
  const { results, status, loadMore } = usePaginatedQuery(api.hod.courses,
    scope.departmentId && scope.periodId ? { departmentId: scope.departmentId, periodId: scope.periodId } : "skip", { initialNumItems: 25 });
  const [assignment, setAssignment] = useState<{ id: Id<"courses">; title: string }>();
  const selectedPeriod = scope.context?.periods.find(period => period._id === scope.periodId);
  const canAssign = scope.context?.isAdmin || selectedPeriod?.status !== "completed";
  return <div className="w-full space-y-5 p-4 lg:p-6">
    <HodScopePicker scope={scope} />
    {mode === "review" && <NominatedReviews />}
    {mode === "overview" && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { href: "/hod/allocations", label: "Course Allocations", icon: BookOpen },
      { href: "/hod/review-queue", label: "Marks Review", icon: ClipboardCheck },
      { href: "/hod/edit-permissions", label: "Edit Permissions", icon: KeyRound },
      { href: "/hod/lecturers", label: "Department Lecturers", icon: UsersRound },
    ].map(item => <Button key={item.href} asChild variant="outline" className="h-16 justify-start gap-3"><Link href={item.href}><item.icon className="size-5 text-primary" />{item.label}</Link></Button>)}</div>}
    {scope.departmentId && scope.periodId && <section className="rounded-sm border bg-card">
      <Table><TableHeader><TableRow><TableHead>Course unit</TableHead><TableHead>Program</TableHead><TableHead>Lecturer</TableHead><TableHead>Review</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{status === "LoadingFirstPage" ? <TableRow><TableCell colSpan={5}><Skeleton className="h-28" /></TableCell></TableRow>
          : results.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No course units in this department.</TableCell></TableRow>
          : results.map(course => <TableRow key={course._id}>
            <TableCell><span className="block font-medium">{course.title}</span><span className="text-xs text-muted-foreground">{course.code} · Year {course.yearOfStudy} · Semester {course.semester}</span></TableCell>
            <TableCell>{course.programName}</TableCell><TableCell>{course.lecturerName}</TableCell>
            <TableCell><Badge variant={course.hasSubmitted ? "secondary" : "outline"}>{course.hasSubmitted ? "Awaiting review" : "No pending submission"}</Badge></TableCell>
            <TableCell className="space-x-2 text-right">
              {mode !== "review" && canAssign && <Button variant="outline" size="sm" onClick={() => setAssignment({ id: course._id, title: course.code })}>{course.allocation ? "Reassign" : "Assign"}</Button>}
              <Button asChild variant="ghost" size="sm"><Link href={`/hod/review-queue/${course._id}?periodId=${scope.periodId}`}>Open class</Link></Button>
            </TableCell>
          </TableRow>)}</TableBody></Table>
      {status === "CanLoadMore" && <Button variant="ghost" className="m-3" onClick={() => loadMore(25)}>Load more courses</Button>}
    </section>}
    {assignment && scope.periodId && scope.departmentId && <AllocationDialog courseId={assignment.id} title={assignment.title} periodId={scope.periodId} departmentId={scope.departmentId} close={() => setAssignment(undefined)} />}
  </div>;
}
