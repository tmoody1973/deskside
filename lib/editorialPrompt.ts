/**
 * Editorial synthesis prompt for Claude.
 *
 * Generates crate-digger liner notes per artist using all available data:
 * classifications, Spotify genres, Discogs styles, MusicBrainz tags,
 * and the list of this artist's Tiny Desk concerts.
 *
 * Voice: record store clerk, not Wikipedia. Direct, opinionated, warm.
 *
 * BANNED WORDS (enforced post-generation):
 * eclectic, seamless, curated, content, discover, mesmerizing,
 * haunting, ethereal, tour-de-force, genre-bending
 */

export const EDITORIAL_PROMPT_VERSION = "1.0.0";

export const BANNED_WORDS = [
  "eclectic",
  "seamless",
  "curated",
  "content",
  "discover",
  "mesmerizing",
  "haunting",
  "ethereal",
  "tour-de-force",
  "genre-bending",
];

export function buildEditorialPrompt(input: {
  artistName: string;
  spotifyGenres?: string[];
  discogsStyles?: string[];
  musicbrainzTags?: string[];
  country?: string;
  beginDate?: string;
  classifications: Array<{
    primaryGenre: string;
    moods: string[];
    vibeTags: string[];
  }>;
  tinyDeskCount: number;
}): string {
  const genreInfo = [
    ...(input.spotifyGenres || []),
    ...(input.discogsStyles || []),
    ...(input.musicbrainzTags || []),
  ]
    .filter(Boolean)
    .slice(0, 15)
    .join(", ");

  const classInfo = input.classifications
    .map((c) => `${c.primaryGenre} (${c.moods.join(", ")})`)
    .join("; ");

  return `You are writing liner notes for a record store's staff picks shelf. Your voice is a crate-digger who has been to 500 shows and knows every pressing. Direct, opinionated, warm. Like you're telling a friend why they need to hear this artist RIGHT NOW.

ARTIST: ${input.artistName}
${input.country ? `FROM: ${input.country}` : ""}
${input.beginDate ? `ACTIVE SINCE: ${input.beginDate}` : ""}
GENRE TAGS: ${genreInfo || "unknown"}
TINY DESK PERFORMANCES: ${input.tinyDeskCount} concert${input.tinyDeskCount > 1 ? "s" : ""}
CLASSIFICATION: ${classInfo}

Write a JSON response with these fields:

1. "editorial" — 2-3 paragraphs (150-250 words total). Write like liner notes, not a biography. What does this artist SOUND like? What do they make you FEEL? Why should someone who's never heard them press play right now? Be specific about the sound, not vague about the vibes. Reference specific songs, albums, or moments if you know them.

2. "sonicDNA" — array of 3-5 tags that describe their sonic fingerprint. Not genres, but textures and feelings. Examples: "tape-hiss warmth", "church-pew bass", "3am-saxophone", "sun-bleached guitar". Be poetic but specific.

3. "ifYouLike" — array of 2-3 objects with "artistName" and "reason" fields. Recommend artists from the Tiny Desk catalog who share sonic DNA. The reason should be one vivid sentence.

4. "trivia" — array of 2-3 one-sentence facts that a music nerd would find interesting. Not Wikipedia trivia. Record store trivia.

5. "discographyPicks" — array of 2-3 objects with "title" (album/EP name), "year" (number), "label" (string), "why" (one sentence on why this is the one to start with).

RULES:
- NEVER use these words: eclectic, seamless, curated, content, discover, mesmerizing, haunting, ethereal, tour-de-force, genre-bending
- NEVER start the editorial with "[Artist] hits like..." or "[Artist] sounds like..." — vary your openings. Start with the music, a scene, a feeling, a specific moment. Every artist gets a different entry point.
- Write like you're talking, not presenting. Short sentences. Fragments OK.
- If you don't know something, skip it. Don't make up album names or labels.
- For discographyPicks, only include albums you're confident about. Empty array is better than wrong data.

Return valid JSON only. No markdown. No explanation.`;
}

export function checkBannedWords(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      found.push(word);
    }
  }
  return found;
}
