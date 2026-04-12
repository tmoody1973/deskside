# Technical Architecture
## Deskside

**Status:** Draft v1 — April 12, 2026
**Audience:** Engineering (Claude Code), technical review

---

## 1. System overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js 15 (App Router)                  │
│                         Deployed on Vercel                       │
│                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│   │  Grid view   │   │  Full-screen │   │  Playlist / chan │   │
│   │  /           │   │  /watch/[id] │   │  /p/[slug] etc   │   │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────────┘   │
│          │                  │                   │               │
│          └──────────┬───────┴───────────────────┘               │
│                     │                                           │
│              ┌──────┴──────┐                                    │
│              │ Clerk auth  │                                    │
│              └──────┬──────┘                                    │
└─────────────────────┼───────────────────────────────────────────┘
                      │ Convex client (realtime)
┌─────────────────────┼───────────────────────────────────────────┐
│                 Convex Backend                                   │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Queries    │  │  Mutations   │  │  Actions (external)   │   │
│  │  (reads)    │  │  (writes)    │  │  - ingest.ts          │   │
│  │             │  │              │  │  - enrichment.ts      │   │
│  └──────┬──────┘  └──────┬───────┘  │  - artistEnrich.ts    │   │
│         │                │          │  - editorialSynth.ts  │   │
│         │                │          └──────┬────────────────┘   │
│         └──────┬─────────┘                 │                    │
│                ▼                           ▼                    │
│        ┌──────────────┐          ┌───────────────────┐         │
│        │  DB tables   │          │   Crons (daily)    │         │
│        │  (schema.ts) │          │   - ingest         │         │
│        └──────────────┘          │   - featured       │         │
│                                  │   - reconcile      │         │
│                                  └───────────────────┘         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┬─────────────┬──────────────┐
          ▼           ▼           ▼             ▼              ▼
    ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐ ┌──────────┐
    │ YouTube │ │ Gemini 3 │ │ Claude  │ │ Spotify /  │ │MusicBrainz│
    │Data API │ │   Pro    │ │Sonnet4.6│ │  Discogs   │ │  (no key) │
    │(ingest) │ │(classify)│ │(synth)  │ │(enrich)    │ │          │
    └─────────┘ └──────────┘ └─────────┘ └────────────┘ └──────────┘
```

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js 15 (App Router, RSC) | Vercel-native, strong SEO, streaming |
| UI library | React 19 + Tailwind 4 + **RetroUI Pro** (+ shadcn/ui primitives underneath) | Licensed neobrutalism kit. Distinctive, ships with blocks + Figma kit. Dark-mode adapted via token overrides. |
| Animations | Framer Motion | Required for fading chrome, channel transitions |
| Auth | Clerk | Convex integration is first-class, social + email |
| Backend / DB | Convex | Reactive queries, actions for external APIs, crons, file storage — no separate infra |
| LLM: classification | Gemini 3 Pro (with Google Search grounding) | Web grounding for obscure artists, strong JSON Schema |
| LLM: title parse | Claude Haiku 4.5 | Cheap, reliable, good at structured extraction |
| LLM: editorial synthesis | Claude Sonnet 4.6 | Best writing voice for crate-digger blurbs |
| Video embed | YouTube IFrame API | Only ToS-compliant path |
| Deployment | Vercel + Convex Cloud | Zero DevOps |
| Observability | Convex logs + Vercel Analytics + Sentry | Standard stack |
| Domain / CDN | Vercel | Cloudflare in front if traffic warrants |

## 3. Data model

Full schema in `convex/schema.ts`. Summary:

| Table | Purpose |
|---|---|
| `videos` | One row per YouTube video. Source of truth. Includes enrichment state machine. |
| `classifications` | 1:1 with `videos`. Separated so reclassification doesn't touch ingestion. Versioned by `provider + modelVersion + promptVersion`. |
| `artists` | Deduped by normalized name. External IDs (Spotify, Discogs, MusicBrainz, Apple Music) cached here. |
| `artistEditorial` | Claude-synthesized blurb, sonic DNA tags, recommendations. Per artist. Versioned. |
| `channels` | Saved filters. User-owned or built-in. The Channel Surfer primitive. |
| `playlists` | Hand-curated ordered lists. User-owned. |
| `favorites` | User ❤ video. |
| `watchHistory` | User video watchedAt completionPct. |
| `featured` | Daily Vid of the Day rotation. Written by cron. |
| `yearContext` | Per-year editorial caption + bullets for Rewind Timeline (v1). ~17 rows, one-time Claude-generated. |
| `ingestionRuns` | Ops log for debugging. |

## 4. Data flow: ingestion + enrichment pipeline

Enrichment is a **state machine** per video, not a waterfall. Each video has an `enrichmentStatus` field that advances through states. Each state transition is idempotent and resumable.

```
 ingest              parse              classify          artist_link       editorial
  │                   │                   │                   │                 │
  ▼                   ▼                   ▼                   ▼                 ▼
