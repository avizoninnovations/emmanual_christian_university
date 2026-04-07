// Academic Periods Management
// Manages semesters/years as separate records for historical tracking

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getAuthUser, logAction, checkCapability } from "./authHelpers"

// ===== GET ALL PERIODS =====
export const getAll = query({
  args: {
    sessionId: v.optional(v.optional(v.string())),
  },
  handler: async (ctx) => {
    const periods = await ctx.db.query("academicPeriods").order("desc").collect()

    return periods
  },
})

// ===== GET CURRENT ACTIVE PERIOD =====
export const getCurrent = query({
  args: {
    sessionId: v.optional(v.optional(v.string())),
  },
  handler: async (ctx) => {
    // First try to get from schoolConfig reference
    const config = await ctx.db.query("schoolConfig").first()

    if (config?.currentPeriodId) {
      const period = await ctx.db.get(config.currentPeriodId)
      if (period) return period
    }

    // Fallback: find the active period
    const activePeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "Active"))
      .first()

    if (activePeriod) return activePeriod

    // Last fallback: use legacy currentSemester/currentYear from config
    if (config?.currentSemester && config?.currentYear) {
      return {
        _id: null as any,
        semester: config.currentSemester,
        year: config.currentYear,
        name: `Semester ${config.currentSemester} ${config.currentYear}`,
        status: "Active" as const,
        createdAt: Date.now(),
      }
    }

    return null
  },
})

// ===== GET PERIOD BY SEMESTER AND YEAR =====
export const getBySemesterYear = query({
  args: {
    semester: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const period = await ctx.db
      .query("academicPeriods")
      .withIndex("by_semester_year", (q) => q.eq("semester", args.semester).eq("year", args.year))
      .first()

    return period
  },
})

// ===== GET PERIODS BY YEAR =====
export const getByYear = query({
  args: {
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const periods = await ctx.db
      .query("academicPeriods")
      .withIndex("by_year", (q) => q.eq("year", args.year))
      .collect()

    return periods.sort((a, b) => a.semester - b.semester)
  },
})

// ===== GET COMPLETED PERIODS (History) =====
export const getHistory = query({
  args: {
    sessionId: v.optional(v.optional(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20

    const periods = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "Completed"))
      .order("desc")
      .take(limit)

    return periods
  },
})

// ===== CREATE NEW PERIOD (First-time or new semester) =====
export const create = mutation({
  args: {
    sessionId: v.optional(v.string()),
    semester: v.number(),
    year: v.number(),
    startDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    setAsCurrent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId)
    if (!user) return { success: false, error: "You don't have permission to manage academic semesters." };

    // Only authorized roles can create periods
    if (user.role !== "ViceChancellor" && user.role !== "Registrar" && user.role !== "SystemAdmin") {
      return { success: false, error: "You do not have permission to start a new semester." };
    }

    // Validate semester
    if (args.semester < 1 || args.semester > 3) {
      return { success: false, error: "The semester number must be 1, 2, or 3." };
    }

    // Check if period already exists
    const existing = await ctx.db
      .query("academicPeriods")
      .withIndex("by_semester_year", (q) => q.eq("semester", args.semester).eq("year", args.year))
      .first()

    if (existing) {
      return { success: false, error: `Semester ${args.semester} ${args.year} already exists in our records.` };
    }

    // If setting as current, mark existing active period as completed
    if (args.setAsCurrent) {
      const currentActive = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "Active"))
        .first()

      if (currentActive) {
        await ctx.db.patch(currentActive._id, {
          status: "Completed",
          completedAt: Date.now(),
          completedBy: user._id,
        })
      }
    }

    // Create the new period
    const periodId = await ctx.db.insert("academicPeriods", {
      semester: args.semester,
      year: args.year,
      name: `Semester ${args.semester} ${args.year}`,
      startDate: args.startDate,
      status: args.setAsCurrent ? "Active" : "Upcoming",
      createdAt: Date.now(),
      createdBy: user._id,
      notes: args.notes,
    })

    // Update schoolConfig to reference this period if current
    if (args.setAsCurrent) {
      const config = await ctx.db.query("schoolConfig").first()
      if (config) {
        await ctx.db.patch(config._id, {
          currentPeriodId: periodId,
          currentSemester: args.semester,
          currentYear: args.year,
        })
      }
    }

    await logAction(
      ctx,
      user._id,
      "CREATE_PERIOD",
      `Created academic period: Semester ${args.semester} ${args.year}${args.setAsCurrent ? " (set as current)" : ""}`,
      "academicPeriods",
    )

    return { success: true, periodId }
  },
})

