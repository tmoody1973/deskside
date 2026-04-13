import { getGenreColor } from "@/lib/genre-colors";

export function GenreBadge({ genre }: { genre: string }) {
  const colorClasses = getGenreColor(genre);

  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-sans font-bold uppercase tracking-widest border border-border ${colorClasses}`}
    >
      {genre}
    </span>
  );
}
