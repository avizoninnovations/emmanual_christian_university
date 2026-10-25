import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import type { QueryCtx, MutationCtx } from "./_generated/server.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import { publishedAssessment } from "./lib/academicResults.js";
import { assertAuthenticated, assertRole } from "./lib/utils.js";
import { logAction } from "./audit_logger.js";

type DatabaseContext = QueryCtx | MutationCtx;
type FailedAttempt = { courseId: Id<"courses">; grade: string; periodId: Id<"academicPeriods">; periodName: string; periodYear: number; periodTerm: number };

async function getStudent(ctx: DatabaseContext, userId: string) {
  return ctx.db.query("students").withIndex("by_userId", q => q.eq("userId", userId)).unique();
}

async function getTargetPeriod(ctx: DatabaseContext, student: Doc<"students">) {
  const periods = await Promise.all([
    ctx.db.query("academicPeriods").withIndex("by_status", q => q.eq("status", "active")).take(20),
    ctx.db.query("academicPeriods").withIndex("by_status", q => q.eq("status", "upcoming")).take(100),
  ]);
  const [activePeriods, upcomingPeriods] = periods;
  const preferred = student.currentPeriodId ? await ctx.db.get(student.currentPeriodId) : null;
  if (preferred?.status === "active") return preferred;
  return activePeriods.sort((a, b) => b.year - a.year || b.term - a.term)[0]
    ?? upcomingPeriods.sort((a, b) => a.year - b.year || a.term - b.term)[0]
    ?? null;
}

async function getLatestFailedAttempts(ctx: DatabaseContext, studentId: Id<"students">) {
  const records = await ctx.db.query("studentAssessments")
    .withIndex("by_student", q => q.eq("studentId", studentId)).order("desc").take(501);
  const periodIds = [...new Set(records.slice(0, 500).map(record => record.periodId))];
  const periods = await Promise.all(periodIds.map(id => ctx.db.get(id)));
  const periodMap = new Map(periodIds.map((id, index) => [id, periods[index] ?? null]));
  const latest = new Map<Id<"courses">, { assessment: Doc<"studentAssessments">; period: Doc<"academicPeriods"> }>();

  for (const record of records.slice(0, 500)) {
    const assessment = publishedAssessment(record);
    const period = periodMap.get(record.periodId);
    if (!assessment || !period || period.status !== "completed") continue;
    const existing = latest.get(record.courseId);
    const periodOrder = period.year * 10 + period.term;
    const existingOrder = existing ? existing.period.year * 10 + existing.period.term : -1;
    if (!existing || periodOrder > existingOrder || (periodOrder === existingOrder && record._creationTime > existing.assessment._creationTime)) {
      latest.set(record.courseId, { assessment, period });
    }
  }

  const failed: FailedAttempt[] = [];
  for (const [courseId, attempt] of latest) {
    if ((attempt.assessment.grade === "D" || attempt.assessment.grade === "F") && !attempt.assessment.resultCode) {
      failed.push({ courseId, grade: attempt.assessment.grade, periodId: attempt.period._id,
        periodName: attempt.period.name, periodYear: attempt.period.year, periodTerm: attempt.period.term });
    }
  }
  return { attempts: failed, historyCapped: records.length > 500 };
}

