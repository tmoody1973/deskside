"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GenreBadge } from "@/components/GenreBadge";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  LayoutGrid,
  X,
  Search,
  Info,
  Captions,
  Heart,
} from "lucide-react";
import { UserActions } from "@/components/UserActions";
import { LibraryOverlay } from "@/components/LibraryOverlay";
import { AboutModal } from "@/components/AboutModal";
import { KeyboardHints } from "@/components/KeyboardHints";

/**
 * Deskside — video-first interface.
 *
 * The full-screen player IS the app. You land on it.
 * Uses react-youtube for proper React lifecycle management.
 * Inspired by Yes Yes Y'all: https://yesyesyall.co
 */

export default function Home() {
  // ── State ──────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = not yet randomized
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Full audio after splash click
  const [splashDismissed, setSplashDismissed] = useState(false);
  const [showKeyHints, setShowKeyHints] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [channelBug, setChannelBug] = useState<string | null>(null);
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerReady, setPlayerReady] = useState(false);
  const [showTitleCard, setShowTitleCard] = useState(false); // starts false, splash first
  const [titleCardFading, setTitleCardFading] = useState(false);
  const [infoTab, setInfoTab] = useState<"artist" | "description">("artist");
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const hasRandomized = useRef(false);

  // ── Data ───────────────────────────────────────────────
  const gridVideos = useQuery(api.queries.getGridVideos, {
    genre: selectedGenre ?? undefined,
    limit: 200,
  });
  const genres = useQuery(api.queries.getAvailableGenres);
  const searchResults = useQuery(
    api.queries.searchVideos,
    searchQuery.length >= 2 ? { query: searchQuery, limit: 30 } : "skip"
  );

  const videos = gridVideos ?? [];
  const currentVideo = videos[currentIndex];

  // Full video details for info overlay (includes description + editorial)
  const videoDetails = useQuery(
    api.queries.getVideoDetails,
    currentVideo ? { youtubeId: currentVideo.youtubeId } : "skip"
  );
  const containerId = "yt-main-player";

  // ── Random start: pick a random video on first data load ──
  useEffect(() => {
    if (videos.length > 0 && !hasRandomized.current) {
      hasRandomized.current = true;
      setCurrentIndex(Math.floor(Math.random() * videos.length));
    }
  }, [videos.length]);

  // ── Splash screen: waits for user click (satisfies browser autoplay policy) ──
  const handleSplashEnter = useCallback(() => {
    setSplashFading(true);
    setTimeout(() => {
      setShowSplash(false);
      setSplashDismissed(true);
      setIsPlaying(true); // Start with full audio — the click satisfies autoplay policy
    }, 500);
  }, []);

  // ── Navigation (declared before player so player can reference handleNext) ──
  const handleNext = useCallback(() => {
    setCurrentIndex((i) => (videos.length ? (i + 1) % videos.length : 0));
  }, [videos.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => (videos.length ? (i - 1 + videos.length) % videos.length : 0));
  }, [videos.length]);

  // ── YouTube Player (react-player) ──────────────────────
  const playerRef = useRef<any>(null);
  const prevVideoId = useRef<string | null>(null);
  const currentVideoId = currentVideo?.youtubeId;

  // Title card: fires on video CHANGES only (not initial load)
  useEffect(() => {
    if (!currentVideoId) return;
    if (prevVideoId.current === null) {
      prevVideoId.current = currentVideoId;
      return; // First video — splash handles entrance
    }
    if (currentVideoId === prevVideoId.current) return;
    prevVideoId.current = currentVideoId;

    setShowTitleCard(true);
    setTitleCardFading(false);
    setIsPlaying(false); // Pause during title card

    const fadeTimer = setTimeout(() => setTitleCardFading(true), 2000);
    const hideTimer = setTimeout(() => {
      setShowTitleCard(false);
      setIsPlaying(true); // Resume playback after title card
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [currentVideoId]);

  // ── Player controls ────────────────────────────────────
  // react-player controls state directly via props (playing, muted)
  // so handlePlayPause just toggles isPlaying state
  const handlePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const handleShuffle = useCallback(() => {
    if (videos.length) setCurrentIndex(Math.floor(Math.random() * videos.length));
  }, [videos.length]);

  const selectVideo = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowGrid(false);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      setShowKeyHints(false); // Dismiss hints on any keypress
      if (showGrid && e.key !== "Escape") return;

      switch (e.key) {
        case "ArrowRight": case "l": e.preventDefault(); handleNext(); break;
        case "ArrowLeft": case "j": e.preventDefault(); handlePrev(); break;
        case " ": case "k": e.preventDefault(); handlePlayPause(); break;
        case "m": e.preventDefault(); handleMute(); break;
        case "s": e.preventDefault(); handleShuffle(); break;
        case "i": e.preventDefault(); setShowInfo((v) => !v); break;
        case "g": e.preventDefault(); setShowGrid((v) => !v); break;
        case "c": e.preventDefault(); setCaptionsOn((v) => !v); break;
        case "h": e.preventDefault(); setShowFilmstrip((v) => !v); break;
        case "f": e.preventDefault(); setShowLibrary((v) => !v); break;
        case "Escape":
          e.preventDefault();
          if (showInfo) setShowInfo(false);
          else if (showGrid) setShowGrid(false);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handlePrev, handlePlayPause, handleMute, handleShuffle, showGrid, showInfo]);

  // ── Loading / splash state ─────────────────────────────
  if (!currentVideo) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="text-center"
        >
          <div className="w-24 h-1 bg-accent-yellow mx-auto mb-8" />
          <h1 className="font-display text-5xl sm:text-7xl text-accent-yellow mb-4">
            DESKSIDE
          </h1>
          <p className="font-sans text-text-secondary text-lg tracking-wide max-w-md mx-auto px-8">
            1,400+ live concerts. Classified by genre, mood, and vibe.
            Flip through like a TV. Press play.
          </p>
          <div className="w-24 h-1 bg-accent-pink mx-auto mt-8" />
          <p className="text-text-tertiary font-mono text-xs mt-8 animate-pulse">
            TUNING...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg overflow-hidden">
      {/* ═══ FULL-SCREEN VIDEO ═══ */}
      {/* Only render after user clicks splash (satisfies browser autoplay policy) */}
      {currentVideoId && splashDismissed && (
        <div className="absolute inset-0 w-full h-full">
          <ReactPlayer
            ref={playerRef}
            src={`https://www.youtube.com/watch?v=${currentVideoId}`}
            playing={isPlaying}
            muted={isMuted}
            controls={false}
            width="100%"
            height="100%"
            style={{ position: "absolute", top: 0, left: 0 }}
            config={{
              youtube: {
                cc_load_policy: captionsOn ? 1 : 0,
                cc_lang_pref: "en",
              },
            } as any}
            onReady={() => {
              setPlayerReady(true);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleNext}
          />
        </div>
      )}

      {/* Cover YouTube's built-in title/info bar at the top */}
      <div className="absolute top-0 left-0 right-0 h-20 z-10 bg-gradient-to-b from-bg/80 to-transparent pointer-events-none" />

      {/* ═══ WELCOME SPLASH (first visit only) ═══ */}
      {/* Uses CSS opacity instead of AnimatePresence to avoid removeChild conflict with YouTube IFrame */}
      {showSplash && (
        <div
          className={`absolute inset-0 z-50 bg-bg flex flex-col items-center justify-center transition-opacity duration-500 ${
            splashFading ? "opacity-0" : "opacity-100"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
            className="text-center"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="h-1 bg-accent-yellow mx-auto mb-10"
            />
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
              className="font-display text-6xl sm:text-8xl lg:text-9xl text-text-primary mb-6"
            >
              DESKSIDE
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="font-sans text-text-secondary text-lg sm:text-xl tracking-wide max-w-lg mx-auto px-8"
            >
              1,400+ live concerts. Classified by genre, mood, and vibe.
              Flip through like a TV. Press play.
            </motion.p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="h-1 bg-accent-pink mx-auto mt-10"
            />
            {/* PRESS PLAY button — the click satisfies browser autoplay policy */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.8 }}
              onClick={handleSplashEnter}
              className="mt-12 px-8 py-3 border-[3px] border-accent-yellow text-accent-yellow font-display text-lg uppercase tracking-widest hover:bg-accent-yellow hover:text-bg transition-colors shadow-retro-yellow active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
            >
              <span className="flex items-center gap-3">
                <Play size={20} strokeWidth={2.5} />
                Press Play
              </span>
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* ═══ TITLE CARD INTERSTITIAL ═══ */}
      {/* Branded intro screen before each video. Like a TV channel bumper. */}
      {showTitleCard && currentVideo && (
        <div
          className={`absolute inset-0 z-40 bg-bg flex flex-col items-center justify-center transition-opacity duration-500 ${
            titleCardFading ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Accent line top */}
          <div className="w-24 h-1 bg-accent-yellow mb-8" />

          {/* Genre badge */}
          {currentVideo.primaryGenre && (
            <div className="mb-6">
              <GenreBadge genre={currentVideo.primaryGenre} />
            </div>
          )}

          {/* Artist name — huge, centered */}
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl text-text-primary text-center px-8 leading-tight">
            {currentVideo.artist?.toUpperCase()}
          </h1>

          {/* Song title if available */}
          {currentVideo.songTitle && (
            <p className="font-sans text-accent-cyan text-lg sm:text-xl mt-4 text-center px-8">
              {currentVideo.songTitle}
            </p>
          )}

          {/* Moods */}
          {currentVideo.moods && currentVideo.moods.length > 0 && (
            <div className="flex gap-3 mt-6">
              {currentVideo.moods.map((mood) => (
                <span
                  key={mood}
                  className="text-text-tertiary font-sans text-xs uppercase tracking-widest"
                >
                  {mood}
                </span>
              ))}
            </div>
          )}

          {/* Accent line bottom */}
          <div className="w-24 h-1 bg-accent-pink mt-8" />

          {/* DESKSIDE wordmark */}
          <p className="font-display text-sm text-text-tertiary mt-12 tracking-widest">
            DESKSIDE
          </p>
        </div>
      )}

      {/* ═══ BOTTOM BAR: TRANSPORT + FILMSTRIP ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-[rgba(10,10,15,0.85)] backdrop-blur-[16px] border-t border-border/20">
        {/* Filmstrip (scrollable thumbnails) — toggle with chevron */}
        {showFilmstrip && videos.length > 0 && (
          <div className="px-4 pt-3 pb-2 overflow-x-auto">
            <div className="flex gap-2" style={{ minWidth: "max-content" }}>
              {videos.map((video, i) => (
                <button
                  key={video.youtubeId}
                  onClick={() => selectVideo(i)}
                  className={`flex-shrink-0 w-32 group relative transition-all ${
                    i === currentIndex
                      ? "ring-2 ring-accent-yellow"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.artist ?? ""}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary font-sans truncate mt-1 px-0.5">
                    {video.artist}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transport controls */}
        <div className="flex items-center px-4 py-2 gap-4">
          {/* Left: grid toggle + channel selector (like Yes Yes Y'all) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="p-2.5 border-2 border-border/40 text-text-primary hover:text-accent-yellow hover:border-accent-yellow transition-colors"
              aria-label="Open grid"
            >
              <LayoutGrid size={18} strokeWidth={2.5} />
            </button>
            <select
              value={selectedGenre ?? ""}
              onChange={(e) => {
                const genre = e.target.value === "" ? null : e.target.value;
                setSelectedGenre(genre);
                setCurrentIndex(0);
                // Show channel bug
                const bugText = genre ? `CH · ${genre.toUpperCase()}` : "ALL CHANNELS";
                setChannelBug(bugText);
                setTimeout(() => setChannelBug(null), 3000);
              }}
              className="bg-bg-elevated border-2 border-border/40 text-text-primary font-sans text-xs uppercase tracking-wider px-3 py-2 cursor-pointer hover:border-accent-yellow transition-colors"
            >
              <option value="" className="bg-bg-elevated text-text-primary">ALL CHANNELS</option>
              {genres?.map(({ genre }) => (
                <option key={genre} value={genre} className="bg-bg-elevated text-text-primary">
                  {genre.toUpperCase()}
                </option>
              ))}
            </select>
            {/* Library button */}
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="p-2.5 border-2 border-border/40 text-text-primary hover:text-accent-pink hover:border-accent-pink transition-colors"
              aria-label="Your library"
              title="Favorites & Playlists"
            >
              <Heart size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Center: now playing + transport */}
          <div className="flex items-center gap-3 flex-1 justify-center">
            <div className="hidden sm:block min-w-0 max-w-[200px] mr-2">
              <p className="font-sans font-bold text-xs text-text-primary truncate">
                {currentVideo.artist}
              </p>
            </div>
            <button onClick={handlePrev} className="p-2 text-text-primary hover:text-accent-yellow transition-colors" aria-label="Previous">
              <SkipBack size={20} strokeWidth={2.5} />
            </button>
            <button onClick={handlePlayPause} className="p-2 text-text-primary hover:text-accent-yellow transition-colors" aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={24} strokeWidth={2.5} /> : <Play size={24} strokeWidth={2.5} />}
            </button>
            <button onClick={handleNext} className="p-2 text-text-primary hover:text-accent-yellow transition-colors" aria-label="Next">
              <SkipForward size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Right: shuffle, mute, info */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleShuffle} className="p-2 text-text-secondary hover:text-accent-yellow transition-colors" aria-label="Shuffle">
              <Shuffle size={16} strokeWidth={2.5} />
            </button>
            <button onClick={handleMute} className="p-2 text-text-secondary hover:text-accent-yellow transition-colors" aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX size={16} strokeWidth={2.5} /> : <Volume2 size={16} strokeWidth={2.5} />}
            </button>
            <button
              onClick={() => setShowFilmstrip((f) => !f)}
              className={`p-2 transition-colors ${showFilmstrip ? "text-accent-yellow" : "text-text-secondary hover:text-accent-yellow"}`}
              aria-label={showFilmstrip ? "Hide filmstrip" : "Show filmstrip"}
              title={showFilmstrip ? "Hide thumbnails" : "Show thumbnails"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {showFilmstrip ? (
                  <polyline points="6 9 12 15 18 9" />
                ) : (
                  <polyline points="6 15 12 9 18 15" />
                )}
              </svg>
            </button>
            <button
              onClick={() => setCaptionsOn((c) => !c)}
              className={`p-2 transition-colors ${captionsOn ? "text-accent-yellow" : "text-text-secondary hover:text-accent-yellow"}`}
              aria-label={captionsOn ? "Captions off" : "Captions on"}
            >
              <Captions size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan hover:text-bg transition-colors text-xs font-sans font-bold uppercase tracking-wider"
              aria-label="Artist info"
            >
              <Info size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">Info</span>
            </button>
            {/* Auth: sign in, favorites, playlists */}
            <UserActions videoId={currentVideo?._id} />
            <button
              onClick={() => setShowAbout(true)}
              className="p-2 border-2 border-border/40 text-text-secondary hover:text-accent-yellow hover:border-accent-yellow transition-colors text-xs font-sans font-bold"
              aria-label="About Deskside"
              title="About Deskside"
            >
              ?
            </button>
          </div>
        </div>
      </div>

      {/* ═══ GRID OVERLAY (slides up with Framer Motion) ═══ */}
      <AnimatePresence>
      {showGrid && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "tween", duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-0 z-30 bg-bg/95 backdrop-blur-sm overflow-y-auto">
          {/* Grid header */}
          <div className="sticky top-0 z-10 bg-bg border-b-[3px] border-border">
            <div className="flex items-center justify-between px-6 py-4">
              <h1 className="font-display text-2xl text-text-primary">
                DESKSIDE
              </h1>

              {/* Search */}
              <div className="relative flex-1 max-w-md mx-8">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                  size={16}
                  strokeWidth={2.5}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="FIND AN ARTIST, A SONG, A VIBE..."
                  className="w-full bg-bg-surface border-[3px] border-border text-text-primary font-sans text-xs uppercase tracking-wider pl-9 pr-4 py-2 placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-accent-yellow"
                />
              </div>

              <button
                onClick={() => setShowGrid(false)}
                className="p-2 text-text-primary hover:text-accent-yellow transition-colors"
                aria-label="Close grid"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-4 px-6 pb-4">
              <select
                value={selectedGenre ?? ""}
                onChange={(e) => {
                  setSelectedGenre(e.target.value === "" ? null : e.target.value);
                  setCurrentIndex(0);
                }}
                className="bg-bg-surface border-[3px] border-border text-text-primary font-sans text-sm px-3 py-2 min-w-[180px] appearance-none cursor-pointer"
              >
                <option value="">ALL</option>
                {genres?.map(({ genre, count }) => (
                  <option key={genre} value={genre}>
                    {genre.toUpperCase()} ({count})
                  </option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                onClick={() => {
                  handleShuffle();
                  setShowGrid(false);
                }}
                className="font-display text-sm bg-accent-yellow text-bg border-[3px] border-border shadow-[6px_6px_0_0_theme(colors.border)] px-5 py-2 uppercase tracking-wider transition-all duration-75 active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
              >
                Surprise Me
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="px-6 py-6">
            {searchQuery.length >= 2 && searchResults ? (
              <>
                <p className="font-display text-lg text-text-primary mb-4">
                  {searchResults.length} RESULTS FOR &ldquo;{searchQuery.toUpperCase()}&rdquo;
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {searchResults.map((video) => {
                    const idx = videos.findIndex((v) => v.youtubeId === video.youtubeId);
                    return (
                      <GridTile
                        key={video.youtubeId}
                        thumbnailUrl={video.thumbnailUrl}
                        artist={video.artist ?? "Unknown"}
                        primaryGenre={video.primaryGenre}
                        isActive={idx === currentIndex}
                        onClick={() => {
                          if (idx >= 0) selectVideo(idx);
                        }}
                      />
                    );
                  })}
                </div>
              </>
            ) : videos.length === 0 ? (
              <div className="border-[3px] border-border border-dashed p-12 text-center">
                <p className="font-display text-xl text-text-secondary">
                  NO CONCERTS MATCH THOSE FILTERS. DROP ONE.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {videos.map((video, i) => (
                  <GridTile
                    key={video.youtubeId}
                    thumbnailUrl={video.thumbnailUrl}
                    artist={video.artist ?? "Unknown"}
                    primaryGenre={video.primaryGenre ?? "pending"}
                    isActive={i === currentIndex}
                    onClick={() => selectVideo(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ═══ LIBRARY OVERLAY ═══ */}
      <AnimatePresence>
        {showLibrary && (
          <LibraryOverlay
            onClose={() => setShowLibrary(false)}
            onSelectVideo={(idx) => {
              setCurrentIndex(idx);
              setShowLibrary(false);
            }}
            gridVideos={videos}
          />
        )}
      </AnimatePresence>

      {/* ═══ CHANNEL BUG (appears on channel switch) ═══ */}
      <AnimatePresence>
        {channelBug && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-4 z-20 px-4 py-2 bg-[rgba(10,10,15,0.8)] backdrop-blur-sm border-2 border-accent-yellow"
          >
            <span className="font-sans font-bold text-sm text-accent-yellow uppercase tracking-widest">
              {channelBug}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ KEYBOARD HINTS ═══ */}
      <KeyboardHints visible={showKeyHints && splashDismissed && !showGrid && !showInfo} />

      {/* ═══ ABOUT MODAL ═══ */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />


      {/* ═══ INFO OVERLAY (slides from right) ═══ */}
      <AnimatePresence>
      {showInfo && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute top-0 right-0 bottom-0 w-[440px] max-w-[90vw] bg-bg-elevated border-l-[3px] border-border shadow-retro-cyan z-30 p-8 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={() => setShowInfo(false)}
            className="absolute top-4 right-4 text-text-primary hover:text-accent-yellow transition-colors"
            aria-label="Close info"
          >
            <X size={20} strokeWidth={2.5} />
          </button>

          {/* Artist name + thumbnail */}
          {videoDetails?.spotifyImageUrl && (
            <div className="relative w-full aspect-square max-h-[200px] overflow-hidden mt-2 mb-4">
              <Image
                src={videoDetails.spotifyImageUrl}
                alt={currentVideo.artist ?? ""}
                fill
                sizes="400px"
                className="object-cover"
              />
            </div>
          )}
          <h2 className="font-display text-3xl text-text-primary mb-1">
            {currentVideo.artist}
          </h2>
          {(videoDetails?.musicbrainzCountry || videoDetails?.discogsCountry) && (
            <p className="font-sans text-text-tertiary text-xs uppercase tracking-widest mb-4">
              {videoDetails.discogsCountry || videoDetails.musicbrainzCountry}
              {videoDetails.musicbrainzBeginDate && ` · est. ${videoDetails.musicbrainzBeginDate.slice(0, 4)}`}
            </p>
          )}
          <div className="h-[3px] bg-accent-yellow w-16 mb-6" />

          {/* Tabs */}
          <div className="flex gap-0 border-b border-border-dim mb-6">
            <button
              onClick={() => setInfoTab("artist")}
              className={`font-sans font-bold text-xs uppercase tracking-widest px-4 py-2 transition-colors ${
                infoTab === "artist"
                  ? "text-text-primary border-b-2 border-accent-yellow"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Artist
            </button>
            <button
              onClick={() => setInfoTab("description")}
              className={`font-sans font-bold text-xs uppercase tracking-widest px-4 py-2 transition-colors ${
                infoTab === "description"
                  ? "text-text-primary border-b-2 border-accent-yellow"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Video Description
            </button>
          </div>

          {/* Tab content */}
          {infoTab === "artist" ? (
            <div>
              {/* Editorial blurb */}
              {videoDetails?.editorial ? (
                <p className="font-sans text-text-secondary text-sm leading-relaxed mb-6 whitespace-pre-line">
                  {videoDetails.editorial}
                </p>
              ) : (
                <div className="mb-6">
                  {/* Fallback: show classification data while editorial synth runs */}
                  {currentVideo.primaryGenre && (
                    <p className="font-sans text-text-secondary text-sm mb-2">
                      {currentVideo.artist} performs {currentVideo.primaryGenre}
                      {currentVideo.moods && currentVideo.moods.length > 0 && (
                        <span> with a {currentVideo.moods.join(", ")} energy</span>
                      )}.
                    </p>
                  )}
                  <p className="font-sans text-text-tertiary text-xs italic">
                    Full liner notes arriving soon.
                  </p>
                </div>
              )}

              {/* Genre + moods */}
              <div className="flex flex-wrap gap-2 mb-6">
                {currentVideo.primaryGenre && (
                  <GenreBadge genre={currentVideo.primaryGenre} />
                )}
                {currentVideo.moods?.map((mood) => (
                  <span
                    key={mood}
                    className="px-3 py-1 text-xs font-bold uppercase tracking-widest bg-accent-cyan text-bg border border-border"
                  >
                    {mood}
                  </span>
                ))}
              </div>

              {/* Sonic DNA */}
              {videoDetails?.sonicDNA && videoDetails.sonicDNA.length > 0 && (
                <div className="mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-accent-yellow">
                    Sonic DNA
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {videoDetails.sonicDNA.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs font-sans text-text-secondary border border-border-dim">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* If You Like This */}
              {videoDetails?.ifYouLike && videoDetails.ifYouLike.length > 0 && (
                <div className="mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-accent-pink">
                    If You Like This
                  </span>
                  <div className="mt-2 space-y-2">
                    {videoDetails.ifYouLike.map((rec) => (
                      <div key={rec.artistName}>
                        <p className="font-display text-sm text-text-primary">{rec.artistName}</p>
                        <p className="font-sans text-xs text-text-tertiary">{rec.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discography Picks */}
              {videoDetails?.discographyPicks && videoDetails.discographyPicks.length > 0 && (
                <div className="mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-accent-cyan">
                    Discography Picks
                  </span>
                  <div className="mt-2 space-y-2">
                    {videoDetails.discographyPicks.map((pick) => (
                      <div key={pick.title}>
                        <p className="font-sans font-bold text-sm text-text-primary">
                          {pick.title} ({pick.year})
                        </p>
                        <p className="font-sans text-xs text-text-tertiary">{pick.label}</p>
                        <p className="font-sans text-xs text-text-secondary italic">{pick.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vibe tags */}
              {currentVideo.vibeTags && currentVideo.vibeTags.length > 0 && (
                <div className="mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-accent-yellow">
                    Vibe
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentVideo.vibeTags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs font-sans text-text-secondary border border-border-dim">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              <p className="font-sans text-text-tertiary text-[10px] mt-8 uppercase tracking-widest">
                sources: musicbrainz · discogs · spotify
              </p>
            </div>
          ) : (
            /* Video Description tab */
            <div>
              <p className="font-sans text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                {videoDetails?.description || "No description available."}
              </p>
              {videoDetails?.publishedAt && (
                <p className="font-sans text-text-tertiary text-xs mt-6">
                  Published {new Date(videoDetails.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

// ── Grid tile component ─────────────────────────────────
function GridTile({
  thumbnailUrl,
  artist,
  primaryGenre,
  isActive,
  onClick,
}: {
  thumbnailUrl: string;
  artist: string;
  primaryGenre: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left border-[3px] bg-bg-surface transition-all duration-200 ease-retro hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-retro-lg ${
        isActive
          ? "border-accent-yellow shadow-retro-yellow"
          : "border-border shadow-retro"
      }`}
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={thumbnailUrl}
          alt={`${artist} concert`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
        />
        <div className="absolute bottom-2 left-2">
          <GenreBadge genre={primaryGenre} />
        </div>
      </div>
      <div className="p-3">
        <p className="font-sans font-bold text-text-primary text-sm truncate">
          {artist}
        </p>
      </div>
    </button>
  );
}
