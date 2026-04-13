import { action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const TINY_DESK_PLAYLIST_ID = "PL1B627337ED6F55F0";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;

// ═══════════════════════════════════════════════════════════════
// YouTube API helpers
// ═══════════════════════════════════════════════════════════════

interface YouTubePlaylistItem {
  snippet: {
    resourceId: { videoId: string };
    title: string;
    description: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
    publishedAt: string;
    position: number;
  };
  contentDetails?: {
    videoId: string;
  };
  status?: {
    privacyStatus: string;
  };
}

interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
  pageInfo: { totalResults: number };
}

async function fetchPlaylistPage(
  apiKey: string,
  playlistId: string,
  pageToken?: string
): Promise<YouTubePlaylistResponse> {
  const params = new URLSearchParams({
    part: "snippet,contentDetails,status",
    playlistId,
    maxResults: PAGE_SIZE.toString(),
    key: apiKey,
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// Backfill — one-time full playlist ingestion
//
// Fetches all videos from the NPR Tiny Desk playlist.
// Inserts each as a new row with enrichmentStatus: "pending".
// Skips videos that already exist (idempotent re-run).
//
// YouTube API quota: ~55 units for full 1,200-video playlist.
// ═══════════════════════════════════════════════════════════════

export const backfillPlaylist = action({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY not set. Run: npx convex env set YOUTUBE_API_KEY <key>");

    const runId = await ctx.runMutation(internal.ingest.createIngestionRun, {
      type: "backfill",
    });

    let pageToken: string | undefined;
    let totalFound = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    try {
      do {
        const page = await fetchPlaylistPage(
          apiKey,
          TINY_DESK_PLAYLIST_ID,
          pageToken
        );

        const items = page.items.filter(
          (item) => item.status?.privacyStatus !== "private"
        );

        totalFound += items.length;

        // Insert batch
        const result = await ctx.runMutation(internal.ingest.insertVideoBatch, {
          videos: items.map((item) => ({
            youtubeId: item.snippet.resourceId.videoId,
            rawTitle: item.snippet.title,
            description: item.snippet.description || "",
            thumbnailUrl:
              item.snippet.thumbnails.high?.url ||
              item.snippet.thumbnails.medium?.url ||
              item.snippet.thumbnails.default?.url ||
              "",
            publishedAt: item.snippet.publishedAt,
            playlistPosition: item.snippet.position,
            ingestRunId: runId,
          })),
        });

        totalInserted += result.inserted;
        totalSkipped += result.skipped;

        pageToken = page.nextPageToken;
      } while (pageToken);

      // Mark run complete
      await ctx.runMutation(internal.ingest.completeIngestionRun, {
        runId,
        videosFound: totalFound,
        videosInserted: totalInserted,
        videosSkipped: totalSkipped,
      });

      return { totalFound, totalInserted, totalSkipped };
    } catch (error) {
      await ctx.runMutation(internal.ingest.failIngestionRun, {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

// ═══════════════════════════════════════════════════════════════
// Incremental ingest — daily cron picks up new videos
// ═══════════════════════════════════════════════════════════════

export const incrementalIngest = internalAction({
  args: {},
  handler: async (ctx): Promise<{ videosFound: number; inserted: number; skipped: number }> => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY not set. Run: npx convex env set YOUTUBE_API_KEY <key>");

    const runId = await ctx.runMutation(internal.ingest.createIngestionRun, {
      type: "incremental",
    });

    try {
      // Fetch first page only (newest videos are at the front)
      const page = await fetchPlaylistPage(apiKey, TINY_DESK_PLAYLIST_ID);
      const items = page.items.filter(
        (item) => item.status?.privacyStatus !== "private"
      );

      const result = await ctx.runMutation(internal.ingest.insertVideoBatch, {
        videos: items.map((item) => ({
          youtubeId: item.snippet.resourceId.videoId,
          rawTitle: item.snippet.title,
          description: item.snippet.description || "",
          thumbnailUrl:
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.medium?.url ||
            item.snippet.thumbnails.default?.url ||
            "",
          publishedAt: item.snippet.publishedAt,
          playlistPosition: item.snippet.position,
          ingestRunId: runId,
        })),
      });

      await ctx.runMutation(internal.ingest.completeIngestionRun, {
        runId,
        videosFound: items.length,
        videosInserted: result.inserted,
        videosSkipped: result.skipped,
      });

      return {
        videosFound: items.length,
        inserted: result.inserted,
        skipped: result.skipped,
      };
    } catch (error) {
      await ctx.runMutation(internal.ingest.failIngestionRun, {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

// ═══════════════════════════════════════════════════════════════
// Internal mutations (called by actions above)
// ═══════════════════════════════════════════════════════════════

export const createIngestionRun = internalMutation({
  args: { type: v.union(v.literal("backfill"), v.literal("incremental")) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ingestionRuns", {
      type: args.type,
      status: "running",
      startedAt: Date.now(),
    });
  },
});

export const insertVideoBatch = internalMutation({
  args: {
    videos: v.array(
      v.object({
        youtubeId: v.string(),
        rawTitle: v.string(),
        description: v.string(),
        thumbnailUrl: v.string(),
        publishedAt: v.string(),
        playlistPosition: v.number(),
        ingestRunId: v.id("ingestionRuns"),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const video of args.videos) {
      // Idempotent: skip if video already exists
      const existing = await ctx.db
        .query("videos")
        .withIndex("by_youtubeId", (q) => q.eq("youtubeId", video.youtubeId))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("videos", {
        youtubeId: video.youtubeId,
        rawTitle: video.rawTitle,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: video.publishedAt,
        playlistPosition: video.playlistPosition,
        ingestRunId: video.ingestRunId,
        enrichmentStatus: "pending",
        isAvailable: true,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

export const completeIngestionRun = internalMutation({
  args: {
    runId: v.id("ingestionRuns"),
    videosFound: v.number(),
    videosInserted: v.number(),
    videosSkipped: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "completed",
      completedAt: Date.now(),
      videosFound: args.videosFound,
      videosInserted: args.videosInserted,
      videosSkipped: args.videosSkipped,
    });
  },
});

export const failIngestionRun = internalMutation({
  args: {
    runId: v.id("ingestionRuns"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "failed",
      completedAt: Date.now(),
      error: args.error,
    });
  },
});
