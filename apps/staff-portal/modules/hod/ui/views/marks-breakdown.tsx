import { Badge } from "@workspace/ui/components/badge";
import type { ReviewCourse } from "./marks-review-presentation";

const LABELS = ["Approved", "Pending", "Draft / returned", "Not entered"] as const;

export function MarksBreakdown({ course }: { course: ReviewCourse }) {
  const counts = [
    course.approvedCount,
    course.submittedCount,
    course.draftCount,
    Math.max(course.studentCount - course.marksEnteredCount, 0),
  ];

  return (
    <div aria-label="Student marks breakdown" className="flex flex-wrap gap-1.5">
      {LABELS.map((label, index) => (
        <Badge key={label} variant="outline" className="rounded-sm bg-muted/30 px-2 py-1 font-normal text-muted-foreground">
          {label} <span className="ml-1 font-semibold tabular-nums text-foreground">{counts[index]}</span>
        </Badge>
      ))}
    </div>
  );
}
