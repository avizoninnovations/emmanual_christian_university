import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { logAction } from "./audit_logger.js";
import { assertAuthenticated } from "./lib/utils.js";

const hrRoles = ["hr_officer", "admin"];
const reviewType = v.union(v.literal("performance"), v.literal("supervisor_feedback"));

async function getActiveStaff(ctx: QueryCtx | MutationCtx) {
  const userId = await assertAuthenticated(ctx);
  const profile = await ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", userId)).unique();
  if (!profile || profile.status !== "active") throw new ConvexError("An active staff profile is required.");
  return profile;
}

async function assertHrProfile(ctx: QueryCtx | MutationCtx) {
  const profile = await getActiveStaff(ctx);
  if (!profile.roles.some(role => hrRoles.includes(role))) throw new ConvexError("Only Human Resources or an administrator can manage review cycles.");
  return profile;
}

export const getOpenReviewCycles = query({
  args: { type: reviewType },
  handler: async (ctx, args) => {
    await getActiveStaff(ctx);
    const now = Date.now();
    const cycles = await ctx.db.query("staffReviewCycles").withIndex("by_type_status", q => q.eq("type", args.type).eq("status", "open")).take(50);
    return cycles.filter(cycle => cycle.startsAt <= now && cycle.endsAt >= now);
  },
});
export const getHrReviewCycles = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    return await ctx.db.query("staffReviewCycles").withIndex("by_status", q => q.eq("status", "open")).order("desc").paginate(args.paginationOpts);
  },
});

export const listReviewCyclesForHr = query({
  args: { type: reviewType, paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    return await ctx.db.query("staffReviewCycles").withIndex("by_type", q => q.eq("type", args.type)).order("desc").paginate(args.paginationOpts);
  },
});

export const createReviewCycle = mutation({
  args: {
    type: reviewType, title: v.string(), startsAt: v.number(), endsAt: v.number(),
    selfDeadline: v.optional(v.number()), supervisorDeadline: v.optional(v.number()),
    anonymousFeedback: v.boolean(), minimumFeedbackCount: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await assertHrProfile(ctx);
    const now = Date.now();
    if (args.title.trim().length < 3 || args.title.length > 120) throw new ConvexError("Enter a cycle name between 3 and 120 characters.");
    if (args.startsAt >= args.endsAt || args.endsAt <= now) throw new ConvexError("Choose a valid cycle period that ends in the future.");
    if (args.selfDeadline !== undefined && (args.selfDeadline < args.startsAt || args.selfDeadline > args.endsAt)) throw new ConvexError("The staff deadline must fall within the review cycle.");
    if (args.supervisorDeadline !== undefined && (args.supervisorDeadline < args.startsAt || args.supervisorDeadline > args.endsAt)) throw new ConvexError("The supervisor deadline must fall within the review cycle.");
    if (!Number.isInteger(args.minimumFeedbackCount) || args.minimumFeedbackCount < 1 || args.minimumFeedbackCount > 100) throw new ConvexError("The feedback threshold must be between 1 and 100.");
    const cycleId = await ctx.db.insert("staffReviewCycles", {
      ...args, title: args.title.trim(), status: "open", createdByProfileId: profile._id, createdAt: now, updatedAt: now,
    });
    await logAction(ctx, { action: "CREATE_STAFF_REVIEW_CYCLE", resource: "staffReviewCycles", details: `Opened ${args.type} cycle: ${args.title.trim()}.` });
    return cycleId;
  },
});

export const closeReviewCycle = mutation({
  args: { cycleId: v.id("staffReviewCycles") },
  handler: async (ctx, args) => {
    const profile = await assertHrProfile(ctx);
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle || cycle.status !== "open") throw new ConvexError("This review cycle is not open.");
    const now = Date.now();
    await ctx.db.patch(cycle._id, { status: "closed", updatedAt: now });
    await logAction(ctx, { action: "CLOSE_STAFF_REVIEW_CYCLE", resource: "staffReviewCycles", details: `Closed ${cycle.type} cycle ${cycle.title} by ${profile._id}.` });
  },
});

