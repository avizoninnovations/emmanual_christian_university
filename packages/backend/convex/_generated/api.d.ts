/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as academicPeriods from "../academicPeriods.js";
import type * as academicReports from "../academicReports.js";
import type * as admissions from "../admissions.js";
import type * as analytics from "../analytics.js";
import type * as assessmentConfigs from "../assessmentConfigs.js";
import type * as assessments from "../assessments.js";
import type * as attendance from "../attendance.js";
import type * as auditViewer from "../auditViewer.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as constants from "../constants.js";
import type * as courseAllocations from "../courseAllocations.js";
import type * as courses from "../courses.js";
import type * as dbUtils from "../dbUtils.js";
import type * as emergencyContacts from "../emergencyContacts.js";
import type * as enrollment from "../enrollment.js";
import type * as expenses from "../expenses.js";
import type * as faculties from "../faculties.js";
import type * as feeStructures from "../feeStructures.js";
import type * as finance from "../finance.js";
import type * as finance_analytics from "../finance_analytics.js";
import type * as historyHelpers from "../historyHelpers.js";
import type * as http from "../http.js";
import type * as lib_extractTextContent from "../lib/extractTextContent.js";
import type * as lib_secrets from "../lib/secrets.js";
import type * as lms from "../lms.js";
import type * as otherFees from "../otherFees.js";
import type * as oversight from "../oversight.js";
import type * as payments from "../payments.js";
import type * as payroll from "../payroll.js";
import type * as permissions from "../permissions.js";
import type * as permissions_definitions from "../permissions_definitions.js";
import type * as programs from "../programs.js";
import type * as reportUtils from "../reportUtils.js";
import type * as reporting from "../reporting.js";
import type * as roles from "../roles.js";
import type * as schoolConfig from "../schoolConfig.js";
import type * as schoolConfigInternal from "../schoolConfigInternal.js";
import type * as studentManagement from "../studentManagement.js";
import type * as students from "../students.js";
import type * as timetable from "../timetable.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academicPeriods: typeof academicPeriods;
  academicReports: typeof academicReports;
  admissions: typeof admissions;
  analytics: typeof analytics;
  assessmentConfigs: typeof assessmentConfigs;
  assessments: typeof assessments;
  attendance: typeof attendance;
  auditViewer: typeof auditViewer;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  constants: typeof constants;
  courseAllocations: typeof courseAllocations;
  courses: typeof courses;
  dbUtils: typeof dbUtils;
  emergencyContacts: typeof emergencyContacts;
  enrollment: typeof enrollment;
  expenses: typeof expenses;
  faculties: typeof faculties;
  feeStructures: typeof feeStructures;
  finance: typeof finance;
  finance_analytics: typeof finance_analytics;
  historyHelpers: typeof historyHelpers;
  http: typeof http;
  "lib/extractTextContent": typeof lib_extractTextContent;
  "lib/secrets": typeof lib_secrets;
  lms: typeof lms;
  otherFees: typeof otherFees;
  oversight: typeof oversight;
  payments: typeof payments;
  payroll: typeof payroll;
  permissions: typeof permissions;
  permissions_definitions: typeof permissions_definitions;
  programs: typeof programs;
  reportUtils: typeof reportUtils;
  reporting: typeof reporting;
  roles: typeof roles;
  schoolConfig: typeof schoolConfig;
  schoolConfigInternal: typeof schoolConfigInternal;
  studentManagement: typeof studentManagement;
  students: typeof students;
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

export declare const components: {};
