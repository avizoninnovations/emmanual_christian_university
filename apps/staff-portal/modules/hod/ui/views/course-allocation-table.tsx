import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { BookOpen, UserRound, UserRoundPen, UserRoundPlus } from "lucide-react";
import { AssignmentLockInfo } from "../components/assignment-lock-info";
import type { Course } from "./course-allocation-card";

export function CourseAllocationTable({ courses, canAssign, periodStatus, onAssign }: {
  courses: Course[];
  canAssign: boolean;
  periodStatus?: string;
  onAssign: (course: Course) => void;
}) {
  return (
    <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14 pl-5">No.</TableHead>
            <TableHead>Course unit</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Assigned lecturer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-5 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course, index) => {
            const assigned = Boolean(course.allocation);
            const assignmentLocked = course.hasSubmitted;
            return (
              <TableRow key={course._id} className="group transition-colors hover:bg-muted/25">
                <TableCell className="py-4 pl-5 font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="py-4">
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
                  <div className="flex items-center justify-end gap-1">
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
                    <AssignmentLockInfo submittedMarks={assignmentLocked} periodLocked={!canAssign} periodStatus={periodStatus} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
    </Table>
  );
}

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}
