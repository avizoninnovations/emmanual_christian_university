import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api.js";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { assertRole } from "./lib/utils.js";
import { logAction } from "./audit_logger.js";

const payrollRoles = ["admin", "finance", "bursar"];
const earningsValidator = v.array(v.object({ label: v.string(), amount: v.number() }));

export const getPayrollManagement = query({
  args: { payPeriodId: v.optional(v.id("staffPayPeriods")) },
  handler: async (ctx, args) => {
    await assertRole(ctx, payrollRoles);
    const periods = await ctx.db.query("staffPayPeriods").order("desc").take(36);
    const selectedPeriod = args.payPeriodId
      ? await ctx.db.get(args.payPeriodId)
      : periods[0] ?? null;
    const profiles = await ctx.db
      .query("staffProfiles")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(500);
    const [usersResult, statements] = await Promise.all([
      ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "user",
        paginationOpts: { cursor: null, numItems: 2000 },
      }),
      selectedPeriod
        ? ctx.db
            .query("staffPayStatements")
            .withIndex("by_period_status", (q) => q.eq("payPeriodId", selectedPeriod._id))
            .collect()
        : Promise.resolve([]),
    ]);
    const users = new Map<string, { name: string; email: string }>();
    const userRows = (usersResult?.page ?? []) as Array<{ _id: string; name?: string; email?: string }>;
    for (const user of userRows) users.set(user._id, { name: user.name ?? "", email: user.email ?? "" });
    const statementsByProfileId = new Map(statements.map((statement) => [statement.staffProfileId, statement]));
    const staff = profiles
      .map((profile) => ({
        staffProfileId: profile._id,
        staffId: profile.staffId,
        title: profile.title,
        roles: profile.roles,
        name: users.get(profile.userId)?.name ?? profile.staffId,
        email: users.get(profile.userId)?.email ?? "",
        statement: statementsByProfileId.get(profile._id) ?? null,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      periods,
      selectedPeriod,
      staff,
      totals: {
        staffCount: staff.length,
        preparedCount: staff.filter((person) => person.statement && person.statement.status !== "void").length,
        paidCount: staff.filter((person) => person.statement?.status === "paid").length,
        netPayroll: staff.reduce((total, person) => total + (person.statement?.status !== "void" ? person.statement?.netPay ?? 0 : 0), 0),
      },
    };
  },
});

export const createPayrollPeriod = mutation({
  args: { month: v.number(), year: v.number(), payDate: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await assertRole(ctx, payrollRoles);
    if (!Number.isInteger(args.month) || args.month < 1 || args.month > 12) {
      throw new ConvexError("Choose a valid payroll month.");
    }
    if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100) {
      throw new ConvexError("Choose a valid payroll year.");
    }
    if (!isIsoDate(args.payDate)) throw new ConvexError("Enter a valid pay date.");
    const existing = await ctx.db
      .query("staffPayPeriods")
      .withIndex("by_year_month", (q) => q.eq("year", args.year).eq("month", args.month))
      .unique();
    if (existing) throw new ConvexError("A payroll period already exists for that month.");

    const label = new Date(Date.UTC(args.year, args.month - 1, 1)).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const now = Date.now();
    const id = await ctx.db.insert("staffPayPeriods", {
      label,
      month: args.month,
      year: args.year,
      payDate: args.payDate,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "CREATE_PAYROLL_PERIOD",
      resource: "staffPayPeriods",
      details: `${profile.staffId} created payroll period ${label}.`,
    });
    return id;
  },
});

export const savePayStatement = mutation({
  args: {
    payPeriodId: v.id("staffPayPeriods"),
    staffProfileId: v.id("staffProfiles"),
    currency: v.union(v.literal("SSP"), v.literal("USD")),
    basicPay: v.number(),
    allowances: earningsValidator,
    deductions: earningsValidator,
  },
  handler: async (ctx, args) => {
    const { profile } = await assertRole(ctx, payrollRoles);
    const period = await ctx.db.get(args.payPeriodId);
    if (!period || period.status === "closed") throw new ConvexError("Closed payroll periods cannot be changed.");
    const staff = await ctx.db.get(args.staffProfileId);
    if (!staff || staff.status !== "active") {
      throw new ConvexError("Choose an active staff member for this pay statement.");
    }
    validateMoney(args.basicPay, "Basic pay");
    validateLineItems(args.allowances, "allowance");
    validateLineItems(args.deductions, "deduction");
    const grossPay = args.basicPay + sumItems(args.allowances);
    const netPay = grossPay - sumItems(args.deductions);
    if (netPay < 0) throw new ConvexError("Deductions cannot exceed gross pay.");

    const existing = await ctx.db
      .query("staffPayStatements")
      .withIndex("by_staff_period", (q) => q.eq("staffProfileId", staff._id).eq("payPeriodId", period._id))
      .unique();
    if (period.status === "published" && existing) {
      throw new ConvexError("Published statements cannot be edited. Contact the Bursar if a correction is needed.");
    }
    if (existing?.status === "paid" || existing?.status === "void") {
      throw new ConvexError("This statement can no longer be changed.");
    }

    const now = Date.now();
    const statement = {
      staffProfileId: staff._id,
      payPeriodId: period._id,
      currency: args.currency,
      basicPay: args.basicPay,
      allowances: args.allowances,
      deductions: args.deductions,
      grossPay,
      netPay,
      status: "published" as const,
      statementDate: now,
      updatedAt: now,
    };
    const statementId = existing
      ? (await ctx.db.patch(existing._id, statement), existing._id)
      : await ctx.db.insert("staffPayStatements", { ...statement, createdAt: now });
    await logAction(ctx, {
      action: existing ? "UPDATE_PAY_STATEMENT" : "PREPARE_PAY_STATEMENT",
      resource: "staffPayStatements",
      details: `${profile.staffId} prepared ${period.label} pay for staff ${staff.staffId}.`,
    });
    return { statementId, grossPay, netPay };
  },
});

