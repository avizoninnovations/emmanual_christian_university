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
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { authClient } from "@/lib/auth-client";

type NavChild = { title: string; url: string };

function ProfileNav({
  pathname,
  registrationNumber,
  image,
}: {
  pathname: string;
  registrationNumber: string;
  image?: string;
}) {
  const active = pathname.startsWith("/profile");
  const [open, setOpen] = useState(active);
  useEffect(() => { if (active) setOpen(true); }, [active]);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="group/profile h-12 w-full justify-start gap-3 rounded-lg px-2 font-medium data-[state=open]:bg-muted hover:bg-muted/70 group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0!"
      >
        <Avatar className="size-10 group-data-[collapsible=icon]:size-8">
          <AvatarImage src={image} alt="Student profile" className="object-cover object-center" />
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">{registrationNumber.charAt(0) || <UserIcon className="size-4" />}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{registrationNumber}</span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-[400ms] group-data-[collapsible=icon]:hidden ${open ? "rotate-180" : ""}`} />
      </SidebarMenuButton>
      <div aria-hidden={!open} inert={!open} className={`grid transition-[grid-template-rows] duration-[400ms] ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <SidebarMenuSub className="mx-3.5 gap-1 border-l-0 px-1.5 py-1">
            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild isActive={pathname === "/profile"} className="h-10 gap-3 rounded-lg px-2.5 data-[active=true]:bg-muted data-[active=true]:font-semibold data-[active=true]:text-foreground hover:bg-muted/70">
                <Link href="/profile"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-sidebar-accent-foreground"><UserIcon className="size-4" /></span><span>My Profile</span></Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </div>
      </div>
    </SidebarMenuItem>
  );
}

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
      <span>{title}</span><ChevronDown className={`ml-auto size-4 transition-transform duration-[400ms] ${open ? "rotate-180" : ""}`} />
    </SidebarMenuButton>
    <div aria-hidden={!open} inert={!open} className={`grid transition-[grid-template-rows] duration-[400ms] ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden"><SidebarMenuSub className="mx-3.5 gap-1 border-l-0 px-1.5 py-1">
        {children.map((child) => <SidebarMenuSubItem key={child.url}><SidebarMenuSubButton asChild isActive={pathname === child.url} className="h-10 gap-3 rounded-lg px-2.5 data-[active=true]:bg-muted data-[active=true]:font-semibold data-[active=true]:text-foreground hover:bg-muted/70">
          <Link href={child.url}><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-sidebar-accent-foreground">{child.title.trim().charAt(0).toUpperCase()}</span><span>{child.title}</span></Link>
        </SidebarMenuSubButton></SidebarMenuSubItem>)}
      </SidebarMenuSub></div>
    </div>
  </SidebarMenuItem>;
}

function IconRailLink({
  title,
  url,
  icon: Icon,
  active,
}: {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <SidebarMenuItem className="flex justify-center py-2">
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={title}
        className="mx-auto flex h-8 w-8 justify-center rounded-lg p-0 data-[active=true]:bg-muted hover:bg-muted/70 group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-0!"
      >
        <Link href={url} aria-label={title}>
          <span className={`flex size-10 items-center justify-center rounded-md ${active ? "bg-primary text-primary-foreground" : "bg-muted/70 text-sidebar-accent-foreground"}`}>
            <Icon className="size-5" />
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
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
      <SidebarHeader className="px-2 pt-3 pb-2 group-data-[collapsible=icon]:py-4">
        <SidebarMenu><SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-10 w-full justify-start gap-2 rounded-lg px-2 hover:bg-muted/70 group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0!">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-md group-data-[collapsible=icon]:size-8">
              <Image src="/icon.png" alt="ECU Logo" width={44} height={44} className="size-full object-contain" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm">ECU Student</span>
              <Badge variant="outline" className="h-4 w-fit border-primary/20 bg-primary/10 px-1.5 text-[10px] font-medium text-primary">Student Portal</Badge>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem></SidebarMenu>
        <SidebarMenu className="mt-2 border-t border-border px-1 pt-2">
          <ProfileNav pathname={pathname} registrationNumber={profile?.registrationNumber ?? "Loading..."} image={session?.user.image ?? undefined} />
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-1">
        <div className="hidden group-data-[collapsible=icon]:block">
          <SidebarGroup className="border-b border-border px-1 py-2">
            <SidebarGroupContent><SidebarMenu className="gap-0">
              <IconRailLink title="Dashboard" url="/" icon={LayoutDashboardIcon} active={pathname === "/"} />
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="border-b border-border px-1 py-2">
            <SidebarGroupContent><SidebarMenu className="gap-0">
              <IconRailLink title="Register" url="/academics/registration" icon={CheckSquare} active={isActive("/academics/registration")} />
              <IconRailLink title="Dead Year / Dead Sem" url="/registration/dead-year-dead-sem" icon={CalendarDays} active={isActive("/registration/dead-year-dead-sem")} />
              <IconRailLink title="Retake Registration" url="/academics/retakes" icon={BookOpen} active={isActive("/academics/retakes")} />
              <IconRailLink title="Aegrotat" url="/registration/aegrotat" icon={Award} active={isActive("/registration/aegrotat")} />
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="border-b border-border px-1 py-2">
            <SidebarGroupContent><SidebarMenu className="gap-0">
              <IconRailLink title="Financial statement" url="/finance" icon={DollarSign} active={isActive("/finance")} />
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="border-b border-border px-1 py-2">
            <SidebarGroupContent><SidebarMenu className="gap-0">
              <IconRailLink title="My Timetable" url="/academics/timetable" icon={CalendarDays} active={isActive("/academics/timetable")} />
              <IconRailLink title="Enrolled Courses" url="/academics/courses" icon={BookOpen} active={isActive("/academics/courses")} />
              <IconRailLink title="Partial Transcript" url="/academics/results" icon={Award} active={isActive("/academics/results")} />
              <IconRailLink title="Exam Permit" url="/finance/exam-card" icon={FileText} active={isActive("/finance/exam-card")} />
              <IconRailLink title="Attendance" url="/academics/attendance" icon={ClipboardCheck} active={isActive("/academics/attendance")} />
              <IconRailLink title="Internship Process" url="/internship" icon={SchoolIcon} active={isActive("/internship")} />
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="border-b border-border px-1 py-2">
            <SidebarGroupContent><SidebarMenu className="gap-0">
              <IconRailLink title="Applications" url="/elections/applications" icon={Vote} active={isActive("/elections/applications")} />
              <IconRailLink title="Electoral Committee" url="/elections/committee" icon={UserIcon} active={isActive("/elections/committee")} />
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="px-1 py-1.5">
            <SidebarGroupContent><SidebarMenu className="gap-0">
              <IconRailLink title="Evaluation" url="/evaluation" icon={ClipboardCheck} active={isActive("/evaluation")} />
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="group-data-[collapsible=icon]:hidden">
        <SidebarGroup className="border-b border-border px-1 py-3 group-data-[collapsible=icon]:py-5">
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Dashboard" className="h-10 gap-3 rounded-lg px-3 data-[active=true]:bg-muted data-[active=true]:text-foreground hover:bg-muted/70">
              <Link href="/"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${pathname === "/" ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><LayoutDashboardIcon className="size-4" /></span><span>Dashboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-b border-border px-1 py-3 group-data-[collapsible=icon]:py-5">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-wide">REGISTRATION</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><ExpandableNav title="Registration" icon={CheckSquare} pathname={pathname} children={[
            { title: "Register", url: "/academics/registration" },
            { title: "Dead Year / Dead Sem", url: "/registration/dead-year-dead-sem" },
            { title: "Retake Registration", url: "/academics/retakes" },
            { title: "Aegrotat", url: "/registration/aegrotat" },
          ]} /></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="border-b border-border px-1 py-3 group-data-[collapsible=icon]:py-5">
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

        <SidebarGroup className="border-b border-border px-1 py-3">
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
        </div>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};
