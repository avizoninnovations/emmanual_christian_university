import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Internal mutation to handle transactional creation of user + account records.
 * Moved here to avoid circular dependencies in users.ts.
 */
export const createUserInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        role: args.role,
        isActive: true,
        passwordHash: args.passwordHash,
      });

      // Update or create account
      const existingAccount = await ctx.db
        .query("accounts")
        .withIndex("by_userId", (q) => q.eq("userId", existingUser._id))
        .filter((q) => q.eq(q.field("providerId"), "email"))
        .first();

      if (existingAccount) {
        await ctx.db.patch(existingAccount._id, {
          password: args.passwordHash,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("accounts", {
          userId: existingUser._id,
          accountId: args.email,
          providerId: "email",
          password: args.passwordHash,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      return existingUser._id;
    }

    // New user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      passwordHash: args.passwordHash,
      role: args.role,
      isActive: true,
      createdAt: Date.now(),
    });

    // Linked account for Better Auth
    await ctx.db.insert("accounts", {
      userId,
      accountId: args.email,
      providerId: "email",
      password: args.passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});
