import { internal } from "./_generated/api.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import { internalAction, internalMutation, internalQuery } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

const GIVEN_NAMES = [
  "Ajak", "Nyamal", "Adut", "Amina", "Grace", "Mary", "Atim", "Esther", "Rebecca", "Sarah",
  "Naomi", "Joan", "Mercy", "Daniel", "Peter", "James", "Emmanuel", "Joseph", "Samuel", "Michael",
  "David", "Isaac", "Moses", "Deng", "Bol", "Malith", "Chol", "Kuol", "Abuk", "Lual",
  "Mabior", "Kiden", "Nyandeng", "Atem", "Manyang", "Nyal", "Garang", "Poni", "Lillian", "Lydia",
  "Andrew", "Wani", "Ladu", "Yei", "Aluel", "Achol", "Ruth", "Petero", "Akec", "Martha",
];

const FAMILY_NAMES = [
  "Lado", "Kiden", "Wani", "Jada", "Deng", "Bol", "Chol", "Kuol", "Malual", "Akol",
  "Arop", "Mabior", "Nyok", "Lual", "Malek", "Taban", "Lasu", "Khamis", "Ajang", "Akech",
  "Anei", "Bior", "Alier", "Amum", "Gai", "Kur", "Lokiri", "Pitia", "Lemi", "Awan",
  "Okello", "Ocen", "Ayaa", "Apio", "Otim", "Mugisha", "Nabirye", "Namakula", "Okot", "Auma",
  "Makuac", "Thon", "Atem", "Abur", "Nyariw", "Mading", "Duku", "Loro", "Musa", "Kiden",
];

const TARGET_MINIMUM = 20;
const TARGET_RANGE = 11;
const ROSTER_CANDIDATE_LIMIT = 60;
const COURSE_BATCH_SIZE = 5;

type CoursePage = {
  page: Doc<"courses">[];
  isDone: boolean;
  continueCursor: string;
  period: Doc<"academicPeriods">;
};
type BatchResult = { courses: number; studentsAdded: number; registrationsAdded: number; aboveRange: number; underfilled: number };
type SeedSummary = BatchResult & { periodName: string; existingNamesCleaned: number };

export const activeCoursePage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args): Promise<CoursePage> => {
    const period = await ctx.db.query("academicPeriods").withIndex("by_status", q => q.eq("status", "active")).unique();
    if (!period) throw new ConvexError("Set one active academic period before seeding course rosters.");

    const page = await ctx.db.query("courses")
      .withIndex("by_status", q => q.eq("status", "active"))
      .paginate(args.paginationOpts);
    return { ...page, period };
  },
});

export const seedAllActiveCourseRosters = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedSummary> => {
    const cleaned: number = await ctx.runAction(internal.courseRosterCleanup.cleanPlaceholderNames, {});
    let cursor: string | null = null;
    let isDone = false;
    const summary = { periodName: "", courses: 0, studentsAdded: 0, registrationsAdded: 0, aboveRange: 0, underfilled: 0, existingNamesCleaned: cleaned };

    while (!isDone) {
      const page: CoursePage = await ctx.runQuery(internal.courseRosterSeed.activeCoursePage, {
        paginationOpts: { numItems: 50, cursor },
      });
      summary.periodName = `${page.period.name} ${page.period.year}`;

      for (let offset = 0; offset < page.page.length; offset += COURSE_BATCH_SIZE) {
        const courseIds = page.page.slice(offset, offset + COURSE_BATCH_SIZE).map(course => course._id);
        const batch: BatchResult = await ctx.runMutation(internal.courseRosterSeed.seedRosterBatch, {
          courseIds,
          periodId: page.period._id,
        });
        summary.courses += batch.courses;
        summary.studentsAdded += batch.studentsAdded;
        summary.registrationsAdded += batch.registrationsAdded;
        summary.aboveRange += batch.aboveRange;
        summary.underfilled += batch.underfilled;
      }

      isDone = page.isDone;
      cursor = page.continueCursor;
    }

    return summary;
  },
});

