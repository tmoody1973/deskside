# CLAUDE.md

Project instructions for Claude Code. Read this first, every session.

## What this is

**Deskside** — a full-screen, channel-surfing interface for the complete NPR Tiny Desk Concerts catalog, with LLM-classified genres and user-created channels.

Three source docs live in `docs/`:
- `PRD.md` — product requirements
- `TECH_ARCHITECTURE.md` — system design + build order
- `DESIGN.md` — visual + interaction design (RetroUI Pro, dark neobrutalism)

When in doubt, those three docs win over this file.

## Hard constraints (non-negotiable)

1. **YouTube embeds only.** Never download, scrape, or re-host video files. IFrame API is the only playback path. Any design that implies otherwise is rejected.
2. **Never use "Tiny Desk" or "NPR" in user-facing branding.** Those are trademarks. The about page clearly states this is an unofficial fan project with a link to NPR.
3. **All API keys live in Convex env vars.** Never in client code, never in `NEXT_PUBLIC_*` vars except `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
4. **No browser storage for persistent state.** Convex is the source of truth. `localStorage` only for pre-signin ephemeral UI state (pending favorites, UI preferences).
5. **Accessibility: WCAG 2.2 AA.** Keyboard-only operation must work end-to-end. Focus rings visible. Motion respects `prefers-reduced-motion`.
6. **Ban these words in UI copy:** eclectic, seamless, curated, content, discover, mesmerizing, haunting, ethereal, tour-de-force, genre-bending.

## Tech stack

- **Next.js 15** (App Router, React 19, RSC)
- **Tailwind 4** + **RetroUI Pro** (licensed — dark-mode adapted via token overrides; see DESIGN.md §4 + Appendix A)
- **shadcn/ui** primitives underneath RetroUI
- **Framer Motion** (animations)
- **Zustand** (playback-queue store only; everything else is Convex queries)
- **Convex** (DB + queries + mutations + actions + crons + file storage)
- **Clerk** (auth, via Convex integration)
- **lucide-react** (icons, `strokeWidth={2.5}` default)
- **TypeScript strict mode. No `any` in committed code.**

## LLM usage — one model per job

- **Gemini 3 Pro** (`gemini-3-pro-preview`) → video classification. Google Search grounding enabled. Use `response_json_schema` for structured output.
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) → title parsing from YouTube titles. Cheap structured extraction.
- **Claude Sonnet 4.6** (current latest Sonnet) → editorial synthesis (artist blurbs, recommendations, info-overlay copy).

These are in `lib/classifier.ts` and `lib/editorialPrompt.ts`. Don't swap models without updating the version fields — classification + editorial rows are tagged with `provider + modelVersion + promptVersion` for exactly this reason.

## File layout

```
convex/
  schema.ts              ✓ locked data model
  ingest.ts              ✓ YouTube backfill + daily cron
  crons.ts               ✓ scheduler
  enrichment.ts          TO BUILD — pipeline orchestrator (parse → classify → link)
  artistEnrich.ts        TO BUILD — MusicBrainz → Spotify → Discogs per artist
  editorialSynth.ts      TO BUILD — Sonnet synthesis action
  featured.ts            TO BUILD — Vid of the Day daily rotation
  yearContext.ts         TO BUILD — one-time Sonnet generation for Rewind years
  channels.ts            TO BUILD
  playlists.ts           TO BUILD
  favorites.ts           TO BUILD
  watchHistory.ts        TO BUILD
  queries.ts             TO BUILD — grid/filter/search reads

lib/
  classification-prompt.ts   ✓ prompts + controlled vocabularies
  classifier.ts              ✓ Gemini 3 + Claude Haiku implementations
  editorialPrompt.ts         ✓ Sonnet synthesis prompt
  musicbrainz.ts             TO BUILD
  spotify.ts                 TO BUILD
  discogs.ts                 TO BUILD
  normalize.ts               TO BUILD — artist name dedup
  gemini.ts                  (merged into classifier.ts — do not create separately)

app/                     TO BUILD — Next.js App Router
  layout.tsx             fonts + providers (ConvexProvider, ClerkProvider)
  page.tsx               grid view
  c/[slug]/page.tsx      channel view
  p/[slug]/page.tsx      playlist view
  watch/[id]/page.tsx    full-screen player
  rewind/page.tsx        Rewind Timeline (v1)
  rewind/[year]/page.tsx per-year deep link
  library/page.tsx       signed-in user's stuff
  admin/page.tsx         admin dashboard

