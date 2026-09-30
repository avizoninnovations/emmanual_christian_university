import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { logAction } from "./audit_logger.js";
import { assertRole, assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";

// ─────────────────────────────────────────────────────────
// HELPER: Fetch Better-Auth Users Map
// ─────────────────────────────────────────────────────────
async function getUsersMap(ctx: any): Promise<Map<string, { name: string; email: string }>> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 2000 },
    });
    const users = result?.page || [];
    return new Map(users.map((u: any) => [u._id, { name: u.name, email: u.email }]));
  } catch (e) {
    console.error("Failed to fetch auth users map", e);
    return new Map();
  }
}

// ─────────────────────────────────────────────────────────
// 1. FEE STRUCTURES (CRUD)
// ─────────────────────────────────────────────────────────

export const getFeeStructures = query({
  args: {
    programId: v.optional(v.id("programs")),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);
    
    let structures;
    if (args.programId) {
      structures = await ctx.db
        .query("feeStructures")
        .withIndex("by_program", (q) => q.eq("programId", args.programId!))
        .order("desc")
        .collect();
    } else if (args.periodId) {
      structures = await ctx.db
        .query("feeStructures")
        .withIndex("by_period", (q) => q.eq("periodId", args.periodId!))
        .order("desc")
        .collect();
    } else {
      structures = await ctx.db.query("feeStructures").order("desc").collect();
    }

    // Enrich with Program & Period details
    const enriched = await Promise.all(
      structures.map(async (f) => {
        const program = await ctx.db.get(f.programId);
        const period = await ctx.db.get(f.periodId);
        const total =
          (f.tuitionFee || 0) +
          (f.registrationFee || 0) +
          (f.libraryFee || 0) +
          (f.ictFee || 0) +
          (f.activityFee || 0) +
          (f.otherFees || 0);

        return {
          ...f,
          totalFee: total,
          currency: f.currency || "SSP",
          programName: program?.name ?? "Unknown Program",
          programCode: program?.code ?? "—",
          programLevel: program?.level ?? "—",
          periodName: period?.name ?? `Semester ${f.term}, ${f.year}`,
        };
      })
    );

    return enriched;
  },
});

export const createFeeStructure = mutation({
  args: {
    programId: v.id("programs"),
    periodId: v.id("academicPeriods"),
    term: v.number(),
    year: v.number(),
    tuitionFee: v.number(),
    registrationFee: v.number(),
    libraryFee: v.number(),
    ictFee: v.number(),
    activityFee: v.number(),
    otherFees: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    // Check if duplicate fee structure already exists for this program and period
    const existing = await ctx.db
      .query("feeStructures")
      .withIndex("by_program_period", (q) =>
        q.eq("programId", args.programId).eq("periodId", args.periodId)
      )
      .first();

    if (existing) {
      throw new Error(
        "A fee structure has already been defined for this program in the selected academic period."
      );
    }

    const id = await ctx.db.insert("feeStructures", {
      ...args,
      otherFees: args.otherFees ?? 0,
      currency: args.currency || "SSP",
    });

    const program = await ctx.db.get(args.programId);
    await logAction(ctx, {
      action: "CREATE_FEE_STRUCTURE",
      resource: "feeStructures",
      details: `Created ${args.currency || "SSP"} fee structure for ${program?.name || args.programId} (${args.year} T${args.term})`,
    });

    return id;
  },
});

export const updateFeeStructure = mutation({
  args: {
    id: v.id("feeStructures"),
    tuitionFee: v.optional(v.number()),
    registrationFee: v.optional(v.number()),
    libraryFee: v.optional(v.number()),
    ictFee: v.optional(v.number()),
    activityFee: v.optional(v.number()),
    otherFees: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    await logAction(ctx, {
      action: "UPDATE_FEE_STRUCTURE",
      resource: "feeStructures",
      details: `Updated fee structure ${id}`,
    });
  },
});

export const deleteFeeStructure = mutation({
  args: { id: v.id("feeStructures") },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("Fee structure not found");

    await ctx.db.delete(args.id);
    await logAction(ctx, {
      action: "DELETE_FEE_STRUCTURE",
      resource: "feeStructures",
      details: `Deleted fee structure for program ${target.programId}`,
    });
  },
});

