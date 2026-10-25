import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { logAction } from "./audit_logger.js";
import { assertAuthenticated } from "./lib/utils.js";

const requestType = v.union(v.literal("leave"), v.literal("exit"), v.literal("complaint"), v.literal("defense"));
const hrRoles = ["hr_officer", "admin"];
const allowedFiles = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const maxFileSize = 15 * 1024 * 1024;

async function getStaffProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await assertAuthenticated(ctx);
  const profile = await ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", userId)).unique();
  if (!profile || profile.status !== "active") throw new ConvexError("An active staff profile is required.");
  return profile;
}

async function assertHrProfile(ctx: QueryCtx | MutationCtx) {
  const profile = await getStaffProfile(ctx);
  if (!profile.roles.some(role => hrRoles.includes(role))) throw new ConvexError("Only Human Resources or an administrator can manage these records.");
  return profile;
}

function assertDateRange(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || startDate > endDate) {
    throw new ConvexError("Enter a valid date range with an end date on or after the start date.");
  }
}

export const getMyRequests = query({
  args: { paginationOpts: paginationOptsValidator, type: v.optional(requestType) },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const query = args.type
      ? ctx.db.query("staffServiceRequests").withIndex("by_requester_type", q => q.eq("requesterProfileId", profile._id).eq("type", args.type!))
      : ctx.db.query("staffServiceRequests").withIndex("by_requester", q => q.eq("requesterProfileId", profile._id));
    return await query.order("desc").paginate(args.paginationOpts);
  },
});
export const getActiveStaffOptions = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    const page = await ctx.db.query("staffProfiles").withIndex("by_status", q => q.eq("status", "active")).paginate(args.paginationOpts);
    return { ...page, page: page.page.map(profile => ({
      id: profile._id,
      staffId: profile.staffId,
      name: [profile.personalDetails?.firstName, profile.personalDetails?.surname].filter(Boolean).join(" ") || profile.staffId,
      departmentId: profile.departmentId ?? null,
      supervisorProfileId: profile.supervisorProfileId ?? null,
    })) };
  },
});

export const getRequestDetails = query({
  args: { requestId: v.id("staffServiceRequests") },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("This staff service record no longer exists.");
    const isHr = profile.roles.some(role => hrRoles.includes(role));
    if (request.requesterProfileId !== profile._id && request.supervisorProfileId !== profile._id
      && request.assignedHrProfileId !== profile._id && !isHr) {
      throw new ConvexError("You do not have access to this staff service record.");
    }
    const [files, events, clearanceTasks] = await Promise.all([
      ctx.db.query("staffServiceFiles").withIndex("by_request", q => q.eq("requestId", request._id)).take(100),
      ctx.db.query("staffServiceEvents").withIndex("by_request", q => q.eq("requestId", request._id)).order("desc").take(100),
      request.type === "exit"
        ? ctx.db.query("staffExitClearanceTasks").withIndex("by_request", q => q.eq("requestId", request._id)).take(50)
        : Promise.resolve([]),
    ]);
    const visibleEvents = events.filter(event => event.visibility === "participants" || isHr || event.actorProfileId === profile._id);
    const filesWithUrls = await Promise.all(files.map(async file => ({ ...file, url: await ctx.storage.getUrl(file.fileId) })));
    return { request, files: filesWithUrls, events: visibleEvents, clearanceTasks };
  },
});

