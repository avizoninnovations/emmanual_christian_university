"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import { Layers, Search } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { AggregationRequest, AggregationRequestTable } from "../components/aggregation-request-table";
import { AggregationRequestDetails } from "../components/aggregation-request-details";

const tabs: { value: AggregationRequest["status"]; label: string }[] = [
  { value: "pending_lecturer", label: "Needs my review" }, { value: "pending_hod", label: "With HOD" },
  { value: "approved", label: "Approved" }, { value: "rejected", label: "Declined" }, { value: "withdrawn", label: "Withdrawn by student" },
];

export function AggregatedUnitsView() {
  const [status, setStatus] = useState<AggregationRequest["status"]>("pending_lecturer");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AggregationRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const requests = usePaginatedQuery(api.courseUnitAggregations.lecturerRequests, { status }, { initialNumItems: 25 });
  const decide = useMutation(api.courseUnitAggregations.decideAsLecturer);
  const normalized = search.trim().toLowerCase();
  const filtered = requests.results.filter(request => !normalized || [request.studentName, request.registrationNumber, request.courseCode, request.courseTitle, request.periodName].some(value => value.toLowerCase().includes(normalized)));

  async function onDecision(decision: "approved" | "rejected", note?: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await decide({ requestId: selected._id, decision, note });
      toast.success(decision === "approved" ? "Endorsed and sent to the HOD for a decision." : "Aggregation request declined.");
      setSelected(null);
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not review this request.")); }
    finally { setBusy(false); }
  }

  return <main className="min-h-full min-w-0 space-y-4 p-3 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Layers className="size-5 text-primary" /><h1 className="text-xl font-semibold">My Aggregated Units</h1></div>
      <Badge variant="secondary" className="rounded-sm">{requests.results.length}{requests.status === "CanLoadMore" ? "+" : ""} loaded</Badge></div>
    <Tabs value={status} onValueChange={value => setStatus(value as AggregationRequest["status"])}>
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
        {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">{tab.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search student or course unit" value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="min-w-0">
      {requests.status === "LoadingFirstPage" ? <div className="space-y-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-14 w-full" />)}</div>
        : <AggregationRequestTable requests={filtered} onSelect={setSelected} />}
    </div>
    {requests.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => requests.loadMore(25)}>Load more requests</Button></div>}
    <AggregationRequestDetails request={selected} mode="lecturer" busy={busy} onClose={() => setSelected(null)} onDecision={onDecision} />
  </main>;
}
