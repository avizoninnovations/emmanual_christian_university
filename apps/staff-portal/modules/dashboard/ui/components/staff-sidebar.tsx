"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  Search,
  UserCheck,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { StaffSidebarIconRail } from "@/modules/dashboard/ui/components/staff-sidebar-icon-rail";

const teachingLinks = [
  { title: "Teaching Courses", url: "/staff/courses", icon: BookOpen },
  { title: "Class Attendance", url: "/staff/attendance", icon: ClipboardCheck },
  { title: "Teaching Timetable", url: "/staff/timetable", icon: CalendarDays },
  { title: "Teaching Cover", url: "/staff/cover-requests", icon: UserCheck },
];

const leadershipLinks = [
  { title: "Course Allocations", url: "/staff/hod/allocations", icon: Layers },
  { title: "Marks Review Queue", url: "/staff/hod/review-queue", icon: FileSpreadsheet },
  { title: "Senate Broadsheet", url: "/staff/hod/broadsheet", icon: Award },
  { title: "Supplementary Exams", url: "/staff/hod/supplementaries", icon: FileText },
];

export const StaffSidebar = () => {
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { open, setOpen, isMobile } = useSidebar();
  const hoverExpanded = useRef(false);
  const { user, roles, isMultiRole, clearActiveRole } = useCurrentUser();
  const query = search.trim().toLowerCase();
  const filteredTeaching = teachingLinks.filter((link) => link.title.toLowerCase().includes(query));
  const filteredLeadership = leadershipLinks.filter((link) => link.title.toLowerCase().includes(query));
  const hasLeadership = roles?.some((role) => ["hod", "dean", "admin"].includes(role.toLowerCase()));

  const signOut = async () => {
    clearActiveRole();
    await authClient.signOut();
    router.push("/sign-in");
  };

  const switchRole = () => {
    clearActiveRole();
    router.push("/");
  };

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
    <Sidebar variant="sidebar" collapsible="icon" className="group border-0 shadow-none" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-sidebar">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url('/001.webp')] bg-cover bg-center opacity-20 dark:opacity-[0.16]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/50 dark:bg-background/65" />

        <SidebarHeader className="relative z-10 gap-3 border-b border-sidebar-border/70 px-3 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className="h-11 gap-2 px-1 hover:bg-transparent">
                <Link href="/staff" aria-label="ECU staff dashboard">
                  <Image src="/logo.webp" alt="ECU logo" width={36} height={36} className="size-9 shrink-0 object-contain" />
                  <span className="truncate text-base font-medium tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">ECU STAFF</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="relative group-data-[collapsible=icon]:hidden">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/75" />
            <SidebarInput
              aria-label="Search academic menu"
              placeholder="Search menu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 border-0 border-b border-sidebar-border/70 bg-transparent pl-8 text-sm shadow-none placeholder:text-muted-foreground/75 focus-visible:ring-0"
            />
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="h-12 gap-2 rounded-lg px-1.5 hover:bg-sidebar-accent/70 data-[state=open]:bg-sidebar-accent/70">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                      <span className="block truncate text-sm font-normal">{user?.name ?? "Loading…"}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{user?.staffNumber ?? "Staff account"}</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="w-56">
                  <div className="px-2 py-2">
                    <p className="truncate text-sm font-semibold">{user?.name ?? "ECU Staff"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
                  </div>
                  {isMultiRole && <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={switchRole} className="gap-2"><ArrowLeftRight className="size-4" />Switch portal</DropdownMenuItem>
                  </>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive"><LogOut className="size-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="relative z-10 gap-0 px-2 py-1">
          <StaffSidebarIconRail pathname={pathname} hasLeadership={Boolean(hasLeadership)} />
          <div className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup className="px-0 py-3">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/staff"} tooltip="Staff Dashboard" className="h-11 rounded-md px-3 text-muted-foreground shadow-sm hover:bg-sidebar-accent/80 hover:text-sidebar-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground">
                    <Link href="/staff"><LayoutDashboard className="size-5" /><span className="text-xs font-semibold uppercase">Staff Dashboard</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="border-t border-sidebar-border/60 px-0 py-2.5">
            <SidebarGroupContent>
              {(filteredTeaching.length > 0 || !query) && <NavGroup title="Academics Office" icon={GraduationCap} active={teachingLinks.some((link) => pathname.startsWith(link.url))}>
                {filteredTeaching.map((link) => <NavItem key={link.url} {...link} active={pathname.startsWith(link.url)} />)}
              </NavGroup>}
              {hasLeadership && (filteredLeadership.length > 0 || !query) && (
                <NavGroup title="Academic Leadership" icon={CheckSquare} active={leadershipLinks.some((link) => pathname.startsWith(link.url))}>
                  {filteredLeadership.map((link) => <NavItem key={link.url} {...link} active={pathname.startsWith(link.url)} />)}
                </NavGroup>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
          </div>
        </SidebarContent>
      </div>
      <SidebarRail />
    </Sidebar>
  );
};

function NavGroup({
  title,
  icon: Icon,
  active,
  children,
}: {
  title: string;
  icon: typeof GraduationCap;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={active} className="group/nav mb-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={title} className="h-10 gap-3 rounded-md px-3 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground">
              <Icon className="size-5 shrink-0" />
              <span className="flex-1 truncate uppercase">{title}</span>
              <ChevronDown className="size-3.5 shrink-0 transition-transform duration-300 group-data-[state=open]/nav:rotate-180 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="mx-4 mb-1 mt-0.5 gap-0.5 border-sidebar-border/70 pl-2">
              {children}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </SidebarMenu>
    </Collapsible>
  );
}

function NavItem({
  title,
  url,
  icon: Icon,
  active,
}: {
  title: string;
  url: string;
  icon: typeof BookOpen;
  active: boolean;
}) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={active} className="h-9 gap-2.5 px-2 text-[13px] text-muted-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-primary hover:text-sidebar-foreground">
        <Link href={url}><Icon className="size-4 shrink-0" /><span className="truncate">{title}</span></Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}