┌──────┐     ┌────────────────┐   ┌─────────────┐   ┌─────────────────┐  ┌────────────┐
│video │     │ Claude Haiku   │   │ Gemini 3    │   │ MusicBrainz →   │  │ Claude     │
│ row  │ ──► │ extract artist │──►│ classify    │──►│ Spotify →       │─►│ Sonnet     │
│      │     │ + song title   │   │ tags +      │   │ Discogs         │  │ write      │
│      │     │                │   │ genre       │   │ (per artist)    │  │ editorial  │
└──────┘     └────────────────┘   └─────────────┘   └─────────────────┘  └────────────┘
status:       pending → parsed → classified → artist_linked → complete
```

**Why this order:**
1. **Parse first** so we have a clean artist name to dedup on.
2. **Classify before artist enrichment** because classification only needs the video, not external APIs. Fast path.
3. **Artist enrichment is per-artist, not per-video.** First video by an artist triggers the lookup; subsequent videos just link to the existing artist row.
4. **Editorial synthesis is last** because it wants access to Spotify + Discogs + MusicBrainz + our own classifications to reference "sonic neighbors in the Tiny Desk library."

Each step runs as a separate Convex action, scheduled via `ctx.scheduler.runAfter()`. If step 3 fails (e.g., Spotify rate-limited), only step 3 retries; steps 1–2 aren't re-run.

## 5. External API details

### 5.1 YouTube Data API v3

- **Endpoints used:** `playlistItems.list`, `videos.list`.
- **Auth:** API key (server-side, Convex env var).
- **Quota:** 10,000 units/day default. Full backfill ≈ 55 units. Daily incremental ≈ 5 units.
- **Rate limit:** ~1 req/sec per key is safe.
- **Compliance:** Embed-only via IFrame API. No download, no file storage.

### 5.2 Gemini 3 Pro (classification)

- **Model:** `gemini-3-pro-preview` via `@google/genai` SDK.
- **Features used:** `response_mime_type: "application/json"`, `response_json_schema`, Google Search grounding tool.
- **Input:** Parsed artist + featured artists + video title + full NPR description + (optionally) top-5 YouTube comments.
- **Output:** Validated JSON matching `CLASSIFICATION_JSON_SCHEMA` (see `lib/classification-prompt.ts`).
- **Cost estimate:** ~$0.02/video with grounding → ~$25 for full 1200-video backfill.
- **Grounding on/off:** On by default. Falls back to off if grounding fails (Gemini returns a flag).

### 5.3 Claude Haiku 4.5 (title parsing)

- **Model:** `claude-haiku-4-5-20251001`.
- **Input:** Raw YouTube title only.
- **Output:** `{artist, featuredArtists, songTitle, confidence}`.
- **Cost:** Negligible (~$0.001/video).

### 5.4 Claude Sonnet 4.6 (editorial synthesis)

- **Model:** `claude-sonnet-4-6` (or latest Sonnet at build time).
- **Input:** Artist name + Spotify artist JSON + Discogs artist JSON + MusicBrainz artist JSON + our classification data + list of this artist's Tiny Desks.
- **Output:**
  ```json
  {
    "editorial": "2-3 paragraph artist story",
    "sonicDNA": ["neo-soul", "west-african-funk", "spiritual-jazz"],
    "ifYouLike": [{"artistName": "...", "reason": "..."}],
    "trivia": ["...", "..."],
    "discographyPicks": [{"title": "...", "year": 2003, "label": "...", "why": "..."}]
  }
  ```
- **Cost:** ~$0.08/artist × ~800 unique artists = ~$65 one-time.

### 5.5 Spotify Web API

- **Auth:** Client credentials flow (no user OAuth needed for artist lookup).
- **Endpoints:** `/v1/search` (find artist by name), `/v1/artists/{id}`, `/v1/artists/{id}/related-artists`, `/v1/artists/{id}/top-tracks`.
- **Rate limit:** ~180 req/min per app token. Plenty.
- **Caveat:** Spotify deprecated `related-artists` for many use cases in late 2024. Check current status; if gone, use Last.fm or derive from our own classification tags.

### 5.6 Discogs API

- **Auth:** Personal access token.
- **Endpoints:** `/database/search`, `/artists/{id}`, `/artists/{id}/releases`.
- **Rate limit:** 60 req/min authenticated. Cache aggressively.
- **Why:** Deep crate-digger metadata — labels, styles, country, years active, release discographies.

### 5.7 MusicBrainz API

- **Auth:** None, but requires a User-Agent header identifying the app + contact email.
- **Rate limit:** 1 req/sec. Non-negotiable.
- **Endpoints:** `/ws/2/artist/` (search + lookup with `inc=url-rels+tags+artist-rels`).
- **Why:** Canonical MBID ties everything together. Best for classical/jazz/world music where Spotify is thin. Free, open, no commercial terms to worry about.
- **Usage pattern:** Look up by name → resolve to MBID → use MBID as the join key across Spotify/Discogs/Apple Music.

### 5.8 Apple Music API (deferred to v1)

- **Auth:** JWT signed with Apple developer private key. Annoying.
- **Endpoints:** `/v1/catalog/{storefront}/artists?filter[term]=...`.
- **Why deferred:** Extra auth complexity; MusicBrainz + Spotify + Discogs cover 95% of needs.
- **When to add:** If artist images from Spotify are missing or low-quality for a lot of global artists.

## 6. Convex actions: file layout

```
convex/
  schema.ts                  # ✓ delivered
  ingest.ts                  # ✓ delivered — backfill + incremental
  crons.ts                   # ✓ delivered
  enrichment.ts              # TO BUILD — orchestrator: parse → classify → link
  artistEnrich.ts            # TO BUILD — MusicBrainz/Spotify/Discogs fetcher
  editorialSynth.ts          # TO BUILD — Claude synthesis of artist data
  featured.ts                # TO BUILD — rotateDaily mutation
  channels.ts                # TO BUILD — CRUD + seed built-in channels
  playlists.ts               # TO BUILD — CRUD + public sharing
  favorites.ts               # TO BUILD — toggle favorite
  watchHistory.ts            # TO BUILD — record/query
  queries.ts                 # TO BUILD — grid + filter queries for UI

