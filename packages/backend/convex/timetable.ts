import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { logAction } from "./audit_logger.js";
import { assertRole, assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";

// Helper to fetch user map
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

const dayOrder: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// Helper: check time overlap between two "HH:MM" intervals
function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export const getLecturerTimetable = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }
    if (!periodId) return [];

    const slots = await ctx.db
      .query("timetables")
      .withIndex("by_lecturer_period", (q) =>
        q.eq("lecturerId", userId).eq("periodId", periodId!)
      )
      .collect();

    const enriched = await Promise.all(
      slots.map(async (s) => {
        const course = await ctx.db.get(s.courseId);
        return {
          _id: s._id,
          courseId: s.courseId,
          courseCode: course?.code ?? "—",
          courseTitle: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          building: s.building,
          capacity: s.capacity,
        };
      })
    );

    // Sort by day and time
    enriched.sort((a, b) => {
      const dayDiff = (dayOrder[a.dayOfWeek] || 0) - (dayOrder[b.dayOfWeek] || 0);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return enriched;
  },
});

export const getDepartmentTimetable = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }
    if (!periodId) return [];

    const slots = await ctx.db
      .query("timetables")
      .filter((q) => q.eq(q.field("periodId"), periodId))
      .collect();

    const usersMap = await getUsersMap(ctx);

    const enriched = await Promise.all(
      slots.map(async (s) => {
        const course = await ctx.db.get(s.courseId);
        const lecturer = usersMap.get(s.lecturerId);

        return {
          _id: s._id,
          courseId: s.courseId,
          courseCode: course?.code ?? "—",
          courseTitle: course?.title ?? "—",
          departmentId: course?.departmentId,
          lecturerId: s.lecturerId,
          lecturerName: lecturer?.name ?? "Lecturer",
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          building: s.building,
          capacity: s.capacity,
        };
      })
    );

    let filtered = enriched;
    if (args.departmentId) {
      filtered = enriched.filter((s) => s.departmentId === args.departmentId);
    }

    filtered.sort((a, b) => {
      const dayDiff = (dayOrder[a.dayOfWeek] || 0) - (dayOrder[b.dayOfWeek] || 0);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return filtered;
  },
});

export const createTimetableSlot = mutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    lecturerId: v.string(),
    dayOfWeek: v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday")
    ),
    startTime: v.string(),
    endTime: v.string(),
    room: v.string(),
    building: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "staff"]);

    if (args.startTime >= args.endTime) {
      throw new Error("Start time must be strictly before end time.");
    }

    // Check 1: Room collision detection
    const existingRoomSlots = await ctx.db
      .query("timetables")
      .withIndex("by_period_day", (q) =>
        q.eq("periodId", args.periodId).eq("dayOfWeek", args.dayOfWeek)
      )
      .filter((q) => q.eq(q.field("room"), args.room.trim()))
      .collect();

    for (const slot of existingRoomSlots) {
      if (isTimeOverlapping(args.startTime, args.endTime, slot.startTime, slot.endTime)) {
        const conflictingCourse = await ctx.db.get(slot.courseId);
        throw new Error(
          `Room Collision: Room "${args.room}" is already booked on ${args.dayOfWeek.toUpperCase()} (${slot.startTime}–${slot.endTime}) for ${conflictingCourse?.code ?? "another course"}.`
        );
      }
    }

    // Check 2: Lecturer collision detection
    const existingLecturerSlots = await ctx.db
      .query("timetables")
      .withIndex("by_lecturer_period", (q) =>
        q.eq("lecturerId", args.lecturerId).eq("periodId", args.periodId)
      )
      .filter((q) => q.eq(q.field("dayOfWeek"), args.dayOfWeek))
      .collect();

    for (const slot of existingLecturerSlots) {
      if (isTimeOverlapping(args.startTime, args.endTime, slot.startTime, slot.endTime)) {
        const conflictingCourse = await ctx.db.get(slot.courseId);
        throw new Error(
          `Lecturer Collision: The assigned lecturer is already teaching ${conflictingCourse?.code ?? "another course"} on ${args.dayOfWeek.toUpperCase()} (${slot.startTime}–${slot.endTime}) in Room ${slot.room}.`
        );
      }
    }

    const id = await ctx.db.insert("timetables", {
      courseId: args.courseId,
      periodId: args.periodId,
      lecturerId: args.lecturerId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      room: args.room.trim(),
      building: args.building?.trim(),
      capacity: args.capacity,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const course = await ctx.db.get(args.courseId);
    await logAction(ctx, {
      action: "CREATE_TIMETABLE_SLOT",
      resource: "timetables",
      details: `Scheduled ${course?.code} on ${args.dayOfWeek} (${args.startTime}-${args.endTime}) in ${args.room}`,
    });

    return id;
  },
});

export const deleteTimetableSlot = mutation({
  args: {
    id: v.id("timetables"),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "staff"]);

    const slot = await ctx.db.get(args.id);
    if (!slot) return;

    await ctx.db.delete(args.id);

    await logAction(ctx, {
      action: "DELETE_TIMETABLE_SLOT",
      resource: "timetables",
      details: `Deleted timetable slot for course ${slot.courseId} in room ${slot.room}`,
    });

    return { success: true };
  },
});
