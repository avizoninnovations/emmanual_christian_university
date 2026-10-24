import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import type { Course } from "./course-allocation-card";

export function CourseAllocationTable({ courses, canAssign, onAssign }: {
  courses: Course[];
  canAssign: boolean;
  onAssign: (course: Course) => void;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-sm border bg-card">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Course unit</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Lecturer</TableHead>
            <TableHead>Assignment</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map(course => {
            const assigned = Boolean(course.allocation);
            const assignmentLocked = assigned && course.hasSubmitted;
            return (
              <TableRow key={course._id}>
                <TableCell>
                  <span className="block font-medium">{course.title}</span>
                  <span className="text-xs text-muted-foreground">{course.code} · Year {course.yearOfStudy} · Semester {course.semester}</span>
                </TableCell>
                <TableCell>{course.programName}</TableCell>
                <TableCell>{assigned ? course.lecturerName : <span className="text-muted-foreground">No lecturer assigned</span>}</TableCell>
                <TableCell>
                  <Badge variant={assigned ? "secondary" : "outline"}>{assigned ? "Assigned" : "Unassigned"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={assigned ? "outline" : "default"}
                    className="rounded-sm"
                    disabled={!canAssign || assignmentLocked}
                    title={!canAssign ? "Historical assignments are locked" : assignmentLocked ? "This assignment cannot be changed right now" : undefined}
                    onClick={() => onAssign(course)}
                  >
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
