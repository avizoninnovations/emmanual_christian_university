"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCheck, Search } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useHodScope } from "@/modules/hod/hooks/use-hod-scope";
import { AggregationRequest, AggregationRequestTable } from "../components/aggregation-request-table";
import { AggregationRequestDetails } from "../components/aggregation-request-details";

const tabs: { value: AggregationRequest["status"]; label: string }[] = [
  { value: "pending_hod", label: "Needs HOD decision" }, { value: "pending_lecturer", label: "With lecturer" },
  { value: "approved", label: "Approved" }, { value: "rejected", label: "Declined" }, { value: "withdrawn", label: "Withdrawn by student" },
];

export function HodAggregatedUnitsView() {
  const scope = useHodScope();
  const [status, setStatus] = useState<AggregationRequest["status"]>("pending_hod");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AggregationRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const requests = usePaginatedQuery(api.courseUnitAggregations.hodRequests,
    scope.departmentId ? { departmentId: scope.departmentId, status } : "skip", { initialNumItems: 25 });
  const decide = useMutation(api.courseUnitAggregations.decideAsHod);
  const normalized = search.trim().toLowerCase();
  const filtered = (requests.results ?? []).filter(request => !normalized || [request.studentName, request.registrationNumber, request.courseCode, request.courseTitle, request.lecturerName].some(value => value.toLowerCase().includes(normalized)));

  async function onDecision(decision: "approved" | "rejected", note?: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await decide({ requestId: selected._id, decision, note });
      toast.success(decision === "approved" ? "Missed-paper request approved." : "Missed-paper request declined.");
      setSelected(null);
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not review this request.")); }
    finally { setBusy(false); }
  }

  return <main className="min-h-full min-w-0 space-y-4 p-3 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CheckCheck className="size-5 text-primary" /><h1 className="text-xl font-semibold">Missed Paper Approvals</h1></div>
      {scope.context?.departments.length ? <Select value={scope.departmentId} onValueChange={scope.setDepartment}><SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Choose department" /></SelectTrigger><SelectContent>
        {scope.context.departments.map(department => <SelectItem key={department._id} value={department._id}>{department.name}</SelectItem>)}
      </SelectContent></Select> : <Badge variant="outline" className="rounded-sm">No managed department</Badge>}</div>
    <Tabs value={status} onValueChange={value => setStatus(value as AggregationRequest["status"])}>
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
        {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">{tab.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search student, course, or lecturer" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {!scope.departmentId ? <p className="py-12 text-center text-sm text-muted-foreground">Choose a department you manage to review its requests.</p>
      : requests.status === "LoadingFirstPage" ? <div className="space-y-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-14 w-full" />)}</div>
      : <AggregationRequestTable requests={filtered} onSelect={setSelected} />}
    {requests.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => requests.loadMore(25)}>Load more requests</Button></div>}
    <AggregationRequestDetails request={selected} mode="hod" busy={busy} onClose={() => setSelected(null)} onDecision={onDecision} />
  </main>;
}
