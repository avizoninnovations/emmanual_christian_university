"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { ClipboardCheck, UserRoundCheck } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { ReviewCycleManager } from "../components/review-cycle-manager";
import { PerformanceReviewSheet } from "../components/performance-review-sheet";

type ReviewMode = "own" | "supervisor" | "hr";
type ReviewListRow = { id: Id<"staffPerformanceReviews">; staffName: string; cycleName: string; status: string; mode: ReviewMode };

export function PerformanceReviewView() {
  const { roles } = useCurrentUser();
  const isHr = roles.some(role => ["hr_officer", "admin"].includes(role.toLowerCase()));
  const cycles = useQuery(api.staffReviews.getOpenReviewCycles, { type: "performance" });
  const myReviews = usePaginatedQuery(api.staffReviews.getMyPerformanceReviews, {}, { initialNumItems: 20 });
  const supervisorReviews = usePaginatedQuery(api.staffReviews.getSupervisorPerformanceQueue, {}, { initialNumItems: 20 });
  const hrReviews = usePaginatedQuery(api.staffReviews.getHrPerformanceQueue, isHr ? {} : "skip", { initialNumItems: 20 });
  const start = useMutation(api.staffReviews.startPerformanceReview);
  const [tab, setTab] = useState("mine");
  const [selectedReview, setSelectedReview] = useState<Id<"staffPerformanceReviews"> | null>(null);
  const [mode, setMode] = useState<ReviewMode>("own");

  async function begin(cycleId: Id<"staffReviewCycles">) {
    try { setSelectedReview(await start({ cycleId })); setMode("own"); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not start your self-review.")); }
  }

  const mine: ReviewListRow[] = myReviews.results.map(row => ({ id: row._id, staffName: "My review", cycleName: row.cycleTitle, status: row.status, mode: "own" }));
  const supervisor: ReviewListRow[] = supervisorReviews.results.map(row => ({ id: row._id, staffName: row.staffName, cycleName: "Performance review", status: row.status, mode: "supervisor" }));
  const hr: ReviewListRow[] = (hrReviews.results ?? []).map(row => ({ id: row._id, staffName: row.staffName, cycleName: "Performance review", status: row.status, mode: "hr" }));

  return <main className="min-h-full min-w-0 w-full space-y-5 p-4 md:p-6">
    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><ClipboardCheck className="size-4" /></span><h1 className="text-xl font-semibold">My Performance Review</h1></div>
    {isHr && <ReviewCycleManager type="performance" />}
    <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="space-y-4 p-4 md:p-5">
      {cycles && cycles.length > 0 && <section className="space-y-3"><h2 className="text-sm font-semibold">Open review cycles</h2><div className="grid gap-3 lg:grid-cols-2">{cycles.map(cycle => <div key={cycle._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"><UserRoundCheck className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{cycle.title}</p><p className="text-xs text-muted-foreground">Closes {new Date(cycle.selfDeadline ?? cycle.endsAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</p></div></div><Button size="sm" onClick={() => void begin(cycle._id)}>Open review</Button></div>)}</div></section>}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="mine">My reviews <Count value={mine.length} /></TabsTrigger>
          <TabsTrigger value="supervisor">Supervisor reviews <Count value={supervisor.length} /></TabsTrigger>
          {isHr && <TabsTrigger value="hr">HR final review <Count value={hr.length} /></TabsTrigger>}
        </TabsList>
        <TabsContent value="mine" className="mt-4"><ReviewList rows={mine} loading={myReviews.status === "LoadingFirstPage"} onSelect={row => { setSelectedReview(row.id); setMode(row.mode); }} />{myReviews.status === "CanLoadMore" && <LoadMore onClick={() => myReviews.loadMore(20)} />}</TabsContent>
        <TabsContent value="supervisor" className="mt-4"><ReviewList rows={supervisor} loading={supervisorReviews.status === "LoadingFirstPage"} onSelect={row => { setSelectedReview(row.id); setMode(row.mode); }} />{supervisorReviews.status === "CanLoadMore" && <LoadMore onClick={() => supervisorReviews.loadMore(20)} />}</TabsContent>
        {isHr && <TabsContent value="hr" className="mt-4"><ReviewList rows={hr} loading={hrReviews.status === "LoadingFirstPage"} onSelect={row => { setSelectedReview(row.id); setMode(row.mode); }} />{hrReviews.status === "CanLoadMore" && <LoadMore onClick={() => hrReviews.loadMore(20)} />}</TabsContent>}
      </Tabs>
    </CardContent></Card>
    <PerformanceReviewSheet reviewId={selectedReview} mode={mode} open={!!selectedReview} onOpenChange={open => !open && setSelectedReview(null)} />
  </main>;
}

function ReviewList({ rows, loading, onSelect }: { rows: ReviewListRow[]; loading: boolean; onSelect: (row: ReviewListRow) => void }) {
  return <div className="divide-y divide-border/70">{rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{row.staffName}</p><p className="text-xs text-muted-foreground">{row.cycleName}</p></div><Badge variant="outline" className="rounded-sm capitalize">{row.status.replaceAll("_", " ")}</Badge><Button size="sm" variant="outline" onClick={() => onSelect(row)}>Open review</Button></div>)}{!loading && rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No performance reviews here yet.</p>}{loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading reviews…</p>}</div>;
}

function Count({ value }: { value: number }) { return <Badge variant="secondary" className="ml-1 rounded-sm px-1.5 py-0 text-xs tabular-nums">{value}</Badge>; }
function LoadMore({ onClick }: { onClick: () => void }) { return <div className="flex justify-center pt-3"><Button variant="outline" onClick={onClick}>Load more</Button></div>; }