export const getMyPerformanceReviews = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const page = await ctx.db.query("staffPerformanceReviews").withIndex("by_staff", q => q.eq("staffProfileId", profile._id)).order("desc").paginate(args.paginationOpts);
    const cycles = await Promise.all([...new Set(page.page.map(review => review.cycleId))].map(id => ctx.db.get(id)));
    const cycleNames = new Map(cycles.filter(Boolean).map(cycle => [cycle!._id, cycle!.title]));
    return { ...page, page: page.page.map(review => ({ ...review, cycleTitle: cycleNames.get(review.cycleId) ?? "Review cycle" })) };
  },
});

export const getPerformanceReviewDetails = query({
  args: { reviewId: v.id("staffPerformanceReviews") },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError("This performance review could not be found.");
    const isHr = profile.roles.some(role => hrRoles.includes(role));
    if (review.staffProfileId !== profile._id && review.supervisorProfileId !== profile._id && !isHr) throw new ConvexError("You do not have access to this performance review.");
    const cycle = await ctx.db.get(review.cycleId);
    const files = await ctx.db.query("staffServiceFiles").withIndex("by_performance_review", q => q.eq("performanceReviewId", review._id)).take(50);
    const filesWithUrls = await Promise.all(files.map(async file => ({ ...file, url: await ctx.storage.getUrl(file.fileId) })));
    const staff = await ctx.db.get(review.staffProfileId);
    const selfView = review.staffProfileId === profile._id;
    return {
      review: {
        ...review,
        ...(selfView && review.status !== "completed" ? { hrRating: undefined, hrComment: undefined, hrSubmittedAt: undefined } : {}),
        cycleTitle: cycle?.title ?? "Review cycle",
        staffName: [staff?.personalDetails?.firstName, staff?.personalDetails?.surname].filter(Boolean).join(" ") || staff?.staffId || "Staff member",
      },
      files: filesWithUrls,
    };
  },
});

export const attachPerformanceReviewFile = mutation({
  args: { reviewId: v.id("staffPerformanceReviews"), fileId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.staffProfileId !== profile._id || review.status !== "self_review") throw new ConvexError("Files can only be added during your self-review.");
    const metadata = await ctx.db.system.get("_storage", args.fileId);
    const types = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!metadata || metadata.size > 15 * 1024 * 1024 || !types.includes(metadata.contentType ?? "")) throw new ConvexError("Choose a PDF, image, or Word document no larger than 15 MB.");
    const existing = await ctx.db.query("staffServiceFiles").withIndex("by_performance_review", q => q.eq("performanceReviewId", review._id)).take(10);
    if (existing.length >= 10) throw new ConvexError("A review can contain at most 10 evidence files.");
    const now = Date.now();
    await ctx.db.insert("staffServiceFiles", { performanceReviewId: review._id, fileId: args.fileId, fileName: args.fileName.trim().slice(0, 180) || "Evidence", contentType: metadata.contentType ?? "application/octet-stream", size: metadata.size, uploadedByProfileId: profile._id, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "UPLOAD_PERFORMANCE_REVIEW_EVIDENCE", resource: "staffServiceFiles", details: "Added evidence to a self-review." });
  },
});

export const startPerformanceReview = mutation({
  args: { cycleId: v.id("staffReviewCycles") },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const cycle = await ctx.db.get(args.cycleId);
    const now = Date.now();
    if (!cycle || cycle.type !== "performance" || cycle.status !== "open" || cycle.startsAt > now || cycle.endsAt < now) throw new ConvexError("This performance review cycle is not open.");
    if (cycle.selfDeadline !== undefined && cycle.selfDeadline < now) throw new ConvexError("The self-review deadline has passed.");
    const existing = await ctx.db.query("staffPerformanceReviews").withIndex("by_staff_cycle", q => q.eq("staffProfileId", profile._id).eq("cycleId", cycle._id)).unique();
    if (existing) return existing._id;
    return await ctx.db.insert("staffPerformanceReviews", {
      cycleId: cycle._id, staffProfileId: profile._id, supervisorProfileId: profile.supervisorProfileId,
      status: "self_review", createdAt: now, updatedAt: now,
    });
  },
});

