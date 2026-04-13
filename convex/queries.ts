import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════
// Central helper: get latest classification for a video.
// DRY: all queries use this. No `any` types. (Eng review #7, I1)
// ═══════════════════════════════════════════════════════════════

async function getLatestClassification(ctx: QueryCtx, videoId: Id<"videos">) {
  return await ctx.db
    .query("classifications")
    .withIndex("by_videoId_classifiedAt", (q) => q.eq("videoId", videoId))
    .order("desc")
    .first();
}

// Shared: build a video result object from video + classification
function buildVideoResult(
  video: Doc<"videos">,
  classification: Doc<"classifications"> | null
) {
  return {
    _id: video._id,
    youtubeId: video.youtubeId,
    artist: video.parsedArtist ?? video.rawTitle.split(":")[0]?.trim() ?? "",
    songTitle: video.parsedSongTitle ?? "",
    thumbnailUrl: video.thumbnailUrl,
    primaryGenre: classification?.primaryGenre ?? "pending",
    moods: classification?.moods ?? [],
    era: classification?.era ?? "",
    vibeTags: classification?.vibeTags ?? [],
    confidence: classification?.confidence ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// Grid: paginated video list. Uses classification index for genre
// filter instead of loading all videos. (C2 fix)
// ═══════════════════════════════════════════════════════════════

export const getGridVideos = query({
  args: {
    genre: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 40;

    if (args.genre) {
      // Genre filter: query classifications by primaryGenre index,
      // then look up videos. Avoids loading all 1,402 videos.
      const classifications = await ctx.db
        .query("classifications")
        .withIndex("by_primaryGenre", (q) => q.eq("primaryGenre", args.genre!))
        .take(limit * 2); // Over-fetch to account for versioned dupes

      // Dedupe by videoId (take latest per video)
      const seen = new Set<string>();
      const results = [];

      for (const c of classifications) {
        const vidId = c.videoId as string;
        if (seen.has(vidId)) continue;
        seen.add(vidId);

        const video = await ctx.db.get(c.videoId);
        if (!video || !video.isAvailable) continue;

        results.push(buildVideoResult(video, c));
        if (results.length >= limit) break;
      }

      return results;
    }

    // No genre filter: get artist_linked videos (most common status)
    // then classified, using .take() instead of .collect()
    const statuses = ["artist_linked", "classified", "complete"] as const;
    const results = [];

    for (const status of statuses) {
      if (results.length >= limit) break;

      const videos = await ctx.db
        .query("videos")
        .withIndex("by_enrichmentStatus", (q) => q.eq("enrichmentStatus", status))
        .take(limit - results.length);

      for (const video of videos) {
        if (!video.isAvailable) continue;
        const classification = await getLatestClassification(ctx, video._id);
        if (!classification) continue;
        results.push(buildVideoResult(video, classification));
      }
    }

    return results;
  },
});

// ═══════════════════════════════════════════════════════════════
// Genre list: uses primaryGenre index for counting. (C3 fix)
// Queries each known genre separately instead of full table scan.
// ═══════════════════════════════════════════════════════════════

import { PRIMARY_GENRES } from "../lib/classification-prompt";

export const getAvailableGenres = query({
  args: {},
  handler: async (ctx) => {
    const results = [];

    for (const genre of PRIMARY_GENRES) {
      // Count by querying with the index and collecting just IDs
      const count = await ctx.db
        .query("classifications")
        .withIndex("by_primaryGenre", (q) => q.eq("primaryGenre", genre))
        .collect()
        .then((rows) => rows.length);

      if (count > 0) {
        results.push({ genre, count });
      }
    }

    return results.sort((a, b) => b.count - a.count);
  },
});

// ═══════════════════════════════════════════════════════════════
// Random video (SURPRISE ME) — queries all enriched statuses (S1 fix)
// ═══════════════════════════════════════════════════════════════

export const getRandomVideo = query({
  args: {},
  handler: async (ctx) => {
    // Sample from artist_linked (most videos end up here)
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_enrichmentStatus", (q) =>
        q.eq("enrichmentStatus", "artist_linked")
      )
      .take(200);

    if (videos.length === 0) return null;

    const random = videos[Math.floor(Math.random() * videos.length)];
    const classification = await getLatestClassification(ctx, random._id);

    return buildVideoResult(random, classification);
  },
});

// ═══════════════════════════════════════════════════════════════
// Search
// ═══════════════════════════════════════════════════════════════

export const searchVideos = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return [];

    const videos = await ctx.db
      .query("videos")
      .withSearchIndex("search_text", (q) =>
        q.search("searchableText", args.query)
      )
      .take(args.limit ?? 20);

    const results = [];
    for (const video of videos) {
      const classification = await getLatestClassification(ctx, video._id);
      results.push(buildVideoResult(video, classification));
    }

    return results;
  },
});

// ═══════════════════════════════════════════════════════════════
// Video details — full data for the info overlay
// ═══════════════════════════════════════════════════════════════

export const getVideoDetails = query({
  args: { youtubeId: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_youtubeId", (q) => q.eq("youtubeId", args.youtubeId))
      .first();

    if (!video) return null;

    const classification = await getLatestClassification(ctx, video._id);

    let artist: Doc<"artists"> | null = null;
    let editorial: Doc<"artistEditorial"> | null = null;
    if (video.artistId) {
      artist = await ctx.db.get(video.artistId);
      if (artist) {
        editorial = await ctx.db
          .query("artistEditorial")
          .withIndex("by_artistId", (q) => q.eq("artistId", artist!._id))
          .order("desc")
          .first();
      }
    }

    return {
      youtubeId: video.youtubeId,
      rawTitle: video.rawTitle,
      description: video.description,
      publishedAt: video.publishedAt,
      artist: video.parsedArtist ?? video.rawTitle.split(":")[0]?.trim() ?? "",
      songTitle: video.parsedSongTitle ?? "",
      primaryGenre: classification?.primaryGenre,
      subGenres: classification?.subGenres,
      moods: classification?.moods,
      era: classification?.era,
      instrumentation: classification?.instrumentation,
      region: classification?.region,
      vibeTags: classification?.vibeTags,
      confidence: classification?.confidence,
      spotifyGenres: artist?.spotifyGenres,
      spotifyPopularity: artist?.spotifyPopularity,
      spotifyImageUrl: artist?.spotifyImageUrl,
      discogsCountry: artist?.discogsCountry,
      musicbrainzCountry: artist?.musicbrainzCountry,
      musicbrainzBeginDate: artist?.musicbrainzBeginDate,
      editorial: editorial?.editorial,
      sonicDNA: editorial?.sonicDNA,
      ifYouLike: editorial?.ifYouLike,
      trivia: editorial?.trivia,
      discographyPicks: editorial?.discographyPicks,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// Pipeline status (dev/admin only — single source, removed dupe I5)
// ═══════════════════════════════════════════════════════════════

export const getPipelineStatus = query({
  args: {},
  handler: async (ctx) => {
    const statuses = [
      "pending",
      "parsed",
      "classified",
      "artist_linked",
      "complete",
    ] as const;
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const videos = await ctx.db
        .query("videos")
        .withIndex("by_enrichmentStatus", (q) =>
          q.eq("enrichmentStatus", status)
        )
        .collect();
      counts[status] = videos.length;
    }

    return counts;
  },
});
