"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  User,
  Mail,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getRoleBadgeStyle(role: string) {
  const styles: Record<string, string> = {
    admin: "bg-violet-500/10 text-violet-600 border-violet-200",
    staff: "bg-sky-500/10 text-sky-600 border-sky-200",
    registrar: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    finance: "bg-amber-500/10 text-amber-600 border-amber-200",
    hod: "bg-rose-500/10 text-rose-600 border-rose-200",
    dean: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  };
  return styles[role.toLowerCase()] ?? "bg-gray-500/10 text-gray-600 border-gray-200";
}

export default function MyDashboardPage() {
  const { user, roles, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "User";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8 max-w-5xl mx-auto w-full">
      {/* ── Welcome Header ── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Good {getTimeOfDay()}, {firstName}
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome to your personal workspace.
        </p>
      </div>

      {/* ── Profile Card ── */}
      <Card className="shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
        <CardContent className="-mt-12 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Avatar */}
            <div className="flex items-center justify-center size-20 rounded-2xl bg-background border-4 border-background shadow-lg text-2xl font-bold text-primary">
              {(user?.name || "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold truncate">{user?.name ?? "—"}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <Mail className="size-3.5" />
                <span className="truncate">{user?.email ?? "—"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {roles.map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className={cn("capitalize text-xs", getRoleBadgeStyle(role))}
                >
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Info Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCard
          icon={<User className="size-5" />}
          title="Staff Number"
          value={user?.staffNumber ?? "Not assigned"}
          gradient="from-blue-600 to-blue-700"
        />
        <InfoCard
          icon={<Shield className="size-5" />}
          title="Title"
          value={user?.title ?? "Not set"}
          gradient="from-violet-600 to-violet-700"
        />
        <InfoCard
          icon={<Clock className="size-5" />}
          title="Member Since"
          value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
          gradient="from-emerald-600 to-emerald-700"
        />
      </div>

      {/* ── Coming Soon placeholder ── */}
      <Card className="shadow-sm border-dashed">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/5 border border-primary/10">
              <BookOpen className="size-7 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold">Your courses and schedules</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Course allocations, timetables, and marks entry will appear here once the academic modules are set up.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  gradient: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center size-10 rounded-xl bg-gradient-to-br text-white shadow-sm shrink-0", gradient)}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-sm font-semibold truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
