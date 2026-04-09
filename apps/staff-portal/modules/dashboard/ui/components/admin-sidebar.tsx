"use client";

import {
  LayoutDashboardIcon,
  UserIcon,
  SchoolIcon,
  Users,
  LogOut,
  ArrowLeftRight,
  ChevronUp,
  CalendarDays,
  ClipboardList,
  BookOpen,
  DollarSign,
  Library,
  BarChart3,
  Settings,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
import { Separator } from "@workspace/ui/components/separator";
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
import { ModeToggle } from "@/components/ui/mode-toggle";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboardIcon,
        exact: true,
      },
    ],
  },
  {
    label: "Academic",
    items: [
      {
        title: "Academic Structure",
        url: "/admin/academic-structure",
        icon: SchoolIcon,
      },
      {
        title: "Academic Calendar",
        url: "/admin/academic-calendar",
        icon: CalendarDays,
      },
      {
        title: "Admissions",
        url: "/admin/admissions",
        icon: ClipboardList,
      },
      {
        title: "Students",
        url: "/admin/students",
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Staff",
        url: "/admin/staff",
        icon: Users,
      },
      {
        title: "Marks & Assessments",
        url: "/admin/marks",
        icon: BookOpen,
      },
      {
        title: "Finance",
        url: "/admin/finance",
        icon: DollarSign,
      },
      {
        title: "Library",
        url: "/admin/library",
        icon: Library,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Reports",
        url: "/admin/reports",
        icon: BarChart3,
      },
      {
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isMultiRole, clearActiveRole } = useCurrentUser();

  const isActive = (url: string, exact = false) => {
    if (exact) return pathname === url;
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
    <Sidebar className="group" collapsible="icon">
      {/* ── Header / Brand ── */}
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
                <span className="font-semibold text-sm">ECU Portal</span>
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 w-fit font-medium bg-primary/10 text-primary border-primary/20"
                >
                  Admin
                </Badge>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent>
        {navGroups.map((group, idx) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url, item.exact);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
            {idx < navGroups.length - 1 && <div className="px-3 mt-2"><Separator /></div>}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer / User Menu ── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden px-2 pb-1">
              <span className="text-xs text-muted-foreground flex-1">Theme</span>
              <ModeToggle />
            </div>
          </SidebarMenuItem>
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
                      {user?.name ?? "Loading..."}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {user?.email ?? ""}
                    </span>
                  </div>
                  <ChevronUp className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                {isMultiRole && (
                  <>
                    <DropdownMenuItem onClick={handleSwitchRole} className="gap-2">
                      <ArrowLeftRight className="size-4" />
                      Switch to Staff Portal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
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