lib/
  classification-prompt.ts   # ✓ delivered
  classifier.ts              # ✓ delivered (Claude + Gemini stubs)
  gemini.ts                  # TO BUILD — Gemini 3 implementation
  editorialPrompt.ts         # TO BUILD — Sonnet synthesis prompt
  musicbrainz.ts             # TO BUILD — client + MBID resolver
  spotify.ts                 # TO BUILD — client-credentials + artist lookup
  discogs.ts                 # TO BUILD — search + fetch
  normalize.ts               # TO BUILD — artist name normalization for dedup
```

## 7. Frontend architecture

### Routes

```
/                     Grid view (default channel: "All")
/c/[slug]             Channel view (built-in or user-made)
/p/[slug]             Playlist view (public/shared playlists)
/u/[handle]           Public user profile (v1)
/watch/[youtubeId]    Full-screen player
/rewind               Rewind Timeline — horizontal year-by-year view (v1)
/rewind/[year]        Deep link to a specific year
/library              Signed-in user's favorites + playlists + channels
/admin                Admin dashboard (classification review, Vid of the Day override)
```

### Component hierarchy (full-screen player)

```
<PlayerShell>
  <YouTubeEmbed videoId autoPlay onEnded={nextVideo} />
  <ChromeOverlay visible={mouseMovedRecently}>
    <TopBar>
      <MenuButton />
      <ChannelBadge name="Channel Y" />
      <Logo />
    </TopBar>
    <BottomControls>
      <GridToggle />
      <KeyboardHintsToggle />
      <PlayPauseButton />
      <PrevNextButtons />
      <QualitySelector />
      <VolumeButton />
      <ShuffleButton />
      <FullscreenToggle />
    </BottomControls>
  </ChromeOverlay>
  <InfoOverlay visible={infoPressed}>
    <ArtistBlurb editorial={artistEditorial} />
    <SonicDNA tags={...} />
    <IfYouLike artists={...} />
    <DiscographyPicks picks={...} />
  </InfoOverlay>
  <ChannelSwitcher visible={channelSwitchPressed} />
  <PlaylistAddModal visible={plusPressed} />
