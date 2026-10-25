import type { Id } from "../_generated/dataModel.js";
import type { AcademicReadCtx } from "./academicAccess.js";

export async function permissionForStudent(ctx: AcademicReadCtx, studentId: Id<"students">,
  courseId: Id<"courses">, periodId: Id<"academicPeriods">) {
  const grant = await ctx.db.query("markEditPermissions")
    .withIndex("by_studentId_and_courseId_and_periodId", q => q.eq("studentId", studentId).eq("courseId", courseId).eq("periodId", periodId))
    .filter(q => q.eq(q.field("status"), "granted")).order("desc").first();
  if (!grant || !grant.grantedBy || grant.expiresAt <= Date.now()) return null;
  const [allocation, issuer, department] = await Promise.all([
    ctx.db.get(grant.allocationId),
    ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", grant.grantedBy!)).unique(),
    ctx.db.get(grant.departmentId),
  ]);
  if (!allocation || allocation.lecturerId !== grant.lecturerId || (allocation.revision ?? 0) !== grant.allocationRevision) return null;
  if (!issuer || issuer.status !== "active" || (!issuer.roles.includes("admin")
    && (!issuer.roles.includes("hod") || department?.hodId !== issuer.userId))) return null;
  return grant;
}

export async function latestPermissionForLecturer(ctx: AcademicReadCtx, studentId: Id<"students">,
  courseId: Id<"courses">, periodId: Id<"academicPeriods">, lecturerId: string) {
  const grant = await ctx.db.query("markEditPermissions")
    .withIndex("by_studentId_and_courseId_and_periodId", q => q.eq("studentId", studentId).eq("courseId", courseId).eq("periodId", periodId))
    .order("desc").first();
  if (!grant || grant.lecturerId !== lecturerId) return null;
  const allocation = await ctx.db.get(grant.allocationId);
  if (!allocation || allocation.lecturerId !== lecturerId || (allocation.revision ?? 0) !== grant.allocationRevision) return null;
  if (grant.status === "granted" && !await permissionForStudent(ctx, studentId, courseId, periodId)) return null;
  return grant;
}

export function permissionActive(grant: Awaited<ReturnType<typeof permissionForStudent>>, userId: string, now: number) {
  return !!grant && grant.status === "granted" && grant.lecturerId === userId && grant.startsAt <= now && now < grant.expiresAt;
}
