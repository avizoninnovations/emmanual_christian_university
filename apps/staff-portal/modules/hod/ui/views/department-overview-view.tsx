"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  KeyRound,
  Layers,
  UsersRound,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";

const departmentActions = [
  { title: "Course Allocations", href: "/hod/allocations", icon: Layers },
  { title: "Aggregated Unit Requests", href: "/hod/aggregated-units", icon: Layers },
  { title: "Marks Review Queue", href: "/hod/review-queue", icon: ClipboardCheck },
  { title: "Edit Permissions", href: "/hod/edit-permissions", icon: KeyRound },
  { title: "Department Lecturers", href: "/hod/lecturers", icon: UsersRound },
  { title: "Senate Broadsheet", href: "/hod/broadsheet", icon: FileSpreadsheet },
  { title: "Supplementary Exams", href: "/hod/supplementaries", icon: BookOpen },
  { title: "Academic Activity", href: "/hod/activity", icon: Activity },
];

export function DepartmentOverviewView() {
  const scope = useHodScope();
  const overview = useQuery(
    api.hod.overview,
    scope.departmentId && scope.periodId
      ? { departmentId: scope.departmentId, periodId: scope.periodId }
      : "skip",
  );

  return (
    <div className="w-full space-y-4 p-4 lg:p-6">
      <HodScopePicker scope={scope} />
      {scope.departmentId && scope.periodId && (
        overview ? <OverviewContent data={overview} /> : <OverviewSkeleton />
      )}
    </div>
  );
}

function OverviewContent({ data }: { data: NonNullable<ReturnType<typeof useQuery<typeof api.hod.overview>>> }) {
  const allocationRate = data.activeCourseCount
    ? Math.round((data.assignedCourseCount / data.activeCourseCount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active course units" value={data.activeCourseCount} icon={BookOpen} />
        <MetricCard title="Assigned this semester" value={data.assignedCourseCount} icon={ClipboardCheck} detail={`${allocationRate}% of active units`} />
        <MetricCard title="Lecturers teaching" value={data.lecturerCount} icon={UsersRound} />
        <MetricCard title="Units to assign" value={data.unassignedCourseCount} icon={Layers} />
      </div>

      {data.courseCountCapped && (
        <p className="text-xs text-muted-foreground">Summary counts show the first 300 active course units in this department.</p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Teaching allocation · {data.periodName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <SummaryBar label="Assigned course units" value={data.assignedCourseCount} total={data.activeCourseCount} />
            <SummaryBar label="Awaiting assignment" value={data.unassignedCourseCount} total={data.activeCourseCount} color="bg-muted-foreground/45" />
            <p className="text-xs text-muted-foreground">{data.departmentName} · {data.activeCourseCount} active units</p>
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Course units by lecturer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {data.lecturerWorkload.length ? data.lecturerWorkload.map(item => (
              <SummaryBar
                key={item.name}
                label={item.name}
                value={item.courseCount}
                total={Math.max(...data.lecturerWorkload.map(lecturer => lecturer.courseCount))}
                suffix={`${item.courseCount} ${item.courseCount === 1 ? "unit" : "units"}`}
              />
            )) : <p className="py-5 text-sm text-muted-foreground">No lecturer allocations for this semester.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <CardTitle className="text-sm">Recent academic activity</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/hod/activity">View all</Link></Button>
          </CardHeader>
          <CardContent className="divide-y px-4 py-1">
            {data.recentEvents.length ? data.recentEvents.map(event => (
              <div key={event._id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{event.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{event.actorName}{event.courseLabel ? ` · ${event.courseLabel}` : ""}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.details}</p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </time>
              </div>
            )) : <p className="py-8 text-center text-sm text-muted-foreground">No recorded activity for this semester yet.</p>}
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Department operations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
            {departmentActions.map(action => {
              const Icon = action.icon;
              return (
                <Button key={action.href} asChild variant="outline" size="sm" className="h-9 justify-start gap-2 rounded-sm">
                  <Link href={action.href}><Icon className="size-4 text-primary" />{action.title}</Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, detail }: { title: string; value: number; icon: typeof BookOpen; detail?: string }) {
  return (
    <Card className="gap-0 rounded-sm py-0">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {detail && <Badge variant="secondary" className="mt-2 font-normal">{detail}</Badge>}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"><Icon className="size-4" /></span>
      </CardContent>
    </Card>
  );
}

function SummaryBar({ label, value, total, color = "bg-primary", suffix }: { label: string; value: number; total: number; color?: string; suffix?: string }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">{suffix ?? `${value} / ${total}`}</span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
