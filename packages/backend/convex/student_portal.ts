import { ConvexError } from "convex/values";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { logAction } from "./audit_logger.js";
import { assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";
import { getStudentProfile } from "./lib/studentProfile.js";
import { getDegreeClassification } from "./lib/academicStanding.js";

// Helper to fetch user map from Better-Auth
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

// Helper to get or create student profile for current authenticated user
async function resolveCurrentStudent(ctx: any, userId: string) {
  let student = await ctx.db
    .query("students")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  if (!student) {
    // If user has no student record, check if there's any student or link to first program
    const program = await ctx.db.query("programs").first();
    const activePeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .first();

    if (program) {
      const regNum = `ECU/${new Date().getFullYear()}/${program.code}/001`;
      const id = await ctx.db.insert("students", {
        userId,
        registrationNumber: regNum,
        programId: program._id,
        yearOfStudy: 1,
        term: 1,
        year: new Date().getFullYear(),
        currentPeriodId: activePeriod?._id,
        status: "active",
        financeStatus: "cleared",
      });
      student = await ctx.db.get(id);
    }
  }

  return student;
}

// ─────────────────────────────────────────────────────────
// 1. STUDENT PROFILE & DASHBOARD OVERVIEW
// ─────────────────────────────────────────────────────────

export const getMyProfile = query({
  args: {},
  handler: getStudentProfile,
});

// ─────────────────────────────────────────────────────────
// 2. COURSE REGISTRATION
// ─────────────────────────────────────────────────────────

export const getAvailableCoursesForRegistration = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) return { courses: [], registeredIds: [], activePeriod: null };

    // Find active period
    const activePeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .first();

    if (!activePeriod) return { courses: [], registeredIds: [], activePeriod: null };

    // Get curriculum courses for student's program, year, and term
    const curriculumCourses = await ctx.db
      .query("courses")
      .withIndex("by_program", (q: any) => q.eq("programId", student.programId))
      .collect();

    // Filter by year of study and semester
    const targetCourses = curriculumCourses.filter(
      (c) =>
        c.status === "active" &&
        c.yearOfStudy === student.yearOfStudy &&
        c.semester === (activePeriod.term || 1)
    );

    // Fetch student's current registrations for this period
    const existingRegistrations = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) =>
        q.eq("studentId", student._id).eq("periodId", activePeriod._id)
      )
      .collect();

    const registeredIds = existingRegistrations.map((r) => r.courseId);

    // Enrich courses
    const enriched = targetCourses.map((c) => ({
      _id: c._id,
      code: c.code,
      title: c.title,
      creditUnits: c.creditUnits,
      yearOfStudy: c.yearOfStudy,
      semester: c.semester,
      description: c.description,
      isRegistered: registeredIds.includes(c._id),
    }));

    return {
      courses: enriched,
      registeredIds,
      activePeriod: {
        _id: activePeriod._id,
        name: activePeriod.name,
        term: activePeriod.term,
        year: activePeriod.year,
      },
    };
  },
});

export const registerSemesterCourses = mutation({
  args: {
    courseIds: v.array(v.id("courses")),
    periodId: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");

    if (args.courseIds.length === 0) {
      throw new ConvexError("Please select at least one course unit to register.");
    }

    const courseIds = [...new Set(args.courseIds)];
    if (courseIds.length !== args.courseIds.length || courseIds.length > 12) throw new ConvexError("Select each course once, up to the permitted semester load.");
    const period = await ctx.db.get(args.periodId);
    if (!period || period.status !== "active") throw new ConvexError("Registration is available only in the active academic period.");
    const courses = await Promise.all(courseIds.map(id => ctx.db.get(id)));
    if (courses.some(course => !course || course.status !== "active" || course.programId !== student.programId || course.yearOfStudy !== student.yearOfStudy || course.semester !== period.term)) throw new ConvexError("Select active course units from your current program, year, and semester.");
    const totalCU = courses.reduce((sum, course) => sum + (course?.creditUnits ?? 0), 0);

    if (totalCU < 12) {
      throw new ConvexError(`Minimum semester credit load is 12 CU. Selected courses total ${totalCU} CU.`);
    }
    if (totalCU > 24) {
      throw new ConvexError(`Maximum allowed credit load is 24 CU. Selected courses total ${totalCU} CU.`);
    }

    // Remove existing registrations for this period that are not in the new selection
    const existing = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) =>
        q.eq("studentId", student._id).eq("periodId", args.periodId)
      )
      .collect();

    for (const reg of existing) {
      if (!args.courseIds.includes(reg.courseId)) {
        await ctx.db.delete(reg._id);
      }
    }

    // Insert newly registered courses
    for (const cid of args.courseIds) {
      const already = existing.find((e) => e.courseId === cid);
      if (!already) {
        await ctx.db.insert("studentCourseRegistrations", {
          studentId: student._id,
          courseId: cid,
          periodId: args.periodId,
          status: "registered",
        });
      }
    }

    const semesterRegistration = await ctx.db.query("studentSemesterRegistrations").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", args.periodId)).unique();
    if (!semesterRegistration) {
      await ctx.db.insert("studentSemesterRegistrations", {
        studentId: student._id, periodId: args.periodId, yearOfStudy: student.yearOfStudy, semester: period.term,
        status: "registered", registeredAt: Date.now(), registeredBy: "Self-registration",
      });
    } else if (semesterRegistration.status !== "registered") {
      await ctx.db.patch(semesterRegistration._id, {
        yearOfStudy: student.yearOfStudy, semester: period.term, status: "registered",
        registeredAt: Date.now(), registeredBy: "Self-registration", updatedAt: Date.now(),
      });
    }

    await logAction(ctx, {
      action: "REGISTER_COURSES",
      resource: "studentCourseRegistrations",
      details: `Student ${student.registrationNumber} registered ${args.courseIds.length} courses (${totalCU} CU)`,
    });

    return {
      success: true,
      registeredCount: args.courseIds.length,
      totalCreditUnits: totalCU,
    };
  },
});

