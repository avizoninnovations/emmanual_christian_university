import { v } from "convex/values";

/** Shared by admissions and enrollment so intake details survive admission. */
export const studentPersonalFields = {
  firstName: v.optional(v.string()),
  surname: v.optional(v.string()),
  otherName: v.optional(v.string()),
  gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("prefer_not_to_say"))),
  dateOfBirth: v.optional(v.string()),
  nationality: v.optional(v.string()),
  address: v.optional(v.string()),
  emergencyContact: v.optional(v.object({
    name: v.string(),
    relationship: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
  })),
  yearOfEntry: v.optional(v.number()),
  programType: v.optional(v.union(v.literal("Day"), v.literal("Evening"), v.literal("Weekend"), v.literal("Distance"))),
};
