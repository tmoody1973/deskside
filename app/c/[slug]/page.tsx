"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { VideoTile } from "@/components/VideoTile";
import Link from "next/link";

/**
 * Channel view — /c/[slug]
 *
 * Renders a filtered grid based on the channel's saved filters.
 * Works for both built-in (/c/hip-hop) and user channels (/c/aBcDeFgHiJ).
 * Unauthenticated users can view public channels (eng review: shareable URLs).
 */

export default function ChannelPage() {
  const params = useParams();
  const slug = params.slug as string;

  const channel = useQuery(api.channels.getBySlug, { slug });
  const gridVideos = useQuery(
    api.queries.getGridVideos,
    channel?.filters?.primaryGenres?.[0]
      ? { genre: channel.filters.primaryGenres[0], limit: 100 }
      : { limit: 100 }
  );

  if (channel === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-tertiary font-mono text-sm">
          TUNING...
        </div>
      </div>
    );
  }

  if (channel === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border-[3px] border-border border-dashed p-12 text-center">
          <p className="font-display text-xl text-text-secondary">
            CHANNEL NOT FOUND
          </p>
          <Link
            href="/"
            className="inline-block mt-4 font-sans text-accent-cyan text-sm hover:underline"
          >
            BACK TO GRID
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="h-[72px] border-b-[3px] border-border flex items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-text-primary hover:text-accent-yellow transition-colors"
        >
          DESKSIDE
        </Link>
      </header>

      <main className="max-w-[1760px] mx-auto px-6 py-8">
        {/* Channel header */}
        <section className="border-[3px] border-border p-8 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-sans font-bold text-xs text-accent-yellow uppercase tracking-widest">
              {channel.isBuiltIn ? "CHANNEL" : "CUSTOM CHANNEL"}
            </span>
          </div>
          <h1 className="font-display text-4xl text-text-primary">
            {channel.name.toUpperCase()}
          </h1>
          {channel.description && (
            <p className="font-sans text-text-secondary text-base mt-2">
              {channel.description}
            </p>
          )}
          <p className="font-sans text-text-tertiary text-xs mt-4">
            {gridVideos?.length ?? 0} concerts
          </p>
        </section>

        {/* Grid */}
        {gridVideos === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border-[3px] border-border bg-bg-surface animate-pulse"
              >
                <div className="aspect-video bg-bg-elevated" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-bg-elevated rounded w-3/4" />
                  <div className="h-3 bg-bg-elevated rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : gridVideos.length === 0 ? (
          <div className="border-[3px] border-border border-dashed p-12 text-center">
            <p className="font-display text-xl text-text-secondary">
              NO CONCERTS IN THIS CHANNEL YET.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {gridVideos.map((video) => (
              <VideoTile
                key={video.youtubeId}
                youtubeId={video.youtubeId}
                artist={video.artist ?? "Unknown Artist"}
                songTitle={video.songTitle ?? ""}
                thumbnailUrl={video.thumbnailUrl}
                primaryGenre={video.primaryGenre ?? "pending"}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
