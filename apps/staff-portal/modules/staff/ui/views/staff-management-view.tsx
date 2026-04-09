"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Trash2,
  UserPlus,
  Users,
  ShieldCheck,
  Search,
  Mail,
  Shield,
  Loader2,
  Pencil,
  Clock,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@workspace/ui/lib/utils";

// ──────────────────────────────────
// Schema
// ──────────────────────────────────

const AVAILABLE_ROLES = [
  { value: "admin", label: "Administrator", description: "Full system access" },
  { value: "staff", label: "Staff", description: "General staff member" },
  { value: "registrar", label: "Registrar", description: "Student records management" },
  { value: "finance", label: "Finance", description: "Financial operations" },
  { value: "hod", label: "Head of Department", description: "Department management" },
  { value: "dean", label: "Dean", description: "Faculty leadership" },
] as const;

const staffSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  roles: z.array(z.string()).min(1, "At least one role is required"),
  title: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

// ──────────────────────────────────
// Role badge styles
// ──────────────────────────────────

function getRoleBadgeStyle(role: string) {
  const styles: Record<string, string> = {
    admin: "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800",
    staff: "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800",
    registrar: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
    finance: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800",
    hod: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800",
    dean: "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800",
  };
  return styles[role.toLowerCase()] ?? "bg-gray-500/10 text-gray-600 border-gray-200";
}

// ──────────────────────────────────
// Main View
// ──────────────────────────────────

export const StaffManagementView = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const staff = useQuery(api.users.getStaff);
  const createStaffAction = useAction(api.users.createStaff);
  const deleteStaffMutation = useMutation(api.users.deleteStaff);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roles: ["staff"],
      title: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (values: StaffFormValues) => {
    try {
      await createStaffAction({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        roles: values.roles,
        title: values.title || undefined,
        phone: values.phone || undefined,
        password: values.password || undefined,
      });
      toast.success("Staff member created successfully");
      setIsCreateOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create staff member");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await deleteStaffMutation({ id });
      toast.success("Staff member removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove staff member");
    }
  };

  const filteredStaff = staff?.filter((s: any) =>
    `${s.name} ${s.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: staff?.length || 0,
    admins: staff?.filter((s: any) => s.roles?.includes("admin")).length || 0,
    active: staff?.filter((s: any) => s.profileStatus === "active").length || staff?.length || 0,
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage university personnel accounts.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 shadow-lg shadow-primary/20">
              <UserPlus className="mr-2 h-5 w-5" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
              <DialogDescription>
                Create a new account for university personnel. They can log in immediately.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                {/* Name */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="j.doe@ecu-ssd.org" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title + Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr., Prof., Mr." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+211 ..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Roles — Checkbox Group */}
                <FormField
                  control={form.control}
                  name="roles"
                  render={() => (
                    <FormItem>
                      <FormLabel>Roles</FormLabel>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {AVAILABLE_ROLES.map((role) => (
                          <FormField
                            key={role.value}
                            control={form.control}
                            name="roles"
                            render={({ field }) => (
                              <label
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors",
                                  field.value?.includes(role.value)
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-border hover:bg-muted/50"
                                )}
                              >
                                <Checkbox
                                  checked={field.value?.includes(role.value)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, role.value]);
                                    } else {
                                      field.onChange(current.filter((v) => v !== role.value));
                                    }
                                  }}
                                />
                                <div>
                                  <p className="text-sm font-medium leading-tight">{role.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{role.description}</p>
                                </div>
                              </label>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password (optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-2">
                  <Button type="submit" className="w-full h-11" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-500/5 border-blue-500/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">University members</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-500/5 border-violet-500/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <ShieldCheck className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">Full system access</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Shield className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Staff Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Personnel List</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                className="pl-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff === undefined ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading staff data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No staff members found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((person: any) => (
                  <TableRow key={person._id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold text-xs shrink-0">
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
                          <Badge
                            key={role}
                            variant="outline"
                            className={cn("text-[10px] capitalize", getRoleBadgeStyle(role))}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 opacity-50" />
                        <span className="text-sm">{person.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(person._creationTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(person._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
};
