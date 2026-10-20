import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { mutation as auditedMutation } from "./lib/mutations";
import { logAction } from "./audit_logger";
import { assertAuthenticated, assertAdmin } from "./lib/utils";

const sectionValidator = v.union(
  v.literal("contact"),
  v.literal("bankAccount"),
  v.literal("qualification"),
  v.literal("experience"),
  v.literal("employment"),
  v.literal("publication"),
  v.literal("nextOfKin"),
  v.literal("spouse"),
  v.literal("child"),
  v.literal("parent"),
  v.literal("document"),
);

const personalDetailKeys = new Set([
  "titles", "firstName", "surname", "gender", "maritalStatus", "dateOfBirth", "nationalIdNumber", "hobbies", "universityTeam",
  "currentCountry", "nationality", "currentDistrict", "currentCounty", "currentSubCounty", "currentParish", "currentVillage",
  "homeDistrict", "homeSubCounty", "homeVillage", "homeDiocese",
  "bankName", "bankAccountTitle", "bankBranch", "bankAccountNumber", "nssfName", "nssfNumber", "tin",
  "biography", "researchInterests", "profilePublished", "showQualifications", "showExperience", "showPublications",
]);

const entryDataKeys: Record<string, readonly string[]> = {
  contact: ["contactType", "value", "label"],
  bankAccount: ["bank", "accountTitle", "bankBranch", "accountNumber"],
  qualification: ["qualification", "courseOrFieldOfStudy", "institute", "startYear", "endYear", "fileName", "institution", "award", "country"],
  experience: ["position", "employer", "department", "startDate", "endDate", "responsibilities"],
  employment: ["movementType", "position", "unit", "division", "jobType", "startDate", "endDate"],
  publication: ["title", "publicationType", "journalOrPublisher", "year", "link"],
  nextOfKin: ["fullName", "relationship", "phone", "email", "address"],
  spouse: ["fullName", "phone", "email", "occupation", "address"],
  child: ["fullName", "dateOfBirth", "gender"],
  parent: ["fullName", "relationship", "phone", "email", "address"],
  document: ["documentType", "documentName", "notes", "expiryDate", "fileName"],
};

function assertAllowedKeys(data: Record<string, string>, allowedKeys: ReadonlySet<string> | readonly string[], description: string) {
  const allowed = allowedKeys instanceof Set ? allowedKeys : new Set(allowedKeys);
  const unexpected = Object.keys(data).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new ConvexError({ message: `Unsupported ${description} field: ${unexpected.join(", ")}.`, code: "INVALID_PROFILE_FIELD" });
  }
}

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

async function validateProfileUpload(ctx: MutationCtx, fileId: Id<"_storage">, allowedTypes: string[], maxBytes: number) {
  const metadata = await ctx.db.system.get("_storage", fileId);
  if (!metadata) throw new ConvexError({ message: "Uploaded file could not be found.", code: "FILE_NOT_FOUND" });
  if (metadata.size > maxBytes || !allowedTypes.includes(metadata.contentType ?? "")) {
    throw new ConvexError({ message: "This file type or size is not allowed.", code: "INVALID_FILE" });
  }
}

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getOwnProfile(ctx);
    const [photoUrl, signatureUrl] = await Promise.all([
      profile.photoFileId ? ctx.storage.getUrl(profile.photoFileId) : null,
      profile.signatureFileId ? ctx.storage.getUrl(profile.signatureFileId) : null,
    ]);
    return { profile, photoUrl, signatureUrl };
  },
});

export const getMyProfileEntries = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await getOwnProfile(ctx);
    const page = await ctx.db
      .query("staffProfileEntries")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const pageWithUrls = await Promise.all(page.page.map(async (entry) => ({
      ...entry,
      fileUrl: entry.fileId ? await ctx.storage.getUrl(entry.fileId) : null,
    })));
    return { ...page, page: pageWithUrls };
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
    assertAllowedKeys(args.details, personalDetailKeys, "personal profile");
    await ctx.db.patch(profile._id, { personalDetails: args.details, updatedAt: Date.now() });
    await logAction(ctx, {
      action: "UPDATE_MY_STAFF_PROFILE",
      resource: "staffProfiles",
      details: `Updated personal staff profile fields: ${Object.keys(args.details).join(", ")}`,
    });
    return profile._id;
  },
});

