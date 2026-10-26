import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations";
import { components } from "./_generated/api";
import { logAction } from "./audit_logger";
import { assertRole } from "./lib/utils";

const admissionsRoles = ["admin", "registrar", "admissions_officer"];

export const getEnrollmentPeriods = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, admissionsRoles);
    return await ctx.db
      .query("academicPeriods")
      .withIndex("by_year")
      .order("desc")
      .take(30);
  },
});

export const getEnrollmentRoster = query({
  args: {
    periodId: v.id("academicPeriods"),
    programId: v.optional(v.id("programs")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, admissionsRoles);
    const period = await ctx.db.get(args.periodId);
    if (!period || !["active", "upcoming"].includes(period.status))
      throw new ConvexError("Choose an active or upcoming Academic Period.");
    const students = ctx.db.query("students");
    const source = args.programId
      ? students.withIndex("by_status_and_program", (q) =>
          q.eq("status", "active").eq("programId", args.programId!),
        )
      : students.withIndex("by_status", (q) => q.eq("status", "active"));
    const page = await source
      .order("asc")
      .paginate(args.paginationOpts);
    const [programs, registrations] = await Promise.all([
      Promise.all(
        [...new Set(page.page.map((student) => student.programId))].map((id) =>
          ctx.db.get(id),
        ),
      ),
      Promise.all(
        page.page.map((student) =>
          ctx.db
            .query("studentSemesterRegistrations")
            .withIndex("by_student_period", (q) =>
              q.eq("studentId", student._id).eq("periodId", period._id),
            )
            .unique(),
        ),
      ),
    ]);
    const programNames = new Map(
      programs.filter(Boolean).map((program) => [program!._id, program!.name]),
    );
    return {
      ...page,
      page: page.page.map((student, index) => ({
        id: student._id,
        name:
          [student.firstName, student.otherName, student.surname]
            .filter(Boolean)
            .join(" ") || student.registrationNumber,
        registrationNumber: student.registrationNumber,
        accessNumber: student.accessNumber ?? "—",
        yearOfStudy: student.yearOfStudy,
        programName:
          programNames.get(student.programId) ?? "Program unavailable",
        registration: registrations[index],
      })),
    };
  },
});

export const enrollStudentsForPeriod = mutation({
  args: {
    studentIds: v.array(v.id("students")),
    periodId: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    const { profile } = await assertRole(ctx, admissionsRoles);
    const studentIds = [...new Set(args.studentIds)];
    if (studentIds.length === 0 || studentIds.length > 100)
      throw new ConvexError("Select between 1 and 100 students to enroll.");
    const period = await ctx.db.get(args.periodId);
    if (!period || !["active", "upcoming"].includes(period.status))
      throw new ConvexError(
        "Only active or upcoming Academic Periods can be enrolled.",
      );
    const students = await Promise.all(studentIds.map((id) => ctx.db.get(id)));
    if (students.some((student) => !student || student.status !== "active"))
      throw new ConvexError(
        "All selected students must have an active student record.",
      );
    const now = Date.now();
    let enrolledCount = 0;
    for (const student of students) {
      if (!student) continue;
      const existing = await ctx.db
        .query("studentSemesterRegistrations")
        .withIndex("by_student_period", (q) =>
          q.eq("studentId", student._id).eq("periodId", period._id),
        )
        .unique();
      if (existing?.status === "registered") continue;
      const fields = {
        yearOfStudy: student.yearOfStudy,
        semester: period.term,
        status: "registered" as const,
        registeredAt: now,
        registeredBy: `Admissions · ${profile.staffId}`,
        registrationSource: "admissions" as const,
        updatedAt: now,
      };
      if (existing) await ctx.db.patch(existing._id, fields);
      else
        await ctx.db.insert("studentSemesterRegistrations", {
          studentId: student._id,
          periodId: period._id,
          ...fields,
          createdAt: now,
        });
      enrolledCount++;
    }
    await logAction(ctx, {
      action: "ADMISSIONS_SEMESTER_ENROLLMENT",
      resource: "studentSemesterRegistrations",
      details: `Recorded ${enrolledCount} semester enrollment(s) for ${period.name} ${period.year}.`,
    });
    return {
      enrolledCount,
      alreadyRegistered: studentIds.length - enrolledCount,
    };
  },
});

