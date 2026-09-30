import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { logAction } from "./audit_logger.js";
import { assertRole, assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";

// Helper to fetch user map
async function getUsersMap(ctx: any): Promise<Map<string, { name: string; email: string }>> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 2000 },
    });
    const users = result?.page || [];
    return new Map(users.map((u: any) => [u._id, { name: u.name, email: u.email }]));
  } catch {
    return new Map();
  }
}

export const getMyCoverRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);

    const myRequests = await ctx.db
      .query("teachingCoverRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .order("desc")
      .collect();

    const coveringForOthers = await ctx.db
      .query("teachingCoverRequests")
      .withIndex("by_covering", (q) => q.eq("coveringLecturerId", userId))
      .order("desc")
      .collect();

    const usersMap = await getUsersMap(ctx);

    const enrich = async (reqs: any[]) => {
      return await Promise.all(
        reqs.map(async (r) => {
          const course = await ctx.db.get(r.courseId as Id<"courses">);
          const requester = usersMap.get(r.requesterId);
          const covering = usersMap.get(r.coveringLecturerId);
          const reviewer = r.reviewedBy ? usersMap.get(r.reviewedBy) : null;

          return {
            _id: r._id,
            courseId: r.courseId,
            courseCode: course?.code ?? "—",
            courseTitle: course?.title ?? "—",
            requesterName: requester?.name ?? "Faculty Member",
            coveringLecturerName: covering?.name ?? "Colleague",
            date: r.date,
            startTime: r.startTime,
            endTime: r.endTime,
            topic: r.topic,
            reason: r.reason,
            status: r.status,
            hodReviewNotes: r.hodReviewNotes,
            reviewerName: reviewer?.name,
            createdAt: r.createdAt,
          };
        })
      );
    };

    return {
      myRequests: await enrich(myRequests),
      coveringForOthers: await enrich(coveringForOthers),
    };
  },
});

export const getDepartmentPendingCovers = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "dean"]);

    let query = ctx.db.query("teachingCoverRequests").withIndex("by_status", (q) => q.eq("status", "pending"));
    const requests = await query.order("desc").collect();

    const usersMap = await getUsersMap(ctx);

    const enriched = await Promise.all(
      requests.map(async (r) => {
        const course = await ctx.db.get(r.courseId as Id<"courses">);
        const requester = usersMap.get(r.requesterId);
        const covering = usersMap.get(r.coveringLecturerId);

        return {
          _id: r._id,
          courseId: r.courseId,
          courseCode: course?.code ?? "—",
          courseTitle: course?.title ?? "—",
          requesterId: r.requesterId,
          requesterName: requester?.name ?? "Faculty Member",
          coveringLecturerId: r.coveringLecturerId,
          coveringLecturerName: covering?.name ?? "Colleague",
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          topic: r.topic,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
        };
      })
    );

    return enriched;
  },
});

export const createCoverRequest = mutation({
  args: {
    coveringLecturerId: v.string(),
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    date: v.string(), // YYYY-MM-DD
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    topic: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    if (args.coveringLecturerId === userId) {
      throw new Error("You cannot assign yourself to cover your own lecture.");
    }

    const id = await ctx.db.insert("teachingCoverRequests", {
      requesterId: userId,
      coveringLecturerId: args.coveringLecturerId,
      courseId: args.courseId,
      periodId: args.periodId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      topic: args.topic.trim(),
      reason: args.reason.trim(),
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const course = await ctx.db.get(args.courseId);
    await logAction(ctx, {
      action: "CREATE_TEACHING_COVER_REQUEST",
      resource: "teachingCoverRequests",
      details: `Submitted lecture cover request for ${course?.code} on ${args.date}`,
    });

    return id;
  },
});

export const reviewCoverRequest = mutation({
  args: {
    id: v.id("teachingCoverRequests"),
    action: v.union(v.literal("approved"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewerId = await assertRole(ctx, ["admin", "hod", "dean"]);

    const req = await ctx.db.get(args.id);
    if (!req) throw new Error("Teaching cover request not found.");

    await ctx.db.patch(args.id, {
      status: args.action,
      hodReviewNotes: args.reviewNotes?.trim(),
      reviewedBy: reviewerId,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    const course = await ctx.db.get(req.courseId);
    await logAction(ctx, {
      action: args.action === "approved" ? "APPROVE_TEACHING_COVER" : "REJECT_TEACHING_COVER",
      resource: "teachingCoverRequests",
      details: `HOD ${args.action} lecture cover for ${course?.code} on ${req.date}`,
    });

    return { success: true };
  },
});
