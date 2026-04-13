"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface FilterBarProps {
  selectedGenre: string | null;
  onGenreChange: (genre: string | null) => void;
  onSurpriseMe: () => void;
}

export function FilterBar({
  selectedGenre,
  onGenreChange,
  onSurpriseMe,
}: FilterBarProps) {
  const genres = useQuery(api.queries.getAvailableGenres);

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      {/* Genre filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-sans font-bold uppercase tracking-widest text-text-tertiary">
          Channel
        </label>
        <select
          value={selectedGenre ?? ""}
          onChange={(e) =>
            onGenreChange(e.target.value === "" ? null : e.target.value)
          }
          className="bg-bg-surface border-[3px] border-border text-text-primary font-sans text-sm px-3 py-2 min-w-[180px] focus:outline-none focus:ring-[3px] focus:ring-accent-yellow focus:ring-offset-2 focus:ring-offset-bg appearance-none cursor-pointer"
        >
          <option value="">ALL</option>
          {genres?.map(({ genre, count }) => (
            <option key={genre} value={genre}>
              {genre.toUpperCase()} ({count})
            </option>
          ))}
        </select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* SURPRISE ME button (CEO cherry-pick #6) */}
      <button
        onClick={onSurpriseMe}
        className="font-display text-sm bg-accent-yellow text-bg border-[3px] border-border shadow-[6px_6px_0_0_theme(colors.border)] px-5 py-2 uppercase tracking-wider transition-all duration-75 active:translate-x-[6px] active:translate-y-[6px] active:shadow-none hover:bg-accent-yellow/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-cyan"
      >
        Surprise Me
      </button>
    </div>
  );
}
