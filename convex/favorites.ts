import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// FAVORITES — User heart video. Toggle on/off.
// ═══════════════════════════════════════════════════════════════

export const toggle = mutation({
  args: { userId: v.string(), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_userId_videoId", (q) =>
        q.eq("userId", args.userId).eq("videoId", args.videoId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { favorited: false };
    }

    await ctx.db.insert("favorites", {
      userId: args.userId,
      videoId: args.videoId,
    });
    return { favorited: true };
  },
});

export const isFavorited = query({
  args: { userId: v.string(), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_userId_videoId", (q) =>
        q.eq("userId", args.userId).eq("videoId", args.videoId)
      )
      .first();
    return !!existing;
  },
});

export const listUserFavorites = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const videos = [];
    for (const fav of favorites) {
      const video = await ctx.db.get(fav.videoId);
      if (!video) continue;

      const classification = await ctx.db
        .query("classifications")
        .withIndex("by_videoId_classifiedAt", (q) =>
          q.eq("videoId", video._id)
        )
        .order("desc")
        .first();

      videos.push({
        _id: video._id,
        youtubeId: video.youtubeId,
        artist: video.parsedArtist ?? video.rawTitle.split(":")[0]?.trim(),
        songTitle: video.parsedSongTitle ?? "",
        thumbnailUrl: video.thumbnailUrl,
        primaryGenre: classification?.primaryGenre ?? "pending",
      });
    }

    return videos;
  },
});
