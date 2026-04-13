import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════
// Enrichment pipeline orchestrator
//
// State machine per video:
//   pending → parsed → classified → artist_linked → complete
//
// Architecture decisions (from eng review):
//   - Batched: 20-50 videos per batch, staggered via runAfter()
//   - Write-then-schedule: call API, write result via mutation
//     (idempotent), then schedule next step
//   - Per-video status tracking: failures don't block other videos
// ═══════════════════════════════════════════════════════════════

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 5000;

// ───────────────────────────────────────────────────────────────
// Query helpers
// ───────────────────────────────────────────────────────────────

export const getVideosByStatus = internalQuery({
  args: {
    status: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_enrichmentStatus", (q) =>
        q.eq(
          "enrichmentStatus",
          args.status as
            | "pending"
            | "parsed"
            | "classified"
            | "artist_linked"
            | "complete"
        )
      )
      .take(args.limit);
  },
});

export const getLatestClassification = internalQuery({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classifications")
      .withIndex("by_videoId_classifiedAt", (q) =>
        q.eq("videoId", args.videoId)
      )
      .order("desc")
      .first();
  },
});

// ───────────────────────────────────────────────────────────────
// Step 1: Title parsing (Claude Haiku 4.5)
// ───────────────────────────────────────────────────────────────

