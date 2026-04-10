import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger";

// ─────────────────────────────────────────────────────────
// FACULTIES
// ─────────────────────────────────────────────────────────

export const getFaculties = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("faculties").order("desc").collect();
  },
});

export const createFaculty = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    deanId: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("faculties", {
      ...args,
      status: "active",
    });

    await logAction(ctx, {
      action: "CREATE_FACULTY",
      resource: "faculties",
      details: `Created faculty ${args.name} (${args.code})`
    });

    return id;
  },
});

export const updateFaculty = mutation({
  args: {
    id: v.id("faculties"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    deanId: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await logAction(ctx, {
      action: "UPDATE_FACULTY",
      resource: "faculties",
      details: `Updated faculty ${id}: ${Object.keys(updates).join(', ')}`
    });
  },
});

export const deleteFaculty = mutation({
  args: { id: v.id("faculties") },
  handler: async (ctx, args) => {
    // Check for dependent departments
    const departments = await ctx.db
      .query("departments")
      .withIndex("by_faculty", (q) => q.eq("facultyId", args.id))
      .collect();
    
    if (departments.length > 0) {
      throw new Error(`Cannot delete faculty. It has ${departments.length} associated department(s).`);
    }

    const faculty = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);

    await logAction(ctx, {
      action: "DELETE_FACULTY",
      resource: "faculties",
      details: `Deleted faculty ${faculty?.name} (${faculty?.code})`
    });
  },
});

// ─────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────

export const getDepartments = query({
  args: {
    facultyId: v.optional(v.id("faculties")),
  },
  handler: async (ctx, args) => {
    if (args.facultyId) {
      return await ctx.db
        .query("departments")
        .withIndex("by_faculty", (q) => q.eq("facultyId", args.facultyId!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("departments").order("desc").collect();
  },
});

export const createDepartment = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    facultyId: v.id("faculties"),
    hodId: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("departments", {
      ...args,
      status: "active",
    });

    await logAction(ctx, {
      action: "CREATE_DEPARTMENT",
      resource: "departments",
      details: `Created department ${args.name} (${args.code}) under faculty ${args.facultyId}`
    });

    return id;
  },
});

export const updateDepartment = mutation({
  args: {
    id: v.id("departments"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    facultyId: v.optional(v.id("faculties")),
    hodId: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await logAction(ctx, {
      action: "UPDATE_DEPARTMENT",
      resource: "departments",
      details: `Updated department ${id}: ${Object.keys(updates).join(', ')}`
    });
  },
});

export const deleteDepartment = mutation({
  args: { id: v.id("departments") },
  handler: async (ctx, args) => {
    // Check for dependent programs
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_department", (q) => q.eq("departmentId", args.id))
      .collect();
    
    if (programs.length > 0) {
      throw new Error(`Cannot delete department. It has ${programs.length} associated program(s).`);
    }

    const dept = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);

    await logAction(ctx, {
      action: "DELETE_DEPARTMENT",
      resource: "departments",
      details: `Deleted department ${dept?.name} (${dept?.code})`
    });
  },
});

// ─────────────────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────────────────

export const getPrograms = query({
  args: {
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    if (args.departmentId) {
      return await ctx.db
        .query("programs")
        .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("programs").order("desc").collect();
  },
});

export const createProgram = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    departmentId: v.id("departments"),
    level: v.union(v.literal("Certificate"), v.literal("Diploma"), v.literal("Bachelor"), v.literal("Master")),
    durationYears: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("programs", {
      ...args,
      status: "active",
    });

    await logAction(ctx, {
      action: "CREATE_PROGRAM",
      resource: "programs",
      details: `Created program ${args.name} (${args.code})`
    });

    return id;
  },
});

export const updateProgram = mutation({
  args: {
    id: v.id("programs"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    level: v.optional(v.union(v.literal("Certificate"), v.literal("Diploma"), v.literal("Bachelor"), v.literal("Master"))),
    durationYears: v.optional(v.number()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await logAction(ctx, {
      action: "UPDATE_PROGRAM",
      resource: "programs",
      details: `Updated program ${id}: ${Object.keys(updates).join(', ')}`
    });
  },
});

export const deleteProgram = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, args) => {
    const prog = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);

    await logAction(ctx, {
      action: "DELETE_PROGRAM",
      resource: "programs",
      details: `Deleted program ${prog?.name} (${prog?.code})`
    });
  },
});

// ─────────────────────────────────────────────────────────
// ACADEMIC PERIODS
// ─────────────────────────────────────────────────────────

export const getPeriods = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("academicPeriods").order("desc").collect();
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
    const id = await ctx.db.insert("academicPeriods", {
      ...args,
      status: "upcoming",
    });

    await logAction(ctx, {
      action: "CREATE_PERIOD",
      resource: "academicPeriods",
      details: `Created academic period ${args.name} ${args.year}`
    });

    return id;
  },
});
