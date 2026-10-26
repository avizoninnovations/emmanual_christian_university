"use client";

import Link from "next/link";
import {
  type LucideIcon,
  BookOpen, CalendarDays, ClipboardCheck, FileSpreadsheet, FileText, GraduationCap,
  Layers, Wallet, UserRound, ClipboardList, UsersRound, CalendarRange, DollarSign,
  DoorOpen, MessageSquareWarning, Scale, ChartNoAxesCombined,
  Building2, BriefcaseBusiness,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import {
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";

type SidebarLink = { kind: "link"; title: string; url: string; icon: LucideIcon };
type SidebarGroupEntry = { kind: "group"; key: string; title: string; icon: LucideIcon; items: SidebarEntry[] };
type SidebarEntry = SidebarLink | SidebarGroupEntry;
type StaffSidebarSection = { key: string; title: string; icon: LucideIcon; items: SidebarEntry[]; url?: string; roles?: string[]; category: string };
const link = (title: string, url: string, icon: LucideIcon): SidebarLink => ({ kind: "link", title, url, icon });
const group = (key: string, title: string, icon: LucideIcon, items: SidebarEntry[]): SidebarGroupEntry => ({ kind: "group", key, title, icon, items });

const staffServiceItems: SidebarEntry[] = [
  link("My Evaluation", "/workspace/my-evaluation", ChartNoAxesCombined),
  link("Evaluate Supervisors", "/workspace/supervisor-evaluation", UsersRound),
  link("Leave Application", "/workspace/leave-application", ClipboardList),
  link("Leave Calendar", "/workspace/leave-calendar", CalendarRange),
  link("Exit Application", "/workspace/exit-application", DoorOpen),
  link("My Complaints", "/workspace/complaints", MessageSquareWarning),
  link("My Defenses", "/workspace/defenses", Scale),
];

export const staffSidebarSections: StaffSidebarSection[] = [
  { key: "leadership", category: "ACADEMICS", title: "Department Management", icon: GraduationCap, roles: ["hod", "dean", "admin"], items: [link("Department Overview", "/hod", GraduationCap), link("Course Allocations", "/hod/allocations", Layers), link("Missed Paper Approvals", "/hod/aggregated-units", Layers), link("Marks Review Queue", "/hod/review-queue", FileSpreadsheet), link("Edit Permissions", "/hod/edit-permissions", ClipboardCheck), link("Department Lecturers", "/hod/lecturers", UsersRound), link("Academic Activity", "/hod/activity", FileText), link("Senate Broadsheet", "/hod/broadsheet", FileText), link("Supplementary Exams", "/hod/supplementaries", ClipboardCheck)] },
  { key: "lecturer-courses", category: "ACADEMICS", title: "Lecturer Courses", icon: BookOpen, roles: ["lecturer", "senior_lecturer", "hod"], items: [
    link("Missed Paper Requests", "/workspace/aggregated-units", Layers),
    link("My Course Units", "/courses", BookOpen),
    link("Assessment Applications", "/workspace/aegrotat-units", ClipboardCheck),
    link("Teaching Cover", "/cover-requests", UsersRound),
    link("Mark Edit Requests", "/workspace/mark-permissions", ClipboardCheck),
  ] },
  { key: "retake-approvals", category: "ACADEMICS", title: "Retake Approvals", icon: ClipboardCheck, url: "/workspace/retake-approvals", roles: ["hod", "registrar", "admin"], items: [] },
  { key: "timetable", category: "ACADEMICS", title: "Timetable", icon: CalendarDays, url: "/timetable", items: [] },
  { key: "admissions-office", category: "ADMISSIONS", title: "Admissions Office", icon: ClipboardList, url: "/admissions", roles: ["admissions_officer", "registrar"], items: [] },
  { key: "finance-office", category: "FINANCE OFFICE", title: "Finance Office", icon: DollarSign, url: "/admin/finance", roles: ["finance"], items: [] },
  { key: "my-finance", category: "MY FINANCE", title: "My Finance", icon: Wallet, url: "/workspace/finance", items: [] },
  { key: "salary-payslip", category: "MY FINANCE", title: "Salary Pay Slip", icon: FileText, url: "/workspace/salary-payslip", items: [] },
  { key: "personal-records", category: "HR RECORDS", title: "Personal Records", icon: UserRound, url: "/profile", items: [] },
  { key: "staff-services", category: "HR RECORDS", title: "Staff Services", icon: BriefcaseBusiness, items: staffServiceItems },
];

function findActiveEntry(items: SidebarEntry[], pathname: string, parents: string[] = []): string[] | undefined {
  for (const item of items) {
    if (item.kind === "link" && (item.url === pathname || (item.url !== "/" && item.url !== "/hod" && pathname.startsWith(`${item.url}/`)))) return parents;
    if (item.kind === "group") {
      const match = findActiveEntry(item.items, pathname, [...parents, item.key]);
      if (match) return match;
    }
  }
  return undefined;
}

export function findStaffSidebarNavigation(pathname: string): { sectionKey: string; nestedPath: string | null } | undefined {
  for (const section of staffSidebarSections) {
    if (section.url && (section.url === pathname || pathname.startsWith(`${section.url}/`))) {
      return { sectionKey: section.key, nestedPath: null };
    }
    const parents = findActiveEntry(section.items, pathname);
    if (parents) return { sectionKey: section.key, nestedPath: parents.length ? [section.key, ...parents].join("/") : null };
  }
  return undefined;
}

export function findStaffSidebarSection(pathname: string): string | undefined {
  return findStaffSidebarNavigation(pathname)?.sectionKey;
}

export function StaffSidebarNavigation({ pathname, query, openSection, onOpenChange, openNestedPath, onNestedPathChange, roles }: {
  pathname: string; query: string; openSection: string | null; onOpenChange: (key: string, open: boolean) => void;
  openNestedPath: string | null; onNestedPathChange: (path: string, open: boolean) => void; roles: string[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const roleSet = new Set(roles.map((role) => role.toLowerCase()));
  const sections = staffSidebarSections.filter((section) => (!section.roles || section.roles.some((role) => roleSet.has(role)))
    && (!normalizedQuery || section.title.toLowerCase().includes(normalizedQuery) || (section.url ? false : filterEntries(section.items, normalizedQuery, false).length > 0)));
  const categories = [...new Set(sections.map((section) => section.category))];
  if (roleSet.has("admissions_officer") || roleSet.has("registrar")) {
    categories.sort((left, right) => Number(right === "ADMISSIONS") - Number(left === "ADMISSIONS"));
  }
  return <>{categories.map((category, categoryIndex) => <SidebarGroup key={category} className={`${categoryIndex === 0 ? "border-t" : ""} border-b border-sidebar-border/60 px-1 py-3`}>
    <SidebarGroupLabel className="px-4 text-xs font-bold tracking-wide text-sidebar-foreground">{category}</SidebarGroupLabel>
    <SidebarGroupContent>{sections.filter((section) => section.category === category).map((section) => {
      const sectionMatches = section.title.toLowerCase().includes(normalizedQuery);
      const items = filterEntries(section.items, normalizedQuery, sectionMatches);
      if (section.url) {
        const Icon = section.icon;
        return <SidebarMenu key={section.key} className="mb-0">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === section.url || pathname.startsWith(`${section.url}/`)} tooltip={section.title} className="h-10 gap-3 rounded-lg px-3 text-sm font-medium transition-colors data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-primary/10 hover:text-primary">
              <Link href={section.url}><span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${pathname === section.url || pathname.startsWith(`${section.url}/`) ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><Icon className="size-4" /></span><span className="truncate">{section.title}</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>;
      }
      return <NavigationGroup key={section.key} section={section} items={items} pathname={pathname} open={openSection === section.key} onOpenChange={(isOpen) => onOpenChange(section.key, isOpen)} openNestedPath={openNestedPath} onNestedPathChange={onNestedPathChange} />;
    })}</SidebarGroupContent>
  </SidebarGroup>)}</>;
}

function filterEntries(items: SidebarEntry[], query: string, parentMatches: boolean): SidebarEntry[] {
  if (!query || parentMatches) return items;
  return items.flatMap((item) => {
    if (item.title.toLowerCase().includes(query)) return [item];
    if (item.kind === "group") {
      const children = filterEntries(item.items, query, false);
      return children.length ? [{ ...item, items: children }] : [];
    }
    return [];
  });
}

function NavigationGroup({ section, items, pathname, open, onOpenChange, openNestedPath, onNestedPathChange }: {
  section: StaffSidebarSection; items: SidebarEntry[]; pathname: string; open: boolean; onOpenChange: (open: boolean) => void;
  openNestedPath: string | null; onNestedPathChange: (path: string, open: boolean) => void;
}) {
  const Icon = section.icon;
  const hasActiveRoute = pathnameMatches(items, pathname);
  return <Collapsible open={open} onOpenChange={onOpenChange} className="group/nav mb-1">
    <SidebarMenu><SidebarMenuItem><CollapsibleTrigger asChild>
      <SidebarMenuButton tooltip={section.title} aria-expanded={open} className={`h-10 gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-primary/10 hover:text-primary ${hasActiveRoute ? "bg-primary/10 font-semibold text-primary" : "font-normal"}`}>
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${hasActiveRoute ? "bg-primary text-primary-foreground" : "bg-muted text-sidebar-accent-foreground"}`}><Icon className="size-4" /></span><span className="flex-1 truncate">{section.title}</span>
        <ChevronDown className="size-4 shrink-0 transition-transform duration-[400ms] group-data-[state=open]/nav:rotate-180 group-data-[collapsible=icon]:hidden" />
      </SidebarMenuButton>
    </CollapsibleTrigger><CollapsibleContent>
      <SidebarMenuSub className="ml-4 mr-0 gap-1 border-l border-sidebar-border/70 py-1 pl-2.5 pr-0">
        <EntryList items={items} pathname={pathname} parentPath={section.key} openNestedPath={openNestedPath} onNestedPathChange={onNestedPathChange} />
      </SidebarMenuSub>
    </CollapsibleContent></SidebarMenuItem></SidebarMenu>
  </Collapsible>;
}

function pathnameMatches(items: SidebarEntry[], pathname: string): boolean {
  return items.some((item) => item.kind === "link"
    ? pathname === item.url || (item.url !== "/" && item.url !== "/hod" && pathname.startsWith(`${item.url}/`))
    : pathnameMatches(item.items, pathname));
}

function EntryList({ items, pathname, parentPath, openNestedPath, onNestedPathChange }: {
  items: SidebarEntry[]; pathname: string; parentPath: string; openNestedPath: string | null; onNestedPathChange: (path: string, open: boolean) => void;
}) {
  return <>{items.map((item) => {
    const Icon = item.icon;
    if (item.kind === "link") {
      const active = pathname === item.url || (item.url !== "/" && item.url !== "/hod" && pathname.startsWith(`${item.url}/`));
      return <SidebarMenuSubItem key={item.url}>
        <SidebarMenuSubButton
          asChild
          size="sm"
          isActive={active}
          className={`h-9 gap-1.5 rounded-sm border-b-2 border-l-0 px-1.5 font-normal whitespace-nowrap transition-colors data-[active=true]:border-b-primary/70 data-[active=true]:bg-primary/5 data-[active=true]:font-semibold data-[active=true]:text-primary hover:bg-primary/5 [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip ${active ? "border-b-primary/70 bg-primary/5" : "border-b-transparent"}`}
        >
          <Link href={item.url} aria-current={active ? "page" : undefined}>
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors ${active ? "bg-primary/10 text-primary" : "bg-muted text-sidebar-accent-foreground"}`}>
              <Icon className="size-3.5" />
            </span>
            <span>{item.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>;
    }
    const path = `${parentPath}/${item.key}`;
    const expanded = openNestedPath === path || Boolean(openNestedPath?.startsWith(`${path}/`));
    return <SidebarMenuSubItem key={path}><Collapsible open={expanded} onOpenChange={(isOpen) => onNestedPathChange(path, isOpen)}>
      <CollapsibleTrigger asChild><SidebarMenuSubButton className={`h-10 gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-primary/5 hover:text-primary ${expanded || pathnameMatches(item.items, pathname) ? "bg-primary/5 font-medium text-primary" : "font-normal"}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${expanded || pathnameMatches(item.items, pathname) ? "bg-primary/10 text-primary" : "bg-muted text-sidebar-accent-foreground"}`}><Icon className="size-4" /></span><span className="flex-1 truncate">{item.title}</span>{expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</SidebarMenuSubButton></CollapsibleTrigger>
      <CollapsibleContent><SidebarMenuSub className="ml-1 mr-0 gap-0.5 border-sidebar-border/70 px-1"><EntryList items={item.items} pathname={pathname} parentPath={path} openNestedPath={openNestedPath} onNestedPathChange={onNestedPathChange} /></SidebarMenuSub></CollapsibleContent>
    </Collapsible></SidebarMenuSubItem>;
  })}</>;
}
