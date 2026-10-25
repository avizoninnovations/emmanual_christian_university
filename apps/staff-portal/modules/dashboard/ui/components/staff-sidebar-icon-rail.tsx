"use client";

import Link from "next/link";
import {
  Award,
  Building2,
  BookOpen,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Layers,
  Mail,
  UserRound,
  UserCheck,
  Wallet,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

const railLinks = [
  { title: "Staff Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Memos", url: "/workspace/memos", icon: Mail },
  { title: "My Finance", url: "/workspace/finance", icon: Wallet },
  { title: "Salary Pay Slip", url: "/workspace/salary-payslip", icon: FileText },
  { title: "Personal Records", url: "/profile", icon: UserRound },
  { title: "Faculty Central", url: "/workspace/faculty-central", icon: Building2 },
  { title: "Teaching Courses", url: "/courses", icon: BookOpen },
  { title: "Assessment Applications", url: "/workspace/aegrotat-units", icon: ClipboardCheck },
  { title: "Retake Approvals", url: "/workspace/retake-approvals", icon: ClipboardCheck },
  { title: "Missed Paper Requests", url: "/workspace/aggregated-units", icon: Layers },
  { title: "Timetable", url: "/timetable", icon: CalendarDays },
  { title: "Teaching Cover", url: "/cover-requests", icon: UserCheck },
  { title: "Mark Edit Requests", url: "/workspace/mark-permissions", icon: ClipboardCheck },
  { title: "Course Allocations", url: "/hod/allocations", icon: Layers },
  { title: "Missed Paper Approvals", url: "/hod/aggregated-units", icon: Layers },
  { title: "Department Overview", url: "/hod", icon: Building2 },
  { title: "Marks Review Queue", url: "/hod/review-queue", icon: FileSpreadsheet },
  { title: "Edit Permissions", url: "/hod/edit-permissions", icon: ClipboardCheck },
  { title: "Department Lecturers", url: "/hod/lecturers", icon: UsersRound },
  { title: "Academic Activity", url: "/hod/activity", icon: FileText },
  { title: "Senate Broadsheet", url: "/hod/broadsheet", icon: Award },
  { title: "Supplementary Exams", url: "/hod/supplementaries", icon: FileText },
];

export function StaffSidebarIconRail({ pathname, hasLeadership, canReviewRetakes }: { pathname: string; hasLeadership: boolean; canReviewRetakes: boolean }) {
  const links = railLinks.filter((link) => (hasLeadership || !link.url.startsWith("/hod/"))
    && (canReviewRetakes || link.url !== "/workspace/retake-approvals"));

  return (
    <div className="hidden group-data-[collapsible=icon]:block">
      <SidebarGroup className="border-b border-sidebar-border/70 px-1 py-2">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {links.map(({ title, url, icon: Icon }) => {
              const active = url === "/" || url === "/hod" ? pathname === url : pathname === url || pathname.startsWith(`${url}/`);
              return (
                <SidebarMenuItem key={url} className="flex justify-center py-1">
                  <SidebarMenuButton asChild isActive={active} tooltip={title} aria-label={title} className="mx-auto flex size-10 justify-center rounded-lg p-0 hover:bg-sidebar-accent/80 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0!">
                    <Link href={url}>
                      <span className={`flex size-8 items-center justify-center rounded-md transition-colors duration-300 ${active ? "bg-primary text-primary-foreground" : "bg-muted/80 text-sidebar-accent-foreground"}`}>
                        <Icon className="size-5" />
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
