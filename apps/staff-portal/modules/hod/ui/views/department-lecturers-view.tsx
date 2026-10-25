"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { BookOpen, Mail, Phone, Search, UserRound, UsersRound, UserX } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";

type Roster = NonNullable<ReturnType<typeof useQuery<typeof api.hodLecturers.roster>>>;
type Lecturer = Roster["lecturers"][number];
type Filter = "all" | "teaching" | "unassigned";

export function DepartmentLecturersView() {
  const scope = useHodScope();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(null);
  const roster = useQuery(api.hodLecturers.roster, scope.departmentId && scope.periodId
    ? { departmentId: scope.departmentId, periodId: scope.periodId } : "skip");
  const visibleLecturers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (roster?.lecturers ?? []).filter(lecturer => {
      if (filter === "teaching" && !lecturer.courseCount) return false;
      if (filter === "unassigned" && lecturer.courseCount) return false;
      return !query || [lecturer.name, lecturer.email, lecturer.phone, lecturer.staffId,
        ...lecturer.assignedCourses.map(course => `${course.code} ${course.title} ${course.programName}`)]
        .some(value => value.toLowerCase().includes(query));
    });
  }, [filter, roster?.lecturers, search]);

  return <div className="w-full space-y-5 p-4 lg:p-6">
    <HodScopePicker scope={scope} />
    {roster ? <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-lg font-semibold tracking-tight">Department lecturers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{roster.departmentName} · {roster.periodName}</p></div>
        <Badge variant="outline" className="rounded-sm">{roster.lecturerCount} {roster.lecturerCount === 1 ? "lecturer" : "lecturers"}</Badge>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Lecturer roster" value={roster.lecturerCount} detail="In or assigned to this department" icon={UsersRound} />
        <SummaryCard label="Teaching this semester" value={roster.teachingCount} detail="With at least one course unit" icon={BookOpen} />
        <SummaryCard label="Assigned course units" value={roster.courseCount} detail="Across this department" icon={BookOpen} />
        <SummaryCard label="No units assigned" value={roster.unassignedCount} detail="For the selected semester" icon={UserX} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-x-5">
            <FilterButton label="All lecturers" count={roster.lecturerCount} active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterButton label="Teaching" count={roster.teachingCount} active={filter === "teaching"} onClick={() => setFilter("teaching")} />
            <FilterButton label="Unassigned" count={roster.unassignedCount} active={filter === "unassigned"} onClick={() => setFilter("unassigned")} />
          </div>
          <div className="w-full sm:max-w-sm">
            <label htmlFor="lecturer-search" className="mb-1.5 block text-xs font-medium">Search lecturers or course units</label>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="lecturer-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, staff ID, email, or course" className="h-10 rounded-sm bg-background pl-9" /></div>
          </div>
        </div>
        {roster.isCapped && <p className="text-xs text-muted-foreground">Showing up to 300 lecturer records or assignments. Narrow the semester or department to see a smaller roster.</p>}
        <LecturerTable lecturers={visibleLecturers} onDetails={setSelectedLecturer} emptySearch={!!search} onClearSearch={() => setSearch("")} />
      </section>

      <Sheet open={!!selectedLecturer} onOpenChange={open => !open && setSelectedLecturer(null)}>
        <SheetContent className="w-[92vw] overflow-y-auto rounded-l-sm p-0 sm:w-[62.5vw] sm:max-w-none">
          {selectedLecturer && <LecturerDetails lecturer={selectedLecturer} departmentName={roster.departmentName} periodName={roster.periodName} />}
        </SheetContent>
      </Sheet>
    </> : <LecturerRosterSkeleton />}
  </div>;
}

function SummaryCard({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof UsersRound }) {
  return <Card className="gap-0 rounded-sm py-0"><CardContent className="flex items-start justify-between gap-3 p-4">
    <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
    <span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><Icon className="size-4" /></span>
  </CardContent></Card>;
}

function LecturerTable({ lecturers, onDetails, emptySearch, onClearSearch }: { lecturers: Lecturer[]; onDetails: (lecturer: Lecturer) => void; emptySearch: boolean; onClearSearch: () => void }) {
  return <div className="w-full overflow-x-auto">
    <Table>
      <TableHeader><TableRow className="hover:bg-transparent">
        <TableHead className="w-12">#</TableHead><TableHead>Lecturer</TableHead><TableHead>Staff ID</TableHead>
        <TableHead>Academic role</TableHead><TableHead>Course units</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Actions</TableHead>
      </TableRow></TableHeader>
      <TableBody>{lecturers.map((lecturer, index) => <TableRow key={lecturer.userId}>
        <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
        <TableCell><div className="flex min-w-48 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-xs font-semibold text-primary">{initials(lecturer.name)}</span>
          <div className="min-w-0"><p className="truncate font-medium" title={lecturer.name}>{lecturer.name}</p><p className="max-w-64 truncate text-xs text-muted-foreground" title={lecturer.email}>{lecturer.email || "Email not recorded"}</p></div></div></TableCell>
        <TableCell className="font-mono text-xs">{lecturer.staffId || "—"}</TableCell>
        <TableCell className="capitalize">{lecturer.title || roleLabels(lecturer)}</TableCell>
        <TableCell><span className="font-medium tabular-nums">{lecturer.courseCount}</span><span className="ml-1 text-xs text-muted-foreground">{lecturer.courseCount === 1 ? "unit" : "units"}</span></TableCell>
        <TableCell><Badge variant={lecturer.accountStatus === "active" ? "secondary" : "outline"} className="rounded-sm capitalize">{lecturer.accountStatus === "unlinked" ? "Unavailable" : lecturer.accountStatus}</Badge></TableCell>
        <TableCell className="text-right"><Button variant="ghost" size="sm" className="rounded-sm text-primary" onClick={() => onDetails(lecturer)}>Details</Button></TableCell>
      </TableRow>)}
      {!lecturers.length && <TableRow><TableCell colSpan={7} className="h-36 text-center">
        <UserRound className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">{emptySearch ? "No matching lecturers" : "No lecturers found"}</p>
        {emptySearch && <Button variant="ghost" size="sm" className="mt-1" onClick={onClearSearch}>Clear search</Button>}
      </TableCell></TableRow>}</TableBody>
    </Table>
  </div>;
}

