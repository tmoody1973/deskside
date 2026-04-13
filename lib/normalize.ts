/**
 * Artist name normalization for dedup + search.
 *
 * Handles: punctuation stripping (.Paak → paak), "THE" prefix,
 * unicode/diacritics (Héloïse → heloise), case folding.
 *
 * Used in two places:
 * 1. artists.normalizedName — for dedup (same artist, different video titles)
 * 2. videos.searchableText — for search (user types "anderson paak", finds ".Paak")
 */

export function normalizeArtistName(name: string): string {
  return (
    name
      // Lowercase
      .toLowerCase()
      // Remove diacritics (é → e, ü → u, etc.)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Remove leading "the "
      .replace(/^the\s+/, "")
      // Remove punctuation except spaces and hyphens
      .replace(/[^a-z0-9\s-]/g, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function buildSearchableText(
  artist: string,
  featuredArtists: string[],
  songTitle: string
): string {
  const parts = [
    normalizeArtistName(artist),
    ...featuredArtists.map(normalizeArtistName),
    songTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  ];
  return parts.filter(Boolean).join(" ");
}