// ─────────────────────────────────────────────────────────
// 2. FINANCIAL SUMMARY & METRICS
// ─────────────────────────────────────────────────────────

export const getFinancialSummary = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    let ledgers = await ctx.db.query("studentLedger").collect();
    if (args.periodId) {
      ledgers = ledgers.filter((l) => l.periodId === args.periodId);
    }

    let transactions = await ctx.db.query("transactions").collect();
    if (args.periodId) {
      transactions = transactions.filter((t) => t.periodId === args.periodId);
    }

    let totalExpected = 0;
    let totalCollected = 0;
    let clearedCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    for (const l of ledgers) {
      const due = l.totalDue || 0;
      const paid = l.totalPaid || 0;
      const bal = due - paid;

      totalExpected += due;
      totalCollected += paid;

      if (bal <= 0 && due > 0) {
        clearedCount++;
      } else if (paid > 0) {
        partialCount++;
      } else {
        pendingCount++;
      }
    }

    const totalOutstanding = Math.max(0, totalExpected - totalCollected);
    const collectionRate =
      totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // Method breakdown
    const methodTotals = {
      cash: 0,
      bank: 0,
      mobile_money: 0,
      other: 0,
    };

    for (const t of transactions) {
      if (t.type === "payment") {
        const m = t.method || "cash";
        if (m in methodTotals) {
          methodTotals[m as keyof typeof methodTotals] += t.amount;
        } else {
          methodTotals.other += t.amount;
        }
      }
    }

    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate,
      clearedCount,
      partialCount,
      pendingCount,
      totalStudentsInvoiced: ledgers.length,
      methodTotals,
      totalTransactionsCount: transactions.length,
    };
  },
});

// ─────────────────────────────────────────────────────────
// INSTALLMENT MILESTONES HELPER (South Sudan 3-Stage Model)
// ─────────────────────────────────────────────────────────
export function calculateInstallmentMilestones(totalDue: number, totalPaid: number) {
  const regTarget = Math.round(totalDue * 0.40);
  const midTarget = Math.round(totalDue * 0.75);
  const examTarget = totalDue;

  const regCleared = totalPaid >= regTarget && totalDue > 0;
  const midCleared = totalPaid >= midTarget && totalDue > 0;
  const examCleared = totalPaid >= examTarget && totalDue > 0;

  let currentStage = "None";
  if (examCleared) currentStage = "Exam Cleared (100%)";
  else if (midCleared) currentStage = "Midterms Cleared (75%)";
  else if (regCleared) currentStage = "Registration Cleared (40%)";
  else currentStage = "Below Registration (Pending)";

  return {
    registration: {
      target: regTarget,
      percentage: 40,
      cleared: regCleared,
      balanceToClear: Math.max(0, regTarget - totalPaid),
    },
    midterm: {
      target: midTarget,
      percentage: 75,
      cleared: midCleared,
      balanceToClear: Math.max(0, midTarget - totalPaid),
    },
    finalExam: {
      target: examTarget,
      percentage: 100,
      cleared: examCleared,
      balanceToClear: Math.max(0, examTarget - totalPaid),
    },
    currentStage,
    paymentProgressPercentage: totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 100,
  };
}

// ─────────────────────────────────────────────────────────
// 3. STUDENT LEDGERS (Directory & Clearance List)
// ─────────────────────────────────────────────────────────

