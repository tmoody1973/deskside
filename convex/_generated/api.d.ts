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
import type * as artistEnrich from "../artistEnrich.js";
import type * as channels from "../channels.js";
import type * as crons from "../crons.js";
import type * as editorialSynth from "../editorialSynth.js";
import type * as enrichment from "../enrichment.js";
import type * as favorites from "../favorites.js";
import type * as ingest from "../ingest.js";
import type * as playlists from "../playlists.js";
import type * as queries from "../queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  artistEnrich: typeof artistEnrich;
  channels: typeof channels;
  crons: typeof crons;
  editorialSynth: typeof editorialSynth;
  enrichment: typeof enrichment;
  favorites: typeof favorites;
  ingest: typeof ingest;
  playlists: typeof playlists;
  queries: typeof queries;
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
