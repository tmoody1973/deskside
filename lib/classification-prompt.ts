/**
 * Classification prompts + controlled vocabularies + JSON schema.
 *
 * Used by Gemini 3 Pro (with Google Search grounding) to classify
 * Tiny Desk Concert videos by genre, mood, era, instrumentation,
 * language, region, and vibe tags.
 *
 * Versioned: changes to this file require bumping PROMPT_VERSION
 * and re-running the 30-video regression suite before full catalog run.
 */

export const PROMPT_VERSION = "1.0.0";

// ═══════════════════════════════════════════════════════════════
// Controlled vocabularies
// ═══════════════════════════════════════════════════════════════

export const PRIMARY_GENRES = [
  "hip-hop",
  "r&b-soul",
  "jazz",
  "rock",
  "indie",
  "folk",
  "country",
  "pop",
  "electronic",
  "latin",
  "afrobeats",
  "reggae-dancehall",
  "classical",
  "gospel",
  "punk",
  "metal",
  "blues",
  "world",
  "experimental",
  "spoken-word",
  "k-pop",
  "amapiano",
] as const;

export const MOODS = [
  "chill",
  "energetic",
  "melancholy",
  "uplifting",
  "intimate",
  "anthemic",
  "groovy",
  "contemplative",
  "playful",
  "raw",
  "spiritual",
  "romantic",
  "aggressive",
  "dreamy",
  "funky",
  "tender",
] as const;

export const ERAS = [
  "classic",
  "90s",
  "2000s",
  "2010s-early",
  "2010s-late",
  "2020s",
  "contemporary",
] as const;

export const INSTRUMENTATION = [
  "live-band",
  "acoustic",
  "electronic-production",
  "orchestral",
  "a-cappella",
  "dj-turntables",
  "piano-keys",
  "guitar-driven",
  "bass-heavy",
  "horn-section",
  "percussion-forward",
  "strings",
  "voice-and-guitar",
  "full-ensemble",
  "minimal",
] as const;

export const REGIONS = [
  "north-america",
  "latin-america",
  "caribbean",
  "west-africa",
  "east-africa",
  "southern-africa",
  "western-europe",
  "eastern-europe",
  "middle-east",
  "south-asia",
  "east-asia",
  "southeast-asia",
  "oceania",
  "global",
] as const;

// ═══════════════════════════════════════════════════════════════
// JSON schema for Gemini structured output
// ═══════════════════════════════════════════════════════════════

export const CLASSIFICATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    primaryGenre: {
      type: "string",
      enum: PRIMARY_GENRES,
      description: "The single best-fit genre for this performance",
    },
    subGenres: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
      description: "Up to 3 secondary genre influences",
    },
    moods: {
      type: "array",
      items: { type: "string", enum: MOODS },
      minItems: 1,
      maxItems: 3,
      description: "1-3 mood descriptors for the performance",
    },
    era: {
      type: "string",
      enum: ERAS,
      description: "The musical era this performance most represents",
    },
    instrumentation: {
      type: "array",
      items: { type: "string", enum: INSTRUMENTATION },
      minItems: 1,
      maxItems: 4,
      description: "Primary instrumentation heard in the performance",
    },
    language: {
      type: "string",
      description: "Primary language sung (e.g., 'english', 'spanish', 'instrumental')",
    },
    region: {
      type: "string",
      enum: REGIONS,
      description: "Geographic/cultural origin of the artist",
    },
    vibeTags: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
      description:
        "Free-form vibe tags (e.g., 'late-night', 'summer-cookout', 'sunday-morning')",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "0-1 confidence score for this classification",
    },
  },
  required: [
    "primaryGenre",
    "subGenres",
    "moods",
    "era",
    "instrumentation",
    "language",
    "region",
    "vibeTags",
    "confidence",
  ],
} as const;

// ═══════════════════════════════════════════════════════════════
// Classification prompt
// ═══════════════════════════════════════════════════════════════

export function buildClassificationPrompt(input: {
  artist: string;
  featuredArtists: string[];
  songTitle: string;
  description: string;
}): string {
  const artistLine = input.featuredArtists.length
    ? `${input.artist} featuring ${input.featuredArtists.join(", ")}`
    : input.artist;

  return `You are a music librarian classifying a live concert performance for a browsing interface.

ARTIST: ${artistLine}
PERFORMANCE TITLE: ${input.songTitle}
DESCRIPTION: ${input.description}

Classify this performance using the following controlled vocabularies. Use Google Search grounding to look up the artist if you are not confident about their genre, origin, or style.

PRIMARY GENRES (pick exactly one): ${PRIMARY_GENRES.join(", ")}
MOODS (pick 1-3): ${MOODS.join(", ")}
ERAS: ${ERAS.join(", ")}
INSTRUMENTATION (pick 1-4): ${INSTRUMENTATION.join(", ")}
REGIONS: ${REGIONS.join(", ")}

For subGenres, use free-form but specific terms (e.g., "neo-soul", "trap", "bossa-nova", "shoegaze").
For vibeTags, use evocative free-form tags (e.g., "late-night", "summer-cookout", "sunday-morning", "road-trip").
For language, use the primary language sung. If instrumental, use "instrumental".

Set confidence to your certainty about the primaryGenre classification (0.0-1.0).
If the artist is obscure or you cannot find information, use the description and title to make your best guess and set confidence below 0.6.

Return valid JSON matching the schema. No markdown, no explanation, just JSON.`;
}

// ═══════════════════════════════════════════════════════════════
// Title parse prompt (Claude Haiku)
// ═══════════════════════════════════════════════════════════════

export function buildTitleParsePrompt(rawTitle: string): string {
  return `Extract the artist name, featured artists, and song/concert title from this YouTube video title.

TITLE: "${rawTitle}"

NPR Tiny Desk titles follow patterns like:
- "Anderson .Paak: Come Down | NPR Music Tiny Desk Concert"
- "Mac Miller: Tiny Desk (Home) Concert"
- "Lizzo: NPR Music Tiny Desk Concert"
- "Japanese Breakfast: Be Sweet | Tiny Desk Concert"
- "DaBaby feat. B.I.C.: Tiny Desk Concert"
- "Tiny Desk Contest 2019: Quinn Christopherson"

Rules:
- The artist name comes before the colon or "feat."/"ft."/"featuring"
- Remove "NPR Music", "Tiny Desk Concert", "Tiny Desk (Home) Concert", "Tiny Desk Contest YYYY:" prefixes
- Preserve exact artist name spelling including periods, capitalization, accents
- If there's a song title after a pipe "|" or colon, extract it. If not, leave songTitle empty.
- Featured artists go in featuredArtists array

Return JSON: {"artist": "string", "featuredArtists": ["string"], "songTitle": "string", "confidence": 0.0-1.0}
No markdown, no explanation, just JSON.`;
}
