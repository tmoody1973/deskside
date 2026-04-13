"use client";

import { useParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import ReactPlayer from "react-player";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  LayoutGrid,
} from "lucide-react";

/**
 * Channel view — /c/[slug]
 *
 * Standalone video-first player scoped to a channel's genre filter.
 * Works for built-in (/c/hip-hop) and user channels. No auth required.
 */

export default function ChannelPage() {
  const params = useParams();
  const slug = params.slug as string;

  const channel = useQuery(api.channels.getBySlug, { slug });
  const genre = channel?.filters?.primaryGenres?.[0];
  const gridVideos = useQuery(
    api.queries.getGridVideos,
    genre ? { genre, limit: 100 } : { limit: 100 }
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = useRef<any>(null);

  const videos = gridVideos ?? [];
  const currentVideo = videos[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => (videos.length ? (i + 1) % videos.length : 0));
  }, [videos.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => (videos.length ? (i - 1 + videos.length) % videos.length : 0));
  }, [videos.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case "ArrowRight": case "l": e.preventDefault(); handleNext(); break;
        case "ArrowLeft": case "j": e.preventDefault(); handlePrev(); break;
        case " ": case "k": e.preventDefault(); setIsPlaying((p) => !p); break;
        case "m": e.preventDefault(); setIsMuted((m) => !m); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handlePrev]);

  if (channel === undefined || gridVideos === undefined) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <div className="animate-pulse text-accent-yellow font-display text-2xl">TUNING...</div>
      </div>
    );
  }

  if (channel === null) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl text-text-secondary mb-4">CHANNEL NOT FOUND</p>
          <Link href="/" className="font-sans text-accent-cyan text-sm hover:underline">
            GO TO DESKSIDE
          </Link>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl text-accent-yellow mb-2">CH · {channel.name.toUpperCase()}</p>
          <p className="font-sans text-text-tertiary mb-4">No concerts in this channel yet.</p>
          <Link href="/" className="font-sans text-accent-cyan text-sm hover:underline">
            GO TO DESKSIDE
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg overflow-hidden">
      {/* Video */}
      <div className="absolute inset-0 w-full h-full">
        <ReactPlayer
          ref={playerRef}
          src={`https://www.youtube.com/watch?v=${currentVideo.youtubeId}`}
          playing={isPlaying}
          muted={isMuted}
          controls={false}
          width="100%"
          height="100%"
          style={{ position: "absolute", top: 0, left: 0 }}
          onReady={() => setIsPlaying(true)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleNext}
        />
      </div>

      <div className="absolute top-0 left-0 right-0 h-20 z-10 bg-gradient-to-b from-bg/80 to-transparent pointer-events-none" />

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-[rgba(10,10,15,0.85)] backdrop-blur-[16px] border-t border-border/20">
        {/* Filmstrip */}
        <div className="px-4 pt-3 pb-2 overflow-x-auto">
          <div className="flex gap-2" style={{ minWidth: "max-content" }}>
            {videos.map((video, i) => (
              <button
                key={video.youtubeId}
                onClick={() => setCurrentIndex(i)}
                className={`flex-shrink-0 w-32 transition-all ${
                  i === currentIndex ? "ring-2 ring-accent-yellow" : "opacity-70 hover:opacity-100"
                }`}
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image src={video.thumbnailUrl} alt={video.artist ?? ""} fill sizes="128px" className="object-cover" />
                </div>
                <p className="text-[10px] text-text-secondary font-sans truncate mt-1 px-0.5">{video.artist}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center px-4 py-2 gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/"
              className="p-2.5 border-2 border-border/40 text-text-primary hover:text-accent-yellow hover:border-accent-yellow transition-colors"
            >
              <LayoutGrid size={18} strokeWidth={2.5} />
            </Link>
            <div className="px-3 py-1.5 border-2 border-accent-yellow/50 text-accent-yellow text-xs font-sans font-bold uppercase tracking-wider">
              CH · {channel.name.toUpperCase()}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-center">
            <div className="hidden sm:block min-w-0 max-w-[200px] mr-2">
              <p className="font-sans font-bold text-xs text-text-primary truncate">{currentVideo.artist}</p>
            </div>
            <button onClick={handlePrev} className="p-2 text-text-primary hover:text-accent-yellow transition-colors">
              <SkipBack size={20} strokeWidth={2.5} />
            </button>
            <button onClick={() => setIsPlaying((p) => !p)} className="p-2 text-text-primary hover:text-accent-yellow transition-colors">
              {isPlaying ? <Pause size={24} strokeWidth={2.5} /> : <Play size={24} strokeWidth={2.5} />}
            </button>
            <button onClick={handleNext} className="p-2 text-text-primary hover:text-accent-yellow transition-colors">
              <SkipForward size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setIsMuted((m) => !m)} className="p-2 text-text-secondary hover:text-accent-yellow transition-colors">
              {isMuted ? <VolumeX size={16} strokeWidth={2.5} /> : <Volume2 size={16} strokeWidth={2.5} />}
            </button>
            <span className="text-text-tertiary font-mono text-xs ml-2">
              {currentIndex + 1} / {videos.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
