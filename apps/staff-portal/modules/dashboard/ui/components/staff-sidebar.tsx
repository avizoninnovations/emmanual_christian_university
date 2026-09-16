"use client";

import {
  LayoutDashboardIcon,
  UserIcon,
  LogOut,
  ArrowLeftRight,
  ChevronUp,
  DollarSign,
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

const staffMenuItems = [
  {
    title: "My Dashboard",
    url: "/staff",
    icon: LayoutDashboardIcon,
  },
];

export const StaffSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, roles, isMultiRole, clearActiveRole } = useCurrentUser();
  const hasFinanceRole = roles?.some((r: string) => ["finance", "admin"].includes(r.toLowerCase()));

  const isActive = (url: string) => {
    if (url === "/staff" && pathname === "/staff") return true;
    if (url !== "/staff") {
      return pathname.startsWith(url);
    }
    return false;
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
                <span className="font-semibold text-sm">ECU Staff</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 w-fit font-medium bg-primary/10 text-primary border-primary/20">
                  Staff Workspace
                </Badge>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>My Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {staffMenuItems.map((item) => (
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
              {hasFinanceRole && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin/finance")}
                    tooltip="Finance Office"
                  >
                    <Link href="/admin/finance">
                      <DollarSign className="size-4 text-emerald-600" />
                      <span>Finance Operations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
