import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// FINANCE (Structures, Ledgers, Transactions)
// ─────────────────────────────────────────────────────────

export const getFeeStructures = query({
  args: {
    programId: v.optional(v.id("programs")),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    if (args.programId) {
      return await ctx.db.query("feeStructures")
        .withIndex("by_program", (q) => q.eq("programId", args.programId!))
        .order("desc")
        .collect();
    } else if (args.periodId) {
      return await ctx.db.query("feeStructures")
        .withIndex("by_period", (q) => q.eq("periodId", args.periodId!))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("feeStructures").order("desc").collect();
  },
});

export const createFeeStructure = mutation({
  args: {
    programId: v.id("programs"),
    periodId: v.id("academicPeriods"),
    tuitionFee: v.number(),
    registrationFee: v.number(),
    libraryFee: v.number(),
    ictFee: v.number(),
    activityFee: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feeStructures", args);
  },
});

export const getStudentLedger = query({
  args: {
    studentId: v.id("students"),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    const ledgers = await ctx.db.query("studentLedger")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    
    if (args.periodId) {
      return ledgers.filter(l => l.periodId === args.periodId);
    }
    return ledgers;
  },
});

export const recordTransaction = mutation({
  args: {
    studentId: v.id("students"),
    amount: v.number(),
    type: v.union(v.literal("payment"), v.literal("charge"), v.literal("waiver")),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", {
      ...args,
      date: Date.now(),
    });
  },
});
