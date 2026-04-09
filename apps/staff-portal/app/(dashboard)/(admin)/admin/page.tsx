"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Activity,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";

function AdminDashboardContent() {
  const { user } = useCurrentUser();
  const staff = useQuery(api.users.getStaff);

  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  const stats = {
    totalStaff: staff?.length ?? 0,
    admins: staff?.filter((s: any) => s.roles?.includes("admin")).length ?? 0,
    activeStaff: staff?.filter((s: any) => s.profileStatus === "active").length ?? staff?.length ?? 0,
  };

  const recentStaff = staff?.slice(-5).reverse() ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Good {getTimeOfDay()}, {firstName}
        </h1>
        <p className="text-muted-foreground text-lg">
          Here's what's happening across the university system.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Staff"
          value={stats.totalStaff}
          subtitle="University personnel"
          icon={<Users className="size-5" />}
          gradient="from-blue-600 to-blue-700"
          bgAccent="bg-blue-500/5 border-blue-500/10"
        />
        <StatCard
          title="Administrators"
          value={stats.admins}
          subtitle="System administrators"
          icon={<ShieldCheck className="size-5" />}
          gradient="from-violet-600 to-violet-700"
          bgAccent="bg-violet-500/5 border-violet-500/10"
        />
        <StatCard
          title="Active Staff"
          value={stats.activeStaff}
          subtitle="Currently active"
          icon={<Activity className="size-5" />}
          gradient="from-emerald-600 to-emerald-700"
          bgAccent="bg-emerald-500/5 border-emerald-500/10"
        />
        <StatCard
          title="Programs"
          value="—"
          subtitle="Coming soon"
          icon={<GraduationCap className="size-5" />}
          gradient="from-amber-600 to-amber-700"
          bgAccent="bg-amber-500/5 border-amber-500/10"
        />
      </div>

      {/* ── Quick Actions + Recent Staff ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/staff">
              <Button variant="outline" className="w-full justify-between h-11 group">
                <span className="flex items-center gap-2">
                  <UserPlus className="size-4 text-primary" />
                  Manage Staff
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Staff */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Staff Members</CardTitle>
            <Link href="/admin/staff">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {staff === undefined ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading...
              </div>
            ) : recentStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No staff members yet.</p>
            ) : (
              <div className="space-y-3">
                {recentStaff.map((person: any) => (
                  <div
                    key={person._id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center size-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold text-sm shrink-0">
                        {(person.name || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {person.roles?.includes("admin") && (
                        <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-200">
                          Admin
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(person._creationTime).toLocaleDateString()}
                      </span>
                    </div>
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

// ── Stat Card Component ──
function StatCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  bgAccent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  bgAccent: string;
}) {
  return (
    <Card className={cn("shadow-sm border", bgAccent)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={cn("flex items-center justify-center size-10 rounded-xl bg-gradient-to-br text-white shadow-sm", gradient)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// Wrap with admin guard
export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
