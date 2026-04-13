"use client";

import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Heart, ListPlus } from "lucide-react";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { nanoid } from "nanoid";

interface UserActionsProps {
  videoId?: Id<"videos">;
}

export function UserActions({ videoId }: UserActionsProps) {
  const { isSignedIn } = useUser();
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Queries — auth derived server-side, no userId arg needed
  const isFavorited = useQuery(
    api.favorites.isFavorited,
    isSignedIn && videoId ? { videoId } : "skip"
  );
  const userPlaylists = useQuery(
    api.playlists.listUserPlaylists,
    isSignedIn ? {} : "skip"
  );

  const toggleFavorite = useMutation(api.favorites.toggle);
  const createPlaylist = useMutation(api.playlists.create);
  const addToPlaylist = useMutation(api.playlists.addVideo);

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-accent-pink/50 text-accent-pink hover:bg-accent-pink hover:text-bg transition-colors text-xs font-sans font-bold uppercase tracking-wider">
          Sign In
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Favorite toggle */}
      {videoId && (
        <button
          onClick={() => toggleFavorite({ videoId })}
          className={`p-2 transition-colors ${
            isFavorited
              ? "text-accent-pink"
              : "text-text-secondary hover:text-accent-pink"
          }`}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={18}
            strokeWidth={2.5}
            fill={isFavorited ? "currentColor" : "none"}
          />
        </button>
      )}

      {/* Add to playlist */}
      {videoId && (
        <div className="relative">
          <button
            onClick={() => setShowPlaylistPicker(!showPlaylistPicker)}
            className="p-2 text-text-secondary hover:text-accent-yellow transition-colors"
            aria-label="Add to playlist"
          >
            <ListPlus size={18} strokeWidth={2.5} />
          </button>

          {showPlaylistPicker && (
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-bg-elevated border-[3px] border-border shadow-retro p-3 z-50">
              <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-text-tertiary mb-2">
                Add to Playlist
              </p>
              {userPlaylists && userPlaylists.length > 0 && (
                <div className="space-y-1 mb-3">
                  {userPlaylists.map((pl) => (
                    <button
                      key={pl._id}
                      onClick={() => {
                        addToPlaylist({ playlistId: pl._id, videoId });
                        setShowPlaylistPicker(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm font-sans text-text-primary hover:bg-bg-surface transition-colors"
                    >
                      {pl.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-border-dim pt-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New playlist name..."
                  className="w-full bg-bg-surface border-2 border-border text-text-primary font-sans text-xs px-2 py-1.5 mb-2 placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-yellow"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPlaylistName.trim()) {
                      createPlaylist({
                        name: newPlaylistName.trim(),
                        slug: nanoid(10),
                        isPublic: true,
                      }).then((playlistId) => {
                        addToPlaylist({ playlistId, videoId });
                        setNewPlaylistName("");
                        setShowPlaylistPicker(false);
                      });
                    }
                    if (e.key === "Escape") {
                      setShowPlaylistPicker(false);
                    }
                  }}
                />
                <p className="text-[9px] text-text-tertiary">
                  Press Enter to create + add
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User avatar */}
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-7 h-7",
          },
        }}
      />
    </div>
  );
}
