import Link from "next/link";
import { ArrowUpRight, CheckCheck, CircleDot } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

type Course = FunctionReturnType<typeof api.hod.courses>["page"][number];

export function MarksReviewQueueTable({ courses, periodId }: { courses: Course[]; periodId: Id<"academicPeriods"> }) {
  return (
    <div className="w-full overflow-x-auto rounded-sm border bg-card shadow-sm">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="bg-muted/45 hover:bg-muted/45">
            <TableHead className="h-11 w-14 pl-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Course unit</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Program</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lecturer</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Review status</TableHead>
            <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course, index) => {
            const submitted = course.hasSubmitted;
            const approved = course.hasApproved;
            const Icon = submitted ? CircleDot : CheckCheck;
            const reviewLabel = submitted && approved ? "Mixed · pending review" : submitted ? "Awaiting review" : approved ? "Approved marks" : "No pending review";
            return (
              <TableRow key={course._id} className="transition-colors hover:bg-muted/25">
                <TableCell className="py-4 pl-5 font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="py-4">
                  <span className="block max-w-[24rem] truncate font-medium">{course.title}</span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">{course.code}</span>
                </TableCell>
                <TableCell className="py-4">
                  <span className="block max-w-[15rem] truncate font-medium">{course.programName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Year {course.yearOfStudy} <span className="px-1">·</span> Semester {course.semester}</span>
                </TableCell>
                <TableCell className="max-w-[15rem] truncate py-4">{course.lecturerName || "Unassigned"}</TableCell>
                <TableCell className="py-4">
                  <Badge variant={submitted ? "secondary" : "outline"} className={submitted ? "rounded-sm bg-primary/10 text-primary" : "rounded-sm"}>
                    <Icon className="mr-1 size-3.5" />{reviewLabel}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 pr-5 text-right">
                  <Button asChild size="sm" variant={submitted ? "default" : "ghost"} className="rounded-sm">
                    <Link href={`/hod/review-queue/${course._id}?periodId=${periodId}`}>
                      {submitted ? "Review marks" : "Open"}<ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
