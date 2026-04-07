// Simple auth helpers for session-based authentication
import type { QueryCtx, MutationCtx } from "./_generated/server"
import type { Id, Doc } from "./_generated/dataModel"
import { LEGACY_MAPPINGS, ALL_PERMISSION_KEYS } from "./permissions_definitions"

import { authComponent } from "./auth";

type User = Doc<"users">;

/**
 * Get authenticated user using Better Auth
 */
export async function getAuthUser(ctx: any, ignoredSessionId?: any): Promise<User | null> {
  try {
    const sessionObj = await authComponent.getAuthUser(ctx);
    if (!sessionObj?.email) return null;

    const user = await ctx.db.query("users")
      .withIndex("by_email", (q: any) => q.eq("email", sessionObj.email))
      .first() as User | null;

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (e) {
    return null;
  }
}

/**
 * Core logic to get a user's total capabilities including role defaults.
 */
export function getEffectiveCapabilities(user: User | null): string[] {
  if (!user) return []
  return [...(user.capabilities || [])]
}

/**
 * Sync function to check if a user has a specific capability without throwing
 */
export function userHasCapability(user: User | null, requiredCapability: string): boolean {
  if (!user) return false
  const reqCap = requiredCapability.trim()
  const effectiveCapabilities = getEffectiveCapabilities(user)
  const uRole = (user.role || "").trim().toLowerCase()
  // 0. SystemAdmin Bypass
  if (uRole === "systemadmin") return true;

  // 1. Exact Match
  if (effectiveCapabilities.includes(reqCap)) return true;


  // 1.5. Legacy / Bridge Mapping (using central definitions)
  if (LEGACY_MAPPINGS[reqCap]) {
    if (LEGACY_MAPPINGS[reqCap].some(legacy => effectiveCapabilities.includes(legacy))) {
      return true
    }
  }

  // 2. Wildcard Match (e.g. students:* grants students:manage_x)
  const parts = reqCap.split(":")
  if (parts.length > 1) {
    const moduleWildcard = `${parts[0]}:*`
    if (effectiveCapabilities.includes(moduleWildcard)) return true

    if (parts.length > 2) {
      const funcWildcard = `${parts[0]}:${parts[1]}:*`
      if (effectiveCapabilities.includes(funcWildcard)) return true
    }
  }

  // 3. Hierarchical Inference (e.g. access:master-data grants access:master-data:dormitories)
  // And functionally: access:master-data grants master-data:manage_x via the bridge
  if (reqCap.startsWith("access:")) {
    const capParts = reqCap.split(":")
    for (let i = 2; i < capParts.length; i++) {
      const parentPerm = capParts.slice(0, i).join(":")
      if (effectiveCapabilities.includes(parentPerm)) {
        // GRANULARITY FIX: If both the required permission and the parent are explicit tokens
        // in the master definition list, do NOT inherit. This allows turning off a sub-feature
        // while keeping the module access ON.
        const isSelfDefinition = ALL_PERMISSION_KEYS.has(reqCap);
        const isParentDefinition = ALL_PERMISSION_KEYS.has(parentPerm);

        if (isSelfDefinition && isParentDefinition) {
          continue; // Skip inheritance between two explicit toggles
        }

        return true
      }
    }
  }


  // 5. Recursive check for children of the required capability
  // (e.g. if we need "finance:manage_fees" and we have "access:finance:fees")
  // This is already partially handled by LEGACY_MAPPINGS but we check if any 
  // capability starting with the required prefix is present.
  // Actually, for safety, we only do this for specific categories or avoid it 
  // to prevent over-permissioning.

  return false
}


/**
 * Check if user has specific capability
 */
export async function checkCapability(
  ctx: QueryCtx | MutationCtx,
  sessionId: any,
  requiredCapability: string
): Promise<User | null> {
  const user = await getAuthUser(ctx, sessionId)
  if (!user) return null;

  const uRole = (user.role || "").trim().toLowerCase()
  if (uRole === "systemadmin") return user;

  const effectiveCapabilities = getEffectiveCapabilities(user)

  const reqCap = requiredCapability.trim()


  // 2. Use userHasCapability for all matching logic (Wildcards, Legacy, Hierarchical, Functional Inferences)
  const hasCap = userHasCapability(user, reqCap);
  if (!hasCap) {
    console.log(`[AUTH DEBUG] Missing capability: ${reqCap}. User role: ${user.role}, Caps: ${user.capabilities?.join(', ')}`);
  }
  if (hasCap) return user

  // 3. Special "Page Access" checks (for high-level UI guards)
  // Skip fuzzy matching for broad hub pages to prevent leaking access to ALL children
  if (reqCap.startsWith("access:")) {
    const pageId = reqCap.replace("access:", "")

    // Fuzzy matching: grant access if user has ANY specific permission for this module
    const hasAnyModulePermission = effectiveCapabilities.some(cap => {
      if (cap.startsWith(`${pageId}:`) || cap === pageId) return true
      if (cap.startsWith(`${reqCap}:`)) return true
      return false
    })
    if (hasAnyModulePermission) return user
  }

  return null; // Silent failure
}

/**
 * Check if user has any of the specified capabilities
 */
export async function checkAnyCapability(
  ctx: QueryCtx | MutationCtx,
  sessionId: any,
  requiredCapabilities: string[]
): Promise<User | null> {
  const user = await getAuthUser(ctx, sessionId);
  if (!user) return null;

  for (const cap of requiredCapabilities) {
    if (userHasCapability(user, cap)) return user;
  }

  return null; // Silent failure
}

/**
 * Standardized non-throwing auth check for queries.
 * Returns { user, unauthorized: boolean }
 */
export async function checkQueryAuth(
  ctx: QueryCtx,
  sessionId: any,
  requiredCapability?: string
): Promise<{ user: User | null; unauthorized: boolean }> {
  const user = requiredCapability
    ? await checkCapability(ctx, sessionId, requiredCapability)
    : await getAuthUser(ctx, sessionId);

  if (!user) {
    return { user: null, unauthorized: true };
  }
  return { user, unauthorized: false };
}

/**
 * Standardized non-throwing any-capability auth check for queries.
 */
export async function checkAnyQueryAuth(
  ctx: QueryCtx,
  sessionId: any,
  requiredCapabilities: string[]
): Promise<{ user: User | null; unauthorized: boolean }> {
  const user = await checkAnyCapability(ctx, sessionId, requiredCapabilities);

  if (!user) {
    return { user: null, unauthorized: true };
  }
  return { user, unauthorized: false };
}

/**
 * Audit logging - writes to auditLogs table
 * @param ctx - Mutation context
 * @param userId - User performing the action
 * @param action - Action type (CREATE_STUDENT, UPDATE_CLASS, etc.)
 * @param details - Human-readable description
 * @param resource - Optional resource type for categorization
 */
export async function logAction(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  details?: string,
  resource?: string,
) {
  // Extract resource from action if not provided (e.g., CREATE_STUDENT -> students)
  const inferredResource = resource || action.split("_")[1]?.toLowerCase() || "system"

  await ctx.db.insert("auditLogs", {
    userId,
    action,
    resource: inferredResource,
    details: details || "",
    timestamp: Date.now(),
  })
}
/**
 * Simple rate limiter for mutations
 * @param ctx - Mutation context
 * @param key - Unique key (e.g., 'user_id:action')
 * @param maxHits - Max allowed hits in the window
 * @param windowSeconds - Time window in seconds
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  maxHits: number = 5,
  windowSeconds: number = 10
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now()
  const windowStart = now - (windowSeconds * 1000)

  // 1. Clean up old entries
  const oldEntries = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", q => q.eq("key", key))
    .filter(q => q.lt(q.field("timestamp"), windowStart))
    .collect()

  for (const entry of oldEntries) {
    await ctx.db.delete(entry._id)
  }

  // 2. Count current hits
  const currentHits = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", q => q.eq("key", key))
    .filter(q => q.gte(q.field("timestamp"), windowStart))
    .collect()

  if (currentHits.length >= maxHits) {
    return { success: false, error: "System is a bit busy right now. Please wait a moment before trying again." };
  }

  // 3. Record new hit
  await ctx.db.insert("rateLimits", {
    key,
    timestamp: now,
  })

  return { success: true };
}
