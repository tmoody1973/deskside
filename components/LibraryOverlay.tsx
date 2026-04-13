"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GenreBadge } from "@/components/GenreBadge";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, Heart, Trash2, Share2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface LibraryOverlayProps {
  onClose: () => void;
  onSelectVideo: (index: number, videos: Array<{ youtubeId: string }>) => void;
  gridVideos: Array<{ youtubeId: string; _id: Id<"videos"> }>;
}

export function LibraryOverlay({
  onClose,
  onSelectVideo,
  gridVideos,
}: LibraryOverlayProps) {
  const { isSignedIn } = useUser();
  const [tab, setTab] = useState<"favorites" | "playlists">("favorites");

  const favorites = useQuery(
    api.favorites.listUserFavorites,
    isSignedIn ? {} : "skip"
  );
  const playlists = useQuery(
    api.playlists.listUserPlaylists,
    isSignedIn ? {} : "skip"
  );

  const removePlaylist = useMutation(api.playlists.remove);

  function handleVideoClick(youtubeId: string) {
    const idx = gridVideos.findIndex((v) => v.youtubeId === youtubeId);
    if (idx >= 0) {
      onSelectVideo(idx, gridVideos);
    }
    onClose();
  }

  function copyShareUrl(slug: string, type: "p" | "c") {
    const url = `${window.location.origin}/${type}/${slug}`;
    navigator.clipboard.writeText(url);
  }

  if (!isSignedIn) {
    return (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "tween", duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="absolute inset-0 z-30 bg-bg/95 backdrop-blur-sm flex items-center justify-center"
      >
        <div className="text-center">
          <p className="font-display text-xl text-text-secondary mb-4">
            SIGN IN TO SAVE FAVORITES AND PLAYLISTS
          </p>
          <button
            onClick={onClose}
            className="font-sans text-accent-cyan text-sm hover:underline"
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "tween", duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="absolute inset-0 z-30 bg-bg/95 backdrop-blur-sm overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg border-b-[3px] border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="font-display text-2xl text-text-primary">
            YOUR LIBRARY
          </h1>
          <button
            onClick={onClose}
            className="p-2 text-text-primary hover:text-accent-yellow transition-colors"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pb-0">
          <button
            onClick={() => setTab("favorites")}
            className={`px-4 py-2 font-sans font-bold text-xs uppercase tracking-widest transition-colors ${
              tab === "favorites"
                ? "text-text-primary border-b-2 border-accent-pink"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Heart size={14} strokeWidth={2.5} className="inline mr-1.5" />
            Favorites ({favorites?.length ?? 0})
          </button>
          <button
            onClick={() => setTab("playlists")}
            className={`px-4 py-2 font-sans font-bold text-xs uppercase tracking-widest transition-colors ${
              tab === "playlists"
                ? "text-text-primary border-b-2 border-accent-yellow"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Playlists ({playlists?.length ?? 0})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {tab === "favorites" ? (
          favorites && favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {favorites.map((video) => (
                <button
                  key={video.youtubeId}
                  onClick={() => handleVideoClick(video.youtubeId)}
                  className="text-left border-[3px] border-border shadow-retro bg-bg-surface transition-all duration-200 ease-retro hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-retro-lg"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.artist}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover"
                    />
                    <div className="absolute bottom-2 left-2">
                      <GenreBadge genre={video.primaryGenre} />
                    </div>
                    <Heart
                      size={16}
                      strokeWidth={2.5}
                      fill="currentColor"
                      className="absolute top-2 right-2 text-accent-pink"
                    />
                  </div>
                  <div className="p-3">
                    <p className="font-sans font-bold text-text-primary text-sm truncate">
                      {video.artist}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="border-[3px] border-border border-dashed p-12 text-center">
              <Heart size={32} strokeWidth={2.5} className="text-text-tertiary mx-auto mb-4" />
              <p className="font-display text-lg text-text-secondary">
                NO FAVORITES YET
              </p>
              <p className="font-sans text-text-tertiary text-sm mt-2">
                Click the heart icon while watching to save concerts here.
              </p>
            </div>
          )
        ) : (
          /* Playlists tab */
          playlists && playlists.length > 0 ? (
            <div className="space-y-4">
              {playlists.map((playlist) => (
                <div
                  key={playlist._id}
                  className="border-[3px] border-border bg-bg-surface p-4 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-sans font-bold text-text-primary text-sm">
                      {playlist.name}
                    </p>
                    <p className="font-sans text-text-tertiary text-xs mt-0.5">
                      {playlist.videoIds.length} concert{playlist.videoIds.length !== 1 ? "s" : ""}
                      {playlist.isPublic && " · public"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {playlist.isPublic && (
                      <button
                        onClick={() => copyShareUrl(playlist.slug, "p")}
                        className="p-2 text-text-secondary hover:text-accent-cyan transition-colors"
                        title="Copy share link"
                      >
                        <Share2 size={16} strokeWidth={2.5} />
                      </button>
                    )}
                    <a
                      href={`/p/${playlist.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-text-secondary hover:text-accent-yellow transition-colors"
                      title="Open playlist page"
                    >
                      <ExternalLink size={16} strokeWidth={2.5} />
                    </a>
                    <button
                      onClick={() => removePlaylist({ playlistId: playlist._id })}
                      className="p-2 text-text-secondary hover:text-accent-pink transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-[3px] border-border border-dashed p-12 text-center">
              <p className="font-display text-lg text-text-secondary">
                NO PLAYLISTS YET
              </p>
              <p className="font-sans text-text-tertiary text-sm mt-2">
                Click the + icon while watching to create a playlist.
              </p>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
