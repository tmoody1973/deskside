import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, getOptionalAuthUserId } from "./auth";

// ═══════════════════════════════════════════════════════════════
// CHANNELS — Saved filters as TV stations.
//
// Built-in channels have human-readable slugs (/c/hip-hop-essentials).
// User channels get nanoid slugs (/c/aBcDeFgHiJ).
// isBuiltIn flag + slug validation prevents collisions. (Eng review #5)
// ═══════════════════════════════════════════════════════════════

const RESERVED_SLUGS = [
  "hip-hop",
  "jazz",
  "rock",
  "indie",
  "folk",
  "country",
  "pop",
  "electronic",
  "latin",
  "afrobeats",
  "r-and-b-soul",
  "classical",
  "gospel",
  "world",
  "punk",
  "blues",
  "late-night",
  "new-this-month",
  "tariks-picks",
];

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const listBuiltIn = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_isBuiltIn", (q) => q.eq("isBuiltIn", true))
      .collect();
  },
});

export const listUserChannels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("channels")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    filters: v.object({
      primaryGenres: v.optional(v.array(v.string())),
      moods: v.optional(v.array(v.string())),
      eras: v.optional(v.array(v.string())),
      regions: v.optional(v.array(v.string())),
      vibeTags: v.optional(v.array(v.string())),
    }),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (RESERVED_SLUGS.includes(args.slug)) {
      throw new Error(`Slug "${args.slug}" is reserved for built-in channels`);
    }

    const existing = await ctx.db
      .query("channels")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      throw new Error(`Channel with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("channels", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      isBuiltIn: false,
      filters: args.filters,
      userId,
      isPublic: args.isPublic,
    });
  },
});

export const remove = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");
    if (channel.isBuiltIn) throw new Error("Cannot delete built-in channels");
    if (channel.userId !== userId) throw new Error("Not your channel");

    await ctx.db.delete(args.channelId);
  },
});

// Seed built-in channels from genre buckets
export const seedBuiltInChannels = mutation({
  args: {},
  handler: async (ctx) => {
    const builtIns = [
      { name: "Hip-Hop", slug: "hip-hop", genre: "hip-hop", order: 1 },
      { name: "Jazz", slug: "jazz", genre: "jazz", order: 2 },
      { name: "R&B / Soul", slug: "r-and-b-soul", genre: "r&b-soul", order: 3 },
      { name: "Rock", slug: "rock", genre: "rock", order: 4 },
      { name: "Indie", slug: "indie", genre: "indie", order: 5 },
      { name: "Folk", slug: "folk", genre: "folk", order: 6 },
      { name: "Latin", slug: "latin", genre: "latin", order: 7 },
      { name: "Pop", slug: "pop", genre: "pop", order: 8 },
      { name: "Electronic", slug: "electronic", genre: "electronic", order: 9 },
      { name: "World", slug: "world", genre: "world", order: 10 },
      { name: "Classical", slug: "classical", genre: "classical", order: 11 },
      { name: "Gospel", slug: "gospel", genre: "gospel", order: 12 },
    ];

    let created = 0;
    for (const ch of builtIns) {
      const existing = await ctx.db
        .query("channels")
        .withIndex("by_slug", (q) => q.eq("slug", ch.slug))
        .first();
      if (existing) continue;

      await ctx.db.insert("channels", {
        name: ch.name,
        slug: ch.slug,
        isBuiltIn: true,
        filters: { primaryGenres: [ch.genre] },
        isPublic: true,
        sortOrder: ch.order,
      });
      created++;
    }

    return { created };
  },
});