export const getMyRegisteredCourses = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) return [];

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q: any) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return [];

    const registrations = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) =>
        q.eq("studentId", student._id).eq("periodId", periodId!)
      )
      .collect();

    const usersMap = await getUsersMap(ctx);

    const enriched = await Promise.all(
      registrations.map(async (reg) => {
        const course = await ctx.db.get(reg.courseId);

        // Find lecturer
        const allocation = await ctx.db
          .query("courseAllocations")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", reg.courseId).eq("periodId", periodId!)
          )
          .first();

        const lecturerUser = allocation ? usersMap.get(allocation.lecturerId) : null;

        // Calculate attendance for this course
        const attendanceSessions = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", reg.courseId).eq("periodId", periodId!)
          )
          .collect();

        let attended = 0;
        let totalSessions = attendanceSessions.length;

        for (const sess of attendanceSessions) {
          const myRec = sess.records.find((r) => r.studentId === student._id);
          if (myRec && (myRec.status === "present" || myRec.status === "late")) {
            attended++;
          }
        }

        const attendanceRate =
          totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

        return {
          registrationId: reg._id,
          courseId: reg.courseId,
          code: course?.code ?? "—",
          title: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          category: course?.category ?? "core",
          shortName: course?.shortName ?? "",
          moodleUrl: course?.moodleUrl ?? null,
          yearOfStudy: course?.yearOfStudy ?? 1,
          semester: course?.semester ?? 1,
          lecturerName: lecturerUser?.name ?? "Department Faculty",
          lecturerEmail: lecturerUser?.email ?? "—",
          status: reg.status,
          attendanceRate,
          isEligibleForExam: attendanceRate >= 75,
        };
      })
    );

    return enriched;
  },
});

/** Returns only this student's schedule for courses registered in the selected term. */
export const getMyTimetable = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
    type: v.union(v.literal("lecture"), v.literal("exam")),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) return { period: null, entries: [] };

    let periodId = args.periodId ?? student.currentPeriodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }
    if (!periodId) return { period: null, entries: [] };

    const period = await ctx.db.get(periodId as Id<"academicPeriods">);
    if (!period) return { period: null, entries: [] };

    const registrations = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_student_period", (q) =>
        q.eq("studentId", student._id).eq("periodId", periodId!)
      )
      .collect();
    const courseIds = [...new Set(registrations
      .filter((registration) => registration.status === "registered")
      .map((registration) => registration.courseId))];

    const entries = (await Promise.all(courseIds.map(async (courseId) => {
      const slots = args.type === "lecture"
        ? await ctx.db.query("timetables").withIndex("by_course_period", (q) =>
            q.eq("courseId", courseId).eq("periodId", periodId!)
          ).collect()
        : await ctx.db.query("examTimetables").withIndex("by_course_period", (q) =>
            q.eq("courseId", courseId).eq("periodId", periodId!)
          ).collect();
      const course = await ctx.db.get(courseId);
      return slots.map((slot) => ({
        _id: slot._id,
        courseCode: course?.code ?? "—",
        courseTitle: course?.title ?? "Course details unavailable",
        dayOfWeek: "dayOfWeek" in slot ? slot.dayOfWeek : undefined,
        examDate: "examDate" in slot ? slot.examDate : undefined,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        venue: "venue" in slot ? slot.venue : "building" in slot ? slot.building : undefined,
      }));
    }))).flat();

    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    entries.sort((a, b) => {
      if (args.type === "lecture") {
        const dayDiff = dayOrder.indexOf(a.dayOfWeek ?? "") - dayOrder.indexOf(b.dayOfWeek ?? "");
        if (dayDiff !== 0) return dayDiff;
      } else {
        const dateDiff = (a.examDate ?? "").localeCompare(b.examDate ?? "");
        if (dateDiff !== 0) return dateDiff;
      }
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      period: { name: period.name, term: period.term, year: period.year },
      entries,
    };
  },
});

