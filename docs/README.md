# Deskside — Foundation + Handoff Docs

A Yes Yes Y'all / Channel Surfer–style interface for the complete NPR Tiny Desk Concerts catalog, with LLM-classified genres and user-created channels.

This repo contains the **architecture phase** (bumwad): foundation code + three handoff docs ready for Claude Code.

## Handoff docs — READ THESE FIRST

```
docs/
  PRD.md                 # Product requirements: vision, scope, user stories, metrics
  TECH_ARCHITECTURE.md   # System design, data flow, APIs, build order
  DESIGN.md              # Visual design, interaction, typography, components
```

Feed these to Claude Code in order. PRD answers "what are we building and why." Tech architecture answers "how does it fit together." Design answers "what should it look and feel like."

## Foundation files

```
convex/
  schema.ts              # Data model — videos, classifications, artists, channels, playlists
  ingest.ts              # YouTube playlist ingestion (backfill + daily incremental cron)
  crons.ts               # Scheduled jobs

lib/
  classification-prompt.ts   # Classification prompts + controlled vocabularies + JSON schema
  classifier.ts              # Gemini 3 Pro (primary) + Claude Haiku (title parse) + Claude fallback
  editorialPrompt.ts         # Claude Sonnet 4.6 editorial synthesis prompt
```

## Architecture at a glance

```
YouTube Data API → Convex ingest → videos table (enrichmentStatus: "pending")
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │ Enrichment state machine (per video):  │
                     │                                        │
                     │ 1. Claude Haiku 4.5  → parse title     │
                     │ 2. Gemini 3 Pro      → classify + tag  │
                     │ 3. MusicBrainz → Spotify → Discogs     │
                     │    (per-artist dedup, cached)          │
                     │ 4. Claude Sonnet 4.6 → editorial blurb │
                     └────────────────────────────────────────┘
                                         │
                                         ▼
                          Reactive Convex queries → Next.js UI
                                         │
                                         ▼
                     Grid view · Full-screen player · Channels · Playlists
```

## Key decisions

**Three LLMs, each doing what it's best at:**
- **Gemini 3 Pro** classifies videos — Google Search grounding handles obscure, non-English, and post-training-cutoff artists better than Claude.
- **Claude Haiku 4.5** parses titles — cheap, reliable structured extraction.
- **Claude Sonnet 4.6** writes editorial blurbs — best voice for crate-digger liner notes.

**Channels = saved filters, not curated lists.** Matches Channel Surfer's zap primitive. User-made channels are queries with a name.

**Artists deduped and enriched per-artist, not per-video.** Floating Points appearing twice = one Spotify lookup. Cheaper and consistent.

**Enrichment is a state machine, not a waterfall.** Each video advances `pending → parsed → classified → artist_linked → complete`. Resumable, idempotent, debuggable.

**Embed-only.** YouTube IFrame API. No downloads, no re-hosting. ToS compliant by design.

## Setup

```bash
npm create convex@latest deskside
cd deskside
npm install @anthropic-ai/sdk @google/genai @clerk/nextjs \
            framer-motion zustand lucide-react nanoid
# Install shadcn/ui + RetroUI Pro per their docs

# Copy the foundation files + docs
cp -r ../deskside-foundation/convex/* convex/
cp -r ../deskside-foundation/lib/* lib/
cp -r ../deskside-foundation/docs .

# Env vars (Convex)
npx convex env set YOUTUBE_API_KEY <key>
npx convex env set ANTHROPIC_API_KEY <key>
npx convex env set GOOGLE_AI_API_KEY <key>
# Added during Phase 3:
# npx convex env set SPOTIFY_CLIENT_ID <...>
# npx convex env set SPOTIFY_CLIENT_SECRET <...>
# npx convex env set DISCOGS_TOKEN <...>

# Env vars (Next.js)
# NEXT_PUBLIC_CONVEX_URL=...
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
# CLERK_SECRET_KEY=...

npx convex dev
```

Kick off backfill from a one-off script or the Convex dashboard:

```ts
import { api } from "./convex/_generated/api";
await convex.action(api.ingest.backfillPlaylist);
```

YouTube quota for full backfill: ~55 units. Well under 10k/day default.

## Build order

See `docs/TECH_ARCHITECTURE.md` §15. Summary:

1. Scaffold + ingest proof (2 days)
2. Classification pipeline (2 days) — run on 30-video seed first
3. Artist enrichment pipeline (2 days)
4. Grid view UI (2 days)
5. Full-screen player (3 days)
6. Playlists + channels (2 days)
7. Info overlay + editorial synthesis (2 days)
8. Polish + accessibility (open-ended)

MVP target: **~15 engineering days** with Claude Code.

## What's delivered vs. what's next

✅ **Delivered:**
- `convex/schema.ts` — locked data model
- `convex/ingest.ts` — YouTube ingestion (backfill + daily cron)
- `convex/crons.ts` — scheduler
- `lib/classification-prompt.ts` — prompts + vocabularies
- `lib/classifier.ts` — Gemini 3 + Claude implementations
- `lib/editorialPrompt.ts` — Sonnet synthesis prompt
- `docs/PRD.md`
- `docs/TECH_ARCHITECTURE.md`
- `docs/DESIGN.md`

🚧 **To build (Claude Code):**
- `convex/enrichment.ts` — orchestrator
- `convex/artistEnrich.ts` — MusicBrainz + Spotify + Discogs fetcher
- `convex/editorialSynth.ts` — Sonnet synthesis action
- `convex/featured.ts` — Vid of the Day rotation
- `convex/channels.ts`, `playlists.ts`, `favorites.ts`, `watchHistory.ts`, `queries.ts`
- `lib/musicbrainz.ts`, `lib/spotify.ts`, `lib/discogs.ts`, `lib/normalize.ts`
- Entire Next.js app per `docs/DESIGN.md` + `docs/TECH_ARCHITECTURE.md`

## Legal notes

- **"Tiny Desk" is an NPR trademark.** The public-facing name must not include "Tiny Desk" or imply NPR endorsement. See PRD §11 for naming candidates.
- **YouTube ToS:** embed-only via IFrame API. No downloads.
- **Accessibility:** WCAG 2.2 AA target. Keyboard-first by design.

## Philosophy

The video is the product. Everything else is chrome. Chrome fades, video stays. Treat the catalog like a record store, not a media library. Keyboard-first, mouse-graceful.
