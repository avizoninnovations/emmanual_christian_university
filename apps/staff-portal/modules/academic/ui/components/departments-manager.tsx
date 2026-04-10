"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Trash2, Plus, Building2, Loader2,
  Search, Pencil, MoreHorizontal, Eye, School, UserCog, User
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@workspace/ui/components/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
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

import { departmentSchema, StatusBadge } from "./shared";

export function DepartmentsManager() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const faculties = useQuery(api.academic.getFaculties);
  const departments = useQuery(api.academic.getDepartments, {});
  const programs = useQuery(api.academic.getPrograms, {});
  const staff = useQuery(api.users.getStaff);
  
  const createMutation = useMutation(api.academic.createDepartment);
  const updateMutation = useMutation(api.academic.updateDepartment);
  const deleteMutation = useMutation(api.academic.deleteDepartment);

  // Filter programs for the viewed department
  const deptPrograms = programs?.filter(p => p.departmentId === viewing?._id) ?? [];

  const form = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", code: "", facultyId: "", hodId: "", description: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", code: "", facultyId: "", hodId: "", description: "" });
    setSheetOpen(true);
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    form.reset({ 
       name: dept.name, 
       code: dept.code, 
       facultyId: dept.facultyId, 
       hodId: dept.hodId ?? "",
       description: dept.description ?? "" 
    });
    setSheetOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof departmentSchema>) => {
    try {
      if (editing) {
        await updateMutation({ 
          id: editing._id, 
          name: values.name, 
          code: values.code, 
          facultyId: values.facultyId as any, 
          hodId: (values.hodId && values.hodId !== "none") ? values.hodId : undefined,
          description: values.description 
        });
        toast.success("Department updated");
      } else {
        await createMutation({ 
          name: values.name, 
          code: values.code, 
          facultyId: values.facultyId as any, 
          hodId: (values.hodId && values.hodId !== "none") ? values.hodId : undefined,
          description: values.description 
        });
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
  const staffMap = new Map(staff?.map(s => [s._id, s]) ?? []);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <Building2 className="size-5" /> Departments
            </CardTitle>
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
                <TableHead>HOD</TableHead>
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
                      <TableCell>
                        {dept.hodId ? (
                           <div className="flex items-center gap-2">
                             <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {staffMap.get(dept.hodId)?.name?.charAt(0) ?? "H"}
                             </div>
                             <span className="text-sm font-medium">{staffMap.get(dept.hodId)?.name ?? "Unknown"}</span>
                           </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Not assigned</span>
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
                          <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem className="gap-2" onClick={() => { setViewing(dept); setViewOpen(true); }}>
                            <Eye className="size-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
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
              <FormField control={form.control} name="hodId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Head of Department (HOD)</FormLabel>
                  <Select disabled={!staff} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!staff ? "Loading Staff..." : "Select HOD"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No HOD assigned</SelectItem>
                      {staff?.map(s => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name} ({s.staffId || "No ID"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      {/* ── View Details Sheet ── */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="sm:max-w-xl">
           <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                 <Building2 className="size-5 text-primary" />
                 Department Details
              </SheetTitle>
              <SheetDescription>
                 Hierarchical structure and active programs for {viewing?.name}
              </SheetDescription>
           </SheetHeader>
           
           {viewing && (
              <ScrollArea className="h-[calc(100vh-140px)] pr-4 mt-6">
                 <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                       <Card className="border shadow-none bg-muted/20">
                          <CardContent className="p-4">
                             <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Code</p>
                             <p className="font-mono font-bold text-lg">{viewing.code}</p>
                          </CardContent>
                       </Card>
                       <Card className="border shadow-none bg-muted/20">
                          <CardContent className="p-4">
                             <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Status</p>
                             <StatusBadge status={viewing.status} />
                          </CardContent>
                       </Card>
                    </div>

                    <div className="space-y-3">
                       <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Leadership</p>
                       {(() => {
                          const hod = viewing.hodId ? staffMap.get(viewing.hodId) : null;
                          return hod ? (
                            <div className="flex items-center gap-4 p-4 rounded-xl border bg-primary/[0.02] border-primary/10">
                               <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                  <UserCog className="size-6" />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-foreground leading-tight">{hod.name}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">Official Head of Department</p>
                                  <div className="flex items-center gap-3 mt-2">
                                     <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{hod.staffId || "ECU-STAFF"}</Badge>
                                     <span className="text-[10px] text-muted-foreground">{hod.email}</span>
                                  </div>
                               </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center gap-2">
                               <User className="size-5 text-muted-foreground/50" />
                               <p className="text-xs text-muted-foreground italic text-center">No Head of Department assigned to this unit yet.</p>
                            </div>
                          );
                       })()}
                    </div>

                    <div className="space-y-2">
                       <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Parent Faculty</p>
                       {(() => {
                          const faculty = facultyMap.get(viewing.facultyId);
                          return faculty ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/[0.03] border-primary/10">
                               <School className="size-4 text-primary" />
                               <p className="text-sm font-semibold">{faculty.name} ({faculty.code})</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">—</p>
                          );
                       })()}
                    </div>

                    <div className="space-y-2">
                       <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">About</p>
                       <p className="text-sm leading-relaxed text-foreground/80 bg-muted/10 p-4 rounded-lg border italic">
                          {viewing.description || "No description provided for this department."}
                       </p>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Programs ({deptPrograms.length})</p>
                       </div>
                       <div className="border rounded-xl overflow-hidden shadow-inner bg-background/50">
                          <Table>
                             <TableHeader className="bg-muted/30">
                                <TableRow>
                                   <TableHead className="text-[10px] uppercase font-bold py-2">Code</TableHead>
                                   <TableHead className="text-[10px] uppercase font-bold py-2">Program Name</TableHead>
                                   <TableHead className="text-[10px] uppercase font-bold py-2">Level</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {deptPrograms.length === 0 ? (
                                  <TableRow>
                                     <TableCell colSpan={3} className="h-20 text-center text-muted-foreground text-xs italic">
                                        No programs found in this department.
                                     </TableCell>
                                  </TableRow>
                                ) : (
                                  deptPrograms.map(p => (
                                    <TableRow key={p._id}>
                                       <TableCell className="font-mono text-xs">{p.code}</TableCell>
                                       <TableCell className="text-xs font-semibold">{p.name}</TableCell>
                                       <TableCell><StatusBadge status={p.level} /></TableCell>
                                    </TableRow>
                                  ))
                                )}
                             </TableBody>
                          </Table>
                       </div>
                    </div>
                 </div>
              </ScrollArea>
           )}
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
    </div>
  );
}
