/**
 * Spotify Web API client.
 *
 * Auth: Client credentials flow (no user OAuth needed).
 * Rate limit: ~180 req/min per app token.
 * Returns: Spotify ID, genres, popularity, image URL.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Reuse token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + btoa(`${clientId}:${clientSecret}`),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token error ${res.status}: ${body}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

export interface SpotifyArtist {
  id: string;
  genres: string[];
  popularity: number;
  imageUrl?: string;
}

export async function searchArtist(
  name: string,
  clientId: string,
  clientSecret: string
): Promise<SpotifyArtist | null> {
  const token = await getAccessToken(clientId, clientSecret);

  const params = new URLSearchParams({
    q: `artist:"${name}"`,
    type: "artist",
    limit: "1",
  });

  const res = await fetch(
    `https://api.spotify.com/v1/search?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    if (res.status === 429) throw new Error("Spotify rate limited (429)");
    return null;
  }

  const data = await res.json();
  const artist = data.artists?.items?.[0];
  if (!artist) return null;

  return {
    id: artist.id,
    genres: artist.genres || [],
    popularity: artist.popularity ?? 0,
    imageUrl: artist.images?.[0]?.url || undefined,
  };
}
