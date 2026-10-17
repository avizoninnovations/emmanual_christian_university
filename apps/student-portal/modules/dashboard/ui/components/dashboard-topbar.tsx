"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ChevronRight, UserRound } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

const routeNames: Record<string, string> = {
  academics: "Academics",
  profile: "My Profile",
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
  const crumbs = pathname.split("/").filter(Boolean);

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
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/profile"><UserRound className="size-4" />
        <span>Profile</span></Link>
      </Button>
    </header>
  );
}
