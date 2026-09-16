import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger.js";
import { assertAdmin, assertRole, assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";

// ─────────────────────────────────────────────────────────
// COURSE CATALOG
// ─────────────────────────────────────────────────────────

export const getCourses = query({
  args: {
    departmentId: v.optional(v.id("departments")),
    programId: v.optional(v.id("programs")),
    yearOfStudy: v.optional(v.number()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    let courses;
    if (args.programId && args.yearOfStudy && args.semester) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_program_year_sem", (q) =>
          q
            .eq("programId", args.programId!)
            .eq("yearOfStudy", args.yearOfStudy!)
            .eq("semester", args.semester!)
        )
        .collect();
    } else if (args.programId) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_program", (q) => q.eq("programId", args.programId!))
        .collect();
    } else if (args.departmentId) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId!))
        .collect();
    } else {
      courses = await ctx.db.query("courses").order("desc").collect();
    }

    // Enrich with Department and Program metadata
    const enriched = await Promise.all(
      courses.map(async (c) => {
        const department = await ctx.db.get(c.departmentId);
        const program = await ctx.db.get(c.programId);
        return {
          ...c,
          departmentName: department?.name ?? "—",
          departmentCode: department?.code ?? "—",
          programName: program?.name ?? "—",
          programCode: program?.code ?? "—",
          programLevel: program?.level ?? "—",
        };
      })
    );

    return enriched;
  },
});

export const getCourseById = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
    const course = await ctx.db.get(args.id);
    if (!course) return null;

    const department = await ctx.db.get(course.departmentId);
    const program = await ctx.db.get(course.programId);

    return {
      ...course,
      departmentName: department?.name ?? "—",
      programName: program?.name ?? "—",
      programCode: program?.code ?? "—",
    };
  },
});

export const createCourse = mutation({
  args: {
    code: v.string(),
    title: v.string(),
    creditUnits: v.number(),
    departmentId: v.id("departments"),
    programId: v.id("programs"),
    yearOfStudy: v.number(),
    semester: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod"]);

    const cleanCode = args.code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await ctx.db
      .query("courses")
      .withIndex("by_code", (q) => q.eq("code", cleanCode))
      .first();

    if (existing) {
      throw new Error(`Course with code '${cleanCode}' already exists.`);
    }

    const id = await ctx.db.insert("courses", {
      ...args,
      code: cleanCode,
      status: "active",
    });

    await logAction(ctx, {
      action: "CREATE_COURSE",
      resource: "courses",
      details: `Created course ${cleanCode}: ${args.title} (${args.creditUnits} credits)`,
    });

    return id;
  },
});

export const updateCourse = mutation({
  args: {
    id: v.id("courses"),
    title: v.optional(v.string()),
    creditUnits: v.optional(v.number()),
    yearOfStudy: v.optional(v.number()),
    semester: v.optional(v.number()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await logAction(ctx, {
      action: "UPDATE_COURSE",
      resource: "courses",
      details: `Updated course ${id}`,
    });
  },
});

export const deleteCourse = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const allocations = await ctx.db
      .query("courseAllocations")
      .withIndex("by_course_period", (q) => q.eq("courseId", args.id))
      .first();

    if (allocations) {
      throw new Error("Cannot delete course. It is allocated to teaching staff.");
    }

    const course = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);

    await logAction(ctx, {
      action: "DELETE_COURSE",
      resource: "courses",
      details: `Deleted course ${course?.code}: ${course?.title}`,
    });
  },
});

/**
 * Seeds a standard initial set of university courses for ECU programs.
 */
export const seedDefaultCourses = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);

    // Fetch programs
    const programs = await ctx.db.query("programs").collect();
    if (programs.length === 0) {
      throw new Error("No academic programs found. Run seedData first.");
    }

    const bba = programs.find((p) => p.code === "BBA");
    const bth = programs.find((p) => p.code === "BTH");
    const bcs = programs.find((p) => p.code === "BCS");

    const sampleCourses = [
      // Business
      { code: "BBA 101", title: "Principles of Management", credits: 3, prog: bba, year: 1, sem: 1 },
      { code: "BBA 102", title: "Financial Accounting I", credits: 3, prog: bba, year: 1, sem: 1 },
      { code: "BBA 103", title: "Business Mathematics & Statistics", credits: 3, prog: bba, year: 1, sem: 1 },
      { code: "BBA 104", title: "Business Communication Skills", credits: 2, prog: bba, year: 1, sem: 1 },
      // Theology
      { code: "THE 101", title: "Old Testament Survey", credits: 3, prog: bth, year: 1, sem: 1 },
      { code: "THE 102", title: "Christian Ethics & Discipleship", credits: 3, prog: bth, year: 1, sem: 1 },
      { code: "THE 103", title: "Hermeneutics & Biblical Interpretation", credits: 3, prog: bth, year: 1, sem: 1 },
      // Computing
      { code: "CMP 101", title: "Introduction to Computer Science", credits: 3, prog: bcs, year: 1, sem: 1 },
      { code: "CMP 102", title: "Structured Programming (C/C++)", credits: 4, prog: bcs, year: 1, sem: 1 },
      { code: "CMP 103", title: "Discrete Mathematics for Computing", credits: 3, prog: bcs, year: 1, sem: 1 },
    ];

    let created = 0;
    for (const c of sampleCourses) {
      if (!c.prog) continue;

      const existing = await ctx.db
        .query("courses")
        .withIndex("by_code", (q) => q.eq("code", c.code))
        .first();

      if (!existing) {
        await ctx.db.insert("courses", {
          code: c.code,
          title: c.title,
          creditUnits: c.credits,
          departmentId: c.prog.departmentId,
          programId: c.prog._id,
          yearOfStudy: c.year,
          semester: c.sem,
          status: "active",
        });
        created++;
      }
    }

    return { created };
  },
});
