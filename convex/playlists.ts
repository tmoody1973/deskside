import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, getOptionalAuthUserId } from "./auth";

// ═══════════════════════════════════════════════════════════════
// PLAYLISTS — Hand-curated ordered lists. User-owned.
// Auth: userId derived server-side, never from client args.
// ═══════════════════════════════════════════════════════════════

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const playlist = await ctx.db
      .query("playlists")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!playlist) return null;

    // Public playlists are viewable by anyone
    // Private playlists require auth check
    if (!playlist.isPublic) {
      const userId = await getOptionalAuthUserId(ctx);
      if (userId !== playlist.userId) return null;
    }

    const videos = [];
    for (const videoId of playlist.videoIds) {
      const video = await ctx.db.get(videoId);
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

    return { ...playlist, videos };
  },
});

export const listUserPlaylists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("playlists")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const existing = await ctx.db
      .query("playlists")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error(`Playlist slug "${args.slug}" already exists`);

    return await ctx.db.insert("playlists", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      userId,
      isPublic: args.isPublic,
      videoIds: [],
    });
  },
});

export const addVideo = mutation({
  args: {
    playlistId: v.id("playlists"),
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");
    if (playlist.userId !== userId) throw new Error("Not your playlist");

    if (playlist.videoIds.includes(args.videoId)) return;

    await ctx.db.patch(args.playlistId, {
      videoIds: [...playlist.videoIds, args.videoId],
    });
  },
});

export const removeVideo = mutation({
  args: {
    playlistId: v.id("playlists"),
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");
    if (playlist.userId !== userId) throw new Error("Not your playlist");

    await ctx.db.patch(args.playlistId, {
      videoIds: playlist.videoIds.filter((id) => id !== args.videoId),
    });
  },
});

export const remove = mutation({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");
    if (playlist.userId !== userId) throw new Error("Not your playlist");

    await ctx.db.delete(args.playlistId);
  },
});
