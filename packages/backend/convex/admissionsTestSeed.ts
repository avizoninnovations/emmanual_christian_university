import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api.js";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server.js";
import { createAuth } from "./betterAuth/auth.js";
import { admissionsTestApplicants } from "./lib/admissionsTestFixtures.js";

const accountEmail = "admissions.officer@example.test";
const accountName = "Daniel Wani";
const staffId = "ECU-TEST-ADM-001";

type SeedCounts = {
  applicantRecordsCreated: number;
  applicantRecordsAlreadyPresent: number;
  staffProfileCreated: boolean;
};

export const seedAdmissionsTestData = internalAction({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);
    const existing = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: accountEmail, operator: "eq" }],
    });

    let userId = existing?._id;
    let initialPassword: string | null = null;
    if (!userId) {
      initialPassword = createInitialPassword();
      const createUser = (
        auth.api as unknown as {
          createUser: (input: {
            body: {
              email: string;
              password: string;
              name: string;
              role: "user";
              data: { emailVerified: boolean };
            };
          }) => Promise<{ user?: { id?: string } }>;
        }
      ).createUser;
      const created = await createUser({
        body: {
          email: accountEmail,
          password: initialPassword,
          name: accountName,
          role: "user",
          data: { emailVerified: true },
        },
      });
      userId = created.user?.id;
    }
    if (!userId)
      throw new ConvexError(
        "The Admissions Officer test account could not be created.",
      );

    const applicantLogins: Array<{ email: string; password: string | null }> = [];
    for (const applicant of admissionsTestApplicants) {
      const existingApplicantUser = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        { model: "user", where: [{ field: "email", value: applicant.email, operator: "eq" }] },
      );
      if (existingApplicantUser?._id) {
        applicantLogins.push({ email: applicant.email, password: null });
        continue;
      }
      const password = TEST_ACCOUNT_PASSWORD;
      const createUser = (auth.api as unknown as {
        createUser: (input: {
          body: { email: string; password: string; name: string; role: "user"; data: { emailVerified: boolean } };
        }) => Promise<{ user?: { id?: string } }>;
      }).createUser;
      const createdApplicant = await createUser({
        body: {
          email: applicant.email,
          password,
          name: [applicant.firstName, "otherName" in applicant ? applicant.otherName : undefined, applicant.surname].filter(Boolean).join(" "),
          role: "user",
          data: { emailVerified: true },
        },
      });
      if (!createdApplicant.user?.id)
        throw new ConvexError(`The applicant account for ${applicant.email} could not be created.`);
      applicantLogins.push({ email: applicant.email, password });
    }

    const counts: SeedCounts = await ctx.runMutation(
      internal.admissionsTestSeed.insertAdmissionsFixtures,
      { staffUserId: userId },
    );
    return {
      ...counts,
      staffAccount: {
        email: accountEmail,
        name: accountName,
        staffId,
        initialPassword,
      },
      applicantLogins,
      note: initialPassword
        ? "Save the initial password now; it is only returned during account creation."
        : "This account already existed, so its existing password was left unchanged.",
    };
  },
});

