import { action } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger.js";
import { createAuth } from "./betterAuth/auth.js";
import { internal } from "./_generated/api.js";

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

    // 3.5. Seed Courses
    const courses = [
      { code: "BBA 101", title: "Principles of Management", credits: 3, pCode: "BBA", dCode: "ACF", year: 1, sem: 1 },
      { code: "BBA 102", title: "Financial Accounting I", credits: 3, pCode: "BBA", dCode: "ACF", year: 1, sem: 1 },
      { code: "BBA 103", title: "Business Mathematics & Statistics", credits: 3, pCode: "BBA", dCode: "ACF", year: 1, sem: 1 },
      { code: "THE 101", title: "Old Testament Survey", credits: 3, pCode: "BTH", dCode: "BST", year: 1, sem: 1 },
      { code: "THE 102", title: "Christian Ethics & Discipleship", credits: 3, pCode: "BTH", dCode: "BST", year: 1, sem: 1 },
      { code: "CMP 101", title: "Introduction to Computer Science", credits: 3, pCode: "BCS", dCode: "CMP", year: 1, sem: 1 },
      { code: "CMP 102", title: "Structured Programming (C/C++)", credits: 4, pCode: "BCS", dCode: "CMP", year: 1, sem: 1 },
    ];

    for (const c of courses) {
      const existing = await ctx.db
        .query("courses")
        .withIndex("by_code", (q) => q.eq("code", c.code))
        .first();

      if (!existing && programIds[c.pCode] && deptIds[c.dCode]) {
        await ctx.db.insert("courses", {
          code: c.code,
          title: c.title,
          creditUnits: c.credits,
          departmentId: deptIds[c.dCode],
          programId: programIds[c.pCode],
          yearOfStudy: c.year,
          semester: c.sem,
          status: "active",
        });
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

    // 6. Log the seed event
    await logAction(ctx, {
      action: "SYSTEM_SEED",
      resource: "system",
      details: "Database successfully seeded with academic structure and library resources."
    });

    return { success: true };
  },
});

/**
 * Seed demo staff users into the system.
 * Uses Better Auth to create actual accounts.
 */
export const seedDemoStaff = action({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);
    
    const demoStaff = [
      { firstName: "System", lastName: "Admin", email: "admin@ecu-ssd.org", roles: ["admin", "staff"], title: "Dr." },
      { firstName: "James", lastName: "Carter", email: "james.carter@ecu-ssd.org", roles: ["staff"], title: "Mr." },
      { firstName: "Sarah", lastName: "Miller", email: "sarah.miller@ecu-ssd.org", roles: ["registrar", "staff"], title: "Ms." },
      { firstName: "Robert", lastName: "Fox", email: "robert.fox@ecu-ssd.org", roles: ["finance", "staff"], title: "Mr." },
      { firstName: "Emily", lastName: "Stone", email: "emily.stone@ecu-ssd.org", roles: ["hod", "staff"], title: "Dr." },
      { firstName: "Michael", lastName: "Brown", email: "michael.brown@ecu-ssd.org", roles: ["dean", "staff"], title: "Prof." },
      { firstName: "Alice", lastName: "Johnson", email: "alice.johnson@ecu-ssd.org", roles: ["librarian", "staff"], title: "Mrs." },
      { firstName: "David", lastName: "Wilson", email: "david.wilson@ecu-ssd.org", roles: ["staff"], title: "Mr." },
      { firstName: "Sophia", lastName: "Garcia", email: "sophia.garcia@ecu-ssd.org", roles: ["registrar", "staff"], title: "Dr." },
      { firstName: "Chris", lastName: "Lee", email: "chris.lee@ecu-ssd.org", roles: ["staff"], title: "Mr." },
      { firstName: "Anna", lastName: "White", email: "anna.white@ecu-ssd.org", roles: ["staff"], title: "Ms." },
    ];

    let createdCount = 0;

    for (const s of demoStaff) {
      try {
        const betterAuthRole = s.roles.includes("admin") ? "admin" : "user";
        
        // @ts-ignore
        const user = await auth.api.createUser({
          body: {
            email: s.email,
            password: "UniSystem2026!",
            name: `${s.firstName} ${s.lastName}`,
            role: betterAuthRole,
            data: { emailVerified: true },
          },
        });

        if (user?.user?.id) {
          // Create the staff profile
          await ctx.runMutation(internal.users._createStaffProfile, {
            userId: user.user.id,
            roles: s.roles,
            title: s.title,
          });
          createdCount++;
        }
      } catch (e) {
        console.error(`Failed to seed user ${s.email}:`, e);
      }
    }

    // Log the event
    await ctx.runMutation(internal.system._logAction, {
        userId: "system",
        userName: "ECU System",
        userEmail: "system@ecu-ssd.org",
        action: "DEMO_USER_SEED",
        resource: "users",
        details: `Seeded ${createdCount} demo staff users into the system.`
    });

    return { createdCount };
  },
});
