"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import {
  Users,
  GraduationCap,
  Activity,
  ArrowRight,
  Clock,
  Building2,
  BookOpen,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import Link from "next/link";

function AdminDashboardContent() {
  const { user } = useCurrentUser();
  const staff = useQuery(api.users.getStaff);
  const faculties = useQuery(api.academic.getFaculties);
  const departments = useQuery(api.academic.getDepartments, {});
  const programs = useQuery(api.academic.getPrograms, {});

  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  const stats = [
    {
      label: "Staff",
      value: staff?.length ?? "—",
      sub: "University personnel",
      icon: Users,
      href: "/admin/staff/active",
    },
    {
      label: "Faculties",
      value: faculties?.length ?? "—",
      sub: "Academic units",
      icon: Building2,
      href: "/admin/academic/faculties",
    },
    {
      label: "Departments",
      value: departments?.length ?? "—",
      sub: "Under faculties",
      icon: GraduationCap,
      href: "/admin/academic/departments",
    },
    {
      label: "Programs",
      value: programs?.length ?? "—",
      sub: "Degrees & diplomas",
      icon: BookOpen,
      href: "/admin/academic/programs",
    },
  ];

  const recentStaff = staff?.slice(-5).reverse() ?? [];

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Good {getTimeOfDay()}, {firstName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Emmanuel Christian University — Admin Overview
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border shadow-sm hover:border-primary/40 transition-colors cursor-pointer">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="size-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Quick Actions + Recent Staff ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[
              { label: "Manage Staff", href: "/admin/staff/active", icon: UserPlus },
              { label: "Academic Structure", href: "/admin/academic/faculties", icon: Building2 },
              { label: "Admissions", href: "/admin/admissions", icon: GraduationCap },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant="ghost" className="w-full justify-between h-10 group px-3">
                  <span className="flex items-center gap-2 text-sm">
                    <action.icon className="size-4 text-muted-foreground" />
                    {action.label}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Staff */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Staff</CardTitle>
            <Link href="/admin/staff/active">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                View all <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {staff === undefined ? (
              <div className="flex items-center gap-2 text-muted-foreground p-4 text-sm">
                <Activity className="size-4 animate-pulse" /> Loading...
              </div>
            ) : recentStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No staff members yet.</p>
            ) : (
              <div>
                {recentStaff.map((person: any, idx: number) => (
                  <div key={person._id}>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                          {(person.name || "?")[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{person.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {person.roles?.includes("admin") && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            Admin
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(person._creationTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {idx < recentStaff.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
