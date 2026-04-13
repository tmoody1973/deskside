import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════
// Editorial synthesis — Claude writes crate-digger liner notes
//
// Per-artist. Uses all available data: classifications,
// Spotify genres, Discogs styles, MusicBrainz tags.
//
// Quality gate: run 5-artist sample first, Tarik reviews,
// then full catalog run.
// ═══════════════════════════════════════════════════════════════

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 5000;

// Get artists that need editorial synthesis
export const getArtistsNeedingEditorial = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const artists = await ctx.db
      .query("artists")
      .collect();

    // Filter to artists without editorial
    const needsEditorial = [];
    for (const artist of artists) {
      const existing = await ctx.db
        .query("artistEditorial")
        .withIndex("by_artistId", (q) => q.eq("artistId", artist._id))
        .first();

      if (!existing) {
        needsEditorial.push(artist);
      }

      if (needsEditorial.length >= args.limit) break;
    }

    return needsEditorial;
  },
});

// Get artist's Tiny Desk classifications
export const getArtistClassifications = internalQuery({
  args: { artistId: v.id("artists") },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_artistId", (q) => q.eq("artistId", args.artistId))
      .collect();

    const classifications = [];
    for (const video of videos) {
      const c = await ctx.db
        .query("classifications")
        .withIndex("by_videoId_classifiedAt", (q) =>
          q.eq("videoId", video._id)
        )
        .order("desc")
        .first();

      if (c) {
        classifications.push({
          primaryGenre: c.primaryGenre,
          moods: c.moods,
          vibeTags: c.vibeTags,
        });
      }
    }

    return { classifications, videoCount: videos.length };
  },
});

// Synthesize editorial for a single artist
export const synthesizeArtist = internalAction({
  args: { artistId: v.id("artists") },
  handler: async (ctx, args): Promise<void> => {
    const artist = await ctx.runQuery(internal.editorialSynth.getArtistById, {
      id: args.artistId,
    });
    if (!artist) return;

    // Check if already has editorial
    const existing = await ctx.runQuery(internal.editorialSynth.getExistingEditorial, {
      artistId: args.artistId,
    });
    if (existing) return; // Idempotent

    const { classifications, videoCount } = await ctx.runQuery(
      internal.editorialSynth.getArtistClassifications,
      { artistId: args.artistId }
    );

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const { buildEditorialPrompt, checkBannedWords, EDITORIAL_PROMPT_VERSION } =
      await import("../lib/editorialPrompt");

    const prompt = buildEditorialPrompt({
      artistName: artist.name,
      spotifyGenres: artist.spotifyGenres ?? undefined,
      discogsStyles: artist.discogsStyles ?? undefined,
      musicbrainzTags: artist.musicbrainzTags ?? undefined,
      country: artist.discogsCountry || artist.musicbrainzCountry || undefined,
      beginDate: artist.musicbrainzBeginDate ?? undefined,
      classifications,
      tinyDeskCount: videoCount,
    });

    // Use Claude Haiku for cost efficiency (Sonnet available as upgrade)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Claude API error ${response.status}: ${body}`);
    }

    const result = await response.json();
    const text = result.content?.[0]?.type === "text" ? result.content[0].text : "";

    // Strip markdown code blocks if present
    const cleanText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let editorial: {
      editorial: string;
      sonicDNA: string[];
      ifYouLike: Array<{ artistName: string; reason: string }>;
      trivia: string[];
      discographyPicks: Array<{ title: string; year: number; label: string; why: string }>;
    };

    try {
      editorial = JSON.parse(cleanText);
    } catch {
      console.error(`Editorial JSON parse failed for artist ${artist.name}: ${cleanText.substring(0, 200)}`);
      return;
    }

    // Check for banned words (P1 critical gap from eng review)
    const bannedFound = checkBannedWords(editorial.editorial);
    if (bannedFound.length > 0) {
      console.warn(`Banned words found in editorial for ${artist.name}: ${bannedFound.join(", ")}. Regenerating...`);

      // One retry with stricter prompt
      const retryResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: cleanText },
            {
              role: "user",
              content: `Your response contained banned words: ${bannedFound.join(", ")}. Rewrite the editorial WITHOUT any of these words: eclectic, seamless, curated, content, discover, mesmerizing, haunting, ethereal, tour-de-force, genre-bending. Return the full JSON again.`,
            },
          ],
        }),
      });

      if (retryResponse.ok) {
        const retryResult = await retryResponse.json();
        const retryText = retryResult.content?.[0]?.text || "";
        const retryClean = retryText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        try {
          editorial = JSON.parse(retryClean);
        } catch {
          // Use original despite banned words
        }
      }
    }

    // Save editorial
    await ctx.runMutation(internal.editorialSynth.saveEditorial, {
      artistId: args.artistId,
      editorial: editorial.editorial || "",
      sonicDNA: editorial.sonicDNA || [],
      ifYouLike: editorial.ifYouLike || [],
      trivia: editorial.trivia || [],
      discographyPicks: (editorial.discographyPicks || []).map((p) => ({
        title: p.title || "",
        year: p.year || 2020,
        label: p.label || "",
        why: p.why || "",
      })),
      provider: "anthropic",
      modelVersion: "claude-haiku-4-5-20251001",
      promptVersion: EDITORIAL_PROMPT_VERSION,
    });
  },
});

