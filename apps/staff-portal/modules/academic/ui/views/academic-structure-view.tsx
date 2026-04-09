"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Trash2, Plus, School, Library, GraduationCap, Loader2,
  Search, Pencil, MoreHorizontal, Building2, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@workspace/ui/components/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@workspace/ui/components/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@workspace/ui/components/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

// ─────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────

const facultySchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
  description: z.string().optional(),
});

const departmentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
  facultyId: z.string().min(1, "Faculty is required"),
  description: z.string().optional(),
});

const programSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
  departmentId: z.string().min(1, "Department is required"),
  level: z.enum(["Certificate", "Diploma", "Bachelor", "Master"]),
  durationYears: z.coerce.number().min(1).max(7),
  description: z.string().optional(),
});

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "active"
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
          : "bg-muted text-muted-foreground"
      }
    >
      {status}
    </Badge>
  );
}

function LevelBadge({ level }: { level: string }) {
  const colours: Record<string, string> = {
    Bachelor: "bg-primary/10 text-primary border-primary/20",
    Diploma: "bg-amber-500/10 text-amber-600 border-amber-200",
    Certificate: "bg-blue-500/10 text-blue-600 border-blue-200",
    Master: "bg-purple-500/10 text-purple-600 border-purple-200",
  };
  return (
    <Badge variant="outline" className={colours[level] ?? ""}>
      {level}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN VIEW
// ─────────────────────────────────────────────────────────

export const AcademicStructureView = () => {
  const faculties = useQuery(api.academic.getFaculties);
  const departments = useQuery(api.academic.getDepartments, {});
  const programs = useQuery(api.academic.getPrograms, {});

  const facultyCount = faculties?.length ?? 0;
  const deptCount = departments?.length ?? 0;
  const programCount = programs?.length ?? 0;

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Academic Structure</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the university's faculties, departments, and academic programs.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <School className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{faculties === undefined ? "—" : facultyCount}</p>
                <p className="text-xs text-muted-foreground">Faculties</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments === undefined ? "—" : deptCount}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{programs === undefined ? "—" : programCount}</p>
                <p className="text-xs text-muted-foreground">Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="faculties" className="space-y-6">
        <TabsList className="grid w-full sm:w-[480px] grid-cols-3">
          <TabsTrigger value="faculties" className="gap-2">
            <School className="size-3.5" /> Faculties
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="size-3.5" /> Departments
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <BookOpen className="size-3.5" /> Programs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faculties">
          <FacultiesTab />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="programs">
          <ProgramsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// FACULTIES TAB
// ─────────────────────────────────────────────────────────

function FacultiesTab() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const faculties = useQuery(api.academic.getFaculties);
  const createMutation = useMutation(api.academic.createFaculty);
  const updateMutation = useMutation(api.academic.updateFaculty);
  const deleteMutation = useMutation(api.academic.deleteFaculty);

  const form = useForm<z.infer<typeof facultySchema>>({
    resolver: zodResolver(facultySchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", code: "", description: "" });
    setSheetOpen(true);
  };

  const openEdit = (faculty: any) => {
    setEditing(faculty);
    form.reset({ name: faculty.name, code: faculty.code, description: faculty.description ?? "" });
    setSheetOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof facultySchema>) => {
    try {
      if (editing) {
        await updateMutation({ id: editing._id, ...values });
        toast.success("Faculty updated");
      } else {
        await createMutation(values);
        toast.success("Faculty created");
      }
      setSheetOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to save faculty");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation({ id: deleteTarget._id });
      toast.success("Faculty deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete faculty");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = faculties?.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Faculties</CardTitle>
            <CardDescription>Top-level academic units of the university</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" /> Add Faculty
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-24">Code</TableHead>
                <TableHead>Faculty Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === undefined ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">No faculties yet. Add one to get started.</TableCell></TableRow>
              ) : (
                filtered.map(faculty => (
                  <TableRow key={faculty._id} className="group">
                    <TableCell className="pl-6 font-mono text-sm font-medium">{faculty.code}</TableCell>
                    <TableCell className="font-medium">{faculty.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {faculty.description || "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={faculty.status} /></TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => openEdit(faculty)}>
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteTarget(faculty)}>
                            <Trash2 className="size-3.5" /> Delete
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

      {/* ── Create / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Faculty" : "New Faculty"}</SheetTitle>
            <SheetDescription>
              {editing ? "Update the faculty details below." : "Fill in the details to add a new faculty."}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty Name</FormLabel>
                  <FormControl><Input placeholder="Faculty of Theology" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl><Input placeholder="FOT" className="uppercase" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Faculty"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faculty?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently deleted. This cannot be undone.
              Faculties with departments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// DEPARTMENTS TAB
// ─────────────────────────────────────────────────────────

function DepartmentsTab() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const faculties = useQuery(api.academic.getFaculties);
  const departments = useQuery(api.academic.getDepartments, {});
  const createMutation = useMutation(api.academic.createDepartment);
  const updateMutation = useMutation(api.academic.updateDepartment);
  const deleteMutation = useMutation(api.academic.deleteDepartment);

  const form = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", code: "", facultyId: "", description: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", code: "", facultyId: "", description: "" });
    setSheetOpen(true);
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    form.reset({ name: dept.name, code: dept.code, facultyId: dept.facultyId, description: dept.description ?? "" });
    setSheetOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof departmentSchema>) => {
    try {
      if (editing) {
        await updateMutation({ id: editing._id, name: values.name, code: values.code, facultyId: values.facultyId as any, description: values.description });
        toast.success("Department updated");
      } else {
        await createMutation({ name: values.name, code: values.code, facultyId: values.facultyId as any, description: values.description });
        toast.success("Department created");
      }
      setSheetOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to save department");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation({ id: deleteTarget._id });
      toast.success("Department deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete department");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = departments?.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  const facultyMap = new Map(faculties?.map(f => [f._id, f]) ?? []);

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Departments</CardTitle>
            <CardDescription>Academic units within a Faculty</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" /> Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-24">Code</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === undefined ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">No departments yet. Add one to get started.</TableCell></TableRow>
              ) : (
                filtered.map(dept => {
                  const faculty = facultyMap.get(dept.facultyId);
                  return (
                    <TableRow key={dept._id} className="group">
                      <TableCell className="pl-6 font-mono text-sm font-medium">{dept.code}</TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>
                        {faculty ? (
                          <Badge variant="outline" className="text-xs">
                            {faculty.code} — {faculty.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={dept.status} /></TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="gap-2" onClick={() => openEdit(dept)}>
                              <Pencil className="size-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteTarget(dept)}>
                              <Trash2 className="size-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Department" : "New Department"}</SheetTitle>
            <SheetDescription>
              {editing ? "Update the department details below." : "Fill in the details to create a new department."}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
              <FormField control={form.control} name="facultyId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty</FormLabel>
                  <Select disabled={!faculties} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!faculties ? "Loading..." : "Select a Faculty"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {faculties?.map(f => (
                        <SelectItem key={f._id} value={f._id}>{f.name} ({f.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl><Input placeholder="Business Administration" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl><Input placeholder="BA" className="uppercase" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Department"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently deleted. Departments with programs cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// PROGRAMS TAB
// ─────────────────────────────────────────────────────────

function ProgramsTab() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const departments = useQuery(api.academic.getDepartments, {});
  const faculties = useQuery(api.academic.getFaculties);
  const programs = useQuery(api.academic.getPrograms, {});
  const createMutation = useMutation(api.academic.createProgram);
  const updateMutation = useMutation(api.academic.updateProgram);
  const deleteMutation = useMutation(api.academic.deleteProgram);

  const form = useForm<z.infer<typeof programSchema>>({
    resolver: zodResolver(programSchema),
    defaultValues: { name: "", code: "", departmentId: "", level: "Bachelor", durationYears: 4 },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", code: "", departmentId: "", level: "Bachelor", durationYears: 4 });
    setSheetOpen(true);
  };

  const openEdit = (program: any) => {
    setEditing(program);
    form.reset({
      name: program.name,
      code: program.code,
      departmentId: program.departmentId,
      level: program.level,
      durationYears: program.durationYears,
      description: program.description ?? "",
    });
    setSheetOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof programSchema>) => {
    try {
      if (editing) {
        await updateMutation({ id: editing._id, ...values, departmentId: values.departmentId as any });
        toast.success("Program updated");
      } else {
        await createMutation({ ...values, departmentId: values.departmentId as any });
        toast.success("Program created");
      }
      setSheetOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to save program");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation({ id: deleteTarget._id });
      toast.success("Program deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete program");
    } finally {
      setDeleteTarget(null);
    }
  };

  const deptMap = new Map(departments?.map(d => [d._id, d]) ?? []);
  const facultyMap = new Map(faculties?.map(f => [f._id, f]) ?? []);

  const filtered = programs?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || p.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Programs</CardTitle>
            <CardDescription>Degrees, Diplomas, and Certificates offered by ECU</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-52 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Certificate">Certificate</SelectItem>
                <SelectItem value="Diploma">Diploma</SelectItem>
                <SelectItem value="Bachelor">Bachelor</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" /> Add Program
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-24">Code</TableHead>
                <TableHead>Program Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right pr-4 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === undefined ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">No programs found.</TableCell></TableRow>
              ) : (
                filtered.map(program => {
                  const dept = deptMap.get(program.departmentId);
                  const faculty = dept ? facultyMap.get(dept.facultyId) : undefined;
                  return (
                    <TableRow key={program._id} className="group">
                      <TableCell className="pl-6 font-mono text-sm font-medium">{program.code}</TableCell>
                      <TableCell className="font-medium">{program.name}</TableCell>
                      <TableCell><LevelBadge level={program.level} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dept?.name ?? "—"}
                        {faculty && <span className="text-xs opacity-60 ml-1">({faculty.code})</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{program.durationYears} yr{program.durationYears > 1 ? "s" : ""}</TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="gap-2" onClick={() => openEdit(program)}>
                              <Pencil className="size-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteTarget(program)}>
                              <Trash2 className="size-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Program" : "New Program"}</SheetTitle>
            <SheetDescription>
              {editing ? "Update the program details below." : "Fill in the details to create a new program."}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
              <FormField control={form.control} name="departmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select disabled={!departments} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!departments ? "Loading..." : "Select a Department"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {departments?.map(d => (
                        <SelectItem key={d._id} value={d._id}>{d.name} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="level" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Certificate">Certificate</SelectItem>
                        <SelectItem value="Diploma">Diploma</SelectItem>
                        <SelectItem value="Bachelor">Bachelor</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="durationYears" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Years)</FormLabel>
                    <FormControl><Input type="number" min={1} max={7} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Name</FormLabel>
                  <FormControl><Input placeholder="Bachelor of Business Administration" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl><Input placeholder="BBA" className="uppercase" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Program"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
