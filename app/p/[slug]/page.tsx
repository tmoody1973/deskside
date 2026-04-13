"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { VideoTile } from "@/components/VideoTile";
import Link from "next/link";

/**
 * Playlist view — /p/[slug]
 *
 * Renders a user's curated playlist. Public playlists are viewable
 * without auth. Shareable URL.
 */

export default function PlaylistPage() {
  const params = useParams();
  const slug = params.slug as string;

  const playlist = useQuery(api.playlists.getBySlug, { slug });

  if (playlist === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-tertiary font-mono text-sm">
          LOADING PLAYLIST...
        </div>
      </div>
    );
  }

  if (playlist === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border-[3px] border-border border-dashed p-12 text-center">
          <p className="font-display text-xl text-text-secondary">
            PLAYLIST NOT FOUND
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
        {/* Playlist header */}
        <section className="border-[3px] border-border p-8 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-sans font-bold text-xs text-accent-pink uppercase tracking-widest">
              PLAYLIST
            </span>
            {playlist.isPublic && (
              <span className="font-sans font-bold text-xs text-accent-lime uppercase tracking-widest">
                · PUBLIC
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl text-text-primary">
            {playlist.name.toUpperCase()}
          </h1>
          {playlist.description && (
            <p className="font-sans text-text-secondary text-base mt-2">
              {playlist.description}
            </p>
          )}
          <p className="font-sans text-text-tertiary text-xs mt-4">
            {playlist.videos.length} concerts
          </p>
        </section>

        {/* Grid */}
        {playlist.videos.length === 0 ? (
          <div className="border-[3px] border-border border-dashed p-12 text-center">
            <p className="font-display text-xl text-text-secondary">
              THIS PLAYLIST IS EMPTY.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {playlist.videos.map((video) => (
              <VideoTile
                key={video.youtubeId}
                youtubeId={video.youtubeId}
                artist={video.artist ?? "Unknown Artist"}
                songTitle={video.songTitle ?? ""}
                thumbnailUrl={video.thumbnailUrl}
                primaryGenre={video.primaryGenre}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
