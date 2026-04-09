import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger";

// ─────────────────────────────────────────────────────────
// ADMISSIONS PIPELINE
// ─────────────────────────────────────────────────────────

export const getApplicants = query({
  args: {
    status: v.optional(v.union(v.literal("new"), v.literal("reviewing"), v.literal("accepted"), v.literal("rejected"), v.literal("enrolled"))),
    programId: v.optional(v.id("programs")),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db.query("applicants")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.programId) {
       return await ctx.db.query("applicants")
        .withIndex("by_program", (q) => q.eq("programId", args.programId!))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("applicants").order("desc").collect();
  },
});

export const createApplicant = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    programId: v.id("programs"),
    admissionType: v.union(v.literal("National"), v.literal("Direct")),
    term: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("applicants", {
      ...args,
      status: "new",
      applicationDate: Date.now(),
    });

    await logAction(ctx, {
      action: "CREATE_APPLICANT",
      resource: "applicants",
      details: `New application: ${args.name} (${args.email}) for program ${args.programId} (Term ${args.term}, ${args.year})`
    });

    return id;
  },
});

export const updateApplicantStatus = mutation({
  args: {
    id: v.id("applicants"),
    status: v.union(v.literal("new"), v.literal("reviewing"), v.literal("accepted"), v.literal("rejected"), v.literal("enrolled")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });

    await logAction(ctx, {
      action: "UPDATE_APPLICANT_STATUS",
      resource: "applicants",
      details: `Updated applicant ${args.id} status to ${args.status.toUpperCase()}`
    });
  },
});
