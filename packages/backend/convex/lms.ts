import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./authHelpers";

// --- MODULES ---

export const createModule = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    semester: v.number(),
    year: v.number(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Basic auth check
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get Highest Order
    const existing = await ctx.db
      .query("courseModules")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    
    let maxOrder = 0;
    if (existing.length > 0) {
      maxOrder = Math.max(...existing.map((m) => m.order));
    }

    return await ctx.db.insert("courseModules", {
      courseId: args.courseId,
      title: args.title,
      description: args.description,
      isPublished: args.isPublished,
      semester: args.semester,
      year: args.year,
      order: maxOrder + 1,
    });
  },
});

export const getCourseModules = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("courseModules")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

// --- MATERIALS ---

export const uploadMaterial = mutation({
  args: {
    moduleId: v.id("courseModules"),
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("pdf"), v.literal("video"), v.literal("document"), v.literal("link"), v.literal("audio")),
    fileUrl: v.string(), // Cloudflare R2
    fileSize: v.optional(v.number()),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("courseMaterials")
      .withIndex("by_module", (q) => q.eq("moduleId", args.moduleId))
      .collect();
      
    let maxOrder = 0;
    if (existing.length > 0) {
      maxOrder = Math.max(...existing.map((m) => m.order));
    }

    return await ctx.db.insert("courseMaterials", {
      ...args,
      uploadedBy: user._id,
      order: maxOrder + 1,
      viewCount: 0,
    });
  },
});

export const getModuleMaterials = query({
  args: {
    moduleId: v.id("courseModules"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("courseMaterials")
      .withIndex("by_module", (q) => q.eq("moduleId", args.moduleId))
      .collect();
  },
});

// --- TRACKING ---

export const trackMaterialView = mutation({
  args: {
    materialId: v.id("courseMaterials"),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    // Record view
    await ctx.db.insert("materialViews", {
      materialId: args.materialId,
      studentId: args.studentId,
      viewedAt: Date.now(),
    });

    // Increment overall counter
    const mat = await ctx.db.get(args.materialId);
    if (mat) {
      await ctx.db.patch(mat._id, {
        viewCount: (mat.viewCount || 0) + 1,
      });
    }
  },
});

// --- ASSIGNMENTS ---

export const createAssignment = mutation({
  args: {
    moduleId: v.id("courseModules"),
    courseId: v.id("courses"),
    title: v.string(),
    instructions: v.string(),
    maxScore: v.number(),
    dueDate: v.number(),
    attachmentUrl: v.optional(v.string()), // Cloudflare R2
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db.insert("courseAssignments", {
      ...args,
      createdBy: user._id,
    });
  },
});

// --- SUBMISSIONS ---

export const submitAssignment = mutation({
  args: {
    assignmentId: v.id("courseAssignments"),
    studentId: v.id("students"),
    courseId: v.id("courses"),
    fileUrl: v.optional(v.string()), // Cloudflare R2 submission
    textResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if previously submitted
    const existing = await ctx.db
      .query("studentSubmissions")
      .withIndex("by_assignment_student", (q) => 
        q.eq("assignmentId", args.assignmentId).eq("studentId", args.studentId)
      )
      .first();

    if (existing) {
      // Update
      return await ctx.db.patch(existing._id, {
        fileUrl: args.fileUrl,
        textResponse: args.textResponse,
        submittedAt: Date.now(),
        status: "Submitted",
      });
    }

    return await ctx.db.insert("studentSubmissions", {
      ...args,
      submittedAt: Date.now(),
      status: "Submitted",
    });
  },
});

export const getAssignment = query({
  args: {
    assignmentId: v.id("courseAssignments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assignmentId);
  },
});

export const getAuthStudent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const getEnrolledCourses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];
    
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!student) return [];

    const registrations = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_student_period", (q) => q.eq("studentId", student._id))
      .collect();

    const courseIds = registrations.map((r) => r.courseId);
    const courses = await Promise.all(courseIds.map((id) => ctx.db.get(id)));
    return courses.filter((c) => c !== null);
  },
});

export const getTaughtCourses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    const allocations = await ctx.db
      .query("courseAllocations")
      .withIndex("by_lecturer", (q) => q.eq("lecturerId", user._id))
      .collect();

    const courseIds = allocations.map((a) => a.courseId);
    const courses = await Promise.all(courseIds.map((id) => ctx.db.get(id)));
    return courses.filter((c) => c !== null);
  },
});
