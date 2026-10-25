import { defineTable } from "convex/server";
import { v } from "convex/values";

const timestamps = { createdAt: v.number(), updatedAt: v.number() };

export const admissionsTables = {
  applicantDocuments: defineTable({
    applicantId: v.id("applicants"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    documentType: v.union(
      v.literal("identity"),
      v.literal("academic"),
      v.literal("photo"),
      v.literal("recommendation"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
    ),
    verificationNote: v.optional(v.string()),
    uploadedBy: v.string(),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_applicant", ["applicantId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  applicantEvents: defineTable({
    applicantId: v.id("applicants"),
    actorUserId: v.string(),
    action: v.union(
      v.literal("application_created"),
      v.literal("status_changed"),
      v.literal("document_uploaded"),
      v.literal("document_verified"),
      v.literal("offer_issued"),
      v.literal("offer_accepted"),
      v.literal("reported"),
      v.literal("semester_enrolled"),
    ),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    note: v.optional(v.string()),
    occurredAt: v.number(),
    ...timestamps,
  }).index("by_applicant", ["applicantId", "occurredAt"]),
};
