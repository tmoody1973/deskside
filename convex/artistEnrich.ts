import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════
// Artist enrichment pipeline
//
// Per-artist, not per-video. First video by an artist triggers
// the lookup; subsequent videos link to the existing artist row.
//
// MusicBrainz (1 req/sec) → Spotify → Discogs
// Results cached in artists table immediately (eng review #3).
// ═══════════════════════════════════════════════════════════════

export const getClassifiedVideosNeedingArtistLink = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_enrichmentStatus", (q) =>
        q.eq("enrichmentStatus", "classified")
      )
      .take(args.limit);
  },
});

export const findArtistByNormalizedName = internalQuery({
  args: { normalizedName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artists")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", args.normalizedName)
      )
      .first();
  },
});

// Enrich a single video's artist
export const enrichVideoArtist = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    const video = await ctx.runQuery(internal.artistEnrich.getVideoById, {
      id: args.videoId,
    });
    if (!video || video.enrichmentStatus !== "classified") return;

    const artistName = video.parsedArtist || video.rawTitle.split(":")[0]?.trim();
    if (!artistName) return;

    const { normalizeArtistName } = await import("../lib/normalize");
    const normalizedName = normalizeArtistName(artistName);

    // Check if artist already exists (dedup)
    let existingArtist = await ctx.runQuery(
      internal.artistEnrich.findArtistByNormalizedName,
      { normalizedName }
    );

    if (existingArtist) {
      // Artist already enriched, just link the video
      await ctx.runMutation(internal.artistEnrich.linkVideoToArtist, {
        videoId: args.videoId,
        artistId: existingArtist._id,
      });
      return;
    }

    // Create new artist and enrich from external APIs
    const artistId = await ctx.runMutation(internal.artistEnrich.createArtist, {
      name: artistName,
      normalizedName,
    });

    // MusicBrainz lookup
    let mbData = null;
    try {
      const { searchArtist: mbSearch } = await import("../lib/musicbrainz");
      mbData = await mbSearch(artistName);
    } catch (err) {
      console.error(`MusicBrainz failed for "${artistName}": ${err}`);
    }

    // Spotify lookup
    let spotifyData = null;
    try {
      const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
      const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      if (spotifyClientId && spotifyClientSecret) {
        const { searchArtist: spotifySearch } = await import("../lib/spotify");
        spotifyData = await spotifySearch(artistName, spotifyClientId, spotifyClientSecret);
      }
    } catch (err) {
      console.error(`Spotify failed for "${artistName}": ${err}`);
    }

    // Discogs lookup
    let discogsData = null;
    try {
      const discogsKey = process.env.DISCOGS_CONSUMER_KEY;
      const discogsSecret = process.env.DISCOGS_CONSUMER_SECRET;
      if (discogsKey && discogsSecret) {
        const { searchArtist: discogsSearch } = await import("../lib/discogs");
        discogsData = await discogsSearch(artistName, discogsKey, discogsSecret);
      }
    } catch (err) {
      console.error(`Discogs failed for "${artistName}": ${err}`);
    }

    // Determine enrichment status
    const hasAnyData = mbData || spotifyData || discogsData;
    const enrichmentStatus = hasAnyData ? "complete" as const : "partial" as const;

    // Save enrichment data to artist row
    await ctx.runMutation(internal.artistEnrich.saveEnrichmentData, {
      artistId,
      musicbrainzId: mbData?.id,
      musicbrainzTags: mbData?.tags,
      musicbrainzCountry: mbData?.country,
      musicbrainzBeginDate: mbData?.beginDate,
      spotifyId: spotifyData?.id,
      spotifyGenres: spotifyData?.genres,
      spotifyPopularity: spotifyData?.popularity,
      spotifyImageUrl: spotifyData?.imageUrl,
      discogsId: discogsData?.id,
      discogsStyles: discogsData?.styles,
      discogsCountry: discogsData?.country,
      discogsYearsActive: discogsData?.yearsActive,
      enrichmentStatus,
    });

    // Link video to artist
    await ctx.runMutation(internal.artistEnrich.linkVideoToArtist, {
      videoId: args.videoId,
      artistId,
    });
  },
});

// ───────────────────────────────────────────────────────────────
// Internal mutations
// ───────────────────────────────────────────────────────────────

export const getVideoById = internalQuery({
  args: { id: v.id("videos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createArtist = internalMutation({
  args: {
    name: v.string(),
    normalizedName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("artists", {
      name: args.name,
      normalizedName: args.normalizedName,
      enrichmentStatus: "pending",
    });
  },
});

export const saveEnrichmentData = internalMutation({
  args: {
    artistId: v.id("artists"),
    musicbrainzId: v.optional(v.string()),
    musicbrainzTags: v.optional(v.array(v.string())),
    musicbrainzCountry: v.optional(v.string()),
    musicbrainzBeginDate: v.optional(v.string()),
    spotifyId: v.optional(v.string()),
    spotifyGenres: v.optional(v.array(v.string())),
    spotifyPopularity: v.optional(v.number()),
    spotifyImageUrl: v.optional(v.string()),
    discogsId: v.optional(v.number()),
    discogsStyles: v.optional(v.array(v.string())),
    discogsCountry: v.optional(v.string()),
    discogsYearsActive: v.optional(v.string()),
    enrichmentStatus: v.union(v.literal("partial"), v.literal("complete")),
  },
  handler: async (ctx, args) => {
    const { artistId, enrichmentStatus, ...data } = args;
    await ctx.db.patch(artistId, {
      ...data,
      enrichmentStatus,
    });
  },
});

export const linkVideoToArtist = internalMutation({
  args: {
    videoId: v.id("videos"),
    artistId: v.id("artists"),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return;

    await ctx.db.patch(args.videoId, {
      artistId: args.artistId,
      enrichmentStatus: "artist_linked",
    });
  },
});

// ───────────────────────────────────────────────────────────────
// Batch orchestrator (fan-out pattern, same as classification)
// ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 15; // Smaller batches due to MusicBrainz 1 req/sec
const BATCH_DELAY_MS = 8000; // Longer delay for rate limits

export const processBatch = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const videos = await ctx.runQuery(
      internal.artistEnrich.getClassifiedVideosNeedingArtistLink,
      { limit: BATCH_SIZE }
    );

    if (videos.length === 0) {
      console.log("Artist enrichment pipeline complete.");
      return;
    }

    // Fan out: each video gets its own action
    for (const video of videos) {
      await ctx.scheduler.runAfter(
        0,
        internal.artistEnrich.enrichVideoArtist,
        { videoId: video._id }
      );
    }

    // Schedule next batch
    await ctx.scheduler.runAfter(
      BATCH_DELAY_MS,
      internal.artistEnrich.processBatch,
      {}
    );
  },
});

// Public entry point
import { action } from "./_generated/server";

export const startEnrichment = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    await ctx.runAction(internal.artistEnrich.processBatch, {});
    return "Artist enrichment started. Batches will self-schedule.";
  },
});
