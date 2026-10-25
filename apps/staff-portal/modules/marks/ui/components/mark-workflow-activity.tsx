"use client";

import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { ChevronDown, History } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function MarkWorkflowActivity({ courseId, periodId }: {
  courseId: Id<"courses">;
  periodId: Id<"academicPeriods">;
}) {
  const [open, setOpen] = useState(false);
  const activity = usePaginatedQuery(api.markEntry.lecturerActivity, { courseId, periodId }, { initialNumItems: 8 });

  return <Collapsible open={open} onOpenChange={setOpen} className="border-y border-border/70">
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="h-12 w-full justify-between rounded-none px-2">
        <span className="flex items-center gap-2"><History className="size-4 text-primary" />
          <span className="text-sm font-medium">Course activity</span>
          {activity.results.length > 0 && <Badge variant="secondary" className="rounded-sm">{activity.results.length}{activity.status === "CanLoadMore" ? "+" : ""}</Badge>}
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-2 pb-3">
      {activity.status === "LoadingFirstPage" && <div className="space-y-2 px-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
      {activity.results.map(event => <div key={event._id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-t border-border/50 px-3 py-2.5 first:border-t-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{formatAction(event.action)}{event.studentName !== "—" ? ` · ${event.studentName}` : ""}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{event.details}</p>
          {event.registrationNumber !== "—" && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{event.registrationNumber}</p>}
        </div>
        <div className="shrink-0 text-right"><p className="text-xs font-medium">{event.actorName}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatTime(event.createdAt)}</p></div>
      </div>)}
      {activity.status !== "LoadingFirstPage" && activity.results.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">No activity has been recorded for this course in this semester yet.</p>}
      {activity.status === "CanLoadMore" && <div className="flex justify-center pt-1"><Button variant="outline" size="sm" onClick={() => activity.loadMore(8)}>Load older activity</Button></div>}
    </CollapsibleContent>
  </Collapsible>;
}

function formatAction(action: string) {
  return action.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short",
  });
}
