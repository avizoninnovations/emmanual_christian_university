import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { logAction } from "./audit_logger.js";
import { assertRole, assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";

async function getUsersMap(ctx: any): Promise<Map<string, { name: string; email: string }>> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 2000 },
    });
    const users = result?.page || [];
    return new Map(users.map((u: any) => [u._id, { name: u.name, email: u.email }]));
  } catch {
    return new Map();
  }
}

// ─────────────────────────────────────────────────────────
// ATTENDANCE MANAGEMENT
// ─────────────────────────────────────────────────────────

export const recordAttendanceSession = mutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    date: v.string(), // YYYY-MM-DD
    topic: v.optional(v.string()),
    records: v.array(
      v.object({
        studentId: v.id("students"),
        status: v.union(v.literal("present"), v.literal("absent"), v.literal("late")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    // Check if session already recorded for this date
    const existing = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_course_period_date", (q: any) =>
        q
          .eq("courseId", args.courseId)
          .eq("periodId", args.periodId)
          .eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        topic: args.topic,
        records: args.records,
      });
    } else {
      await ctx.db.insert("attendanceRecords", {
        courseId: args.courseId,
        periodId: args.periodId,
        lecturerId: userId,
        date: args.date,
        topic: args.topic,
        records: args.records,
      });
    }

    const course = await ctx.db.get(args.courseId);
    await logAction(ctx, {
      action: "RECORD_ATTENDANCE",
      resource: "attendanceRecords",
      details: `Logged roll call for ${course?.code} on ${args.date} (${args.records.length} students)`,
    });

    return { success: true };
  },
});

export const getCourseAttendanceHistory = query({
  args: {
    courseId: v.id("courses"),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q: any) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return [];

    const sessions = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_course_period", (q: any) =>
        q.eq("courseId", args.courseId).eq("periodId", periodId!)
      )
      .order("desc")
      .collect();

    return sessions.map((s) => {
      const present = s.records.filter((r) => r.status === "present").length;
      const absent = s.records.filter((r) => r.status === "absent").length;
      const late = s.records.filter((r) => r.status === "late").length;
      const total = s.records.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        _id: s._id,
        date: s.date,
        topic: s.topic,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        totalEnrolled: total,
        attendanceRate: rate,
      };
    });
  },
});

export const getStudentAttendanceSummary = query({
  args: {
    courseId: v.id("courses"),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q: any) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return [];

    const sessions = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_course_period", (q: any) =>
        q.eq("courseId", args.courseId).eq("periodId", periodId!)
      )
      .collect();

    const totalSessions = sessions.length;
    const usersMap = await getUsersMap(ctx);

    // Map student stats
    const studentStats = new Map<
      string,
      { present: number; absent: number; late: number }
    >();

    for (const sess of sessions) {
      for (const rec of sess.records) {
        const current = studentStats.get(rec.studentId) || {
          present: 0,
          absent: 0,
          late: 0,
        };
        if (rec.status === "present") current.present++;
        else if (rec.status === "absent") current.absent++;
        else if (rec.status === "late") current.late++;
        studentStats.set(rec.studentId, current);
      }
    }

    const results = await Promise.all(
      Array.from(studentStats.entries()).map(async ([sid, stats]) => {
        const student = await ctx.db.get(sid as Id<"students">);
        const user = student?.userId ? usersMap.get(student.userId) : null;
        const attended = stats.present + stats.late;
        const percentage =
          totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

        return {
          studentId: sid,
          studentName: user?.name ?? "Student",
          studentRegNumber: student?.registrationNumber ?? "—",
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          totalSessions,
          percentage,
          isEligibleForExams: percentage >= 75,
        };
      })
    );

    return results;
  },
});
