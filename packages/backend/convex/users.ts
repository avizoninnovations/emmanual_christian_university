import { action, query, internalQuery } from "./_generated/server.js";
import { mutation, internalMutation } from "./lib/mutations";
import { v } from "convex/values";
import { createAuth } from "./betterAuth/auth.js";
import { components, internal } from "./_generated/api.js";
import { logAction } from "./audit_logger";
import { assertAdmin, assertRole, assertAuthenticated } from "./lib/utils";

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
      banned: authUser.banned ?? false,
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
    await assertRole(ctx, ["admin", "staff"]);
    // Fetch users from Better Auth component
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 1000 },
    });
    const users = result?.page || [];

    // Fetch all staff profiles for enrichment
    const allProfiles = await ctx.db.query("staffProfiles").collect();
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));

    // Fetch departments for name resolution
    const departments = await ctx.db.query("departments").collect();
    const deptMap = new Map(departments.map((d) => [d._id, d.name]));

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
          departmentName: profile?.departmentId ? deptMap.get(profile.departmentId as any) : undefined,
          staffNumber: profile?.staffNumber,
          staffId: profile?.staffId,
          profileStatus: profile?.status ?? "active",
          profileId: profile?._id,
          updatedAt: profile?.updatedAt,
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
    staffId: v.optional(v.string()),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
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
        staffId: args.staffId,
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
    staffId: v.optional(v.string()),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staffProfiles", {
      userId: args.userId,
      roles: args.roles,
      staffId: args.staffId,
      title: args.title,
      phone: args.phone,
      status: "active",
    });
  },
});

/**
 * Internal query to check staff profile. 
 * Used by lib/utils for action-based role checks.
 */
export const _getStaffProfileInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staffProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
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

  // Cross-patch the Better Auth User Record (lives in component storage, NOT main db)
  const authUpdates: Record<string, any> = {};
  
  // Fetch existing user for both name resolution and audit logging
  const userRow = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: args.userId, operator: "eq" }],
  }) as any;

  if (args.firstName !== undefined || args.lastName !== undefined) {
    if (userRow) {
      const existingName = userRow.name || "";
      const split = existingName.split(" ");
      const oldFirst = split[0] || "";
      const oldLast = split.slice(1).join(" ") || "";
      
      const newFirst = args.firstName !== undefined ? args.firstName : oldFirst;
      const newLast = args.lastName !== undefined ? args.lastName : oldLast;
      authUpdates.name = `${newFirst} ${newLast}`.trim();
    }
  }

  if (args.email !== undefined) authUpdates.email = args.email;

  if (Object.keys(authUpdates).length > 0) {
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: authUpdates,
      },
    });
  }

  // Resolve name for readable logging
  const targetName = userRow?.name || args.userId;

  // Fetch profile for official Staff ID
  const staffProfile = await ctx.db
    .query("staffProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
    .unique();

  await logAction(ctx, {
    action: "UPDATE_STAFF",
    resource: "staffProfiles",
    details: `Updated staff profile for ${targetName} (ID: ${staffProfile?.staffId || "N/A"}): ${Object.keys(updates).join(", ")}`,
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
    // Better Auth users live in the component's isolated storage
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: args.updates,
      },
    });
  },
});

/**
 * Internal mutation to revoke all sessions for a user.
 */
export const _revokeSessionsInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Sessions live in component storage — use the adapter to find and delete them
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "session",
      paginationOpts: { cursor: null, numItems: 1000 },
    }) as any;

    const sessions = (result?.page || []).filter(
      (s: any) => s.userId === args.userId
    );

    for (const s of sessions) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "session",
          where: [{ field: "_id", value: s._id, operator: "eq" }],
        },
      });
    }
  },
});

/**
 * Public mutation to update a staff member's profile.
 */
export const updateStaff = mutation({
  args: {
    userId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    roles: v.optional(v.array(v.string())),
    staffId: v.optional(v.string()),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    staffNumber: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "staff"]);
    return await updateStaffLogic(ctx, args);
  },
});

/**
 * Internal mutation that does the actual work.
 */
export const _updateStaffInternal = internalMutation({
  args: {
    userId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    roles: v.optional(v.array(v.string())),
    staffId: v.optional(v.string()),
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
    await assertAdmin(ctx);
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

    // Resolve name/ID for logging before deletion
    const userRow = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.id, operator: "eq" }],
    }) as any;
    const targetInfo = userRow?.name ? `${userRow.name} (${profile?.staffId || "N/A"})` : args.id;

    if (profile) {
      await ctx.db.delete(profile._id);
    }

    await logAction(ctx, {
      action: "DELETE_STAFF",
      resource: "users",
      details: `Permanently removed staff member record for ${targetInfo}`
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
    await assertAdmin(ctx);

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
    const userRow = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.userId, operator: "eq" }],
    }) as any;
    const profile = await ctx.runQuery(internal.users._getStaffProfileInternal, { userId: args.userId });

    await ctx.runMutation(internal.system._logAction, {
        userId: args.userId,
        userName: "ADMIN", 
        userEmail: "admin@ecu-ssd.org",
        action: "BAN_STAFF",
        resource: "users",
        details: `Banned staff member ${userRow?.name || "Personnel"} (ID: ${profile?.staffId || "N/A"}). Reason: ${args.reason}`
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
    await assertAdmin(ctx);

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
    const userRow = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.userId, operator: "eq" }],
    }) as any;
    const profile = await ctx.runQuery(internal.users._getStaffProfileInternal, { userId: args.userId });

    await ctx.runMutation(internal.system._logAction, {
        userId: args.userId,
        userName: "ADMIN",
        userEmail: "admin@ecu-ssd.org",
        action: "UNBAN_STAFF",
        resource: "users",
        details: `Lifted ban for staff member ${userRow?.name || "Personnel"} (ID: ${profile?.staffId || "N/A"})`
    });

    return { success: true };
  },
});
