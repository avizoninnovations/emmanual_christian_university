"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";

type DocumentType = Doc<"applicantDocuments">["documentType"];
type ApplicantDocument = Doc<"applicantDocuments"> & { url: string | null };
const documentTypes: { value: DocumentType; label: string }[] = [
  { value: "identity", label: "Identity" },
  { value: "academic", label: "Academic record" },
  { value: "photo", label: "Photo" },
  { value: "recommendation", label: "Recommendation" },
  { value: "other", label: "Other" },
];

export function ApplicantDocumentsSection({
  applicantId,
  documents,
}: {
  applicantId: Id<"applicants">;
  documents: ApplicantDocument[];
}) {
  const uploadUrl = useMutation(
    api.admissionsDocuments.generateApplicantUploadUrl,
  );
  const attachDocument = useMutation(
    api.admissionsDocuments.attachApplicantDocument,
  );
  const reviewDocument = useMutation(
    api.admissionsDocuments.reviewApplicantDocument,
  );
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("academic");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadUrl({});
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error(`Could not upload ${file.name}.`);
      const body = (await response.json()) as { storageId: Id<"_storage"> };
      await attachDocument({
        applicantId,
        storageId: body.storageId,
        fileName: file.name,
        documentType,
      });
      setFile(null);
      toast.success("Application document uploaded.");
    } catch (error) {
      toast.error(
        getUserFacingErrorMessage(
          error,
          "Could not upload the application document.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function review(
    documentId: Id<"applicantDocuments">,
    status: "verified" | "rejected",
  ) {
    setBusy(true);
    try {
      await reviewDocument({
        documentId,
        status,
        note: status === "rejected" ? note : undefined,
      });
      setNote("");
      toast.success(
        status === "verified"
          ? "Document verified."
          : "Document returned to applicant.",
      );
    } catch (error) {
      toast.error(
        getUserFacingErrorMessage(error, "Could not review this document."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Application documents</h3>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          className="rounded-sm"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Select
          value={documentType}
          onValueChange={(value) => setDocumentType(value as DocumentType)}
        >
          <SelectTrigger className="rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {documentTypes.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="rounded-sm"
          disabled={!file || busy}
          onClick={() => void upload()}
        >
          Upload
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        PDF, Word, or image files up to 15 MB.
      </p>
      <div className="divide-y divide-border/70">
        {documents.map((document) => (
          <div
            key={document._id}
            className="flex flex-wrap items-center gap-3 py-3"
          >
            <div className="min-w-48 flex-1">
              <a
                href={document.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                {document.fileName}
              </a>
              <p className="text-xs capitalize text-muted-foreground">
                {document.documentType} · {document.status} ·{" "}
                {(document.size / 1024 / 1024).toFixed(1)} MB
              </p>
              {document.verificationNote && (
                <p className="text-xs text-muted-foreground">
                  {document.verificationNote}
                </p>
              )}
            </div>
            {document.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void review(document._id, "verified")}
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={busy || note.trim().length < 3}
                  onClick={() => void review(document._id, "rejected")}
                >
                  Return
                </Button>
              </>
            )}
          </div>
        ))}
        {documents.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            No supporting documents uploaded yet.
          </p>
        )}
      </div>
      {documents.some((document) => document.status === "pending") && (
        <Textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason when returning a document"
        />
      )}
    </section>
  );
}
