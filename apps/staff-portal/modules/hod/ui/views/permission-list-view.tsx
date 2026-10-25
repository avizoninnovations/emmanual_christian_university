"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery } from "convex/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
import { MarkPermissionDialog, displayDeadline, parseNairobi, tomorrowNairobi } from "../components/mark-permission-dialog";
import { NairobiDateTimePicker } from "../components/nairobi-date-time-picker";
import { ClassReviewView } from "./class-review-view";

const statuses = ["requested", "granted", "submitted", "expired", "revoked", "rejected"] as const;
type Status = typeof statuses[number];
type Decision = { id: Id<"markEditPermissions">; action: "grant" | "reject" | "revoke" };

export function PermissionListView({ manager = true }: { manager?: boolean }) {
  const scope = useHodScope();
  const [status, setStatus] = useState<Status>("requested");
  const [decision, setDecision] = useState<Decision>();
  const [classView, setClassView] = useState<{ courseId: Id<"courses">; periodId: Id<"academicPeriods"> }>();
  const rows = usePaginatedQuery(api.markPermissions.list, !manager || scope.departmentId
    ? { departmentId: manager ? scope.departmentId : undefined, status } : "skip", { initialNumItems: 25 });

  return <>
    <div className="w-full space-y-5 p-4 lg:p-6">
      {manager && <HodScopePicker scope={scope} />}
      <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary"><KeyRound className="size-5" /></span>
        <h1 className="text-lg font-semibold">Edit permissions</h1>
      </div>
      <Tabs value={status} onValueChange={value => { const next = statuses.find(item => item === value); if (next) setStatus(next); }}>
        <TabsList className="h-auto w-full justify-start gap-5 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {statuses.map(item => <TabsTrigger key={item} value={item} className="rounded-none border-b-2 border-transparent px-1 py-2 capitalize shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">{item === "requested" ? "Pending requests" : item}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-sm border bg-card">
        <div className="overflow-x-auto"><Table className="min-w-[900px]">
          <TableHeader className="bg-muted/35"><TableRow>
            <TableHead>Student / course</TableHead><TableHead>Lecturer</TableHead><TableHead>Components</TableHead><TableHead>Expires (EAT)</TableHead><TableHead>Reason</TableHead><TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.status === "LoadingFirstPage" && <TableRow><TableCell colSpan={6}><Skeleton className="h-16" /></TableCell></TableRow>}
            {rows.results.map(row => <TableRow key={row._id} className="hover:bg-muted/20">
              <TableCell><span className="font-medium">{row.studentName}</span><span className="mt-1 block text-xs text-muted-foreground">{row.registrationNumber || "—"} · {row.courseCode} · {row.periodName}</span></TableCell>
              <TableCell>{row.lecturerName}</TableCell>
              <TableCell className="capitalize">{row.components.join(" + ")}</TableCell>
              <TableCell className="whitespace-nowrap">{displayDeadline(row.expiresAt)}</TableCell>
              <TableCell className="max-w-64 whitespace-normal text-sm text-muted-foreground">{row.reason}</TableCell>
              <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                {manager ? <Button size="sm" variant="outline" onClick={() => setClassView({ courseId: row.courseId, periodId: row.periodId })}>Open class</Button>
                  : <Button asChild size="sm" variant="outline"><Link href={`/courses/${row.courseId}?periodId=${row.periodId}`}>Open class</Link></Button>}
                {manager && (row.status === "requested" || row.status === "granted") && <PermissionRowMenu rowId={row._id} status={row.status} onChoose={action => setDecision({ id: row._id, action })} />}
              </div></TableCell>
            </TableRow>)}
            {rows.status !== "LoadingFirstPage" && !rows.results.length && <TableRow><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">No {status} permissions.</TableCell></TableRow>}
          </TableBody>
        </Table></div>
      </div>
      {rows.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => rows.loadMore(25)}>Load more permissions</Button></div>}
      {decision && <PermissionDecisionDialog decision={decision} close={() => setDecision(undefined)} />}
    </div>
    {classView && <ClassReviewView {...classView} onClose={() => setClassView(undefined)} />}
  </>;
}

function PermissionRowMenu({ rowId, status, onChoose }: { rowId: Id<"markEditPermissions">; status: Status; onChoose: (action: Decision["action"]) => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for permission ${rowId}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-44">
      {status === "requested" && <><DropdownMenuItem onSelect={() => onChoose("grant")}>Approve request</DropdownMenuItem><DropdownMenuItem onSelect={() => onChoose("reject")}>Reject request</DropdownMenuItem></>}
      {status === "granted" && <DropdownMenuItem onSelect={() => onChoose("revoke")}>Revoke access</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;
}

const decisionSchema = z.object({ reason: z.string().trim().min(3), expiry: z.string().min(1) });
function PermissionDecisionDialog({ decision, close }: { decision: Decision; close: () => void }) {
  const decide = useMutation(api.markPermissions.decide);
  const form = useForm<z.infer<typeof decisionSchema>>({ resolver: zodResolver(decisionSchema), defaultValues: { reason: "", expiry: tomorrowNairobi() } });
  const save = form.handleSubmit(async values => {
    const expiresAt = decision.action === "grant" ? parseNairobi(values.expiry) : undefined;
    if (expiresAt !== undefined && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) { form.setError("expiry", { message: "Choose a future expiry." }); return; }
    try { await decide({ id: decision.id, decision: decision.action, reason: values.reason, expiresAt }); toast.success("Permission updated"); close(); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not update this permission")); }
  });
  const title = decision.action === "grant" ? "Approve editing access" : decision.action === "reject" ? "Reject editing request" : "Revoke editing access";
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
    <Form {...form}><form onSubmit={save} className="space-y-4">
      {decision.action === "grant" && <FormField control={form.control} name="expiry" render={({ field }) => <FormItem><FormLabel>Access expires</FormLabel><FormControl><NairobiDateTimePicker value={field.value} onChange={field.onChange} label="Choose access expiry" /></FormControl><FormMessage /></FormItem>} />}
      <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Reason</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
      <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={form.formState.isSubmitting}>{title}</Button></div>
    </form></Form>
  </DialogContent></Dialog>;
}
