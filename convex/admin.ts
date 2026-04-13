import { mutation } from "./_generated/server";

// Full pipeline reset: all videos back to pending, delete all classifications
export const resetAllToPending = mutation({
  args: {},
  handler: async (ctx) => {
    // Reset all videos to pending
    const allVideos = await ctx.db.query("videos").collect();
    let reset = 0;
    for (const video of allVideos) {
      if (video.enrichmentStatus !== "pending") {
        await ctx.db.patch(video._id, {
          enrichmentStatus: "pending",
          parsedArtist: undefined,
          parsedFeaturedArtists: undefined,
          parsedSongTitle: undefined,
          parseConfidence: undefined,
          searchableText: undefined,
          artistId: undefined,
        });
        reset++;
      }
    }

    // Delete all classifications
    const allClassifications = await ctx.db
      .query("classifications")
      .collect();
    for (const c of allClassifications) {
      await ctx.db.delete(c._id);
    }

    return { videosReset: reset, classificationsDeleted: allClassifications.length };
  },
});

// Reset classified videos back to parsed for reclassification only
export const resetClassifiedToParsed = mutation({
  args: {},
  handler: async (ctx) => {
    const classified = await ctx.db
      .query("videos")
      .withIndex("by_enrichmentStatus", (q) =>
        q.eq("enrichmentStatus", "classified")
      )
      .collect();

    let reset = 0;
    for (const video of classified) {
      await ctx.db.patch(video._id, { enrichmentStatus: "parsed" });

      const oldClassifications = await ctx.db
        .query("classifications")
        .withIndex("by_videoId", (q) => q.eq("videoId", video._id))
        .collect();
      for (const c of oldClassifications) {
        await ctx.db.delete(c._id);
      }
      reset++;
    }

    return { reset };
  },
});
