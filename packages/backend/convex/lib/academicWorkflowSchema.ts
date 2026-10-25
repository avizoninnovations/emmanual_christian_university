import { defineTable } from "convex/server";
import { v } from "convex/values";

export const scoreSnapshot = v.object({
  courseworkMarks: v.number(), examMarks: v.number(), finalScore: v.number(),
  courseworkEntered: v.optional(v.boolean()), examEntered: v.optional(v.boolean()),
  grade: v.string(), gradePoints: v.number(), resultCode: v.optional(v.string()),
  revision: v.number(), approvedBy: v.optional(v.string()), approvedAt: v.number(),
});
export const markComponent = v.union(v.literal("coursework"), v.literal("exam"));
export const grantStatus = v.union(v.literal("requested"), v.literal("granted"),
  v.literal("submitted"), v.literal("revoked"), v.literal("rejected"), v.literal("expired"));
const timestamps = { createdAt: v.number(), updatedAt: v.number() };

export const academicWorkflowTables = {
  departmentLeadershipAssignments: defineTable({
    departmentId: v.id("departments"), staffUserId: v.string(), appointedBy: v.string(),
    startsAt: v.number(), endedAt: v.optional(v.number()), endedBy: v.optional(v.string()),
    reason: v.string(), status: v.union(v.literal("active"), v.literal("ended")), ...timestamps,
  }).index("by_departmentId_and_status", ["departmentId", "status"])
    .index("by_staffUserId_and_status", ["staffUserId", "status"]),
  academicGradebooks: defineTable({
    courseId: v.id("courses"), periodId: v.id("academicPeriods"), departmentId: v.id("departments"),
    reviewerId: v.optional(v.string()), entriesCloseAt: v.optional(v.number()), freezeAtDeadline: v.optional(v.boolean()),
    ...timestamps,
  }).index("by_courseId_and_periodId", ["courseId", "periodId"])
    .index("by_reviewerId_and_periodId", ["reviewerId", "periodId"]),
  markEditPermissions: defineTable({
    departmentId: v.id("departments"), courseId: v.id("courses"), periodId: v.id("academicPeriods"),
    studentId: v.id("students"), lecturerId: v.string(), allocationId: v.id("courseAllocations"),
    allocationRevision: v.number(), components: v.array(markComponent), reason: v.string(),
    status: grantStatus, requestedBy: v.string(), grantedBy: v.optional(v.string()),
    startsAt: v.number(), expiresAt: v.number(), closedBy: v.optional(v.string()),
    closedReason: v.optional(v.string()), ...timestamps,
  }).index("by_studentId_and_courseId_and_periodId", ["studentId", "courseId", "periodId"])
    .index("by_departmentId_and_status", ["departmentId", "status"])
    .index("by_lecturerId_and_status", ["lecturerId", "status"])
    .index("by_status_and_expiresAt", ["status", "expiresAt"]),
  academicEvents: defineTable({
    departmentId: v.id("departments"), actorId: v.string(), action: v.string(), details: v.string(),
    courseId: v.optional(v.id("courses")), periodId: v.optional(v.id("academicPeriods")),
    studentId: v.optional(v.id("students")), revision: v.optional(v.number()),
    before: v.optional(v.object({ courseworkMarks: v.number(), examMarks: v.number(), status: v.string() })),
    after: v.optional(v.object({ courseworkMarks: v.number(), examMarks: v.number(), status: v.string() })),
    grantId: v.optional(v.id("markEditPermissions")), ...timestamps,
  }).index("by_departmentId", ["departmentId"])
    .index("by_studentId_and_courseId_and_periodId", ["studentId", "courseId", "periodId"]),
};
