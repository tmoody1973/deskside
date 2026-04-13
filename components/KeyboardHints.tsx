"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface KeyboardHintsProps {
  visible: boolean;
  onDismiss: () => void;
}

export function KeyboardHints({ visible, onDismiss }: KeyboardHintsProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="absolute bottom-24 right-4 z-20 bg-bg/80 backdrop-blur-sm border border-border-dim p-3 space-y-1"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-tertiary text-[10px] font-sans font-bold uppercase tracking-widest">
          Keyboard Shortcuts
        </p>
        <button
          onClick={onDismiss}
          className="text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
      {[
        ["Space", "Play / Pause"],
        ["← →", "Prev / Next"],
        ["G", "Open Grid"],
        ["I", "Artist Info"],
        ["F", "Your Library"],
        ["S", "Shuffle"],
        ["C", "Captions"],
        ["M", "Mute"],
      ].map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-accent-cyan text-bg font-bold min-w-[28px] text-center">
            {key}
          </span>
          <span className="text-text-tertiary text-[10px] font-sans">{label}</span>
        </div>
      ))}
    </motion.div>
  );
}
