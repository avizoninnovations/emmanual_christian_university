import { defineTable } from "convex/server";
import { v } from "convex/values";

const timestamps = { createdAt: v.number(), updatedAt: v.number() };

export const staffServiceTables = {
  staffServiceRequests: defineTable({
    type: v.union(v.literal("leave"), v.literal("exit"), v.literal("complaint"), v.literal("defense")),
    requesterProfileId: v.id("staffProfiles"),
    supervisorProfileId: v.optional(v.id("staffProfiles")),
    assignedHrProfileId: v.optional(v.id("staffProfiles")),
    status: v.union(
      v.literal("draft"), v.literal("submitted"), v.literal("supervisor_review"),
      v.literal("hr_review"), v.literal("returned"), v.literal("approved"),
      v.literal("rejected"), v.literal("withdrawn"), v.literal("completed"),
      v.literal("response_due"), v.literal("response_submitted"),
    ),
    subject: v.string(),
    details: v.string(),
    leaveType: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    handoverPlan: v.optional(v.string()),
    proposedLastDay: v.optional(v.string()),
    complaintCategory: v.optional(v.string()),
    involvedPeople: v.optional(v.string()),
    caseReference: v.optional(v.string()),
    responseDueAt: v.optional(v.number()),
    response: v.optional(v.string()),
    responseSubmittedAt: v.optional(v.number()),
    decisionNote: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_requester", ["requesterProfileId", "createdAt"])
    .index("by_requester_type", ["requesterProfileId", "type", "createdAt"])
    .index("by_supervisor_status", ["supervisorProfileId", "status", "createdAt"])
    .index("by_hr_status", ["assignedHrProfileId", "status", "createdAt"])
    .index("by_type_status", ["type", "status", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  staffServiceFiles: defineTable({
    requestId: v.optional(v.id("staffServiceRequests")),
    performanceReviewId: v.optional(v.id("staffPerformanceReviews")),
    fileId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedByProfileId: v.id("staffProfiles"),
    ...timestamps,
  })
    .index("by_request", ["requestId", "createdAt"])
    .index("by_performance_review", ["performanceReviewId", "createdAt"])
    .index("by_uploader", ["uploadedByProfileId", "createdAt"]),

  staffServiceEvents: defineTable({
    requestId: v.id("staffServiceRequests"),
    actorProfileId: v.id("staffProfiles"),
    kind: v.union(
      v.literal("created"), v.literal("submitted"), v.literal("withdrawn"),
      v.literal("returned"), v.literal("approved"), v.literal("rejected"),
      v.literal("response_submitted"), v.literal("completed"), v.literal("note"),
    ),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    note: v.optional(v.string()),
    visibility: v.union(v.literal("participants"), v.literal("hr_only")),
    occurredAt: v.number(),
    ...timestamps,
  })
    .index("by_request", ["requestId", "occurredAt"])
    .index("by_actor", ["actorProfileId", "occurredAt"]),

  staffReviewCycles: defineTable({
    type: v.union(v.literal("performance"), v.literal("supervisor_feedback")),
    title: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    selfDeadline: v.optional(v.number()),
    supervisorDeadline: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("open"), v.literal("closed")),
    anonymousFeedback: v.boolean(),
    minimumFeedbackCount: v.number(),
    createdByProfileId: v.id("staffProfiles"),
    ...timestamps,
  })
    .index("by_type_status", ["type", "status", "startsAt"])
    .index("by_type", ["type", "startsAt"])
    .index("by_status", ["status", "startsAt"]),

  staffPerformanceReviews: defineTable({
    cycleId: v.id("staffReviewCycles"),
    staffProfileId: v.id("staffProfiles"),
    supervisorProfileId: v.optional(v.id("staffProfiles")),
    status: v.union(v.literal("self_review"), v.literal("supervisor_review"), v.literal("hr_review"), v.literal("completed")),
    selfSummary: v.optional(v.string()),
    achievements: v.optional(v.string()),
    developmentGoals: v.optional(v.string()),
    selfSubmittedAt: v.optional(v.number()),
    supervisorRating: v.optional(v.number()),
    supervisorComment: v.optional(v.string()),
    supervisorSubmittedAt: v.optional(v.number()),
    hrRating: v.optional(v.number()),
    hrComment: v.optional(v.string()),
    hrSubmittedAt: v.optional(v.number()),
    acknowledgedAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_staff_cycle", ["staffProfileId", "cycleId"])
    .index("by_staff", ["staffProfileId", "createdAt"])
    .index("by_supervisor_status", ["supervisorProfileId", "status", "createdAt"])
    .index("by_cycle_status", ["cycleId", "status"])
    .index("by_status", ["status", "updatedAt"]),

  staffSupervisorFeedback: defineTable({
    cycleId: v.id("staffReviewCycles"),
    supervisorProfileId: v.id("staffProfiles"),
    respondentProfileId: v.id("staffProfiles"),
    responses: v.array(v.object({ question: v.string(), rating: v.number() })),
    comment: v.optional(v.string()),
    submittedAt: v.number(),
    ...timestamps,
  })
    .index("by_respondent_cycle", ["respondentProfileId", "cycleId"])
    .index("by_respondent", ["respondentProfileId", "submittedAt"])
    .index("by_supervisor_cycle", ["supervisorProfileId", "cycleId"]),

  staffExitClearanceTasks: defineTable({
    requestId: v.id("staffServiceRequests"),
    department: v.string(),
    task: v.string(),
    assignedToProfileId: v.optional(v.id("staffProfiles")),
    status: v.union(v.literal("pending"), v.literal("cleared"), v.literal("not_applicable")),
    note: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_request", ["requestId", "createdAt"])
    .index("by_assignee_status", ["assignedToProfileId", "status"]),
};
