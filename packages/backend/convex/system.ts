import { v } from "convex/values";
import { mutation, internalMutation } from "./lib/mutations";
import { query } from "./_generated/server.js";
import { logAction } from "./audit_logger";
import { paginationOptsValidator } from "convex/server";

/**
 * Robust paginated query for audit logs with backend filtering.
 */
export const getAuditLogs = query({
  args: { 
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    actions: v.optional(v.array(v.string())),
    resource: v.optional(v.string()),
    location: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("auditLogs").order("desc");

    // ── Efficient Filtering ──
    if (args.startDate !== undefined || args.endDate !== undefined) {
      const start = args.startDate ?? 0;
      const end = args.endDate ?? Date.now();
      query = ctx.db.query("auditLogs")
        .withIndex("by_createdAt", q => 
          q.gte("createdAt", start).lte("createdAt", end)
        )
        .order("desc");
    }

    const { paginationOpts, ...filters } = args;
    const results = await query.paginate(paginationOpts);

    // Filter current page
    let filteredPage = results.page;
    if (filters.actions && filters.actions.length > 0) {
      filteredPage = filteredPage.filter(l => filters.actions!.includes(l.action));
    }
    if (filters.resource && filters.resource !== "all") {
      filteredPage = filteredPage.filter(l => l.resource === filters.resource);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filteredPage = filteredPage.filter(l => 
        l.userName.toLowerCase().includes(s) ||
        l.userEmail.toLowerCase().includes(s) ||
        l.details.toLowerCase().includes(s) ||
        (l as any).staffId?.toLowerCase().includes(s)
      );
    }
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      filteredPage = filteredPage.filter(l => 
        (l as any).location?.toLowerCase().includes(loc) ||
        (l as any).ipAddress?.toLowerCase().includes(loc)
      );
    }

    const userIds = Array.from(new Set(filteredPage.map(l => l.userId)));
    const profiles = await Promise.all(
      userIds.map(uid => 
        ctx.db.query("staffProfiles")
          .withIndex("by_userId", q => q.eq("userId", uid))
          .unique()
      )
    );

    const staffIdMap = new Map();
    profiles.forEach(p => {
      if (p) staffIdMap.set(p.userId, p.staffId);
    });

    return {
      ...results,
      page: filteredPage.map(l => ({
        ...l,
        staffId: staffIdMap.get(l.userId) || "SYSTEM"
      }))
    };
  },
});

/**
 * Global Aggregation Query for Audit Overview
 */
export const getAuditStats = query({
  args: {
    search: v.optional(v.string()),
    actions: v.optional(v.array(v.string())),
    resource: v.optional(v.string()),
    location: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = (args.startDate !== undefined || args.endDate !== undefined)
      ? ctx.db.query("auditLogs")
          .withIndex("by_createdAt", q => 
            q.gte("createdAt", args.startDate ?? 0).lte("createdAt", args.endDate ?? Date.now())
          )
      : ctx.db.query("auditLogs").order("desc");

    // Exhaustive match (Note: Scale-limited by .collect())
    const allMatching = await query.collect();
    
    // Apply exhaustive secondary filters
    let filtered = allMatching;
    if (args.actions && args.actions.length > 0) {
      filtered = filtered.filter(l => args.actions!.includes(l.action));
    }
    if (args.resource && args.resource !== "all") {
      filtered = filtered.filter(l => l.resource === args.resource);
    }
    if (args.search) {
      const s = args.search.toLowerCase();
      filtered = filtered.filter(l => 
        l.userName.toLowerCase().includes(s) ||
        l.userEmail.toLowerCase().includes(s) ||
        l.details.toLowerCase().includes(s)
      );
    }
    if (args.location) {
      const loc = args.location.toLowerCase();
      filtered = filtered.filter(l => 
        (l as any).location?.toLowerCase().includes(loc) ||
        (l as any).ipAddress?.toLowerCase().includes(loc)
      );
    }

    const highImpact = filtered.filter(l => 
       l.action.includes("CREATE") || 
       l.action.includes("DELETE") ||
       l.action.includes("BAN")
    );

    const admins = new Set(filtered.map(l => l.userId));

    return {
       totalMatched: filtered.length,
       adminActions: highImpact.length,
       activeAdmins: admins.size
    };
  }
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
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      ...args,
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
        term: 1,
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

    // 6. Seed System Configurations
    const systemConfig = await ctx.db.query("systemConfigurations").first();
    if (!systemConfig) {
      await ctx.db.insert("systemConfigurations", {
        universityName: "Emmanuel Christian University",
        universityMotto: "Excellence in Service",
        contactEmail: "info@ecu.edu.ug",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // 7. Log the seed event
    await logAction(ctx, {
      action: "SYSTEM_SEED",
      resource: "system",
      details: "Database successfully seeded with academic structure and library resources."
    });

    return { success: true };
  },
});

/**
 * MIGRATION: Patch academicPeriods missing the required 'term' field.
 */
export const migrateAcademicPeriods = mutation({
  args: {},
  handler: async (ctx) => {
    const periods = await ctx.db.query("academicPeriods").collect();
    let patchedCount = 0;

    for (const period of periods) {
      if ((period as any).term === undefined) {
        await ctx.db.patch(period._id, { term: 1 });
        patchedCount++;
      }
    }

    return { patchedCount };
  },
});

/**
 * Public query to fetch non-sensitive, high-level university statistics.
 * This is used purely for aesthetic widgets on the login page to show live data.
 */
export const getPublicStats = query({
  args: {},
  handler: async (ctx) => {
    const activePeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    // In a real large-scale system, counts would use aggregate/count queries,
    // but faculties and programs are generally small tables (< 100).
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const faculties = await ctx.db
      .query("faculties")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return {
      currentPeriod: activePeriod ? `${activePeriod.name} (${activePeriod.year})` : "Planning Phase",
      activePrograms: programs.length,
      activeFaculties: faculties.length,
    };
  },
});

/**
 * ── Settings Configuration ──
 */

export const getSystemConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("systemConfigurations").first();
  },
});

export const updateSystemConfig = mutation({
  args: {
    id: v.optional(v.id("systemConfigurations")),
    universityName: v.string(),
    universityMotto: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const now = Date.now();
    
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now });
    } else {
      const existing = await ctx.db.query("systemConfigurations").first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...data, updatedAt: now });
      } else {
        await ctx.db.insert("systemConfigurations", { ...data, createdAt: now, updatedAt: now });
      }
    }
    
    await logAction(ctx, {
      action: "UPDATE_SYSTEM_CONFIG",
      resource: "system",
      details: `Administrative settings updated: branding & metadata for ${args.universityName}`
    });
    
    return { success: true };
  },
});
