import { components } from "./_generated/api.js";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";

/** Public sign-in lookup returns only an opaque authentication alias, never personal details. */
export const resolveAccessNumber = query({
  args: { accessNumber: v.string() },
  returns: v.string(),
  handler: async (ctx, { accessNumber }) => {
    const normalized = accessNumber.trim().slice(0, 32).toUpperCase();
    if (!/^ECU\d{4,8}$/.test(normalized)) {
      throw new ConvexError("Enter your ECU access number, for example ECU0001.");
    }

    const student = await ctx.db
      .query("students")
      .withIndex("by_accessNumber", (q) => q.eq("accessNumber", normalized))
      .unique();
    if (student?.loginEmail) return student.loginEmail;

    if (student?.userId) {
      const authUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: student.userId, operator: "eq" }],
      });
      if (authUser?.email) return authUser.email;
    }

    return `${normalized.toLowerCase()}@students.ecu-ssd.org`;
  },
});
