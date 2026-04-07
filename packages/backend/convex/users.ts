import { query, mutation } from "./_generated/server";

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

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
