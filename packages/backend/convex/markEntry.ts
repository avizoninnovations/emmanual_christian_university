import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server.js";
import { classContext, entered, requireEnrollment } from "./lib/academicAccess.js";
import { permissionActive, permissionForStudent } from "./lib/markPermissionAccess.js";
import { approvedSnapshot, calculateGrade } from "./lib/academicResults.js";
import { academicEvent } from "./lib/academicAudit.js";

export const rowVersion = v.object({ studentId: v.id("students"), revision: v.number() });
const score = v.union(v.number(), v.null());

export const saveGradebookDraft = mutation({
  args: { courseId: v.id("courses"), periodId: v.id("academicPeriods"), marks: v.array(v.object({
    studentId: v.id("students"), revision: v.number(), courseworkMarks: score, examMarks: score,
  })) },
  handler: async (ctx, args) => {
    const access = await classContext(ctx, args.courseId, args.periodId);
    if (!access.isLecturer) throw new ConvexError("Only the allocated lecturer can enter marks.");
    if (access.period.status === "upcoming") throw new ConvexError("Marks entry is not open for this semester.");
    if (!args.marks.length || args.marks.length > 100 || new Set(args.marks.map(row => row.studentId)).size !== args.marks.length) throw new ConvexError("Save between 1 and 100 distinct students at a time.");
    const now = Date.now();
    const rows = await Promise.all(args.marks.map(async item => {
      await requireEnrollment(ctx, item.studentId, args.courseId, args.periodId);
      const [existing, grant] = await Promise.all([
        ctx.db.query("studentAssessments").withIndex("by_student_course_period", q => q.eq("studentId", item.studentId).eq("courseId", args.courseId).eq("periodId", args.periodId)).unique(),
        permissionForStudent(ctx, item.studentId, args.courseId, args.periodId),
      ]);
      if ((existing?.revision ?? 0) !== item.revision) throw new ConvexError("Marks changed since you opened this page. Reload before saving.");
      const ordinary = access.period.status === "active" && (!access.book?.entriesCloseAt || now < access.book.entriesCloseAt)
        && (!existing || ["draft", "returned"].includes(existing.status)) && !existing?.editPermissionId;
      const granted = permissionActive(grant, access.userId, now);
      if (!ordinary && !granted) throw new ConvexError("These marks are locked or the editing permission has expired.");
      for (const [field, maximum, previous, hadValue] of [
        ["coursework", 30, existing?.courseworkMarks ?? null, entered(existing, "coursework")],
        ["exam", 70, existing?.examMarks ?? null, entered(existing, "exam")],
      ] as const) {
        const next = field === "coursework" ? item.courseworkMarks : item.examMarks;
        if (next !== null && (!Number.isFinite(next) || next < 0 || next > maximum)) throw new ConvexError(`${field === "coursework" ? "Coursework" : "Examination"} must be between 0 and ${maximum}.`);
        if (!ordinary && next !== (hadValue ? previous : null) && !grant?.components.includes(field)) throw new ConvexError(`Your permission does not allow changes to ${field}.`);
      }
      return { item, existing, grant: ordinary ? null : grant };
    }));
    for (const { item, existing, grant } of rows) {
      const courseworkMarks = item.courseworkMarks ?? 0;
      const examMarks = item.examMarks ?? 0;
      const complete = item.courseworkMarks !== null && item.examMarks !== null;
      const finalScore = Math.round(courseworkMarks + examMarks);
      const values = {
        courseworkMarks, examMarks, finalScore, ...calculateGrade(finalScore),
        courseworkEntered: item.courseworkMarks !== null, examEntered: item.examMarks !== null,
        departmentId: access.course.departmentId, revision: item.revision + 1,
        status: "draft" as const, isUnlocked: false, updatedAt: now,
        editPermissionId: grant?._id ?? existing?.editPermissionId,
        approvedSnapshot: existing?.approvedSnapshot ?? (existing?.status === "approved" ? approvedSnapshot(existing) : undefined),
      };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("studentAssessments", { ...values, studentId: item.studentId, courseId: args.courseId,
        periodId: args.periodId, lecturerId: access.userId, createdAt: now });
      await academicEvent(ctx, { actorId: access.userId, departmentId: access.course.departmentId,
        courseId: args.courseId, periodId: args.periodId, studentId: item.studentId, grantId: grant?._id,
        revision: values.revision, action: "SAVE_MARK_DRAFT", details: complete ? "Saved complete draft marks." : "Saved draft with missing components.",
        before: existing ? { courseworkMarks: existing.courseworkMarks, examMarks: existing.examMarks, status: existing.status } : undefined,
        after: { courseworkMarks, examMarks, status: "draft" } });
    }
    return { count: rows.length, revisions: rows.map(({ item }) => ({ studentId: item.studentId, revision: item.revision + 1 })) };
  },
});

export const submitGradebookToHOD = mutation({
  args: { courseId: v.id("courses"), periodId: v.id("academicPeriods"), rows: v.array(rowVersion) },
  handler: async (ctx, args) => {
    const access = await classContext(ctx, args.courseId, args.periodId);
    if (!access.isLecturer) throw new ConvexError("Only the allocated lecturer can submit this class.");
    if (access.period.status === "upcoming") throw new ConvexError("Marks entry is not open for this semester.");
    if (!args.rows.length || args.rows.length > 100 || new Set(args.rows.map(row => row.studentId)).size !== args.rows.length) throw new ConvexError("Select between 1 and 100 distinct students.");
    const now = Date.now();
    for (const row of args.rows) {
      await requireEnrollment(ctx, row.studentId, args.courseId, args.periodId);
      const mark = await ctx.db.query("studentAssessments").withIndex("by_student_course_period", q => q.eq("studentId", row.studentId).eq("courseId", args.courseId).eq("periodId", args.periodId)).unique();
      if (!mark || (mark.revision ?? 0) !== row.revision || !["draft", "returned"].includes(mark.status)) throw new ConvexError("A selected draft changed. Reload before submitting.");
      if (!entered(mark, "coursework") || !entered(mark, "exam")) throw new ConvexError("Complete both components before submitting a student. Zero is a valid mark.");
      const ordinary = access.period.status === "active" && !mark.editPermissionId && (!access.book?.entriesCloseAt || now < access.book.entriesCloseAt);
      const grant = await permissionForStudent(ctx, row.studentId, args.courseId, args.periodId);
      if (!ordinary && !permissionActive(grant, access.userId, now)) throw new ConvexError("The submission window or editing permission has expired.");
      await ctx.db.patch(mark._id, { departmentId: access.course.departmentId, status: "submitted", submittedBy: access.userId, submittedAt: now,
        revision: row.revision + 1, returnReason: undefined, updatedAt: now });
      if (grant) await ctx.db.patch(grant._id, { status: "submitted", updatedAt: now });
      await academicEvent(ctx, { actorId: access.userId, departmentId: access.course.departmentId,
        courseId: args.courseId, periodId: args.periodId, studentId: row.studentId,
        revision: row.revision + 1, grantId: grant?._id, action: "SUBMIT_MARKS", details: "Submitted this student's marks for HOD review." });
    }
    return { count: args.rows.length };
  },
});
