import { action, query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { createAuth } from "./betterAuth/auth.js";
import { components } from "./_generated/api.js";

/**
 * Get all staff members.
 * This is a pure Convex query that automatically updates the UI instantly.
 */
export const getStaff = query({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    // Fetch users securely straight out of the isolated Better Auth component
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, { 
        model: "user",
        paginationOpts: { cursor: null, numItems: 1000 }
    });
    
    const users = result?.page || [];

    // Filter out students - only return staff/admin roles
    return users.filter((u: any) => u.role !== "student");
  },
});

/**
 * Create a new staff member.
 * We must keep this as an Action because Better Auth handles the bcrypt password hashing internally.
 */
export const createStaff = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    role: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx);

    const user = await auth.api.createUser({
      body: {
        email: args.email,
        password: args.password || "UniSystem2026!",
        name: `${args.firstName} ${args.lastName}`,
        role: args.role as "user" | "admin",
        data: {
          emailVerified: true,
        },
      },
    });

    return user;
  },
});

/**
 * Delete a staff member.
 * Runs instantly as a mutation on the Better Auth component tables.
 */
export const deleteStaff = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [
          {
            field: "_id",
            value: args.id,
            operator: "eq"
          }
        ],
      }
    });

    return { success: true };
  },
});
