"use client";

import { StaffSidebar } from "@/modules/dashboard/ui/components/staff-sidebar";
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Button } from "@workspace/ui/components/button";
import { ModeToggle } from "@workspace/ui/components/mode-toggle";
import {
  BookOpen,
  CalendarDays,
  LayoutGrid,
  LogOut,
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
      <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
        <header className="z-10 flex h-12 shrink-0 items-center gap-3 bg-background/95 px-3 md:px-5">
          <SidebarTrigger className="size-8 rounded-md text-muted-foreground hover:bg-muted" />
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span>Staff</span><span className="mx-2 text-border">/</span>
            <span className="font-medium text-foreground">{pageTitle}</span>
          </div>
          <nav aria-label="Academic shortcuts" className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Staff dashboard">
              <Link href="/staff"><LayoutGrid className="size-4" /></Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Teaching courses">
              <Link href="/staff/courses"><BookOpen className="size-4" /></Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Teaching timetable">
              <Link href="/staff/timetable"><CalendarDays className="size-4" /></Link>
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
