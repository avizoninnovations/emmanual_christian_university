import { ConvexError, v } from "convex/values";
import { mutation } from "./lib/mutations";
import { logAction } from "./audit_logger";
import { assertRole } from "./lib/utils";

const admissionsRoles = ["admin", "registrar", "admissions_officer"];

export const bulkUpdateApplicantStatus = mutation({
  args: {
    ids: v.array(v.id("applicants")),
    status: v.union(v.literal("reviewing"), v.literal("accepted")),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, admissionsRoles);
    const applicantIds = [...new Set(args.ids)];
    if (applicantIds.length !== args.ids.length || applicantIds.length === 0 || applicantIds.length > 100)
      throw new ConvexError("Select between 1 and 100 unique applications.");

    const applicants = await Promise.all(applicantIds.map((id) => ctx.db.get(id)));
    if (applicants.some((applicant) => !applicant))
      throw new ConvexError("One or more selected applications could not be found. Refresh the list and try again.");

    const now = Date.now();
    let updatedCount = 0;
    for (const applicant of applicants) {
      if (!applicant) continue;
      const eligible = args.status === "reviewing"
        ? applicant.status === "new"
        : applicant.status === "new" || applicant.status === "reviewing";
      if (!eligible) continue;
      await ctx.db.patch(applicant._id, { status: args.status, updatedAt: now });
      await ctx.db.insert("applicantEvents", {
        applicantId: applicant._id,
        actorUserId: userId,
        action: "status_changed",
        fromStatus: applicant.status,
        toStatus: args.status,
        note: "Bulk admissions status update.",
        occurredAt: now,
        createdAt: now,
        updatedAt: now,
      });
      updatedCount++;
    }

    if (updatedCount > 0) {
      await logAction(ctx, {
        action: "BULK_UPDATE_APPLICANT_STATUS",
        resource: "applicants",
        details: `Moved ${updatedCount} selected application(s) to ${args.status}.`,
      });
    }
    return { updatedCount, skippedCount: applicants.length - updatedCount };
  },
});