components/              TO BUILD — mostly RetroUI wrappers + custom player bits
```

## Data model essentials

Full schema in `convex/schema.ts`. Key invariants:

- **Videos have a state machine** (`enrichmentStatus`): `pending → parsed → classified → artist_linked → complete`. Each step is idempotent. Retries never re-run completed steps.
- **Artists are deduped by `normalizedName`.** Per-video enrichment = per-artist lookup + reuse.
- **Channels ≠ playlists.** Channels are saved filters (auto-updating queries). Playlists are hand-curated ordered lists. Both tables exist. Don't conflate.
- **Classifications are versioned by `provider + modelVersion + promptVersion`.** Reclassification adds new rows, never overwrites. Use the most recent row per video at query time.

## Decisions already made — do not relitigate

| Decision | Why |
|---|---|
| Gemini 3 Pro for classification (not Claude) | Google Search grounding for obscure artists |
| Claude Sonnet for editorial synthesis (not Gemini) | Stronger writing voice |
| Channels = saved filters, not curated lists | Scales; matches "zap through stations" primitive |
| Artist enrichment per-artist, not per-video | Cheaper, consistent |
| State machine, not waterfall, for enrichment | Resumable, debuggable |
| Convex over Postgres + separate API | Reactive queries + actions + crons in one runtime |
| Clerk over Auth.js | First-class Convex integration |
| RetroUI Pro over vanilla shadcn | Licensed, distinctive, handles 80% of components |
| Dark-mode neobrutalism | Override RetroUI tokens in Tailwind config, don't replace components |
| IFrame-only playback | YouTube ToS compliance |

If you want to change any of these, stop and ask Tarik — don't route around them.

## Build order

Work in phases from `TECH_ARCHITECTURE.md §15`. Do not start a phase before the previous one is merged and working.

1. Scaffold (Convex + Clerk + Tailwind + RetroUI install)
2. Ingestion proof — run backfill, see 1,200+ rows
3. Classification pipeline — **test on 30-video seed set FIRST, stop and show Tarik before full run**
4. Artist enrichment pipeline (MusicBrainz → Spotify → Discogs)
5. Grid view UI
6. Full-screen player with keyboard shortcuts
7. Playlists + channels
8. Info overlay + editorial synthesis
9. Rewind Timeline (v1 feature)
10. Polish + a11y audit

## Code conventions

- **TypeScript strict.** No `any`. Use `unknown` + narrowing when the shape is truly unknown.
- **Server components by default.** Use `"use client"` only where you need state, effects, or event handlers.
- **Convex queries for reads.** Never fetch from client to external APIs — proxy through Convex actions.
- **Functions over classes.** Classes only where we did already (classifier interfaces).
- **Zod for runtime validation** of external API responses before inserting into Convex.
- **One export per file** for page/component files. Helpers can share a module.
- **File naming:** kebab-case for Next.js routes (that's the convention), camelCase for Convex functions, PascalCase for React components.
- **Comments explain *why*, not *what*.** Don't narrate code; document decisions.

## Testing

- Unit tests for Convex queries/mutations via `convex-test`.
- Classification regression suite: 30 hand-labeled videos, assert `primaryGenre` match on prompt/model change. Runs in CI.
- Playwright E2E for: auth flow, playlist create/add/share, full-screen keyboard shortcuts, Rewind Timeline nav.
- Before promoting a new classification prompt version: re-run the 30-video seed, eyeball the diff with Tarik.

## When things go wrong

- **Ingestion fails:** check `ingestionRuns` table. Error is in `error` field. Most common: YouTube quota (wait until midnight PT) or key rotation needed.
- **Classification returns low confidence:** leave it. Mark it for review in admin. Don't retry with higher temperature — that's gambling.
- **Artist enrichment can't find a Spotify ID:** fallback to MusicBrainz name search, then Discogs. If all three fail, store `enrichmentStatus: "partial"` and move on. Editorial synthesis handles missing sources gracefully.
- **YouTube video becomes unavailable:** mark `isAvailable: false`. Don't delete the row — preserves favorites/playlists referencing it.

## Naming

Project is **Deskside**. Never use "Tiny Desk" or "NPR" in user-facing branding, domains, meta tags, og:title, or logo. The about page states Deskside is an unofficial fan project with a link to NPR's official Tiny Desk page. Put the brand name in `lib/brand.ts` as a single source so it can be overridden in tests and localized later.

## Environment variables checklist

**Convex (secret):**
- `YOUTUBE_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_AI_API_KEY`
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- `DISCOGS_TOKEN`
- `MUSICBRAINZ_CONTACT_EMAIL` (required for their UA header; no key needed)

**Next.js (public):**
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

**Next.js (secret):**
- `CLERK_SECRET_KEY`

## Tarik

Tarik Moody is Director of Strategy and Innovation at Radio Milwaukee. Architecture background, "bumwad coding" methodology (blueprint before build), public radio veteran. He pushes back on vague answers and wants specifics. Write in his preferred register: direct, opinionated, crate-digger voice. When uncertain, say so explicitly and propose a decision rather than ask an open question.

---

That's the whole file. If you find yourself wishing this doc said more about X, consult the three source docs in `docs/` or ask Tarik. Don't invent answers.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