export const publishPayrollPeriod = mutation({
  args: { payPeriodId: v.id("staffPayPeriods") },
  handler: async (ctx, args) => {
    const { profile } = await assertRole(ctx, payrollRoles);
    const period = await ctx.db.get(args.payPeriodId);
    if (!period || period.status !== "draft") throw new ConvexError("This payroll period is not a draft.");
    const statements = await ctx.db
      .query("staffPayStatements")
      .withIndex("by_period_status", (q) => q.eq("payPeriodId", period._id))
      .collect();
    const prepared = statements.filter((statement) => statement.status !== "void");
    if (!prepared.length) throw new ConvexError("Prepare at least one pay statement before publishing.");
    const now = Date.now();
    await ctx.db.patch(period._id, { status: "published", updatedAt: now });
    await logAction(ctx, {
      action: "PUBLISH_PAYROLL_PERIOD",
      resource: "staffPayPeriods",
      details: `${profile.staffId} published ${period.label} payroll with ${prepared.length} statements.`,
    });
    return { publishedCount: prepared.length };
  },
});

export const recordStaffPayrollPayment = mutation({
  args: { statementId: v.id("staffPayStatements"), paymentReference: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await assertRole(ctx, payrollRoles);
    const reference = args.paymentReference.trim();
    if (!reference || reference.length > 100) throw new ConvexError("Enter a payment reference of up to 100 characters.");
    const statement = await ctx.db.get(args.statementId);
    if (!statement || statement.status !== "published") {
      throw new ConvexError("Only an outstanding published pay statement can be marked paid.");
    }
    const period = await ctx.db.get(statement.payPeriodId);
    if (!period || period.status !== "published") throw new ConvexError("The payroll period is not open for payment.");
    const now = Date.now();
    await ctx.db.patch(statement._id, {
      status: "paid",
      paidAt: now,
      paymentReference: reference,
      updatedAt: now,
    });
    await logAction(ctx, {
      action: "RECORD_STAFF_PAYROLL_PAYMENT",
      resource: "staffPayStatements",
      details: `${profile.staffId} recorded salary payment for staff ${statement.staffProfileId} (${period.label}; reference ${reference}).`,
    });
    return { paidAt: now };
  },
});

export const closePayrollPeriod = mutation({
  args: { payPeriodId: v.id("staffPayPeriods") },
  handler: async (ctx, args) => {
    const { profile } = await assertRole(ctx, payrollRoles);
    const period = await ctx.db.get(args.payPeriodId);
    if (!period || period.status !== "published") throw new ConvexError("Only a published payroll period can be closed.");
    const statements = await ctx.db
      .query("staffPayStatements")
      .withIndex("by_period_status", (q) => q.eq("payPeriodId", period._id))
      .collect();
    if (!statements.some((statement) => statement.status !== "void")) {
      throw new ConvexError("This payroll period has no statements to close.");
    }
    const outstanding = statements.filter((statement) => statement.status === "published");
    if (outstanding.length) throw new ConvexError(`${outstanding.length} staff payment${outstanding.length === 1 ? " remains" : "s remain"} outstanding.`);
    const now = Date.now();
    await ctx.db.patch(period._id, { status: "closed", updatedAt: now });
    await logAction(ctx, {
      action: "CLOSE_PAYROLL_PERIOD",
      resource: "staffPayPeriods",
      details: `${profile.staffId} closed ${period.label} payroll.`,
    });
  },
});

function validateLineItems(items: Array<{ label: string; amount: number }>, kind: string) {
  for (const item of items) {
    if (!item.label.trim() || item.label.length > 80) throw new ConvexError(`Each ${kind} needs a label of 1 to 80 characters.`);
    validateMoney(item.amount, `A ${kind} amount`);
  }
}

function validateMoney(amount: number, label: string) {
  if (!Number.isFinite(amount) || amount < 0) throw new ConvexError(`${label} must be a non-negative amount.`);
}

function sumItems(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
