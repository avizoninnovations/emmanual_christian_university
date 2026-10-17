import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations";
import { v, ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { studentPersonalFields } from "./lib/studentProfileFields";
import { logAction } from "./audit_logger";
import { assertRole, assertAuthenticated } from "./lib/utils";

// ─────────────────────────────────────────────────────────
// ENROLLED STUDENTS
// ─────────────────────────────────────────────────────────

export const getStudents = query({
  args: {
    programId: v.optional(v.id("programs")),
    status: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("deferred"), v.literal("graduating"), v.literal("discontinued"))),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
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
    await assertAuthenticated(ctx);
    return await ctx.db.get(args.id);
  },
});

export const createStudent = mutation({
  args: {
    ...studentPersonalFields,
    userId: v.string(),
    registrationNumber: v.string(),
    accessNumber: v.string(),
    contactEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    applicantId: v.optional(v.id("applicants")),
    programId: v.id("programs"),
    yearOfStudy: v.number(),
    term: v.number(),
    year: v.number(),
    currentPeriodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "registrar"]);
    const registrationNumber = args.registrationNumber.trim().toUpperCase();
    const accessNumber = args.accessNumber.trim().toUpperCase();
    if (!/^[A-Z]\d{2}\/ECU\/[A-Z0-9-]{2,12}\/\d{3,6}$/.test(registrationNumber)) throw new ConvexError("Enter a student number in the format S26/ECU/PROGRAM/001.");
    if (!/^ECU\d{4,8}$/.test(accessNumber)) throw new ConvexError("Enter a separate access number in the format ECU0001.");
    const [existingUser, existingRegistration, existingAccess, authUser, applicant, program] = await Promise.all([
      ctx.db.query("students").withIndex("by_userId", q => q.eq("userId", args.userId)).unique(),
      ctx.db.query("students").withIndex("by_regNumber", q => q.eq("registrationNumber", registrationNumber)).unique(),
      ctx.db.query("students").withIndex("by_accessNumber", q => q.eq("accessNumber", accessNumber)).unique(),
      ctx.runQuery(components.betterAuth.adapter.findOne, { model: "user", where: [{ field: "_id", value: args.userId, operator: "eq" }] }),
      args.applicantId ? ctx.db.get(args.applicantId) : null,
      ctx.db.get(args.programId),
    ]);
    if (existingUser || existingRegistration || existingAccess) throw new ConvexError("This account, student number, or access number is already enrolled.");
    if (!authUser) throw new ConvexError("Create the student's sign-in account before enrollment.");
    if (!program || program.status !== "active") throw new ConvexError("Select an active program.");
    if (args.applicantId && (!applicant || applicant.status !== "accepted" || applicant.programId !== args.programId)) throw new ConvexError("Only an accepted applicant can be enrolled in their approved program.");
    const inherited = applicant ? {
      firstName: applicant.firstName, surname: applicant.surname, otherName: applicant.otherName,
      gender: applicant.gender, dateOfBirth: applicant.dateOfBirth, nationality: applicant.nationality,
      address: applicant.address, emergencyContact: applicant.emergencyContact,
      yearOfEntry: applicant.yearOfEntry, programType: applicant.programType,
      contactEmail: applicant.email, phone: applicant.phone,
    } : {};
    const id = await ctx.db.insert("students", {
      ...inherited,
      ...args,
      registrationNumber, accessNumber, loginEmail: authUser.email,
      status: "active",
      financeStatus: "pending",
    });
    if (applicant) await ctx.db.patch(applicant._id, { status: "enrolled" });

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
    await assertRole(ctx, ["admin", "staff"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await logAction(ctx, {
      action: "UPDATE_STUDENT_STATUS",
      resource: "students",
      details: `Updated student ${id}: ${Object.keys(updates).map(k => `${k}=${(updates as any)[k]}`).join(', ')}`
    });
  },
});
