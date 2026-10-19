import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { mutation as auditedMutation } from "./lib/mutations";
import { logAction } from "./audit_logger";
import { assertAuthenticated } from "./lib/utils";

const sectionValidator = v.union(
  v.literal("contact"),
  v.literal("bankAccount"),
  v.literal("qualification"),
  v.literal("experience"),
  v.literal("publication"),
  v.literal("nextOfKin"),
  v.literal("spouse"),
  v.literal("child"),
  v.literal("parent"),
  v.literal("document"),
);

async function getOwnProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await assertAuthenticated(ctx);
  const profile = await ctx.db
    .query("staffProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) {
    throw new ConvexError({ message: "Staff profile not found.", code: "NOT_FOUND" });
  }

  return profile;
}

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getOwnProfile(ctx);
    const entries = await ctx.db
      .query("staffProfileEntries")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .take(100);

    const entriesWithUrls = await Promise.all(entries.map(async (entry) => ({
      ...entry,
      fileUrl: entry.fileId ? await ctx.storage.getUrl(entry.fileId) : null,
    })));
    return { profile, entries: entriesWithUrls };
  },
});

export const generateMyProfileUploadUrl = auditedMutation({
  args: {},
  handler: async (ctx) => {
    await getOwnProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveMyPersonalDetails = auditedMutation({
  args: { details: v.record(v.string(), v.string()) },
  handler: async (ctx, args) => {
    const profile = await getOwnProfile(ctx);
    await ctx.db.patch(profile._id, { personalDetails: args.details, updatedAt: Date.now() });
    await logAction(ctx, {
      action: "UPDATE_MY_STAFF_PROFILE",
      resource: "staffProfiles",
      details: `Updated personal staff profile fields: ${Object.keys(args.details).join(", ")}`,
    });
    return profile._id;
  },
});

export const saveMyProfileEntry = auditedMutation({
  args: {
    entryId: v.optional(v.id("staffProfileEntries")),
    section: sectionValidator,
    title: v.optional(v.string()),
    data: v.record(v.string(), v.string()),
    fileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const profile = await getOwnProfile(ctx);
    const now = Date.now();

    if (args.entryId) {
      const existing = await ctx.db.get(args.entryId);
      if (!existing || existing.profileId !== profile._id) {
        throw new ConvexError({ message: "Profile record not found.", code: "NOT_FOUND" });
      }
      await ctx.db.patch(args.entryId, {
        section: args.section,
        title: args.title,
        data: args.data,
        ...(args.fileId ? { fileId: args.fileId } : {}),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("staffProfileEntries", {
        profileId: profile._id,
        section: args.section,
        title: args.title,
        data: args.data,
        ...(args.fileId ? { fileId: args.fileId } : {}),
        createdAt: now,
        updatedAt: now,
      });
    }

    await logAction(ctx, {
      action: args.entryId ? "UPDATE_MY_STAFF_PROFILE_RECORD" : "CREATE_MY_STAFF_PROFILE_RECORD",
      resource: "staffProfileEntries",
      details: `${args.section} profile record ${args.entryId ? "updated" : "created"}`,
    });
  },
});

export const deleteMyProfileEntry = auditedMutation({
  args: { entryId: v.id("staffProfileEntries") },
  handler: async (ctx, args) => {
    const profile = await getOwnProfile(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.profileId !== profile._id) {
      throw new ConvexError({ message: "Profile record not found.", code: "NOT_FOUND" });
    }
    if (entry.fileId) await ctx.storage.delete(entry.fileId);
    await ctx.db.delete(args.entryId);
    await logAction(ctx, {
      action: "DELETE_MY_STAFF_PROFILE_RECORD",
      resource: "staffProfileEntries",
      details: `Deleted ${entry.section} profile record`,
    });
  },
});
