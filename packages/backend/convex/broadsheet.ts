import { query } from "./_generated/server.js";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { assertAuthenticated } from "./lib/utils.js";
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

export const getProgramsAndPeriods = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    const programs = await ctx.db.query("programs").collect();
    const periods = await ctx.db.query("academicPeriods").order("desc").collect();
    return { programs, periods };
  },
});

export const getDepartmentBroadsheet = query({
  args: {
    programId: v.id("programs"),
    periodId: v.id("academicPeriods"),
    yearOfStudy: v.number(),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    const program = await ctx.db.get(args.programId);
    const period = await ctx.db.get(args.periodId);
    if (!program || !period) return null;

    const department = program.departmentId
      ? await ctx.db.get(program.departmentId)
      : null;

    // 1. Fetch curriculum courses for this program, yearOfStudy, and semester
    const term = period.term || 1;
    const allCourses = await ctx.db
      .query("courses")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .collect();

    const courses = allCourses.filter(
      (c) => c.yearOfStudy === args.yearOfStudy && c.semester === term && c.status === "active"
    );

    // 2. Fetch students in this program and year of study
    const allStudents = await ctx.db
      .query("students")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .collect();

    const students = allStudents.filter(
      (s) => s.yearOfStudy === args.yearOfStudy && s.status !== "discontinued"
    );

    const usersMap = await getUsersMap(ctx);

    // 3. For each student, get course marks
    let totalGPACombined = 0;
    let candidatesEvaluated = 0;
    let clearPassCount = 0;
    let supplementaryCount = 0;
    let repeatCount = 0;

    const studentRows = await Promise.all(
      students.map(async (st) => {
        const user = st.userId ? usersMap.get(st.userId) : null;

        // Fetch marks for this student across these courses
        let totalAttemptedCU = 0;
        let totalPassedCU = 0;
        let weightedPoints = 0;
        const failedSuppCodes: string[] = [];
        const failedRepeatCodes: string[] = [];

        const courseResults = await Promise.all(
          courses.map(async (c) => {
            const mark = await ctx.db
              .query("studentAssessments")
              .withIndex("by_student_course_period", (q: any) =>
                q.eq("studentId", st._id).eq("courseId", c._id).eq("periodId", args.periodId)
              )
              .first();

            const cw = mark?.courseworkMarks ?? 0;
            const exam = mark?.examMarks ?? 0;
            const total = mark?.finalScore ?? Math.round(cw + exam);
            const grade = mark?.grade ?? (total >= 50 ? "C" : total >= 40 ? "D" : "F");
            const gp = mark?.gradePoints ?? (grade === "A" ? 4.0 : grade === "B+" ? 3.5 : grade === "B" ? 3.0 : grade === "C+" ? 2.5 : grade === "C" ? 2.0 : grade === "D" ? 1.0 : 0.0);

            totalAttemptedCU += c.creditUnits;
            if (grade !== "F") {
              totalPassedCU += c.creditUnits;
            }

            weightedPoints += gp * c.creditUnits;

            if (grade === "D") {
              failedSuppCodes.push(c.code);
            } else if (grade === "F") {
              failedRepeatCodes.push(c.code);
            }

            return {
              courseId: c._id,
              courseCode: c.code,
              creditUnits: c.creditUnits,
              coursework: cw,
              exam,
              finalScore: total,
              grade,
              gradePoints: gp,
              isSupplementary: mark?.isSupplementary ?? false,
              isApproved: mark?.status === "approved",
            };
          })
        );

        const gpa = totalAttemptedCU > 0 ? Number((weightedPoints / totalAttemptedCU).toFixed(2)) : 0.0;

        // South Sudan Higher Education Decision Rules
        let decision: string;
        let decisionType: "proceed" | "supplementary" | "repeat" | "probation";

        if (failedRepeatCodes.length > 0) {
          decision = `REPEAT COURSE (${failedRepeatCodes.join(", ")})`;
          decisionType = "repeat";
          repeatCount++;
        } else if (failedSuppCodes.length > 0) {
          decision = `SUPPLEMENTARY IN ${failedSuppCodes.join(", ")}`;
          decisionType = "supplementary";
          supplementaryCount++;
        } else if (gpa < 2.0 && totalAttemptedCU > 0) {
          decision = "ACADEMIC PROBATION (CGPA < 2.00)";
          decisionType = "probation";
          repeatCount++;
        } else if (totalAttemptedCU > 0) {
          decision = "PROCEED / PROMOTED";
          decisionType = "proceed";
          clearPassCount++;
        } else {
          decision = "NO MARKS RECORDED";
          decisionType = "proceed";
        }

        if (totalAttemptedCU > 0) {
          totalGPACombined += gpa;
          candidatesEvaluated++;
        }

        return {
          studentId: st._id,
          registrationNumber: st.registrationNumber,
          name: user?.name ?? "Student",
          email: user?.email ?? "—",
          courseResults,
          totalAttemptedCU,
          totalPassedCU,
          gpa,
          cgpa: gpa, // In this semester snapshot
          decision,
          decisionType,
        };
      })
    );

    const averageGPA =
      candidatesEvaluated > 0 ? Number((totalGPACombined / candidatesEvaluated).toFixed(2)) : 0.0;
    const passRate =
      candidatesEvaluated > 0 ? Math.round((clearPassCount / candidatesEvaluated) * 100) : 0;

    return {
      program: {
        _id: program._id,
        name: program.name,
        code: program.code,
        departmentName: department?.name ?? "Department of Academics",
      },
      period: {
        _id: period._id,
        name: period.name,
        year: period.year,
        term: period.term || 1,
      },
      yearOfStudy: args.yearOfStudy,
      courses: courses.map((c) => ({
        _id: c._id,
        code: c.code,
        title: c.title,
        creditUnits: c.creditUnits,
      })),
      students: studentRows,
      summary: {
        totalCandidates: students.length,
        candidatesEvaluated,
        clearPassCount,
        supplementaryCount,
        repeatCount,
        averageGPA,
        passRate,
      },
    };
  },
});
