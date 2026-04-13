"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-elevated border-[3px] border-border shadow-retro p-8 max-w-lg w-full relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-primary hover:text-accent-yellow"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            <h2 className="font-display text-3xl text-text-primary mb-2">
              DESKSIDE
            </h2>
            <div className="h-[3px] bg-accent-yellow w-16 mb-6" />

            <div className="space-y-4 font-sans text-text-secondary text-sm leading-relaxed">
              <p>
                Deskside is a channel-surfing interface for live music concerts.
                1,400+ performances classified by genre, mood, era, and vibe using AI.
                Browse by channel, flip through like cable TV, read liner notes
                written in a crate-digger voice.
              </p>
              <p>
                Built by{" "}
                <span className="text-text-primary font-bold">Tarik Moody</span>,
                Director of Strategy and Innovation at Radio Milwaukee.
              </p>

              <div className="border-t border-border-dim pt-4 mt-4">
                <p className="text-text-tertiary text-xs">
                  Deskside is an unofficial fan project. It is not affiliated with,
                  endorsed by, or connected to NPR or the Tiny Desk Concert series.
                  All video content is embedded from YouTube via the official IFrame API
                  and is not downloaded or re-hosted. Artist data sourced from MusicBrainz,
                  Spotify, and Discogs.
                </p>
                <a
                  href="https://www.npr.org/series/tiny-desk-concerts/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-accent-cyan text-xs hover:underline"
                >
                  Visit NPR&apos;s official Tiny Desk Concert page →
                </a>
              </div>

              <div className="border-t border-border-dim pt-4">
                <p className="text-text-tertiary text-[10px] uppercase tracking-widest">
                  Keyboard Shortcuts
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                  {[
                    ["Space / K", "Play / Pause"],
                    ["← → / J L", "Prev / Next"],
                    ["G", "Open Grid"],
                    ["I", "Artist Info"],
                    ["F", "Your Library"],
                    ["S", "Shuffle"],
                    ["C", "Captions"],
                    ["M", "Mute"],
                    ["H", "Toggle Filmstrip"],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-accent-cyan font-mono text-[10px]">{key}</span>
                      <span className="text-text-tertiary text-[10px]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
