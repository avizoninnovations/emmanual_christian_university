import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    return users;
  },
});

/**
 * Get all staff members (excluding students).
 */
export const getStaff = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Note: We'll add auth checks here once we have a shared auth helper 
    // that works well with Better Auth session IDs.
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("role"), "student"))
      .collect();

    return users;
  },
});

export const add = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const names = (identity.name || "Antonio User").split(" ");
    const firstName = names[0];
    const lastName = names.slice(1).join(" ") || "User";

    const userId = await ctx.db.insert("users", {
      firstName,
      lastName,
      email: identity.email || "",
      passwordHash: "external", // Better Auth users don't need a local hash
      role: "student",
      isActive: true,
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Admin-only mutation to delete a staff member.
 */
export const deleteStaff = mutation({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .first();

    if (!caller || (caller.role !== "SystemAdmin" && caller.role !== "systemadmin")) {
       throw new Error("Only SystemAdmin can delete staff members");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
