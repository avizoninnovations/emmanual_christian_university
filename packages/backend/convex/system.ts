import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server.js";
import { logAction } from "./audit_logger";

/**
 * Get all audit logs for the System view.
 * Ordered by timestamp descending.
 */
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 100);
  },
});

/**
 * Internal mutation to record a new audit log entry.
 * Should be called by other mutations via ctx.runMutation(internal.system._logAction, { ... })
 */
export const _logAction = internalMutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    action: v.string(),
    resource: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

/**
 * seeding script to populate ECU with initial data.
 * Non-destructive: checks for existing codes before inserting.
 */
export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Seed Faculties
    const faculties = [
      { name: "Theology & Religious Studies", code: "TRS", desc: "Foundational theological education" },
      { name: "Business & Management", code: "BMA", desc: "Corporate and entrepreneurship studies" },
      { name: "Science & Technology", code: "SCT", desc: "Computing and information systems" },
    ];

    const facultyIds: Record<string, any> = {};
    for (const f of faculties) {
      const existing = await ctx.db
        .query("faculties")
        .withIndex("by_code", (q) => q.eq("code", f.code))
        .unique();
      
      if (!existing) {
        facultyIds[f.code] = await ctx.db.insert("faculties", {
          name: f.name,
          code: f.code,
          description: f.desc,
          status: "active",
        });
      } else {
        facultyIds[f.code] = existing._id;
      }
    }

    // 2. Seed Departments
    const departments = [
      { name: "Biblical Studies", code: "BST", fCode: "TRS" },
      { name: "Accounting & Finance", code: "ACF", fCode: "BMA" },
      { name: "Computing", code: "CMP", fCode: "SCT" },
    ];

    const deptIds: Record<string, any> = {};
    for (const d of departments) {
      const existing = await ctx.db
        .query("departments")
        .withIndex("by_faculty", (q) => q.eq("facultyId", facultyIds[d.fCode]))
        .filter((q) => q.eq(q.field("code"), d.code))
        .unique();
      
      if (!existing) {
        deptIds[d.code] = await ctx.db.insert("departments", {
          name: d.name,
          code: d.code,
          facultyId: facultyIds[d.fCode],
          status: "active",
        });
      } else {
        deptIds[d.code] = existing._id;
      }
    }

    // 3. Seed Programs
    const programs = [
      { name: "Bachelor of Theology", code: "BTH", dCode: "BST", level: "Bachelor", years: 3 },
      { name: "Bachelor of Business Admin", code: "BBA", dCode: "ACF", level: "Bachelor", years: 3 },
      { name: "BSc. Computer Science", code: "BCS", dCode: "CMP", level: "Bachelor", years: 3 },
      { name: "Diploma in Information Tech", code: "DIT", dCode: "CMP", level: "Diploma", years: 2 },
    ];

    const programIds: Record<string, any> = {};
    for (const p of programs) {
       const existing = await ctx.db
        .query("programs")
        .withIndex("by_department", (q) => q.eq("departmentId", deptIds[p.dCode]))
        .filter((q) => q.eq(q.field("code"), p.code))
        .unique();

      if (!existing) {
        programIds[p.code] = await ctx.db.insert("programs", {
          name: p.name,
          code: p.code,
          departmentId: deptIds[p.dCode],
          level: p.level as any,
          durationYears: p.years,
          status: "active",
        });
      } else {
        programIds[p.code] = existing._id;
      }
    }

    // 4. Seed Academic Period (Active Semester)
    const activePeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .unique();
    
    let periodId = activePeriod?._id;
    if (!activePeriod) {
      periodId = await ctx.db.insert("academicPeriods", {
        name: "Semester 1",
        year: 2026,
        startDate: "2026-01-15",
        endDate: "2026-05-30",
        status: "active",
      });
    }

    // 5. Seed Library Books
    const books = [
      { title: "Systematic Theology", author: "Wayne Grudem", isbn: "978-0310286707" },
      { title: "Clean Code", author: "Robert C. Martin", isbn: "978-0132350884" },
      { title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell", isbn: "978-0134610993" },
      { title: "Financial Accounting", author: "Libby & Libby", isbn: "978-1260247848" },
    ];

    for (const b of books) {
      const existing = await ctx.db
        .query("books")
        .withIndex("by_isbn", (q) => q.eq("isbn", b.isbn))
        .unique();
      
      if (!existing) {
        await ctx.db.insert("books", {
          ...b,
          totalCopies: 5,
          availableCopies: 5,
        });
      }
    }

    // 6. Log the seed event
    await logAction(ctx, {
      action: "SYSTEM_SEED",
      resource: "system",
      details: "Database successfully seeded with academic structure and library resources."
    });

    return { success: true };
  },
});
