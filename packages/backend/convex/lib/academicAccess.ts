import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server.js";
import type { Id, Doc } from "../_generated/dataModel.js";
import { components } from "../_generated/api.js";

export type AcademicReadCtx = Pick<QueryCtx, "db" | "auth" | "runQuery">;
export async function academicActor(ctx: AcademicReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in to continue.");
  const profile = await ctx.db.query("staffProfiles")
    .withIndex("by_userId", q => q.eq("userId", identity.subject)).unique();
  if (!profile || profile.status !== "active") throw new ConvexError("An active staff account is required.");
  return { userId: identity.subject, profile, isAdmin: profile.roles.includes("admin") };
}

export async function managedDepartments(ctx: AcademicReadCtx) {
  const actor = await academicActor(ctx);
  const departments = actor.isAdmin
    ? await ctx.db.query("departments").withIndex("by_status", q => q.eq("status", "active")).take(200)
    : actor.profile.roles.includes("hod")
      ? await ctx.db.query("departments").withIndex("by_hodId", q => q.eq("hodId", actor.userId)).take(200)
      : [];
  return { ...actor, departments: departments.filter(d => d.status === "active") };
}

export async function assertDepartmentManager(ctx: AcademicReadCtx, departmentId: Id<"departments">) {
  const actor = await academicActor(ctx);
  const department = await ctx.db.get(departmentId);
  if (!department || department.status !== "active") throw new ConvexError("This department is not active.");
  if (!actor.isAdmin && (!actor.profile.roles.includes("hod") || department.hodId !== actor.userId)) {
    throw new ConvexError("You can manage only departments where you are the appointed HOD.");
  }
  return { ...actor, department };
}

export async function classContext(ctx: AcademicReadCtx, courseId: Id<"courses">, periodId: Id<"academicPeriods">) {
  const actor = await academicActor(ctx);
  const [course, period, allocation, book] = await Promise.all([
    ctx.db.get(courseId), ctx.db.get(periodId),
    ctx.db.query("courseAllocations").withIndex("by_course_period", q => q.eq("courseId", courseId).eq("periodId", periodId)).unique(),
    ctx.db.query("academicGradebooks").withIndex("by_courseId_and_periodId", q => q.eq("courseId", courseId).eq("periodId", periodId)).unique(),
  ]);
  if (!course || !period) throw new ConvexError("Course or semester not found.");
  const department = await ctx.db.get(course.departmentId);
  if (!department || department.status !== "active") throw new ConvexError("This department is not active.");
  const isLecturer = allocation?.lecturerId === actor.userId
    && actor.profile.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role));
  const isManager = actor.isAdmin || (actor.profile.roles.includes("hod") && department.hodId === actor.userId);
  const isReviewer = isManager || (book?.reviewerId === actor.userId && actor.profile.roles.includes("hod"));
  if (!isLecturer && !isReviewer) throw new ConvexError("You do not have access to this class in this semester.");
  return { ...actor, course, period, allocation, book, department, isLecturer, isManager, isReviewer };
}

export async function assertClassReviewer(ctx: AcademicReadCtx, courseId: Id<"courses">, periodId: Id<"academicPeriods">) {
  const context = await classContext(ctx, courseId, periodId);
  if (!context.isReviewer) throw new ConvexError("Only the HOD or nominated reviewer can review these marks.");
  if (context.allocation?.lecturerId === context.userId) throw new ConvexError("Your own teaching marks need an independent reviewer.");
  return context;
}

export async function requireEnrollment(ctx: AcademicReadCtx, studentId: Id<"students">, courseId: Id<"courses">, periodId: Id<"academicPeriods">) {
  const registration = await ctx.db.query("studentCourseRegistrations")
    .withIndex("by_student_period", q => q.eq("studentId", studentId).eq("periodId", periodId))
    .filter(q => q.and(q.eq(q.field("courseId"), courseId), q.or(q.eq(q.field("status"), "registered"), q.eq(q.field("status"), "completed"))))
    .first();
  if (!registration) throw new ConvexError("The student is not registered for this course in this semester.");
  return registration;
}

export async function staffName(ctx: AcademicReadCtx, userId: string) {
  const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user", where: [{ field: "_id", value: userId, operator: "eq" }],
  });
  return { name: user?.name ?? "Staff member", email: user?.email ?? "" };
}

export function entered(mark: Doc<"studentAssessments"> | null, field: "coursework" | "exam") {
  if (!mark) return false;
  return (field === "coursework" ? mark.courseworkEntered : mark.examEntered) !== false;
}