export const createRequestDraft = mutation({
  args: {
    type: v.union(v.literal("leave"), v.literal("exit"), v.literal("complaint")),
    subject: v.string(), details: v.string(),
    leaveType: v.optional(v.string()), startDate: v.optional(v.string()), endDate: v.optional(v.string()),
    handoverPlan: v.optional(v.string()), proposedLastDay: v.optional(v.string()),
    complaintCategory: v.optional(v.string()), involvedPeople: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    if (args.subject.trim().length < 3 || args.subject.length > 160 || args.details.trim().length < 10 || args.details.length > 10000) {
      throw new ConvexError("Add a short subject and at least 10 characters of detail.");
    }
    if (args.type === "leave") {
      if (!args.leaveType || !args.startDate || !args.endDate) throw new ConvexError("Choose a leave type and enter both dates.");
      assertDateRange(args.startDate, args.endDate);
    }
    if (args.type === "exit" && !args.proposedLastDay) throw new ConvexError("Enter your proposed last working day.");
    if (args.type === "complaint" && !args.complaintCategory) throw new ConvexError("Choose a complaint category.");
    const now = Date.now();
    const requestId = await ctx.db.insert("staffServiceRequests", {
      type: args.type, requesterProfileId: profile._id,
      ...(args.type !== "complaint" && profile.supervisorProfileId ? { supervisorProfileId: profile.supervisorProfileId } : {}),
      status: "draft", subject: args.subject.trim(), details: args.details.trim(),
      ...(args.leaveType ? { leaveType: args.leaveType.trim(), startDate: args.startDate, endDate: args.endDate, handoverPlan: args.handoverPlan?.trim() } : {}),
      ...(args.proposedLastDay ? { proposedLastDay: args.proposedLastDay } : {}),
      ...(args.complaintCategory ? { complaintCategory: args.complaintCategory.trim(), involvedPeople: args.involvedPeople?.trim() } : {}),
      createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("staffServiceEvents", {
      requestId, actorProfileId: profile._id, kind: "created", toStatus: "draft",
      visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now,
    });
    await logAction(ctx, { action: "CREATE_STAFF_SERVICE_DRAFT", resource: "staffServiceRequests", details: `Created ${args.type} request draft.` });
    return requestId;
  },
});

export const generateServiceUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    await getStaffProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachRequestFile = mutation({
  args: { requestId: v.id("staffServiceRequests"), fileId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("This staff service record no longer exists.");
    if (request.requesterProfileId !== profile._id || !["draft", "response_due"].includes(request.status)) {
      throw new ConvexError("Files can only be added to your draft or active defense response.");
    }
    const metadata = await ctx.db.system.get("_storage", args.fileId);
    if (!metadata || metadata.size > maxFileSize || !allowedFiles.has(metadata.contentType ?? "")) {
      throw new ConvexError("Choose a PDF, image, or Word document no larger than 15 MB.");
    }
    const existing = await ctx.db.query("staffServiceFiles").withIndex("by_request", q => q.eq("requestId", request._id)).take(10);
    if (existing.length >= 10) throw new ConvexError("A request can contain at most 10 attachments.");
    const now = Date.now();
    await ctx.db.insert("staffServiceFiles", {
      requestId: request._id, fileId: args.fileId, fileName: args.fileName.trim().slice(0, 180) || "Attachment",
      contentType: metadata.contentType ?? "application/octet-stream", size: metadata.size,
      uploadedByProfileId: profile._id, createdAt: now, updatedAt: now,
    });
    await logAction(ctx, { action: "UPLOAD_STAFF_SERVICE_FILE", resource: "staffServiceFiles", details: `Added an attachment to ${request.type} request.` });
  },
});

export const submitRequest = mutation({
  args: { requestId: v.id("staffServiceRequests") },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.requesterProfileId !== profile._id) throw new ConvexError("Your draft could not be found.");
    if (request.type === "defense" || !["draft", "returned"].includes(request.status)) throw new ConvexError("This request cannot be submitted in its current status.");
    if (["leave", "exit"].includes(request.type) && !profile.supervisorProfileId) throw new ConvexError("Your staff profile has no supervisor. Contact HR before submitting this request.");
    const status = request.type === "complaint" ? "hr_review" : "supervisor_review";
    const now = Date.now();
    await ctx.db.patch(request._id, { status, supervisorProfileId: request.type === "complaint" ? undefined : profile.supervisorProfileId, submittedAt: now, updatedAt: now });
    await ctx.db.insert("staffServiceEvents", { requestId: request._id, actorProfileId: profile._id, kind: "submitted", fromStatus: request.status, toStatus: status, visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "SUBMIT_STAFF_SERVICE_REQUEST", resource: "staffServiceRequests", details: `Submitted ${request.type} request.` });
  },
});

