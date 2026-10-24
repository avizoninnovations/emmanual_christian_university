import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { academicActor, assertDepartmentManager, staffName } from "./lib/academicAccess.js";
import { academicEvent } from "./lib/academicAudit.js";

export const allocateLecturerToCourse = mutation({
  args: { courseId: v.id("courses"), lecturerId: v.string(), periodId: v.id("academicPeriods"), reason: v.string() },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course || course.status !== "active") throw new ConvexError("Choose an active course.");
    const actor = await assertDepartmentManager(ctx, course.departmentId);
    const [lecturer, period, existing, submitted] = await Promise.all([
      ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", args.lecturerId)).unique(),
      ctx.db.get(args.periodId),
      ctx.db.query("courseAllocations").withIndex("by_course_period", q => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).unique(),
      ctx.db.query("studentAssessments").withIndex("by_course_period", q => q.eq("courseId", args.courseId).eq("periodId", args.periodId))
        .filter(q => q.eq(q.field("status"), "submitted")).first(),
    ]);
    if (!period || (period.status === "completed" && !actor.isAdmin)) throw new ConvexError("Historical allocations require an administrator.");
    if (!lecturer || lecturer.status !== "active" || !lecturer.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role))) throw new ConvexError("Choose an active lecturer or HOD.");
    if (!actor.isAdmin && lecturer.departmentId !== course.departmentId && actor.department.hodId !== lecturer.userId) throw new ConvexError("The lecturer must belong to your department.");
    if (!args.reason.trim()) throw new ConvexError("Enter an assignment or reassignment reason.");
    if (submitted && existing?.lecturerId !== args.lecturerId) throw new ConvexError("Review or return submitted marks before reassigning this class.");
    const now = Date.now();
    if (lecturer.roles.includes("hod") && !lecturer.roles.some(role => ["lecturer", "senior_lecturer"].includes(role))) {
      await ctx.db.patch(lecturer._id, { roles: [...lecturer.roles, "lecturer"], updatedAt: now });
    }
    if (existing?.lecturerId === args.lecturerId) return existing._id;
    const values = { lecturerId: args.lecturerId, assignedBy: actor.userId,
      revision: (existing?.revision ?? 0) + 1, updatedAt: now };
    let id = existing?._id;
    if (id) await ctx.db.patch(id, values);
    else id = await ctx.db.insert("courseAllocations", { ...values, courseId: args.courseId,
      periodId: args.periodId, departmentId: course.departmentId, createdAt: now });
    await academicEvent(ctx, { actorId: actor.userId, departmentId: course.departmentId, courseId: args.courseId,
      periodId: args.periodId, action: "ALLOCATE_COURSE", details: `${course.code}: ${existing?.lecturerId ?? "unassigned"} → ${args.lecturerId}. ${args.reason.trim()}` });
    return id;
  },
});

export const deallocateLecturer = mutation({
  args: { allocationId: v.id("courseAllocations"), reason: v.string() },
  handler: async (ctx, args) => {
    const allocation = await ctx.db.get(args.allocationId);
    if (!allocation) throw new ConvexError("Allocation not found.");
    const actor = await assertDepartmentManager(ctx, allocation.departmentId);
    if (!args.reason.trim()) throw new ConvexError("Enter a reason for removing the assignment.");
    const period = await ctx.db.get(allocation.periodId);
    if (period?.status === "completed") throw new ConvexError("Historical teaching assignments must be retained.");
    const mark = await ctx.db.query("studentAssessments").withIndex("by_course_period", q => q.eq("courseId", allocation.courseId).eq("periodId", allocation.periodId)).first();
    if (mark) throw new ConvexError("Marks exist for this class. Reassign the lecturer to preserve the teaching record.");
    await ctx.db.delete(allocation._id);
    await academicEvent(ctx, { actorId: actor.userId, departmentId: allocation.departmentId,
      courseId: allocation.courseId, periodId: allocation.periodId, action: "REMOVE_ALLOCATION", details: args.reason.trim() });
  },
});

/** Bounded picker retained for teaching-cover requests; HOD lists use pagination. */
export const getDepartmentLecturers = query({
  args: { departmentId: v.optional(v.id("departments")) },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    const departmentId = args.departmentId ?? (actor.profile.departmentId ? ctx.db.normalizeId("departments", actor.profile.departmentId) : null);
    if (!departmentId) return [];
    if (departmentId !== actor.profile.departmentId) await assertDepartmentManager(ctx, departmentId);
    const profiles = await ctx.db.query("staffProfiles").withIndex("by_departmentId", q => q.eq("departmentId", departmentId))
      .filter(q => q.eq(q.field("status"), "active")).take(100);
    return Promise.all(profiles.filter(profile => profile.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role)))
      .map(async profile => ({ ...profile, ...await staffName(ctx, profile.userId) })));
  },
});