// ─────────────────────────────────────────────────────────
// 3. ACADEMIC RESULTS & UNOFFICIAL TRANSCRIPT
// ─────────────────────────────────────────────────────────

export const getMyAcademicResults = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) return null;

    const program = (await ctx.db.get(student.programId as Id<"programs">)) as any;
    const department = program?.departmentId ? await ctx.db.get(program.departmentId as Id<"departments">) : null;
    const faculty = department?.facultyId ? await ctx.db.get(department.facultyId) : null;
    const currentPeriod = student.currentPeriodId ? await ctx.db.get(student.currentPeriodId as Id<"academicPeriods">) : null;
    const usersMap = await getUsersMap(ctx);
    const user = usersMap.get(userId);

    // Query all student assessments
    const assessments = await ctx.db
      .query("studentAssessments")
      .withIndex("by_student", (q: any) => q.eq("studentId", student._id))
      .collect();

    // Group by periodId
    const periodMap = new Map<string, typeof assessments>();
    for (const a of assessments) {
      const list = periodMap.get(a.periodId) || [];
      list.push(a);
      periodMap.set(a.periodId, list);
    }

    let cumulativeCU = 0;
    let cumulativeGPSum = 0;

    const semesters = await Promise.all(
      Array.from(periodMap.entries()).map(async ([pId, marksList]) => {
        const period = (await ctx.db.get(pId as Id<"academicPeriods">)) as any;

        let semCU = 0;
        let semGPSum = 0;

        const courses = await Promise.all(
          marksList.map(async (m) => {
            const course = (await ctx.db.get(m.courseId as Id<"courses">)) as any;
            const cu = course?.creditUnits ?? 3;

            // Only count approved marks toward GPA
            if (m.status === "approved") {
              semCU += cu;
              semGPSum += m.gradePoints * cu;
              cumulativeCU += cu;
              cumulativeGPSum += m.gradePoints * cu;
            }

            return {
              assessmentId: m._id,
              courseId: m.courseId,
              code: course?.code ?? "—",
              title: course?.title ?? "—",
              creditUnits: cu,
              yearOfStudy: course?.yearOfStudy ?? 1,
              plannedSemester: course?.semester ?? 1,
              resultCode: m.resultCode,
              courseworkMarks: m.courseworkMarks,
              examMarks: m.examMarks,
              finalScore: m.finalScore,
              grade: m.grade,
              gradePoints: m.gradePoints,
              status: m.status,
              isSupplementaryEligible: m.grade === "D",
              isRetakeRequired: m.grade === "F",
            };
          })
        );

        const semGPA = semCU > 0 ? Number((semGPSum / semCU).toFixed(2)) : 0.0;

        return {
          periodId: pId,
          periodName: period?.name ?? "Semester",
          year: period?.year ?? 2026,
          term: period?.term ?? 1,
          courses,
          semesterCreditUnits: semCU,
          semesterGPA: semGPA,
        };
      })
    );

    const cgpa = cumulativeCU > 0 ? Number((cumulativeGPSum / cumulativeCU).toFixed(2)) : 0.0;
    const { classification, standing } = getDegreeClassification(cgpa);

    return {
      student: {
        name: user?.name ?? "Student",
        registrationNumber: student.registrationNumber,
        accessNumber: student.accessNumber ?? "",
        programName: program?.name ?? "—",
        programCode: program?.code ?? "—",
        facultyName: faculty?.name ?? "—",
        yearOfStudy: student.yearOfStudy,
        currentTerm: currentPeriod?.term ?? student.term,
        currentSemester: currentPeriod?.name ?? `Semester ${student.term}`,
      },
      semesters,
      cumulative: {
        totalCreditUnits: cumulativeCU,
        cgpa,
        degreeClassification: classification,
        academicStanding: standing,
      },
    };
  },
});

// ─────────────────────────────────────────────────────────
// 4. ATTENDANCE TRACKER
// ─────────────────────────────────────────────────────────

