"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";

export function AssignmentLockInfo({ submittedMarks, periodLocked, periodStatus }: {
  submittedMarks: boolean;
  periodLocked: boolean;
  periodStatus?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!submittedMarks && !periodLocked) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 rounded-sm text-muted-foreground"
        aria-label="Why is assignment unavailable?"
        title="Why is assignment unavailable?"
        onClick={() => setOpen(true)}
      >
        <Info className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassignment unavailable</DialogTitle>
            <DialogDescription>Here is what needs to happen before this course unit can be reassigned.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {submittedMarks && (
              <li>Marks have been submitted for HOD review. Approve or return the submissions in Marks Review; reassignment becomes available when no marks remain pending review.</li>
            )}
            {periodLocked && (
              <li>{periodStatus === "completed"
                ? "This is a completed semester. Historical allocations are locked; an administrator can make changes."
                : `Assignments are locked while this semester is ${periodStatus ?? "unavailable"}; an administrator can make changes.`}</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
