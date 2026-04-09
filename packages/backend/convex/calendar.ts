import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// ACADEMIC CALENDAR / PERIODS
// ─────────────────────────────────────────────────────────

export const getPeriods = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("academicPeriods").order("desc").collect();
  },
});

export const getActivePeriod = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();
  },
});

export const createPeriod = mutation({
  args: {
    name: v.string(),
    year: v.number(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("academicPeriods", {
      ...args,
      status: "upcoming",
    });
  },
});

export const activatePeriod = mutation({
  args: {
    id: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    // 1. Mark currently active period as completed
    const active = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    for (const period of active) {
      await ctx.db.patch(period._id, { status: "completed" });
    }

    // 2. Mark new period as active
    await ctx.db.patch(args.id, { status: "active" });

    // Note: Future expansions would trigger student roll-over operations here
    // or through an event/action queue.
  },
});
