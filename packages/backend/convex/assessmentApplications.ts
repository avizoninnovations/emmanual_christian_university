import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { academicActor } from "./lib/academicAccess.js";
import { academicEvent } from "./lib/academicAudit.js";

const decisionValidator = v.union(v.literal("under_review"), v.literal("approved"), v.literal("rejected"));

export const forAssignedLecturer = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    if (!actor.profile.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role))) {
      throw new ConvexError("An assigned lecturer account is required to review assessment applications.");
    }
    const allocations = await ctx.db.query("courseAllocations")
      .withIndex("by_lecturer", q => q.eq("lecturerId", actor.userId)).take(501);
    const assignedClasses = new Set(allocations.map(allocation => `${allocation.courseId}:${allocation.periodId}`));
    const page = await ctx.db.query("aegrotatApplications").withIndex("by_period").order("desc").paginate(args.paginationOpts);
    const visible = page.page.filter(application => assignedClasses.has(`${application.courseId}:${application.periodId}`));
    const enriched = await Promise.all(visible.map(async application => {
      const [student, course, period, attachmentUrl] = await Promise.all([
        ctx.db.get(application.studentId), ctx.db.get(application.courseId), ctx.db.get(application.periodId),
        application.attachmentId ? ctx.storage.getUrl(application.attachmentId) : null,
      ]);
      return {
        ...application,
        studentName: student ? [student.firstName, student.otherName, student.surname].filter(Boolean).join(" ") : "Student record unavailable",
        registrationNumber: student?.registrationNumber ?? "—",
        courseCode: course?.code ?? "—",
        courseTitle: course?.title ?? "Course record unavailable",
        periodName: period ? `${period.name} ${period.year}` : "Academic Period unavailable",
        departmentId: course?.departmentId,
        attachmentUrl,
      };
    }));
    return { ...page, page: enriched };
  },
});

export const review = mutation({
  args: { applicationId: v.id("aegrotatApplications"), decision: decisionValidator, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    if (!actor.profile.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role))) {
      throw new ConvexError("An assigned lecturer account is required to review assessment applications.");
    }
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError("This assessment application could not be found.");
    const [allocation, course] = await Promise.all([
      ctx.db.query("courseAllocations").withIndex("by_course_period", q => q.eq("courseId", application.courseId).eq("periodId", application.periodId)).unique(),
      ctx.db.get(application.courseId),
    ]);
    if (!allocation || allocation.lecturerId !== actor.userId || !course) {
      throw new ConvexError("This application is not for a course unit assigned to you.");
    }
    if (application.status !== "submitted" && application.status !== "under_review") {
      throw new ConvexError("This assessment application has already been decided.");
    }
    const note = args.note?.trim();
    if (args.decision === "rejected" && (!note || note.length < 5)) {
      throw new ConvexError("Add a short reason when declining an application.");
    }
    const now = Date.now();
    await ctx.db.patch(application._id, {
      status: args.decision,
      reviewedBy: actor.userId,
      reviewedAt: now,
      reviewNote: args.decision === "rejected" ? note : undefined,
      updatedAt: now,
    });
    const action = args.decision === "under_review" ? "ASSESSMENT_APPLICATION_REVIEW_STARTED"
      : args.decision === "approved" ? "ASSESSMENT_APPLICATION_APPROVED" : "ASSESSMENT_APPLICATION_DECLINED";
    await academicEvent(ctx, {
      actorId: actor.userId, departmentId: course.departmentId, courseId: course._id,
      periodId: application.periodId, studentId: application.studentId, action,
      details: `${application.applicationType ?? "Assessment"} application for ${course.code}: ${args.decision}${note ? ` — ${note}` : ""}.`,
    });
    return { status: args.decision };
  },
});
