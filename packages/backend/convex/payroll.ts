import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability } from "./authHelpers";
import { batchEnrich } from "./dbUtils";

// ===== HELPER: Get previous semester info =====
function getPreviousSemester(semester: number, year: number): { semester: number; year: number } {
    if (semester === 1) return { semester: 3, year: year - 1 };
    return { semester: semester - 1, year };
}

// ===== GET PAYROLL FOR SEMESTER + YEAR =====
export const getForSemester = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { unauthorized: true };

        const records = await ctx.db
            .query("payroll")
            .withIndex("by_semester_year", (q) => q.eq("semester", args.semester).eq("year", args.year))
            .collect();

        // Batch fetch all staff data (avoid N+1)
        const staffMap = await batchEnrich(ctx, records, "staffId", "users");

        return records.map((record) => {
            const staff = staffMap.get(record.staffId) as any;
            return {
                ...record,
                staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown Staff",
                role: staff?.role || "Unknown",
            };
        });
    },
});

// Get payroll records for a specific month/year (legacy compat)
export const getForMonth = query({
    args: {
        sessionId: v.optional(v.string()),
        month: v.string(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { unauthorized: true };

        const records = await ctx.db
            .query("payroll")
            .withIndex("by_period", (q) => q.eq("month", args.month).eq("year", args.year))
            .collect();

        // Batch fetch all staff data (avoid N+1)
        const staffMap = await batchEnrich(ctx, records, "staffId", "users");

        return records.map((record) => {
            const staff = staffMap.get(record.staffId) as any;
            return {
                ...record,
                staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown Staff",
                role: staff?.role || "Unknown",
            };
        });
    },
});

// ===== PROCESS/GENERATE PAYROLL FOR A SEMESTER =====
// Auto-populates baseSalary, allowances, deductions from user salary config
export const processPayroll = mutation({
    args: {
        sessionId: v.optional(v.string()),
        month: v.string(),
        year: v.number(),
        semester: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { success: false, error: "You don't have permission to perform this payroll action.", count: 0, skipped: 0 };

        // Get all active staff
        const allStaff = await ctx.db
            .query("users")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .collect();

        const staff = allStaff.filter(s => s.role !== "Guardian");

        // If semester provided, compute carry-over balances from previous semester
        let carryOverMap = new Map<string, number>();
        if (args.semester) {
            const prev = getPreviousSemester(args.semester, args.year);
            const prevRecords = await ctx.db
                .query("payroll")
                .withIndex("by_semester_year", (q) => q.eq("semester", prev.semester).eq("year", prev.year))
                .collect();

            for (const rec of prevRecords) {
                const balance = rec.netPay - (rec.amountPaid || 0);
                if (balance > 0) {
                    carryOverMap.set(rec.staffId, balance);
                }
            }
        }

        let createdCount = 0;
        let skippedCount = 0;
        let warnings: string[] = [];

        for (const staffMember of staff) {
            // Check if record exists for this month/year
            const existing = await ctx.db
                .query("payroll")
                .withIndex("by_staff_period", (q) => q.eq("staffId", staffMember._id).eq("month", args.month).eq("year", args.year))
                .first();

            if (!existing) {
                // Pull salary config from user record
                const baseSalary = staffMember.baseSalary || 0;
                
                // Track staff with 0 base salary as a warning
                if (baseSalary === 0) {
                    warnings.push(`${staffMember.firstName} ${staffMember.lastName}`);
                }

                const allowanceDetails = (staffMember as any).allowanceDetails || [];
                const deductionDetails = (staffMember as any).deductionDetails || [];

                const totalAllowances = Array.isArray(allowanceDetails)
                    ? allowanceDetails.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
                    : 0;
                const totalDeductions = Array.isArray(deductionDetails)
                    ? deductionDetails.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
                    : 0;

                const netPay = baseSalary + totalAllowances - totalDeductions;
                const carryOver = carryOverMap.get(staffMember._id) || 0;
                const totalDue = netPay + carryOver;

                await ctx.db.insert("payroll", {
                    staffId: staffMember._id,
                    month: args.month,
                    year: args.year,
                    semester: args.semester,
                    baseSalary,
                    allowances: totalAllowances,
                    deductions: totalDeductions,
                    netPay,
                    amountPaid: 0,
                    carryOverBalance: carryOver > 0 ? carryOver : undefined,
                    status: "Pending",
                });
                createdCount++;
            } else {
                skippedCount++;
            }
        }

        const summary = `Processed payroll for ${args.month} ${args.year} Semester ${args.semester || '?'}. ${createdCount} created, ${skippedCount} already existed.`;
        await logAction(ctx, user._id, "PROCESS_PAYROLL", summary);

        return { 
            success: true, 
            count: createdCount, 
            skipped: skippedCount,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    },
});

// ===== UPSERT RECORD =====
export const upsertRecord = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.optional(v.id("payroll")),
        staffId: v.id("users"),
        month: v.string(),
        year: v.number(),
        semester: v.optional(v.number()),
        baseSalary: v.number(),
        allowances: v.number(),
        deductions: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { success: false, error: "You don't have permission to update payroll records." };

        const netPay = args.baseSalary + args.allowances - args.deductions;

        if (args.id) {
            const existing = await ctx.db.get(args.id);
            if (!existing) return { success: false, error: "We couldn't find that payroll record." };

            const currentPaid = existing.amountPaid || 0;
            const totalDue = netPay + (existing.carryOverBalance || 0);
            const newStatus = (currentPaid > 0 && currentPaid >= totalDue) ? "Finished" : "Pending";

            await ctx.db.patch(args.id, {
                staffId: args.staffId,
                month: args.month,
                year: args.year,
                semester: args.semester,
                baseSalary: args.baseSalary,
                allowances: args.allowances,
                deductions: args.deductions,
                netPay,
                status: newStatus,
            });
            await logAction(ctx, user._id, "UPDATE_PAYROLL", `Updated payroll record for staff ${args.staffId}`);
            return { success: true, id: args.id };
        } else {
            // Check duplicate
            const existing = await ctx.db.query("payroll")
                .withIndex("by_staff_period", q => q.eq("staffId", args.staffId).eq("month", args.month).eq("year", args.year))
                .first();

            if (existing) {
                return { success: false, error: "A payroll record for this staff member already exists for this period." };
            }

            const id = await ctx.db.insert("payroll", {
                staffId: args.staffId,
                month: args.month,
                year: args.year,
                semester: args.semester,
                baseSalary: args.baseSalary,
                allowances: args.allowances,
                deductions: args.deductions,
                netPay,
                amountPaid: 0,
                status: "Pending",
            });
            await logAction(ctx, user._id, "CREATE_PAYROLL", `Created payroll record for staff ${args.staffId}`);
            return { success: true, id };
        }
    }
});

