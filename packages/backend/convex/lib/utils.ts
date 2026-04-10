import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * ─────────────────────────────────────────────────────────
 * ECU SECURITY GUARDRAILS
 * ─────────────────────────────────────────────────────────
 * These helpers are the mandatory standard for all permission checks.
 * They ensure consistent error handling (ConvexError) and centralized logic.
 */

/**
 * Ensure the caller is authenticated.
 * Returns the identity subject (userId).
 */
export async function assertAuthenticated(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      message: "Authentication required.",
      code: "UNAUTHORIZED",
      tip: "Please sign in to your ECU staff account.",
    });
  }
  return identity.subject;
}

/**
 * Ensure the caller has a specific role in their staff profile.
 * Standard roles: "admin", "staff", "registrar", "dean", etc.
 * Supports Query, Mutation, and Action contexts.
 */
export async function assertRole(
  ctx: any,
  allowedRoles: string[]
) {
  const userId = await assertAuthenticated(ctx);

  let profile;
  if (ctx.db) {
    // Query or Mutation Context
    profile = await ctx.db
      .query("staffProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();
  } else {
    // Action Context (uses ctx.runQuery)
    profile = await ctx.runQuery(internal.users._getStaffProfileInternal, { userId });
  }

  if (!profile) {
    throw new ConvexError({
      message: "Staff profile not found.",
      code: "NOT_FOUND",
      tip: "Contact the administrator if you believe your profile is missing.",
    });
  }

  if (profile.status === "inactive") {
    throw new ConvexError({
      message: "Account is inactive or suspended.",
      code: "FORBIDDEN",
    });
  }

  // Check if at least one role matches
  const hasRole = profile.roles.some((role: string) => allowedRoles.includes(role));

  if (!hasRole) {
    throw new ConvexError({
      message: `Permission denied. Required roles: ${allowedRoles.join(", ")}`,
      code: "FORBIDDEN",
      tip: "You don't have the necessary clearance for this action.",
    });
  }

  return { userId, profile };
}

/**
 * Convenience helper for mandatory admin actions.
 * Supports Query, Mutation, and Action contexts.
 */
export async function assertAdmin(ctx: any) {
  return await assertRole(ctx, ["admin"]);
}
