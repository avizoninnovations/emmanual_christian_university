"use client";

import { useCurrentUser, type ActiveRole } from "@/hooks/use-current-user";
import { ShieldCheck, Users, GraduationCap, ArrowRight } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

import { useRouter } from "next/navigation";

/**
 * Role Selector shown when a user has both "admin" and "staff" roles.
 * After selection, the user is routed to the appropriate dashboard.
 */
export const RoleSelector = () => {
  const { user, setActiveRole } = useCurrentUser();
  const router = useRouter();

  const firstName = user?.name?.split(" ")[0] ?? "User";

  const roles: { key: ActiveRole; title: string; description: string; icon: React.ReactNode; gradient: string }[] = [
    {
      key: "admin",
      title: "Admin Portal",
      description: "Full system control — manage staff, programs, settings, and university-wide data.",
      icon: <ShieldCheck className="size-8" />,
      gradient: "from-violet-600 to-indigo-700",
    },
    {
      key: "staff",
      title: "Staff Portal",
      description: "Your personal workspace — courses, schedules, and department information.",
      icon: <Users className="size-8" />,
      gradient: "from-sky-600 to-blue-700",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 mb-2">
            <GraduationCap className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose how you'd like to access the system today.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => {
                setActiveRole(role.key);
                if (role.key === "admin") {
                  router.push("/admin");
                } else {
                  router.push("/staff");
                }
              }}
              className={cn(
                "group relative flex flex-col items-start gap-4 rounded-2xl p-6 text-left",
                "border border-border/50 bg-card shadow-sm",
                "transition-all duration-300 ease-out",
                "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              )}
            >
              {/* Icon with gradient bg */}
              <div className={cn(
                "flex items-center justify-center size-14 rounded-xl bg-gradient-to-br text-white shadow-md",
                role.gradient
              )}>
                {role.icon}
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  {role.title}
                  <ArrowRight className="size-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {role.description}
                </p>
              </div>

              {/* Subtle hover glow */}
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                "bg-gradient-to-br pointer-events-none",
                role.gradient,
                "opacity-0 group-hover:opacity-[0.03]"
              )} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60">
          Emmanuel Christian University • Staff Portal
        </p>
      </div>
    </div>
  );
};
