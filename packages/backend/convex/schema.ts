import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as authTables } from "./betterAuth/schema.js";

export default defineSchema({
  ...authTables,

  /**
   * Extended staff profile linked to the Better Auth `user` table.
   * Stores role array (a user can be both admin and staff), 
   * personal details, and department assignment.
   */
  staffProfiles: defineTable({
    userId: v.string(),
    roles: v.array(v.string()),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    staffNumber: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  /**
   * 1. Faculties
   * e.g., "Faculty of Science & IT", "Faculty of Theology"
   */
  faculties: defineTable({
    name: v.string(),
    code: v.string(), // e.g., "FSIT"
    deanId: v.optional(v.string()), // References staffProfiles._id
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"]),

  /**
   * 2. Departments
   * e.g., "Computer Science", links to a Faculty
   */
  departments: defineTable({
    name: v.string(),
    code: v.string(), // e.g., "CS"
    facultyId: v.id("faculties"),
    hodId: v.optional(v.string()), // References staffProfiles._id (Head of Dept)
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_faculty", ["facultyId"])
    .index("by_status", ["status"]),

  /**
   * 3. Programs
   * e.g., "Bachelor of Computer Science", links to a Department
   */
  programs: defineTable({
    name: v.string(),
    code: v.string(), // e.g., "BCS"
    departmentId: v.id("departments"),
    level: v.union(v.literal("Certificate"), v.literal("Diploma"), v.literal("Bachelor"), v.literal("Master")),
    durationYears: v.number(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_department", ["departmentId"])
    .index("by_level", ["level"])
    .index("by_status", ["status"]),
});

