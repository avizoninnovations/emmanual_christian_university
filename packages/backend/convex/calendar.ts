import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger";
import { assertAdmin, assertAuthenticated } from "./lib/utils";

// ─────────────────────────────────────────────────────────
// ACADEMIC CALENDAR / PERIODS
// ─────────────────────────────────────────────────────────

export const getPeriods = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return await ctx.db.query("academicPeriods").order("desc").collect();
  },
});

export const getActivePeriod = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();
  },
});

export const createPeriod = mutation({
  args: {
    name: v.string(),
    term: v.number(),
    year: v.number(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const id = await ctx.db.insert("academicPeriods", {
      ...args,
      status: "upcoming",
    });

    await logAction(ctx, {
      action: "CREATE_PERIOD",
      resource: "academicPeriods",
      details: `Created academic period ${args.name} (Term ${args.term}, ${args.year})`
    });

    return id;
  },
});

export const activatePeriod = mutation({
  args: {
    id: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    // 1. Get the period to activate
    const targetPeriod = await ctx.db.get(args.id);
    if (!targetPeriod) throw new Error("Period not found");

    // 2. Mark currently active periods as completed
    const activePeriods = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    for (const period of activePeriods) {
      await ctx.db.patch(period._id, { status: "completed" });
    }

    // 3. Mark target period as active
    await ctx.db.patch(args.id, { status: "active" });

    // 4. Migrate Students & Automated Billing
    // We fetch all active students to roll them over
    const activeStudents = await ctx.db
      .query("students")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let migrationCount = 0;
    let billingCount = 0;
    for (const student of activeStudents) {
      // a. Update current period
      await ctx.db.patch(student._id, { 
        currentPeriodId: args.id,
        term: targetPeriod.term,
        year: targetPeriod.year,
      });
      migrationCount++;

      // b. Automated Billing: Check for Fee Structure for this program in the new period
      const feeStructure = await ctx.db
        .query("feeStructures")
        .withIndex("by_program", (q) => q.eq("programId", student.programId))
        .filter((q) => q.eq(q.field("periodId"), args.id))
        .unique();

      if (feeStructure) {
        const totalDue = 
          feeStructure.tuitionFee + 
          feeStructure.registrationFee + 
          feeStructure.libraryFee + 
          feeStructure.ictFee + 
          feeStructure.activityFee;

        // Check if ledger already exists for this period (idempotency)
        const existingLedger = await ctx.db
          .query("studentLedger")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .filter((q) => q.eq(q.field("periodId"), args.id))
          .unique();

        if (!existingLedger) {
          await ctx.db.insert("studentLedger", {
            studentId: student._id,
            periodId: args.id,
            term: targetPeriod.term,
            year: targetPeriod.year,
            totalDue,
            totalPaid: 0,
          });
          billingCount++;
        }
      }
    }

    await logAction(ctx, {
      action: "ACTIVATE_PERIOD",
      resource: "academicPeriods",
      details: `Advanced to ${targetPeriod.name} (${targetPeriod.year}). Migrated ${migrationCount} students. Billed ${billingCount} students.`
    });

    return { migrationCount, billingCount };
  },
});