// ===== RECORD PAYMENT (installment) =====
export const recordPayment = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("payroll"),
        amount: v.number(),
        paymentDate: v.string(),
        method: v.optional(v.union(
            v.literal("CASH"),
            v.literal("BANK_SLIP"),
            v.literal("MOBILE_MONEY"),
        )),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { success: false, error: "You don't have permission to record payroll payments." };

        const record = await ctx.db.get(args.id);
        if (!record) return { success: false, error: "We couldn't find that payroll record." };

        const totalDue = record.netPay + (record.carryOverBalance || 0);
        const newTotalPaid = (record.amountPaid || 0) + args.amount;

        await ctx.db.patch(args.id, {
            amountPaid: newTotalPaid,
            status: (newTotalPaid > 0 && newTotalPaid >= totalDue) ? "Finished" : "Pending",
            paymentDate: args.paymentDate
        });

        // Record installment in payrollPayments table
        const receiptNumber = `PAY-${Date.now().toString(36).toUpperCase()}`;
        await ctx.db.insert("payrollPayments", {
            payrollId: args.id,
            amount: args.amount,
            date: args.paymentDate,
            method: args.method || "CASH",
            notes: args.notes,
            receiptNumber,
            recordedBy: user._id,
        });

        await logAction(ctx, user._id, "PAY_SALARY", `Paid ${args.amount} to record ${args.id}. Balance: ${totalDue - newTotalPaid}`);
        return { success: true };
    }
});

