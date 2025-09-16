/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiGrading from "../aiGrading.js";
import type * as apiErrorHandling from "../apiErrorHandling.js";
import type * as assignments from "../assignments.js";
import type * as autograding from "../autograding.js";
import type * as batchGrading from "../batchGrading.js";
import type * as chat from "../chat.js";
import type * as classroomSync from "../classroomSync.js";
import type * as feedbackSystem from "../feedbackSystem.js";
import type * as gradeExport from "../gradeExport.js";
import type * as gradingEngine from "../gradingEngine.js";
import type * as integrationTests from "../integrationTests.js";
import type * as resultPublishing from "../resultPublishing.js";
import type * as submissionPipeline from "../submissionPipeline.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiGrading: typeof aiGrading;
  apiErrorHandling: typeof apiErrorHandling;
  assignments: typeof assignments;
  autograding: typeof autograding;
  batchGrading: typeof batchGrading;
  chat: typeof chat;
  classroomSync: typeof classroomSync;
  feedbackSystem: typeof feedbackSystem;
  gradeExport: typeof gradeExport;
  gradingEngine: typeof gradingEngine;
  integrationTests: typeof integrationTests;
  resultPublishing: typeof resultPublishing;
  submissionPipeline: typeof submissionPipeline;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
