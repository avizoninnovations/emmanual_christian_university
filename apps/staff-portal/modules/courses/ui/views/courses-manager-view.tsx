"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
  Sparkles,
  Layers,
  GraduationCap,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@workspace/backend/_generated/dataModel";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { CourseFormDialog } from "../components/course-form-dialog";

export function CoursesManagerView() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [semFilter, setSemFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const departments = useQuery(api.academic.getDepartments, {}) || [];
  const courses = useQuery(api.courses.getCourses, {}) || [];
  const deleteCourse = useMutation(api.courses.deleteCourse);
  const seedCourses = useMutation(api.courses.seedDefaultCourses);

  const filteredCourses = courses.filter((c: any) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.departmentName.toLowerCase().includes(search.toLowerCase()) ||
      c.programName.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === "all" || c.departmentId === deptFilter;
    const matchesYear = yearFilter === "all" || c.yearOfStudy.toString() === yearFilter;
    const matchesSem = semFilter === "all" || c.semester.toString() === semFilter;

    return matchesSearch && matchesDept && matchesYear && matchesSem;
  });

  const totalCredits = courses.reduce((acc: number, c: any) => acc + (c.creditUnits || 0), 0);
  const activeCount = courses.filter((c: any) => c.status === "active").length;

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const res = await seedCourses();
      toast.success(`Successfully seeded ${res.created} demo courses`);
    } catch (err: any) {
      toast.error(err.message || "Failed to seed courses");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCourse({ id: deleteTarget._id as Id<"courses"> });
      toast.success(`Deleted course ${deleteTarget.code}`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete course");
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Course Catalog</h1>
            <Badge variant="outline" className="text-xs">
              {courses.length} courses
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage curriculum units, credit weightings, and program course matrices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {courses.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeed}
              disabled={isSeeding}
              className="gap-2"
            >
              {isSeeding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4 text-amber-500" />
              )}
              Seed Demo Courses
            </Button>
          )}

          <Button
            onClick={() => {
              setEditingCourse(null);
              setFormOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="size-4" /> Add Course
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Total Courses
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
                <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Active in Curriculum
                </p>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Layers className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalCredits}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Cumulative Credit Units
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <GraduationCap className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{departments.length}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Academic Departments
                </p>
              </div>
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Building2 className="size-5" />
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
                placeholder="Search by code, title, department..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-44 h-9 text-xs">
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

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-28 h-9 text-xs">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="1">Year 1</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3</SelectItem>
                  <SelectItem value="4">Year 4</SelectItem>
                </SelectContent>
              </Select>

              <Select value={semFilter} onValueChange={setSemFilter}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
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
                <TableHead>CU</TableHead>
                <TableHead>Department & Program</TableHead>
                <TableHead>Year / Sem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center text-muted-foreground">
                    No courses match the current filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course: any) => (
                  <TableRow key={course._id} className="hover:bg-muted/50">
                    <TableCell className="pl-6 font-mono font-semibold text-sm">
                      {course.code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-foreground">{course.title}</p>
                        {course.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs bg-muted">
                        {course.creditUnits} CU
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{course.departmentName}</p>
                      <p className="text-[11px] text-muted-foreground">{course.programName}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        Year {course.yearOfStudy} : Sem {course.semester}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          course.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                            : "bg-muted text-muted-foreground border-muted-foreground/20"
                        }
                      >
                        {course.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingCourse(course);
                              setFormOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Pencil className="size-4" /> Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(course)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" /> Delete Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        courseToEdit={editingCourse}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course {deleteTarget?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.title}</strong>? This action
              cannot be undone and will affect future allocations and registration rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
