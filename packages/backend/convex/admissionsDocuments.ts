import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations";
import { logAction } from "./audit_logger";
import { assertRole } from "./lib/utils";

const admissionsRoles = ["admin", "registrar", "admissions_officer"];
const documentType = v.union(
  v.literal("identity"),
  v.literal("academic"),
  v.literal("photo"),
  v.literal("recommendation"),
  v.literal("other"),
);
const allowedFiles = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const maxFileSize = 15 * 1024 * 1024;

export const getApplicantDetails = query({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, args) => {
    await assertRole(ctx, admissionsRoles);
    const applicant = await ctx.db.get(args.applicantId);
    if (!applicant)
      throw new ConvexError("This application could not be found.");

    const [program, documents, events] = await Promise.all([
      ctx.db.get(applicant.programId),
      ctx.db
        .query("applicantDocuments")
        .withIndex("by_applicant", (q) => q.eq("applicantId", applicant._id))
        .order("desc")
        .take(50),
      ctx.db
        .query("applicantEvents")
        .withIndex("by_applicant", (q) => q.eq("applicantId", applicant._id))
        .order("desc")
        .take(100),
    ]);
    const files = await Promise.all(
      documents.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      })),
    );
    return {
      applicant,
      programName: program?.name ?? "Program unavailable",
      documents: files,
      events,
    };
  },
});

export const generateApplicantUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, admissionsRoles);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachApplicantDocument = mutation({
  args: {
    applicantId: v.id("applicants"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    documentType,
  },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const applicant = await ctx.db.get(args.applicantId);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!applicant || applicant.status === "enrolled")
      throw new ConvexError(
        "Documents can only be attached to an active application.",
      );
    if (
      !metadata ||
      metadata.size > maxFileSize ||
      !allowedFiles.includes(metadata.contentType ?? "")
    )
      throw new ConvexError(
        "Choose a PDF, Word document, or image no larger than 15 MB.",
      );
    const existing = await ctx.db
      .query("applicantDocuments")
      .withIndex("by_applicant", (q) => q.eq("applicantId", applicant._id))
      .take(20);
    if (existing.length >= 20)
      throw new ConvexError("An application can contain at most 20 documents.");

    const now = Date.now();
    await ctx.db.insert("applicantDocuments", {
      applicantId: applicant._id,
      storageId: args.storageId,
      fileName: args.fileName.trim().slice(0, 180) || "Application document",
      contentType: metadata.contentType ?? "application/octet-stream",
      size: metadata.size,
      documentType: args.documentType,
      status: "pending",
      uploadedBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("applicantEvents", {
      applicantId: applicant._id,
      actorUserId: userId,
      action: "document_uploaded",
      note: `Uploaded ${args.documentType} document.`,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "UPLOAD_APPLICANT_DOCUMENT",
      resource: "applicantDocuments",
      details: `Added a ${args.documentType} document to ${applicant.applicationNumber ?? applicant._id}.`,
    });
  },
});

export const reviewApplicantDocument = mutation({
  args: {
    documentId: v.id("applicantDocuments"),
    status: v.union(v.literal("verified"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const document = await ctx.db.get(args.documentId);
    if (!document)
      throw new ConvexError("This application document could not be found.");
    if (document.status !== "pending")
      throw new ConvexError("Only pending documents can be reviewed.");
    if (args.status === "rejected" && !args.note?.trim())
      throw new ConvexError("Add a reason when returning a document.");

    const now = Date.now();
    await ctx.db.patch(document._id, {
      status: args.status,
      verificationNote: args.note?.trim(),
      verifiedBy: userId,
      verifiedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("applicantEvents", {
      applicantId: document.applicantId,
      actorUserId: userId,
      action: "document_verified",
      note: `${document.fileName}: ${args.status}${args.note ? ` — ${args.note.trim()}` : ""}`,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "REVIEW_APPLICANT_DOCUMENT",
      resource: "applicantDocuments",
      details: `Marked ${document.fileName} ${args.status}.`,
    });
  },
});
