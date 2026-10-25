import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import type { Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import { academicActor, assertDepartmentManager, staffName } from "./lib/academicAccess.js";
import { enrichAggregationRequests, getCurrentStudent, requestIsActive, requireActivePeriod } from "./lib/courseUnitAggregationAccess.js";
import { academicEvent } from "./lib/academicAudit.js";
import { assertAuthenticated } from "./lib/utils.js";

const requestStatus = v.union(v.literal("pending_lecturer"), v.literal("pending_hod"), v.literal("approved"), v.literal("rejected"), v.literal("withdrawn"));

export const availableCourses = query({
  args: {},
  handler: async ctx => {
    const userId = await assertAuthenticated(ctx);
    const student = await getCurrentStudent(ctx, userId);
    const period = await ctx.db.query("academicPeriods").withIndex("by_status", q => q.eq("status", "active")).first();
    if (!period) return { period: null, student: { programId: student.programId, yearOfStudy: student.yearOfStudy }, courses: [], registrationLoadCapped: false };
    const [registrations, requests] = await Promise.all([
      ctx.db.query("studentCourseRegistrations").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", period._id)).take(101),
      ctx.db.query("studentCourseUnitAggregations").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", period._id)).take(501),
    ]);
    const enrolledCourseIds = [...new Set(registrations.filter(row => row.status === "registered").map(row => row.courseId))];
    const allocations = await Promise.all(enrolledCourseIds.map(courseId => ctx.db.query("courseAllocations")
      .withIndex("by_course_period", q => q.eq("courseId", courseId).eq("periodId", period._id)).unique()));
    const allocationMap = new Map(allocations.flatMap(allocation => allocation ? [[String(allocation.courseId), allocation] as const] : []));
    const courses = await Promise.all(enrolledCourseIds.map(async id => [id, await ctx.db.get(id)] as const));
    const assignedLecturerIds = enrolledCourseIds.flatMap(id => {
      const allocation = allocationMap.get(String(id));
      return allocation ? [allocation.lecturerId] : [];
    });
    const lecturers = await Promise.all([...new Set(assignedLecturerIds)].map(async id => [id, await staffName(ctx, id)] as const));
    const courseMap = new Map(courses);
    const lecturerMap = new Map(lecturers);
    const departmentIds = [...new Set(courses.flatMap(([, course]) => course ? [course.departmentId] : []))];
    const programIds = [...new Set(courses.flatMap(([, course]) => course ? [course.programId] : []))];
    const [departments, programs] = await Promise.all([
      Promise.all(departmentIds.map(async id => [id, await ctx.db.get(id)] as const)),
      Promise.all(programIds.map(async id => [id, await ctx.db.get(id)] as const)),
    ]);
    const departmentMap = new Map(departments);
    const programMap = new Map(programs);
    const requestMap = new Map(requests.map(request => [String(request.courseId), request]));
    const options = enrolledCourseIds.flatMap(courseId => {
      const course = courseMap.get(courseId);
      const allocation = allocationMap.get(String(courseId));
      if (!course) return [];
      const existing = requestMap.get(String(course._id));
      return [{
        courseId: course._id, allocationId: allocation?._id, code: course.code, title: course.title,
        creditUnits: course.creditUnits, programId: course.programId, yearOfStudy: course.yearOfStudy,
        semester: course.semester, departmentName: departmentMap.get(course.departmentId)?.name ?? "—",
        programName: programMap.get(course.programId)?.name ?? "—",
        lecturerName: allocation ? lecturerMap.get(allocation.lecturerId)?.name ?? "Staff member" : "No lecturer assigned",
        requestStatus: existing?.status,
        canRequest: course.status === "active" && departmentMap.get(course.departmentId)?.status === "active" && !!allocation,
        periodId: period._id, periodName: `${period.name} ${period.year}`,
      }];
    });
    const registrationLoadCapped = registrations.length > 100;
    return { period, student: { programId: student.programId, yearOfStudy: student.yearOfStudy }, courses: registrationLoadCapped ? [] : options,
      registrationLoadCapped };
  },
});

export const myRequests = query({
  args: { periodId: v.id("academicPeriods"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getCurrentStudent(ctx, userId);
    const period = await ctx.db.get(args.periodId);
    if (!period || period.status !== "active") throw new ConvexError("Choose the active Academic Period to view aggregation requests.");
    const page = await ctx.db.query("studentCourseUnitAggregations").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", period._id))
      .order("desc").paginate(args.paginationOpts);
    return { ...page, page: await enrichAggregationRequests(ctx, page.page) };
  },
});

export const submitRequest = mutation({
  args: { courseId: v.id("courses"), reason: v.string() },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getCurrentStudent(ctx, userId);
    const period = await requireActivePeriod(ctx);
    const reason = args.reason.trim();
    if (reason.length < 10 || reason.length > 1000) throw new ConvexError("Explain your request in 10 to 1,000 characters.");
    const [course, allocation, registrations, existing] = await Promise.all([
      ctx.db.get(args.courseId),
      ctx.db.query("courseAllocations").withIndex("by_course_period", q => q.eq("courseId", args.courseId).eq("periodId", period._id)).unique(),
      ctx.db.query("studentCourseRegistrations").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", period._id)).take(101),
      ctx.db.query("studentCourseUnitAggregations").withIndex("by_student_course_period", q => q.eq("studentId", student._id).eq("courseId", args.courseId).eq("periodId", period._id)).unique(),
    ]);
    const department = course ? await ctx.db.get(course.departmentId) : null;
    if (!course || course.status !== "active" || !allocation || !department || department.status !== "active") throw new ConvexError("This course unit is not available for a missed-paper request in the active semester.");
    if (registrations.length > 100) throw new ConvexError("Your current registration list is too large to verify safely. Contact the Registrar before requesting an aggregated unit.");
    const registration = registrations.find(row => row.courseId === course._id && row.status === "registered");
    if (!registration) throw new ConvexError("You can request a missed paper only for a course unit you are enrolled in this semester.");
    if (existing && requestIsActive(existing.status)) throw new ConvexError("You already have an active request for this course unit.");
    const now = Date.now();
    const requestFields = {
      studentId: student._id, courseId: course._id, periodId: period._id, departmentId: course.departmentId,
      lecturerId: allocation.lecturerId, allocationId: allocation._id, allocationRevision: allocation.revision ?? 0,
      reason, requestedAt: now, status: "pending_lecturer" as const, lecturerDecision: undefined,
      lecturerDecisionNote: undefined, lecturerDecidedBy: undefined, lecturerDecidedAt: undefined,
      hodDecisionNote: undefined, hodDecidedBy: undefined, hodDecidedAt: undefined,
      withdrawnAt: undefined, registrationId: registration._id, updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, requestFields);
    else await ctx.db.insert("studentCourseUnitAggregations", { ...requestFields, createdAt: now });
    await academicEvent(ctx, { actorId: userId, departmentId: course.departmentId, courseId: course._id, periodId: period._id,
      studentId: student._id, action: "AGGREGATED_UNIT_REQUESTED", details: `${student.registrationNumber} requested ${course.code} (${course.title}) for ${period.name} ${period.year}.` });
    return { status: "pending_lecturer" as const };
  },
});

export const withdrawRequest = mutation({
  args: { requestId: v.id("studentCourseUnitAggregations") },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getCurrentStudent(ctx, userId);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.studentId !== student._id) throw new ConvexError("This aggregation request was not found.");
    if (request.status !== "pending_lecturer" && request.status !== "pending_hod") throw new ConvexError("Only a request awaiting a decision can be withdrawn.");
    const withdrawnAt = Date.now();
    await ctx.db.patch(request._id, { status: "withdrawn", withdrawnAt, updatedAt: withdrawnAt });
    await academicEvent(ctx, { actorId: userId, departmentId: request.departmentId, courseId: request.courseId, periodId: request.periodId,
      studentId: student._id, action: "AGGREGATED_UNIT_WITHDRAWN", details: `${student.registrationNumber} withdrew an aggregated course unit request.` });
    return { status: "withdrawn" as const };
  },
});

