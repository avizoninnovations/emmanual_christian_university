import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger";

// ─────────────────────────────────────────────────────────
// ENROLLED STUDENTS
// ─────────────────────────────────────────────────────────

export const getStudents = query({
  args: {
    programId: v.optional(v.id("programs")),
    status: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("deferred"), v.literal("graduating"), v.literal("discontinued"))),
  },
  handler: async (ctx, args) => {
    if (args.programId) {
      const students = await ctx.db.query("students")
        .withIndex("by_program", (q) => q.eq("programId", args.programId!))
        .order("desc")
        .collect();
      if (args.status) {
        return students.filter(s => s.status === args.status);
      }
      return students;
    }

    if (args.status) {
      return await ctx.db.query("students")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    
    return await ctx.db.query("students").order("desc").collect();
  },
});

export const getStudentById = query({
  args: {
    id: v.id("students"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createStudent = mutation({
  args: {
    userId: v.string(),
    registrationNumber: v.string(),
    programId: v.id("programs"),
    yearOfStudy: v.number(),
    term: v.number(),
    year: v.number(),
    currentPeriodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("students", {
      ...args,
      status: "active",
      financeStatus: "pending",
    });

    await logAction(ctx, {
      action: "ENROLL_STUDENT",
      resource: "students",
      details: `Enrolled student ${args.registrationNumber} (User: ${args.userId})`
    });

    return id;
  },
});

export const updateStudentStatus = mutation({
  args: {
    id: v.id("students"),
    status: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("deferred"), v.literal("graduating"), v.literal("discontinued"))),
    financeStatus: v.optional(v.union(v.literal("cleared"), v.literal("partial"), v.literal("pending"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await logAction(ctx, {
      action: "UPDATE_STUDENT_STATUS",
      resource: "students",
      details: `Updated student ${id}: ${Object.keys(updates).map(k => `${k}=${(updates as any)[k]}`).join(', ')}`
    });
  },
});
