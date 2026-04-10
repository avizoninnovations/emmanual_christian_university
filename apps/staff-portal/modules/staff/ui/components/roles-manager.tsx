"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Trash2, Plus, ShieldCheck, Loader2,
  Search, Pencil, MoreHorizontal, Shield,
  Eye, User, Mail
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@workspace/ui/components/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@workspace/ui/components/form";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

const roleSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(2, "Code is required").max(20, "Code too long"),
  description: z.string().optional(),
});

export function RolesManager() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMembersTarget, setViewMembersTarget] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const roles = useQuery(api.roles.getRoles);
  const allStaff = useQuery(api.users.getStaff);
  const createMutation = useMutation(api.roles.createRole);
  const updateMutation = useMutation(api.roles.updateRole);
  const deleteMutation = useMutation(api.roles.deleteRole);
  const seedMutation = useMutation(api.roles.seedDefaultRoles);

  const form = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", code: "", description: "" });
    setSheetOpen(true);
  };

  const openEdit = (role: any) => {
    setEditing(role);
    form.reset({ name: role.name, code: role.code, description: role.description ?? "" });
    setSheetOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof roleSchema>) => {
    try {
      if (editing) {
        await updateMutation({
          id: editing._id,
          name: values.name,
          code: values.code,
          description: values.description
        });
        toast.success("Role updated");
      } else {
        await createMutation(values);
        toast.success("Role created");
      }
      setSheetOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to save role");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation({ id: deleteTarget._id });
      toast.success("Role deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete role");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSeed = async () => {
    try {
      await seedMutation();
      toast.success("Default roles initialized");
    } catch (e: any) {
      toast.error("Failed to seed roles");
    }
  };

  const filtered = roles?.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <ShieldCheck className="size-5" /> System Roles
            </CardTitle>
            <CardDescription>Manage dynamic user roles and permissions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search codes..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {roles?.length === 0 && (
                <Button size="sm" variant="outline" onClick={handleSeed}>Initialize Defaults</Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" /> Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-32">Unique Code</TableHead>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right pr-4 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === undefined ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-sm">No custom roles defined.</TableCell></TableRow>
              ) : (
                filtered.map(role => (
                  <TableRow key={role._id} className="group">
                    <TableCell className="pl-6"><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-semibold">{role.code}</code></TableCell>
                    <TableCell className="font-medium text-sm">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-sm">
                      {role.description || <span className="opacity-40 italic">No description</span>}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="gap-2" onClick={() => setViewMembersTarget(role)}>
                            <Eye className="size-3.5" /> View Members
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2" onClick={() => openEdit(role)}>
                            <Pencil className="size-3.5" /> Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteTarget(role)}>
                            <Trash2 className="size-3.5" /> Delete Role
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Role" : "New System Role"}</SheetTitle>
            <SheetDescription>
              {editing ? "Modify role metadata." : "Define a new custom role for university staff."}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Display Name</FormLabel>
                  <FormControl><Input placeholder="Registrar" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unique Code (ID)</FormLabel>
                  <FormControl><Input placeholder="registrar" className="lowercase font-mono" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input placeholder="Manages student records and admissions" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Role"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed. Staff members currently assigned to this role will lose its associated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── View Members Sheet ── */}
      <Sheet open={!!viewMembersTarget} onOpenChange={open => !open && setViewMembersTarget(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="size-5 text-primary" /> {viewMembersTarget?.name} Members
            </SheetTitle>
            <SheetDescription>
              Personnel currently assigned the {viewMembersTarget?.code} role.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 pr-2 space-y-4 overflow-y-auto  custom-scrollbar">
            {!allStaff ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
            ) : (() => {
              const members = allStaff.filter(s => s.roles?.includes(viewMembersTarget?.code));
              return members.length === 0 ? (
                <div className="text-center py-10 border rounded-lg bg-muted/20">
                  <User className="size-8 mx-auto opacity-20 mb-2" />
                  <p className="text-sm text-muted-foreground">No staff members found with this role.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map(m => (
                    <div key={m._id} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                      <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {m.name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{m.title ? `${m.title} ` : ""}{m.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <Mail className="size-3 opacity-60" /> {m.email}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground pt-2 text-center">Total Members: {members.length}</p>
                </div>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
