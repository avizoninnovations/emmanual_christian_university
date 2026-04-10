import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations";
import { v } from "convex/values";
import { logAction } from "./audit_logger";
import { assertRole, assertAuthenticated } from "./lib/utils";

// ─────────────────────────────────────────────────────────
// MARKS & ASSESSMENTS
// ─────────────────────────────────────────────────────────

export const getGradingScales = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
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
    await assertRole(ctx, ["admin", "staff"]);
    const id = await ctx.db.insert("gradingScales", args);

    await logAction(ctx, {
      action: "CREATE_GRADING_SCALE",
      resource: "gradingScales",
      details: `Created grading scale: ${args.grade} (${args.minScore}-${args.maxScore})`
    });

    return id;
  },
});

export const getAssessmentBlocks = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned"))),
    lecturerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
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
    term: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "staff", "lecturer"]);
    const id = await ctx.db.insert("assessmentBlocks", {
      ...args,
      status: "draft",
      submissionDate: Date.now(),
    });

    await logAction(ctx, {
      action: "CREATE_ASSESSMENT_BLOCK",
      resource: "assessmentBlocks",
      details: `Created assessment block for course ${args.courseId} (Term ${args.term}, ${args.year})`
    });

    return id;
  },
});

export const updateAssessmentBlockStatus = mutation({
  args: {
    id: v.id("assessmentBlocks"),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "staff", "lecturer"]);
    await ctx.db.patch(args.id, { 
      status: args.status,
      // If submitted, update the timestamp
      ...(args.status === "submitted" ? { submissionDate: Date.now() } : {})
    });

    await logAction(ctx, {
      action: "UPDATE_ASSESSMENT_STATUS",
      resource: "assessmentBlocks",
      details: `Updated assessment block ${args.id} status to ${args.status.toUpperCase()}`
    });
  },
});