export const saveSelfReview = mutation({
  args: { reviewId: v.id("staffPerformanceReviews"), selfSummary: v.string(), achievements: v.string(), developmentGoals: v.string() },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.staffProfileId !== profile._id || review.status !== "self_review") throw new ConvexError("This review is not open for your self-review.");
    for (const field of [args.selfSummary, args.achievements, args.developmentGoals]) if (field.length > 5000) throw new ConvexError("Each review field must be 5,000 characters or fewer.");
    const cycle = await ctx.db.get(review.cycleId);
    const now = Date.now();
    if (!cycle || cycle.status !== "open" || (cycle.selfDeadline ?? cycle.endsAt) < now) throw new ConvexError("The self-review deadline has passed.");
    await ctx.db.patch(review._id, { selfSummary: args.selfSummary.trim(), achievements: args.achievements.trim(), developmentGoals: args.developmentGoals.trim(), updatedAt: now });
    await logAction(ctx, { action: "SAVE_STAFF_SELF_REVIEW", resource: "staffPerformanceReviews", details: "Saved a staff self-review draft." });
  },
});

export const submitSelfReview = mutation({
  args: { reviewId: v.id("staffPerformanceReviews") },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.staffProfileId !== profile._id || review.status !== "self_review") throw new ConvexError("This review is not ready for submission.");
    if (!review.selfSummary?.trim() || !review.achievements?.trim() || !review.developmentGoals?.trim()) throw new ConvexError("Complete all self-review sections before submitting.");
    const cycle = await ctx.db.get(review.cycleId);
    const now = Date.now();
    if (!cycle || cycle.status !== "open" || (cycle.selfDeadline ?? cycle.endsAt) < now) throw new ConvexError("The self-review deadline has passed.");
    const status = review.supervisorProfileId ? "supervisor_review" : "hr_review";
    await ctx.db.patch(review._id, { status, selfSubmittedAt: now, updatedAt: now });
    await logAction(ctx, { action: "SUBMIT_STAFF_SELF_REVIEW", resource: "staffPerformanceReviews", details: `Submitted a staff self-review to ${status === "hr_review" ? "Human Resources" : "the supervisor"}.` });
  },
});

export const getSupervisorPerformanceQueue = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const page = await ctx.db.query("staffPerformanceReviews").withIndex("by_supervisor_status", q => q.eq("supervisorProfileId", profile._id).eq("status", "supervisor_review")).order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async review => {
      const staff = await ctx.db.get(review.staffProfileId);
      return { ...review, staffName: [staff?.personalDetails?.firstName, staff?.personalDetails?.surname].filter(Boolean).join(" ") || staff?.staffId || "Staff member" };
    })) };
  },
});

export const submitSupervisorReview = mutation({
  args: { reviewId: v.id("staffPerformanceReviews"), rating: v.number(), comment: v.string() },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.supervisorProfileId !== profile._id || review.status !== "supervisor_review") throw new ConvexError("This review is not assigned to you.");
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) throw new ConvexError("Choose a rating from 1 to 5.");
    if (args.comment.trim().length < 10 || args.comment.length > 5000) throw new ConvexError("Add supervisor feedback between 10 and 5,000 characters.");
    const cycle = await ctx.db.get(review.cycleId);
    const now = Date.now();
    if (!cycle || cycle.status !== "open" || (cycle.supervisorDeadline ?? cycle.endsAt) < now) throw new ConvexError("The supervisor review deadline has passed.");
    await ctx.db.patch(review._id, { supervisorRating: args.rating, supervisorComment: args.comment.trim(), supervisorSubmittedAt: now, status: "hr_review", updatedAt: now });
    await logAction(ctx, { action: "SUBMIT_SUPERVISOR_PERFORMANCE_REVIEW", resource: "staffPerformanceReviews", details: "Submitted a supervisor assessment for HR review." });
  },
});

export const getHrPerformanceQueue = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    const page = await ctx.db.query("staffPerformanceReviews").withIndex("by_status", q => q.eq("status", "hr_review")).order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async review => {
      const staff = await ctx.db.get(review.staffProfileId);
      return { ...review, staffName: [staff?.personalDetails?.firstName, staff?.personalDetails?.surname].filter(Boolean).join(" ") || staff?.staffId || "Staff member" };
    })) };
  },
});

export const finalizePerformanceReview = mutation({
  args: { reviewId: v.id("staffPerformanceReviews"), rating: v.number(), comment: v.string() },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.status !== "hr_review") throw new ConvexError("This performance review is not awaiting HR completion.");
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) throw new ConvexError("Choose a final rating from 1 to 5.");
    if (args.comment.trim().length < 5 || args.comment.length > 5000) throw new ConvexError("Enter a final HR comment between 5 and 5,000 characters.");
    const now = Date.now();
    await ctx.db.patch(review._id, { hrRating: args.rating, hrComment: args.comment.trim(), hrSubmittedAt: now, status: "completed", updatedAt: now });
    await logAction(ctx, { action: "FINALIZE_STAFF_PERFORMANCE_REVIEW", resource: "staffPerformanceReviews", details: "Finalized a staff performance review." });
  },
});