function LecturerDetails({ lecturer, departmentName, periodName }: { lecturer: Lecturer; departmentName: string; periodName: string }) {
  return <>
    <SheetHeader className="border-b bg-muted/20 px-6 py-6 pr-14">
      <div className="flex items-center gap-4"><span className="flex size-14 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-lg font-semibold text-primary">{initials(lecturer.name)}</span>
        <div className="min-w-0"><SheetTitle className="text-xl">{lecturer.name}</SheetTitle><SheetDescription className="mt-1">{lecturer.title || roleLabels(lecturer)} · {departmentName}</SheetDescription></div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2"><Badge variant="outline" className="rounded-sm">{lecturer.courseCount} course {lecturer.courseCount === 1 ? "unit" : "units"}</Badge>
        <Badge variant={lecturer.accountStatus === "active" ? "secondary" : "outline"} className="rounded-sm capitalize">{lecturer.accountStatus === "unlinked" ? "Account unavailable" : lecturer.accountStatus}</Badge></div>
    </SheetHeader>
    <div className="px-6 py-5">
      <Tabs defaultValue="overview">
        <TabsList className="w-full"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="courses">Course units ({lecturer.courseCount})</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-6 pt-4">
          <section><SectionHeading>Academic assignment</SectionHeading><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DetailField label="Department" value={departmentName} /><DetailField label="Semester" value={periodName} />
            <DetailField label="Current teaching load" value={`${lecturer.courseCount} course ${lecturer.courseCount === 1 ? "unit" : "units"}`} />
            <DetailField label="Academic role" value={roleLabels(lecturer)} />
          </div></section>
          <section><SectionHeading>Contact and staff record</SectionHeading><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DetailField label="Email" value={lecturer.email || "Not recorded"} icon={Mail} href={lecturer.email ? `mailto:${lecturer.email}` : undefined} />
            <DetailField label="Phone" value={lecturer.phone || "Not recorded"} icon={Phone} href={lecturer.phone ? `tel:${lecturer.phone}` : undefined} />
            <DetailField label="Staff ID" value={lecturer.staffId || "Not recorded"} /><DetailField label="Account status" value={lecturer.accountStatus === "unlinked" ? "Unavailable" : lecturer.accountStatus} /></div></section>
          <section><SectionHeading>Teaching summary</SectionHeading><div className="mt-3 flex items-center gap-3 rounded-sm border bg-muted/20 p-4"><BookOpen className="size-5 text-primary" /><div><p className="font-medium">{lecturer.courseCount} assigned course {lecturer.courseCount === 1 ? "unit" : "units"}</p><p className="text-sm text-muted-foreground">Open the Course units tab to review programmes and study levels.</p></div></div></section>
        </TabsContent>
        <TabsContent value="courses" className="space-y-3 pt-4">
          <div className="flex items-center justify-between"><SectionHeading>Assigned course units</SectionHeading><span className="text-xs text-muted-foreground">{periodName}</span></div>
          {lecturer.assignedCourses.length ? lecturer.assignedCourses.map(course => <article key={course.id} className="rounded-sm border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-primary">{course.code}</p><h3 className="mt-1 font-medium">{course.title}</h3></div><Badge variant="outline" className="rounded-sm">Year {course.yearOfStudy} · Semester {course.semester}</Badge></div>
            <p className="mt-2 text-sm text-muted-foreground">{course.programName}</p>
          </article>) : <div className="rounded-sm border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">No course units assigned for this semester.</div>}
        </TabsContent>
      </Tabs>
    </div>
  </>;
}

function DetailField({ label, value, icon: Icon, href }: { label: string; value: string; icon?: typeof Mail; href?: string }) {
  return <div className="min-w-0 rounded-sm border bg-card p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 flex items-center gap-2 text-sm font-medium">{Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}{href ? <a className="truncate text-primary hover:underline" href={href}>{value}</a> : <span className="truncate">{value}</span>}</p></div>;
}

function SectionHeading({ children }: { children: React.ReactNode }) { return <h2 className="text-sm font-semibold">{children}</h2>; }
function FilterButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return <Button type="button" variant="ghost" aria-pressed={active} onClick={onClick} className={`h-10 gap-2 rounded-sm border-b-2 px-2 text-sm hover:bg-primary/5 ${active ? "border-primary bg-primary/5 font-semibold text-primary" : "border-transparent text-muted-foreground"}`}>
    {label}<span className={`text-xs tabular-nums ${active ? "text-primary" : "text-muted-foreground"}`}>{count}</span></Button>;
}
function LecturerRosterSkeleton() { return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-sm" />)}</div><Skeleton className="h-96 rounded-sm" /></div>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "L"; }
function roleLabels(lecturer: Lecturer) { return lecturer.roles.filter(role => ["lecturer", "senior_lecturer", "hod"].includes(role)).map(role => role.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase())).join(", ") || "Lecturer"; }
