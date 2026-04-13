import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// FEATURED — Vid of the Day. Daily rotation.
//
// The cron picks a random classified video each day.
// Admin can override with a specific video.
// ═══════════════════════════════════════════════════════════════

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const featured = await ctx.db
      .query("featured")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (!featured) return null;

    const video = await ctx.db.get(featured.videoId);
    if (!video) return null;

    const classification = await ctx.db
      .query("classifications")
      .withIndex("by_videoId_classifiedAt", (q) =>
        q.eq("videoId", video._id)
      )
      .order("desc")
      .first();

    return {
      _id: video._id,
      youtubeId: video.youtubeId,
      artist: video.parsedArtist ?? video.rawTitle.split(":")[0]?.trim() ?? "",
      songTitle: video.parsedSongTitle ?? "",
      thumbnailUrl: video.thumbnailUrl,
      primaryGenre: classification?.primaryGenre ?? "",
      moods: classification?.moods ?? [],
      isOverride: featured.isOverride,
    };
  },
});

// Daily rotation: pick a random video
export const rotateDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    // Don't overwrite an admin override
    const existing = await ctx.db
      .query("featured")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();
    if (existing?.isOverride) return;

    // Pick random from artist_linked videos
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_enrichmentStatus", (q) =>
        q.eq("enrichmentStatus", "artist_linked")
      )
      .collect();

    if (videos.length === 0) return;

    const random = videos[Math.floor(Math.random() * videos.length)];

    if (existing) {
      await ctx.db.patch(existing._id, {
        videoId: random._id,
        isOverride: false,
      });
    } else {
      await ctx.db.insert("featured", {
        videoId: random._id,
        date: today,
        isOverride: false,
      });
    }
  },
});

// Admin override
export const setOverride = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const existing = await ctx.db
      .query("featured")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        videoId: args.videoId,
        isOverride: true,
      });
    } else {
      await ctx.db.insert("featured", {
        videoId: args.videoId,
        date: today,
        isOverride: true,
      });
    }
  },
});