export const saveMyProfileImage = auditedMutation({
  args: {
    asset: v.union(v.literal("photo"), v.literal("signature")),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const profile = await getOwnProfile(ctx);
    await validateProfileUpload(ctx, args.fileId, ["image/png", "image/jpeg"], 5 * 1024 * 1024);
    const previousFileId = args.asset === "photo" ? profile.photoFileId : profile.signatureFileId;
    if (previousFileId && previousFileId !== args.fileId) await ctx.storage.delete(previousFileId);
    await ctx.db.patch(profile._id, {
      ...(args.asset === "photo" ? { photoFileId: args.fileId } : { signatureFileId: args.fileId }),
      updatedAt: Date.now(),
    });
    await logAction(ctx, {
      action: "UPDATE_STAFF_PROFILE_ASSET",
      resource: "staffProfiles",
      details: `Updated staff ${args.asset}`,
    });
  },
});

/** Employment appointments are maintained by authorised staff, not self-edited. */
export const updateStaffEmployment = auditedMutation({
  args: {
    profileId: v.id("staffProfiles"),
    positionTitle: v.optional(v.union(v.string(), v.null())),
    departmentId: v.optional(v.union(v.string(), v.null())),
    divisionName: v.optional(v.union(v.string(), v.null())),
    jobType: v.optional(v.union(v.string(), v.null())),
    supervisorProfileId: v.optional(v.union(v.id("staffProfiles"), v.null())),
    employmentStartDate: v.optional(v.union(v.string(), v.null())),
    employmentEndDate: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new ConvexError({ message: "Staff profile not found.", code: "NOT_FOUND" });
    if (args.supervisorProfileId && args.supervisorProfileId === profile._id) {
      throw new ConvexError({ message: "A staff member cannot be their own supervisor.", code: "INVALID_SUPERVISOR" });
    }

    await ctx.db.patch(profile._id, {
      ...(args.positionTitle !== undefined ? { title: args.positionTitle ?? undefined } : {}),
      ...(args.departmentId !== undefined ? { departmentId: args.departmentId ?? undefined } : {}),
      ...(args.divisionName !== undefined ? { divisionName: args.divisionName ?? undefined } : {}),
      ...(args.jobType !== undefined ? { jobType: args.jobType ?? undefined } : {}),
      ...(args.supervisorProfileId !== undefined ? { supervisorProfileId: args.supervisorProfileId ?? undefined } : {}),
      ...(args.employmentStartDate !== undefined ? { employmentStartDate: args.employmentStartDate ?? undefined } : {}),
      ...(args.employmentEndDate !== undefined ? { employmentEndDate: args.employmentEndDate ?? undefined } : {}),
      updatedAt: Date.now(),
    });
    await logAction(ctx, {
      action: "UPDATE_STAFF_EMPLOYMENT",
      resource: "staffProfiles",
      details: `Updated appointment details for staff record ${profile.staffId}`,
    });
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
    assertAllowedKeys(args.data, entryDataKeys[args.section] ?? [], args.section);
    if (args.fileId) {
      if (args.section !== "document" && args.section !== "qualification") throw new ConvexError({ message: "This profile record does not accept attachments.", code: "INVALID_FILE" });
      await validateProfileUpload(ctx, args.fileId, ["application/pdf", "image/png", "image/jpeg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], 10 * 1024 * 1024);
    }
    const now = Date.now();

    if (args.entryId) {
      const existing = await ctx.db.get(args.entryId);
      if (!existing || existing.profileId !== profile._id) {
        throw new ConvexError({ message: "Profile record not found.", code: "NOT_FOUND" });
      }
      if (args.fileId && existing.fileId && args.fileId !== existing.fileId) {
        await ctx.storage.delete(existing.fileId);
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
