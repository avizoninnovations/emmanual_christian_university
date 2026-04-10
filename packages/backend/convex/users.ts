import { action, query, mutation, internalMutation } from "./_generated/server.js";
import { v } from "convex/values";
import { createAuth } from "./betterAuth/auth.js";
import { components, internal } from "./_generated/api.js";
import { logAction } from "./audit_logger";

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

/**
 * Get the currently authenticated user's data including their staff profile + roles.
 * This is the backbone of the entire role-based dashboard system.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<any | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // The identity.subject from Better Auth contains the user's ID
    const userId = identity.subject;

    // Fetch the user record from Better Auth's user table
    const userResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 1000 },
    });
    const users = userResult?.page || [];
    const authUser = users.find((u: any) => u._id === userId);

    if (!authUser) return null;

    // Fetch the staff profile (with roles array)
    const staffProfile = await ctx.db
      .query("staffProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    return {
      _id: authUser._id,
      name: authUser.name,
      email: authUser.email,
      image: authUser.image,
      createdAt: authUser.createdAt,
      // Merge in the staff profile data
      roles: staffProfile?.roles ?? ["staff"],
      title: staffProfile?.title,
      phone: staffProfile?.phone,
      departmentId: staffProfile?.departmentId,
      staffNumber: staffProfile?.staffNumber,
      profileStatus: staffProfile?.status ?? "active",
      profileId: staffProfile?._id,
    };
  },
});

/**
 * Get all staff members.
 * Fetches from Better Auth user table and enriches with staffProfiles data.
 */
export const getStaff = query({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    // Fetch users from Better Auth component
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 1000 },
    });
    const users = result?.page || [];

    // Fetch all staff profiles for enrichment
    const allProfiles = await ctx.db.query("staffProfiles").collect();
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));

    // Filter out students and enrich with profile data
    return users
      .filter((u: any) => u.role !== "student")
      .map((u: any) => {
        const profile = profileMap.get(u._id);
        return {
          ...u,
          roles: profile?.roles ?? (u.role === "admin" ? ["admin", "staff"] : ["staff"]),
          title: profile?.title,
          phone: profile?.phone,
          departmentId: profile?.departmentId,
          staffNumber: profile?.staffNumber,
          profileStatus: profile?.status ?? "active",
          profileId: profile?._id,
          // Banning fields from Better Auth user table
          banned: u.banned ?? false,
          banReason: u.banReason,
          banExpires: u.banExpires,
        };
      });
  },
});

// ─────────────────────────────────────────────────────────
// ACTIONS (require external calls like password hashing)
// ─────────────────────────────────────────────────────────

/**
 * Create a new staff member.
 * Creates the Better Auth user AND a staffProfiles record with roles.
 */
export const createStaff = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    roles: v.array(v.string()),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx);

    // Determine the Better Auth role — "admin" if roles include it, otherwise "user"
    const betterAuthRole = args.roles.includes("admin") ? "admin" : "user";

    // @ts-ignore - The admin plugin is enabled but the InferAPI type is not picking it up in this context
    const user = await (auth.api as any).admin.createUser({
      body: {
        email: args.email,
        password: args.password || "UniSystem2026!",
        name: `${args.firstName} ${args.lastName}`,
        role: betterAuthRole as "user" | "admin",
        data: {
          emailVerified: true,
        },
      },
    });

    // Now create the staff profile with the roles array
    if (user?.user?.id) {
      await ctx.runMutation(internal.users._createStaffProfile, {
        userId: user.user.id,
        roles: args.roles,
        title: args.title,
        phone: args.phone,
      });

      // LOG the action using the mutation-based helper
      // Since this is an action, we run an internal mutation to log
      await ctx.runMutation(internal.system._logAction, {
          userId: user.user.id, // Or current admin ID if we had it, but createStaff is often used for self or by admin
          userName: user.user.name || args.firstName,
          userEmail: user.user.email,
          action: "CREATE_STAFF",
          resource: "users",
          details: `Created staff member ${args.firstName} ${args.lastName} (${args.email})`
      });
    }

    return user;
  },
});

// ─────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────

/**
 * Internal mutation to create a staff profile record.
 * Called by the createStaff action after the Better Auth user is created.
 */
export const _createStaffProfile = internalMutation({
  args: {
    userId: v.string(),
    roles: v.array(v.string()),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staffProfiles", {
      userId: args.userId,
      roles: args.roles,
      title: args.title,
      phone: args.phone,
      status: "active",
    });
  },
});

/**
 * Update an existing staff member's profile.
 * Can update roles, title, phone, department, status.
 */
/**
 * Shared logic for updating staff profile.
 */
