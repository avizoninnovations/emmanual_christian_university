import { components } from "./_generated/api.js";
import { internalAction, internalMutation } from "./_generated/server.js";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { createAuth } from "./betterAuth/auth.js";
import fixture from "./seed-data/ecu-demo-seed.json";
import { demoStudentProfile, seedPortalServices } from "./lib/demoPortalSeed.js";
import { logAction } from "./audit_logger.js";
import { ConvexError } from "convex/values";

const stamp = () => Date.now();

export const seedDemoData = internalAction({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);
    const userIds: Record<string, string> = {};
    const accounts = [...fixture.staffAccounts, ...fixture.studentAccounts];

    for (const account of accounts) {
      const existing = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", value: account.email, operator: "eq" }],
      });
      if (existing?._id) {
        userIds[account.email] = existing._id;
        await ctx.runMutation(components.betterAuth.adapter.updateOne, { input: {
          model: "user", where: [{ field: "_id", value: existing._id, operator: "eq" }],
          update: { name: account.name },
        } });
        continue;
      }

      const createUser = (auth.api as unknown as {
        createUser: (input: { body: { email: string; password: string; name: string; role: "admin" | "user"; data: { emailVerified: boolean } } }) => Promise<{ user?: { id?: string } }>;
      }).createUser;
      const created = await createUser({
        body: {
          email: account.email,
          password: account.password,
          name: account.name,
          role: account.authRole as "admin" | "user",
          data: { emailVerified: true },
        },
      });
      const userId = created.user?.id;
      if (!userId) throw new ConvexError("The demo account could not be created. Please try the seed again.");
      userIds[account.email] = userId;
    }

    const insert = makeFunctionReference<"mutation", { userIds: Record<string, string> }, { inserted: number; students: number; staff: number; courseUnits: number; authAccounts: number }>("demoSeed:insertDemoData");
    return await ctx.runMutation(insert, { userIds });
  },
});