export const getStudentLedgers = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
    programId: v.optional(v.id("programs")),
    sponsorId: v.optional(v.id("sponsors")),
    status: v.optional(v.union(v.literal("cleared"), v.literal("partial"), v.literal("pending"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    const usersMap = await getUsersMap(ctx);

    let ledgers = await ctx.db.query("studentLedger").collect();
    if (args.periodId) {
      ledgers = ledgers.filter((l) => l.periodId === args.periodId);
    }

    // Enrich ledgers with Student, Program, Sponsor, and Milestone information
    const enriched = await Promise.all(
      ledgers.map(async (l) => {
        const student = await ctx.db.get(l.studentId);
        const program = student?.programId ? await ctx.db.get(student.programId) : null;
        const period = await ctx.db.get(l.periodId);
        const user = student?.userId ? usersMap.get(student.userId) : null;
        const sponsor = student?.sponsorId ? ((await ctx.db.get(student.sponsorId)) as any) : null;

        const due = l.totalDue || 0;
        const paid = l.totalPaid || 0;
        const balance = due - paid;
        const status =
          balance <= 0 && due > 0
            ? "cleared"
            : paid > 0
            ? "partial"
            : "pending";

        const installments = calculateInstallmentMilestones(due, paid);

        return {
          _id: l._id,
          studentId: l.studentId,
          periodId: l.periodId,
          term: l.term,
          year: l.year,
          totalDue: due,
          totalPaid: paid,
          balance,
          status,
          lastPaymentDate: l.lastPaymentDate,
          lastPaymentAmount: l.lastPaymentAmount,
          studentRegNumber: student?.registrationNumber ?? "—",
          studentName: user?.name ?? "Student",
          studentEmail: user?.email ?? "—",
          programId: student?.programId,
          programName: program?.name ?? "Unknown Program",
          programCode: program?.code ?? "—",
          periodName: period?.name ?? `Semester ${l.term}, ${l.year}`,
          sponsorId: student?.sponsorId,
          sponsor: sponsor
            ? {
                _id: sponsor._id,
                name: sponsor.name,
                code: sponsor.code,
                category: sponsor.category,
                coveragePercentage: sponsor.coveragePercentage ?? 100,
              }
            : null,
          installments,
        };
      })
    );

    // Apply filtering
    let results = enriched;

    if (args.programId) {
      results = results.filter((item) => item.programId === args.programId);
    }

    if (args.sponsorId) {
      results = results.filter((item) => item.sponsorId === args.sponsorId);
    }

    if (args.status) {
      results = results.filter((item) => item.status === args.status);
    }

    if (args.search && args.search.trim()) {
      const q = args.search.toLowerCase().trim();
      results = results.filter(
        (item) =>
          item.studentRegNumber.toLowerCase().includes(q) ||
          item.studentName.toLowerCase().includes(q) ||
          item.studentEmail.toLowerCase().includes(q) ||
          item.programName.toLowerCase().includes(q)
      );
    }

    return results;
  },
});

// ─────────────────────────────────────────────────────────
// 4. STUDENT FINANCIAL PROFILE & STATEMENT
// ─────────────────────────────────────────────────────────

export const getStudentFinancialProfile = query({
  args: {
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found");

    const usersMap = await getUsersMap(ctx);
    const user = student.userId ? usersMap.get(student.userId) : null;
    const program = student.programId ? await ctx.db.get(student.programId) : null;
    const sponsor = student.sponsorId ? ((await ctx.db.get(student.sponsorId)) as any) : null;

    // Fetch all ledgers for this student
    const ledgers = await ctx.db
      .query("studentLedger")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const enrichedLedgers = await Promise.all(
      ledgers.map(async (l) => {
        const period = await ctx.db.get(l.periodId);
        const due = l.totalDue || 0;
        const paid = l.totalPaid || 0;
        const balance = due - paid;
        const status =
          balance <= 0 && due > 0
            ? "cleared"
            : paid > 0
            ? "partial"
            : "pending";

        return {
          ...l,
          periodName: period?.name ?? `Semester ${l.term}, ${l.year}`,
          balance,
          status,
          installments: calculateInstallmentMilestones(due, paid),
        };
      })
    );

    // Fetch all transactions for this student
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .collect();

    let cumulativeDue = 0;
    let cumulativePaid = 0;
    for (const l of ledgers) {
      cumulativeDue += l.totalDue || 0;
      cumulativePaid += l.totalPaid || 0;
    }

    const cumulativeBalance = cumulativeDue - cumulativePaid;
    const overallStatus =
      cumulativeBalance <= 0 && cumulativeDue > 0
        ? "cleared"
        : cumulativePaid > 0
        ? "partial"
        : "pending";

    return {
      student: {
        _id: student._id,
        registrationNumber: student.registrationNumber,
        name: user?.name ?? "Student",
        email: user?.email ?? "—",
        programName: program?.name ?? "—",
        programCode: program?.code ?? "—",
        financeStatus: student.financeStatus,
        yearOfStudy: student.yearOfStudy,
        term: student.term,
        year: student.year,
        sponsor: sponsor
          ? {
              _id: sponsor._id,
              name: sponsor.name,
              code: sponsor.code,
              category: sponsor.category,
              coveragePercentage: sponsor.coveragePercentage ?? 100,
            }
          : null,
      },
      cumulativeDue,
      cumulativePaid,
      cumulativeBalance,
      overallStatus,
      installments: calculateInstallmentMilestones(cumulativeDue, cumulativePaid),
      ledgers: enrichedLedgers,
      transactions,
    };
  },
});