export const getMyAttendanceSummary = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) return null;

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q: any) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return null;

    // Get registered courses
    const registrations = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) =>
        q.eq("studentId", student._id).eq("periodId", periodId!)
      )
      .collect();

    let totalSessionsAll = 0;
    let attendedSessionsAll = 0;

    const courseStats = await Promise.all(
      registrations.map(async (reg) => {
        const course = await ctx.db.get(reg.courseId);

        const sessions = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", reg.courseId).eq("periodId", periodId!)
          )
          .collect();

        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        for (const sess of sessions) {
          const rec = sess.records.find((r) => r.studentId === student._id);
          if (rec?.status === "present") presentCount++;
          else if (rec?.status === "late") lateCount++;
          else if (rec?.status === "absent") absentCount++;
        }

        const attended = presentCount + lateCount;
        const total = sessions.length;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;

        totalSessionsAll += total;
        attendedSessionsAll += attended;

        return {
          courseId: reg.courseId,
          code: course?.code ?? "—",
          title: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          totalSessions: total,
          presentCount,
          lateCount,
          absentCount,
          percentage,
          isEligibleForExam: percentage >= 75,
        };
      })
    );

    const overallPercentage =
      totalSessionsAll > 0
        ? Math.round((attendedSessionsAll / totalSessionsAll) * 100)
        : 100;

    return {
      overallPercentage,
      totalSessionsHeld: totalSessionsAll,
      totalSessionsAttended: attendedSessionsAll,
      isOverallEligible: overallPercentage >= 75,
      courseStats,
    };
  },
});

// ─────────────────────────────────────────────────────────
// 5. EXAMINATION CLEARANCE CARD & FINANCIAL STATEMENT
// ─────────────────────────────────────────────────────────

export const getExaminationClearanceCard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) return null;

    const activePeriod = await ctx.db
      .query("academicPeriods")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .first();

    if (!activePeriod) return null;

    const program = (await ctx.db.get(student.programId as Id<"programs">)) as any;
    const department = program?.departmentId ? ((await ctx.db.get(program.departmentId as Id<"departments">)) as any) : null;
    const usersMap = await getUsersMap(ctx);
    const user = usersMap.get(userId);

    // Check Gate 1: Finance Clearance
    const ledger = await ctx.db
      .query("studentLedger")
      .withIndex("by_student_period", (q: any) =>
        q.eq("studentId", student._id).eq("periodId", activePeriod._id)
      )
      .first();

    const outstandingBalance = ledger?.balance ?? 0;
    const isFinanceCleared =
      outstandingBalance <= 0 ||
      student.financeStatus === "cleared" ||
      ledger?.status === "cleared";

    // Check Gate 2: Attendance Clearance & Courses
    const registrations = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) =>
        q.eq("studentId", student._id).eq("periodId", activePeriod._id)
      )
      .collect();

    let allAttendanceCleared = true;
    const roadblocks: string[] = [];

    if (!isFinanceCleared) {
      roadblocks.push(
        `Outstanding tuition fees of SSP ${outstandingBalance.toLocaleString()} must be cleared with Finance.`
      );
    }

    if (registrations.length === 0) {
      roadblocks.push("No course units registered for the current semester.");
      allAttendanceCleared = false;
    }

    const courses = await Promise.all(
      registrations.map(async (reg) => {
        const course = await ctx.db.get(reg.courseId);

        const sessions = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", reg.courseId).eq("periodId", activePeriod._id)
          )
          .collect();

        let attended = 0;
        for (const s of sessions) {
          const r = s.records.find((rec) => rec.studentId === student._id);
          if (r && (r.status === "present" || r.status === "late")) attended++;
        }

        const percentage =
          sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : 100;
        const cleared = percentage >= 75;

        if (!cleared) {
          allAttendanceCleared = false;
          roadblocks.push(
            `Attendance in ${course?.code} is ${percentage}% (minimum 75% required by MoHEST).`
          );
        }

        return {
          courseId: reg.courseId,
          code: course?.code ?? "—",
          title: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          attendanceRate: percentage,
          isEligible: cleared,
        };
      })
    );

    const isFullyCleared = isFinanceCleared && allAttendanceCleared && registrations.length > 0;

    return {
      isCleared: isFullyCleared,
      roadblocks,
      cardSerial: `ECU-EXAM-${activePeriod.year}-${student.registrationNumber.replace(/\//g, "-")}`,
      issuedAt: new Date().toISOString(),
      student: {
        name: user?.name ?? "Student",
        registrationNumber: student.registrationNumber,
        accessNumber: student.accessNumber ?? "",
        programName: program?.name ?? "—",
        departmentName: department?.name ?? "—",
        yearOfStudy: student.yearOfStudy,
        semester: activePeriod.term,
      },
      period: {
        name: activePeriod.name,
        year: activePeriod.year,
      },
      courses,
      financialSummary: {
        totalPaid: ledger?.totalPaid ?? 0,
        balance: outstandingBalance,
        status: ledger?.status ?? student.financeStatus,
      },
    };
  },
});

