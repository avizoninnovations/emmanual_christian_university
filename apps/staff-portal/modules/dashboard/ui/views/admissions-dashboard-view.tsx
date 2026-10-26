"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { ArrowRight, ClipboardList, GraduationCap, UserRoundCheck, UsersRound } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FinanceOfficeSummarySection } from "./finance-dashboard-view";

const INITIAL_APPLICATIONS = 100;

function useAdmissionsOverview() {
  const applicants = usePaginatedQuery(api.admissions.getApplicants, {}, { initialNumItems: INITIAL_APPLICATIONS });
  const period = useQuery(api.calendar.getActivePeriod);
  const counts = useMemo(() => applicants.results.reduce(
    (summary, applicant) => ({ ...summary, [applicant.status]: summary[applicant.status] + 1 }),
    { new: 0, reviewing: 0, accepted: 0, rejected: 0, enrolled: 0 },
  ), [applicants.results]);
  return { applicants, counts, period };
}

export function AdmissionsDashboardView({ includeFinance = false }: { includeFinance?: boolean }) {
  const { user } = useCurrentUser();
  const { applicants, counts, period } = useAdmissionsOverview();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const toProcess = counts.new + counts.reviewing;

  return (
    <main className="min-h-full bg-muted/30 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ECU · Admissions Office</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Admissions and semester enrollment at a glance.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background"><Link href="/admissions/enrollment">Semester enrollment</Link></Button>
            <Button asChild className="rounded-xl"><Link href="/admissions/applications">Open applications<ArrowRight className="ml-2 size-4" /></Link></Button>
          </div>
        </header>

        <AdmissionsMetrics counts={counts} loaded={applicants.status !== "LoadingFirstPage"} periodName={period?.name} periodYear={period?.year} />
        {includeFinance ? <FinanceOfficeSummarySection /> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-3 pt-5">
              <div><CardTitle className="text-base font-semibold">Application pipeline</CardTitle><p className="mt-1 text-sm text-muted-foreground">Status of the latest applicant records.</p></div>
              {applicants.status === "LoadingFirstPage" ? <Skeleton className="h-6 w-24 rounded-full" /> : <Badge variant={toProcess ? "secondary" : "outline"}>{toProcess} to process</Badge>}
            </CardHeader>
            <CardContent className="grid gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-5">
              <PipelineStatus label="New" value={applicants.status === "LoadingFirstPage" ? undefined : counts.new} />
              <PipelineStatus label="In review" value={applicants.status === "LoadingFirstPage" ? undefined : counts.reviewing} />
              <PipelineStatus label="Accepted" value={applicants.status === "LoadingFirstPage" ? undefined : counts.accepted} />
              <PipelineStatus label="Enrolled" value={applicants.status === "LoadingFirstPage" ? undefined : counts.enrolled} />
              <PipelineStatus label="Declined" value={applicants.status === "LoadingFirstPage" ? undefined : counts.rejected} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="px-5 pb-2 pt-5"><CardTitle className="text-base font-semibold">Semester enrollment</CardTitle><p className="text-sm text-muted-foreground">{period ? `${period.name} · Semester ${period.term}, ${period.year}` : "Current semester status"}</p></CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {period === undefined ? <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /></div> : period ? <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">Review the student roster and record enrollment for this active period.</p> : <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">No active academic period is set.</p>}
              <Button asChild variant="ghost" className="w-full justify-between rounded-lg text-primary"><Link href="/admissions/enrollment">Manage enrollment<ArrowRight className="size-4" /></Link></Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">Showing {applicants.results.length} most recent applications{applicants.status === "CanLoadMore" ? ` of at least ${INITIAL_APPLICATIONS}` : applicants.status === "Exhausted" ? "" : " · Loading"}.</p>
      </div>
    </main>
  );
}

export function AdmissionsSummarySection() {
  const { applicants, counts, period } = useAdmissionsOverview();
  return <div className="space-y-3"><AdmissionsMetrics counts={counts} loaded={applicants.status !== "LoadingFirstPage"} periodName={period?.name} periodYear={period?.year} /><p className="px-1 text-xs text-muted-foreground">Application counts reflect the latest {applicants.results.length} records loaded.</p></div>;
}

function AdmissionsMetrics({ counts, loaded, periodName, periodYear }: { counts: { new: number; reviewing: number; accepted: number; rejected: number; enrolled: number }; loaded: boolean; periodName?: string; periodYear?: number }) {
  const total = counts.new + counts.reviewing + counts.accepted + counts.enrolled + counts.rejected;
  return (
    <section aria-label="Admissions overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={ClipboardList} label="To process" value={loaded ? String(counts.new + counts.reviewing) : undefined} detail="New or under review" accent={counts.new + counts.reviewing > 0} />
      <Metric icon={UserRoundCheck} label="Accepted applicants" value={loaded ? String(counts.accepted) : undefined} detail="In the offer and reporting pipeline" />
      <Metric icon={UsersRound} label="Enrolled applicants" value={loaded ? String(counts.enrolled) : undefined} detail="Converted from admissions" />
      <Metric icon={GraduationCap} label="Active semester" value={periodName ? `${periodName} ${periodYear ?? ""}` : loaded ? "Not set" : undefined} detail={`${total} latest applications loaded`} />
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail, accent = false }: { icon: typeof ClipboardList; label: string; value?: string; detail: string; accent?: boolean }) {
  return <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="flex items-center gap-4 p-5"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="size-5" /></span><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p>{value === undefined ? <Skeleton className="mt-1 h-7 w-12" /> : <p className="mt-0.5 truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>}<p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>;
}

function PipelineStatus({ label, value }: { label: string; value?: number }) {
  return <div className="rounded-xl bg-muted/50 px-3 py-3"><p className="text-xs text-muted-foreground">{label}</p>{value === undefined ? <Skeleton className="mt-2 h-6 w-10" /> : <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>}</div>;
}
