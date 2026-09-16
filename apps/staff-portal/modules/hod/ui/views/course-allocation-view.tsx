"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Layers,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  BookOpen,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export function CourseAllocationView() {
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [allocationStatusFilter, setAllocationStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [updatingCourseId, setUpdatingCourseId] = useState<string | null>(null);

  const departments = useQuery(api.academic.getDepartments, {}) || [];
  const activePeriod = useQuery(api.calendar.getActivePeriod);

  const deptIdArg =
    selectedDeptId === "all" ? undefined : (selectedDeptId as Id<"departments">);

  const allocations =
    useQuery(api.allocations.getDepartmentAllocations, {
      departmentId: deptIdArg,
      periodId: activePeriod?._id,
    }) || [];

  const lecturers =
    useQuery(api.allocations.getDepartmentLecturers, {
      departmentId: deptIdArg,
    }) || [];

  const allocateLecturer = useMutation(api.allocations.allocateLecturerToCourse);
  const deallocateLecturer = useMutation(api.allocations.deallocateLecturer);

  const filteredAllocations = allocations.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.lecturerName.toLowerCase().includes(search.toLowerCase()) ||
      item.programName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      allocationStatusFilter === "all" ||
      (allocationStatusFilter === "allocated" && item.isAllocated) ||
      (allocationStatusFilter === "unallocated" && !item.isAllocated);

    return matchesSearch && matchesStatus;
  });

  const totalCourses = allocations.length;
  const allocatedCount = allocations.filter((a) => a.isAllocated).length;
  const unallocatedCount = totalCourses - allocatedCount;

  const handleAssign = async (courseId: string, lecturerId: string) => {
    if (!activePeriod) {
      toast.error("No active academic period configured.");
      return;
    }

    try {
      setUpdatingCourseId(courseId);
      await allocateLecturer({
        courseId: courseId as Id<"courses">,
        lecturerId,
        periodId: activePeriod._id,
      });
      toast.success("Lecturer assigned to course");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign course");
    } finally {
      setUpdatingCourseId(null);
    }
  };

  const handleRemove = async (allocationId: string) => {
    try {
      await deallocateLecturer({
        allocationId: allocationId as Id<"courseAllocations">,
      });
      toast.success("Course allocation removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to deallocate course");
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Course Teaching Allocations</h1>
            <Badge variant="outline" className="text-xs">
              HOD Management
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Assign departmental teaching faculty to semester course units for{" "}
            <strong>{activePeriod?.name || "Active Academic Period"}</strong>.
          </p>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Department Units
                </p>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{allocatedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Allocated to Lecturers
                </p>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{unallocatedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Unallocated Units
                </p>
              </div>
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <AlertTriangle className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{lecturers.length}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Available Teaching Staff
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Users className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses, lecturers, programs..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger className="w-52 h-9 text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.code} - {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={allocationStatusFilter}
                onValueChange={setAllocationStatusFilter}
              >
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="unallocated">Unallocated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-32">Course Code</TableHead>
                <TableHead>Course Title</TableHead>
                <TableHead>Department / Program</TableHead>
                <TableHead>Year / Sem</TableHead>
                <TableHead className="w-72">Assigned Lecturer</TableHead>
                <TableHead className="text-right pr-6 w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAllocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No course units found for allocation in this selection.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAllocations.map((item) => (
                  <TableRow key={item.courseId} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-mono font-bold text-sm">
                      {item.code}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {item.creditUnits} Credit Units
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{item.departmentName}</p>
                      <p className="text-[11px] text-muted-foreground">{item.programName}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        Year {item.yearOfStudy} : Sem {item.semester}
                      </Badge>
                    </TableCell>

                    {/* Lecturer Assignment Dropdown */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={item.lecturerId || "unassigned"}
                          onValueChange={(val) => {
                            if (val !== "unassigned") {
                              handleAssign(item.courseId, val);
                            }
                          }}
                          disabled={updatingCourseId === item.courseId}
                        >
                          <SelectTrigger className="h-8 text-xs w-full bg-background">
                            <SelectValue placeholder="Assign Instructor..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" disabled>
                              -- Select Lecturer --
                            </SelectItem>
                            {lecturers.map((lec) => (
                              <SelectItem key={lec.userId} value={lec.userId}>
                                {lec.name} ({lec.staffId || "Staff"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {updatingCourseId === item.courseId && (
                          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                        )}
                      </div>
                    </TableCell>

                    {/* Action button */}
                    <TableCell className="text-right pr-6">
                      {item.isAllocated && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(item.allocationId!)}
                          title="Unassign Lecturer"
                          className="size-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
