import { internal } from "./_generated/api.js";
import { internalAction } from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api.js";
import { createAuth } from "./betterAuth/auth.js";
import fixture from "./seed-data/ecu-demo-seed.json";
import { buildShowcaseStudent, SHOWCASE_COHORT_SIZE, type ShowcaseStudent } from "./lib/showcaseRoster.js";
import { chunks, type SeedContext } from "./showcaseSeedMutations.js";

const TEST_PASSWORD = "UniSystem2026!";

type AcademicSeedResult = {
  inserted: number;
  workflowRecords: number;
  agricultureMarks: number;
  payrollStatements: number;
  students: number;
  staff: number;
  courseUnits: number;
  authAccounts: number;
};
type AdmissionsSeedResult = {
  applicantRecordsCreated: number;
  applicantRecordsAlreadyPresent: number;
  staffProfileCreated: boolean;
  staffAccount: { email: string; name: string; staffId: string; initialPassword: string | null };
  applicantLogins: Array<{ email: string; password: string | null }>;
  note: string;
};


/** One command seeds the linked academic and admissions walkthrough. */
export const seedShowcaseData = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    academic: AcademicSeedResult;
    admissions: AdmissionsSeedResult;
    generatedStudents: number;
    semesterRegistrations: number;
    courseRegistrations: number;
    assessments: number;
    allocations: number;
    timetables: number;
    examTimetables: number;
    cohortSizePerProgram: number;
    showcaseCohortStudents: number;
    studentTestAccounts: Array<{ programCode: string; email: string; password: string | null }>;
    studentTestPassword: string;
    note: string;
  }> => {
    const academic: AcademicSeedResult = await ctx.runAction(internal.demoSeed.seedDemoData, {});
    await ctx.runMutation(internal.showcaseSeedMutations.normalizePeriods, {});
    const admissions: AdmissionsSeedResult = await ctx.runAction(internal.admissionsTestSeed.seedAdmissionsTestData, {});
    const initial: SeedContext = await ctx.runQuery(internal.showcaseSeedMutations.seedContext, {});
    const currentPeriod = initial.periods.find((period) => period.term === 2 && period.year === 2026);
    if (!currentPeriod) throw new ConvexError("The 2026 Semester 2 showcase period is missing.");

    const auth = createAuth(ctx);
    const createUser = (auth.api as unknown as {
      createUser: (input: { body: { email: string; password: string; name: string; role: "user"; data: { emailVerified: boolean } } }) => Promise<{ user?: { id?: string } }>;
    }).createUser;
    const knownLoginPrograms = new Set(fixture.studentAccounts.map((student) => student.programCode));
    const nextAccessNumber = 1001;
    let generatedCount = 0;
    let accessSerial = nextAccessNumber;
    const supplemental: ShowcaseStudent[] = [];

    let programIndex = 0;
    for (const sourceFaculty of fixture.faculties) {
      for (const sourceProgram of sourceFaculty.programs) {
        const program = initial.programs.find((row) => row.code === sourceProgram.code);
        if (!program) continue;
        const existing = initial.students.filter((student) => student.programId === program._id);
        const existingNumbers = new Set(initial.students.map((student) => student.registrationNumber));
        const code = sourceProgram.code.replace(/^DEMO-/, "").slice(0, 12);
        for (let index = existing.length; index < SHOWCASE_COHORT_SIZE; index++) {
          let serial = index + 1;
          let registrationNumber = `S26/ECU/${code}/${String(serial).padStart(3, "0")}`;
          while (existingNumbers.has(registrationNumber)) {
            serial++;
            registrationNumber = `S26/ECU/${code}/${String(serial).padStart(3, "0")}`;
          }
          existingNumbers.add(registrationNumber);
          const accessNumber = `ECU${String(accessSerial++).padStart(4, "0")}`;
          const nameIndex = index % SHOWCASE_COHORT_SIZE;
          const hasLogin = !knownLoginPrograms.has(sourceProgram.code) && index === existing.length;
          let userId = `showcase:${registrationNumber}`;
          let loginEmail: string | undefined;
          if (hasLogin) {
            loginEmail = `student.${code.toLowerCase()}.${String(serial).padStart(3, "0")}@students.example.test`;
          }
          const student = buildShowcaseStudent({
            programId: program._id, programIndex, studentIndex: nameIndex,
            registrationNumber, accessNumber, currentPeriodId: currentPeriod._id,
            userId, loginEmail,
          });
          if (hasLogin && loginEmail) {
            const name = [student.firstName, student.otherName, student.surname].filter(Boolean).join(" ");
            const existingUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
              model: "user", where: [{ field: "email", value: loginEmail, operator: "eq" }],
            });
            if (existingUser?._id) userId = existingUser._id;
            else {
              const created = await createUser({ body: { email: loginEmail, password: TEST_PASSWORD, name, role: "user", data: { emailVerified: true } } });
              if (!created.user?.id) throw new ConvexError(`Could not create the student test account for ${sourceProgram.name}.`);
              userId = created.user.id;
            }
            student.userId = userId;
            knownLoginPrograms.add(sourceProgram.code);
          }
          supplemental.push(student);
          generatedCount++;
        }
        programIndex++;
      }
    }

    for (const batch of chunks(supplemental, 50)) {
      await ctx.runMutation(internal.showcaseSeedMutations.insertStudents, { students: batch });
    }

    const state: SeedContext = await ctx.runQuery(internal.showcaseSeedMutations.seedContext, {});
    const activePeriod = state.periods.find((period) => period.term === 2 && period.year === 2026);
    const pastPeriod = state.periods.find((period) => period.term === 1 && period.year === 2026);
    const upcomingPeriod = state.periods.find((period) => period.term === 1 && period.year === 2027);
    if (!activePeriod || !pastPeriod || !upcomingPeriod) throw new ConvexError("Create the current, past, and upcoming academic periods before seeding showcase records.");

    const hod = state.staff.find((profile) => profile.roles.includes("hod"));
    if (!hod) throw new ConvexError("An HOD account is required for the academic showcase.");
    await ctx.runMutation(internal.showcaseSeedMutations.assignHodForUnassignedDepartments, { hodUserId: hod.userId });

    let semesterRegistrations = 0;
    const studentsByProgram = new Map(state.programs.map((program) => [program._id, state.students.filter((student) => student.programId === program._id)]));
    const showcaseRoster = [...studentsByProgram.values()].flatMap((students) => students.slice(0, SHOWCASE_COHORT_SIZE));
    const studentTestAccounts: Array<{ programCode: string; email: string; password: string | null }> = [];
    for (const program of state.programs) {
      const roster = studentsByProgram.get(program._id)?.slice(0, SHOWCASE_COHORT_SIZE) ?? [];
      const student = roster.find((row) => row.loginEmail) ?? roster.find((row) => row.userId.startsWith("showcase:")) ?? roster[0];
      if (!student) continue;
      if (student.loginEmail) {
        const hasKnownPassword = fixture.studentAccounts.some((account) => account.email === student.loginEmail)
          || student.loginEmail.endsWith("@students.example.test");
        studentTestAccounts.push({ programCode: program.code, email: student.loginEmail, password: hasKnownPassword ? TEST_PASSWORD : null });
        continue;
      }
      if (!student.userId.startsWith("showcase:") && student.userId.length === 32) {
        let existingEmail: string | undefined;
        try {
          const authUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
            model: "user", where: [{ field: "_id", value: student.userId, operator: "eq" }],
          });
          existingEmail = authUser?.email;
        } catch {
          existingEmail = undefined;
        }
        if (existingEmail) {
          studentTestAccounts.push({ programCode: program.code, email: existingEmail, password: null });
        }
        continue;
      }
      if (!student.userId.startsWith("showcase:")) continue;
      const code = program.code.replace(/^DEMO-/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const accountKey = (student.accessNumber ?? student.registrationNumber).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const email = `student.${code}.${accountKey}@students.example.test`;
      const existingUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user", where: [{ field: "email", value: email, operator: "eq" }],
      });
      let userId = existingUser?._id;
      if (!userId) {
        const name = [student.firstName, student.otherName, student.surname].filter(Boolean).join(" ");
        const created = await createUser({ body: { email, password: TEST_PASSWORD, name, role: "user", data: { emailVerified: true } } });
        userId = created.user?.id;
      }
      if (!userId) throw new ConvexError(`Could not create a student test login for ${program.name}.`);
      await ctx.runMutation(internal.showcaseSeedMutations.assignStudentTestLogin, {
        studentId: student._id, previousUserId: student.userId, userId, email,
      });
      studentTestAccounts.push({ programCode: program.code, email, password: TEST_PASSWORD });
    }
    for (const period of [pastPeriod, activePeriod]) {
      const rows = showcaseRoster.map((student) => ({ studentId: student._id, yearOfStudy: student.yearOfStudy, periodId: period._id, semester: period.term }));
      for (const batch of chunks(rows, 75)) {
        semesterRegistrations += await ctx.runMutation(internal.showcaseSeedMutations.ensureSemesterRegistrations, { rows: batch });
      }
    }

    let courseRegistrations = 0;
    let assessments = 0;
    let allocations = 0;
    let timetables = 0;
    let examTimetables = 0;
    const lecturerScheduleCounts = new Map<string, number>();
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
    const classSlots = [
      ["08:00", "10:00"], ["10:30", "12:30"], ["13:00", "15:00"], ["15:30", "17:30"],
    ] as const;
    const orderedCourses = [...state.courses].sort((a, b) => a.code.localeCompare(b.code));
    for (const [courseIndex, course] of orderedCourses.entries()) {
      const period: Doc<"academicPeriods"> = course.semester === 1 ? pastPeriod : activePeriod;
      const future = course.semester === 1 ? upcomingPeriod : null;
      const department = state.departments.find((row) => row._id === course.departmentId);
      const lecturer = state.staff.find((profile) => profile.departmentId === course.departmentId && profile.roles.some((role) => ["lecturer", "senior_lecturer"].includes(role)));
      if (!department || !lecturer) continue;
      const hodId = department.hodId ?? hod.userId;
      const roster = (studentsByProgram.get(course.programId) ?? []).slice(0, SHOWCASE_COHORT_SIZE);
      const result: { registrations: number; assessments: number; allocations: number } = await ctx.runMutation(internal.showcaseClassSeed.seedCourseClass, {
        courseId: course._id, departmentId: course.departmentId, lecturerId: lecturer.userId,
        hodId, periodId: period._id, wrongPeriodId: period === pastPeriod ? activePeriod._id : pastPeriod._id,
        periodStatus: period.status, courseIndex,
        students: roster.map((student, studentIndex) => ({ studentId: student._id, yearOfStudy: student.yearOfStudy, studentIndex })),
      });
      courseRegistrations += result.registrations;
      assessments += result.assessments;
      allocations += result.allocations;
      if (future) {
        allocations += await ctx.runMutation(internal.showcaseSeedMutations.ensureCourseAllocation, {
          courseId: course._id, departmentId: course.departmentId, periodId: future._id,
          lecturerId: lecturer.userId, hodId,
        });
      }
      if (period === activePeriod) {
        const lecturerSlot = lecturerScheduleCounts.get(lecturer.userId) ?? 0;
        lecturerScheduleCounts.set(lecturer.userId, lecturerSlot + 1);
        const [startTime, endTime] = classSlots[lecturerSlot % classSlots.length]!;
        const examDate = new Date(Date.UTC(2026, 11, 1 + (courseIndex % 10))).toISOString().slice(0, 10);
        const examSlot = Math.floor(courseIndex / 10) % 3;
        const examTimes = [["09:00", "11:00"], ["12:00", "14:00"], ["15:00", "17:00"]] as const;
        const [examStartTime, examEndTime] = examTimes[examSlot]!;
        const schedule = await ctx.runMutation(internal.showcaseClassSeed.seedCourseSchedule, {
          courseId: course._id, periodId: activePeriod._id, lecturerId: lecturer.userId,
          dayOfWeek: weekdays[Math.floor(lecturerSlot / classSlots.length) % weekdays.length]!,
          startTime, endTime, room: `${department.code} Room ${(lecturerSlot % 4) + 1}`,
          examDate, examStartTime, examEndTime, examRoom: `Examination Hall ${(courseIndex % 4) + 1}`,
        });
        timetables += schedule.timetable;
        examTimetables += schedule.exam;
      }
    }

    return {
      academic, admissions, generatedStudents: generatedCount, semesterRegistrations,
      courseRegistrations, assessments, allocations, timetables, examTimetables,
      cohortSizePerProgram: SHOWCASE_COHORT_SIZE,
      showcaseCohortStudents: showcaseRoster.length,
      studentTestAccounts,
      studentTestPassword: TEST_PASSWORD,
      note: "Synthetic showcase records are clearly distinguishable from official university records in seed metadata.",
    };
  },
});


