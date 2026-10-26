import { defineTable } from "convex/server";
import { v } from "convex/values";

const timestamps = { createdAt: v.number(), updatedAt: v.number() };

export const staffPayrollTables = {
  staffPayPeriods: defineTable({
    label: v.string(),
    month: v.number(),
    year: v.number(),
    payDate: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("closed"),
    ),
    ...timestamps,
  })
    .index("by_year_month", ["year", "month"])
    .index("by_status_payDate", ["status", "payDate"]),

  staffPayStatements: defineTable({
    staffProfileId: v.id("staffProfiles"),
    payPeriodId: v.id("staffPayPeriods"),
    currency: v.union(v.literal("SSP"), v.literal("USD")),
    basicPay: v.number(),
    allowances: v.array(v.object({ label: v.string(), amount: v.number() })),
    deductions: v.array(v.object({ label: v.string(), amount: v.number() })),
    grossPay: v.number(),
    netPay: v.number(),
    status: v.union(
      v.literal("published"),
      v.literal("paid"),
      v.literal("void"),
    ),
    statementDate: v.number(),
    paidAt: v.optional(v.number()),
    paymentReference: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_staff_period", ["staffProfileId", "payPeriodId"])
    .index("by_staff_statementDate", ["staffProfileId", "statementDate"])
    .index("by_period_status", ["payPeriodId", "status"]),

  staffPayrollNotices: defineTable({
    audience: v.union(v.literal("all_staff"), v.literal("individual")),
    staffProfileId: v.optional(v.id("staffProfiles")),
    title: v.string(),
    body: v.string(),
    publishedAt: v.number(),
    expiresAt: v.optional(v.number()),
    createdByProfileId: v.id("staffProfiles"),
    ...timestamps,
  })
    .index("by_audience_publishedAt", ["audience", "publishedAt"])
    .index("by_staff_publishedAt", ["staffProfileId", "publishedAt"]),
};
