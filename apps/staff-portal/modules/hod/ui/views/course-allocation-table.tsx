import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { BookOpen, UserRound, UserRoundPen, UserRoundPlus } from "lucide-react";
import type { Course } from "./course-allocation-card";

export function CourseAllocationTable({ courses, canAssign, onAssign }: {
  courses: Course[];
  canAssign: boolean;
  onAssign: (course: Course) => void;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-sm border bg-card shadow-sm">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow className="bg-muted/45 hover:bg-muted/45">
            <TableHead className="h-11 pl-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Course unit</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Program</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned lecturer</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map(course => {
            const assigned = Boolean(course.allocation);
            const assignmentLocked = assigned && course.hasSubmitted;
            return (
              <TableRow key={course._id} className="group transition-colors hover:bg-muted/25">
                <TableCell className="py-4 pl-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/8 text-primary">
                      <BookOpen className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block max-w-[22rem] truncate font-medium text-foreground">{course.title}</span>
                      <Badge variant="outline" className="mt-1 rounded-sm bg-background font-mono text-[10px]">{course.code}</Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="block max-w-[15rem] truncate font-medium">{course.programName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Year {course.yearOfStudy} <span className="px-1">·</span> Semester {course.semester}</span>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8 rounded-sm">
                      <AvatarFallback className="rounded-sm bg-muted text-[10px] font-semibold text-foreground">
                        {assigned ? getInitials(course.lecturerName) : <UserRound className="size-4 text-muted-foreground" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className={assigned ? "max-w-[14rem] truncate font-medium" : "text-sm text-muted-foreground"}>
                      {assigned ? course.lecturerName : "Not assigned"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span className={`size-2 rounded-full ${assigned ? "bg-primary" : "bg-muted-foreground/45"}`} />
                    <span className={assigned ? "font-medium" : "text-muted-foreground"}>{assigned ? "Assigned" : "Unassigned"}</span>
                  </span>
                </TableCell>
                <TableCell className="py-4 pr-5 text-right">
                  <Button
                    size="sm"
                    variant={assigned ? "outline" : "default"}
                    className="rounded-sm transition-colors"
                    disabled={!canAssign || assignmentLocked}
                    title={!canAssign ? "Historical assignments are locked" : assignmentLocked ? "This assignment cannot be changed right now" : undefined}
                    onClick={() => onAssign(course)}
                  >
                    {assigned ? <UserRoundPen /> : <UserRoundPlus />}
                    {assigned ? "Reassign lecturer" : "Assign lecturer"}
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

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}
