import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import type { QueryCtx } from "./_generated/server.js";
import { assertAuthenticated } from "./lib/utils.js";

async function getActiveStaffProfile(ctx: QueryCtx) {
  const userId = await assertAuthenticated(ctx);
  const profile = await ctx.db
    .query("staffProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!profile || profile.status !== "active")
    throw new ConvexError(
      "An active staff profile is required to view payroll records.",
    );
  return profile;
}

export const getMyFinanceOverview = query({
  args: { asOf: v.number() },
  handler: async (ctx, args) => {
    const profile = await getActiveStaffProfile(ctx);
    const [statements, globalNotices, individualNotices] = await Promise.all([
      ctx.db
        .query("staffPayStatements")
        .withIndex("by_staff_statementDate", (q) =>
          q.eq("staffProfileId", profile._id),
        )
        .order("desc")
        .take(6),
      ctx.db
        .query("staffPayrollNotices")
        .withIndex("by_audience_publishedAt", (q) =>
          q.eq("audience", "all_staff"),
        )
        .order("desc")
        .take(10),
      ctx.db
        .query("staffPayrollNotices")
        .withIndex("by_staff_publishedAt", (q) =>
          q.eq("staffProfileId", profile._id),
        )
        .order("desc")
        .take(10),
    ]);
    const visibleStatements = statements.filter(
      (statement) => statement.status !== "void",
    );
    const visibleNotices = [...globalNotices, ...individualNotices]
      .filter(
        (notice) =>
          notice.publishedAt <= args.asOf &&
          (!notice.expiresAt || notice.expiresAt >= args.asOf),
      )
      .sort((left, right) => right.publishedAt - left.publishedAt)
      .slice(0, 10);
    const periods = await Promise.all(
      [
        ...new Set(visibleStatements.map((statement) => statement.payPeriodId)),
      ].map((id) => ctx.db.get(id)),
    );
    const periodLabels = new Map(
      periods.filter(Boolean).map((period) => [period!._id, period!.label]),
    );
    return {
      latestStatement: visibleStatements[0]
        ? {
            ...visibleStatements[0],
            periodLabel:
              periodLabels.get(visibleStatements[0].payPeriodId) ??
              "Pay period unavailable",
          }
        : null,
      recentStatements: visibleStatements.map((statement) => ({
        ...statement,
        periodLabel:
          periodLabels.get(statement.payPeriodId) ?? "Pay period unavailable",
      })),
      notices: visibleNotices,
    };
  },
});

export const getMyPayStatements = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await getActiveStaffProfile(ctx);
    const page = await ctx.db
      .query("staffPayStatements")
      .withIndex("by_staff_statementDate", (q) =>
        q.eq("staffProfileId", profile._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    const statements = page.page.filter(
      (statement) => statement.status !== "void",
    );
    const periods = await Promise.all(
      [...new Set(statements.map((statement) => statement.payPeriodId))].map(
        (id) => ctx.db.get(id),
      ),
    );
    const periodLabels = new Map(
      periods.filter(Boolean).map((period) => [period!._id, period!.label]),
    );
    return {
      ...page,
      page: statements.map((statement) => ({
        ...statement,
        periodLabel:
          periodLabels.get(statement.payPeriodId) ?? "Pay period unavailable",
      })),
    };
  },
});

export const getMyPayStatementDetails = query({
  args: { statementId: v.id("staffPayStatements") },
  handler: async (ctx, args) => {
    const profile = await getActiveStaffProfile(ctx);
    const statement = await ctx.db.get(args.statementId);
    if (
      !statement ||
      statement.staffProfileId !== profile._id ||
      statement.status === "void"
    )
      throw new ConvexError(
        "This pay statement is not available to your account.",
      );
    const period = await ctx.db.get(statement.payPeriodId);
    return { statement, period };
  },
});
