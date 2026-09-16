"use client";

import {
  LayoutDashboardIcon,
  BookOpen,
  UserIcon,
  SchoolIcon,
  CalendarCheck,
  Award,
  DollarSign,
  FileText,
  CheckSquare,
  LogOut,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";
import { authClient } from "@/lib/auth-client";

const academicNav = [
  {
    title: "Course Registration",
    url: "/academics/registration",
    icon: CheckSquare,
  },
  {
    title: "My Enrolled Courses",
    url: "/academics/courses",
    icon: BookOpen,
  },
  {
    title: "Results & Transcripts",
    url: "/academics/results",
    icon: Award,
  },
  {
    title: "Attendance & Clearance",
    url: "/academics/attendance",
    icon: CalendarCheck,
  },
];

const financeNav = [
  {
    title: "Fee Statement & Receipts",
    url: "/finance",
    icon: DollarSign,
  },
  {
    title: "Examination Card",
    url: "/finance/exam-card",
    icon: FileText,
  },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useQuery(api.student_portal.getMyProfile);

  const isActive = (url: string, exact = false) => {
    if (exact || url === "/") return pathname === url;
    return pathname.startsWith(url);
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="w-full justify-start gap-2 px-2">
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
                <span className="font-semibold text-sm">ECU Student</span>
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 w-fit font-medium bg-primary/10 text-primary border-primary/20"
                >
                  Student Portal
                </Badge>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/", true)}
                  tooltip="Dashboard"
                >
                  <Link href="/">
                    <LayoutDashboardIcon className="size-4" />
                    <span>My Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Academics */}
        <SidebarGroup>
          <SidebarGroupLabel>Academic Hub</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {academicNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Finance & Examination */}
        <SidebarGroup>
          <SidebarGroupLabel>Finance & Clearance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full justify-start gap-2 px-2 data-[state=open]:bg-sidebar-accent"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <UserIcon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate">
                      {profile?.name ?? "Student"}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate font-mono">
                      {profile?.registrationNumber ?? "Loading..."}
                    </span>
                  </div>
                  <ChevronUp className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
