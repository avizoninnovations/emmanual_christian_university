"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Trash2, UserPlus, Users, ShieldCheck, Search, Mail,
  Shield, Loader2, Pencil, Phone, MoreHorizontal, Activity,
  Ban, Gavel, Calendar, Info
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@workspace/ui/components/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@workspace/ui/components/form";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

// ─────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────

const staffSchema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName:  z.string().min(2, "Required"),
  email:     z.string().email("Invalid email"),
  roles:     z.array(z.string()).min(1, "Select at least one role"),
  title:     z.string().optional(),
  phone:     z.string().optional(),
  password:  z.string().min(6, "Min 6 characters").optional().or(z.literal("")),
});

const editSchema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName:  z.string().min(2, "Required"),
  email:     z.string().email("Invalid email"),
  roles:    z.array(z.string()).min(1, "Select at least one role"),
  title:    z.string().optional(),
  phone:    z.string().optional(),
  status:   z.enum(["active", "inactive"]),
});

const banSchema = z.object({
  reason:  z.string().min(5, "Please provide a more detailed reason (min 5 chars)"),
  expires: z.string().optional(), // Date string from picker
  indefinite: z.boolean(),
});

type StaffFormValues = z.infer<typeof staffSchema>;
type EditFormValues  = z.infer<typeof editSchema>;
type BanFormValues  = z.infer<typeof banSchema>;

const ROLE_BADGE: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  staff:     "bg-sky-500/10 text-sky-600 border-sky-200",
  registrar: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  finance:   "bg-amber-500/10 text-amber-600 border-amber-200",
  hod:       "bg-rose-500/10 text-rose-600 border-rose-200",
  dean:      "bg-indigo-500/10 text-indigo-600 border-indigo-200",
};

interface StaffListManagerProps {
  statusFilter: "active" | "inactive";
}

