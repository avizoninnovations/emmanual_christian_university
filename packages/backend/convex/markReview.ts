import { ConvexError, v } from "convex/values";
import { mutation } from "./lib/mutations.js";
import { assertClassReviewer, entered, requireEnrollment } from "./lib/academicAccess.js";
import { academicEvent } from "./lib/academicAudit.js";
import { approvedSnapshot } from "./lib/academicResults.js";
import { rowVersion } from "./markEntry.js";

export const review = mutation({
  args: { courseId: v.id("courses"), periodId: v.id("academicPeriods"), rows: v.array(rowVersion),
    decision: v.union(v.literal("approve"), v.literal("return"), v.literal("withdraw")), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const access = await assertClassReviewer(ctx, args.courseId, args.periodId);
    if (!args.rows.length || args.rows.length > 100 || new Set(args.rows.map(row => row.studentId)).size !== args.rows.length) throw new ConvexError("Select between 1 and 100 distinct students.");
    if (args.decision !== "approve" && !args.reason?.trim()) throw new ConvexError("Enter a reason for this decision.");
    const records = await Promise.all(args.rows.map(async row => {
      await requireEnrollment(ctx, row.studentId, args.courseId, args.periodId);
      const mark = await ctx.db.query("studentAssessments").withIndex("by_student_course_period", q =>
        q.eq("studentId", row.studentId).eq("courseId", args.courseId).eq("periodId", args.periodId)).unique();
      if (!mark || (mark.revision ?? 0) !== row.revision) throw new ConvexError("A selected result changed. Reload before reviewing it.");
      if (mark.submittedBy === access.userId || mark.lecturerId === access.userId) throw new ConvexError("You cannot review marks you entered or submitted.");
      if (args.decision !== "withdraw" && mark.status !== "submitted") throw new ConvexError("Only submitted marks can be approved or returned.");
      if (args.decision === "approve" && (!entered(mark, "coursework") || !entered(mark, "exam"))) throw new ConvexError("Incomplete marks cannot be published.");
      if (args.decision === "withdraw" && (mark.publicationWithdrawn || (!mark.approvedSnapshot && mark.status !== "approved"))) throw new ConvexError("There is no published result to withdraw.");
      return mark;
    }));
    for (const mark of records) {
      const revision = (mark.revision ?? 0) + 1;
      const status = args.decision === "approve" ? "approved" : args.decision === "return" ? "returned" : mark.status;
      await ctx.db.patch(mark._id, {
        status, revision, updatedAt: Date.now(), isUnlocked: false,
        approvedSnapshot: args.decision === "approve" ? { ...approvedSnapshot(mark, access.userId), revision }
          : mark.approvedSnapshot ?? (mark.status === "approved" ? approvedSnapshot(mark) : undefined),
        publicationWithdrawn: args.decision === "withdraw" ? true : args.decision === "approve" ? false : mark.publicationWithdrawn,
        returnReason: args.decision === "return" ? args.reason?.trim() : mark.returnReason,
      });
      await academicEvent(ctx, { actorId: access.userId, departmentId: access.course.departmentId,
        courseId: args.courseId, periodId: args.periodId, studentId: mark.studentId, revision,
        action: `${args.decision.toUpperCase()}_RESULT`, details: args.reason?.trim() || "Approved and published this student's result.",
        before: { courseworkMarks: mark.courseworkMarks, examMarks: mark.examMarks, status: mark.status },
        after: { courseworkMarks: mark.courseworkMarks, examMarks: mark.examMarks, status } });
    }
    return { count: records.length };
  },
});

// Old unversioned operations cannot bypass the reviewed workflow.
export const approveCourseMarks = mutation({ args: { courseId: v.id("courses"), periodId: v.id("academicPeriods") },
  handler: async () => { throw new ConvexError("Open Marks Review and select the submitted student results to approve."); } });
export const returnCourseMarks = mutation({ args: { courseId: v.id("courses"), periodId: v.id("academicPeriods"), reason: v.string() },
  handler: async () => { throw new ConvexError("Open Marks Review and select the submitted student results to return."); } });
export const grantSingleStudentUnlock = mutation({ args: { assessmentId: v.id("studentAssessments") },
  handler: async () => { throw new ConvexError("Use Edit Permissions and set an expiry for the student's editing access."); } });