</PlayerShell>
```

### State management

- **Server state:** Convex queries. Reactive by default — no refetching logic.
- **URL state:** Filter, channel, and current video all in URL params. Shareable, back-button-friendly.
- **Local state:** Chrome visibility, hover states, input focus — React `useState`.
- **Global state:** Current playback context (channel ID + play queue + index) in a Zustand store. Needed so keyboard shortcuts work regardless of which component has focus.

### Keyboard shortcut registry

| Key | Action | Component |
|---|---|---|
| `←` `J` | Previous video in queue | PlayerShell |
| `→` `L` | Next video | PlayerShell |
| `↑` | Previous channel | PlayerShell |
| `↓` | Next channel | PlayerShell |
| `Space` `K` | Play/pause | PlayerShell |
| `F` | Toggle fullscreen | PlayerShell |
| `S` | Shuffle current channel | PlayerShell |
| `I` | Toggle info overlay | PlayerShell |
| `M` | Mute | PlayerShell |
| `+` | Add to playlist (modal) | PlayerShell |
| `/` | Focus search | Grid |
| `Esc` | Exit player / close modal | Global |
| `?` | Show keyboard shortcuts help | Global |

Implement via a single `useKeyboardShortcuts()` hook bound at the player shell level. Prevent default browser behavior only inside the player.

## 8. Auth & authorization (Clerk + Convex)

- **Clerk handles login UI, session tokens, social/email/passkey.**
- **Convex reads Clerk JWT** via the official Clerk Convex integration. `ctx.auth.getUserIdentity()` gives us the user record in every query/mutation.
- **Authorization rules:**
  - Public reads: all `videos`, `classifications`, `artists`, `artistEditorial`, built-in `channels`, public `playlists`/`channels`, `featured`.
  - Authed reads: user's own `favorites`, `watchHistory`, private `playlists`/`channels`.
  - Writes: only to own rows, checked in every mutation.
  - Admin: users with `publicMetadata.isAdmin === true` in Clerk can write to `featured`, built-in `channels`, and the classification-review admin view.

**Unauthenticated UX:** full browse + playback works. Attempting to favorite or create playlist triggers Clerk sign-in modal. After sign-in, the pending action is replayed.

## 9. Search

- **MVP:** Convex `.withSearchIndex()` full-text search on `artists.name` and `videos.parsedSongTitle`. Sufficient for MVP scale (1200 videos, ~800 artists).
- **V1:** If fuzziness becomes a problem (users type "Anderson Paak" for ".Paak"), add Typesense or Algolia. Convex has docs on both.

## 10. Cost model

**One-time backfill (~1,200 videos):**
- YouTube API: free (under quota).
- Claude Haiku title parsing: ~$1
- Gemini 3 Pro classification: ~$25
- MusicBrainz: free
- Spotify artist lookups: free (under rate limit)
- Discogs lookups: free (under rate limit)
- Claude Sonnet editorial synthesis: ~$65 (~800 unique artists)
- **Total: ~$90 one-time.**

**Ongoing monthly (new video adds + occasional re-synthesis):**
- New videos per month: ~4 Tiny Desks.
- LLM cost: <$1/month.
- Convex free tier (1M function calls/month) likely sufficient through first year.
- Vercel free tier sufficient until ~100k MAU.

**Scaling trigger points:**
- \>10k MAU: Convex Pro ($25/mo).
- \>100k MAU: Vercel Pro ($20/mo).
- If Claude Code wants to re-run classifier with improved prompt: budget ~$30 for full re-run.

## 11. Observability & ops

- **Convex dashboard** for function logs, query latency, errors.
- **Vercel Analytics** for frontend performance.
- **Sentry** for uncaught errors (client + server).
- **Admin dashboard** inside the app for:
  - Ingestion run history (`ingestionRuns` table)
  - Classifications with confidence < 0.6 (review queue)
  - Failed enrichment rows
  - Manual Vid of the Day override
  - Rebuild built-in channels
- **Cron health:** a weekly Convex action that checks "was there an ingestion run in the last 48 hours? was a Vid of the Day set for today?" and emails Tarik if not.

## 12. Security

- All API keys in Convex env vars, never in client code.
- Clerk JWT validated on every Convex call.
- Row-level authorization in every mutation (checked in handler, not trusted from client).
- Public playlist/channel slugs use `nanoid(10)` — unguessable.
- Rate limiting on mutations (Convex has built-in per-user rate limits via `rateLimiter`).
- CSP headers on the Next.js app restricting iframe to youtube.com only.

## 13. Testing strategy

- **Unit:** Convex queries/mutations tested via `convex-test`.
- **Integration:** Classification prompt regression suite — 30 hand-labeled videos, assert primaryGenre match on re-run. Runs in CI.
- **E2E:** Playwright for auth flow, playlist creation, full-screen keyboard shortcuts.
- **Manual:** Every new prompt version classifies a fixed 30-video seed set; Tarik eyeballs the diff before promoting.

## 14. Deployment

1. Convex Cloud project (dev + prod deployments).
2. Vercel project linked to GitHub repo.
3. Environment variables:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `YOUTUBE_API_KEY` (Convex env)
   - `ANTHROPIC_API_KEY` (Convex env)
   - `GOOGLE_AI_API_KEY` (Convex env)
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (Convex env)
   - `DISCOGS_TOKEN` (Convex env)
4. Clerk instance with Convex integration enabled.
5. Preview deploys on every PR.
6. Prod behind a custom domain (TBD after naming decision).

## 15. Build order (for Claude Code)

Work in this order. Each phase should be a merge-able PR.

**Phase 0 — scaffold (1 day)**
- `npm create convex@latest`
- Install Clerk, Tailwind, shadcn/ui, Framer Motion, Zustand.
- Set up env vars, Clerk project, Convex dev deployment.
- Copy in the delivered schema + ingest + crons files.

**Phase 1 — ingestion proof (1 day)**
- Run `backfillPlaylist` action manually.
- Verify 1,200+ videos show up in Convex dashboard with `enrichmentStatus: "pending"`.
- Build a minimal grid view that lists raw video titles. No styling.

**Phase 2 — classification pipeline (2 days)**
- Build `lib/gemini.ts` (Gemini 3 implementation of `Classifier` interface).
- Build `convex/enrichment.ts` orchestrator.
- Run against 30-video seed set; eyeball output with Tarik.
- Then run full pipeline across all 1,200 videos.

**Phase 3 — artist enrichment (2 days)**
- Build `lib/musicbrainz.ts`, `lib/spotify.ts`, `lib/discogs.ts`.
- Build `convex/artistEnrich.ts`.
- Run pipeline; spot-check 20 artists.

**Phase 4 — grid view UI (2 days)**
- Filter dropdowns wired to Convex queries.
- Search.
- Responsive tile grid with hover states.
- Vid of the Day hero.

**Phase 5 — full-screen player (3 days)**
- YouTube IFrame API integration.
- Chrome auto-fade behavior.
- Keyboard shortcuts.
- Next/prev queue logic.
- Channel switching.

**Phase 6 — playlists & channels (2 days)**
- CRUD for user playlists.
- Create channel = save filter.
- Public sharing URLs.

**Phase 7 — info overlay + editorial synthesis (2 days)**
- Build `lib/editorialPrompt.ts` + `convex/editorialSynth.ts`.
- Run synthesis across all unique artists.
- Wire info overlay UI.

**Phase 8 — polish (open-ended)**
- Accessibility audit (WCAG 2.2 AA).
- Mobile/responsive pass.
- Admin dashboard.
- Launch prep.

Target MVP ship: **~15 engineering days** with Claude Code.

## 16. Decisions made (for the record)

| Decision | Rationale |
|---|---|
| Gemini 3 Pro for classification, not Claude | Google Search grounding handles obscure/global artists better |
| Claude Sonnet 4.6 for editorial synthesis, not Gemini | Stronger editorial voice, more controllable writing style |
| Channels = saved filters, not curated lists | Matches Channel Surfer's zap primitive; scales infinitely |
| Artists deduped, enriched per-artist not per-video | Cheaper, more consistent, easier to update |
| State machine for enrichment, not waterfall | Idempotent, resumable, debuggable |
| Convex over Postgres + separate API server | Reactive queries + actions + crons + auth in one runtime; reduces infra drastically |
| Clerk over Auth.js/Supabase auth | First-class Convex integration |
| Embed-only (IFrame API) | YouTube ToS compliance |

## 17. Known unknowns / to verify at build time

- Does Spotify's `related-artists` endpoint still work for non-OAuth apps? If deprecated, rewrite "if you like this" logic to derive from our classification tags.
- Does NPR's playlist use `publishedAt` or `addedAt` in playlistItems? The first new-video detection depends on sorting correctly.
- Does Gemini 3 Pro's grounding tool work reliably when combined with strict `response_json_schema`? Test in isolation before committing.
- What's the actual rate of classification confidence < 0.6 across the full catalog? Budget for admin review accordingly.
