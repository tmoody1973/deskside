/**
 * Locked genre → accent color mapping.
 * CEO cherry-pick #5: subconscious genre recognition from badge color.
 *
 * Each primary genre maps to one of the four accent colors.
 * Users build genre recognition from color alone — the grid
 * becomes a heat map of vibes.
 */

export const GENRE_COLORS: Record<string, string> = {
  // Pink family
  "hip-hop": "bg-accent-pink text-bg",
  "r&b-soul": "bg-accent-pink/80 text-bg",
  "reggae-dancehall": "bg-accent-pink/60 text-bg",

  // Cyan family
  jazz: "bg-accent-cyan text-bg",
  electronic: "bg-accent-cyan/80 text-bg",
  classical: "bg-border text-bg",

  // Lime family
  folk: "bg-accent-lime text-bg",
  country: "bg-accent-lime/80 text-bg",
  gospel: "bg-accent-lime/60 text-bg",

  // Yellow family
  rock: "bg-accent-yellow text-bg",
  indie: "bg-accent-yellow/80 text-bg",
  punk: "bg-accent-yellow/60 text-bg",
  metal: "bg-accent-yellow/40 text-bg",
  blues: "bg-accent-yellow/70 text-bg",

  // Special
  latin: "bg-accent-pink text-bg",
  afrobeats: "bg-accent-cyan text-bg",
  pop: "bg-accent-lime text-bg",
  world: "bg-accent-cyan/70 text-bg",
  experimental: "bg-border-dim text-text-primary",
  "spoken-word": "bg-border-dim text-text-primary",
  "k-pop": "bg-accent-pink/70 text-bg",
  amapiano: "bg-accent-cyan/60 text-bg",
};

export function getGenreColor(genre: string): string {
  return (
    GENRE_COLORS[genre] || "bg-border-dim text-text-primary"
  );
}
