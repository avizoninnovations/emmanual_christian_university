"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdmissionsDashboardView, AdmissionsSummarySection } from "./admissions-dashboard-view";

function getSemesterProgress(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return { day: 0, total: 0, percent: 0 };
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { day: 0, total: 0, percent: 0 };
  const total = Math.ceil((end - start) / 86_400_000);
  const day = Math.min(total, Math.max(1, Math.ceil((Date.now() - start) / 86_400_000)));
  return { day, total, percent: Math.min(100, Math.round((day / total) * 100)) };
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function StaffDashboardView() {
  const { roles } = useCurrentUser();
  const isAdmissionsStaff = roles.some((role) => ["admissions_officer", "registrar"].includes(role));
  const isLecturer = roles.some((role) => ["lecturer", "senior_lecturer", "hod"].includes(role));

  if (isAdmissionsStaff && !isLecturer) return <AdmissionsDashboardView />;

  return <AcademicStaffDashboard includeAdmissions={isAdmissionsStaff} />;
}

function AcademicStaffDashboard({ includeAdmissions }: { includeAdmissions: boolean }) {
  const { user, roles, isLoading } = useCurrentUser();
  const courses = useQuery(api.allocations.getLecturerCourses, {});
  const activePeriod = useQuery(api.calendar.getActivePeriod);
  const courseList = courses ?? [];
  const pendingCourses = courseList.filter((course) => course.gradebookStatus !== "approved");
  const studentCount = courseList.reduce((total, course) => total + course.enrolledCount, 0);
  const progress = getSemesterProgress(activePeriod?.startDate, activePeriod?.endDate);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-full bg-muted/30 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ECU · Academic workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{getGreeting()}, {firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your teaching work, important actions, and semester progress in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background">
              <Link href="/timetable"><CalendarDays className="mr-2 size-4" />My timetable</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href="/courses">Open courses<ArrowRight className="ml-2 size-4" /></Link>
            </Button>
          </div>
        </header>

        {includeAdmissions ? <AdmissionsSummarySection /> : null}

        <section aria-label="Academic overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <OverviewMetric icon={BookOpen} label="Teaching courses" value={courses === undefined ? undefined : String(courseList.length)} detail="Courses assigned to you" />
          <OverviewMetric icon={UsersRound} label="Students in your courses" value={courses === undefined ? undefined : String(studentCount)} detail="Across your current allocations" />
          <OverviewMetric icon={GraduationCap} label="Gradebooks to complete" value={courses === undefined ? undefined : String(pendingCourses.length)} detail={pendingCourses.length === 1 ? "Needs your attention" : "Need your attention"} accent={pendingCourses.length > 0} />
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <div className="min-w-0 space-y-5">
            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-3 pt-5">
                <div>
                  <CardTitle className="text-base font-semibold">Needs your attention</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">The next academic actions for your courses.</p>
                </div>
                {courses === undefined ? <Skeleton className="h-6 w-14 rounded-full" /> : <Badge variant={pendingCourses.length ? "secondary" : "outline"}>{pendingCourses.length} open</Badge>}
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {courses === undefined ? <DashboardRowsSkeleton /> : pendingCourses.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm"><Check className="size-5" /></span>
                    <div><p className="text-sm font-medium">You’re all caught up</p><p className="mt-0.5 text-sm text-muted-foreground">No gradebooks need your attention right now.</p></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingCourses.slice(0, 4).map((course) => (
                      <Link key={course.allocationId} href={`/courses/${course.courseId}?periodId=${course.periodId}`} className="group flex items-center gap-3 rounded-xl bg-muted/45 p-3 transition-colors hover:bg-muted/75">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm"><BookOpen className="size-4" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{course.code} · {course.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">Gradebook {course.gradebookStatus} · {course.enrolledCount} students</span></span>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    ))}
                    {pendingCourses.length > 4 && <p className="px-1 pt-1 text-xs text-muted-foreground">And {pendingCourses.length - 4} more course gradebooks.</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-3 pt-5">
                <div><CardTitle className="text-base font-semibold">Your teaching courses</CardTitle><p className="mt-1 text-sm text-muted-foreground">Open a course to manage marks.</p></div>
                <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-lg text-primary"><Link href="/courses">All courses<ArrowRight className="ml-1.5 size-4" /></Link></Button>
              </CardHeader>
              <CardContent className="grid gap-2.5 px-5 pb-5 sm:grid-cols-2">
                {courses === undefined ? <CourseCardsSkeleton /> : courseList.length === 0 ? (
                  <p className="col-span-full rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">No teaching courses are allocated for this academic period.</p>
                ) : courseList.slice(0, 6).map((course) => (
                  <Link key={course.allocationId} href={`/courses/${course.courseId}?periodId=${course.periodId}`} className="group rounded-xl bg-muted/45 p-4 transition-colors hover:bg-muted/75">
                    <div className="flex items-start justify-between gap-2"><span className="font-mono text-xs font-semibold text-primary">{course.code}</span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm font-medium leading-5">{course.title}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{course.creditUnits} CU <span aria-hidden="true">·</span> {course.enrolledCount} students</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5">
            <AcademicPeriodCard period={activePeriod} progress={progress} />
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="px-5 pb-2 pt-5"><CardTitle className="text-base font-semibold">Go to</CardTitle><p className="text-sm text-muted-foreground">Common teaching tools</p></CardHeader>
              <CardContent className="space-y-1 px-3 pb-3">
                <QuickLink href="/courses" icon={BookOpen} title="Teaching courses" detail="Course lists and marks" />
                <QuickLink href="/timetable" icon={CalendarDays} title="Teaching timetable" detail="See your scheduled classes" />
              </CardContent>
            </Card>
            {roles?.length ? <p className="px-1 text-xs text-muted-foreground">Signed in as {roles.join(" · ")}</p> : null}
          </aside>
        </div>
        {isLoading ? <span className="sr-only" role="status">Loading your account</span> : null}
      </div>
    </div>
  );
}

function OverviewMetric({ icon: Icon, label, value, detail, accent = false }: { icon: typeof BookOpen; label: string; value?: string; detail: string; accent?: boolean }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="size-5" /></span>
        <div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p>{value === undefined ? <Skeleton className="mt-1 h-7 w-12" /> : <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>}<p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

function AcademicPeriodCard({ period, progress }: { period: { name: string; term: number; startDate?: string; endDate?: string } | null | undefined; progress: { day: number; total: number; percent: number } }) {
  return (
    <Card className="rounded-2xl border-0 bg-primary text-primary-foreground shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15"><CalendarDays className="size-5" /></span><Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground">{period ? `Semester ${period.term}` : "No active semester"}</Badge></div>
        <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-primary-foreground/70">Current academic period</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{period?.name ?? "Not set"}</h2>
        <div className="mt-5 flex items-center justify-between text-xs text-primary-foreground/80"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />Semester progress</span><span>{progress.percent}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full rounded-full bg-primary-foreground transition-[width] duration-500" style={{ width: `${progress.percent}%` }} /></div>
        <p className="mt-2 text-xs text-primary-foreground/75">{progress.total ? `Day ${progress.day} of ${progress.total}` : "Dates have not been set for this period."}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof BookOpen; title: string; detail: string }) {
  return <Button asChild variant="ghost" className="h-auto w-full justify-start rounded-xl px-2.5 py-3 text-left hover:bg-muted/70">
    <Link href={href}><span className="mr-3 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">{title}</span><span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{detail}</span></span><ArrowRight className="ml-2 size-4 text-muted-foreground" /></Link>
  </Button>;
}

function DashboardRowsSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3"><Skeleton className="size-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>;
}

function CourseCardsSkeleton() {
  return <>{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-3 rounded-xl bg-muted/40 p-4"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-3 w-2/3" /></div>)}</>;
}