export const withdrawRequest = mutation({
  args: { requestId: v.id("staffServiceRequests") },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.requesterProfileId !== profile._id) throw new ConvexError("Your request could not be found.");
    if (!["draft", "submitted", "supervisor_review", "hr_review", "returned"].includes(request.status)) throw new ConvexError("This request can no longer be withdrawn.");
    const now = Date.now();
    await ctx.db.patch(request._id, { status: "withdrawn", updatedAt: now });
    await ctx.db.insert("staffServiceEvents", { requestId: request._id, actorProfileId: profile._id, kind: "withdrawn", fromStatus: request.status, toStatus: "withdrawn", visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "WITHDRAW_STAFF_SERVICE_REQUEST", resource: "staffServiceRequests", details: `Withdrew ${request.type} request.` });
  },
});

export const getSupervisorQueue = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const page = await ctx.db.query("staffServiceRequests")
      .withIndex("by_supervisor_status", q => q.eq("supervisorProfileId", profile._id).eq("status", "supervisor_review"))
      .order("desc").paginate(args.paginationOpts);
    return page;
  },
});

export const reviewAsSupervisor = mutation({
  args: { requestId: v.id("staffServiceRequests"), decision: v.union(v.literal("forward"), v.literal("return"), v.literal("reject")), note: v.string() },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.supervisorProfileId !== profile._id || request.status !== "supervisor_review") throw new ConvexError("This request is not awaiting your review.");
    if (args.note.trim().length < 3) throw new ConvexError("Add a short note with your decision.");
    const status = args.decision === "forward" ? "hr_review" : args.decision === "return" ? "returned" : "rejected";
    const now = Date.now();
    await ctx.db.patch(request._id, { status, decisionNote: args.note.trim(), updatedAt: now });
    const eventKind = args.decision === "forward" ? "approved" : args.decision === "return" ? "returned" : "rejected";
    await ctx.db.insert("staffServiceEvents", { requestId: request._id, actorProfileId: profile._id, kind: eventKind, fromStatus: request.status, toStatus: status, note: args.note.trim(), visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "REVIEW_STAFF_SERVICE_REQUEST", resource: "staffServiceRequests", details: `${request.type} request ${args.decision} by supervisor.` });
  },
});

export const getHrQueue = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    return await ctx.db.query("staffServiceRequests").withIndex("by_status", q => q.eq("status", "hr_review")).order("desc").paginate(args.paginationOpts);
  },
});

export const decideAsHr = mutation({
  args: { requestId: v.id("staffServiceRequests"), decision: v.union(v.literal("approve"), v.literal("return"), v.literal("reject"), v.literal("resolve")), note: v.string() },
  handler: async (ctx, args) => {
    const profile = await assertHrProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "hr_review") throw new ConvexError("This request is not awaiting HR review.");
    if (args.note.trim().length < 3) throw new ConvexError("Add a short note explaining your decision.");
    if (args.decision === "resolve" && request.type !== "complaint") throw new ConvexError("Only a complaint can be marked as resolved.");
    if (args.decision === "approve" && request.type === "complaint") throw new ConvexError("Use Resolve to close a complaint.");
    const status = args.decision === "return" ? "returned" : args.decision === "reject" ? "rejected" : args.decision === "resolve" ? "completed" : "approved";
    const now = Date.now();
    await ctx.db.patch(request._id, { status, assignedHrProfileId: profile._id, decisionNote: args.note.trim(), updatedAt: now });
    if (request.type === "exit" && status === "approved") {
      const clearanceItems: [string, string][] = [
        ["Department", "Complete handover and return department property"],
        ["Finance", "Confirm outstanding financial obligations"],
        ["Library", "Return borrowed library materials"],
        ["ICT", "Return university devices and close system access"],
        ["Human Resources", "Complete final employment records"],
      ];
      for (const [department, task] of clearanceItems) {
        await ctx.db.insert("staffExitClearanceTasks", { requestId: request._id, department, task, status: "pending", createdAt: now, updatedAt: now });
      }
    }
    const eventKind = status === "completed" ? "completed" : status;
    await ctx.db.insert("staffServiceEvents", { requestId: request._id, actorProfileId: profile._id, kind: eventKind, fromStatus: request.status, toStatus: status, note: args.note.trim(), visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "DECIDE_STAFF_SERVICE_REQUEST", resource: "staffServiceRequests", details: `${request.type} request set to ${status}.` });
  },
});

