import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// MARKS & ASSESSMENTS
// ─────────────────────────────────────────────────────────

export const getGradingScales = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("gradingScales").order("desc").collect();
  },
});

export const createGradingScale = mutation({
  args: {
    grade: v.string(),
    minScore: v.number(),
    maxScore: v.number(),
    gpaValue: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gradingScales", args);
  },
});

export const getAssessmentBlocks = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned"))),
    lecturerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const blocks = await ctx.db.query("assessmentBlocks")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
      if (args.lecturerId) {
        return blocks.filter(b => b.lecturerId === args.lecturerId);
      }
      return blocks;
    }

    if (args.lecturerId) {
      return await ctx.db.query("assessmentBlocks")
        .withIndex("by_lecturer", (q) => q.eq("lecturerId", args.lecturerId!))
        .order("desc")
        .collect();
    }
    
    return await ctx.db.query("assessmentBlocks").order("desc").collect();
  },
});

export const createAssessmentBlock = mutation({
  args: {
    courseId: v.string(),
    lecturerId: v.string(),
    type: v.union(v.literal("Midterm"), v.literal("Final"), v.literal("Coursework")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assessmentBlocks", {
      ...args,
      status: "draft",
      submissionDate: Date.now(),
    });
  },
});

export const updateAssessmentBlockStatus = mutation({
  args: {
    id: v.id("assessmentBlocks"),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      status: args.status,
      // If submitted, update the timestamp
      ...(args.status === "submitted" ? { submissionDate: Date.now() } : {})
    });
  },
});
