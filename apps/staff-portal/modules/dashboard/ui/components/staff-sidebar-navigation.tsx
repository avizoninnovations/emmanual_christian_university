"use client";

import Link from "next/link";
import {
  type LucideIcon,
  BookOpen, CalendarDays, ClipboardCheck, FileSpreadsheet, FileText, GraduationCap,
  Layers, Mail, Wallet, UserRound, ClipboardList, UsersRound, CalendarRange,
  DoorOpen, ShieldAlert, MessageSquareWarning, Scale, ChartNoAxesCombined, Utensils,
  Building2, Award, Bus, Boxes, PackageCheck, Sparkles, BriefcaseBusiness, MonitorPlay,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import {
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";

type SidebarLink = { kind: "link"; title: string; url: string; icon: LucideIcon };
type SidebarGroupEntry = { kind: "group"; key: string; title: string; icon: LucideIcon; items: SidebarEntry[] };
type SidebarEntry = SidebarLink | SidebarGroupEntry;
type StaffSidebarSection = { key: string; title: string; icon: LucideIcon; items: SidebarEntry[]; roles?: string[] };
const link = (title: string, url: string, icon: LucideIcon): SidebarLink => ({ kind: "link", title, url, icon });
const group = (key: string, title: string, icon: LucideIcon, items: SidebarEntry[]): SidebarGroupEntry => ({ kind: "group", key, title, icon, items });

const alphaItems: SidebarEntry[] = [
  link("My Memos", "/workspace/memos", Mail),
  group("finance", "My Finance", Wallet, [
    link("Finance Overview", "/workspace/finance", Wallet),
    link("Salary Pay Slip", "/workspace/salary-payslip", FileText),
  ]),
  group("hr-records", "HR Records", UserRound, [
    link("Personal Records", "/profile", UserRound),
    link("My Evaluation", "/workspace/my-evaluation", ChartNoAxesCombined),
    link("Evaluate Supervisors", "/workspace/supervisor-evaluation", UsersRound),
    link("Leave Application", "/workspace/leave-application", ClipboardList),
    link("Leave Calendar", "/workspace/leave-calendar", CalendarRange),
    link("Exit Application", "/workspace/exit-application", DoorOpen),
    group("disciplinary", "Staff Disciplinary", ShieldAlert, [
      link("My Complaints", "/workspace/complaints", MessageSquareWarning),
      link("My Defenses", "/workspace/defenses", Scale),
    ]),
  ]),
  group("my-teaching", "My Teaching", BookOpen, [
    link("Teaching Workspace", "/workspace/my-teaching", BookOpen),
    link("My Teaching Reports", "/workspace/teaching-reports", FileSpreadsheet),
  ]),
  link("Meals", "/workspace/meals", Utensils),
];

export const staffSidebarSections: StaffSidebarSection[] = [
  { key: "my-alpha", title: "My Alpha", icon: BriefcaseBusiness, items: alphaItems },
  { key: "faculty", title: "Faculty Central", icon: Building2, items: [link("Faculty Workspace", "/workspace/faculty-central", Building2)] },
  { key: "results", title: "Results", icon: Award, items: [
    group("lecturer-courses", "Lecturer Courses", BookOpen, [
      link("My Aggregated Units", "/workspace/aggregated-units", Layers),
      link("E-Learning Courses", "/workspace/e-learning-courses", MonitorPlay),
      link("My Course Units", "/courses", BookOpen),
      link("My Aegrotat Units", "/workspace/aegrotat-units", ClipboardCheck),
      link("Teaching Cover", "/cover-requests", UsersRound),
    ]),
    link("Results Workspace", "/workspace/results", Award),
  ] },
  { key: "timetable", title: "Timetable", icon: CalendarDays, items: [link("Teaching Timetable", "/timetable", CalendarDays)] },
  { key: "leadership", title: "Academic Leadership", icon: GraduationCap, roles: ["hod", "dean", "admin"], items: [link("Course Allocations", "/hod/allocations", Layers), link("Marks Review Queue", "/hod/review-queue", FileSpreadsheet), link("Senate Broadsheet", "/hod/broadsheet", FileText), link("Supplementary Exams", "/hod/supplementaries", ClipboardCheck)] },
  { key: "procurement", title: "Procurement", icon: PackageCheck, items: [link("Procurement Workspace", "/workspace/procurement", PackageCheck)] },
  { key: "inventory", title: "Inventory", icon: Boxes, items: [link("Inventory Workspace", "/workspace/inventory", Boxes)] },
  { key: "vehicles", title: "Vehicles", icon: Bus, items: [link("Vehicle Workspace", "/workspace/vehicles", Bus)] },
  { key: "extras", title: "Alpha Extras", icon: Sparkles, items: [link("University Tools", "/workspace/alpha-extras", Sparkles)] },
];

function findActiveEntry(items: SidebarEntry[], pathname: string, parents: string[] = []): string[] | undefined {
  for (const item of items) {
    if (item.kind === "link" && (item.url === pathname || (item.url !== "/" && pathname.startsWith(`${item.url}/`)))) return parents;
    if (item.kind === "group") {
      const match = findActiveEntry(item.items, pathname, [...parents, item.key]);
      if (match) return match;
    }
  }
  return undefined;
}

export function findStaffSidebarNavigation(pathname: string): { sectionKey: string; nestedPath: string | null } | undefined {
  for (const section of staffSidebarSections) {
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
  const sections = staffSidebarSections.filter((section) => !section.roles || section.roles.some((role) => roleSet.has(role)));
  return <SidebarGroup className="border-t border-sidebar-border/60 px-0 py-2.5"><SidebarGroupContent>
    {sections.map((section) => {
      const sectionMatches = section.title.toLowerCase().includes(normalizedQuery);
      const items = filterEntries(section.items, normalizedQuery, sectionMatches);
      if (!items.length) return null;
      return <NavigationGroup key={section.key} section={section} items={items} pathname={pathname} open={openSection === section.key} onOpenChange={(isOpen) => onOpenChange(section.key, isOpen)} openNestedPath={openNestedPath} onNestedPathChange={onNestedPathChange} />;
    })}
  </SidebarGroupContent></SidebarGroup>;
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
  return <Collapsible open={open} onOpenChange={onOpenChange} className="group/nav mb-1">
    <SidebarMenu><SidebarMenuItem><CollapsibleTrigger asChild>
      <SidebarMenuButton tooltip={section.title} className="h-10 gap-2 rounded-md px-2 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground">
        <Icon className="size-5 shrink-0" /><span className="flex-1 truncate uppercase">{section.title}</span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform duration-300 group-data-[state=open]/nav:rotate-180 group-data-[collapsible=icon]:hidden" />
      </SidebarMenuButton>
    </CollapsibleTrigger><CollapsibleContent>
      <SidebarMenuSub className="mx-1 mb-1 mt-0.5 gap-0.5 border-sidebar-border/70 px-1">
        <EntryList items={items} pathname={pathname} parentPath={section.key} openNestedPath={openNestedPath} onNestedPathChange={onNestedPathChange} />
      </SidebarMenuSub>
    </CollapsibleContent></SidebarMenuItem></SidebarMenu>
  </Collapsible>;
}

function EntryList({ items, pathname, parentPath, openNestedPath, onNestedPathChange }: {
  items: SidebarEntry[]; pathname: string; parentPath: string; openNestedPath: string | null; onNestedPathChange: (path: string, open: boolean) => void;
}) {
  return <>{items.map((item) => {
    const Icon = item.icon;
    if (item.kind === "link") return <SidebarMenuSubItem key={item.url}><SidebarMenuSubButton asChild isActive={pathname === item.url || (item.url !== "/" && pathname.startsWith(`${item.url}/`))} className="h-9 gap-1.5 px-1.5 text-[13px] text-muted-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-primary hover:text-sidebar-foreground"><Link href={item.url}><Icon className="size-4 shrink-0" /><span className="truncate">{item.title}</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>;
    const path = `${parentPath}/${item.key}`;
    const expanded = openNestedPath === path || Boolean(openNestedPath?.startsWith(`${path}/`));
    return <SidebarMenuSubItem key={path}><Collapsible open={expanded} onOpenChange={(isOpen) => onNestedPathChange(path, isOpen)}>
      <CollapsibleTrigger asChild><SidebarMenuSubButton className="h-9 gap-1.5 px-1.5 text-[13px] text-muted-foreground hover:text-sidebar-foreground"><Icon className="size-4 shrink-0" /><span className="flex-1 truncate">{item.title}</span>{expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</SidebarMenuSubButton></CollapsibleTrigger>
      <CollapsibleContent><SidebarMenuSub className="ml-1 mr-0 gap-0.5 border-sidebar-border/70 px-1"><EntryList items={item.items} pathname={pathname} parentPath={path} openNestedPath={openNestedPath} onNestedPathChange={onNestedPathChange} /></SidebarMenuSub></CollapsibleContent>
    </Collapsible></SidebarMenuSubItem>;
  })}</>;
}
