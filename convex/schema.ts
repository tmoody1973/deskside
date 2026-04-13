import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ═══════════════════════════════════════════════════════════════
  // VIDEOS — One row per YouTube video. Source of truth.
  //
  // State machine (enrichmentStatus):
  //   pending → parsed → classified → artist_linked → complete
  //
  // Each step is idempotent. Retries never re-run completed steps.
  // ═══════════════════════════════════════════════════════════════
  videos: defineTable({
    youtubeId: v.string(),
    rawTitle: v.string(),
    description: v.string(),
    thumbnailUrl: v.string(),
    publishedAt: v.string(),
    duration: v.optional(v.string()),
    viewCount: v.optional(v.number()),

    // Parsed fields (populated by Claude Haiku title parse)
    parsedArtist: v.optional(v.string()),
    parsedFeaturedArtists: v.optional(v.array(v.string())),
    parsedSongTitle: v.optional(v.string()),
    parseConfidence: v.optional(v.number()),

    // Normalized search field (populated during parse step)
    searchableText: v.optional(v.string()),

    // Enrichment state machine
    enrichmentStatus: v.union(
      v.literal("pending"),
      v.literal("parsed"),
      v.literal("classified"),
      v.literal("artist_linked"),
      v.literal("complete")
    ),

    // Artist link
    artistId: v.optional(v.id("artists")),

    // Availability tracking
    isAvailable: v.boolean(),

    // Ingestion metadata
    playlistPosition: v.optional(v.number()),
    ingestRunId: v.optional(v.id("ingestionRuns")),
  })
    .index("by_youtubeId", ["youtubeId"])
    .index("by_enrichmentStatus", ["enrichmentStatus"])
    .index("by_artistId", ["artistId"])
    .index("by_isAvailable", ["isAvailable"])
    .searchIndex("search_text", {
      searchField: "searchableText",
    }),

  // ═══════════════════════════════════════════════════════════════
  // CLASSIFICATIONS — 1:many with videos. Versioned.
  //
  // Reclassification adds new rows, never overwrites.
  // Use getLatestClassification() helper to query.
  // ═══════════════════════════════════════════════════════════════
  classifications: defineTable({
    videoId: v.id("videos"),
    primaryGenre: v.string(),
    subGenres: v.array(v.string()),
    moods: v.array(v.string()),
    era: v.string(),
    instrumentation: v.array(v.string()),
    language: v.string(),
    region: v.string(),
    vibeTags: v.array(v.string()),
    confidence: v.number(),
    groundingUsed: v.boolean(),

    // Versioning
    provider: v.string(),
    modelVersion: v.string(),
    promptVersion: v.string(),
    classifiedAt: v.number(),
  })
    .index("by_videoId", ["videoId"])
    .index("by_videoId_classifiedAt", ["videoId", "classifiedAt"])
    .index("by_primaryGenre", ["primaryGenre"])
    .index("by_confidence", ["confidence"]),

  // ═══════════════════════════════════════════════════════════════
  // ARTISTS — Deduped by normalizedName. Per-video enrichment
  // links to existing artist rows.
  // ═══════════════════════════════════════════════════════════════
  artists: defineTable({
    name: v.string(),
    normalizedName: v.string(),

    // External IDs (cached from enrichment)
    spotifyId: v.optional(v.string()),
    discogsId: v.optional(v.number()),
    musicbrainzId: v.optional(v.string()),
    appleMusicId: v.optional(v.string()),

    // Spotify data
    spotifyGenres: v.optional(v.array(v.string())),
    spotifyPopularity: v.optional(v.number()),
    spotifyImageUrl: v.optional(v.string()),

    // Discogs data
    discogsStyles: v.optional(v.array(v.string())),
    discogsCountry: v.optional(v.string()),
    discogsYearsActive: v.optional(v.string()),

    // MusicBrainz data
    musicbrainzTags: v.optional(v.array(v.string())),
    musicbrainzCountry: v.optional(v.string()),
    musicbrainzBeginDate: v.optional(v.string()),

    // Enrichment state
    enrichmentStatus: v.union(
      v.literal("pending"),
      v.literal("partial"),
      v.literal("complete")
    ),
  })
    .index("by_normalizedName", ["normalizedName"])
    .index("by_enrichmentStatus", ["enrichmentStatus"]),

  // ═══════════════════════════════════════════════════════════════
  // ARTIST EDITORIAL — Claude Sonnet synthesized blurbs.
  // Per artist. Versioned like classifications.
  // ═══════════════════════════════════════════════════════════════
  artistEditorial: defineTable({
    artistId: v.id("artists"),
    editorial: v.string(),
    sonicDNA: v.array(v.string()),
    ifYouLike: v.array(
      v.object({
        artistName: v.string(),
        reason: v.string(),
      })
    ),
    trivia: v.array(v.string()),
    discographyPicks: v.array(
      v.object({
        title: v.string(),
        year: v.number(),
        label: v.string(),
        why: v.string(),
      })
    ),

    // Versioning
    provider: v.string(),
    modelVersion: v.string(),
    promptVersion: v.string(),
    synthesizedAt: v.number(),
  }).index("by_artistId", ["artistId"]),

  // ═══════════════════════════════════════════════════════════════
  // CHANNELS — Saved filters. The Channel Surfer primitive.
  // Built-in channels have human-readable slugs.
  // User channels get nanoid slugs.
  // ═══════════════════════════════════════════════════════════════
  channels: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    isBuiltIn: v.boolean(),

    // Filter definition (the saved query)
    filters: v.object({
      primaryGenres: v.optional(v.array(v.string())),
      moods: v.optional(v.array(v.string())),
      eras: v.optional(v.array(v.string())),
      regions: v.optional(v.array(v.string())),
      vibeTags: v.optional(v.array(v.string())),
    }),

    // Ownership
    userId: v.optional(v.string()),
    isPublic: v.boolean(),

    // Channel ordering (for built-in channels)
    sortOrder: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_userId", ["userId"])
    .index("by_isBuiltIn", ["isBuiltIn"]),

  // ═══════════════════════════════════════════════════════════════
  // PLAYLISTS — Hand-curated ordered lists. User-owned.
  // ═══════════════════════════════════════════════════════════════
  playlists: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
    isPublic: v.boolean(),
    videoIds: v.array(v.id("videos")),
  })
    .index("by_slug", ["slug"])
    .index("by_userId", ["userId"]),

  // ═══════════════════════════════════════════════════════════════
  // FAVORITES — User heart video.
  // ═══════════════════════════════════════════════════════════════
  favorites: defineTable({
    userId: v.string(),
    videoId: v.id("videos"),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_videoId", ["userId", "videoId"]),

  // ═══════════════════════════════════════════════════════════════
  // WATCH HISTORY — User video watch tracking.
  // ═══════════════════════════════════════════════════════════════
  watchHistory: defineTable({
    userId: v.string(),
    videoId: v.id("videos"),
    watchedAt: v.number(),
    completionPct: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_watchedAt", ["userId", "watchedAt"]),

  // ═══════════════════════════════════════════════════════════════
  // FEATURED — Daily Vid of the Day rotation. Written by cron.
  // ═══════════════════════════════════════════════════════════════
  featured: defineTable({
    videoId: v.id("videos"),
    date: v.string(),
    isOverride: v.boolean(),
  }).index("by_date", ["date"]),

  // ═══════════════════════════════════════════════════════════════
  // YEAR CONTEXT — Per-year editorial for Rewind Timeline (v1).
  // ~17 rows, one-time Claude-generated.
  // ═══════════════════════════════════════════════════════════════
  yearContext: defineTable({
    year: v.number(),
    caption: v.string(),
    bullets: v.array(v.string()),
    accentColor: v.string(),
  }).index("by_year", ["year"]),

  // ═══════════════════════════════════════════════════════════════
  // INGESTION RUNS — Ops log for debugging.
  // ═══════════════════════════════════════════════════════════════
  ingestionRuns: defineTable({
    type: v.union(v.literal("backfill"), v.literal("incremental")),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    videosFound: v.optional(v.number()),
    videosInserted: v.optional(v.number()),
    videosSkipped: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_status", ["status"]),
});