export const updateExitClearanceTask = mutation({
  args: { taskId: v.id("staffExitClearanceTasks"), status: v.union(v.literal("cleared"), v.literal("not_applicable"), v.literal("pending")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new ConvexError("The clearance task could not be found.");
    const request = await ctx.db.get(task.requestId);
    const isHr = profile.roles.some(role => hrRoles.includes(role));
    if (!request || request.type !== "exit" || request.status !== "approved") throw new ConvexError("This exit clearance is not active.");
    if (!isHr && task.assignedToProfileId !== profile._id) throw new ConvexError("This clearance task is not assigned to you.");
    if (args.note && args.note.length > 1000) throw new ConvexError("The clearance note must be 1,000 characters or fewer.");
    const now = Date.now();
    await ctx.db.patch(task._id, { status: args.status, note: args.note?.trim(), completedAt: args.status === "pending" ? undefined : now, updatedAt: now });
    const tasks = await ctx.db.query("staffExitClearanceTasks").withIndex("by_request", q => q.eq("requestId", task.requestId)).take(50);
    const allCleared = tasks.length > 0 && tasks.every(item => item._id === task._id ? args.status !== "pending" : item.status !== "pending");
    if (allCleared) {
      await ctx.db.patch(request._id, { status: "completed", updatedAt: now });
      await ctx.db.insert("staffServiceEvents", { requestId: request._id, actorProfileId: profile._id, kind: "completed", fromStatus: request.status, toStatus: "completed", note: "All exit clearance tasks are complete.", visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    }
    await logAction(ctx, { action: "UPDATE_EXIT_CLEARANCE", resource: "staffExitClearanceTasks", details: `Updated exit clearance task ${task.department}: ${args.status}.` });
  },
});

export const createDefenseCase = mutation({
  args: { staffProfileId: v.id("staffProfiles"), caseReference: v.string(), subject: v.string(), notice: v.string(), responseDueAt: v.number() },
  handler: async (ctx, args) => {
    const profile = await assertHrProfile(ctx);
    const staff = await ctx.db.get(args.staffProfileId);
    if (!staff || staff.status !== "active") throw new ConvexError("Choose an active staff member.");
    if (args.caseReference.trim().length < 2 || args.subject.trim().length < 3 || args.notice.trim().length < 10) throw new ConvexError("Enter a case reference, subject, and complete notice.");
    if (args.responseDueAt <= Date.now()) throw new ConvexError("The response deadline must be in the future.");
    const now = Date.now();
    const requestId = await ctx.db.insert("staffServiceRequests", { type: "defense", requesterProfileId: staff._id, assignedHrProfileId: profile._id, status: "response_due", subject: args.subject.trim(), details: args.notice.trim(), caseReference: args.caseReference.trim(), responseDueAt: args.responseDueAt, submittedAt: now, createdAt: now, updatedAt: now });
    await ctx.db.insert("staffServiceEvents", { requestId, actorProfileId: profile._id, kind: "created", toStatus: "response_due", visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "CREATE_STAFF_DEFENSE_CASE", resource: "staffServiceRequests", details: `Opened a formal response case for staff ${staff.staffId}.` });
    return requestId;
  },
});

export const submitDefenseResponse = mutation({
  args: { requestId: v.id("staffServiceRequests"), response: v.string() },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.type !== "defense" || request.requesterProfileId !== profile._id || request.status !== "response_due") throw new ConvexError("This case is not awaiting your response.");
    if ((request.responseDueAt ?? 0) < Date.now()) throw new ConvexError("The response deadline has passed. Contact Human Resources.");
    if (args.response.trim().length < 10 || args.response.length > 10000) throw new ConvexError("Enter a response between 10 and 10,000 characters.");
    const now = Date.now();
    await ctx.db.patch(request._id, { response: args.response.trim(), responseSubmittedAt: now, status: "response_submitted", updatedAt: now });
    await ctx.db.insert("staffServiceEvents", { requestId: request._id, actorProfileId: profile._id, kind: "response_submitted", fromStatus: request.status, toStatus: "response_submitted", visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "SUBMIT_STAFF_DEFENSE_RESPONSE", resource: "staffServiceRequests", details: "Submitted a response to a staff case." });
  },
});

export const getDefenseQueue = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertHrProfile(ctx);
    return await ctx.db.query("staffServiceRequests")
      .withIndex("by_type_status", q => q.eq("type", "defense").eq("status", "response_submitted"))
      .order("desc").paginate(args.paginationOpts);
  },
});

