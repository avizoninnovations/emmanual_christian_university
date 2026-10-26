import type { MutationCtx } from "../_generated/server.js";

const PAY_MONTH = 10;
const PAY_YEAR = 2026;

/** Creates stable sample payroll so finance staff and employees can exercise the payroll flow. */
export async function seedDemoPayroll(ctx: MutationCtx, staffUserIds: Record<string, string>, now: number) {
  const existingPeriod = await ctx.db
    .query("staffPayPeriods")
    .withIndex("by_year_month", (q) => q.eq("year", PAY_YEAR).eq("month", PAY_MONTH))
    .unique();
  const periodId = existingPeriod?._id ?? await ctx.db.insert("staffPayPeriods", {
    label: "October 2026",
    month: PAY_MONTH,
    year: PAY_YEAR,
    payDate: "2026-10-31",
    status: "published",
    createdAt: now,
    updatedAt: now,
  });
  if (existingPeriod?.status !== undefined && existingPeriod.status !== "published") return 0;

  let inserted = 0;
  const seededStaff = [
    "esther.wani@ecu-ssd.org",
    "admin.demo@ecu-ssd.org",
    "hod.demo@ecu-ssd.org",
    "lecturer.theology.demo@ecu-ssd.org",
    "lecturer.education.demo@ecu-ssd.org",
    "lecturer.business.demo@ecu-ssd.org",
    "lecturer.agriculture.demo@ecu-ssd.org",
  ];

  for (const [index, email] of seededStaff.entries()) {
    const userId = staffUserIds[email];
    if (!userId) continue;
    const profile = await ctx.db.query("staffProfiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile || profile.status !== "active") continue;
    const existingStatement = await ctx.db
      .query("staffPayStatements")
      .withIndex("by_staff_period", (q) => q.eq("staffProfileId", profile._id).eq("payPeriodId", periodId))
      .unique();
    if (existingStatement) continue;

    const basicPay = profile.roles.includes("hod") ? 1_800_000 : profile.roles.includes("finance") ? 1_650_000 : 1_250_000;
    const allowances = [
      { label: "Housing allowance", amount: 180_000 },
      { label: "Transport allowance", amount: 90_000 },
    ];
    const deductions = [
      { label: "Pension contribution", amount: 75_000 },
      { label: "PAYE", amount: 65_000 },
    ];
    const grossPay = basicPay + allowances.reduce((sum, item) => sum + item.amount, 0);
    const netPay = grossPay - deductions.reduce((sum, item) => sum + item.amount, 0);
    const paid = index < 4;
    const statementDate = Date.parse("2026-10-24T09:00:00.000Z");
    await ctx.db.insert("staffPayStatements", {
      staffProfileId: profile._id,
      payPeriodId: periodId,
      currency: "SSP",
      basicPay,
      allowances,
      deductions,
      grossPay,
      netPay,
      status: paid ? "paid" : "published",
      statementDate,
      paidAt: paid ? Date.parse("2026-10-25T12:00:00.000Z") : undefined,
      paymentReference: paid ? `ECU-PAY-2026-10-${String(index + 1).padStart(3, "0")}` : undefined,
      createdAt: now,
      updatedAt: now,
    });
    inserted++;
  }

  return inserted;
}
