"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { api } from "@workspace/backend/_generated/api";
import { ClipboardList } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { StaffServiceRequestForm, type StaffRequestType } from "../components/staff-service-request-form";
import { StaffServiceRequestList } from "../components/staff-service-request-list";
import { StaffServiceRequestSheet } from "../components/staff-service-request-sheet";

const titles: Record<StaffRequestType, string> = { leave: "Leave Application", exit: "Exit Application", complaint: "My Complaints" };

export function StaffServiceRequestView({ type }: { type: StaffRequestType }) {
  const { roles } = useCurrentUser();
  const isHr = roles.some(role => ["hr_officer", "admin"].includes(role.toLowerCase()));
  const own = usePaginatedQuery(api.staffServices.getMyRequests, { type }, { initialNumItems: 20 });
  const supervisor = usePaginatedQuery(api.staffServices.getSupervisorQueue, {}, { initialNumItems: 20 });
  const hr = usePaginatedQuery(api.staffServices.getHrQueue, isHr ? {} : "skip", { initialNumItems: 20 });
  const [tab, setTab] = useState("new");
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"staffServiceRequests"> | null>(null);
  const [mode, setMode] = useState<"own" | "supervisor" | "hr">("own");
  const requestRows = (rows: typeof own.results, loading: boolean, rowMode: typeof mode) => <StaffServiceRequestList rows={rows.filter(row => row.type === type)} isLoading={loading} emptyLabel="No requests to display." onDetails={row => { setSelectedRequestId(row._id); setMode(rowMode); }} />;
  const supervisorRows = supervisor.results.filter(row => row.type === type);
  const hrRows = (hr.results ?? []).filter(row => row.type === type);

  return <main className="min-h-full min-w-0 w-full space-y-5 p-4 md:p-6">
    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><ClipboardList className="size-4" /></span><h1 className="text-xl font-semibold">{titles[type]}</h1></div>
    <StaffServiceRequestForm type={type} />
    <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="p-4 md:p-5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="new">My requests <Count value={own.results.filter(row => row.type === type).length} /></TabsTrigger>
          <TabsTrigger value="supervisor">For my review <Count value={supervisorRows.length} /></TabsTrigger>
          {isHr && <TabsTrigger value="hr">HR review <Count value={hrRows.length} /></TabsTrigger>}
        </TabsList>
        <TabsContent value="new" className="mt-4 space-y-3">
          {requestRows(own.results, own.status === "LoadingFirstPage", "own")}
          {own.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => own.loadMore(20)}>Load more</Button></div>}
        </TabsContent>
        <TabsContent value="supervisor" className="mt-4">{requestRows(supervisor.results, supervisor.status === "LoadingFirstPage", "supervisor")}</TabsContent>
        {isHr && <TabsContent value="hr" className="mt-4">{requestRows(hr.results ?? [], hr.status === "LoadingFirstPage", "hr")}</TabsContent>}
      </Tabs>
    </CardContent></Card>
    <StaffServiceRequestSheet requestId={selectedRequestId} mode={mode} open={!!selectedRequestId} onOpenChange={open => !open && setSelectedRequestId(null)} />
  </main>;
}

function Count({ value }: { value: number }) {
  return <Badge variant="secondary" className="ml-1 rounded-sm px-1.5 py-0 text-xs tabular-nums">{value}</Badge>;
}
