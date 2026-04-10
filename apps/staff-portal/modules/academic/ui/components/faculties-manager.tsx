"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Trash2, Plus, School, Loader2,
  Search, Pencil, MoreHorizontal, Eye, Info, UserCog, User
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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

import { facultySchema, StatusBadge } from "./shared";
import { Badge } from "@workspace/ui/components/badge";

export function FacultiesManager() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const faculties = useQuery(api.academic.getFaculties);
  const departments = useQuery(api.academic.getDepartments, {});
  const staff = useQuery(api.users.getStaff);

  const createMutation = useMutation(api.academic.createFaculty);
  const updateMutation = useMutation(api.academic.updateFaculty);
  const deleteMutation = useMutation(api.academic.deleteFaculty);

  // Filter departments for the viewed faculty
  const facultyDepts = departments?.filter(d => d.facultyId === viewing?._id) ?? [];

  const form = useForm<z.infer<typeof facultySchema>>({
    resolver: zodResolver(facultySchema),
    defaultValues: { name: "", code: "", deanId: "", description: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", code: "", deanId: "", description: "" });
    setSheetOpen(true);
  };

  const openEdit = (faculty: any) => {
    setEditing(faculty);
    form.reset({ 
      name: faculty.name, 
      code: faculty.code, 
      deanId: faculty.deanId ?? "",
      description: faculty.description ?? "" 
    });
    setSheetOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof facultySchema>) => {
    try {
      if (editing) {
        await updateMutation({ 
           id: editing._id, 
           name: values.name,
           code: values.code,
           deanId: (values.deanId && values.deanId !== "none") ? values.deanId : undefined,
           description: values.description
        });
        toast.success("Faculty updated");
      } else {
        await createMutation({
           name: values.name,
           code: values.code,
           deanId: (values.deanId && values.deanId !== "none") ? values.deanId : undefined,
           description: values.description
        });
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

  const staffMap = new Map(staff?.map(s => [s._id, s]) ?? []);

  const filtered = faculties?.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <School className="size-5" /> Faculties
            </CardTitle>
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
                <TableHead>Dean</TableHead>
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
                    <TableCell>
                      {faculty.deanId ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {staffMap.get(faculty.deanId)?.name?.charAt(0) ?? "D"}
                          </div>
                          <span className="text-sm font-medium leading-none">{staffMap.get(faculty.deanId)?.name ?? "Unknown"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={faculty.status} /></TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem className="gap-2" onClick={() => { setViewing(faculty); setViewOpen(true); }}>
                            <Eye className="size-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
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
              <FormField control={form.control} name="deanId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty Dean</FormLabel>
                  <Select disabled={!staff} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!staff ? "Loading Staff..." : "Select Dean"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Dean assigned</SelectItem>
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
                {editing ? "Save Changes" : "Create Faculty"}
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
                 <School className="size-5 text-primary" />
                 Faculty Details
              </SheetTitle>
              <SheetDescription>
                 Detailed information and children units for {viewing?.name}
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
                          const dean = viewing.deanId ? staffMap.get(viewing.deanId) : null;
                          return dean ? (
                            <div className="flex items-center gap-4 p-4 rounded-xl border bg-primary/[0.02] border-primary/10">
                               <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                  <UserCog className="size-6" />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-foreground leading-tight">{dean.name}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">Faculty Dean</p>
                                  <div className="flex items-center gap-3 mt-2">
                                     <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{dean.staffId || "ECU-STAFF"}</Badge>
                                     <span className="text-[10px] text-muted-foreground">{dean.email}</span>
                                  </div>
                               </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center gap-2">
                               <User className="size-5 text-muted-foreground/50" />
                               <p className="text-xs text-muted-foreground italic text-center">No Dean assigned to this faculty yet.</p>
                            </div>
                          );
                       })()}
                    </div>

                    <div className="space-y-2">
                       <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">About</p>
                       <p className="text-sm leading-relaxed text-foreground/80 bg-muted/10 p-4 rounded-lg border italic">
                          {viewing.description || "No description provided for this faculty."}
                       </p>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Departments ({facultyDepts.length})</p>
                       </div>
                       <div className="border rounded-xl overflow-hidden shadow-inner bg-background/50">
                          <Table>
                             <TableHeader className="bg-muted/30">
                                <TableRow>
                                   <TableHead className="text-[10px] uppercase font-bold py-2">Code</TableHead>
                                   <TableHead className="text-[10px] uppercase font-bold py-2">Department Name</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {facultyDepts.length === 0 ? (
                                  <TableRow>
                                     <TableCell colSpan={2} className="h-20 text-center text-muted-foreground text-xs italic">
                                        No departments found in this faculty.
                                     </TableCell>
                                  </TableRow>
                                ) : (
                                  facultyDepts.map(d => (
                                    <TableRow key={d._id}>
                                       <TableCell className="font-mono text-xs">{d.code}</TableCell>
                                       <TableCell className="text-xs font-semibold">{d.name}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                             </TableBody>
                          </Table>
                       </div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
                       <Info className="size-4 text-muted-foreground mt-0.5" />
                       <p className="text-[11px] text-muted-foreground leading-normal">
                          Faculties are top-level academic containers. You can manage their individual departments in the <strong>Departments</strong> tab.
                       </p>
                    </div>
                 </div>
              </ScrollArea>
           )}
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
    </div>
  );
}
