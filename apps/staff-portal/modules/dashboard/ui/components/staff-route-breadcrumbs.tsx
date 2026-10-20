"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { getStaffBreadcrumbs } from "./staff-sidebar-navigation";

export function StaffRouteBreadcrumbs() {
  const pathname = usePathname();
  const breadcrumbs = getStaffBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex min-h-16 w-full items-center gap-2 px-4 py-5 text-base md:px-5 md:py-6 md:text-lg">
      <Link href="/" aria-label="Home" className="inline-flex shrink-0 items-center gap-2 font-semibold text-primary hover:underline">
        <Home className="size-5" />
        <span>Home</span>
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="inline-flex min-w-0 items-center gap-2.5">
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <crumb.icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          {crumb.href ? (
            <Link href={crumb.href} className="truncate font-semibold text-primary hover:underline">{crumb.label}</Link>
          ) : (
            <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined} className="truncate font-semibold text-foreground">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
