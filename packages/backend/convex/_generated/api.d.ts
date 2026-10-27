/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as academic from "../academic.js";
import type * as admissions from "../admissions.js";
import type * as admissionsBulk from "../admissionsBulk.js";
import type * as admissionsDocuments from "../admissionsDocuments.js";
import type * as admissionsEnrollment from "../admissionsEnrollment.js";
import type * as admissionsTestSeed from "../admissionsTestSeed.js";
import type * as allocations from "../allocations.js";
import type * as assessmentApplications from "../assessmentApplications.js";
import type * as audit_logger from "../audit_logger.js";
import type * as broadsheet from "../broadsheet.js";
import type * as calendar from "../calendar.js";
import type * as courseRosterCleanup from "../courseRosterCleanup.js";
import type * as courseRosterSeed from "../courseRosterSeed.js";
import type * as courseUnitAggregations from "../courseUnitAggregations.js";
import type * as courses from "../courses.js";
import type * as demoSeed from "../demoSeed.js";
import type * as departmentAllocations from "../departmentAllocations.js";
import type * as finance from "../finance.js";
import type * as financePayroll from "../financePayroll.js";
import type * as gradebook from "../gradebook.js";
import type * as hod from "../hod.js";
import type * as hodLecturers from "../hodLecturers.js";
import type * as http from "../http.js";
import type * as lib_academicAccess from "../lib/academicAccess.js";
import type * as lib_academicAudit from "../lib/academicAudit.js";
import type * as lib_academicResults from "../lib/academicResults.js";
import type * as lib_academicStanding from "../lib/academicStanding.js";
import type * as lib_academicWorkflowSchema from "../lib/academicWorkflowSchema.js";
import type * as lib_admissionsSchema from "../lib/admissionsSchema.js";
import type * as lib_admissionsTestFixtures from "../lib/admissionsTestFixtures.js";
import type * as lib_courseUnitAggregationAccess from "../lib/courseUnitAggregationAccess.js";
import type * as lib_demoAcademicWorkflowSeed from "../lib/demoAcademicWorkflowSeed.js";
import type * as lib_demoAgricultureMarksSeed from "../lib/demoAgricultureMarksSeed.js";
import type * as lib_demoPayrollSeed from "../lib/demoPayrollSeed.js";
import type * as lib_demoPortalSeed from "../lib/demoPortalSeed.js";
import type * as lib_departmentLeadership from "../lib/departmentLeadership.js";
import type * as lib_markPermissionAccess from "../lib/markPermissionAccess.js";
import type * as lib_mutations from "../lib/mutations.js";
import type * as lib_showcaseRoster from "../lib/showcaseRoster.js";
import type * as lib_staffPayrollSchema from "../lib/staffPayrollSchema.js";
import type * as lib_staffServiceSchema from "../lib/staffServiceSchema.js";
import type * as lib_studentProfile from "../lib/studentProfile.js";
import type * as lib_studentProfileFields from "../lib/studentProfileFields.js";
import type * as lib_utils from "../lib/utils.js";
import type * as library from "../library.js";
import type * as markEntry from "../markEntry.js";
import type * as markPermissions from "../markPermissions.js";
import type * as markReview from "../markReview.js";
import type * as marks from "../marks.js";
import type * as migration from "../migration.js";
import type * as retakeRegistrations from "../retakeRegistrations.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as showcaseClassSeed from "../showcaseClassSeed.js";
import type * as showcaseSeed from "../showcaseSeed.js";
import type * as showcaseSeedMutations from "../showcaseSeedMutations.js";
import type * as staffPayroll from "../staffPayroll.js";
import type * as staffPersonalRecords from "../staffPersonalRecords.js";
import type * as staffReviews from "../staffReviews.js";
import type * as staffServices from "../staffServices.js";
import type * as student_dashboard from "../student_dashboard.js";
import type * as student_identity from "../student_identity.js";
import type * as student_portal from "../student_portal.js";
import type * as student_services from "../student_services.js";
import type * as students from "../students.js";
import type * as system from "../system.js";
import type * as teaching_cover from "../teaching_cover.js";
import type * as timetable from "../timetable.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academic: typeof academic;
  admissions: typeof admissions;
  admissionsBulk: typeof admissionsBulk;
  admissionsDocuments: typeof admissionsDocuments;
  admissionsEnrollment: typeof admissionsEnrollment;
  admissionsTestSeed: typeof admissionsTestSeed;
  allocations: typeof allocations;
  assessmentApplications: typeof assessmentApplications;
  audit_logger: typeof audit_logger;
  broadsheet: typeof broadsheet;
  calendar: typeof calendar;
  courseRosterCleanup: typeof courseRosterCleanup;
  courseRosterSeed: typeof courseRosterSeed;
  courseUnitAggregations: typeof courseUnitAggregations;
  courses: typeof courses;
  demoSeed: typeof demoSeed;
  departmentAllocations: typeof departmentAllocations;
  finance: typeof finance;
  financePayroll: typeof financePayroll;
  gradebook: typeof gradebook;
  hod: typeof hod;
  hodLecturers: typeof hodLecturers;
  http: typeof http;
  "lib/academicAccess": typeof lib_academicAccess;
  "lib/academicAudit": typeof lib_academicAudit;
  "lib/academicResults": typeof lib_academicResults;
  "lib/academicStanding": typeof lib_academicStanding;
  "lib/academicWorkflowSchema": typeof lib_academicWorkflowSchema;
  "lib/admissionsSchema": typeof lib_admissionsSchema;
  "lib/admissionsTestFixtures": typeof lib_admissionsTestFixtures;
  "lib/courseUnitAggregationAccess": typeof lib_courseUnitAggregationAccess;
  "lib/demoAcademicWorkflowSeed": typeof lib_demoAcademicWorkflowSeed;
  "lib/demoAgricultureMarksSeed": typeof lib_demoAgricultureMarksSeed;
  "lib/demoPayrollSeed": typeof lib_demoPayrollSeed;
  "lib/demoPortalSeed": typeof lib_demoPortalSeed;
  "lib/departmentLeadership": typeof lib_departmentLeadership;
  "lib/markPermissionAccess": typeof lib_markPermissionAccess;
  "lib/mutations": typeof lib_mutations;
  "lib/showcaseRoster": typeof lib_showcaseRoster;
  "lib/staffPayrollSchema": typeof lib_staffPayrollSchema;
  "lib/staffServiceSchema": typeof lib_staffServiceSchema;
  "lib/studentProfile": typeof lib_studentProfile;
  "lib/studentProfileFields": typeof lib_studentProfileFields;
  "lib/utils": typeof lib_utils;
  library: typeof library;
  markEntry: typeof markEntry;
  markPermissions: typeof markPermissions;
  markReview: typeof markReview;
  marks: typeof marks;
  migration: typeof migration;
  retakeRegistrations: typeof retakeRegistrations;
  roles: typeof roles;
  seed: typeof seed;
  showcaseClassSeed: typeof showcaseClassSeed;
  showcaseSeed: typeof showcaseSeed;
  showcaseSeedMutations: typeof showcaseSeedMutations;
  staffPayroll: typeof staffPayroll;
  staffPersonalRecords: typeof staffPersonalRecords;
  staffReviews: typeof staffReviews;
  staffServices: typeof staffServices;
  student_dashboard: typeof student_dashboard;
  student_identity: typeof student_identity;
  student_portal: typeof student_portal;
  student_services: typeof student_services;
  students: typeof students;
  system: typeof system;
  teaching_cover: typeof teaching_cover;
  timetable: typeof timetable;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
