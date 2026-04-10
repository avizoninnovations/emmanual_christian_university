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
import type * as audit_logger from "../audit_logger.js";
import type * as calendar from "../calendar.js";
import type * as finance from "../finance.js";
import type * as http from "../http.js";
import type * as lib_utils from "../lib/utils.js";
import type * as library from "../library.js";
import type * as marks from "../marks.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as students from "../students.js";
import type * as system from "../system.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academic: typeof academic;
  admissions: typeof admissions;
  audit_logger: typeof audit_logger;
  calendar: typeof calendar;
  finance: typeof finance;
  http: typeof http;
  "lib/utils": typeof lib_utils;
  library: typeof library;
  marks: typeof marks;
  roles: typeof roles;
  seed: typeof seed;
  students: typeof students;
  system: typeof system;
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
