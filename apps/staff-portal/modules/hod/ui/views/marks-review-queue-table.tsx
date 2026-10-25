import Link from "next/link";
import { BookOpen, CheckCheck, CircleAlert, CircleDot, ClipboardCheck, Eye } from "lucide-react";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { getMarksReviewPresentation, type ReviewCourse } from "./marks-review-presentation";

export function MarksReviewQueueTable({ courses, periodId }: { courses: ReviewCourse[]; periodId: Id<"academicPeriods"> }) {
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
            const approved = course.fullyApproved;
            const presentation = getMarksReviewPresentation(course);
            const Icon = submitted ? CircleDot : approved ? CheckCheck : presentation.missingCount > 0 ? CircleAlert : course.hasMarks ? CheckCheck : BookOpen;
            const ActionIcon = presentation.actionKind === "approved" ? Eye : presentation.actionKind === "review" ? ClipboardCheck
              : presentation.actionKind === "missing" ? CircleAlert : BookOpen;
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
                  <Badge variant={submitted || approved || presentation.missingCount > 0 ? "secondary" : "outline"}
                    className={`max-w-full whitespace-normal rounded-sm leading-snug ${submitted || approved || presentation.missingCount > 0 ? "bg-primary/10 text-primary" : ""}`}>
                    <Icon className="mr-1 size-3.5 shrink-0" />{presentation.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 pr-5 text-right">
                  <Button asChild size="sm" variant={presentation.highlightAction ? "default" : "outline"} className="rounded-sm shadow-sm">
                    <Link href={`/hod/review-queue/${course._id}?periodId=${periodId}`}>
                      <ActionIcon className="size-4" />{presentation.actionLabel}
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
