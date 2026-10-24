import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";
import { academicActor } from "./academicAccess.js";
import { academicEvent } from "./academicAudit.js";

export async function appointDepartmentHead(ctx: MutationCtx, departmentId: Id<"departments">, staffUserId: string | null, reason: string) {
  const actor = await academicActor(ctx);
  if (!actor.isAdmin) throw new ConvexError("Only a system administrator can appoint an HOD.");
  if (!reason.trim()) throw new ConvexError("Enter a reason for this appointment change.");
  const department = await ctx.db.get(departmentId);
  if (!department) throw new ConvexError("Department not found.");
  const profile = staffUserId ? await ctx.db.query("staffProfiles")
    .withIndex("by_userId", q => q.eq("userId", staffUserId)).unique() : null;
  if (staffUserId && (!profile || profile.status !== "active")) throw new ConvexError("Choose an active staff member.");
  const now = Date.now();
  const active = await ctx.db.query("departmentLeadershipAssignments")
    .withIndex("by_departmentId_and_status", q => q.eq("departmentId", departmentId).eq("status", "active")).unique();
  if (active && active.staffUserId !== staffUserId) {
    await ctx.db.patch(active._id, { status: "ended", endedAt: now, endedBy: actor.userId, updatedAt: now });
  }
  if (profile && (!active || active.staffUserId !== staffUserId)) {
    await ctx.db.insert("departmentLeadershipAssignments", {
      departmentId, staffUserId: profile.userId, appointedBy: actor.userId, startsAt: now,
      status: "active", reason: reason.trim(), createdAt: now, updatedAt: now,
    });
  }
  await ctx.db.patch(departmentId, { hodId: staffUserId ?? undefined, updatedAt: now });
  if (profile) await ctx.db.patch(profile._id, {
    roles: [...new Set([...profile.roles, "hod", "staff"])], updatedAt: now,
  });
  if (department.hodId && department.hodId !== staffUserId) {
    const [previous, remaining] = await Promise.all([
      ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", department.hodId!)).unique(),
      ctx.db.query("departments").withIndex("by_hodId", q => q.eq("hodId", department.hodId)).first(),
    ]);
    if (previous && !remaining) await ctx.db.patch(previous._id, {
      roles: previous.roles.filter(role => role !== "hod"), updatedAt: now,
    });
  }
  await academicEvent(ctx, { departmentId, actorId: actor.userId, action: "APPOINT_DEPARTMENT_HEAD",
    details: `${department.name}: ${department.hodId ?? "unassigned"} → ${staffUserId ?? "unassigned"}. ${reason.trim()}` });
}