// ─────────────────────────────────────────────────────────
// 5. TRANSACTIONS & RECORDING (Payments & Waivers)
// ─────────────────────────────────────────────────────────

export const getAllTransactions = query({
  args: {
    studentId: v.optional(v.id("students")),
    periodId: v.optional(v.id("academicPeriods")),
    type: v.optional(v.union(v.literal("payment"), v.literal("charge"), v.literal("waiver"))),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    let transactions;
    if (args.studentId) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_student", (q) => q.eq("studentId", args.studentId!))
        .order("desc")
        .collect();
    } else {
      transactions = await ctx.db.query("transactions").order("desc").collect();
    }

    if (args.periodId) {
      transactions = transactions.filter((t) => t.periodId === args.periodId);
    }
    if (args.type) {
      transactions = transactions.filter((t) => t.type === args.type);
    }

    const usersMap = await getUsersMap(ctx);

    // Enrich with student details
    const enriched = await Promise.all(
      transactions.map(async (t) => {
        const student = await ctx.db.get(t.studentId);
        const user = student?.userId ? usersMap.get(student.userId) : null;
        const program = student?.programId ? await ctx.db.get(student.programId) : null;

        return {
          ...t,
          studentRegNumber: student?.registrationNumber ?? "—",
          studentName: user?.name ?? "Student",
          programName: program?.name ?? "—",
          method: t.method || "cash",
          channel: t.channel || (t.method === "cash" ? "cash" : t.method === "mobile_money" ? "m_gurush" : "bank_deposit"),
          bankBranch: t.bankBranch,
          slipNumber: t.slipNumber,
          depositDate: t.depositDate,
          receiptNumber: t.receiptNumber || `ECU-TX-${t._id.slice(-6).toUpperCase()}`,
        };
      })
    );

    return enriched;
  },
});

