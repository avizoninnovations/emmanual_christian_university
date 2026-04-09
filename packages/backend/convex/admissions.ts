import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("applicants", {
      ...args,
      status: "new",
      applicationDate: Date.now(),
    });
  },
});

export const updateApplicantStatus = mutation({
  args: {
    id: v.id("applicants"),
    status: v.union(v.literal("new"), v.literal("reviewing"), v.literal("accepted"), v.literal("rejected"), v.literal("enrolled")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});
