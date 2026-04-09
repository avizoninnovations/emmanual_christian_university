"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Trash2, Plus, School, Library, GraduationCap, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

// ─────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────

const facultySchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
});

const departmentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required"),
  facultyId: z.string().min(1, "Faculty is required"),
  description: z.string().optional(),
});

const programSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required"),
  departmentId: z.string().min(1, "Department is required"),
  level: z.enum(["Certificate", "Diploma", "Bachelor", "Master"]),
  durationYears: z.coerce.number().min(1).max(7),
  description: z.string().optional(),
});

// ─────────────────────────────────────────────────────────
// MAIN VIEW COMPONENT
// ─────────────────────────────────────────────────────────

export const AcademicStructureView = () => {
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic Structure</h1>
          <p className="text-muted-foreground">Manage Faculties, Departments, and Programs.</p>
        </div>
      </div>

      <Tabs defaultValue="faculties" className="space-y-6">
        <TabsList className="grid w-full sm:w-[500px] grid-cols-3">
          <TabsTrigger value="faculties" className="gap-2">
            <School className="size-4" /> Faculties
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Library className="size-4" /> Departments
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <GraduationCap className="size-4" /> Programs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faculties" className="space-y-4">
          <FacultiesTab />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <DepartmentsTab />
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
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
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const faculties = useQuery(api.academic.getFaculties);
  const createMutation = useMutation(api.academic.createFaculty);
  const deleteMutation = useMutation(api.academic.deleteFaculty);

  const form = useForm<z.infer<typeof facultySchema>>({
    resolver: zodResolver(facultySchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  const onSubmit = async (values: z.infer<typeof facultySchema>) => {
    try {
      await createMutation(values);
      toast.success("Faculty created");
      setIsOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to create faculty");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Delete this faculty?")) return;
    try {
      await deleteMutation({ id });
      toast.success("Faculty deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete faculty");
    }
  };

  const filtered = faculties?.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Faculties</CardTitle>
          <CardDescription>Top-level academic units of the university</CardDescription>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="size-4"/> Add Faculty</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Faculty</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl>
                      <Input placeholder="Faculty of Science" {...field} />
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl>
                      <Input placeholder="FOS" {...field} />
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl>
                      <Input {...field} />
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Faculty
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="pl-6">Code</TableHead>
              <TableHead>Faculty Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered === undefined ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No faculties found.</TableCell></TableRow>
            ) : (
              filtered.map(faculty => (
                <TableRow key={faculty._id}>
                  <TableCell className="pl-6 font-medium">{faculty.code}</TableCell>
                  <TableCell>{faculty.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      {faculty.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(faculty._id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// DEPARTMENTS TAB
// ─────────────────────────────────────────────────────────

function DepartmentsTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const faculties = useQuery(api.academic.getFaculties);
  const departments = useQuery(api.academic.getDepartments, {});
  const createMutation = useMutation(api.academic.createDepartment);
  const deleteMutation = useMutation(api.academic.deleteDepartment);

  const form = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", code: "", facultyId: "", description: "" },
  });

  const onSubmit = async (values: z.infer<typeof departmentSchema>) => {
    try {
      await createMutation({
        name: values.name,
        code: values.code,
        facultyId: values.facultyId as any,
        description: values.description,
      });
      toast.success("Department created");
      setIsOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to create department");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Delete this department?")) return;
    try {
      await deleteMutation({ id });
      toast.success("Department deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete department");
    }
  };

  const filtered = departments?.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Academic units within a Faculty</CardDescription>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="size-4"/> Add Department</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Department</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="facultyId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faculty</FormLabel>
                      <Select disabled={!faculties} onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Computer Science" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="CS" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Department
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="pl-6">Code</TableHead>
              <TableHead>Department Name</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered === undefined ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No departments found.</TableCell></TableRow>
            ) : (
              filtered.map(dept => {
                const facultyName = faculties?.find(f => f._id === dept.facultyId)?.name || "Unknown";
                return (
                  <TableRow key={dept._id}>
                    <TableCell className="pl-6 font-medium">{dept.code}</TableCell>
                    <TableCell>{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">{facultyName}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(dept._id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// PROGRAMS TAB
// ─────────────────────────────────────────────────────────

function ProgramsTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const departments = useQuery(api.academic.getDepartments, {});
  const programs = useQuery(api.academic.getPrograms, {});
  const createMutation = useMutation(api.academic.createProgram);
  const deleteMutation = useMutation(api.academic.deleteProgram);

  const form = useForm<z.infer<typeof programSchema>>({
    resolver: zodResolver(programSchema),
    defaultValues: { name: "", code: "", departmentId: "", level: "Bachelor", durationYears: 3 },
  });

  const onSubmit = async (values: z.infer<typeof programSchema>) => {
    try {
      await createMutation({
        ...values,
        departmentId: values.departmentId as any,
      });
      toast.success("Program created");
      setIsOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to create program");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Delete this program?")) return;
    try {
      await deleteMutation({ id });
      toast.success("Program deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete program");
    }
  };

  const filtered = programs?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Programs</CardTitle>
          <CardDescription>Degrees, Diplomas, and Certificates offered</CardDescription>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="size-4"/> Add Program</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Program</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="departmentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select disabled={!departments} onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
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
                      <FormItem><FormLabel>Duration (Years)</FormLabel>
                        <FormControl><Input type="number" min={1} max={7} {...field} /></FormControl>
                      <FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Program Name</FormLabel><FormControl><Input placeholder="Bachelor of Information Technology" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="BIT" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Program
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="pl-6">Code</TableHead>
              <TableHead>Program Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered === undefined ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No programs found.</TableCell></TableRow>
            ) : (
              filtered.map(program => (
                <TableRow key={program._id}>
                  <TableCell className="pl-6 font-medium">{program.code}</TableCell>
                  <TableCell>{program.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                      {program.level}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{program.durationYears} Years</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(program._id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
