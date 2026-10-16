"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ChevronRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const routeNames: Record<string, string> = {
  academics: "Academics",
  courses: "My Courses",
  results: "Results",
  timetable: "My Timetable",
  retakes: "Retake Registration",
  internship: "Internship",
  attendance: "Attendance",
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

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="text-slate-500" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
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
      </div>
      <button onClick={signOut} className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary">
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