export const completeDefenseCase = mutation({
  args: { requestId: v.id("staffServiceRequests"), outcome: v.string() },
  handler: async (ctx, args) => {
    const profile = await assertHrProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.type !== "defense" || request.status !== "response_submitted") throw new ConvexError("This case is not ready for an HR outcome.");
    if (args.outcome.trim().length < 3) throw new ConvexError("Add a clear outcome before closing the case.");
    const now = Date.now();
    await ctx.db.patch(request._id, { status: "completed", decisionNote: args.outcome.trim(), assignedHrProfileId: profile._id, updatedAt: now });
    await ctx.db.insert("staffServiceEvents", { requestId: request._id, actorProfileId: profile._id, kind: "completed", fromStatus: request.status, toStatus: "completed", note: args.outcome.trim(), visibility: "participants", occurredAt: now, createdAt: now, updatedAt: now });
    await logAction(ctx, { action: "COMPLETE_STAFF_DEFENSE_CASE", resource: "staffServiceRequests", details: "Recorded an HR outcome for a staff response case." });
  },
});

export const getMyLeaveCalendar = query({
  args: { startDate: v.string(), endDate: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await getStaffProfile(ctx);
    assertDateRange(args.startDate, args.endDate);
    const isHr = profile.roles.some(role => hrRoles.includes(role));
    const supervisorRows = await ctx.db.query("staffServiceRequests").withIndex("by_supervisor_status", q => q.eq("supervisorProfileId", profile._id).eq("status", "approved")).take(200);
    const ownRows = await ctx.db.query("staffServiceRequests").withIndex("by_requester", q => q.eq("requesterProfileId", profile._id)).order("desc").take(200);
    const rows = [...ownRows, ...(isHr ? await ctx.db.query("staffServiceRequests").withIndex("by_type_status", q => q.eq("type", "leave").eq("status", "approved")).take(500) : supervisorRows)]
      .filter(row => row.type === "leave" && row.status === "approved" && row.startDate && row.endDate && row.startDate <= args.endDate && row.endDate >= args.startDate);
    const unique = [...new Map(rows.map(row => [row._id, row])).values()];
    const start = args.paginationOpts.cursor ? Number(args.paginationOpts.cursor) : 0;
    const page = unique.slice(start, start + args.paginationOpts.numItems);
    const names = await Promise.all(page.map(async row => {
      const staff = await ctx.db.get(row.requesterProfileId);
      const personalDetails = staff?.personalDetails;
      const staffName = [personalDetails?.firstName, personalDetails?.surname].filter(Boolean).join(" ");
      return { id: row._id, staffName: staffName || staff?.staffId || "Staff member", leaveType: row.leaveType ?? "Leave", startDate: row.startDate ?? "", endDate: row.endDate ?? "", subject: row.subject };
    }));
    return { page: names, isDone: start + args.paginationOpts.numItems >= unique.length, continueCursor: String(start + args.paginationOpts.numItems) };
  },
});
