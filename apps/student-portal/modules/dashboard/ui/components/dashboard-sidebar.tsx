"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboardIcon, BookOpen, Users, UserIcon, SchoolIcon, CalendarDays,
  ClipboardCheck, Vote, Award, DollarSign, FileText,
  CheckSquare, LogOut, ChevronUp, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";
import { authClient } from "@/lib/auth-client";

type NavChild = { title: string; url: string; icon?: React.ComponentType<{ className?: string }> };

function ExpandableNav({
  title, icon: Icon, children, pathname,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: NavChild[]; pathname: string }) {
  const active = children.some((child) => pathname.startsWith(child.url));
  const [open, setOpen] = useState(active);
  useEffect(() => { if (active) setOpen(true); }, [active]);

  return <SidebarMenuItem>
    <SidebarMenuButton onClick={() => setOpen((value) => !value)} isActive={active} aria-expanded={open}>
      <Icon className="size-4" /><span>{title}</span>{open ? <ChevronUp className="ml-auto size-4" /> : <ChevronDown className="ml-auto size-4" />}
    </SidebarMenuButton>
    {open && <SidebarMenuSub>{children.map((child) => {
      const ChildIcon = child.icon;
      return <SidebarMenuSubItem key={child.url}><SidebarMenuSubButton asChild isActive={pathname === child.url}>
        <Link href={child.url}>{ChildIcon && <ChildIcon className="size-4" />}<span>{child.title}</span></Link>
      </SidebarMenuSubButton></SidebarMenuSubItem>;
    })}</SidebarMenuSub>}
  </SidebarMenuItem>;
}

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useQuery(api.student_portal.getMyProfile);
  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <Sidebar className="group border-r border-slate-200 bg-white" collapsible="icon">
      <SidebarHeader className="border-b border-slate-100 px-4 py-3">
        <SidebarMenu><SidebarMenuItem>
          <SidebarMenuButton size="lg" className="w-full justify-start gap-2 px-2">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-md">
              <Image src="/icon.png" alt="ECU Logo" width={44} height={44} className="size-full object-contain" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm">ECU Student</span>
              <Badge variant="outline" className="h-4 w-fit border-primary/20 bg-primary/10 px-1.5 text-[10px] font-medium text-primary">Student Portal</Badge>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem></SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-2">
        <SidebarGroup className="py-1">
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Dashboard">
              <Link href="/"><LayoutDashboardIcon className="size-4" /><span>Dashboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-t border-slate-100 py-3">
          <SidebarGroupLabel>REGISTRATION</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><ExpandableNav title="Registration" icon={CheckSquare} pathname={pathname} children={[
            { title: "Register", url: "/academics/registration" },
            { title: "Dead Year / Dead Sem", url: "/registration/dead-year-dead-sem" },
            { title: "Retake Registration", url: "/academics/retakes" },
            { title: "Aegrotat", url: "/registration/aegrotat" },
          ]} /></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-t border-slate-100 py-3">
          <SidebarGroupLabel>MY FINANCE</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/finance")} tooltip="Financial statement">
            <Link href="/finance"><DollarSign className="size-4" /><span>Financial statement</span></Link>
          </SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-t border-slate-100 py-3">
          <SidebarGroupLabel>ACADEMICS</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/academics/timetable")} tooltip="My Timetable"><Link href="/academics/timetable"><CalendarDays className="size-4" /><span>My Timetable</span></Link></SidebarMenuButton></SidebarMenuItem>
            <ExpandableNav title="My Courses" icon={BookOpen} pathname={pathname} children={[{ title: "Enrolled Courses", url: "/academics/courses" }]} />
            <ExpandableNav title="Results" icon={Award} pathname={pathname} children={[{ title: "Partial Transcript", url: "/academics/results" }]} />
            <ExpandableNav title="Examinations" icon={FileText} pathname={pathname} children={[{ title: "Exam Permit", url: "/finance/exam-card" }]} />
            <SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/academics/attendance")} tooltip="Attendance"><Link href="/academics/attendance"><CalendarDays className="size-4" /><span>Attendance</span></Link></SidebarMenuButton></SidebarMenuItem>
            <ExpandableNav title="Internship" icon={SchoolIcon} pathname={pathname} children={[{ title: "Internship Process", url: "/internship" }]} />
          </SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-t border-slate-100 py-3">
          <SidebarGroupLabel>ELECTIONS</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><ExpandableNav title="Elections" icon={Vote} pathname={pathname} children={[
            { title: "Applications", url: "/elections/applications" },
            { title: "Electoral Committee", url: "/elections/committee", icon: Users },
          ]} /></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-t border-slate-100 py-3">
          <SidebarGroupLabel>EVALUATION</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/evaluation")} tooltip="Evaluation">
            <Link href="/evaluation"><ClipboardCheck className="size-4" /><span>Evaluation</span></Link>
          </SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-2">
        <SidebarMenu><SidebarMenuItem><DropdownMenu>
          <DropdownMenuTrigger asChild><SidebarMenuButton size="lg" className="w-full justify-start gap-2 px-2 data-[state=open]:bg-sidebar-accent">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><UserIcon className="size-4" /></div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden"><span className="truncate text-sm font-semibold">{profile?.name ?? "Student"}</span><span className="truncate font-mono text-[11px] text-muted-foreground">{profile?.registrationNumber ?? "Loading..."}</span></div>
            <ChevronUp className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton></DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56"><DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive"><LogOut className="size-4" />Sign Out</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