export const insertAdmissionsFixtures = internalMutation({
  args: { staffUserId: v.string() },
  handler: async (ctx, args): Promise<SeedCounts> => {
    const [
      programs,
      activePeriods,
      upcomingPeriods,
      staffProfile,
      staffIdRecord,
      role,
    ] = await Promise.all([
      ctx.db
        .query("programs")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .take(100),
      ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .take(20),
      ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "upcoming"))
        .take(20),
      ctx.db
        .query("staffProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.staffUserId))
        .unique(),
      ctx.db
        .query("staffProfiles")
        .withIndex("by_staffId", (q) => q.eq("staffId", staffId))
        .unique(),
      ctx.db
        .query("systemRoles")
        .withIndex("by_code", (q) => q.eq("code", "admissions_officer"))
        .unique(),
    ]);

    const period = activePeriods.find((row) => row.term === 2 && row.year === 2026)
      ?? activePeriods[0]
      ?? upcomingPeriods[0];
    if (programs.length === 0 || !period)
      throw new ConvexError(
        "Create an active program and an active or upcoming Academic Period before seeding admissions records.",
      );

    const now = Date.now();
    if (!role) {
      await ctx.db.insert("systemRoles", {
        name: "Admissions Officer",
        code: "admissions_officer",
        description: "Manages applicant review and semester enrollment.",
        tier: 4,
        category: "academic",
        isProtected: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (staffIdRecord && staffIdRecord.userId !== args.staffUserId)
      throw new ConvexError(
        "The Admissions Officer test staff number is already assigned.",
      );

    const desiredRoles = ["admissions_officer", "staff"];
    const staffProfileCreated = !staffProfile;
    if (staffProfile) {
      await ctx.db.patch(staffProfile._id, {
        roles: [...new Set([...staffProfile.roles, ...desiredRoles])],
        title: "Admissions Officer",
        status: "active",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("staffProfiles", {
        userId: args.staffUserId,
        staffId,
        roles: desiredRoles,
        title: "Admissions Officer",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    let applicantRecordsCreated = 0;
    let applicantRecordsAlreadyPresent = 0;
    for (const [index, fixture] of admissionsTestApplicants.entries()) {
      const existing = await ctx.db
        .query("applicants")
        .withIndex("by_email", (q) => q.eq("email", fixture.email))
        .first();
      if (existing) {
        applicantRecordsAlreadyPresent++;
        continue;
      }

      const times = fixtureTimes(now, index, fixture.stage);
      const status =
        fixture.stage === "new"
          ? "new"
          : fixture.stage === "reviewing"
            ? "reviewing"
            : fixture.stage === "rejected"
              ? "rejected"
              : "accepted";
      const applicationNumber = `ECU/ADM/${period.year}/${period.term}/T${String(index + 1).padStart(3, "0")}`;
      const program = programs[index % programs.length]!;
      const applicantId = await ctx.db.insert("applicants", {
        firstName: fixture.firstName,
        surname: fixture.surname,
        otherName: "otherName" in fixture ? fixture.otherName : undefined,
        gender: index % 2 === 0 ? "female" : "male",
        dateOfBirth: `200${index + 1}-0${(index % 8) + 1}-15`,
        nationality: "South Sudanese",
        address: ["Yei", "Juba"][index % 2],
        emergencyContact: {
          name: "Family contact",
          relationship: "Parent",
          phone: `+211 920 100 ${String(index + 1).padStart(3, "0")}`,
        },
        yearOfEntry: period.year,
        programType: "Day",
        name: [
          fixture.firstName,
          "otherName" in fixture ? fixture.otherName : undefined,
          fixture.surname,
        ]
          .filter(Boolean)
          .join(" "),
        email: fixture.email,
        phone: fixture.phone,
        programId: program._id,
        admissionType: "National",
        status,
        term: period.term,
        year: period.year,
        applicationDate: times.appliedAt,
        applicationNumber,
        decisionNote:
          fixture.stage === "rejected"
            ? "Required entry documents were incomplete at the review deadline."
            : undefined,
        offerIssuedAt: times.offerIssuedAt,
        offerAcceptedAt: times.offerAcceptedAt,
        reportedAt: times.reportedAt,
        createdAt: times.appliedAt,
        updatedAt: now,
      });

      await insertApplicantEvents(ctx, {
        applicantId,
        staffUserId: args.staffUserId,
        applicationNumber,
        stage: fixture.stage,
        times,
        name: [fixture.firstName, fixture.surname].join(" "),
      });
      applicantRecordsCreated++;
    }

    return {
      applicantRecordsCreated,
      applicantRecordsAlreadyPresent,
      staffProfileCreated,
    };
  },
});

const TEST_ACCOUNT_PASSWORD = "UniSystem2026!";

function createInitialPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Ecu!${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function fixtureTimes(now: number, index: number, stage: string) {
  const day = 24 * 60 * 60 * 1000;
  const appliedAt = now - (18 - index) * day;
  const hasOffer = ["offer_issued", "offer_accepted", "reported"].includes(
    stage,
  );
  const hasAcceptance = ["offer_accepted", "reported"].includes(stage);
  return {
    appliedAt,
    reviewedAt: ["new"].includes(stage) ? undefined : appliedAt + day,
    acceptedAt: [
      "accepted",
      "offer_issued",
      "offer_accepted",
      "reported",
    ].includes(stage)
      ? appliedAt + 2 * day
      : undefined,
    offerIssuedAt: hasOffer ? appliedAt + 3 * day : undefined,
    offerAcceptedAt: hasAcceptance ? appliedAt + 4 * day : undefined,
    reportedAt: stage === "reported" ? appliedAt + 5 * day : undefined,
  };
}

async function insertApplicantEvents(
  ctx: MutationCtx,
  args: {
    applicantId: import("./_generated/dataModel.js").Id<"applicants">;
    staffUserId: string;
    applicationNumber: string;
    stage: string;
    times: ReturnType<typeof fixtureTimes>;
    name: string;
  },
) {
  const record = async (event: {
    action:
      | "application_created"
      | "status_changed"
      | "offer_issued"
      | "offer_accepted"
      | "reported";
    at: number;
    fromStatus?: string;
    toStatus?: string;
    note?: string;
  }) => {
    await ctx.db.insert("applicantEvents", {
      applicantId: args.applicantId,
      actorUserId: args.staffUserId,
      action: event.action,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      occurredAt: event.at,
      createdAt: event.at,
      updatedAt: event.at,
    });
  };
  await record({
    action: "application_created",
    at: args.times.appliedAt,
    toStatus: "new",
  });
  if (args.times.reviewedAt)
    await record({
      action: "status_changed",
      at: args.times.reviewedAt,
      fromStatus: "new",
      toStatus: "reviewing",
    });
  if (args.times.acceptedAt)
    await record({
      action: "status_changed",
      at: args.times.acceptedAt,
      fromStatus: "reviewing",
      toStatus: "accepted",
    });
  if (args.stage === "rejected")
    await record({
      action: "status_changed",
      at: args.times.reviewedAt ?? args.times.appliedAt,
      fromStatus: "reviewing",
      toStatus: "rejected",
      note: "Required entry documents were incomplete at the review deadline.",
    });
  if (args.times.offerIssuedAt)
    await record({
      action: "offer_issued",
      at: args.times.offerIssuedAt,
      note: `Offer letter issued to ${args.name}.`,
    });
  if (args.times.offerAcceptedAt)
    await record({ action: "offer_accepted", at: args.times.offerAcceptedAt });
  if (args.times.reportedAt)
    await record({ action: "reported", at: args.times.reportedAt });
}
