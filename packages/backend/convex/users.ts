import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import { findMany, create, deleteOne } from "./betterAuth/adapter.js";
import { createAuth } from "./betterAuth/auth.js";

export const getStaff = query({
  args: {},
  handler: async (ctx) => {
    // Find many users. Better Auth manages the 'user' table.
    const users = await findMany(ctx, "user", {});
    // Filter by staff roles if needed. Better Auth 'user' table has a 'role' field in our schema.
    return users.filter(u => u.role !== "Student" && u.role !== undefined);
  },
});

export const createStaff = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    role: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // We use Better Auth instance to create the user so it handles password hashing etc.
    const auth = createAuth(ctx);
    
    // Better Auth createUser api
    const user = await auth.api.createUser({
        body: {
            email: args.email,
            password: args.password || "UniSystem2026!", // Default password if none provided
            name: `${args.firstName} ${args.lastName}`,
            role: args.role,
            emailVerified: true,
        }
    });

    return user;
  },
});

export const deleteStaff = mutation({
  args: { id: v.id("user") },
  handler: async (ctx, args) => {
    return await deleteOne(ctx, "user", { id: args.id });
  },
});