export const getMyFinancialStatement = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await resolveCurrentStudent(ctx, userId);
    if (!student) return null;

    const ledgers = await ctx.db
      .query("studentLedger")
      .withIndex("by_student", (q: any) => q.eq("studentId", student._id))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_student", (q: any) => q.eq("studentId", student._id))
      .order("asc")
      .collect();

    const sponsor = student.sponsorId
      ? ((await ctx.db.get(student.sponsorId as Id<"sponsors">)) as any)
      : null;

    let totalBilledAll = 0;
    let totalPaidAll = 0;
    let balanceAll = 0;

    const semesterLedgers = await Promise.all(
      ledgers.map(async (l) => {
        const period = (await ctx.db.get(l.periodId as Id<"academicPeriods">)) as any;
        totalBilledAll += l.totalDue;
        totalPaidAll += l.totalPaid;
        balanceAll += l.balance ?? 0;

        return {
          periodName: period?.name ?? "Semester",
          year: period?.year ?? 2026,
          totalBilled: l.totalDue,
          totalPaid: l.totalPaid,
          balance: l.balance ?? 0,
          status: l.status,
        };
      })
    );

    // South Sudan 3-Stage Installment Milestone calculation
    const regTarget = Math.round(totalBilledAll * 0.40);
    const midTarget = Math.round(totalBilledAll * 0.75);
    const examTarget = totalBilledAll;

    const installments = {
      registration: {
        target: regTarget,
        percentage: 40,
        cleared: totalPaidAll >= regTarget && totalBilledAll > 0,
        balanceToClear: Math.max(0, regTarget - totalPaidAll),
      },
      midterm: {
        target: midTarget,
        percentage: 75,
        cleared: totalPaidAll >= midTarget && totalBilledAll > 0,
        balanceToClear: Math.max(0, midTarget - totalPaidAll),
      },
      finalExam: {
        target: examTarget,
        percentage: 100,
        cleared: totalPaidAll >= examTarget && totalBilledAll > 0,
        balanceToClear: Math.max(0, examTarget - totalPaidAll),
      },
      currentStage:
        totalPaidAll >= examTarget && totalBilledAll > 0
          ? "Exam Cleared (100%)"
          : totalPaidAll >= midTarget && totalBilledAll > 0
          ? "Midterms Cleared (75%)"
          : totalPaidAll >= regTarget && totalBilledAll > 0
          ? "Registration Cleared (40%)"
          : "Below Registration (Pending)",
      progressPercentage:
        totalBilledAll > 0 ? Math.min(100, Math.round((totalPaidAll / totalBilledAll) * 100)) : 100,
    };

    let runningBalance = 0;
    const statementTransactions = transactions.map((transaction) => {
      const debit = transaction.type === "charge" ? transaction.amount : 0;
      const credit = transaction.type === "payment" || transaction.type === "waiver" ? transaction.amount : 0;
      runningBalance += debit - credit;

      return {
        _id: transaction._id,
        date: transaction.date,
        reference: transaction.receiptNumber ?? transaction.reference,
        description: transaction.notes ?? "",
        type: transaction.type,
        debit,
        credit,
        balance: runningBalance,
        amount: transaction.amount,
        currency: "SSP",
        method: transaction.method || "cash",
        channel: transaction.channel || (transaction.method === "cash" ? "cash" : transaction.method === "mobile_money" ? "m_gurush" : "bank_deposit"),
        bankBranch: transaction.bankBranch,
        slipNumber: transaction.slipNumber,
        depositDate: transaction.depositDate,
        receiptNumber: transaction.receiptNumber,
        notes: transaction.notes,
        createdAt: transaction._creationTime,
      };
    });

    return {
      summary: {
        totalBilled: totalBilledAll,
        totalPaid: totalPaidAll,
        balance: balanceAll,
        currency: "SSP",
        status: balanceAll <= 0 ? "cleared" : totalPaidAll > 0 ? "partial" : "pending",
        installments,
        sponsor: sponsor
          ? {
              name: sponsor.name,
              code: sponsor.code,
              category: sponsor.category,
              coveragePercentage: sponsor.coveragePercentage ?? 100,
            }
          : null,
      },
      semesterLedgers,
      transactions: statementTransactions,
    };
  },
});
