"use client";

import Link from "next/link";
import {
  type LucideIcon,
  BookOpen, CalendarDays, ClipboardCheck, FileSpreadsheet, FileText, GraduationCap,
  Layers, Mail, Wallet, UserRound, ClipboardList, UsersRound, CalendarRange,
  DoorOpen, ShieldAlert, MessageSquareWarning, Scale, ChartNoAxesCombined, Utensils,
  Building2, Award, Bus, Boxes, PackageCheck, Sparkles, BriefcaseBusiness,
} from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import {
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";

type StaffSidebarLink = { title: string; url: string; icon: LucideIcon };
type StaffSidebarSection = { key: string; title: string; icon: LucideIcon; links: StaffSidebarLink[]; roles?: string[] };

const alphaLinks: StaffSidebarLink[] = [
  { title: "My Memos", url: "/workspace/memos", icon: Mail },
  { title: "My Finance", url: "/workspace/finance", icon: Wallet },
  { title: "Salary Pay Slip", url: "/workspace/salary-payslip", icon: Wallet },
  { title: "Personal Records", url: "/profile", icon: UserRound },
  { title: "My Evaluation", url: "/workspace/my-evaluation", icon: ChartNoAxesCombined },
  { title: "Evaluate Supervisors", url: "/workspace/supervisor-evaluation", icon: UsersRound },
  { title: "Leave Application", url: "/workspace/leave-application", icon: ClipboardList },
  { title: "Leave Calendar", url: "/workspace/leave-calendar", icon: CalendarRange },
  { title: "Exit Application", url: "/workspace/exit-application", icon: DoorOpen },
  { title: "Staff Disciplinary", url: "/workspace/disciplinary", icon: ShieldAlert },
  { title: "My Complaints", url: "/workspace/complaints", icon: MessageSquareWarning },
  { title: "My Defenses", url: "/workspace/defenses", icon: Scale },
  { title: "My Teaching", url: "/workspace/my-teaching", icon: BookOpen },
  { title: "My Teaching Reports", url: "/workspace/teaching-reports", icon: FileSpreadsheet },
  { title: "Meals", url: "/workspace/meals", icon: Utensils },
];

export const staffSidebarSections: StaffSidebarSection[] = [
  { key: "my-alpha", title: "My Alpha", icon: BriefcaseBusiness, links: alphaLinks },
  { key: "academics", title: "Academics Office", icon: GraduationCap, links: [
    { title: "Teaching Courses", url: "/courses", icon: BookOpen },
    { title: "Class Attendance", url: "/attendance", icon: ClipboardCheck },
    { title: "Teaching Cover", url: "/cover-requests", icon: UsersRound },
  ] },
  { key: "faculty", title: "Faculty Central", icon: Building2, links: [
    { title: "Faculty Workspace", url: "/workspace/faculty-central", icon: Building2 },
  ] },
  { key: "results", title: "Results", icon: Award, links: [
    { title: "Results Workspace", url: "/workspace/results", icon: Award },
  ] },
  { key: "timetable", title: "Timetable", icon: CalendarDays, links: [
    { title: "Teaching Timetable", url: "/timetable", icon: CalendarDays },
  ] },
  { key: "leadership", title: "Academic Leadership", icon: GraduationCap, roles: ["hod", "dean", "admin"], links: [
    { title: "Course Allocations", url: "/hod/allocations", icon: Layers },
    { title: "Marks Review Queue", url: "/hod/review-queue", icon: FileSpreadsheet },
    { title: "Senate Broadsheet", url: "/hod/broadsheet", icon: FileText },
    { title: "Supplementary Exams", url: "/hod/supplementaries", icon: ClipboardCheck },
  ] },
  { key: "procurement", title: "Procurement", icon: PackageCheck, links: [
    { title: "Procurement Workspace", url: "/workspace/procurement", icon: PackageCheck },
  ] },
  { key: "inventory", title: "Inventory", icon: Boxes, links: [
    { title: "Inventory Workspace", url: "/workspace/inventory", icon: Boxes },
  ] },
  { key: "vehicles", title: "Vehicles", icon: Bus, links: [
    { title: "Vehicle Workspace", url: "/workspace/vehicles", icon: Bus },
  ] },
  { key: "extras", title: "Alpha Extras", icon: Sparkles, links: [
    { title: "University Tools", url: "/workspace/alpha-extras", icon: Sparkles },
  ] },
];

export function findStaffSidebarSection(pathname: string): string | undefined {
  return staffSidebarSections.find((section) => section.links.some(({ url }) =>
    url === pathname || (url !== "/" && pathname.startsWith(`${url}/`))))?.key;
}

export function StaffSidebarNavigation({
  pathname, query, openSection, onOpenChange, roles,
}: {
  pathname: string;
  query: string;
  openSection: string | null;
  onOpenChange: (key: string, open: boolean) => void;
  roles: string[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const roleSet = new Set(roles.map((role) => role.toLowerCase()));
  const sections = staffSidebarSections.filter((section) => !section.roles || section.roles.some((role) => roleSet.has(role)));

  return <SidebarGroup className="border-t border-sidebar-border/60 px-0 py-2.5"><SidebarGroupContent>
    {sections.map((section) => {
      const sectionMatches = section.title.toLowerCase().includes(normalizedQuery);
      const links = section.links.filter(({ title }) => sectionMatches || title.toLowerCase().includes(normalizedQuery));
      if (links.length === 0) return null;
      return <NavigationGroup key={section.key} section={section} links={links} pathname={pathname} open={openSection === section.key} onOpenChange={(open) => onOpenChange(section.key, open)} />;
    })}
  </SidebarGroupContent></SidebarGroup>;
}

function NavigationGroup({ section, links, pathname, open, onOpenChange }: {
  section: (typeof staffSidebarSections)[number];
  links: StaffSidebarLink[];
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const Icon = section.icon;
  return <Collapsible open={open} onOpenChange={onOpenChange} className="group/nav mb-1">
    <SidebarMenu><SidebarMenuItem><CollapsibleTrigger asChild>
      <SidebarMenuButton tooltip={section.title} className="h-10 gap-3 rounded-md px-3 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground">
        <Icon className="size-5 shrink-0" /><span className="flex-1 truncate uppercase">{section.title}</span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform duration-300 group-data-[state=open]/nav:rotate-180 group-data-[collapsible=icon]:hidden" />
      </SidebarMenuButton>
    </CollapsibleTrigger><CollapsibleContent>
      <SidebarMenuSub className="mx-4 mb-1 mt-0.5 gap-0.5 border-sidebar-border/70 pl-2">
        {links.map(({ title, url, icon: LinkIcon }) => <SidebarMenuSubItem key={url}>
          <SidebarMenuSubButton asChild isActive={pathname === url || (url !== "/" && pathname.startsWith(`${url}/`))} className="h-9 gap-2.5 px-2 text-[13px] text-muted-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-primary hover:text-sidebar-foreground">
            <Link href={url}><LinkIcon className="size-4 shrink-0" /><span className="truncate">{title}</span></Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>)}
      </SidebarMenuSub>
    </CollapsibleContent></SidebarMenuItem></SidebarMenu>
  </Collapsible>;
}
