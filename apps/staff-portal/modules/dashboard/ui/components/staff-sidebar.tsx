"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { ModeToggle } from "@workspace/ui/components/mode-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { findStaffSidebarNavigation, StaffSidebarNavigation } from "@/modules/dashboard/ui/components/staff-sidebar-navigation";
import { Skeleton } from "@workspace/ui/components/skeleton";

export const StaffSidebar = () => {
  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openNestedPath, setOpenNestedPath] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { open, setOpen, isMobile } = useSidebar();
  const hoverExpanded = useRef(false);
  const { user, roles, isMultiRole, clearActiveRole } = useCurrentUser();
  const staffProfile = useQuery(api.staffPersonalRecords.getMyProfile);
  const hasLeadership = roles?.some((role) => ["hod", "dean", "admin"].includes(role.toLowerCase()));
  const canReviewRetakes = roles?.some((role) => ["hod", "registrar", "admin"].includes(role.toLowerCase()));
  const hasFinance = roles?.some((role) => ["finance", "bursar", "cashier", "admin"].includes(role.toLowerCase()));
  const hasAdmissions = roles?.some((role) => ["admissions_officer", "registrar"].includes(role.toLowerCase()));
  const profileActive = pathname === "/profile";

  useEffect(() => {
    const activeNavigation = findStaffSidebarNavigation(pathname);
    setOpenSection(activeNavigation?.sectionKey ?? null);
    setOpenNestedPath((current) => {
      if (activeNavigation?.nestedPath) return activeNavigation.nestedPath;
      if (activeNavigation && current?.startsWith(`${activeNavigation.sectionKey}/`)) return current;
      return null;
    });
  }, [pathname]);

  const accountOpen = openSection === "account";

  const signOut = async () => {
    clearActiveRole();
    await authClient.signOut();
    router.push("/sign-in");
  };

  const switchRole = () => {
    clearActiveRole();
    router.push("/");
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("[data-sidebar-collapse-toggle]")) return;
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
    <Sidebar variant="sidebar" collapsible="icon" className="group relative border-0 shadow-none" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-sidebar shadow-[4px_0_14px_rgba(0,0,0,0.28)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url('/001.webp')] bg-cover bg-center opacity-[0.16] dark:opacity-[0.12]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/55 dark:bg-background/68" />

        <SidebarHeader className="relative z-10 gap-3 border-b border-sidebar-border/70 px-3 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className="h-11 gap-2 px-1 hover:bg-transparent">
                <Link href="/" aria-label="ECU staff dashboard">
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

        </SidebarHeader>

        <SidebarContent className="relative z-10 gap-0 overflow-x-hidden overflow-y-auto px-2 py-1">
          <StaffSidebarIconRail pathname={pathname} hasLeadership={Boolean(hasLeadership)} canReviewRetakes={Boolean(canReviewRetakes)} hasFinance={Boolean(hasFinance)} hasAdmissions={Boolean(hasAdmissions)} />
          <div className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup className="border-b border-sidebar-border/60 px-1 py-3">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Dashboard" className="h-10 gap-3 rounded-lg px-3 font-medium transition-colors data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-primary/10 hover:text-primary">
                    <Link href="/"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${pathname === "/" ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><LayoutDashboard className="size-4" /></span><span>Dashboard</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <StaffSidebarNavigation
            pathname={pathname}
            query={search}
            openSection={openSection}
            onOpenChange={(key, isOpen) => setOpenSection(isOpen ? key : null)}
            openNestedPath={openNestedPath}
            onNestedPathChange={(path, isOpen) => setOpenNestedPath((current) => {
              if (isOpen) return path;
              return current === path || current?.startsWith(`${path}/`) ? null : current;
            })}
            roles={roles ?? []}
          />
          </div>
        </SidebarContent>
        <SidebarFooter className="relative z-10 gap-1 border-t border-sidebar-border/70 px-2 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={() => setOpenSection((current) => current === "account" ? null : "account")}
                aria-expanded={accountOpen}
                className="h-11 gap-2 rounded-lg px-1.5 hover:bg-sidebar-accent/70 group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0!"
              >
                <Avatar className="size-8 shrink-0 rounded-full">
                  <AvatarImage src={staffProfile?.photoUrl ?? user?.image ?? undefined} alt="Staff profile" />
                  <AvatarFallback className="rounded-full bg-primary/10 text-primary"><UserRound className="size-4" /></AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate text-sm font-medium">{user?.name ?? <Skeleton className="h-4 w-24" />}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{user?.staffNumber ?? "Staff account"}</span>
                </span>
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-[400ms] group-data-[collapsible=icon]:hidden ${accountOpen ? "rotate-180" : ""}`} />
              </SidebarMenuButton>
              <div aria-hidden={!accountOpen} inert={!accountOpen} className={`grid transition-[grid-template-rows] duration-[400ms] ease-in-out group-data-[collapsible=icon]:hidden ${accountOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <SidebarMenuSub className="mx-3.5 gap-1 border-l-0 px-1.5 py-1">
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={profileActive} className="h-9 gap-3 rounded-lg px-2.5 data-[active=true]:bg-muted data-[active=true]:font-medium data-[active=true]:text-foreground hover:bg-muted/70">
                        <Link href="/profile"><UserRound className="size-4" /><span>Profile</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {isMultiRole && <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="h-9 gap-3 rounded-lg px-2.5 hover:bg-muted/70">
                        <button type="button" onClick={switchRole}><ArrowLeftRight className="size-4" /><span>Switch portal</span></button>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild className="h-9 gap-3 rounded-lg px-2.5 text-destructive hover:bg-destructive/5 hover:text-destructive">
                        <button type="button" onClick={signOut}><LogOut className="size-4" /><span>Sign out</span></button>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </div>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <div className="flex h-10 items-center justify-between rounded-lg px-2 group-data-[collapsible=icon]:px-0">
                <span className="text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">Appearance</span>
                <ModeToggle />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
      <SidebarRail
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        data-sidebar-collapse-toggle="true"
        className="!inset-y-auto !top-4 !-right-[18px] !z-30 !flex !size-9 !translate-x-0 !items-center !justify-center !rounded-full !border !border-sidebar-border !bg-background !shadow-md !after:hidden hover:!bg-muted"
      >
        {open ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </SidebarRail>
    </Sidebar>
  );
};