export function StaffListManager({ statusFilter }: StaffListManagerProps) {
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]   = useState("all");
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [banTarget, setBanTarget]     = useState<any | null>(null);

  const staff             = useQuery(api.users.getStaff);
  const systemRoles       = useQuery(api.roles.getRoles);
  const createStaffAction = useAction(api.users.createStaff);
  const updateStaff       = useMutation(api.users.updateStaff);
  const deleteStaff       = useMutation(api.users.deleteStaff);
  const banStaff          = useAction(api.users.banStaff);
  const unbanStaff        = useAction(api.users.unbanStaff);

  // ── Create form ──
  const createForm = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { firstName: "", lastName: "", email: "", roles: ["staff"], title: "", phone: "", password: "" },
  });

  const onCreateSubmit = async (values: StaffFormValues) => {
    try {
      await createStaffAction({
        firstName: values.firstName,
        lastName:  values.lastName,
        email:     values.email,
        roles:     values.roles,
        title:     values.title  || undefined,
        phone:     values.phone  || undefined,
        password:  values.password || undefined,
      });
      toast.success("Staff member created");
      setCreateOpen(false);
      createForm.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to create staff member");
    }
  };

  // ── Edit form ──
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { roles: ["staff"], title: "", phone: "", status: "active" },
  });

  const openEdit = (person: any) => {
    setEditTarget(person);
    const existingName = person.name || "";
    const split = existingName.split(" ");
    const first = split[0] || "";
    const last = split.slice(1).join(" ") || "";

    editForm.reset({
      firstName: first,
      lastName: last,
      email: person.email || "",
      roles:  person.roles ?? ["staff"],
      title:  person.title  ?? "",
      phone:  person.phone  ?? "",
      status: person.profileStatus === "inactive" ? "inactive" : "active",
    });
  };

  const onEditSubmit = async (values: EditFormValues) => {
    if (!editTarget) return;
    try {
      await updateStaff({
        userId: editTarget._id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        roles:  values.roles,
        title:  values.title  || undefined,
        phone:  values.phone  || undefined,
        status: values.status,
      });
      toast.success("Staff member updated");
      setEditTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update staff member");
    }
  };

  // ── Ban ──
  const banForm = useForm<BanFormValues>({
    resolver: zodResolver(banSchema),
    defaultValues: { reason: "", indefinite: true, expires: "" },
  });

  const onBanSubmit = async (values: BanFormValues) => {
    if (!banTarget) return;
    try {
      await banStaff({
        userId:  banTarget._id,
        reason:  values.reason,
        expires: values.indefinite ? undefined : (values.expires ? new Date(values.expires).getTime() : undefined),
      });
      toast.success("Staff member banned and logged out");
      setBanTarget(null);
      banForm.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to ban staff");
    }
  };

  const handleUnban = async (person: any) => {
    try {
      await unbanStaff({ userId: person._id });
      toast.success("Ban lifted. Member is now active.");
    } catch (e: any) {
      toast.error(e.message || "Failed to lift ban");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStaff({ id: deleteTarget._id });
      toast.success("Staff member removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove staff member");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Filter ──
  const filtered = staff?.filter((s: any) => {
    const matchStatus = s.profileStatus === statusFilter;
    const matchSearch = `${s.name} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "all" || s.roles?.includes(roleFilter);
    return matchStatus && matchSearch && matchRole;
  });

  const stats = {
    total:  staff?.length ?? 0,
    admins: staff?.filter((s: any) => s.roles?.includes("admin")).length ?? 0,
    active: staff?.filter((s: any) => s.profileStatus !== "inactive").length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Personnel",  value: stats.total,  sub: "University members",   icon: Users,       },
          { label: "Administrators",   value: stats.admins, sub: "With admin access",     icon: ShieldCheck, },
          { label: "Active Members",   value: stats.active, sub: "Currently active",      icon: Activity,    },
        ].map(s => (
          <Card key={s.label} className="border shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{staff === undefined ? "—" : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {statusFilter === "active" ? "Active" : "Inactive"} Personnel ({filtered?.length ?? "..."})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search staff..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {systemRoles?.map(r => (
                    <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusFilter === "active" && (
                <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                    <UserPlus className="size-4" /> Add Staff
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right pr-4 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === undefined ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">No staff members found.</TableCell></TableRow>
              ) : (
                filtered.map((person: any) => (
                  <TableRow key={person._id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                          {(person.name || "?")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {person.title ? `${person.title} ` : ""}{person.name}
                          </p>
                          {person.staffNumber && (
                            <p className="text-[11px] text-muted-foreground">{person.staffNumber}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(person.roles || []).map((role: string) => (
                          <Badge key={role} variant="outline" className={cn("text-[10px] capitalize", ROLE_BADGE[role] ?? "")}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3 opacity-60" />{person.email}
                        </div>
                        {person.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="size-3 opacity-60" />{person.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className={
                          statusFilter === "inactive"
                            ? "bg-muted text-muted-foreground"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                        }>
                          {statusFilter === "inactive" ? "Inactive" : "Active"}
                        </Badge>
                        {person.banned && (
                           <Badge variant="destructive" className="text-[10px] py-0 h-4 flex items-center gap-1">
                             <Ban className="size-2.5" /> BANNED
                           </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(person._creationTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => openEdit(person)}>
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {statusFilter === "active" ? (
                             <DropdownMenuItem className="gap-2 text-warning" onClick={() => setBanTarget(person)}>
                               <Gavel className="size-3.5" /> Ban Personnel
                             </DropdownMenuItem>
                          ) : (
                            person.banned && (
                              <DropdownMenuItem className="gap-2 text-emerald-600" onClick={() => handleUnban(person)}>
                                <Activity className="size-3.5" /> Lift Ban
                              </DropdownMenuItem>
                            )
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteTarget(person)}>
                            <Trash2 className="size-3.5" /> Remove
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

      {/* ── Create Sheet ── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Staff Member</SheetTitle>
            <SheetDescription>Create a new account for university personnel.</SheetDescription>
          </SheetHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5 mt-6 pb-8">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={createForm.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={createForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="j.doe@ecu-ssd.org" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={createForm.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title <span className="text-muted-foreground font-normal">(opt)</span></FormLabel><FormControl><Input placeholder="Dr., Prof." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone <span className="text-muted-foreground font-normal">(opt)</span></FormLabel><FormControl><Input placeholder="+211 ..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={createForm.control} name="roles" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Roles</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value?.length && "text-muted-foreground")}>
                          {field.value?.length > 0 ? `${field.value.length} Role(s) Selected` : "Select roles"}
                          <MoreHorizontal className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]">
                      {!systemRoles ? (
                        <div className="p-2 text-sm text-muted-foreground"><Loader2 className="size-3 animate-spin"/> Loading...</div>
                      ) : (
                        systemRoles.map(role => (
                          <DropdownMenuCheckboxItem
                            key={role.code}
                            checked={field.value?.includes(role.code)}
                            onCheckedChange={(checked) => {
                               const cur = field.value || [];
                               field.onChange(checked ? [...cur, role.code] : cur.filter(v => v !== role.code));
                            }}
                          >
                            <div className="flex flex-col gap-0.5 max-w-[250px]">
                              <span>{role.name}</span>
                              {role.description && <span className="text-[10px] text-muted-foreground leading-tight truncate overflow-hidden">{role.description}</span>}
                            </div>
                          </DropdownMenuCheckboxItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={createForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Password <span className="text-muted-foreground font-normal">(opt — default: UniSystem2026!)</span></FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* ── Edit Sheet ── */}
      <Sheet open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Staff Member</SheetTitle>
            <SheetDescription>{editTarget?.name}</SheetDescription>
          </SheetHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5 mt-6 pb-8">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="j.doe@ecu-ssd.org" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Dr., Prof." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+211 ..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="roles" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Roles</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value?.length && "text-muted-foreground")}>
                          {field.value?.length > 0 ? `${field.value.length} Role(s) Selected` : "Select roles"}
                          <MoreHorizontal className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]">
                      {!systemRoles ? (
                        <div className="p-2 text-sm text-muted-foreground"><Loader2 className="size-3 animate-spin"/> Loading...</div>
                      ) : (
                        systemRoles.map(role => (
                          <DropdownMenuCheckboxItem
                            key={role.code}
                            checked={field.value?.includes(role.code)}
                            onCheckedChange={(checked) => {
                               const cur = field.value || [];
                               field.onChange(checked ? [...cur, role.code] : cur.filter(v => v !== role.code));
                            }}
                          >
                            <div className="flex flex-col gap-0.5 max-w-[250px]">
                              <span>{role.name}</span>
                              {role.description && <span className="text-[10px] text-muted-foreground leading-tight truncate overflow-hidden">{role.description}</span>}
                            </div>
                          </DropdownMenuCheckboxItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Ban Sheet ── */}
      <Sheet open={!!banTarget} onOpenChange={open => !open && setBanTarget(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Gavel className="size-5 text-destructive" /> Ban Personnel
            </SheetTitle>
            <SheetDescription>
              {banTarget?.name} will be immediately logged out and blocked from access.
            </SheetDescription>
          </SheetHeader>

          <Form {...banForm}>
            <form onSubmit={banForm.handleSubmit(onBanSubmit)} className="space-y-6 mt-6">
              <FormField control={banForm.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ban Reason</FormLabel>
                  <FormControl>
                    <textarea 
                      {...field}
                      className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="e.g. Violation of security protocols, Misconduct..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-4 pt-2">
                <FormField control={banForm.control} name="indefinite" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-medium cursor-pointer">Ban Indefinitely</FormLabel>
                  </FormItem>
                )} />

                {!banForm.watch("indefinite") && (
                   <FormField control={banForm.control} name="expires" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ban Expiry Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <p className="text-[11px] text-muted-foreground">User will be unblocked automatically after this date.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              <div className="bg-destructive/10 p-4 rounded-lg flex gap-3 border border-destructive/20">
                 <Info className="size-5 text-destructive shrink-0" />
                 <p className="text-xs text-destructive leading-relaxed">
                   <strong>IMPORTANT:</strong> This action will revoke all active sessions for this staff member immediately.
                 </p>
              </div>

              <Button type="submit" variant="destructive" className="w-full flex gap-2" disabled={banForm.formState.isSubmitting}>
                {banForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Execute Ban
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