export const myRetakeOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) return { period: null, courses: [], registrations: [], limits: { onSemester: 2, offSemester: 1 }, usage: { onSemester: 0, offSemester: 0 }, historyCapped: false };

    const [period, program, failed, registrationRecords] = await Promise.all([
      getTargetPeriod(ctx, student),
      ctx.db.get(student.programId),
      getLatestFailedAttempts(ctx, student._id),
      ctx.db.query("studentCourseRegistrations").withIndex("by_student", q => q.eq("studentId", student._id)).order("desc").take(501),
    ]);
    const retakeRegistrations = registrationRecords.slice(0, 500).filter(registration => registration.registrationKind === "retake");
    const targetRegistrations = period
      ? registrationRecords.filter(registration => registration.periodId === period._id && registration.status !== "dropped")
      : [];
    const activeTargetRetakes = targetRegistrations.filter(registration => registration.registrationKind === "retake");
    const candidateCourses = await Promise.all(failed.attempts.map(async attempt => {
      const course = await ctx.db.get(attempt.courseId);
      if (!course || course.status !== "active" || targetRegistrations.some(registration => registration.courseId === course._id)) return null;
      return { id: course._id, code: course.code, title: course.title, creditUnits: course.creditUnits,
        grade: attempt.grade, failedPeriodId: attempt.periodId, failedPeriodName: `${attempt.periodName} ${attempt.periodYear}`,
        failedPeriodYear: attempt.periodYear, failedPeriodTerm: attempt.periodTerm,
        mode: period ? course.semester === period.term ? "on_semester" as const : "off_semester" as const : null };
    }));
    const courseIds = [...new Set(retakeRegistrations.map(registration => registration.courseId))];
    const periodIds = [...new Set(retakeRegistrations.map(registration => registration.periodId))];
    const [courseDocuments, periodDocuments] = await Promise.all([
      Promise.all(courseIds.map(id => ctx.db.get(id))),
      Promise.all(periodIds.map(id => ctx.db.get(id))),
    ]);
    const courseMap = new Map(courseIds.map((id, index) => [id, courseDocuments[index] ?? null]));
    const periodMap = new Map(periodIds.map((id, index) => [id, periodDocuments[index] ?? null]));
    const sourcePeriodIds = [...new Set(retakeRegistrations.flatMap(registration => registration.retakeSourcePeriodId ? [registration.retakeSourcePeriodId] : []))];
    const sourcePeriods = await Promise.all(sourcePeriodIds.map(id => ctx.db.get(id)));
    const sourcePeriodMap = new Map(sourcePeriodIds.map((id, index) => [id, sourcePeriods[index] ?? null]));
    const registrations = retakeRegistrations.map(registration => ({ ...registration,
      courseCode: courseMap.get(registration.courseId)?.code ?? "—",
      courseTitle: courseMap.get(registration.courseId)?.title ?? "Course unavailable",
      periodName: periodMap.get(registration.periodId) ? `${periodMap.get(registration.periodId)!.name} ${periodMap.get(registration.periodId)!.year}` : "Academic Period unavailable",
      failedPeriodName: registration.retakeSourcePeriodId && sourcePeriodMap.get(registration.retakeSourcePeriodId)
        ? `${sourcePeriodMap.get(registration.retakeSourcePeriodId)!.name} ${sourcePeriodMap.get(registration.retakeSourcePeriodId)!.year}` : "—",
    }));
    const onSemester = activeTargetRetakes.filter(registration => registration.retakeMode === "on_semester").length;
    const offSemester = activeTargetRetakes.filter(registration => registration.retakeMode === "off_semester").length;

    return {
      period: period ? { id: period._id, name: period.name, term: period.term, year: period.year, status: period.status } : null,
      courses: candidateCourses.filter(course => course !== null), registrations,
      limits: { onSemester: program?.onSemesterRetakeLimit ?? 2, offSemester: program?.offSemesterRetakeLimit ?? 1 },
      usage: { onSemester, offSemester }, historyCapped: failed.historyCapped || registrationRecords.length > 500,
    };
  },
});

export const register = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const period = await getTargetPeriod(ctx, student);
    if (!period) throw new ConvexError("Retake registration is not open because there is no active or upcoming Academic Period.");
    if (period.status === "completed") throw new ConvexError("Retakes cannot be registered into a completed Academic Period.");

    const [course, program, failed, registrations] = await Promise.all([
      ctx.db.get(args.courseId),
      ctx.db.get(student.programId),
      getLatestFailedAttempts(ctx, student._id),
      ctx.db.query("studentCourseRegistrations").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", period._id)).take(301),
    ]);
    if (!course || course.status !== "active") throw new ConvexError("This course unit is no longer available for retake registration.");
    const sourceAttempt = failed.attempts.find(attempt => attempt.courseId === args.courseId);
    if (!sourceAttempt) throw new ConvexError("A retake is available only after a published failing result in a completed semester.");
    const existing = registrations.find(registration => registration.courseId === args.courseId);
    if (existing && (existing.status !== "dropped" || existing.registrationKind !== "retake")) {
      throw new ConvexError("This course unit already has a registration for the selected Academic Period.");
    }

    const retakeMode = course.semester === period.term ? "on_semester" : "off_semester";
    const limit = retakeMode === "on_semester" ? program?.onSemesterRetakeLimit ?? 2 : program?.offSemesterRetakeLimit ?? 1;
    const used = registrations.filter(registration => registration.registrationKind === "retake" && registration.retakeMode === retakeMode && registration.status !== "dropped").length;
    if (used >= limit) throw new ConvexError(`Your program allows up to ${limit} ${retakeMode === "on_semester" ? "on-semester" : "off-semester"} retake${limit === 1 ? "" : "s"}.`);

    const status = retakeMode === "on_semester" ? "registered" : "pending_approval";
    const registrationId = existing
      ? existing._id
      : await ctx.db.insert("studentCourseRegistrations", {
        studentId: student._id, courseId: args.courseId, periodId: period._id, status,
        registrationKind: "retake", retakeMode, retakeSourcePeriodId: sourceAttempt.periodId, retakeSourceGrade: sourceAttempt.grade,
      });
    if (existing) await ctx.db.patch(existing._id, {
      status, retakeMode, retakeDecision: undefined, retakeDecisionNote: undefined,
      retakeReviewedBy: undefined, retakeReviewedAt: undefined, retakeApprovedBy: undefined, retakeApprovedAt: undefined,
      retakeSourcePeriodId: sourceAttempt.periodId, retakeSourceGrade: sourceAttempt.grade,
    });
    await logAction(ctx, { action: "REGISTER_RETAKE", resource: "studentCourseRegistrations",
      details: `${student.registrationNumber} registered a ${retakeMode} retake for ${course.code} in ${period.name} ${period.year}.` });
    return { registrationId, status, retakeMode, periodName: `${period.name} ${period.year}` };
  },
});

