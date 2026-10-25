import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { classContext, entered } from "./lib/academicAccess.js";
import { permissionForStudent } from "./lib/markPermissionAccess.js";

export const getCourseGradebook = query({
  args: { courseId: v.id("courses"), periodId: v.optional(v.id("academicPeriods")),
    cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const periodId = args.periodId ?? (await ctx.db.query("academicPeriods")
      .withIndex("by_status", q => q.eq("status", "active")).first())?._id;
    if (!periodId) throw new ConvexError("Select an academic period to open this class.");
    const access = await classContext(ctx, args.courseId, periodId);
    const page = await ctx.db.query("studentCourseRegistrations")
      .withIndex("by_course_period", q => q.eq("courseId", args.courseId).eq("periodId", periodId))
      .filter(q => q.or(q.eq(q.field("status"), "registered"), q.eq(q.field("status"), "completed")))
      .paginate({ cursor: args.cursor ?? null, numItems: 50 });
    const uniqueIds = [...new Set(page.page.map(row => row.studentId))];
    const students = await Promise.all(uniqueIds.map(async studentId => {
      const [student, mark, permission] = await Promise.all([
        ctx.db.get(studentId),
        ctx.db.query("studentAssessments").withIndex("by_student_course_period", q =>
          q.eq("studentId", studentId).eq("courseId", args.courseId).eq("periodId", periodId)).unique(),
        permissionForStudent(ctx, studentId, args.courseId, periodId),
      ]);
      const hasCoursework = entered(mark, "coursework");
      const hasExam = entered(mark, "exam");
      return {
        studentId, studentName: [student?.firstName, student?.otherName, student?.surname].filter(Boolean).join(" ") || student?.registrationNumber || "Student",
        studentAccessNumber: student?.accessNumber ?? "—", studentRegNumber: student?.registrationNumber ?? "—",
        courseworkMarks: mark?.courseworkMarks ?? 0, examMarks: mark?.examMarks ?? 0,
        courseworkEntered: hasCoursework, examEntered: hasExam, finalScore: mark?.finalScore ?? 0,
        grade: mark?.grade ?? "", gradePoints: mark?.gradePoints ?? 0,
        status: mark?.status ?? "draft", returnReason: mark?.returnReason, revision: mark?.revision ?? 0,
        assessmentId: mark?._id, permission, requiresPermission: !!mark?.editPermissionId,
        isUnlocked: false, isSupplementary: mark?.isSupplementary ?? false,
        supplementaryScore: mark?.supplementaryScore, originalScore: mark?.originalScore, originalGrade: mark?.originalGrade,
        approvedSnapshot: mark?.approvedSnapshot,
        publicationWithdrawn: mark?.publicationWithdrawn ?? false,
      };
    }));
    const overallStatus = students.length && students.every(row => row.status === "approved") ? "approved"
      : students.some(row => row.status === "submitted") ? "submitted"
      : students.some(row => row.status === "returned") ? "returned" : "draft";
    return {
      course: access.course, period: access.period, students, overallStatus,
      returnReason: students.find(row => row.returnReason)?.returnReason,
      isLecturer: access.isLecturer, isManager: access.isManager,
      canReview: access.isReviewer && access.allocation?.lecturerId !== access.userId,
      entriesCloseAt: access.book?.entriesCloseAt, isDone: page.isDone, continueCursor: page.continueCursor,
      reviewerId: access.book?.reviewerId,
    };
  },
});
