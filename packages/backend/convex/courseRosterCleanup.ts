import { components, internal } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.js";
import { internalAction, internalMutation, internalQuery, type ActionCtx } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

const GIVEN_NAMES = ["Ajak", "Nyamal", "Adut", "Amina", "Grace", "Mary", "Atim", "Esther", "Rebecca", "Sarah", "Naomi", "Joan", "Mercy", "Daniel", "Peter", "James", "Emmanuel", "Joseph", "Samuel", "Michael"];
const FAMILY_NAMES = ["Lado", "Kiden", "Wani", "Jada", "Deng", "Bol", "Chol", "Kuol", "Malual", "Akol", "Arop", "Mabior", "Nyok", "Lual", "Malek", "Taban", "Lasu", "Khamis", "Ajang", "Akech"];
const PAGE_SIZE = 50;

type PlaceholderStudentPage = {
  page: Doc<"students">[];
  isDone: boolean;
  continueCursor: string;
  placeholders: Doc<"students">[];
};

export const placeholderStudentPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("students").paginate(args.paginationOpts);
    return {
      ...page,
      placeholders: page.page.filter(student => student.firstName?.startsWith("Demo ") && student.surname === "Agriculture Student"),
    };
  },
});

export const applyStudentNameCleanup = internalMutation({
  args: { students: v.array(v.object({ id: v.id("students"), firstName: v.string(), surname: v.string() })) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const student of args.students) {
      await ctx.db.patch(student.id, { firstName: student.firstName, surname: student.surname, updatedAt: now });
    }
    const departments = await ctx.db.query("departments").collect();
    for (const department of departments) {
      if (department.name.startsWith("Demo Department of ")) {
        await ctx.db.patch(department._id, { name: department.name.replace("Demo Department of ", "Department of "), updatedAt: now });
      }
    }
    return args.students.length;
  },
});

export const cleanPlaceholderNames = internalAction({
  args: {},
  handler: async ctx => {
    let cursor: string | null = null;
    let isDone = false;
    let cleaned = 0;

    while (!isDone) {
      const page: PlaceholderStudentPage = await ctx.runQuery(internal.courseRosterCleanup.placeholderStudentPage, {
        paginationOpts: { numItems: PAGE_SIZE, cursor },
      });
      const updates = page.placeholders.map(student => ({ id: student._id, ...realisticName(student.registrationNumber) }));
      if (updates.length) {
        await ctx.runMutation(internal.courseRosterCleanup.applyStudentNameCleanup, { students: updates });
        for (const student of page.placeholders) await updateAuthName(ctx, student);
        cleaned += updates.length;
      }
      isDone = page.isDone;
      cursor = page.continueCursor;
    }
    await ctx.runMutation(internal.courseRosterCleanup.applyStudentNameCleanup, { students: [] });
    return cleaned;
  },
});

async function updateAuthName(ctx: ActionCtx, student: Doc<"students">) {
  const name = realisticName(student.registrationNumber);
  const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: student.userId, operator: "eq" }],
  });
  if (!user?._id) return;
  await ctx.runMutation(components.betterAuth.adapter.updateOne, { input: {
    model: "user",
    where: [{ field: "_id", value: user._id, operator: "eq" }],
    update: { name: `${name.firstName} ${name.surname}` },
  } });
}

function realisticName(registrationNumber: string) {
  const seed = hash(registrationNumber);
  return {
    firstName: GIVEN_NAMES[seed % GIVEN_NAMES.length]!,
    surname: FAMILY_NAMES[Math.floor(seed / GIVEN_NAMES.length) % FAMILY_NAMES.length]!,
  };
}

function hash(value: string) {
  let result = 0;
  for (const character of value) result = (result * 31 + character.charCodeAt(0)) >>> 0;
  return result;
}
