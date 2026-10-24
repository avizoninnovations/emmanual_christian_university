"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@workspace/ui/components/form";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
import { displayDeadline, tomorrowNairobi, parseNairobi } from "../components/mark-permission-dialog";

const statuses = ["requested", "granted", "submitted", "expired", "revoked", "rejected"] as const;
type Status = typeof statuses[number];
type Decision = { id: Id<"markEditPermissions">; action: "grant" | "reject" | "revoke" };
export function PermissionListView({ manager = true }: { manager?: boolean }) {
  const scope = useHodScope();
  const [status, setStatus] = useState<Status>("requested");
  const [decision, setDecision] = useState<Decision>();
  const rows = usePaginatedQuery(api.markPermissions.list, !manager || scope.departmentId
    ? { departmentId: manager ? scope.departmentId : undefined, status } : "skip", { initialNumItems: 25 });
  return <div className="space-y-5 p-4 lg:p-6">
    {manager && <HodScopePicker scope={scope} />}
    <Tabs value={status} onValueChange={value => { const found = statuses.find(item => item === value); if (found) setStatus(found); }}><TabsList className="flex h-auto flex-wrap justify-start">{statuses.map(item => <TabsTrigger key={item} value={item} className="capitalize">{item}</TabsTrigger>)}</TabsList></Tabs>
    <div className="rounded-sm border bg-card"><Table><TableHeader><TableRow><TableHead>Student / course</TableHead><TableHead>Lecturer</TableHead><TableHead>Components</TableHead><TableHead>Expiry (EAT)</TableHead><TableHead>Reason</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
      {rows.results.map(row => <TableRow key={row._id}><TableCell>{row.studentName}<span className="block text-xs text-muted-foreground">{row.registrationNumber} · {row.courseCode} · {row.periodName}</span></TableCell><TableCell>{row.lecturerName}</TableCell><TableCell>{row.components.join(", ")}</TableCell><TableCell>{displayDeadline(row.expiresAt)}</TableCell><TableCell className="max-w-64 whitespace-normal">{row.reason}</TableCell><TableCell>
        <Button asChild size="sm" variant="ghost"><Link href={`${manager ? "/hod/review-queue" : "/courses"}/${row.courseId}?periodId=${row.periodId}`}>Open class</Link></Button>
        {manager && row.status === "requested" && <><Button size="sm" variant="outline" onClick={() => setDecision({ id: row._id, action: "grant" })}>Grant</Button><Button size="sm" variant="ghost" onClick={() => setDecision({ id: row._id, action: "reject" })}>Reject</Button></>}
        {manager && row.status === "granted" && <Button size="sm" variant="ghost" onClick={() => setDecision({ id: row._id, action: "revoke" })}>Revoke</Button>}
      </TableCell></TableRow>)}
      {!rows.results.length && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{rows.status === "LoadingFirstPage" ? "" : `No ${status} permissions.`}</TableCell></TableRow>}
    </TableBody></Table></div>
    {rows.status === "CanLoadMore" && <Button variant="outline" onClick={() => rows.loadMore(25)}>Load more permissions</Button>}
    {decision && <PermissionDecisionDialog decision={decision} close={() => setDecision(undefined)} />}
  </div>;
}
const decisionSchema = z.object({ reason: z.string().trim().min(3), expiry: z.string() });
function PermissionDecisionDialog({ decision, close }: { decision: Decision; close: () => void }) {
  const decide = useMutation(api.markPermissions.decide);
  const form = useForm<z.infer<typeof decisionSchema>>({ resolver: zodResolver(decisionSchema), defaultValues: { reason: "", expiry: tomorrowNairobi() } });
  const save = form.handleSubmit(async values => {
    const expiresAt = decision.action === "grant" ? parseNairobi(values.expiry) : undefined;
    if (expiresAt !== undefined && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) { form.setError("expiry", { message: "Choose a future expiry" }); return; }
    try { await decide({ id: decision.id, decision: decision.action, reason: values.reason, expiresAt }); toast.success("Permission updated"); close(); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not update this permission")); }
  });
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle className="capitalize">{decision.action} editing permission</DialogTitle></DialogHeader><Form {...form}><form onSubmit={save} className="space-y-4">
    {decision.action === "grant" && <FormField control={form.control} name="expiry" render={({ field }) => <FormItem><FormLabel>Expiry (EAT)</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>} />}
    <FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Reason</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
    <Button type="submit" disabled={form.formState.isSubmitting}>Confirm {decision.action}</Button>
  </form></Form></DialogContent></Dialog>;
}
