"use client";

import { StaffSidebar } from "@/modules/dashboard/ui/components/staff-sidebar";
import { SidebarProvider, useSidebar } from "@workspace/ui/components/sidebar";
import { Button } from "@workspace/ui/components/button";
import { ModeToggle } from "@workspace/ui/components/mode-toggle";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  House,
  LayoutGrid,
  LogOut,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

export const StaffLayout = ({ children, defaultOpen }: { children: React.ReactNode; defaultOpen: boolean }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const currentPage = pathname.split("/").filter(Boolean).at(-1) ?? "Staff Dashboard";
  const pageTitle = currentPage === "staff"
    ? "Dashboard"
    : currentPage
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  const initials = (user?.name ?? "ECU")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
    >
      <StaffSidebar />
      <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-muted/35">
        <header className="z-10 flex h-[72px] shrink-0 items-center gap-4 bg-transparent px-4 md:px-6">
          <SidebarCollapseButton />
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <Link href="/" className="inline-flex shrink-0 items-center gap-2 font-medium text-primary hover:text-primary/80">
              <House className="size-4" />
              <span>Home</span>
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/55" />
            <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-foreground">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{pageTitle}</span>
            </span>
          </nav>
          <nav aria-label="Academic shortcuts" className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Staff dashboard">
              <Link href="/"><LayoutGrid className="size-4" /></Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Teaching courses">
              <Link href="/courses"><BookOpen className="size-4" /></Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Teaching timetable">
              <Link href="/timetable"><CalendarDays className="size-4" /></Link>
            </Button>
            <div className="ml-1 pl-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 rounded-full bg-primary/10 text-primary" aria-label="Open staff profile menu">
                    <span className="text-[10px] font-bold">{initials || "EC"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 p-2">
                  <div className="px-2 py-2">
                    <p className="truncate text-sm font-semibold">{user?.name ?? "ECU Staff"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between gap-3 px-2 py-2">
                    <span className="text-sm">Dark mode</span>
                    <ModeToggle />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </SidebarProvider>
  );
};

function SidebarCollapseButton() {
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile ? openMobile : open;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isMobile ? (expanded ? "Close navigation" : "Open navigation") : (expanded ? "Collapse sidebar" : "Expand sidebar")}
      onClick={toggleSidebar}
      className="size-10 shrink-0 rounded-full bg-card text-muted-foreground shadow-sm hover:bg-muted"
    >
      {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
    </Button>
  );
}
