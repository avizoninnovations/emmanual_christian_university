"use client";

import {
  LayoutDashboardIcon,
  UserIcon,
  LogOut,
  ArrowLeftRight,
  ChevronDown,
  DollarSign,
  BookOpen,
  ClipboardCheck,
  Layers,
  FileSpreadsheet,
  Calendar,
  UserCheck,
  Award,
  FileText,
  Search,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarInput,
} from "@workspace/ui/components/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@workspace/ui/components/badge";
import { authClient } from "@/lib/auth-client";

const lecturerMenuItems = [
  {
    title: "My Dashboard",
    url: "/staff",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    title: "Teaching Courses",
    url: "/staff/courses",
    icon: BookOpen,
  },
  {
    title: "Class Attendance",
    url: "/staff/attendance",
    icon: ClipboardCheck,
  },
  {
    title: "Teaching Timetable",
    url: "/staff/timetable",
    icon: Calendar,
  },
  {
    title: "Teaching Cover",
    url: "/staff/cover-requests",
    icon: UserCheck,
  },
];

const hodMenuItems = [
  {
    title: "Course Allocations",
    url: "/staff/hod/allocations",
    icon: Layers,
  },
  {
    title: "Marks Review Queue",
    url: "/staff/hod/review-queue",
    icon: FileSpreadsheet,
  },
  {
    title: "Senate Broadsheet",
    url: "/staff/hod/broadsheet",
    icon: Award,
  },
  {
    title: "Supplementary Exams",
    url: "/staff/hod/supplementaries",
    icon: FileText,
  },
];

export const StaffSidebar = () => {
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { user, roles, isMultiRole, clearActiveRole } = useCurrentUser();
  const hasFinanceRole = roles?.some((r: string) => ["finance", "admin"].includes(r.toLowerCase()));
  const hasHodRole = roles?.some((r: string) => ["hod", "dean", "admin"].includes(r.toLowerCase()));
  const normalizedSearch = search.trim().toLowerCase();
  const visibleLecturerItems = lecturerMenuItems.filter((item) => item.title.toLowerCase().includes(normalizedSearch));
  const visibleHodItems = hodMenuItems.filter((item) => item.title.toLowerCase().includes(normalizedSearch));

  const isActive = (url: string, exact = false) => {
    if (exact || url === "/staff") return pathname === url;
    return pathname.startsWith(url);
  };

  const handleLogout = async () => {
    clearActiveRole();
    await authClient.signOut();
    router.push("/sign-in");
  };

  const handleSwitchRole = () => {
    clearActiveRole();
    router.push("/");
  };

  return (
    <Sidebar className="group border-r border-sidebar-border/80 bg-sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="w-full justify-start gap-2 px-2">
              <Link href="/staff" aria-label="ECU staff dashboard">
              <div className="flex aspect-square size-11 items-center justify-center overflow-hidden">
                <Image 
                  src="/icon.png" 
                  alt="ECU Logo" 
                  width={48} 
                  height={48} 
                  className="size-full object-contain"
                />
              </div>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm">ECU Staff</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 w-fit font-medium bg-primary/10 text-primary border-primary/20">
                  Staff Workspace
                </Badge>
              </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="relative px-1 group-data-[collapsible=icon]:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            aria-label="Search academic menu"
            placeholder="Search menu"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 border-0 bg-muted/55 pl-8 text-xs shadow-none focus-visible:ring-1"
          />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full justify-start gap-2 rounded-md px-2 data-[state=open]:bg-muted/60">
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-xs font-semibold">{user?.name ?? "Loading…"}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{user?.staffNumber ?? "Staff account"}</span>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="w-56">
                {isMultiRole && (
                  <>
                    <DropdownMenuItem onClick={handleSwitchRole} className="gap-2">
                      <ArrowLeftRight className="size-4" />
                      Switch to Admin Portal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="border-t border-sidebar-border/60 pt-3">
          <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Academic Office</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleLecturerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url, item.exact)}
                    tooltip={item.title}
                    className="h-9 rounded-md px-3 text-[13px] font-normal transition-colors duration-200 data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary hover:bg-muted/70"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-[18px] shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasHodRole && (visibleHodItems.length > 0 || !normalizedSearch) && (
          <SidebarGroup className="border-t border-sidebar-border/60 pt-3">
            <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Academic Leadership</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleHodItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="h-9 rounded-md px-3 text-[13px] font-normal transition-colors duration-200 data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary hover:bg-muted/70"
                    >
                      <Link href={item.url}>
                        <item.icon className="size-[18px] shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasFinanceRole && (
          <SidebarGroup className="border-t border-sidebar-border/60 pt-3">
            <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Finance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin/finance")}
                    tooltip="Finance Operations"
                  >
                    <Link href="/admin/finance">
                      <DollarSign className="size-4 text-emerald-600" />
                      <span>Finance Operations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};