// ===== REVERT SEMESTER TRANSITION =====
export const revertSemesterTransition = mutation({
  args: {
    sessionId: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await checkCapability(ctx, args.sessionId, "manage:system:settings:academic_year");
    if (!user) {
      return { success: false, error: "You don't have permission to switch back to a previous semester." };
    }

    // Get current configuration
    const config = await ctx.db.query("schoolConfig").first();
    if (!config) {
      return { success: false, error: "The system settings haven't been set up yet." };
    }

    // Get current active period
    const currentPeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "Active"))
      .first()

    if (!currentPeriod) {
      return { success: false, error: "We couldn't find an active semester to go back from." };
    }

    // Find the previous period
    let previousSemester: number;
    let previousYear: number;

    if (currentPeriod.semester === 1) {
      previousSemester = 3;
      previousYear = currentPeriod.year - 1;
    } else {
      previousSemester = currentPeriod.semester - 1;
      previousYear = currentPeriod.year;
    }

    const previousPeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_semester_year", (q) => q.eq("semester", previousSemester).eq("year", previousYear))
      .first();

    if (!previousPeriod) {
      return { success: false, error: `We couldn't find the previous semester (Semester ${previousSemester} ${previousYear}) to switch back to.` };
    }

    // --- REVERT FINANCIAL CHANGES ---
    const students = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("status"), "Active"))
      .collect();

    if (students.length > 0) {
      const feeStructures = await ctx.db.query("feeStructures")
        .filter((q) => q.eq(q.field("semesterNumber"), currentPeriod.semester))
        .collect();
      
      const feeMap = new Map<string, any>(feeStructures.map(f => [f.programId!, f]));

      for (const student of students) {
        const structure = student.programId ? feeMap.get(student.programId) : null;
        const expectedToRevert = structure?.total || 0;

        if (expectedToRevert > 0) {
          await ctx.db.patch(student._id, {
            balance: (student.balance || 0) - expectedToRevert,
          });
        }
      }
    }

    // --- REVERT PERIOD STATUSES ---
    await ctx.db.patch(currentPeriod._id, {
      status: "Completed"
    });

    await ctx.db.patch(previousPeriod._id, {
      status: "Active"
    });

    // --- UPDATE CONFIGURATION ---
    await ctx.db.patch(config._id, {
      currentPeriodId: previousPeriod._id,
      currentSemester: previousSemester,
      currentYear: previousYear,
    });

    // --- LOG THE REVERT ---
    await logAction(
      ctx,
      user._id,
      "REVERT_SEMESTER_TRANSITION",
      `Reverted from Semester ${currentPeriod.semester} ${currentPeriod.year} to Semester ${previousSemester} ${previousYear}. Reason: ${args.reason || 'Manual revert'}`,
      "academicPeriods",
    );

    return {
      success: true,
      previousPeriod: {
        semester: previousSemester,
        year: previousYear,
        id: previousPeriod._id,
      },
      revertedFrom: {
        semester: currentPeriod.semester,
        year: currentPeriod.year,
        id: currentPeriod._id,
      }
    };
  },
});

// ===== ADVANCE TO NEXT SEMESTER =====
export const advanceToNextSemester = mutation({
  args: {
    sessionId: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    newSemesterStartDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await checkCapability(ctx, args.sessionId, "manage:system:settings:academic_year");
    if (!user) {
      return { success: false, error: "You don't have permission to move to the next semester." };
    }

    // Get current active period
    let currentPeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q) => q.eq("status", "Active"))
      .first()

    // Fallback & Self-healing
    if (!currentPeriod) {
      const config = await ctx.db.query("schoolConfig").first();
      if (config && config.currentSemester !== undefined && config.currentYear !== undefined) {
        currentPeriod = await ctx.db
          .query("academicPeriods")
          .withIndex("by_semester_year", (q) => q.eq("semester", config.currentSemester!).eq("year", config.currentYear!))
          .first();
      }

      if (!currentPeriod && config && config.currentSemester !== undefined && config.currentYear !== undefined) {
        const newPeriodId = await ctx.db.insert("academicPeriods", {
          semester: config.currentSemester!,
          year: config.currentYear!,
          name: `Semester ${config.currentSemester} ${config.currentYear}`,
          status: "Active",
          createdAt: Date.now(),
          createdBy: user._id,
          startDate: new Date().toISOString().split("T")[0],
        });
        currentPeriod = await ctx.db.get(newPeriodId);
      }
    }

    if (!currentPeriod) {
      return { success: false, error: "Please set up the current semester before trying to move to the next one." };
    }

    // Calculate next semester
    let nextSemester = currentPeriod.semester + 1
    let nextYear = currentPeriod.year

    if (nextSemester > 3) {
      nextSemester = 1
      nextYear = currentPeriod.year + 1
    }

    // Check if next period already exists
    const nextPeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_semester_year", (q) => q.eq("semester", nextSemester).eq("year", nextYear))
      .first()

    // --- FINANCIAL ROLL-OVER (Apply Next Semester Fees) ---
    const students = await ctx.db
      .query("students")
      .filter((q) => q.eq(q.field("status"), "Active"))
      .collect();

    if (students.length > 0) {
      const feeStructures = await ctx.db.query("feeStructures")
          .filter((q) => q.eq(q.field("semesterNumber"), nextSemester))
          .collect();

      const feeMap = new Map<string, any>(
        feeStructures
          .filter(f => f.programId !== undefined)
          .map((f) => [f.programId!, f])
      );

      // Update balances for next semester
      let rollOverCount = 0;
      for (const student of students) {
        const structure = student.programId ? feeMap.get(student.programId) : null;
        const expectedNext = structure?.total || 0;

        if (expectedNext > 0) {
          await ctx.db.patch(student._id, {
            balance: (student.balance || 0) + expectedNext,
          });
          rollOverCount++;
        }
      }
      console.log(`Financial transition: Applied Semester ${nextSemester} ${nextYear} fees to ${rollOverCount} students.`);
    }

    // Mark current period as completed
    await ctx.db.patch(currentPeriod._id, {
      status: "Completed",
      endDate: args.endDate || new Date().toISOString().split("T")[0],
      completedAt: Date.now(),
      completedBy: user._id,
      notes: args.notes || currentPeriod.notes,
    })

    // Create or activate next period
    let nextPeriodId
    if (nextPeriod) {
      await ctx.db.patch(nextPeriod._id, {
        status: "Active",
        startDate: args.newSemesterStartDate || new Date().toISOString().split("T")[0],
      })
      nextPeriodId = nextPeriod._id
    } else {
      nextPeriodId = await ctx.db.insert("academicPeriods", {
        semester: nextSemester,
        year: nextYear,
        name: `Semester ${nextSemester} ${nextYear}`,
        startDate: args.newSemesterStartDate || new Date().toISOString().split("T")[0],
        status: "Active",
        createdAt: Date.now(),
        createdBy: user._id,
      })
    }

    // Update schoolConfig
    const config = await ctx.db.query("schoolConfig").first()
    if (config) {
      await ctx.db.patch(config._id, {
        currentPeriodId: nextPeriodId,
        currentSemester: nextSemester,
        currentYear: nextYear,
      })
    }

    await logAction(
      ctx,
      user._id,
      "ADVANCE_SEMESTER",
      `Advanced from Semester ${currentPeriod.semester} ${currentPeriod.year} to Semester ${nextSemester} ${nextYear}. Rolled over unpaid balances.`,
      "academicPeriods",
    )

    return {
      success: true,
      previousPeriod: {
        semester: currentPeriod.semester,
        year: currentPeriod.year,
      },
      newPeriod: {
        semester: nextSemester,
        year: nextYear,
        id: nextPeriodId,
      },
    }
  },
})

