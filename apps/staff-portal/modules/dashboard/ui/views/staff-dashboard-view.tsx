"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Mail,
  Phone,
  UserRound,
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
import { useCurrentUser } from "@/hooks/use-current-user";

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getSemesterProgress(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return { day: 0, total: 0, percent: 0 };
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const today = Date.now();
  const total = Math.max(1, Math.ceil((end - start) / 86_400_000));
  const day = Math.min(total, Math.max(1, Math.ceil((today - start) / 86_400_000)));
  return { day, total, percent: Math.min(100, Math.round((day / total) * 100)) };
}

export default function StaffDashboardView() {
  const { user, roles, isLoading } = useCurrentUser();
  const courses = useQuery(api.allocations.getLecturerCourses, {});
  const activePeriod = useQuery(api.calendar.getActivePeriod);
  const courseList = courses ?? [];
  const pendingCourses = courseList.filter((course) => course.gradebookStatus !== "approved");
  const progress = getSemesterProgress(activePeriod?.startDate, activePeriod?.endDate);
  const firstName = user?.name?.split(" ")[0] ?? "Staff member";
  const initials = (user?.name ?? "ECU").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading your academic workspace…
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/35 p-4 md:p-5 xl:p-6">
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(310px,0.92fr)]">
        <div className="min-w-0 space-y-4">
          <section className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/90 via-primary/85 to-primary/75 px-5 py-5 text-primary-foreground shadow-sm md:px-6 md:py-6">
            <div className="absolute -right-8 -top-14 size-56 rounded-full border-[28px] border-primary-foreground/5" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-primary-foreground/25 bg-primary-foreground/15 text-xl font-semibold">
                  {initials || "EC"}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary-foreground/75">
                    ECU Academic Workspace
                  </p>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                    Good {getTimeOfDay()}, {firstName}
                  </h1>
                  <p className="mt-1 truncate text-sm text-primary-foreground/85">
                    {activePeriod?.name ?? "Your teaching and academic work"}
                  </p>
                </div>
              </div>
              <Button asChild variant="secondary" className="shrink-0 font-semibold">
                <Link href="/courses">
                  View Courses <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </section>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">Academic tasks</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Course work that needs your attention</p>
              </div>
              <Badge variant="secondary">{pendingCourses.length} open</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {courses === undefined ? (
                <div className="p-5 text-sm text-muted-foreground">Loading assigned courses…</div>
              ) : pendingCourses.length === 0 ? (
                <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-5 py-6 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <p className="text-sm font-semibold">All caught up</p>
                  <p className="max-w-sm text-xs text-muted-foreground">No course gradebooks currently need your attention.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {pendingCourses.slice(0, 4).map((course) => (
                    <Link key={course.allocationId} href={`/courses/${course.courseId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <BookOpen className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{course.code} · {course.title}</span>
                        <span className="block text-xs text-muted-foreground">{course.enrolledCount} students · Gradebook {course.gradebookStatus}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"><BookOpen className="size-4" /></span>
                <div>
                  <CardTitle className="text-sm font-semibold">My teaching courses</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">{courseList.length} allocated this semester</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-8">
                <Link href="/courses">All courses <ArrowRight className="ml-1.5 size-3.5" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
              {courseList.length === 0 ? (
                <p className="col-span-full rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">No teaching courses are allocated for the current semester.</p>
              ) : courseList.slice(0, 4).map((course, index) => (
                <Link key={course.allocationId} href={`/courses/${course.courseId}`} className="flex min-h-[92px] gap-3 rounded-md bg-muted/40 p-3 transition-colors hover:bg-muted/70">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block line-clamp-2 text-sm font-semibold leading-5">{course.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{course.code} · {course.creditUnits} CU · {course.enrolledCount} students</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Academic updates</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3 border-t border-border/70 px-4 py-4 text-sm text-muted-foreground">
              <AlertCircle className="size-4 shrink-0" />
              University notices and academic memos will appear here.
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="h-20 bg-primary/10" />
            <CardContent className="-mt-9 px-4 pb-4">
              <div className="mx-auto flex size-[68px] items-center justify-center rounded-full border-4 border-background bg-primary text-lg font-semibold text-primary-foreground shadow-sm">
                {initials || "EC"}
              </div>
              <div className="mt-3 text-center">
                <h2 className="text-base font-semibold">{user?.name ?? "ECU Staff"}</h2>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{roles?.join(" · ") || "Staff"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Emmanuel Christian University</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="size-3.5 shrink-0" /><span className="truncate">{user?.email ?? "—"}</span></span>
                  {user?.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{user.phone}</span>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 text-left">
                  <ProfileDetail label="Staff ID" value={user?.staffId ?? "Not assigned"} />
                  <ProfileDetail label="Title" value={user?.title ?? "Staff"} />
                  <ProfileDetail label="Account" value={user?.profileStatus ?? "Active"} />
                  <ProfileDetail label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-primary/90 to-primary/75 text-primary-foreground shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15"><CalendarDays className="size-4" /></span>
                <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground">{activePeriod ? `SEM ${activePeriod.term}` : "NO ACTIVE SEMESTER"}</Badge>
              </div>
              <p className="mt-3 text-xl font-bold">{progress.total ? `DAY ${progress.day}` : "Academic period"}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/75">{progress.total ? `of ${progress.total} semester days` : activePeriod?.name ?? "No current semester set"}</p>
              <div className="mt-4 flex items-center justify-between text-[11px] text-primary-foreground/80">
                <span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> Semester progress</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary-foreground/20">
                <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${progress.percent}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-700"><GraduationCap className="size-4" /></span>
              <CardTitle className="text-sm font-semibold">Action required</CardTitle>
              <Badge variant="secondary" className="ml-auto">{pendingCourses.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-0 px-4 pb-2">
              {pendingCourses.length === 0 ? (
                <p className="border-t border-border/70 py-3 text-xs text-muted-foreground">No outstanding academic actions.</p>
              ) : pendingCourses.slice(0, 3).map((course) => (
                <Link key={course.allocationId} href={`/courses/${course.courseId}`} className="flex items-start gap-2.5 border-t border-border/70 py-3 text-xs transition-colors hover:text-primary">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700"><UserRound className="size-3.5" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-medium">{course.code} gradebook {course.gradebookStatus}</span><span className="mt-0.5 block text-muted-foreground">{course.title}</span></span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-medium">{value}</p>
    </div>
  );
}
