"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { ApplicantEnrollmentForm } from "./applicant-enrollment-form";

export function ApplicantWorkflowSection({
  applicant,
  programName,
}: {
  applicant: Doc<"applicants">;
  programName: string;
}) {
  const updateStatus = useMutation(api.admissions.updateApplicantStatus);
  const issueOffer = useMutation(api.admissions.issueOfferLetter);
  const acceptOffer = useMutation(api.admissions.recordOfferAcceptance);
  const recordReporting = useMutation(api.admissions.recordApplicantReporting);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      setNote("");
    } catch (error) {
      toast.error(
        getUserFacingErrorMessage(error, "Could not update this application."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Application workflow</h3>
      <div className="flex flex-wrap gap-2">
        {applicant.status === "new" && (
          <Button
            disabled={busy}
            onClick={() =>
              void run(
                () => updateStatus({ id: applicant._id, status: "reviewing" }),
                "Application moved to review.",
              )
            }
          >
            Start review
          </Button>
        )}
        {(applicant.status === "new" || applicant.status === "reviewing") && (
          <>
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    updateStatus({
                      id: applicant._id,
                      status: "accepted",
                      note: note || undefined,
                    }),
                  "Applicant accepted.",
                )
              }
            >
              Accept applicant
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              disabled={busy || note.trim().length < 3}
              onClick={() =>
                void run(
                  () =>
                    updateStatus({
                      id: applicant._id,
                      status: "rejected",
                      note,
                    }),
                  "Application declined.",
                )
              }
            >
              Decline
            </Button>
          </>
        )}
        {applicant.status === "accepted" && !applicant.offerIssuedAt && (
          <Button
            disabled={busy}
            onClick={() =>
              void run(
                () => issueOffer({ applicantId: applicant._id }),
                "Offer letter issued and ready to print.",
              )
            }
          >
            Issue offer letter
          </Button>
        )}
        {applicant.status === "accepted" && !!applicant.offerIssuedAt && (
          <Button
            variant="outline"
            onClick={() =>
              printOfferLetter({
                name: applicant.name,
                applicationNumber:
                  applicant.applicationNumber ?? String(applicant._id),
                programName,
                term: applicant.term,
                year: applicant.year,
                issueDate: applicant.offerIssuedAt!,
              })
            }
          >
            Print offer letter
          </Button>
        )}
        {applicant.status === "accepted" &&
          !!applicant.offerIssuedAt &&
          !applicant.offerAcceptedAt && (
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  () => acceptOffer({ applicantId: applicant._id }),
                  "Offer acceptance recorded.",
                )
              }
            >
              Record acceptance
            </Button>
          )}
        {applicant.status === "accepted" &&
          !!applicant.offerAcceptedAt &&
          !applicant.reportedAt && (
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  () => recordReporting({ applicantId: applicant._id }),
                  "Applicant marked as reported.",
                )
              }
            >
              Mark reported
            </Button>
          )}
      </div>
      {(applicant.status === "new" || applicant.status === "reviewing") && (
        <Textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Decision note (required when declining)"
        />
      )}
      {applicant.status === "accepted" && (
        <div className="rounded-sm bg-muted/40 p-3 text-sm text-muted-foreground">
          {applicant.offerAcceptedAt
            ? `Offer accepted ${dateLabel(applicant.offerAcceptedAt)}.`
            : applicant.offerIssuedAt
              ? `Offer issued ${dateLabel(applicant.offerIssuedAt)}.`
              : "Issue an offer letter after approving this application."}
          {applicant.reportedAt
            ? ` Reported ${dateLabel(applicant.reportedAt)}.`
            : ""}
        </div>
      )}
      {applicant.status === "accepted" && !!applicant.reportedAt && (
        <ApplicantEnrollmentForm
          applicantId={applicant._id}
          term={applicant.term}
          year={applicant.year}
        />
      )}
      {applicant.status === "enrolled" && (
        <p className="text-sm text-emerald-700">
          Student profile created and first semester enrollment recorded.
        </p>
      )}
    </section>
  );
}

function dateLabel(value: number) {
  return new Date(value).toLocaleDateString("en-GB", { dateStyle: "medium" });
}

function printOfferLetter(data: {
  name: string;
  applicationNumber: string;
  programName: string;
  term: number;
  year: number;
  issueDate: number;
}) {
  const letter = window.open("", "_blank", "width=900,height=720");
  if (!letter) return toast.error("Allow pop-ups to print the offer letter.");
  const safe = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character] ?? character,
    );
  letter.document.write(
    `<!doctype html><html><head><title>ECU Admission Offer</title><style>body{font:16px Georgia,serif;color:#222;max-width:760px;margin:48px auto;line-height:1.65}header{text-align:center;border-bottom:2px solid #7b001b;padding-bottom:20px;margin-bottom:32px}h1{font-size:22px;margin:4px}h2{font-size:18px}small{color:#666}.ref{font-family:monospace}footer{margin-top:64px}@media print{body{margin:24mm auto}}</style></head><body><header><h1>EMMANUEL CHRISTIAN UNIVERSITY</h1><small>Office of Admissions</small></header><p>${new Date(data.issueDate).toLocaleDateString("en-GB", { dateStyle: "long" })}</p><p class="ref">Application: ${safe(data.applicationNumber)}</p><h2>OFFER OF ADMISSION</h2><p>Dear ${safe(data.name)},</p><p>We are pleased to offer you admission to <strong>${safe(data.programName)}</strong> for Semester ${data.term}, ${data.year}.</p><p>Please report to the Admissions Office to complete your registration and bring your verified academic and identity documents. Your student account and semester enrollment will be completed after reporting.</p><p>This letter is issued by the Emmanuel Christian University Office of Admissions.</p><footer><p>____________________________</p><p>Admissions Officer / Registrar</p></footer><script>window.onload=()=>window.print()</script></body></html>`,
  );
  letter.document.close();
}
