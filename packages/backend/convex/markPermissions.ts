import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { academicActor, assertDepartmentManager, classContext, requireEnrollment, staffName } from "./lib/academicAccess.js";
import { academicEvent } from "./lib/academicAudit.js";
import { grantStatus, markComponent } from "./lib/academicWorkflowSchema.js";

export const create = mutation({
  args: { courseId: v.id("courses"), periodId: v.id("academicPeriods"), studentId: v.id("students"),
    components: v.array(markComponent), reason: v.string(), startsAt: v.number(), expiresAt: v.number(),
    mode: v.union(v.literal("request"), v.literal("grant")) },
  handler: async (ctx, args) => {
    const access = await classContext(ctx, args.courseId, args.periodId);
    if (!access.allocation) throw new ConvexError("Assign a lecturer before creating an editing permission.");
    if (args.mode === "grant") {
      await assertDepartmentManager(ctx, access.course.departmentId);
      if (access.allocation.lecturerId === access.userId) throw new ConvexError("An independent administrator must grant editing rights for your own class.");
    } else if (!access.isLecturer) throw new ConvexError("Only the allocated lecturer can request editing rights.");
    await requireEnrollment(ctx, args.studentId, args.courseId, args.periodId);
    const now = Date.now();
    if (!args.reason.trim() || args.reason.length > 2000) throw new ConvexError("Enter a reason of up to 2,000 characters.");
    if (!args.components.length || args.components.length > 2 || new Set(args.components).size !== args.components.length) throw new ConvexError("Choose coursework, examination, or both.");
    if (!Number.isFinite(args.startsAt) || !Number.isFinite(args.expiresAt) || args.expiresAt <= Math.max(args.startsAt, now)) throw new ConvexError("Expiry must be after the start time and in the future.");
    const existing = await ctx.db.query("markEditPermissions")
      .withIndex("by_studentId_and_courseId_and_periodId", q => q.eq("studentId", args.studentId).eq("courseId", args.courseId).eq("periodId", args.periodId))
      .filter(q => q.or(q.eq(q.field("status"), "requested"), q.eq(q.field("status"), "granted"))).first();
    if (existing && existing.expiresAt > now) throw new ConvexError("An open permission or request already exists for this student. Review or revoke it first.");
    if (existing) await ctx.db.patch(existing._id, { status: "expired", updatedAt: now });
    const id = await ctx.db.insert("markEditPermissions", {
      courseId: args.courseId, periodId: args.periodId, studentId: args.studentId,
      departmentId: access.course.departmentId, lecturerId: access.allocation.lecturerId,
      allocationId: access.allocation._id, allocationRevision: access.allocation.revision ?? 0,
      components: args.components, reason: args.reason.trim(), startsAt: args.startsAt, expiresAt: args.expiresAt,
      status: args.mode === "grant" ? "granted" : "requested", requestedBy: access.userId,
      grantedBy: args.mode === "grant" ? access.userId : undefined, createdAt: now, updatedAt: now,
    });
    await ctx.scheduler.runAt(args.expiresAt, internal.markPermissions.expire, { id });
    await academicEvent(ctx, { actorId: access.userId, departmentId: access.course.departmentId,
      courseId: args.courseId, periodId: args.periodId, studentId: args.studentId, grantId: id,
      action: args.mode === "grant" ? "GRANT_MARK_EDIT" : "REQUEST_MARK_EDIT", details: args.reason.trim() });
    return id;
  },
});

export const decide = mutation({
  args: { id: v.id("markEditPermissions"), decision: v.union(v.literal("grant"), v.literal("reject"), v.literal("revoke")),
    reason: v.string(), expiresAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const grant = await ctx.db.get(args.id);
    if (!grant) throw new ConvexError("Editing permission not found.");
    const actor = await assertDepartmentManager(ctx, grant.departmentId);
    if (!args.reason.trim()) throw new ConvexError("Enter a reason for your decision.");
    if (grant.lecturerId === actor.userId && args.decision === "grant") throw new ConvexError("You cannot grant yourself editing rights.");
    const now = Date.now();
    if (args.decision === "grant") {
      if (grant.status !== "requested") throw new ConvexError("Only a pending request can be approved.");
      const allocation = await ctx.db.get(grant.allocationId);
      if (!allocation || allocation.lecturerId !== grant.lecturerId || (allocation.revision ?? 0) !== grant.allocationRevision) throw new ConvexError("The teaching allocation changed. Create a new permission.");
      const expiresAt = args.expiresAt ?? grant.expiresAt;
      if (!Number.isFinite(expiresAt) || expiresAt <= Math.max(now, grant.startsAt)) throw new ConvexError("Choose a future expiry.");
      await ctx.db.patch(grant._id, { status: "granted", grantedBy: actor.userId, expiresAt, updatedAt: now });
      await ctx.scheduler.runAt(expiresAt, internal.markPermissions.expire, { id: grant._id });
    } else {
      if (!["requested", "granted"].includes(grant.status)) throw new ConvexError("This permission is already closed.");
      await ctx.db.patch(grant._id, { status: args.decision === "reject" ? "rejected" : "revoked",
        closedBy: actor.userId, closedReason: args.reason.trim(), updatedAt: now });
    }
    await academicEvent(ctx, { actorId: actor.userId, departmentId: grant.departmentId, courseId: grant.courseId,
      periodId: grant.periodId, studentId: grant.studentId, grantId: grant._id,
      action: `${args.decision.toUpperCase()}_MARK_EDIT`, details: args.reason.trim() });
  },
});

export const expire = internalMutation({
  args: { id: v.id("markEditPermissions") },
  handler: async (ctx, args) => {
    const grant = await ctx.db.get(args.id);
    if (!grant || !["requested", "granted"].includes(grant.status) || grant.expiresAt > Date.now()) return;
    await ctx.db.patch(grant._id, { status: "expired", updatedAt: Date.now() });
    await academicEvent(ctx, { actorId: "system", departmentId: grant.departmentId, courseId: grant.courseId,
      periodId: grant.periodId, studentId: grant.studentId, grantId: grant._id, action: "EXPIRE_MARK_EDIT", details: "Editing permission expired." });
  },
});

export const list = query({
  args: { departmentId: v.optional(v.id("departments")), status: grantStatus, paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    if (args.departmentId) await assertDepartmentManager(ctx, args.departmentId);
    const page = args.departmentId
      ? await ctx.db.query("markEditPermissions").withIndex("by_departmentId_and_status", q => q.eq("departmentId", args.departmentId!).eq("status", args.status)).order("desc").paginate(args.paginationOpts)
      : await ctx.db.query("markEditPermissions").withIndex("by_lecturerId_and_status", q => q.eq("lecturerId", actor.userId).eq("status", args.status)).order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async grant => {
      const [student, course, period, lecturer] = await Promise.all([
        ctx.db.get(grant.studentId), ctx.db.get(grant.courseId), ctx.db.get(grant.periodId), staffName(ctx, grant.lecturerId),
      ]);
      return { ...grant, studentName: student ? [student.firstName, student.surname].filter(Boolean).join(" ") || student.registrationNumber : "Student",
        registrationNumber: student?.registrationNumber, courseCode: course?.code, periodName: period ? `${period.name} ${period.year}` : "", lecturerName: lecturer.name };
    })) };
  },
});
