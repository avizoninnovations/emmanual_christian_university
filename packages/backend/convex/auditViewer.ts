//  Audit Viewer
// Session-based auth with filtering capabilities

import { query } from "./_generated/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { getAuthUser, userHasCapability } from "./authHelpers"

export const getLogs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sessionId: v.optional(v.string()),
    // Filter parameters
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.number()), // timestamp
    endDate: v.optional(v.number()), // timestamp
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId)
    if (!user) return { page: [], isDone: true, continueCursor: "", unauthorized: true }

    // Use helper to check capability (handles System Admin, wildcards, etc.)
    if (!userHasCapability(user, "access:audit-logs") && !userHasCapability(user, "access:system:audit-logs")) {
      return { page: [], isDone: true, continueCursor: "", unauthorized: true }
    }

    let baseQuery;

    if (args.userId) {
      baseQuery = ctx.db.query("auditLogs").withIndex("by_user", q => q.eq("userId", args.userId!))
    } else {
      baseQuery = ctx.db.query("auditLogs").withIndex("by_timestamp")
    }

    const logs = await baseQuery
      .order("desc")
      .filter(q => {
        let op = q.gt(q.field("timestamp"), 0) // dummy
        if (args.startDate) op = q.and(op, q.gte(q.field("timestamp"), args.startDate))
        if (args.endDate) op = q.and(op, q.lte(q.field("timestamp"), args.endDate))

        // Note: Convex standard filters don't support partial string contains.
        // For now using exact match on filtered fields if provided.
        if (args.action) op = q.and(op, q.eq(q.field("action"), args.action))
        if (args.resource) op = q.and(op, q.eq(q.field("resource"), args.resource))

        return op
      })
      .paginate(args.paginationOpts)

    return {
      ...logs,
      unauthorized: false,
      page: await Promise.all(
        logs.page.map(async (log) => {
          const logUser = (await ctx.db.get(log.userId)) as any
          return {
            ...log,
            userName: logUser ? `${logUser.firstName} ${logUser.lastName}` : "Unknown",
            userRole: logUser ? logUser.role : "Unknown",
          }
        }),
      ),
    }
  },
})

export const getAuditLogsCount = query({
  args: {
    sessionId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId)

    // Auth Check
    const hasAccess = user && (userHasCapability(user, "access:audit-logs") || userHasCapability(user, "access:system:audit-logs"));

    if (!hasAccess) {
      return { total: 0, unauthorized: true }
    }

    let baseQuery;
    if (args.userId) {
      baseQuery = ctx.db.query("auditLogs").withIndex("by_user", q => q.eq("userId", args.userId!))
    } else {
      baseQuery = ctx.db.query("auditLogs")
    }

    const logs = await baseQuery
      .filter(q => {
        let op = q.gt(q.field("timestamp"), 0)
        if (args.startDate) op = q.and(op, q.gte(q.field("timestamp"), args.startDate))
        if (args.endDate) op = q.and(op, q.lte(q.field("timestamp"), args.endDate))
        if (args.action) op = q.and(op, q.eq(q.field("action"), args.action))
        if (args.resource) op = q.and(op, q.eq(q.field("resource"), args.resource))
        return op
      })
      .collect()

    return { total: logs.length, unauthorized: false }
  },
})

export const getAuditUsers = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId)
    // Auth Check
    const hasAccess = user && (userHasCapability(user, "access:audit-logs") || userHasCapability(user, "access:system:audit-logs"));

    if (!hasAccess) {
      return []
    }

    // Get unique users from audit logs
    const logs = await ctx.db.query("auditLogs").collect()
    const userIds = [...new Set(logs.map((log) => log.userId))]

    const users = await Promise.all(
      userIds.map(async (id) => {
        const u = (await ctx.db.get(id)) as any
        return u
          ? {
            id: u._id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
          }
          : null
      }),
    )

    return users.filter(Boolean)
  },
})

export const getAuditStats = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId)
    // Auth Check
    const hasAccess = user && (userHasCapability(user, "access:audit-logs") || userHasCapability(user, "access:system:audit-logs"));

    if (!hasAccess) {
      return { total: 0, today: 0, byAction: {}, byResource: {}, unauthorized: true }
    }

    const logs = await ctx.db.query("auditLogs").collect()

    // Count by action type
    const actionCounts: Record<string, number> = {}
    const resourceCounts: Record<string, number> = {}

    logs.forEach((log) => {
      const actionType = log.action.split("_")[0] // CREATE, UPDATE, DELETE
      actionCounts[actionType] = (actionCounts[actionType] || 0) + 1
      resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1
    })

    // Get today's count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = logs.filter((log) => log.timestamp >= today.getTime()).length

    return {
      total: logs.length,
      today: todayCount,
      byAction: actionCounts,
      byResource: resourceCounts,
      unauthorized: false
    }
  },
})

import { mutation } from "./_generated/server";

export const createDummyLog = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    if (!user) return "No users found";

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "DEBUG_TEST",
      resource: "debug",
      details: "This is a debug log entry",
      timestamp: Date.now(),
    });
    return "Log inserted";
  }
});