export const lecturerRequests = query({
  args: { status: requestStatus, paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    if (!actor.profile.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role)) && !actor.isAdmin) {
      throw new ConvexError("A lecturer account is required to review aggregation requests.");
    }
    const page = await ctx.db.query("studentCourseUnitAggregations")
      .withIndex("by_lecturerId_and_status_and_requestedAt", q => q.eq("lecturerId", actor.userId).eq("status", args.status))
      .order("desc").paginate(args.paginationOpts);
    return { ...page, page: await enrichAggregationRequests(ctx, page.page) };
  },
});

export const decideAsLecturer = mutation({
  args: { requestId: v.id("studentCourseUnitAggregations"), decision: v.union(v.literal("approved"), v.literal("rejected")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.lecturerId !== actor.userId || !actor.profile.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role))) {
      throw new ConvexError("This request is not assigned to your lecturer account.");
    }
    if (request.status !== "pending_lecturer") throw new ConvexError("This request has already been reviewed by the lecturer.");
    const note = args.note?.trim();
    if (args.decision === "rejected" && (!note || note.length < 5)) throw new ConvexError("Add a short reason when declining a request.");
    const allocation = await ctx.db.get(request.allocationId);
    const period = await ctx.db.get(request.periodId);
    const lecturerProfile = await ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", actor.userId)).unique();
    if (args.decision === "approved" && period?.status !== "active") throw new ConvexError("This Academic Period has closed. The request can no longer be approved.");
    if (!lecturerProfile || lecturerProfile.status !== "active") throw new ConvexError("An active lecturer account is required to review this request.");
    if (!allocation || allocation.lecturerId !== actor.userId || (allocation.revision ?? 0) !== request.allocationRevision) {
      throw new ConvexError("The teaching assignment changed. Ask the student to submit a new request.");
    }
    const now = Date.now();
    const status = args.decision === "approved" ? "pending_hod" as const : "rejected" as const;
    await ctx.db.patch(request._id, { status, lecturerDecision: args.decision, lecturerDecisionNote: note, lecturerDecidedBy: actor.userId, lecturerDecidedAt: now, updatedAt: now });
    const student = await ctx.db.get(request.studentId);
    const course = await ctx.db.get(request.courseId);
    await academicEvent(ctx, { actorId: actor.userId, departmentId: request.departmentId, courseId: request.courseId, periodId: request.periodId,
      studentId: request.studentId, action: args.decision === "approved" ? "LECTURER_ENDORSED_AGGREGATION" : "LECTURER_DECLINED_AGGREGATION",
      details: `${student?.registrationNumber ?? "Student"} · ${course?.code ?? "Course"}: ${args.decision === "approved" ? "endorsed for HOD decision" : `declined${note ? `: ${note}` : ""}`}.` });
    return { status };
  },
});