// ── Internal helpers ────────────────────────────────────

export const getArtistById = internalQuery({
  args: { id: v.id("artists") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getExistingEditorial = internalQuery({
  args: { artistId: v.id("artists") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artistEditorial")
      .withIndex("by_artistId", (q) => q.eq("artistId", args.artistId))
      .first();
  },
});

export const saveEditorial = internalMutation({
  args: {
    artistId: v.id("artists"),
    editorial: v.string(),
    sonicDNA: v.array(v.string()),
    ifYouLike: v.array(v.object({ artistName: v.string(), reason: v.string() })),
    trivia: v.array(v.string()),
    discographyPicks: v.array(
      v.object({ title: v.string(), year: v.number(), label: v.string(), why: v.string() })
    ),
    provider: v.string(),
    modelVersion: v.string(),
    promptVersion: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("artistEditorial", {
      artistId: args.artistId,
      editorial: args.editorial,
      sonicDNA: args.sonicDNA,
      ifYouLike: args.ifYouLike,
      trivia: args.trivia,
      discographyPicks: args.discographyPicks,
      provider: args.provider,
      modelVersion: args.modelVersion,
      promptVersion: args.promptVersion,
      synthesizedAt: Date.now(),
    });
  },
});

// ── Batch orchestrator (fan-out) ────────────────────────

export const processBatch = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const artists = await ctx.runQuery(
      internal.editorialSynth.getArtistsNeedingEditorial,
      { limit: BATCH_SIZE }
    );

    if (artists.length === 0) {
      console.log("Editorial synthesis complete. All artists have blurbs.");
      return;
    }

    for (const artist of artists) {
      await ctx.scheduler.runAfter(
        0,
        internal.editorialSynth.synthesizeArtist,
        { artistId: artist._id }
      );
    }

    await ctx.scheduler.runAfter(
      BATCH_DELAY_MS,
      internal.editorialSynth.processBatch,
      {}
    );
  },
});

// ── Public entry points ─────────────────────────────────

export const startSynthesis = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    await ctx.runAction(internal.editorialSynth.processBatch, {});
    return "Editorial synthesis started. Batches will self-schedule.";
  },
});

// Run 5-artist sample for quality gate
export const runSample = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const artists = await ctx.runQuery(
      internal.editorialSynth.getArtistsNeedingEditorial,
      { limit: 5 }
    );

    if (artists.length === 0) return "No artists need editorial synthesis.";

    for (const artist of artists) {
      await ctx.runAction(internal.editorialSynth.synthesizeArtist, {
        artistId: artist._id,
      });
    }

    return `Sample complete. Synthesized editorial for: ${artists.map((a) => a.name).join(", ")}`;
  },
});
