import { create } from "zustand";

/**
 * Zustand playback queue store.
 *
 * Global state for the player: current channel, play queue, index.
 * Needed so keyboard shortcuts work regardless of which component has focus.
 *
 * This is the ONLY Zustand store in the app. Everything else is Convex queries.
 */

interface PlaybackState {
  // Current video
  currentVideoId: string | null;
  currentArtist: string | null;
  currentTitle: string | null;

  // Queue (video IDs in play order)
  queue: string[];
  queueIndex: number;

  // Channel context
  channelName: string | null;
  channelSlug: string | null;

  // Player state
  isPlaying: boolean;
  isMuted: boolean;
  needsUnmute: boolean; // For shared URL autoplay (TAP FOR SOUND)

  // Actions
  setCurrentVideo: (videoId: string, artist: string, title: string) => void;
  setQueue: (queue: string[], index: number) => void;
  setChannel: (name: string, slug: string) => void;
  nextVideo: () => string | null;
  prevVideo: () => string | null;
  setPlaying: (playing: boolean) => void;
  setMuted: (muted: boolean) => void;
  setNeedsUnmute: (needs: boolean) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentVideoId: null,
  currentArtist: null,
  currentTitle: null,
  queue: [],
  queueIndex: 0,
  channelName: null,
  channelSlug: null,
  isPlaying: false,
  isMuted: false,
  needsUnmute: false,

  setCurrentVideo: (videoId, artist, title) =>
    set({ currentVideoId: videoId, currentArtist: artist, currentTitle: title }),

  setQueue: (queue, index) => set({ queue, queueIndex: index }),

  setChannel: (name, slug) => set({ channelName: name, channelSlug: slug }),

  nextVideo: () => {
    const { queue, queueIndex } = get();
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      set({ queueIndex: nextIndex, currentVideoId: queue[nextIndex] });
      return queue[nextIndex];
    }
    return null;
  },

  prevVideo: () => {
    const { queue, queueIndex } = get();
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      set({ queueIndex: prevIndex, currentVideoId: queue[prevIndex] });
      return queue[prevIndex];
    }
    return null;
  },

  setPlaying: (playing) => set({ isPlaying: playing }),
  setMuted: (muted) => set({ isMuted: muted }),
  setNeedsUnmute: (needs) => set({ needsUnmute: needs }),
}));