export const hodRequests = query({
  args: { departmentId: v.id("departments"), status: requestStatus, paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertDepartmentManager(ctx, args.departmentId);
    const page = await ctx.db.query("studentCourseUnitAggregations")
      .withIndex("by_departmentId_and_status_and_requestedAt", q => q.eq("departmentId", args.departmentId).eq("status", args.status))
      .order("desc").paginate(args.paginationOpts);
    return { ...page, page: await enrichAggregationRequests(ctx, page.page) };
  },
});

export const decideAsHod = mutation({
  args: { requestId: v.id("studentCourseUnitAggregations"), decision: v.union(v.literal("approved"), v.literal("rejected")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await assertDepartmentManagerForRequest(ctx, args.requestId);
    const request = actor.request;
    if (request.status !== "pending_hod") throw new ConvexError("This request is not awaiting an HOD decision.");
    const note = args.note?.trim();
    if (args.decision === "rejected" && (!note || note.length < 5)) throw new ConvexError("Add a short reason when declining a request.");
    const [course, period, allocation, registrations] = await Promise.all([
      ctx.db.get(request.courseId), ctx.db.get(request.periodId), ctx.db.get(request.allocationId),
      ctx.db.query("studentCourseRegistrations").withIndex("by_student_period", q => q.eq("studentId", request.studentId).eq("periodId", request.periodId)).take(101),
    ]);
    if (!course || !period || !allocation || allocation.courseId !== course._id || allocation.periodId !== period._id
      || allocation.lecturerId !== request.lecturerId || (allocation.revision ?? 0) !== request.allocationRevision) {
      throw new ConvexError("Course or lecturer assignment changed. This request can no longer be approved.");
    }
    const registration = registrations.find(row => row.courseId === request.courseId && row.status === "registered");
    if (!registration && args.decision === "approved") throw new ConvexError("The student is no longer enrolled in this course unit for the requested semester.");
    if (args.decision === "approved" && (period.status !== "active" || course.status !== "active")) throw new ConvexError("This Academic Period or course is no longer active, so the missed-paper request cannot be approved.");
    const now = Date.now();
    await ctx.db.patch(request._id, { status: args.decision, hodDecisionNote: note, hodDecidedBy: actor.userId,
      hodDecidedAt: now, registrationId: registration?._id, updatedAt: now });
    const student = await ctx.db.get(request.studentId);
    await academicEvent(ctx, { actorId: actor.userId, departmentId: request.departmentId, courseId: request.courseId, periodId: request.periodId,
      studentId: request.studentId, action: args.decision === "approved" ? "HOD_APPROVED_AGGREGATION" : "HOD_DECLINED_AGGREGATION",
      details: `${student?.registrationNumber ?? "Student"} · ${course.code}: ${args.decision === "approved" ? "missed-paper request approved for the existing enrollment" : `aggregation declined${note ? `: ${note}` : ""}`}.` });
    return { status: args.decision };
  },
});

async function assertDepartmentManagerForRequest(ctx: MutationCtx, requestId: Id<"studentCourseUnitAggregations">) {
  const request = await ctx.db.get(requestId);
  if (!request) throw new ConvexError("Aggregation request not found.");
  const actor = await assertDepartmentManager(ctx, request.departmentId);
  return { ...actor, request };
}