export const recordPayment = mutation({
  args: {
    studentId: v.id("students"),
    periodId: v.optional(v.id("academicPeriods")),
    amount: v.number(),
    method: v.union(v.literal("cash"), v.literal("bank"), v.literal("mobile_money"), v.literal("other")),
    channel: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("bank_deposit"),
        v.literal("m_gurush"),
        v.literal("equity_bank"),
        v.literal("kcb_bank"),
        v.literal("stanbic_bank"),
        v.literal("other")
      )
    ),
    bankBranch: v.optional(v.string()),
    slipNumber: v.optional(v.string()),
    depositDate: v.optional(v.string()),
    reference: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student record not found.");

    // Determine target period
    const targetPeriodId = args.periodId || student.currentPeriodId;
    if (!targetPeriodId) {
      throw new Error("Student is not enrolled in an active academic period.");
    }

    const period = await ctx.db.get(targetPeriodId);
    if (!period) throw new Error("Target academic period does not exist.");

    // Generate unique sequential receipt number: ECU-REC-YYYY-XXXXX
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    const receiptNumber = `ECU-REC-${period.year}-${randomSeq}`;

    // Get current staff user for audit tracking
    const callerId = await assertAuthenticated(ctx);

    const effectiveChannel =
      args.channel ||
      (args.method === "cash"
        ? "cash"
        : args.method === "mobile_money"
        ? "m_gurush"
        : "bank_deposit");

    // 1. Insert transaction
    const transactionId = await ctx.db.insert("transactions", {
      studentId: args.studentId,
      periodId: targetPeriodId,
      term: period.term,
      year: period.year,
      amount: args.amount,
      type: "payment",
      method: args.method,
      channel: effectiveChannel,
      bankBranch: args.bankBranch,
      slipNumber: args.slipNumber,
      depositDate: args.depositDate,
      receiptNumber,
      reference: args.reference || `REF-${Date.now()}`,
      notes: args.notes,
      recordedBy: callerId,
      date: Date.now(),
    });

    // 2. Find or create student ledger for this period
    let ledger = await ctx.db
      .query("studentLedger")
      .withIndex("by_student_period", (q) =>
        q.eq("studentId", args.studentId).eq("periodId", targetPeriodId)
      )
      .first();

    let newTotalPaid = args.amount;
    let totalDue = 0;

    if (ledger) {
      newTotalPaid = (ledger.totalPaid || 0) + args.amount;
      totalDue = ledger.totalDue || 0;
      const newBalance = Math.max(0, totalDue - newTotalPaid);
      const newStatus =
        newBalance <= 0 && totalDue > 0
          ? "cleared"
          : newTotalPaid > 0
          ? "partial"
          : "pending";

      await ctx.db.patch(ledger._id, {
        totalPaid: newTotalPaid,
        balance: newBalance,
        status: newStatus,
        lastPaymentDate: Date.now(),
        lastPaymentAmount: args.amount,
      });

      // Update student finance status
      await ctx.db.patch(args.studentId, {
        financeStatus: newStatus,
      });
    } else {
      // If no ledger existed yet, check fee structure
      const feeStruct = await ctx.db
        .query("feeStructures")
        .withIndex("by_program_period", (q) =>
          q.eq("programId", student.programId).eq("periodId", targetPeriodId)
        )
        .first();

      if (feeStruct) {
        totalDue =
          (feeStruct.tuitionFee || 0) +
          (feeStruct.registrationFee || 0) +
          (feeStruct.libraryFee || 0) +
          (feeStruct.ictFee || 0) +
          (feeStruct.activityFee || 0) +
          (feeStruct.otherFees || 0);
      }

      const newBalance = Math.max(0, totalDue - newTotalPaid);
      const newStatus =
        newBalance <= 0 && totalDue > 0
          ? "cleared"
          : newTotalPaid > 0
          ? "partial"
          : "pending";

      await ctx.db.insert("studentLedger", {
        studentId: args.studentId,
        periodId: targetPeriodId,
        term: period.term,
        year: period.year,
        totalDue,
        totalPaid: newTotalPaid,
        balance: newBalance,
        status: newStatus,
        lastPaymentDate: Date.now(),
        lastPaymentAmount: args.amount,
      });

      await ctx.db.patch(args.studentId, {
        financeStatus: newStatus,
      });
    }

    // 3. Log Action
    await logAction(ctx, {
      action: "RECORD_PAYMENT",
      resource: "finance",
      details: `Payment of ${args.amount.toLocaleString()} recorded for ${student.registrationNumber} (Receipt: ${receiptNumber}, Method: ${args.method})`,
    });

    return {
      success: true,
      transactionId,
      receiptNumber,
      amount: args.amount,
      channel: effectiveChannel,
      bankBranch: args.bankBranch,
      slipNumber: args.slipNumber,
      depositDate: args.depositDate,
      balance: Math.max(0, totalDue - newTotalPaid),
    };
  },
});

