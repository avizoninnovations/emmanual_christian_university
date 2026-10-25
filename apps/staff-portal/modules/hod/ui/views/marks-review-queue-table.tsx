import { AlertCircle, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { MarksBreakdown } from "./marks-breakdown";
import { getMarksReviewPresentation, type ReviewCourse } from "./marks-review-presentation";

export function MarksReviewQueueTable({ courses, onOpen }: { courses: ReviewCourse[]; onOpen: (course: ReviewCourse) => void }) {
  return (
    <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14 pl-5">No.</TableHead>
            <TableHead>Course unit</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Lecturer</TableHead>
            <TableHead>Review status</TableHead>
            <TableHead className="pr-5 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course, index) => {
            const presentation = getMarksReviewPresentation(course);
            const ActionIcon = course.fullyApproved ? CheckCircle2 : AlertCircle;
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
                  <MarksBreakdown course={course} />
                </TableCell>
                <TableCell className="py-4 pr-5 text-right">
                  <Button type="button" size="sm" variant={presentation.highlightAction ? "default" : "outline"}
                    className={`min-w-44 justify-between gap-2 rounded-sm shadow-sm ${presentation.buttonToneClassName}`} onClick={() => onOpen(course)}>
                    <span className="inline-flex items-center gap-2">
                      <ActionIcon className="size-4 shrink-0" />
                      <span>{presentation.actionLabel}</span>
                    </span>
                    <ArrowUpRight className="ml-auto size-4 shrink-0" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
    </Table>
  );
}
