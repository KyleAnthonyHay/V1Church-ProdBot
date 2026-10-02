/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as campuses from "../campuses.js";
import type * as chat from "../chat.js";
import type * as checklist from "../checklist.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as demoData from "../demoData.js";
import type * as documents from "../documents.js";
import type * as extract from "../extract.js";
import type * as fixes from "../fixes.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_prompt from "../lib/prompt.js";
import type * as orgs from "../orgs.js";
import type * as sources from "../sources.js";
import type * as wiringChats from "../wiringChats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  auth: typeof auth;
  campuses: typeof campuses;
  chat: typeof chat;
  checklist: typeof checklist;
  crons: typeof crons;
  demo: typeof demo;
  demoData: typeof demoData;
  documents: typeof documents;
  extract: typeof extract;
  fixes: typeof fixes;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/prompt": typeof lib_prompt;
  orgs: typeof orgs;
  sources: typeof sources;
  wiringChats: typeof wiringChats;
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