export const recordWaiver = mutation({
  args: {
    studentId: v.id("students"),
    periodId: v.optional(v.id("academicPeriods")),
    amount: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    if (args.amount <= 0) {
      throw new Error("Waiver amount must be greater than zero.");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found.");

    const targetPeriodId = args.periodId || student.currentPeriodId;
    if (!targetPeriodId) throw new Error("Student is not assigned to an academic period.");

    const period = await ctx.db.get(targetPeriodId);
    if (!period) throw new Error("Target academic period not found.");

    const callerId = await assertAuthenticated(ctx);
    const receiptNumber = `ECU-WAV-${period.year}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Insert waiver transaction
    await ctx.db.insert("transactions", {
      studentId: args.studentId,
      periodId: targetPeriodId,
      term: period.term,
      year: period.year,
      amount: args.amount,
      type: "waiver",
      method: "other",
      receiptNumber,
      reference: `WAIVER: ${args.reason}`,
      notes: args.notes,
      recordedBy: callerId,
      date: Date.now(),
    });

    // Adjust student ledger
    let ledger = await ctx.db
      .query("studentLedger")
      .withIndex("by_student_period", (q) =>
        q.eq("studentId", args.studentId).eq("periodId", targetPeriodId)
      )
      .first();

    if (ledger) {
      const newPaid = (ledger.totalPaid || 0) + args.amount;
      const newBalance = Math.max(0, (ledger.totalDue || 0) - newPaid);
      const newStatus =
        newBalance <= 0 ? "cleared" : newPaid > 0 ? "partial" : "pending";

      await ctx.db.patch(ledger._id, {
        totalPaid: newPaid,
        balance: newBalance,
        status: newStatus,
      });

      await ctx.db.patch(args.studentId, {
        financeStatus: newStatus,
      });
    }

    await logAction(ctx, {
      action: "APPLY_FEE_WAIVER",
      resource: "finance",
      details: `Granted ${args.amount.toLocaleString()} waiver/scholarship to ${student.registrationNumber} (Reason: ${args.reason})`,
    });

    return { success: true, receiptNumber };
  },
});

// ─────────────────────────────────────────────────────────
// 6. BULK INVOICING (Assign Fees to Enrolled Students)
// ─────────────────────────────────────────────────────────

export const applySemesterInvoices = mutation({
  args: {
    periodId: v.id("academicPeriods"),
    programId: v.optional(v.id("programs")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("Academic period not found.");

    // Fetch fee structures for this period
    let feeStructures = await ctx.db
      .query("feeStructures")
      .withIndex("by_period", (q) => q.eq("periodId", args.periodId))
      .collect();

    if (args.programId) {
      feeStructures = feeStructures.filter((f) => f.programId === args.programId);
    }

    if (feeStructures.length === 0) {
      throw new Error(
        "No fee structures found for this academic period. Please configure a fee structure first."
      );
    }

    const feeMap = new Map(
      feeStructures.map((f) => {
        const total =
          (f.tuitionFee || 0) +
          (f.registrationFee || 0) +
          (f.libraryFee || 0) +
          (f.ictFee || 0) +
          (f.activityFee || 0) +
          (f.otherFees || 0);
        return [f.programId, total];
      })
    );

    // Fetch active students
    let students = await ctx.db.query("students").collect();
    students = students.filter((s) => s.status === "active");

    if (args.programId) {
      students = students.filter((s) => s.programId === args.programId);
    }

    let invoicedCount = 0;
    let skippedCount = 0;

    for (const s of students) {
      // Check if student already has a ledger for this period
      const existingLedger = await ctx.db
        .query("studentLedger")
        .withIndex("by_student_period", (q) =>
          q.eq("studentId", s._id).eq("periodId", args.periodId)
        )
        .first();

      if (existingLedger) {
        skippedCount++;
        continue;
      }

      const totalFee = feeMap.get(s.programId);
      if (totalFee === undefined) {
        // No fee structure configured for student's program
        skippedCount++;
        continue;
      }

      await ctx.db.insert("studentLedger", {
        studentId: s._id,
        periodId: args.periodId,
        term: period.term,
        year: period.year,
        totalDue: totalFee,
        totalPaid: 0,
        balance: totalFee,
        status: "pending",
      });

      // Update student's active period reference and finance status
      await ctx.db.patch(s._id, {
        currentPeriodId: args.periodId,
        term: period.term,
        year: period.year,
        financeStatus: "pending",
      });

      invoicedCount++;
    }

    await logAction(ctx, {
      action: "RUN_SEMESTER_INVOICING",
      resource: "finance",
      details: `Generated ${invoicedCount} invoices for period ${period.name} (${period.year}). Skipped ${skippedCount} existing or unconfigured students.`,
    });

    return {
      invoicedCount,
      skippedCount,
      periodName: period.name,
    };
  },
});

// ─────────────────────────────────────────────────────────
// 7. SPONSOR & BURSARY MANAGEMENT (Church, NGO, Government)
// ─────────────────────────────────────────────────────────

export const getSponsors = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    let sponsors = await ctx.db.query("sponsors").collect();
    if (args.status) {
      sponsors = sponsors.filter((s) => s.status === args.status);
    }

    const students = await ctx.db.query("students").collect();
    const ledgers = await ctx.db.query("studentLedger").collect();

    const enriched = sponsors.map((s) => {
      const sponsoredStudents = students.filter((stud) => stud.sponsorId === s._id);
      const studentIds = new Set(sponsoredStudents.map((stud) => stud._id));

      let totalBilled = 0;
      let totalPaid = 0;

      for (const l of ledgers) {
        if (studentIds.has(l.studentId)) {
          totalBilled += l.totalDue || 0;
          totalPaid += l.totalPaid || 0;
        }
      }

      return {
        _id: s._id,
        name: s.name,
        code: s.code,
        category: s.category,
        contactPerson: s.contactPerson ?? "—",
        contactEmail: s.contactEmail ?? "—",
        contactPhone: s.contactPhone ?? "—",
        coveragePercentage: s.coveragePercentage ?? 100,
        status: s.status,
        studentCount: sponsoredStudents.length,
        totalBilled,
        totalPaid,
        totalBalance: Math.max(0, totalBilled - totalPaid),
      };
    });

    return enriched;
  },
});

export const createSponsor = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    category: v.union(v.literal("church"), v.literal("ngo"), v.literal("government"), v.literal("private")),
    contactPerson: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    coveragePercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    const existing = await ctx.db
      .query("sponsors")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase().trim()))
      .first();

    if (existing) {
      throw new Error(`A sponsor with code '${args.code}' already exists.`);
    }

    const id = await ctx.db.insert("sponsors", {
      name: args.name.trim(),
      code: args.code.toUpperCase().trim(),
      category: args.category,
      contactPerson: args.contactPerson?.trim(),
      contactEmail: args.contactEmail?.trim(),
      contactPhone: args.contactPhone?.trim(),
      coveragePercentage: args.coveragePercentage ?? 100,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logAction(ctx, {
      action: "CREATE_SPONSOR",
      resource: "sponsors",
      details: `Created sponsor ${args.name} (${args.code})`,
    });

    return id;
  },
});

export const updateSponsor = mutation({
  args: {
    id: v.id("sponsors"),
    name: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    coveragePercentage: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    await logAction(ctx, {
      action: "UPDATE_SPONSOR",
      resource: "sponsors",
      details: `Updated sponsor ${id}`,
    });
  },
});

export const deleteSponsor = mutation({
  args: { id: v.id("sponsors") },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    // Unlink any students
    const students = await ctx.db
      .query("students")
      .withIndex("by_sponsor", (q) => q.eq("sponsorId", args.id))
      .collect();

    for (const s of students) {
      await ctx.db.patch(s._id, { sponsorId: undefined });
    }

    await ctx.db.delete(args.id);

    await logAction(ctx, {
      action: "DELETE_SPONSOR",
      resource: "sponsors",
      details: `Deleted sponsor ${args.id} and unlinked ${students.length} students`,
    });
  },
});

export const assignStudentSponsor = mutation({
  args: {
    studentId: v.id("students"),
    sponsorId: v.optional(v.id("sponsors")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found.");

    await ctx.db.patch(args.studentId, {
      sponsorId: args.sponsorId || undefined,
    });

    await logAction(ctx, {
      action: "ASSIGN_STUDENT_SPONSOR",
      resource: "students",
      details: `Updated sponsor for student ${student.registrationNumber}`,
    });

    return { success: true };
  },
});

export const getSponsoredStudents = query({
  args: {
    sponsorId: v.optional(v.id("sponsors")),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    let students = await ctx.db.query("students").collect();
    if (args.sponsorId) {
      students = students.filter((s) => s.sponsorId === args.sponsorId);
    } else {
      students = students.filter((s) => Boolean(s.sponsorId));
    }

    const usersMap = await getUsersMap(ctx);
    const sponsors = await ctx.db.query("sponsors").collect();
    const sponsorMap = new Map(sponsors.map((sp) => [sp._id, sp]));

    const enriched = await Promise.all(
      students.map(async (st) => {
        const user = st.userId ? usersMap.get(st.userId) : null;
        const program = st.programId ? await ctx.db.get(st.programId) : null;
        const sponsor = st.sponsorId ? sponsorMap.get(st.sponsorId) : null;

        // Active period ledger
        let ledger = null;
        if (args.periodId || st.currentPeriodId) {
          const targetPId = args.periodId || st.currentPeriodId!;
          ledger = await ctx.db
            .query("studentLedger")
            .withIndex("by_student_period", (q) =>
              q.eq("studentId", st._id).eq("periodId", targetPId)
            )
            .first();
        }

        const due = ledger?.totalDue || 0;
        const paid = ledger?.totalPaid || 0;
        const balance = due - paid;

        return {
          studentId: st._id,
          registrationNumber: st.registrationNumber,
          name: user?.name ?? "Student",
          email: user?.email ?? "—",
          programName: program?.name ?? "—",
          sponsorName: sponsor?.name ?? "—",
          sponsorCode: sponsor?.code ?? "—",
          coveragePercentage: sponsor?.coveragePercentage ?? 100,
          totalDue: due,
          totalPaid: paid,
          balance,
          status: ledger?.status ?? st.financeStatus,
        };
      })
    );

    return enriched;
  },
});

// ─────────────────────────────────────────────────────────
// 8. DAILY CASHIER RECONCILIATION & CLOSING AUDIT
// ─────────────────────────────────────────────────────────

export const getDailyCashierReconciliation = query({
  args: {
    date: v.optional(v.string()), // YYYY-MM-DD
    cashierId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance"]);

    // Determine target day timestamps
    let startOfDay: number;
    let endOfDay: number;

    if (args.date) {
      const [year, month, day] = args.date.split("-").map(Number);
      const d = new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1);
      startOfDay = d.setHours(0, 0, 0, 0);
      endOfDay = d.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    }

    let transactions = await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startOfDay),
          q.lte(q.field("date"), endOfDay),
          q.eq(q.field("type"), "payment")
        )
      )
      .collect();

    if (args.cashierId) {
      transactions = transactions.filter((t) => t.recordedBy === args.cashierId);
    }

    const usersMap = await getUsersMap(ctx);

    // Channel Totals
    const channelSummary = {
      cash: 0,
      m_gurush: 0,
      equity_bank: 0,
      kcb_bank: 0,
      stanbic_bank: 0,
      bank_deposit: 0,
      other: 0,
    };

    let totalCollected = 0;

    const enrichedTransactions = await Promise.all(
      transactions.map(async (t) => {
        const student = await ctx.db.get(t.studentId);
        const user = student?.userId ? usersMap.get(student.userId) : null;
        const cashier = t.recordedBy ? usersMap.get(t.recordedBy) : null;

        const ch = (t.channel || (t.method === "cash" ? "cash" : t.method === "mobile_money" ? "m_gurush" : "bank_deposit")) as keyof typeof channelSummary;

        if (ch in channelSummary) {
          channelSummary[ch] += t.amount;
        } else {
          channelSummary.other += t.amount;
        }

        totalCollected += t.amount;

        return {
          _id: t._id,
          receiptNumber: t.receiptNumber || `ECU-TX-${t._id.slice(-6).toUpperCase()}`,
          date: t.date,
          amount: t.amount,
          channel: ch,
          bankBranch: t.bankBranch,
          slipNumber: t.slipNumber,
          depositDate: t.depositDate,
          reference: t.reference,
          studentRegNumber: student?.registrationNumber ?? "—",
          studentName: user?.name ?? "Student",
          cashierName: cashier?.name ?? "Finance Cashier",
          notes: t.notes,
        };
      })
    );

    const totalCashOnHand = channelSummary.cash;
    const totalDigitalAndBank = totalCollected - totalCashOnHand;

    return {
      date: args.date || new Date().toISOString().split("T")[0],
      totalCollected,
      totalCashOnHand,
      totalDigitalAndBank,
      receiptCount: enrichedTransactions.length,
      channelSummary,
      transactions: enrichedTransactions,
    };
  },
});