export const acknowledgePerformanceReview = mutation({
  args: { reviewId: v.id("staffPerformanceReviews") },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.staffProfileId !== profile._id || review.status !== "completed") throw new ConvexError("Only a completed review can be acknowledged.");
    const now = Date.now();
    await ctx.db.patch(review._id, { acknowledgedAt: now, updatedAt: now });
    await logAction(ctx, { action: "ACKNOWLEDGE_STAFF_PERFORMANCE_REVIEW", resource: "staffPerformanceReviews", details: "Acknowledged a completed performance review." });
  },
});

export const submitSupervisorFeedback = mutation({
  args: { cycleId: v.id("staffReviewCycles"), responses: v.array(v.object({ question: v.string(), rating: v.number() })), comment: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    const supervisorProfileId = profile.supervisorProfileId;
    if (!supervisorProfileId) throw new ConvexError("Your supervisor is not set on your staff profile. Contact Human Resources.");
    if (supervisorProfileId === profile._id) throw new ConvexError("You cannot evaluate yourself as your supervisor.");
    const cycle = await ctx.db.get(args.cycleId);
    const now = Date.now();
    if (!cycle || cycle.type !== "supervisor_feedback" || cycle.status !== "open" || cycle.startsAt > now || cycle.endsAt < now) throw new ConvexError("This supervisor feedback cycle is not open.");
    if ((cycle.supervisorDeadline ?? cycle.endsAt) < now) throw new ConvexError("The supervisor feedback deadline has passed.");
    if (args.responses.length < 3 || args.responses.length > 20 || args.responses.some(response => !Number.isInteger(response.rating) || response.rating < 1 || response.rating > 5)) throw new ConvexError("Complete at least three feedback ratings from 1 to 5.");
    const existing = await ctx.db.query("staffSupervisorFeedback").withIndex("by_respondent_cycle", q => q.eq("respondentProfileId", profile._id).eq("cycleId", cycle._id)).unique();
    if (existing) throw new ConvexError("You have already submitted feedback in this cycle.");
    await ctx.db.insert("staffSupervisorFeedback", { cycleId: cycle._id, supervisorProfileId, respondentProfileId: profile._id, responses: args.responses, comment: args.comment?.trim().slice(0, 3000), submittedAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "SUBMIT_SUPERVISOR_FEEDBACK", resource: "staffSupervisorFeedback", details: "Submitted feedback about a direct supervisor." });
  },
});

export const getMySupervisorFeedbackStatus = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await getActiveStaff(ctx);
    return await ctx.db.query("staffSupervisorFeedback").withIndex("by_respondent", q => q.eq("respondentProfileId", profile._id)).order("desc").paginate(args.paginationOpts);
  },
});

export const getSupervisorFeedbackForHr = query({
  args: { supervisorProfileId: v.id("staffProfiles"), cycleId: v.id("staffReviewCycles") },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle || cycle.type !== "supervisor_feedback") throw new ConvexError("Choose a supervisor feedback cycle.");
    const thresholdRows = await ctx.db.query("staffSupervisorFeedback")
      .withIndex("by_supervisor_cycle", q => q.eq("supervisorProfileId", args.supervisorProfileId).eq("cycleId", args.cycleId))
      .take(cycle.minimumFeedbackCount);
    if (thresholdRows.length < cycle.minimumFeedbackCount) {
      return { withheld: true, hasMore: false, anonymous: cycle.anonymousFeedback, results: [] };
    }
    const feedback = await ctx.db.query("staffSupervisorFeedback")
      .withIndex("by_supervisor_cycle", q => q.eq("supervisorProfileId", args.supervisorProfileId).eq("cycleId", args.cycleId))
      .order("desc").take(500);
    return {
      withheld: false,
      hasMore: feedback.length === 500,
      anonymous: cycle.anonymousFeedback,
      results: feedback.map(({ respondentProfileId, ...entry }) => ({ ...entry, ...(!cycle.anonymousFeedback ? { respondentProfileId } : {}) })),
    };
  },
});