async function updateStaffLogic(ctx: any, args: any) {
  const profile = await ctx.db
    .query("staffProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
    .unique();

  if (!profile) {
    // Create a new profile if one doesn't exist yet
    return await ctx.db.insert("staffProfiles", {
      userId: args.userId,
      roles: args.roles ?? ["staff"],
      title: args.title,
      phone: args.phone,
      departmentId: args.departmentId,
      staffNumber: args.staffNumber,
      status: args.status ?? "active",
    });
  }

  // Patch the existing profile
  const updates: Record<string, any> = {};
  if (args.roles !== undefined) updates.roles = args.roles;
  if (args.title !== undefined) updates.title = args.title;
  if (args.phone !== undefined) updates.phone = args.phone;
  if (args.departmentId !== undefined) updates.departmentId = args.departmentId;
  if (args.staffNumber !== undefined) updates.staffNumber = args.staffNumber;
  if (args.status !== undefined) updates.status = args.status;

  await ctx.db.patch(profile._id, updates);

  await logAction(ctx, {
    action: "UPDATE_STAFF",
    resource: "staffProfiles",
    details: `Updated staff profile for user ${args.userId}: ${Object.keys(updates).join(", ")}`,
  });

  return profile._id;
}

/**
 * Internal mutation to patch the auth user record directly.
 * Used for banning/unbanning to avoid Better Auth adapter type issues.
 */
export const _patchAuthUserInternal = internalMutation({
  args: {
    userId: v.string(),
    updates: v.any(), // Type safe inside handler
  },
  handler: async (ctx, args) => {
    // Better Auth users in Convex use their ID as the document ID
    await ctx.db.patch(args.userId as any, args.updates);
  },
});

/**
 * Internal mutation to revoke all sessions for a user.
 */
export const _revokeSessionsInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("session")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }
  },
});

/**
 * Public mutation to update a staff member's profile.
 */
export const updateStaff = mutation({
  args: {
    userId: v.string(),
    roles: v.optional(v.array(v.string())),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    staffNumber: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    return await updateStaffLogic(ctx, args);
  },
});

/**
 * Internal mutation that does the actual work.
 */
export const _updateStaffInternal = internalMutation({
  args: {
    userId: v.string(),
    roles: v.optional(v.array(v.string())),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    staffNumber: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    return await updateStaffLogic(ctx, args);
  },
});

/**
 * Delete a staff member.
 * Removes both the Better Auth user and the staff profile.
 */
export const deleteStaff = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Delete the Better Auth user record
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [
          {
            field: "_id",
            value: args.id,
            operator: "eq",
          },
        ],
      },
    });

    // Also delete the staff profile if it exists
    const profile = await ctx.db
      .query("staffProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.id))
      .unique();

    if (profile) {
      await ctx.db.delete(profile._id);
    }

    await logAction(ctx, {
      action: "DELETE_STAFF",
      resource: "users",
      details: `Deleted staff member and profile with ID: ${args.id}`
    });

    return { success: true };
  },
});

/**
 * Ban a staff member.
 * Sets banned status in Better Auth and revokes all sessions.
 */
export const banStaff = action({
  args: {
    userId: v.string(),
    reason: v.string(),
    expires: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx);

    // 1. Kick the user out (revoke all sessions)
    await ctx.runMutation(internal.users._revokeSessionsInternal, {
      userId: args.userId,
    });

    // 2. Set the ban settings in Better Auth
    // We do this via a native mutation to ensure type safety and reliability
    await ctx.runMutation(internal.users._patchAuthUserInternal, {
      userId: args.userId,
      updates: {
        banned: true,
        banReason: args.reason,
        banExpires: args.expires ?? null,
      },
    });

    // 3. Update staff profile to inactive
    await ctx.runMutation(internal.users._updateStaffInternal, {
      userId: args.userId,
      status: "inactive",
    });

    // 4. Log
    await ctx.runMutation(internal.system._logAction, {
        userId: args.userId,
        userName: "ADMIN", // Simplified
        userEmail: "admin@ecu-ssd.org",
        action: "BAN_STAFF",
        resource: "users",
        details: `Banned staff member ${args.userId}. Reason: ${args.reason}`
    });

    return { success: true };
  },
});

/**
 * Unban a staff member.
 */
export const unbanStaff = action({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx);

    // 1. Remove ban in Better Auth
    await ctx.runMutation(internal.users._patchAuthUserInternal, {
      userId: args.userId,
      updates: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });

    // 2. Restore staff profile to active
    await ctx.runMutation(internal.users._updateStaffInternal, {
      userId: args.userId,
      status: "active",
    });

    // 3. Log
    await ctx.runMutation(internal.system._logAction, {
        userId: args.userId,
        userName: "ADMIN",
        userEmail: "admin@ecu-ssd.org",
        action: "UNBAN_STAFF",
        resource: "users",
        details: `Unbanned staff member ${args.userId}`
    });

    return { success: true };
  },
});
