import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger";
import { assertRole, assertAuthenticated } from "./lib/utils";

// ─────────────────────────────────────────────────────────
// FINANCE (Structures, Ledgers, Transactions)
// ─────────────────────────────────────────────────────────

export const getFeeStructures = query({
  args: {
    programId: v.optional(v.id("programs")),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
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
    term: v.number(),
    year: v.number(),
    tuitionFee: v.number(),
    registrationFee: v.number(),
    libraryFee: v.number(),
    ictFee: v.number(),
    activityFee: v.number(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);
    const id = await ctx.db.insert("feeStructures", args);

    await logAction(ctx, {
      action: "CREATE_FEE_STRUCTURE",
      resource: "feeStructures",
      details: `Created fee structure for program ${args.programId} in period ${args.periodId}`
    });

    return id;
  },
});

export const getStudentLedger = query({
  args: {
    studentId: v.id("students"),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
    const ledgers = await ctx.db.query("studentLedger")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    
    if (args.periodId) {
      return ledgers.filter(l => l.periodId === args.periodId);
    }
    return ledgers;
  },
});

export const getAllLedgers = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
    if (args.periodId) {
      return await ctx.db.query("studentLedger")
        .withIndex("by_period", (q) => q.eq("periodId", args.periodId!))
        .collect();
    }
    return await ctx.db.query("studentLedger").collect();
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
    await assertRole(ctx, ["admin", "finance"]);
    // Lookup student to get their current period context if not provided
    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found");
    if (!student.currentPeriodId || student.term === undefined || student.year === undefined) {
      throw new Error("Student is not enrolled in an active academic period");
    }

    const id = await ctx.db.insert("transactions", {
      ...args,
      term: student.term,
      year: student.year,
      date: Date.now(),
    });

    await logAction(ctx, {
      action: "RECORD_TRANSACTION",
      resource: "transactions",
      details: `${args.type.toUpperCase()}: UGX ${args.amount.toLocaleString()} for student ${args.studentId} (${student.year} T${student.term})`
    });

    return id;
  },
});
