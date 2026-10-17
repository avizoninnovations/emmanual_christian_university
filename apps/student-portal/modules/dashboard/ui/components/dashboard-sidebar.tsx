"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboardIcon, BookOpen, UserIcon, SchoolIcon, CalendarDays,
  ClipboardCheck, Vote, Award, DollarSign, FileText,
  CheckSquare, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, useSidebar,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { authClient } from "@/lib/auth-client";

type NavChild = { title: string; url: string };

function ExpandableNav({
  title, icon: Icon, children, pathname,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: NavChild[]; pathname: string }) {
  const active = children.some((child) => pathname.startsWith(child.url));
  const [open, setOpen] = useState(active);
  useEffect(() => { if (active) setOpen(true); }, [active]);

  return <SidebarMenuItem>
    <SidebarMenuButton
      onClick={() => setOpen((value) => !value)}
      isActive={active}
      aria-expanded={open}
      className="h-10 gap-3 rounded-lg px-3 data-[active=true]:bg-muted data-[active=true]:text-foreground hover:bg-muted/70"
    >
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><Icon className="size-4" /></span>
      <span>{title}</span><ChevronDown className={`ml-auto size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </SidebarMenuButton>
    <div aria-hidden={!open} inert={!open} className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden"><SidebarMenuSub className="mx-3.5 gap-1 border-l-0 px-1.5 py-1">
        {children.map((child) => <SidebarMenuSubItem key={child.url}><SidebarMenuSubButton asChild isActive={pathname === child.url} className="h-10 gap-3 rounded-lg px-2.5 data-[active=true]:bg-muted data-[active=true]:font-semibold data-[active=true]:text-foreground hover:bg-muted/70">
          <Link href={child.url}><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-sidebar-accent-foreground">{child.title.trim().charAt(0).toUpperCase()}</span><span>{child.title}</span></Link>
        </SidebarMenuSubButton></SidebarMenuSubItem>)}
      </SidebarMenuSub></div>
    </div>
  </SidebarMenuItem>;
}

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const { open, setOpen, isMobile } = useSidebar();
  const hoverExpanded = useRef(false);
  const profile = useQuery(api.student_portal.getMyProfile);
  const { data: session } = authClient.useSession();
  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);
  const handleMouseEnter = () => {
    if (!open && !isMobile) {
      hoverExpanded.current = true;
      setOpen(true);
    }
  };
  const handleMouseLeave = () => {
    if (hoverExpanded.current) {
      hoverExpanded.current = false;
      setOpen(false);
    }
  };

  return (
    <Sidebar variant="floating" className="group" collapsible="icon" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <SidebarHeader className="px-2 pt-3 pb-2 group-data-[collapsible=icon]:py-5">
        <SidebarMenu><SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-10 w-full justify-start gap-2 rounded-lg px-2 hover:bg-muted/70">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-md">
              <Image src="/icon.png" alt="ECU Logo" width={44} height={44} className="size-full object-contain" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm">ECU Student</span>
              <Badge variant="outline" className="h-4 w-fit border-primary/20 bg-primary/10 px-1.5 text-[10px] font-medium text-primary">Student Portal</Badge>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem></SidebarMenu>
        <SidebarMenu className="mt-2 border-t border-border/60 px-1 pt-2 group-data-[collapsible=icon]:hidden">
          <SidebarMenuItem><DropdownMenu>
            <DropdownMenuTrigger asChild><SidebarMenuButton size="lg" className="group/profile h-12 w-full justify-start gap-3 rounded-lg px-2 data-[state=open]:bg-muted hover:bg-muted/70">
              <Avatar className="size-10">
                <AvatarImage src={session?.user.image ?? undefined} alt="Student profile" className="object-cover object-center" />
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">{profile?.registrationNumber?.charAt(0) ?? <UserIcon className="size-4" />}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{profile?.registrationNumber ?? "Loading..."}</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/profile:rotate-180" />
            </SidebarMenuButton></DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-56">
              <DropdownMenuItem asChild className="gap-2">
                <Link href="/profile"><UserIcon className="size-4" />My Profile</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu></SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-1">
        <SidebarGroup className="border-b border-border/60 px-1 py-3 group-data-[collapsible=icon]:py-5">
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Dashboard" className="h-10 gap-3 rounded-lg px-3 data-[active=true]:bg-muted data-[active=true]:text-foreground hover:bg-muted/70">
              <Link href="/"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${pathname === "/" ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><LayoutDashboardIcon className="size-4" /></span><span>Dashboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-b border-border/60 px-1 py-3 group-data-[collapsible=icon]:py-5">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-wide">REGISTRATION</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><ExpandableNav title="Registration" icon={CheckSquare} pathname={pathname} children={[
            { title: "Register", url: "/academics/registration" },
            { title: "Dead Year / Dead Sem", url: "/registration/dead-year-dead-sem" },
            { title: "Retake Registration", url: "/academics/retakes" },
            { title: "Aegrotat", url: "/registration/aegrotat" },
          ]} /></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-b border-border/60 px-1 py-3 group-data-[collapsible=icon]:py-5">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-wide">MY FINANCE</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/finance")} tooltip="Financial statement" className="h-10 gap-3 rounded-lg px-3 data-[active=true]:bg-muted data-[active=true]:text-foreground hover:bg-muted/70">
            <Link href="/finance"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${isActive("/finance") ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><DollarSign className="size-4" /></span><span>Financial statement</span></Link>
          </SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-b border-border/60 px-1 py-3 group-data-[collapsible=icon]:py-5">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-wide">ACADEMICS</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/academics/timetable")} tooltip="My Timetable" className="h-10 gap-3 rounded-lg px-3 data-[active=true]:bg-muted data-[active=true]:text-foreground hover:bg-muted/70"><Link href="/academics/timetable"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${isActive("/academics/timetable") ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><CalendarDays className="size-4" /></span><span>My Timetable</span></Link></SidebarMenuButton></SidebarMenuItem>
            <ExpandableNav title="My Courses" icon={BookOpen} pathname={pathname} children={[{ title: "Enrolled Courses", url: "/academics/courses" }]} />
            <ExpandableNav title="Results" icon={Award} pathname={pathname} children={[{ title: "Partial Transcript", url: "/academics/results" }]} />
            <ExpandableNav title="Examinations" icon={FileText} pathname={pathname} children={[{ title: "Exam Permit", url: "/finance/exam-card" }]} />
            <SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/academics/attendance")} tooltip="Attendance" className="h-10 gap-3 rounded-lg px-3 data-[active=true]:bg-muted data-[active=true]:text-foreground hover:bg-muted/70"><Link href="/academics/attendance"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${isActive("/academics/attendance") ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><CalendarDays className="size-4" /></span><span>Attendance</span></Link></SidebarMenuButton></SidebarMenuItem>
            <ExpandableNav title="Internship" icon={SchoolIcon} pathname={pathname} children={[{ title: "Internship Process", url: "/internship" }]} />
          </SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-b border-border/60 px-1 py-3">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-wide">ELECTIONS</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><ExpandableNav title="Elections" icon={Vote} pathname={pathname} children={[
            { title: "Applications", url: "/elections/applications" },
            { title: "Electoral Committee", url: "/elections/committee" },
          ]} /></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-1 py-3 group-data-[collapsible=icon]:py-5">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-wide">EVALUATION</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild isActive={isActive("/evaluation")} tooltip="Evaluation" className="h-10 gap-3 rounded-lg px-3 data-[active=true]:bg-muted data-[active=true]:text-foreground hover:bg-muted/70">
            <Link href="/evaluation"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${isActive("/evaluation") ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><ClipboardCheck className="size-4" /></span><span>Evaluation</span></Link>
          </SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};
