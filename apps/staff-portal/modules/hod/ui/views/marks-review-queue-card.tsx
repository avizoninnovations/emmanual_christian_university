import Link from "next/link";
import { ArrowUpRight, BookOpen, ClipboardCheck, UserRound } from "lucide-react";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { MarksBreakdown } from "./marks-breakdown";
import { getMarksReviewPresentation, type ReviewCourse } from "./marks-review-presentation";

export function MarksReviewQueueCard({ course, periodId }: { course: ReviewCourse; periodId: Id<"academicPeriods"> }) {
  const presentation = getMarksReviewPresentation(course);
  return (
    <Card className="group relative gap-0 overflow-hidden rounded-sm border-border/80 py-0 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-y-0 left-0 w-1 bg-muted-foreground/30" />
      <div className="flex items-start gap-3 border-b bg-muted/20 p-4 pl-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
          <BookOpen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="rounded-sm bg-background font-mono text-xs">{course.code}</Badge>
          </div>
          <h2 className="line-clamp-2 font-semibold leading-snug">{course.title}</h2>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{course.programName}</p>
          <p className="mt-2 text-xs text-muted-foreground">Year {course.yearOfStudy} <span className="px-1">·</span> Semester {course.semester}</p>
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-sm border bg-muted/20 p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground"><UserRound className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Lecturer</p>
            <p className="truncate text-sm font-medium">{course.lecturerName || "Unassigned"}</p>
          </div>
        </div>
        <MarksBreakdown course={course} />
        <Button asChild size="sm" variant={presentation.highlightAction ? "default" : "outline"} className="w-full justify-between gap-2 rounded-sm shadow-sm">
          <Link href={`/hod/review-queue/${course._id}?periodId=${periodId}`}>
            <span className="flex min-w-0 items-center gap-2">
              {course.hasSubmitted && <ClipboardCheck className="size-4 shrink-0" />}
              <span className="truncate">{presentation.actionLabel}</span>
            </span>
            <ArrowUpRight className="ml-auto size-4 shrink-0" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
