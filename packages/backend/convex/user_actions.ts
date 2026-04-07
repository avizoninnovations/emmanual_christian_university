import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

/**
 * Seed the initial System Admin user.
 * Isolated in actions to avoid circular dependencies with queries/mutations.
 */
export const seedAdmin = action({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    const email = args.email || "admin@ecu.edu";
    const password = args.password || "EcuAdmin2025!";
    
    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Call internal mutation to create/update
    return await ctx.runMutation(internal.user_internal.createUserInternal, {
      email,
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      role: "SystemAdmin",
    });
  },
});

/**
 * Admin-only action to create new staff members.
 */
export const createStaff = action({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    const password = args.password || "ecu-staff-2025";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    return await ctx.runMutation(internal.user_internal.createUserInternal, {
      email: args.email,
      passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
    });
  },
});
