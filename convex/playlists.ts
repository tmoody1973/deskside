import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// PLAYLISTS — Hand-curated ordered lists. User-owned.
// Public playlists shareable at /p/[slug].
// ═══════════════════════════════════════════════════════════════

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const playlist = await ctx.db
      .query("playlists")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!playlist) return null;

    // Fetch video details for each video in the playlist
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
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playlists")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check duplicate slug
    const existing = await ctx.db
      .query("playlists")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error(`Playlist slug "${args.slug}" already exists`);

    return await ctx.db.insert("playlists", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      userId: args.userId,
      isPublic: args.isPublic,
      videoIds: [],
    });
  },
});

export const addVideo = mutation({
  args: {
    playlistId: v.id("playlists"),
    videoId: v.id("videos"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");
    if (playlist.userId !== args.userId) throw new Error("Not your playlist");

    // Don't add duplicates
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
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");
    if (playlist.userId !== args.userId) throw new Error("Not your playlist");

    await ctx.db.patch(args.playlistId, {
      videoIds: playlist.videoIds.filter((id) => id !== args.videoId),
    });
  },
});

export const remove = mutation({
  args: { playlistId: v.id("playlists"), userId: v.string() },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");
    if (playlist.userId !== args.userId) throw new Error("Not your playlist");

    await ctx.db.delete(args.playlistId);
  },
});
