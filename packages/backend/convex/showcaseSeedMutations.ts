import { internalMutation, internalQuery } from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import { v } from "convex/values";

export type SeedContext = {
  programs: Doc<"programs">[];
  courses: Doc<"courses">[];
  departments: Doc<"departments">[];
  periods: Doc<"academicPeriods">[];
  students: Doc<"students">[];
  staff: Doc<"staffProfiles">[];
};

const studentValidator = v.object({
  userId: v.string(), registrationNumber: v.string(), accessNumber: v.string(),
  loginEmail: v.optional(v.string()), programId: v.id("programs"), firstName: v.string(),
  surname: v.string(), otherName: v.string(), gender: v.union(v.literal("male"), v.literal("female")),
  dateOfBirth: v.string(), nationality: v.string(), address: v.string(), phone: v.string(),
  contactEmail: v.string(), emergencyContact: v.object({ name: v.string(), relationship: v.string(), phone: v.string() }),
  yearOfEntry: v.number(), programType: v.literal("Day"), yearOfStudy: v.number(),
  currentPeriodId: v.id("academicPeriods"), term: v.number(), year: v.number(),
});

export const seedContext = internalQuery({
  args: {},
  handler: async (ctx): Promise<SeedContext> => {
    const [programs, courses, departments, periods, students, staff] = await Promise.all([
      ctx.db.query("programs").withIndex("by_status", (q) => q.eq("status", "active")).take(100),
      ctx.db.query("courses").withIndex("by_status", (q) => q.eq("status", "active")).take(200),
      ctx.db.query("departments").withIndex("by_status", (q) => q.eq("status", "active")).take(100),
      Promise.all([
        ctx.db.query("academicPeriods").withIndex("by_term_year", (q) => q.eq("term", 1).eq("year", 2026)).first(),
        ctx.db.query("academicPeriods").withIndex("by_term_year", (q) => q.eq("term", 2).eq("year", 2026)).first(),
        ctx.db.query("academicPeriods").withIndex("by_term_year", (q) => q.eq("term", 1).eq("year", 2027)).first(),
      ]),
      ctx.db.query("students").withIndex("by_status", (q) => q.eq("status", "active")).take(1000),
      ctx.db.query("staffProfiles").withIndex("by_status", (q) => q.eq("status", "active")).take(100),
    ]);
    return { programs, courses, departments, periods: periods.filter((period) => period !== null), students, staff };
  },
});

export const normalizePeriods = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expected = [
      { term: 1, year: 2026, name: "Semester 1", startDate: "2026-02-01", endDate: "2026-06-15", status: "completed" as const },
      { term: 2, year: 2026, name: "Semester 2", startDate: "2026-08-15", endDate: "2026-12-10", status: "active" as const },
      { term: 1, year: 2027, name: "Semester 1", startDate: "2027-02-01", endDate: "2027-06-15", status: "upcoming" as const },
    ];
    for (const item of expected) {
      const period = await ctx.db.query("academicPeriods").withIndex("by_term_year", (q) => q.eq("term", item.term).eq("year", item.year)).first();
      if (!period) {
        await ctx.db.insert("academicPeriods", {
          name: item.name, term: item.term, year: item.year, startDate: item.startDate,
          endDate: item.endDate, status: item.status, createdAt: now, updatedAt: now,
        });
      } else if (period.status !== item.status) {
        await ctx.db.patch(period._id, { status: item.status, updatedAt: now });
      }
    }
  },
});

export const insertStudents = internalMutation({
  args: { students: v.array(studentValidator) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const student of args.students) {
      const existing = await ctx.db.query("students").withIndex("by_regNumber", (q) => q.eq("registrationNumber", student.registrationNumber)).unique();
      if (existing) continue;
      await ctx.db.insert("students", {
        ...student, status: "active", financeStatus: "partial", createdAt: now, updatedAt: now,
      });
    }
  },
});

export const assignStudentTestLogin = internalMutation({
  args: { studentId: v.id("students"), previousUserId: v.string(), userId: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.studentId);
    if (!student || student.userId !== args.previousUserId) return;
    await ctx.db.patch(student._id, { userId: args.userId, loginEmail: args.email, updatedAt: Date.now() });
  },
});

export const assignHodForUnassignedDepartments = internalMutation({
  args: { hodUserId: v.string() },
  handler: async (ctx, args) => {
    const departments = await ctx.db.query("departments").withIndex("by_status", (q) => q.eq("status", "active")).take(100);
    const now = Date.now();
    for (const department of departments) {
      if (department.hodId) continue;
      await ctx.db.patch(department._id, { hodId: args.hodUserId, updatedAt: now });
      const active = await ctx.db.query("departmentLeadershipAssignments").withIndex("by_departmentId_and_status", (q) => q.eq("departmentId", department._id).eq("status", "active")).unique();
      if (!active) await ctx.db.insert("departmentLeadershipAssignments", {
        departmentId: department._id, staffUserId: args.hodUserId, appointedBy: "system",
        startsAt: now, reason: "Showcase HOD access for test workflows", status: "active", createdAt: now, updatedAt: now,
      });
    }
  },
});

export const ensureSemesterRegistrations = internalMutation({
  args: { rows: v.array(v.object({ studentId: v.id("students"), yearOfStudy: v.number(), periodId: v.id("academicPeriods"), semester: v.number() })) },
  handler: async (ctx, args) => {
    for (const row of args.rows) {
      const existing = await ctx.db.query("studentSemesterRegistrations").withIndex("by_student_period", (q) => q.eq("studentId", row.studentId).eq("periodId", row.periodId)).unique();
      if (existing) continue;
      await ctx.db.insert("studentSemesterRegistrations", {
        ...row, status: "registered", registeredAt: Date.now(), registeredBy: "Admissions Office",
        registrationSource: "admissions", createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    return args.rows.length;
  },
});

export const ensureCourseAllocation = internalMutation({
  args: { courseId: v.id("courses"), departmentId: v.id("departments"), periodId: v.id("academicPeriods"), lecturerId: v.string(), hodId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("courseAllocations").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).unique();
    if (existing) return 1;
    await ctx.db.insert("courseAllocations", {
      courseId: args.courseId, departmentId: args.departmentId, periodId: args.periodId,
      lecturerId: args.lecturerId, assignedBy: args.hodId, revision: 1,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    return 1;
  },
});

export function chunks<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}
