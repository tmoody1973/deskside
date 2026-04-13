/**
 * MusicBrainz API client.
 *
 * Rate limit: 1 req/sec. Non-negotiable.
 * Auth: None, but requires User-Agent header with app name + contact email.
 * Returns: MBID (canonical ID), tags, country, begin date.
 */

const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "Deskside/1.0 (deskside-app@tarikmoody.com)";

export interface MusicBrainzArtist {
  id: string; // MBID
  name: string;
  country?: string;
  beginDate?: string;
  tags: string[];
}

export async function searchArtist(
  name: string
): Promise<MusicBrainzArtist | null> {
  const params = new URLSearchParams({
    query: `artist:"${name}"`,
    fmt: "json",
    limit: "1",
  });

  const res = await fetch(`${MB_BASE}/artist/?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    if (res.status === 503) {
      // Rate limited, caller should retry
      throw new Error("MusicBrainz rate limited (503)");
    }
    return null;
  }

  const data = await res.json();
  const artist = data.artists?.[0];
  if (!artist || artist.score < 80) return null;

  return {
    id: artist.id,
    name: artist.name,
    country: artist.country || undefined,
    beginDate: artist["life-span"]?.begin || undefined,
    tags: (artist.tags || [])
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .slice(0, 10)
      .map((t: { name: string }) => t.name),
  };
}
