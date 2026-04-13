/**
 * Discogs API client.
 *
 * Auth: Consumer key + secret via query params.
 * Rate limit: 60 req/min authenticated.
 * Returns: styles, country, years active.
 */

const DISCOGS_BASE = "https://api.discogs.com";

export interface DiscogsArtist {
  id: number;
  styles: string[];
  country?: string;
  yearsActive?: string;
}

export async function searchArtist(
  name: string,
  consumerKey: string,
  consumerSecret: string
): Promise<DiscogsArtist | null> {
  const params = new URLSearchParams({
    q: name,
    type: "artist",
    per_page: "1",
    key: consumerKey,
    secret: consumerSecret,
  });

  const res = await fetch(`${DISCOGS_BASE}/database/search?${params}`, {
    headers: {
      "User-Agent": "Deskside/1.0",
    },
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Discogs rate limited (429)");
    return null;
  }

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;

  // Fetch full artist details for richer data
  const artistId = result.id;
  const detailRes = await fetch(
    `${DISCOGS_BASE}/artists/${artistId}?key=${consumerKey}&secret=${consumerSecret}`,
    { headers: { "User-Agent": "Deskside/1.0" } }
  );

  if (!detailRes.ok) {
    // Return basic data from search if detail fetch fails
    return {
      id: artistId,
      styles: [],
      country: undefined,
      yearsActive: undefined,
    };
  }

  const detail = await detailRes.json();

  // Extract years active from profile or members
  let yearsActive: string | undefined;
  if (detail.profile) {
    const yearMatch = detail.profile.match(/(\d{4})\s*[-–]\s*(present|\d{4})/i);
    if (yearMatch) {
      yearsActive = `${yearMatch[1]}-${yearMatch[2].toLowerCase()}`;
    }
  }

  return {
    id: artistId,
    styles: detail.genres || [],
    country: detail.country || undefined,
    yearsActive,
  };
}