// ===== GET PAYMENT INSTALLMENTS =====
export const getPayments = query({
    args: {
        sessionId: v.optional(v.string()),
        payrollId: v.id("payroll"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return [];

        const payments = await ctx.db
            .query("payrollPayments")
            .withIndex("by_payroll", (q) => q.eq("payrollId", args.payrollId))
            .collect();

        // Enrich with recorder names
        const recorderMap = await batchEnrich(ctx, payments, "recordedBy", "users");

        return payments.map(p => {
            const recorder = recorderMap.get(p.recordedBy) as any;
            return {
                ...p,
                recordedByName: recorder ? `${recorder.firstName} ${recorder.lastName}` : "Unknown",
            };
        });
    },
});

// ===== MARK AS PAID =====
export const markAsPaid = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("payroll"),
        paymentDate: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { success: false, error: "You don't have permission to mark payroll as paid." };

        const record = await ctx.db.get(args.id);
        if (!record) return { success: false, error: "We couldn't find that payroll record." };

        // This mutation marks the entire netPay as paid, so it should set status to "Finished"
        await ctx.db.patch(args.id, {
            status: "Finished", // Changed to "Finished"
            amountPaid: record.netPay + (record.carryOverBalance || 0), // Ensure carryOverBalance is also covered
            paymentDate: args.paymentDate
        });

        await logAction(ctx, user._id, "PAY_SALARY", `Marked salary record ${args.id} as Paid`);

        return { success: true };
    },
});

// ===== DELETE RECORD =====
export const remove = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("payroll"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { success: false, error: "You don't have permission to delete payroll records." };

        // Also delete associated payments
        const payments = await ctx.db
            .query("payrollPayments")
            .withIndex("by_payroll", (q) => q.eq("payrollId", args.id))
            .collect();
        for (const p of payments) {
            await ctx.db.delete(p._id);
        }

        await ctx.db.delete(args.id);
        await logAction(ctx, user._id, "DELETE_PAYROLL", `Deleted payroll record ${args.id}`);
        return { success: true };
    }
});

// ===== GET EARLIEST YEAR =====
export const getEarliestYear = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { unauthorized: true };

        const firstRecord = await ctx.db
            .query("payroll")
            .withIndex("by_year")
            .order("asc")
            .first();

        return firstRecord?.year || 2024;
    }
});

// ===== GET AVAILABLE SEMESTERS =====
// Returns distinct semester/year combos from payroll records for the semester navigation
export const getAvailableSemesters = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { unauthorized: true };

        const allRecords = await ctx.db.query("payroll").collect();

        // Build unique semester/year set
        const seen = new Set<string>();
        const semesters: { semester: number; year: number; label: string }[] = [];

        for (const r of allRecords) {
            if (r.semester) {
                const key = `${r.semester}-${r.year}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    semesters.push({ semester: r.semester, year: r.year, label: `Semester ${r.semester} ${r.year}` });
                }
            }
        }

        // Sort desc (most recent first)
        semesters.sort((a, b) => b.year - a.year || b.semester - a.semester);
        return semesters;
    }
});

// ===== CARRY OVER BALANCES FROM PREVIOUS SEMESTER =====
export const carryOverBalances = mutation({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:payroll");
        if (!user) return { success: false, error: "You don't have permission to carry over balances." };

        const prev = getPreviousSemester(args.semester, args.year);

        // Get previous semester records with outstanding balances
        const prevRecords = await ctx.db
            .query("payroll")
            .withIndex("by_semester_year", (q) => q.eq("semester", prev.semester).eq("year", prev.year))
            .collect();

        let updatedCount = 0;

        for (const prevRec of prevRecords) {
            const balance = prevRec.netPay - (prevRec.amountPaid || 0);
            if (balance <= 0) continue;

            // Find matching current semester record for this staff
            const currentRec = await ctx.db
                .query("payroll")
                .withIndex("by_staff_semester_year", (q) =>
                    q.eq("staffId", prevRec.staffId).eq("semester", args.semester).eq("year", args.year)
                )
                .first();

            if (currentRec) {
                await ctx.db.patch(currentRec._id, {
                    carryOverBalance: balance,
                });
                updatedCount++;
            }
        }

        await logAction(ctx, user._id, "CARRY_OVER_BALANCES", `Carried over balances from Semester ${prev.semester} ${prev.year} to Semester ${args.semester} ${args.year} (${updatedCount} staff updated)`);

        return { success: true, updatedCount };
    }
});
