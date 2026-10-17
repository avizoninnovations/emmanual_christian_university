import { query } from "./_generated/server.js";
import { v } from "convex/values";

/** Public sign-in lookup returns only an opaque authentication alias, never personal details. */
export const resolveLoginIdentifier = query({
  args: { identifier: v.string() },
  returns: v.string(),
  handler: async (ctx, { identifier }) => {
    const value = identifier.trim().slice(0, 100);
    if (value.includes("@")) return value.toLowerCase();
    const normalized = value.toUpperCase();
    const byRegistration = await ctx.db.query("students").withIndex("by_regNumber", q => q.eq("registrationNumber", normalized)).unique();
    const student = byRegistration
      ?? await ctx.db.query("students").withIndex("by_accessNumber", q => q.eq("accessNumber", normalized)).unique()
      ?? await ctx.db.query("students").withIndex("by_legacyRegistrationNumber", q => q.eq("legacyRegistrationNumber", normalized)).unique();
    return student?.loginEmail ?? `${normalized.toLowerCase().replace(/[^a-z0-9]/g, "")}@students.ecu-ssd.org`;
  },
});
