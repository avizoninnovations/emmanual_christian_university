import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations";
import { studentPersonalFields } from "./lib/studentProfileFields";
import { logAction } from "./audit_logger";
import { assertRole } from "./lib/utils";

const admissionsRoles = ["admin", "registrar", "admissions_officer"];
const applicantStatus = v.union(
  v.literal("new"),
  v.literal("reviewing"),
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("enrolled"),
);

export const getApplicants = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(applicantStatus),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, admissionsRoles);
    const source = args.status
      ? ctx.db
          .query("applicants")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
      : ctx.db.query("applicants");
    const page = await source.order("desc").paginate(args.paginationOpts);
    const programs = await Promise.all(
      [...new Set(page.page.map((applicant) => applicant.programId))].map(
        (id) => ctx.db.get(id),
      ),
    );
    const programNames = new Map(
      programs.filter(Boolean).map((program) => [program!._id, program!.name]),
    );
    return {
      ...page,
      page: page.page.map((applicant) => ({
        ...applicant,
        programName:
          programNames.get(applicant.programId) ?? "Program unavailable",
      })),
    };
  },
});

export const createApplicant = mutation({
  args: {
    ...studentPersonalFields,
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    programId: v.id("programs"),
    admissionType: v.union(v.literal("National"), v.literal("Direct")),
    term: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const program = await ctx.db.get(args.programId);
    if (!program || program.status !== "active")
      throw new ConvexError("Select an active program for this application.");
    if (
      args.name.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)
    )
      throw new ConvexError(
        "Enter the applicant's full name and a valid email address.",
      );
    if (
      !Number.isInteger(args.term) ||
      args.term < 1 ||
      args.term > 3 ||
      !Number.isInteger(args.year) ||
      args.year < 1950
    )
      throw new ConvexError("Choose a valid intake semester and year.");
    const existing = await ctx.db
      .query("applicants")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email.trim().toLowerCase()),
      )
      .take(1);
    if (existing.length)
      throw new ConvexError(
        "An application already exists for this email address.",
      );
    const now = Date.now();
    const id = await ctx.db.insert("applicants", {
      ...args,
      email: args.email.trim().toLowerCase(),
      name: args.name.trim(),
      status: "new",
      applicationDate: now,
      createdAt: now,
      updatedAt: now,
    });
    const applicationNumber = `ECU/ADM/${args.year}/${args.term}/${String(id).slice(-6).toUpperCase()}`;
    await ctx.db.patch(id, { applicationNumber, updatedAt: now });
    await ctx.db.insert("applicantEvents", {
      applicantId: id,
      actorUserId: userId,
      action: "application_created",
      toStatus: "new",
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "CREATE_APPLICANT",
      resource: "applicants",
      details: `Recorded application ${applicationNumber} for ${args.name.trim()}.`,
    });
    return id;
  },
});

export const updateApplicantStatus = mutation({
  args: {
    id: v.id("applicants"),
    status: applicantStatus,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const applicant = await ctx.db.get(args.id);
    if (!applicant)
      throw new ConvexError("This application could not be found.");
    const validTransition =
      applicant.status === args.status ||
      (applicant.status === "new" &&
        ["reviewing", "accepted", "rejected"].includes(args.status)) ||
      (applicant.status === "reviewing" &&
        ["accepted", "rejected"].includes(args.status)) ||
      (applicant.status === "accepted" &&
        ["reviewing", "rejected"].includes(args.status));
    if (!validTransition || applicant.status === "enrolled")
      throw new ConvexError(
        "This application cannot move to that stage. Review its current status first.",
      );
    if (args.status === "rejected" && !args.note?.trim())
      throw new ConvexError("Add a reason before rejecting the application.");
    const now = Date.now();
    await ctx.db.patch(applicant._id, {
      status: args.status,
      decisionNote: args.note?.trim(),
      updatedAt: now,
    });
    await ctx.db.insert("applicantEvents", {
      applicantId: applicant._id,
      actorUserId: userId,
      action: "status_changed",
      fromStatus: applicant.status,
      toStatus: args.status,
      note: args.note?.trim(),
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "UPDATE_APPLICANT_STATUS",
      resource: "applicants",
      details: `Application ${applicant.applicationNumber ?? applicant._id} moved from ${applicant.status} to ${args.status}.`,
    });
  },
});

export const issueOfferLetter = mutation({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const applicant = await ctx.db.get(args.applicantId);
    if (!applicant || applicant.status !== "accepted")
      throw new ConvexError(
        "Only an accepted applicant can receive an offer letter.",
      );
    if (applicant.offerIssuedAt)
      throw new ConvexError(
        "An offer letter has already been issued. Open the application to print it again.",
      );
    const now = Date.now();
    await ctx.db.patch(applicant._id, { offerIssuedAt: now, updatedAt: now });
    await ctx.db.insert("applicantEvents", {
      applicantId: applicant._id,
      actorUserId: userId,
      action: "offer_issued",
      note: "Offer letter issued.",
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "ISSUE_ADMISSION_OFFER",
      resource: "applicants",
      details: `Issued an offer letter for ${applicant.applicationNumber ?? applicant._id}.`,
    });
  },
});

export const recordOfferAcceptance = mutation({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const applicant = await ctx.db.get(args.applicantId);
    if (
      !applicant ||
      applicant.status !== "accepted" ||
      !applicant.offerIssuedAt
    )
      throw new ConvexError(
        "Issue the offer letter before recording acceptance.",
      );
    if (applicant.offerAcceptedAt)
      throw new ConvexError("Offer acceptance has already been recorded.");
    const now = Date.now();
    await ctx.db.patch(applicant._id, { offerAcceptedAt: now, updatedAt: now });
    await ctx.db.insert("applicantEvents", {
      applicantId: applicant._id,
      actorUserId: userId,
      action: "offer_accepted",
      note: "Applicant acceptance recorded.",
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "RECORD_OFFER_ACCEPTANCE",
      resource: "applicants",
      details: `Recorded acceptance for ${applicant.applicationNumber ?? applicant._id}.`,
    });
  },
});

export const recordApplicantReporting = mutation({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const applicant = await ctx.db.get(args.applicantId);
    if (
      !applicant ||
      applicant.status !== "accepted" ||
      !applicant.offerAcceptedAt
    )
      throw new ConvexError(
        "Record the applicant's offer acceptance before marking them as reported.",
      );
    if (applicant.reportedAt)
      throw new ConvexError(
        "This applicant has already been marked as reported.",
      );
    const now = Date.now();
    await ctx.db.patch(applicant._id, { reportedAt: now, updatedAt: now });
    await ctx.db.insert("applicantEvents", {
      applicantId: applicant._id,
      actorUserId: userId,
      action: "reported",
      note: "Applicant reported to the university.",
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "RECORD_APPLICANT_REPORTING",
      resource: "applicants",
      details: `Recorded reporting for ${applicant.applicationNumber ?? applicant._id}.`,
    });
  },
});
