import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations";
import { v, ConvexError } from "convex/values";
import { studentPersonalFields } from "./lib/studentProfileFields";
import { logAction } from "./audit_logger";
import { assertRole, assertAuthenticated } from "./lib/utils";

// ─────────────────────────────────────────────────────────
// ADMISSIONS PIPELINE
// ─────────────────────────────────────────────────────────

export const getApplicants = query({
  args: {
    status: v.optional(v.union(v.literal("new"), v.literal("reviewing"), v.literal("accepted"), v.literal("rejected"), v.literal("enrolled"))),
    programId: v.optional(v.id("programs")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
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
    await assertRole(ctx, ["admin", "registrar"]);
    const program = await ctx.db.get(args.programId);
    if (!program || program.status !== "active") throw new ConvexError("Select an active program for this application.");
    if (args.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) throw new ConvexError("Enter the applicant's full name and a valid email address.");
    if (args.dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(args.dateOfBirth) || !Number.isFinite(Date.parse(args.dateOfBirth)) || Date.parse(args.dateOfBirth) >= Date.now())) throw new ConvexError("Enter a valid date of birth in the past.");
    if (args.yearOfEntry && (!Number.isInteger(args.yearOfEntry) || args.yearOfEntry < 1950 || args.yearOfEntry > new Date().getUTCFullYear() + 1)) throw new ConvexError("Enter a valid year of entry.");
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
    await assertRole(ctx, ["admin", "registrar"]);
    await ctx.db.patch(args.id, { status: args.status });

    await logAction(ctx, {
      action: "UPDATE_APPLICANT_STATUS",
      resource: "applicants",
      details: `Updated applicant ${args.id} status to ${args.status.toUpperCase()}`
    });
  },
});