export const insertDemoData = internalMutation({
  args: { userIds: v.record(v.string(), v.string()) },
  handler: async (ctx, { userIds }) => {
    const now = stamp();
    const facultyIds: Record<string, import("./_generated/dataModel.js").Id<"faculties">> = {};
    const departmentIds: Record<string, import("./_generated/dataModel.js").Id<"departments">> = {};
    const programIds: Record<string, import("./_generated/dataModel.js").Id<"programs">> = {};
    const courseIds: Record<string, import("./_generated/dataModel.js").Id<"courses">> = {};
    const periodIds: Record<string, import("./_generated/dataModel.js").Id<"academicPeriods">> = {};
    const studentIds: Record<string, import("./_generated/dataModel.js").Id<"students">> = {};
    const staffIds: Record<string, string> = {};
    let inserted = 0;

    for (const period of fixture.academicPeriods) {
      const current = await ctx.db.query("academicPeriods").withIndex("by_term_year", (q) => q.eq("term", period.term).eq("year", period.year)).first();
      periodIds[period.key] = current?._id ?? await ctx.db.insert("academicPeriods", { name: period.name, term: period.term, year: period.year, startDate: period.startDate, endDate: period.endDate, status: period.status as "active" | "completed" | "upcoming", createdAt: now, updatedAt: now });
      if (!current) inserted++;
    }

    for (const faculty of fixture.faculties) {
      const current = await ctx.db.query("faculties").withIndex("by_code", (q) => q.eq("code", faculty.code)).first();
      facultyIds[faculty.key] = current?._id ?? await ctx.db.insert("faculties", { name: faculty.name, code: faculty.code, description: "Demo seed based on the public faculty catalog.", status: "active", createdAt: now, updatedAt: now });
      if (!current) inserted++;
      for (const department of faculty.departments) {
        const facultyId = facultyIds[faculty.key]!;
        const existingDepartment = await ctx.db.query("departments").withIndex("by_faculty", (q) => q.eq("facultyId", facultyId)).filter((q) => q.eq(q.field("code"), department.code)).first();
        departmentIds[department.key] = existingDepartment?._id ?? await ctx.db.insert("departments", { name: department.name, code: department.code, facultyId, status: "active", createdAt: now, updatedAt: now });
        if (!existingDepartment) inserted++;
      }
      for (const program of faculty.programs) {
        const departmentId = departmentIds[program.departmentKey]!;
        const existingProgram = await ctx.db.query("programs").withIndex("by_department", (q) => q.eq("departmentId", departmentId)).filter((q) => q.eq(q.field("code"), program.code)).first();
        programIds[program.code] = existingProgram?._id ?? await ctx.db.insert("programs", { name: program.name, code: program.code, departmentId, level: program.level as "Certificate" | "Diploma" | "Bachelor" | "Master", durationYears: program.durationYears, status: "active", createdAt: now, updatedAt: now });
        if (!existingProgram) inserted++;
        await ctx.db.patch(programIds[program.code]!, { onSemesterRetakeLimit: program.onSemesterRetakeLimit, offSemesterRetakeLimit: program.offSemesterRetakeLimit, updatedAt: now });
        for (const course of program.courseUnits) {
          const existingCourse = await ctx.db.query("courses").withIndex("by_code", (q) => q.eq("code", course.code)).first();
          courseIds[course.code] = existingCourse?._id ?? await ctx.db.insert("courses", { code: course.code, title: course.title, creditUnits: course.creditUnits, departmentId, programId: programIds[program.code]!, yearOfStudy: course.yearOfStudy, semester: course.semester, status: "active", createdAt: now, updatedAt: now });
          if (!existingCourse) inserted++;
          const category = course.category === "elective" ? "elective" : course.category === "foundation" ? "foundation" : "core";
          await ctx.db.patch(courseIds[course.code]!, { category, shortName: course.shortName, updatedAt: now });
        }
      }
    }

    for (const staff of fixture.staffAccounts) {
      const userId = userIds[staff.email]!;
      staffIds[staff.email] = userId;
      const existing = await ctx.db.query("staffProfiles").withIndex("by_staffId", (q) => q.eq("staffId", staff.staffId)).first();
      if (!existing) {
        await ctx.db.insert("staffProfiles", { userId, staffId: staff.staffId, roles: staff.roles, title: staff.title, departmentId: departmentIds[staff.departmentKey]!, status: "active", createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const student of fixture.studentAccounts) {
      const userId = userIds[student.email]!;
      const existing = await ctx.db.query("students").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
      studentIds[student.registrationNumber] = existing?._id ?? await ctx.db.insert("students", { userId, registrationNumber: student.registrationNumber, programId: programIds[student.programCode]!, yearOfStudy: student.yearOfStudy, currentPeriodId: periodIds[student.currentPeriodKey]!, term: student.term, year: student.year, status: student.status as "active" | "suspended" | "deferred" | "graduating" | "discontinued", financeStatus: student.financeStatus as "cleared" | "partial" | "pending", createdAt: now, updatedAt: now });
      if (!existing) inserted++;
      await ctx.db.patch(studentIds[student.registrationNumber]!, { ...demoStudentProfile(student), registrationNumber: student.registrationNumber, updatedAt: now });
    }

    const existingGrades = await ctx.db.query("gradingScales").collect();
    for (const grade of fixture.gradingScales) {
      if (!existingGrades.some((row) => row.grade === grade.grade)) {
        await ctx.db.insert("gradingScales", { grade: grade.grade, minScore: grade.minScore, maxScore: grade.maxScore, gpaValue: grade.gpaValue, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const allocation of fixture.courseAllocations) {
      const courseId = courseIds[allocation.courseCode]!;
      const periodId = periodIds[allocation.periodKey]!;
      const lecturerId = staffIds[allocation.lecturerEmail]!;
      const existing = await ctx.db.query("courseAllocations").withIndex("by_course_period", (q) => q.eq("courseId", courseId).eq("periodId", periodId)).first();
      if (!existing) {
        await ctx.db.insert("courseAllocations", { courseId, periodId, lecturerId, departmentId: departmentIds[courseDepartmentKey(allocation.courseCode)]!, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const registration of fixture.studentCourseRegistrations) {
      const studentId = studentIds[registration.studentRegistrationNumber]!;
      const courseId = courseIds[registration.courseCode]!;
      const periodId = periodIds[registration.periodKey]!;
      const existing = await ctx.db.query("studentCourseRegistrations").withIndex("by_student_period", (q) => q.eq("studentId", studentId).eq("periodId", periodId)).filter((q) => q.eq(q.field("courseId"), courseId)).first();
      if (!existing) {
        await ctx.db.insert("studentCourseRegistrations", { studentId, courseId, periodId, status: registration.status as "registered" | "dropped" | "completed", createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const mark of fixture.studentAssessments) {
      const studentId = studentIds[mark.studentRegistrationNumber]!;
      const courseId = courseIds[mark.courseCode]!;
      const periodId = periodIds[mark.periodKey]!;
      const existing = await ctx.db.query("studentAssessments").withIndex("by_student_course_period", (q) => q.eq("studentId", studentId).eq("courseId", courseId).eq("periodId", periodId)).first();
      if (!existing) {
        await ctx.db.insert("studentAssessments", { studentId, courseId, periodId, lecturerId: staffIds[mark.lecturerEmail]!, assignmentMarks: mark.assignmentMarks, testMarks: mark.testMarks, courseworkMarks: mark.courseworkMarks, examMarks: mark.examMarks, finalScore: mark.finalScore, grade: mark.grade, gradePoints: mark.gradePoints, status: mark.status as "draft" | "submitted" | "approved" | "returned", createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const meeting of fixture.lectureTimetables) {
      const courseId = courseIds[meeting.courseCode]!;
      const periodId = periodIds[meeting.periodKey]!;
      const existing = await ctx.db.query("timetables").withIndex("by_course_period", (q) => q.eq("courseId", courseId).eq("periodId", periodId)).first();
      if (!existing) {
        await ctx.db.insert("timetables", { courseId, periodId, lecturerId: staffIds[meeting.lecturerEmail]!, dayOfWeek: meeting.dayOfWeek as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday", startTime: meeting.startTime, endTime: meeting.endTime, room: meeting.room, building: meeting.building, capacity: 40, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const exam of fixture.examTimetables) {
      const courseId = courseIds[exam.courseCode]!;
      const periodId = periodIds[exam.periodKey]!;
      const existing = await ctx.db.query("examTimetables").withIndex("by_course_period", (q) => q.eq("courseId", courseId).eq("periodId", periodId)).first();
      if (!existing) {
        await ctx.db.insert("examTimetables", { courseId, periodId, examDate: exam.examDate, startTime: exam.startTime, endTime: exam.endTime, room: exam.room, venue: exam.venue, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const fee of fixture.feeStructures) {
      const programId = programIds[fee.programCode]!;
      const periodId = periodIds[fee.periodKey]!;
      const existing = await ctx.db.query("feeStructures").withIndex("by_program_period", (q) => q.eq("programId", programId).eq("periodId", periodId)).first();
      if (!existing) {
        await ctx.db.insert("feeStructures", { programId, periodId, term: fee.term, year: fee.year, tuitionFee: fee.tuitionFee, registrationFee: fee.registrationFee, libraryFee: fee.libraryFee, ictFee: fee.ictFee, activityFee: fee.activityFee, otherFees: fee.otherFees, currency: fee.currency, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const ledger of fixture.studentLedgers) {
      const studentId = studentIds[ledger.studentRegistrationNumber]!;
      const periodId = periodIds[ledger.periodKey]!;
      const existing = await ctx.db.query("studentLedger").withIndex("by_student_period", (q) => q.eq("studentId", studentId).eq("periodId", periodId)).first();
      if (!existing) {
        await ctx.db.insert("studentLedger", { studentId, periodId, term: ledger.term, year: ledger.year, totalDue: ledger.totalDue, totalPaid: ledger.totalPaid, balance: ledger.balance, status: ledger.status as "cleared" | "partial" | "pending", lastPaymentDate: ledger.lastPaymentDate, lastPaymentAmount: ledger.lastPaymentAmount, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    for (const transaction of fixture.transactions) {
      const existing = await ctx.db.query("transactions").withIndex("by_receiptNumber", (q) => q.eq("receiptNumber", transaction.receiptNumber)).first();
      if (!existing) {
        await ctx.db.insert("transactions", { studentId: studentIds[transaction.studentRegistrationNumber]!, periodId: periodIds[transaction.periodKey]!, term: transaction.term, year: transaction.year, amount: transaction.amount, type: transaction.type as "payment" | "charge" | "waiver", method: transaction.method as "cash" | "bank" | "mobile_money" | "other", channel: transaction.channel as "cash" | "bank_deposit" | "m_gurush" | "equity_bank" | "kcb_bank" | "stanbic_bank" | "other", bankBranch: transaction.bankBranch, slipNumber: transaction.slipNumber, depositDate: transaction.depositDate, receiptNumber: transaction.receiptNumber, date: transaction.date, reference: transaction.reference, notes: transaction.notes, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    inserted += await seedPortalServices(ctx, { studentIds, courseIds, periodIds, staffIds, now });
    await logAction(ctx, { action: "SEED_DEMO_PORTAL", resource: "students", details: "Updated fictional demo profiles, student/access identifiers, and linked portal service fixtures." });
    return { inserted, students: fixture.studentAccounts.length, staff: fixture.staffAccounts.length, courseUnits: Object.keys(courseIds).length, authAccounts: Object.keys(userIds).length };
  },
});

function courseDepartmentKey(courseCode: string): string {
  for (const faculty of fixture.faculties) {
    for (const program of faculty.programs) {
      if (program.courseUnits.some((course) => course.code === courseCode)) return program.departmentKey;
    }
  }
  return "";
}