// ===== UPDATE PERIOD =====
export const update = mutation({
  args: {
    sessionId: v.optional(v.string()),
    periodId: v.id("academicPeriods"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId)
    if (!user) return { success: false, error: "You don't have permission to update semester dates." };

    const period = await ctx.db.get(args.periodId)
    if (!period) {
      return { success: false, error: "We couldn't find that semester's record." };
    }

    await ctx.db.patch(args.periodId, {
      startDate: args.startDate ?? period.startDate,
      endDate: args.endDate ?? period.endDate,
      notes: args.notes ?? period.notes,
    })

    await logAction(
      ctx,
      user._id,
      "UPDATE_PERIOD",
      `Updated period: Semester ${period.semester} ${period.year}`,
      "academicPeriods",
    )

    return { success: true }
  },
})

// ===== SET ACTIVE PERIOD (for switching view context) =====
export const setActive = mutation({
  args: {
    sessionId: v.optional(v.string()),
    periodId: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.sessionId)
    if (!user) return { success: false, error: "You don't have permission to change the current semester." };

    if (user.role !== "ViceChancellor" && user.role !== "Registrar" && user.role !== "SystemAdmin") {
      return { success: false, error: "You do not have permission to change the current semester." };
    }

    const period = await ctx.db.get(args.periodId)
    if (!period) {
      return { success: false, error: "We couldn't find that semester's record." };
    }

    // Mark all other periods as not active
    const allPeriods = await ctx.db.query("academicPeriods").collect()
    const now = Date.now()

    for (const p of allPeriods) {
      if (p._id !== args.periodId && p.status === "Active") {
        await ctx.db.patch(p._id, {
          status: "Completed",
          completedAt: now,
          completedBy: user._id,
        })
      }
    }

    // Set the selected period as active
    await ctx.db.patch(args.periodId, {
      status: "Active",
    })

    // Update schoolConfig
    const config = await ctx.db.query("schoolConfig").first()
    if (config) {
      await ctx.db.patch(config._id, {
        currentPeriodId: args.periodId,
        currentSemester: period.semester,
        currentYear: period.year,
      })
    }

    await logAction(
      ctx,
      user._id,
      "SET_ACTIVE_PERIOD",
      `Set Semester ${period.semester} ${period.year} as active period`,
      "academicPeriods",
    )

    return { success: true }
  },
})

// ===== GET AVAILABLE YEARS =====
export const getAvailableYears = query({
  args: {},
  handler: async (ctx) => {
    const periods = await ctx.db.query("academicPeriods").collect()
    const years = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a)

    if (years.length === 0) {
      const currentYear = new Date().getFullYear()
      return [currentYear, currentYear + 1]
    }

    return years
  },
})
