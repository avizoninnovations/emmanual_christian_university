import Link from "next/link";
import { BookOpen, CheckCheck, CircleDot, ClipboardCheck, Eye, UserRound } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";

type Course = FunctionReturnType<typeof api.hod.courses>["page"][number];

export function MarksReviewQueueCard({ course, periodId }: { course: Course; periodId: Id<"academicPeriods"> }) {
  const submitted = course.hasSubmitted;
  const approved = course.fullyApproved;
  const Icon = submitted ? CircleDot : approved ? CheckCheck : course.hasMarks ? CheckCheck : BookOpen;
  const reviewLabel = submitted && course.approvedCount > 0 ? `Pending + approved · ${course.approvedCount}/${course.studentCount}`
    : submitted ? "Awaiting review" : approved ? `Fully approved · ${course.approvedCount}/${course.studentCount}` : course.hasMarks ? "Marks entered" : "No marks entered";
  const ActionIcon = approved ? Eye : submitted ? ClipboardCheck : BookOpen;

  return (
    <Card className="group relative gap-0 overflow-hidden rounded-sm border-border/80 py-0 shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute inset-y-0 left-0 w-1 ${submitted ? "bg-primary" : "bg-muted-foreground/30"}`} />
      <div className="flex items-start gap-3 border-b bg-muted/20 p-4 pl-5">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-sm ${submitted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          <BookOpen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="rounded-sm bg-background font-mono text-xs">{course.code}</Badge>
            <Badge variant={submitted || approved ? "secondary" : "outline"} className={submitted || approved ? "rounded-sm bg-primary/10 text-primary" : "rounded-sm"}>
              <Icon className="mr-1 size-3.5" />{reviewLabel}
            </Badge>
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
        <div aria-label="Student marks breakdown" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="font-semibold text-foreground">{course.approvedCount}</strong> approved</span>
          <span><strong className="font-semibold text-foreground">{course.submittedCount}</strong> pending</span>
          <span><strong className="font-semibold text-foreground">{course.draftCount}</strong> draft / returned</span>
          <span><strong className="font-semibold text-foreground">{Math.max(course.studentCount - course.marksEnteredCount, 0)}</strong> not entered</span>
        </div>
        <Button asChild size="sm" variant={submitted || approved ? "default" : "outline"} className="w-full justify-start gap-2 rounded-sm shadow-sm">
          <Link href={`/hod/review-queue/${course._id}?periodId=${periodId}`}>
            <ActionIcon className="size-4" />{approved ? "View approved marks" : submitted ? "Review submitted marks" : "Open course unit"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