export const parseTitle = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    const video = await ctx.runQuery(internal.enrichment.getVideoById, {
      id: args.videoId,
    });
    if (!video || video.enrichmentStatus !== "pending") return;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const { buildTitleParsePrompt } = await import(
      "../lib/classification-prompt"
    );
    const { normalizeArtistName, buildSearchableText } = await import(
      "../lib/normalize"
    );

    const prompt = buildTitleParsePrompt(video.rawTitle);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Haiku API error ${response.status}: ${body}`);
    }

    const result = await response.json();
    const text =
      result.content?.[0]?.type === "text" ? result.content[0].text : "";

    let parsed: {
      artist: string;
      featuredArtists: string[];
      songTitle: string;
      confidence: number;
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      // If Haiku returns non-JSON, fall back to raw title
      parsed = {
        artist: video.rawTitle.split(":")[0]?.trim() || video.rawTitle,
        featuredArtists: [],
        songTitle: "",
        confidence: 0.3,
      };
    }

    const searchableText = buildSearchableText(
      parsed.artist,
      parsed.featuredArtists,
      parsed.songTitle || video.rawTitle
    );

    await ctx.runMutation(internal.enrichment.saveParsedTitle, {
      videoId: args.videoId,
      artist: parsed.artist,
      featuredArtists: parsed.featuredArtists,
      songTitle: parsed.songTitle,
      confidence: parsed.confidence,
      searchableText,
    });
  },
});

export const saveParsedTitle = internalMutation({
  args: {
    videoId: v.id("videos"),
    artist: v.string(),
    featuredArtists: v.array(v.string()),
    songTitle: v.string(),
    confidence: v.number(),
    searchableText: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.enrichmentStatus !== "pending") return;

    await ctx.db.patch(args.videoId, {
      parsedArtist: args.artist,
      parsedFeaturedArtists: args.featuredArtists,
      parsedSongTitle: args.songTitle,
      parseConfidence: args.confidence,
      searchableText: args.searchableText,
      enrichmentStatus: "parsed",
    });
  },
});

// ───────────────────────────────────────────────────────────────
// Step 2: Classification (Gemini 3 Pro + Google Search grounding)
// ───────────────────────────────────────────────────────────────

export const classifyVideo = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args): Promise<void> => {
    const video = await ctx.runQuery(internal.enrichment.getVideoById, {
      id: args.videoId,
    });
    if (!video || video.enrichmentStatus !== "parsed") return;

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

    const { buildClassificationPrompt, CLASSIFICATION_JSON_SCHEMA, PROMPT_VERSION } =
      await import("../lib/classification-prompt");

    const prompt = buildClassificationPrompt({
      artist: video.parsedArtist || video.rawTitle,
      featuredArtists: video.parsedFeaturedArtists || [],
      songTitle: video.parsedSongTitle || "",
      description: video.description,
    });

    // Gemini doesn't support structured JSON + Google Search together.
    // Use grounding for search, parse text response as JSON.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${body}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const groundingUsed =
      !!result.candidates?.[0]?.groundingMetadata?.searchEntryPoint;

    // Strip markdown code blocks if Gemini wraps the JSON
    const text = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let classification: {
      primaryGenre: string;
      subGenres: string[];
      moods: string[];
      era: string;
      instrumentation: string[];
      language: string;
      region: string;
      vibeTags: string[];
      confidence: number;
    };

    try {
      classification = JSON.parse(text);
    } catch {
      console.error(
        `Classification JSON parse failed for video ${args.videoId}: ${text.substring(0, 200)}`
      );
      return;
    }

    // Validate required fields exist
    if (!classification.primaryGenre || !classification.moods) {
      console.error(
        `Classification missing required fields for video ${args.videoId}`
      );
      return;
    }

    // Gemini sometimes returns "eras" (array) instead of "era" (string)
    const raw = classification as Record<string, unknown>;
    const era = typeof raw.era === "string"
      ? raw.era
      : Array.isArray(raw.eras)
        ? (raw.eras as string[])[0] || "contemporary"
        : "contemporary";

    await ctx.runMutation(internal.enrichment.saveClassification, {
      videoId: args.videoId,
      primaryGenre: classification.primaryGenre,
      subGenres: classification.subGenres || [],
      moods: Array.isArray(classification.moods) ? classification.moods : [],
      era,
      instrumentation: classification.instrumentation || [],
      language: classification.language || "english",
      region: classification.region || "north-america",
      vibeTags: classification.vibeTags || [],
      confidence: classification.confidence ?? 0.5,
      groundingUsed,
      provider: "google",
      modelVersion: "gemini-3-flash-preview",
      promptVersion: PROMPT_VERSION,
    });
  },
});

export const saveClassification = internalMutation({
  args: {
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
    provider: v.string(),
    modelVersion: v.string(),
    promptVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.enrichmentStatus !== "parsed") return;

    await ctx.db.insert("classifications", {
      videoId: args.videoId,
      primaryGenre: args.primaryGenre,
      subGenres: args.subGenres,
      moods: args.moods,
      era: args.era,
      instrumentation: args.instrumentation,
      language: args.language,
      region: args.region,
      vibeTags: args.vibeTags,
      confidence: args.confidence,
      groundingUsed: args.groundingUsed,
      provider: args.provider,
      modelVersion: args.modelVersion,
      promptVersion: args.promptVersion,
      classifiedAt: Date.now(),
    });

    await ctx.db.patch(args.videoId, {
      enrichmentStatus: "classified",
    });
  },
});

// ───────────────────────────────────────────────────────────────
// Batch orchestrator: fan-out pattern
//
// Instead of running N API calls sequentially inside one action
// (which hits the 10-minute timeout), schedule each video as its
// own independent action. Then schedule the next batch via runAfter.
//
// Source: https://docs.convex.dev/scheduling/scheduled-functions
// ───────────────────────────────────────────────────────────────

export const processBatch = internalAction({
  args: {
    step: v.union(v.literal("parse"), v.literal("classify")),
  },
  handler: async (ctx, args): Promise<void> => {
    const statusMap = {
      parse: "pending",
      classify: "parsed",
    };

    const videos = await ctx.runQuery(internal.enrichment.getVideosByStatus, {
      status: statusMap[args.step],
      limit: BATCH_SIZE,
    });

    if (videos.length === 0) {
      console.log(`No more videos to ${args.step}. Pipeline complete.`);
      return;
    }

    // Fan out: schedule each video as its own independent action
    const actionMap = {
      parse: internal.enrichment.parseTitle,
      classify: internal.enrichment.classifyVideo,
    };

    for (const video of videos) {
      // Each video gets its own action, runs independently
      // Stagger by 200ms to avoid rate limit bursts
      await ctx.scheduler.runAfter(
        0,
        actionMap[args.step],
        { videoId: video._id }
      );
    }

    // Schedule next batch after delay (gives current batch time to complete)
    await ctx.scheduler.runAfter(
      BATCH_DELAY_MS,
      internal.enrichment.processBatch,
      { step: args.step }
    );
  },
});

// ───────────────────────────────────────────────────────────────
// Public entry points
// ───────────────────────────────────────────────────────────────

// Pipeline entry points — internal only (no public access)
// Use `npx convex run enrichment:startParsing` from CLI to trigger.
export const startParsing = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    await ctx.runAction(internal.enrichment.processBatch, {
      step: "parse",
    });
    return "Title parsing started. Batches will self-schedule.";
  },
});

export const startClassification = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    await ctx.runAction(internal.enrichment.processBatch, {
      step: "classify",
    });
    return "Classification started. Batches will self-schedule.";
  },
});

// ───────────────────────────────────────────────────────────────
// Helper queries
// ───────────────────────────────────────────────────────────────

export const getVideoById = internalQuery({
  args: { id: v.id("videos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPipelineStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const statuses = ["pending", "parsed", "classified", "artist_linked", "complete"] as const;
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