export const seedRosterBatch = internalMutation({
  args: { courseIds: v.array(v.id("courses")), periodId: v.id("academicPeriods") },
  handler: async (ctx, args): Promise<BatchResult> => {
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new ConvexError("The active academic period no longer exists.");

    const loadedCourses = await Promise.all(args.courseIds.map(courseId => ctx.db.get(courseId)));
    const courses = loadedCourses.filter((course): course is Doc<"courses"> => course?.status === "active");
    const programIds = [...new Set(courses.map(course => course.programId))];
    const cohortMap = new Map(courses.map(course => [cohortKey(course.programId, course.yearOfStudy), {
      programId: course.programId,
      yearOfStudy: course.yearOfStudy,
    }]));
    const cohortKeys = [...cohortMap.keys()];
    const candidates = [...cohortMap.values()].flatMap(({ programId, yearOfStudy }) =>
      Array.from({ length: ROSTER_CANDIDATE_LIMIT }, (_, index) => rosterUserId(programId, yearOfStudy, index + 1)));
    const [programs, registrationsByCourse, existingCandidates] = await Promise.all([
      Promise.all(programIds.map(programId => ctx.db.get(programId))),
      Promise.all(courses.map(course => ctx.db.query("studentCourseRegistrations")
        .withIndex("by_course_period", q => q.eq("courseId", course._id).eq("periodId", args.periodId))
        .take(500))),
      Promise.all(candidates.map(userId => ctx.db.query("students").withIndex("by_userId", q => q.eq("userId", userId)).unique())),
    ]);

    const programById = new Map(programIds.map((id, index) => [id, programs[index]]));
    const rosterByCohort = new Map<string, Map<string, Doc<"students">>>();
    for (const key of cohortKeys) rosterByCohort.set(key, new Map());
    for (const student of existingCandidates) {
      if (student) rosterByCohort.get(cohortKeyFromUserId(student.userId))?.set(student.userId, student);
    }

    const now = Date.now();
    let studentsAdded = 0;
    let registrationsAdded = 0;
    let aboveRange = 0;
    let underfilled = 0;

    for (const [courseIndex, course] of courses.entries()) {
      const program = programById.get(course.programId);
      if (!program) continue;

      const registrations = registrationsByCourse[courseIndex];
      const activeStudents = registrations.filter(row => row.status === "registered" || row.status === "completed");
      const target = TARGET_MINIMUM + (stableHash(course.code) % TARGET_RANGE);
      const cohort = cohortKey(program._id, course.yearOfStudy);
      const roster = rosterByCohort.get(cohort)!;
      const registrationByStudent = new Map(registrations.map(row => [row.studentId, row]));
      let finalCount = activeStudents.length;

      if (finalCount < target) {
        for (let index = 1; index <= ROSTER_CANDIDATE_LIMIT && finalCount < target; index++) {
          const userId = rosterUserId(program._id, course.yearOfStudy, index);
          let student = roster.get(userId);
          if (student && student.status !== "active") continue;
          if (student && registrationByStudent.has(student._id)) continue;

          if (!student) {
            const profile = makeStudentProfile({
              userId,
              programId: program._id,
              programCode: program.code,
              periodId: period._id,
              yearOfStudy: course.yearOfStudy,
              term: period.term,
              periodYear: period.year,
              index,
              createdAt: now,
            });
            const studentId = await ctx.db.insert("students", profile);
            student = { ...profile, _id: studentId, _creationTime: now };
            roster.set(userId, student);
            studentsAdded++;
          }

          await ctx.db.insert("studentCourseRegistrations", {
            studentId: student._id,
            courseId: course._id,
            periodId: period._id,
            status: "registered",
            registrationKind: "regular",
            createdAt: now,
            updatedAt: now,
          });
          finalCount++;
          registrationsAdded++;
        }
      }

      if (finalCount > 30) aboveRange++;
      if (finalCount < TARGET_MINIMUM) underfilled++;
    }

    return { courses: courses.length, studentsAdded, registrationsAdded, aboveRange, underfilled };
  },
});

function rosterPrefix(programId: Id<"programs">) {
  return `course-roster:${programId}:`;
}

function cohortKey(programId: Id<"programs">, yearOfStudy: number) {
  return `${programId}:${yearOfStudy}`;
}

function cohortKeyFromUserId(userId: string) {
  return userId.split(":").slice(1, 3).join(":");
}

function rosterUserId(programId: Id<"programs">, yearOfStudy: number, index: number) {
  return `${rosterPrefix(programId)}${yearOfStudy}:${index}`;
}

function makeStudentProfile(args: {
  userId: string;
  programId: Id<"programs">;
  programCode: string;
  periodId: Id<"academicPeriods">;
  yearOfStudy: number;
  term: number;
  periodYear: number;
  index: number;
  createdAt: number;
}) {
  const nameSeed = stableHash(`${args.programCode}:${args.yearOfStudy}`);
  const firstName = GIVEN_NAMES[(args.index - 1 + nameSeed) % GIVEN_NAMES.length]!;
  const surname = FAMILY_NAMES[(args.index - 1 + Math.floor(nameSeed / 7)) % FAMILY_NAMES.length]!;
  const sequence = String(args.yearOfStudy * 1000 + args.index).padStart(4, "0");

  return {
    userId: args.userId,
    firstName,
    surname,
    gender: args.index % 2 === 0 ? "female" as const : "male" as const,
    nationality: "South Sudanese",
    yearOfEntry: args.periodYear - args.yearOfStudy + 1,
    programType: "Day" as const,
    registrationNumber: `S${String(args.periodYear).slice(-2)}/ECU/${args.programCode.replace(/^DEMO-/i, "")}/${sequence}`,
    programId: args.programId,
    yearOfStudy: args.yearOfStudy,
    currentPeriodId: args.periodId,
    term: args.term,
    year: args.periodYear,
    status: "active" as const,
    financeStatus: "cleared" as const,
    createdAt: args.createdAt,
    updatedAt: args.createdAt,
  };
}

function stableHash(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}
