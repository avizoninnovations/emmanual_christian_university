import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed the initial System Admin user.
 * This user will be responsible for creating all other staff members.
 */
export const seedAdmin = mutation({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email || "admin@ecu.edu";
    const password = args.password || "EcuAdmin2025!";
    const firstName = "System";
    const lastName = "Admin";

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      console.log(`User ${email} already exists. Updating to SystemAdmin role.`);
      await ctx.db.patch(existingUser._id, {
        role: "SystemAdmin",
        isActive: true,
      });
      return existingUser._id;
    }

    // Hash the password (following the pattern in authActions.ts)
    // Note: In a real production setup, we would use a proper hash here.
    const passwordHash = `hash:${password}`;

    const userId = await ctx.db.insert("users", {
      email,
      firstName,
      lastName,
      passwordHash,
      role: "SystemAdmin",
      isActive: true,
      createdAt: Date.now(),
    });

    console.log(`Seeded System Admin: ${email} with password: ${password}`);
    return userId;
  },
});
