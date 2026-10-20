"use client";

import { usePathname, useRouter } from "next/navigation";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ChevronRight, LogOut } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { ModeToggle } from "@workspace/ui/components/mode-toggle";

const routeNames: Record<string, string> = {
  academics: "Academics",
  profile: "My Profile",
  courses: "My Courses",
  results: "Results",
  timetable: "My Timetable",
  retakes: "Retake Registration",
  internship: "Internship",
  finance: "Financial Statement",
  "exam-card": "Exam Permit",
  registration: "Registration",
  "dead-year-dead-sem": "Dead Year / Dead Sem",
  aegrotat: "Aegrotat",
  evaluation: "Evaluation",
  elections: "Elections",
  applications: "Applications",
  committee: "Electoral Committee",
};

export function DashboardTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = pathname.split("/").filter(Boolean);

  const handleSignOut = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error("Unable to sign out right now. Please try again.");
        return;
      }
      router.replace("/sign-in");
      router.refresh();
    } catch {
      toast.error("Unable to sign out right now. Please try again.");
    }
  };

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between px-5 sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
          <span className="text-slate-400">Students</span>
          {crumbs.map((crumb) => (
            <span key={crumb} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="size-3.5 shrink-0 text-slate-300" />
              <span className="truncate font-medium text-slate-700">
                {routeNames[crumb] ?? crumb.replaceAll("-", " ")}
              </span>
            </span>
          ))}
        </nav>
        <SidebarTrigger className="text-muted-foreground" />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ModeToggle />
        <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-muted-foreground">
          <LogOut className="size-4" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
