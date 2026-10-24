import type { FunctionReturnType } from "convex/server";
import { BookOpen, UsersRound } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";

export type Course = FunctionReturnType<typeof api.hod.courses>["page"][number];

export function CourseAllocationCard({ course, canAssign, onAssign }: {
  course: Course;
  canAssign: boolean;
  onAssign: () => void;
}) {
  const assigned = Boolean(course.allocation);
  const assignmentLocked = assigned && course.hasSubmitted;
  const lecturerInitials = String(course.lecturerName ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="group relative gap-0 overflow-hidden rounded-sm border-border/80 py-0 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
      <div className="flex items-start gap-3 border-b bg-muted/20 p-4 pl-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          <BookOpen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="rounded-sm bg-background font-mono text-xs">{course.code}</Badge>
            <Badge variant={assigned ? "secondary" : "outline"}>{assigned ? "Assigned" : "Needs lecturer"}</Badge>
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{course.programName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="rounded-sm bg-background text-xs">Year {course.yearOfStudy}</Badge>
            <Badge variant="outline" className="rounded-sm bg-background text-xs">Semester {course.semester}</Badge>
          </div>
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-sm border bg-muted/20 p-2.5">
          <Avatar className="size-9 rounded-sm">
            <AvatarFallback className="rounded-sm bg-muted text-xs font-semibold text-foreground">
              {assigned ? lecturerInitials : <UsersRound className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Assigned lecturer</p>
            <p className="truncate text-sm font-medium">{assigned ? course.lecturerName : "No lecturer assigned"}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            size="sm"
            variant={assigned ? "outline" : "default"}
            className="rounded-sm shadow-none"
            disabled={!canAssign || assignmentLocked}
            title={!canAssign ? "Historical assignments are locked" : assignmentLocked ? "This assignment cannot be changed right now" : undefined}
            onClick={onAssign}
          >
            {assigned ? "Reassign lecturer" : "Assign lecturer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
