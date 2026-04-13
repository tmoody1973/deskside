# DESKSIDE

> A channel-surfing interface for 1,400+ live music concerts. Classified by genre, mood, and vibe. Flip through like a TV.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Convex](https://img.shields.io/badge/Convex-Cloud-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)

## What is this?

Deskside treats a catalog of live concert performances the way a record store clerk would: organized, annotated, and made for browsing. Every video is classified by an AI pipeline (genre, mood, era, instrumentation, region, vibe tags), and users flip through "channels" (saved genre filters) with keyboard shortcuts that feel like a TV remote.

The video is the product. Everything else is chrome.

**Built by [Tarik Moody](https://github.com/tmoody1973)**, Director of Strategy and Innovation at Radio Milwaukee.

## Features

- **Video-first interface** — Full-screen player IS the app. Inspired by [Yes Yes Y'all](https://yesyesyall.co).
- **Title card interstitials** — Branded intro screen before each video, like a TV channel bumper.
- **1,402 concerts classified** — Gemini 3 Flash with Google Search grounding classifies every video by genre, mood, era, instrumentation, and vibe.
- **Editorial liner notes** — Claude Haiku writes crate-digger blurbs for every artist. Not Wikipedia. Record store energy.
- **Channel surfing** — 12 built-in genre channels. Switch with a dropdown, see the channel bug animate.
- **Grid overlay** — Press G to browse all concerts with search, genre filters, and a SURPRISE ME button.
- **Keyboard-first** — Space (play/pause), ← → (prev/next), G (grid), I (info), S (shuffle), C (captions), F (library), M (mute), H (filmstrip).
- **Info panel** — Artist tab (editorial blurb, sonic DNA, recommendations, discography picks) + Video Description tab.
- **Auth + social** — Sign in via Clerk. Favorite videos, create playlists, share publicly at `/p/[slug]`.
- **Shareable channels** — `/c/hip-hop`, `/c/jazz`, `/c/folk` — standalone video-first players.
- **Dark neobrutalism** — CRT black, neon accents (yellow/pink/cyan/lime), thick borders, hard offset shadows, Archivo Black display type.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind 4, Framer Motion |
| UI | Dark neobrutalism (custom design tokens) |
| Backend | Convex (DB + queries + mutations + actions + crons) |
| Auth | Clerk (via Convex integration) |
| Video | react-player (YouTube IFrame API) |
| Classification | Gemini 3 Flash (Google AI, with Search grounding) |
| Title parsing | Claude Haiku 4.5 (Anthropic) |
| Editorial | Claude Haiku 4.5 (crate-digger voice) |
| Artist data | MusicBrainz + Spotify + Discogs |
| Deployment | Vercel + Convex Cloud |

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- [Convex account](https://convex.dev) (free tier)
- [Clerk account](https://clerk.com) (free tier)

### Installation

```bash
git clone https://github.com/tmoody1973/deskside.git
cd deskside
npm install
```

### Environment Variables

Create `.env.local`:

```bash
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Set Convex server-side env vars:

```bash
npx convex env set YOUTUBE_API_KEY <key>
npx convex env set ANTHROPIC_API_KEY <key>
npx convex env set GOOGLE_AI_API_KEY <key>
npx convex env set SPOTIFY_CLIENT_ID <id>
npx convex env set SPOTIFY_CLIENT_SECRET <secret>
npx convex env set DISCOGS_CONSUMER_KEY <key>
npx convex env set DISCOGS_CONSUMER_SECRET <secret>
```

### Development

```bash
# Terminal 1: Convex dev server
npx convex dev

# Terminal 2: Next.js dev server
npm run dev
```

### Data Pipeline

Run once after setup:

```bash
# 1. Ingest all videos from YouTube playlist
npx convex run ingest:backfillPlaylist

# 2. Parse titles (Claude Haiku)
npx convex run enrichment:startParsing

# 3. Classify videos (Gemini 3 Flash)
npx convex run enrichment:startClassification

# 4. Enrich artists (MusicBrainz + Spotify + Discogs)
npx convex run artistEnrich:startEnrichment

# 5. Generate editorial blurbs (Claude Haiku)
npx convex run editorialSynth:startSynthesis

# 6. Seed built-in genre channels
npx convex run channels:seedBuiltInChannels

# 7. Set today's Vid of the Day
npx convex run featured:rotateDaily
```

Total pipeline cost: ~$30 one-time for 1,402 videos.

## Project Structure

```
deskside/
├── app/
│   ├── page.tsx              # Main video-first player (splash, grid, info, transport)
│   ├── layout.tsx            # Root layout (fonts, providers, OG meta)
│   ├── providers.tsx         # ClerkProvider + ConvexProviderWithClerk
│   ├── api/og/route.tsx      # Dynamic OG images for social sharing
│   ├── c/[slug]/page.tsx     # Channel page (standalone player)
│   └── p/[slug]/page.tsx     # Playlist page (standalone player)
├── components/
│   ├── AboutModal.tsx        # About + legal disclaimer + keyboard shortcuts
│   ├── FilterBar.tsx         # Genre dropdown + SURPRISE ME button
│   ├── GenreBadge.tsx        # Color-coded genre pill badges
│   ├── KeyboardHints.tsx     # First-visit keyboard shortcut overlay
│   ├── LibraryOverlay.tsx    # Favorites + playlists tabs
│   └── UserActions.tsx       # Auth button, favorite toggle, playlist add
├── convex/
│   ├── schema.ts             # 12 tables, 18 indexes, 1 search index
│   ├── ingest.ts             # YouTube playlist backfill + daily cron
│   ├── enrichment.ts         # Title parse + classification pipeline (fan-out batching)
│   ├── artistEnrich.ts       # MusicBrainz → Spotify → Discogs per artist
│   ├── editorialSynth.ts     # Claude editorial blurb synthesis
│   ├── queries.ts            # Grid, search, genre list, video details
│   ├── channels.ts           # Channel CRUD + built-in seed
│   ├── playlists.ts          # Playlist CRUD + sharing
│   ├── favorites.ts          # Favorite toggle
│   ├── featured.ts           # Vid of the Day rotation
│   ├── crons.ts              # Daily ingest + featured rotation
│   ├── auth.ts               # Server-side auth helper (never trust client userId)
│   └── auth.config.ts        # Clerk JWT validation
├── lib/
│   ├── classification-prompt.ts  # Controlled vocabularies + Gemini prompt
│   ├── editorialPrompt.ts       # Claude editorial prompt + banned words
│   ├── genre-colors.ts          # Genre → accent color mapping
│   ├── normalize.ts             # Artist name normalization for dedup + search
│   ├── musicbrainz.ts           # MusicBrainz API client
│   ├── spotify.ts               # Spotify API client (client credentials)
│   └── discogs.ts               # Discogs API client
└── docs/
    ├── CLAUDE.md                 # Full project spec
    ├── PRD.md                    # Product requirements
    ├── DESIGN.md                 # Visual design system
    ├── TECH_ARCHITECTURE.md      # System architecture
    └── README.md                 # Background docs README
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `←` / `J` | Previous video |
| `→` / `L` | Next video |
| `G` | Open grid overlay |
| `I` | Artist info panel |
| `F` | Your library (favorites + playlists) |
| `S` | Shuffle |
| `C` | Toggle captions |
| `M` | Mute / Unmute |
| `H` | Toggle filmstrip |
| `Esc` | Close overlay / panel |

## Architecture

```
YouTube Data API → Convex ingest → videos table (1,402 rows)
                                        │
                     ┌──────────────────────────────────────┐
                     │ Enrichment pipeline (per video):      │
                     │ 1. Claude Haiku → parse title          │
                     │ 2. Gemini 3 Flash → classify + tag     │
                     │ 3. MusicBrainz → Spotify → Discogs     │
                     │ 4. Claude Haiku → editorial blurb       │
                     └──────────────────────────────────────┘
                                        │
                         Convex reactive queries → Next.js UI
                                        │
                     Video-first player · Grid overlay · Channels
```

## Legal

Deskside is an unofficial fan project. It is not affiliated with, endorsed by, or connected to NPR or the Tiny Desk Concert series. All video content is embedded from YouTube via the official IFrame API and is not downloaded or re-hosted. Artist data sourced from MusicBrainz, Spotify, and Discogs.

## License

MIT