export const pendingReviews = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await assertRole(ctx, ["admin", "hod", "registrar"]);
    const isGlobalReviewer = actor.profile.roles.some((role: string) => role === "admin" || role === "registrar");
    if (!isGlobalReviewer && !actor.profile.roles.includes("hod")) throw new ConvexError("Only an HOD, Registrar, or administrator can review off-semester retakes.");
    const departmentIds = isGlobalReviewer ? null : new Set((await ctx.db.query("departments")
      .withIndex("by_hodId", q => q.eq("hodId", actor.userId)).take(200))
      .filter(department => department.status === "active").map(department => department._id));
    const page = await ctx.db.query("studentCourseRegistrations")
      .withIndex("by_status_and_registrationKind", q => q.eq("status", "pending_approval").eq("registrationKind", "retake"))
      .order("desc").paginate(args.paginationOpts);
    const enriched = await Promise.all(page.page.map(async registration => {
      const [student, course, period, failedPeriod] = await Promise.all([
        ctx.db.get(registration.studentId), ctx.db.get(registration.courseId), ctx.db.get(registration.periodId),
        registration.retakeSourcePeriodId ? ctx.db.get(registration.retakeSourcePeriodId) : Promise.resolve(null),
      ]);
      if (!course || (!isGlobalReviewer && !departmentIds?.has(course.departmentId))) return null;
      return { ...registration,
        studentName: student ? [student.firstName, student.otherName, student.surname].filter(Boolean).join(" ") : "Student unavailable",
        registrationNumber: student?.registrationNumber ?? "—", courseCode: course.code, courseTitle: course.title,
        departmentId: course.departmentId, periodName: period ? `${period.name} ${period.year}` : "Academic Period unavailable",
        failedPeriodName: failedPeriod ? `${failedPeriod.name} ${failedPeriod.year}` : "—",
        previousGrade: registration.retakeSourceGrade ?? "—",
      };
    }));
    return { ...page, page: enriched.filter(item => item !== null) };
  },
});

export const review = mutation({
  args: { registrationId: v.id("studentCourseRegistrations"), decision: v.union(v.literal("approve"), v.literal("decline")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await assertRole(ctx, ["admin", "hod", "registrar"]);
    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.registrationKind !== "retake" || registration.retakeMode !== "off_semester" || registration.status !== "pending_approval") {
      throw new ConvexError("This off-semester retake request is no longer awaiting review.");
    }
    const course = await ctx.db.get(registration.courseId);
    if (!course) throw new ConvexError("The course unit for this retake could not be found.");
    const isGlobalReviewer = actor.profile.roles.some((role: string) => role === "admin" || role === "registrar");
    if (!isGlobalReviewer) {
      const department = await ctx.db.query("departments").withIndex("by_hodId", q => q.eq("hodId", actor.userId)).filter(q => q.eq(q.field("_id"), course.departmentId)).first();
      if (!department || department.status !== "active") throw new ConvexError("You can review retakes only for an active department you lead.");
    }
    const note = args.note?.trim();
    if (args.decision === "decline" && (!note || note.length < 5)) throw new ConvexError("Add a short reason before declining this retake request.");
    const now = Date.now();
    const approved = args.decision === "approve";
    await ctx.db.patch(registration._id, {
      status: approved ? "registered" : "dropped", retakeDecision: approved ? "approved" : "rejected",
      retakeDecisionNote: note, retakeReviewedBy: actor.userId, retakeReviewedAt: now,
      retakeApprovedBy: approved ? actor.userId : undefined, retakeApprovedAt: approved ? now : undefined,
    });
    await logAction(ctx, { action: approved ? "APPROVE_OFF_SEMESTER_RETAKE" : "REJECT_OFF_SEMESTER_RETAKE",
      resource: "studentCourseRegistrations", details: `${course.code} off-semester retake ${args.decision} by ${actor.userId}${note ? `: ${note}` : ""}.` });
    return { status: approved ? "registered" : "dropped", decision: args.decision };
  },
});
