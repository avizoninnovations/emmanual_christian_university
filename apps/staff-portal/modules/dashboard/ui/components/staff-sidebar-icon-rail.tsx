"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Layers,
  UserCheck,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

const railLinks = [
  { title: "Staff Dashboard", url: "/staff", icon: LayoutDashboard },
  { title: "Teaching Courses", url: "/staff/courses", icon: BookOpen },
  { title: "Class Attendance", url: "/staff/attendance", icon: ClipboardCheck },
  { title: "Teaching Timetable", url: "/staff/timetable", icon: CalendarDays },
  { title: "Teaching Cover", url: "/staff/cover-requests", icon: UserCheck },
  { title: "Course Allocations", url: "/staff/hod/allocations", icon: Layers },
  { title: "Marks Review Queue", url: "/staff/hod/review-queue", icon: FileSpreadsheet },
  { title: "Senate Broadsheet", url: "/staff/hod/broadsheet", icon: Award },
  { title: "Supplementary Exams", url: "/staff/hod/supplementaries", icon: FileText },
];

export function StaffSidebarIconRail({ pathname, hasLeadership }: { pathname: string; hasLeadership: boolean }) {
  const links = railLinks.filter((link) => hasLeadership || !link.url.startsWith("/staff/hod/"));

  return (
    <div className="hidden group-data-[collapsible=icon]:block">
      <SidebarGroup className="border-b border-sidebar-border/70 px-1 py-2">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {links.map(({ title, url, icon: Icon }) => {
              const active = url === "/staff" ? pathname === url : pathname === url || pathname.startsWith(`${url}/`);
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
