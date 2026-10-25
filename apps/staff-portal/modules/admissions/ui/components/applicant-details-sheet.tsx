"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ApplicantDocumentsSection } from "./applicant-documents-section";
import { ApplicantWorkflowSection } from "./applicant-workflow-section";

type ApplicantId = Id<"applicants">;

export function ApplicantDetailsSheet({
  applicantId,
  open,
  onOpenChange,
}: {
  applicantId: ApplicantId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useQuery(
    api.admissionsDocuments.getApplicantDetails,
    applicantId ? { applicantId } : "skip",
  );
  const applicant = data?.applicant;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[96vw] overflow-hidden rounded-l-sm p-0 sm:w-[72vw] sm:max-w-4xl">
        {applicant && data ? (
          <>
            <SheetHeader className="border-b px-6 py-5 pr-14 text-left">
              <SheetTitle>{applicant.name}</SheetTitle>
              <SheetDescription>
                {applicant.applicationNumber ?? String(applicant._id)} ·{" "}
                {data.programName} · {applicant.term}/{applicant.year}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100dvh-86px)]">
              <div className="space-y-6 p-5 md:p-6">
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Email" value={applicant.email} />
                  <Detail label="Phone" value={applicant.phone} />
                  <Detail
                    label="Admission route"
                    value={applicant.admissionType}
                  />
                  <Detail
                    label="Application date"
                    value={dateLabel(applicant.applicationDate)}
                  />
                  <Detail
                    label="Decision"
                    value={applicant.status.toUpperCase()}
                  />
                  <Detail
                    label="Reported"
                    value={
                      applicant.reportedAt
                        ? dateLabel(applicant.reportedAt)
                        : "Not reported"
                    }
                  />
                </section>
                {applicant.decisionNote && (
                  <p className="whitespace-pre-wrap rounded-sm bg-muted/40 p-3 text-sm">
                    {applicant.decisionNote}
                  </p>
                )}
                <ApplicantDocumentsSection
                  applicantId={applicant._id}
                  documents={data.documents}
                />
                <ApplicantWorkflowSection
                  applicant={applicant}
                  programName={data.programName}
                />
                <section className="space-y-3 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold">Application history</h3>
                  {data.events.map((event) => (
                    <div
                      key={event._id}
                      className="border-l-2 border-primary/20 pl-3"
                    >
                      <p className="text-sm font-medium capitalize">
                        {event.action.replaceAll("_", " ")}
                      </p>
                      {event.note && (
                        <p className="text-sm text-muted-foreground">
                          {event.note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.occurredAt).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  ))}
                </section>
              </div>
            </ScrollArea>
          </>
        ) : open ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-8 h-28 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm">{value}</p>
    </div>
  );
}

function dateLabel(value: number) {
  return new Date(value).toLocaleDateString("en-GB", { dateStyle: "medium" });
}
