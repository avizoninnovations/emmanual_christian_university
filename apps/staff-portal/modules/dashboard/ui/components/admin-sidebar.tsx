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
  List,
  Settings,
  UserCheck,
  GraduationCap,
  Building2,
  ChevronRight,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
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
  items?: {
    title: string;
    url: string;
    icon?: React.ElementType;
  }[];
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
        title: "Academic",
        url: "/admin/academic",
        icon: SchoolIcon,
        items: [
          {
            title: "Faculties",
            url: "/admin/academic/faculties",
            icon: SchoolIcon,
          },
          {
            title: "Departments",
            url: "/admin/academic/departments",
            icon: Building2,
          },
          {
            title: "Programs",
            url: "/admin/academic/programs",
            icon: BookOpen,
          },
        ],
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
        items: [
          {
            title: "Active Staff",
            url: "/admin/staff/active",
          },
          {
            title: "Inactive Staff",
            url: "/admin/staff/inactive",
          },
          {
            title: "System Roles",
            url: "/admin/staff/roles",
          },
        ],
      },
      // {
      //   title: "Marks & Assessments",
      //   url: "/admin/marks",
      //   icon: BookOpen,
      // },
      // {
      //   title: "Finance",
      //   url: "/admin/finance",
      //   icon: DollarSign,
      // },
      // {
      //   title: "Library",
      //   url: "/admin/library",
      //   icon: Library,
      // },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: List,
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
      <SidebarHeader className="py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="default" className="w-full justify-start gap-2 px-1.5 h-11">
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-sm">
                <Image 
                  src="/icon.png" 
                  alt="ECU Logo" 
                  width={32} 
                  height={32} 
                  className="size-full object-contain"
                />
              </div>
              <div className="flex flex-col gap-0 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-[13px] tracking-tight">ECU Portal</span>
                <Badge
                  variant="outline"
                  className="text-[9px] h-3 px-1 w-fit font-bold bg-primary/10 text-primary border-primary/20 uppercase"
                >
                  Admin
                </Badge>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <Separator className="opacity-50" />

      {/* ── Navigation ── */}
      <SidebarContent className="gap-0">
        {navGroups.map((group, idx) => (
          <SidebarGroup key={group.label} className="py-2">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 h-6 px-3">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url, item.exact);
                  const hasSubItems = item.items && item.items.length > 0;

                  if (hasSubItems) {
                    return (
                      <Collapsible
                        key={item.title}
                        asChild
                        defaultOpen={active}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.title} isActive={active}>
                              <item.icon className="size-[14px]" />
                              <span className="text-[13px] font-medium">{item.title}</span>
                              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items?.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                    <Link href={subItem.url}>
                                      <span className="text-[13px]">{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        size="sm"
                        className="h-8 px-3"
                      >
                        <Link href={item.url}>
                          <item.icon className="size-[14px]" />
                          <span className="text-[13px] font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <Separator className="opacity-50" />

      {/* ── Footer / User Menu ── */}
      <SidebarFooter className="py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden px-2 pb-1.5">
              <span className="text-[11px] text-muted-foreground flex-1 font-medium">Theme</span>
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
