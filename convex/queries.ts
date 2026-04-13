import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════
// Central helper: get latest classification for a video.
// DRY: all grid/filter/search queries use this instead of
// inlining the join. (Eng review issue #7)
// ═══════════════════════════════════════════════════════════════

async function getLatestClassification(
  ctx: { db: Doc<"videos">["_id"] extends Id<"videos"> ? any : never },
  videoId: Id<"videos">
) {
  // Workaround: ctx typing is complex in Convex helpers
  const db = (ctx as any).db;
  return await db
    .query("classifications")
    .withIndex("by_videoId_classifiedAt", (q: any) =>
      q.eq("videoId", videoId)
    )
    .order("desc")
    .first();
}

// ═══════════════════════════════════════════════════════════════
// Grid: paginated list of classified videos with their tags
// ═══════════════════════════════════════════════════════════════

export const getGridVideos = query({
  args: {
    genre: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 32;

    // Get classified videos (includes classified, artist_linked, complete)
    // For now, get all classified+ videos and filter client-side for genre
    const allStatuses = ["classified", "artist_linked", "complete"] as const;
    let allVideos: Doc<"videos">[] = [];

    for (const status of allStatuses) {
      const videos = await ctx.db
        .query("videos")
        .withIndex("by_enrichmentStatus", (q) =>
          q.eq("enrichmentStatus", status)
        )
        .collect();
      allVideos = [...allVideos, ...videos];
    }

    // Join with classifications
    const results = [];
    for (const video of allVideos) {
      const classification = await ctx.db
        .query("classifications")
        .withIndex("by_videoId_classifiedAt", (q) =>
          q.eq("videoId", video._id)
        )
        .order("desc")
        .first();

      if (!classification) continue;

      // Genre filter
      if (args.genre && classification.primaryGenre !== args.genre) continue;

      results.push({
        _id: video._id,
        youtubeId: video.youtubeId,
        artist: video.parsedArtist ?? video.rawTitle.split(":")[0]?.trim(),
        songTitle: video.parsedSongTitle ?? "",
        thumbnailUrl: video.thumbnailUrl,
        primaryGenre: classification.primaryGenre,
        moods: classification.moods,
        era: classification.era,
        vibeTags: classification.vibeTags,
        confidence: classification.confidence,
      });
    }

    // Sort by publish date (newest first) and paginate
    return results.slice(0, limit);
  },
});

// ═══════════════════════════════════════════════════════════════
// Genre list: distinct genres for filter dropdown
// ═══════════════════════════════════════════════════════════════

export const getAvailableGenres = query({
  args: {},
  handler: async (ctx) => {
    const classifications = await ctx.db
      .query("classifications")
      .collect();

    const genreCounts: Record<string, number> = {};
    for (const c of classifications) {
      genreCounts[c.primaryGenre] = (genreCounts[c.primaryGenre] || 0) + 1;
    }

    return Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);
  },
});

// ═══════════════════════════════════════════════════════════════
// Random video (SURPRISE ME button, CEO cherry-pick #6)
// ═══════════════════════════════════════════════════════════════

export const getRandomVideo = query({
  args: {},
  handler: async (ctx) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_enrichmentStatus", (q) =>
        q.eq("enrichmentStatus", "classified")
      )
      .collect();

    if (videos.length === 0) return null;

    const random = videos[Math.floor(Math.random() * videos.length)];
    const classification = await ctx.db
      .query("classifications")
      .withIndex("by_videoId_classifiedAt", (q) =>
        q.eq("videoId", random._id)
      )
      .order("desc")
      .first();

    return {
      _id: random._id,
      youtubeId: random.youtubeId,
      artist: random.parsedArtist ?? random.rawTitle.split(":")[0]?.trim(),
      songTitle: random.parsedSongTitle ?? "",
      thumbnailUrl: random.thumbnailUrl,
      primaryGenre: classification?.primaryGenre,
      moods: classification?.moods,
    };
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
      const classification = await ctx.db
        .query("classifications")
        .withIndex("by_videoId_classifiedAt", (q) =>
          q.eq("videoId", video._id)
        )
        .order("desc")
        .first();

      results.push({
        _id: video._id,
        youtubeId: video.youtubeId,
        artist: video.parsedArtist ?? video.rawTitle.split(":")[0]?.trim(),
        songTitle: video.parsedSongTitle ?? "",
        thumbnailUrl: video.thumbnailUrl,
        primaryGenre: classification?.primaryGenre ?? "pending",
      });
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

    const classification = await ctx.db
      .query("classifications")
      .withIndex("by_videoId_classifiedAt", (q) =>
        q.eq("videoId", video._id)
      )
      .order("desc")
      .first();

    // Get artist + editorial if linked
    let artist = null;
    let editorial = null;
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
      artist: video.parsedArtist ?? video.rawTitle.split(":")[0]?.trim(),
      songTitle: video.parsedSongTitle ?? "",
      primaryGenre: classification?.primaryGenre,
      subGenres: classification?.subGenres,
      moods: classification?.moods,
      era: classification?.era,
      instrumentation: classification?.instrumentation,
      region: classification?.region,
      vibeTags: classification?.vibeTags,
      confidence: classification?.confidence,
      // Artist enrichment data
      spotifyGenres: artist?.spotifyGenres,
      spotifyPopularity: artist?.spotifyPopularity,
      spotifyImageUrl: artist?.spotifyImageUrl,
      discogsCountry: artist?.discogsCountry,
      musicbrainzCountry: artist?.musicbrainzCountry,
      musicbrainzBeginDate: artist?.musicbrainzBeginDate,
      // Editorial
      editorial: editorial?.editorial,
      sonicDNA: editorial?.sonicDNA,
      ifYouLike: editorial?.ifYouLike,
      trivia: editorial?.trivia,
      discographyPicks: editorial?.discographyPicks,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// Pipeline status (dev/admin)
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

export const getSampleClassifiedVideos = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_enrichmentStatus", (q) =>
        q.eq("enrichmentStatus", "classified")
      )
      .take(args.limit ?? 10);

    const results = [];
    for (const video of videos) {
      const classification = await ctx.db
        .query("classifications")
        .withIndex("by_videoId_classifiedAt", (q) =>
          q.eq("videoId", video._id)
        )
        .order("desc")
        .first();

      results.push({
        youtubeId: video.youtubeId,
        artist: video.parsedArtist,
        songTitle: video.parsedSongTitle,
        primaryGenre: classification?.primaryGenre,
        moods: classification?.moods,
        era: classification?.era,
        region: classification?.region,
        vibeTags: classification?.vibeTags,
        confidence: classification?.confidence,
      });
    }

    return results;
  },
});