export const enrollReportedApplicant = mutation({
  args: {
    applicantId: v.id("applicants"),
    periodId: v.id("academicPeriods"),
    registrationNumber: v.string(),
    accessNumber: v.string(),
    yearOfStudy: v.number(),
  },
  handler: async (ctx, args) => {
    const { profile } = await assertRole(ctx, admissionsRoles);
    const applicant = await ctx.db.get(args.applicantId);
    const period = await ctx.db.get(args.periodId);
    if (
      !applicant ||
      applicant.status !== "accepted" ||
      !applicant.offerAcceptedAt ||
      !applicant.reportedAt
    )
      throw new ConvexError(
        "The applicant must accept the offer and report before student enrollment.",
      );
    if (
      !period ||
      !["active", "upcoming"].includes(period.status) ||
      period.term !== applicant.term ||
      period.year !== applicant.year
    )
      throw new ConvexError(
        "Choose the Academic Period assigned to this applicant's intake.",
      );
    if (
      !Number.isInteger(args.yearOfStudy) ||
      args.yearOfStudy < 1 ||
      args.yearOfStudy > 10
    )
      throw new ConvexError("Enter a valid year of study.");
    const registrationNumber = args.registrationNumber.trim().toUpperCase();
    const accessNumber = args.accessNumber.trim().toUpperCase();
    if (!/^[A-Z]\d{2}\/ECU\/[A-Z0-9-]{2,12}\/\d{3,6}$/.test(registrationNumber))
      throw new ConvexError(
        "Enter a student number in the format S26/ECU/PROGRAM/001.",
      );
    if (!/^ECU\d{4,8}$/.test(accessNumber))
      throw new ConvexError(
        "Enter a separate access number in the format ECU0001.",
      );
    const [authUser, byRegistration, byAccess, byApplicant, program] =
      await Promise.all([
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "email", value: applicant.email, operator: "eq" }],
        }),
        ctx.db
          .query("students")
          .withIndex("by_regNumber", (q) =>
            q.eq("registrationNumber", registrationNumber),
          )
          .unique(),
        ctx.db
          .query("students")
          .withIndex("by_accessNumber", (q) =>
            q.eq("accessNumber", accessNumber),
          )
          .unique(),
        ctx.db
          .query("students")
          .withIndex("by_applicant", (q) => q.eq("applicantId", applicant._id))
          .unique(),
        ctx.db.get(applicant.programId),
      ]);
    if (!authUser)
      throw new ConvexError(
        "Create the student's sign-in account with this email before completing enrollment.",
      );
    if (byRegistration || byAccess || byApplicant)
      throw new ConvexError(
        "A student profile already uses this account, application, student number, or access number.",
      );
    if (!program || program.status !== "active")
      throw new ConvexError("The applicant's program is no longer active.");
    const now = Date.now();
    const studentId = await ctx.db.insert("students", {
      firstName: applicant.firstName,
      surname: applicant.surname,
      otherName: applicant.otherName,
      gender: applicant.gender,
      dateOfBirth: applicant.dateOfBirth,
      nationality: applicant.nationality,
      address: applicant.address,
      emergencyContact: applicant.emergencyContact,
      yearOfEntry: applicant.yearOfEntry,
      programType: applicant.programType,
      userId: authUser._id,
      registrationNumber,
      accessNumber,
      loginEmail: authUser.email,
      contactEmail: applicant.email,
      phone: applicant.phone,
      applicantId: applicant._id,
      programId: applicant.programId,
      yearOfStudy: args.yearOfStudy,
      currentPeriodId: period._id,
      term: period.term,
      year: period.year,
      status: "active",
      financeStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("studentSemesterRegistrations", {
      studentId,
      periodId: period._id,
      yearOfStudy: args.yearOfStudy,
      semester: period.term,
      status: "registered",
      registeredAt: now,
      registeredBy: `Admissions · ${profile.staffId}`,
      registrationSource: "admissions",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(applicant._id, { status: "enrolled", updatedAt: now });
    await ctx.db.insert("applicantEvents", {
      applicantId: applicant._id,
      actorUserId: profile.userId,
      action: "status_changed",
      fromStatus: "accepted",
      toStatus: "enrolled",
      note: `Student number ${registrationNumber} created.`,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("applicantEvents", {
      applicantId: applicant._id,
      actorUserId: profile.userId,
      action: "semester_enrolled",
      note: `Enrolled for ${period.name} ${period.year}.`,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "ENROLL_REPORTED_APPLICANT",
      resource: "students",
      details: `Created student ${registrationNumber} and recorded ${period.name} ${period.year} enrollment.`,
    });
    return studentId;
  },
});
