# Product Requirements Document
## Deskside

**Owner:** Tarik Moody
**Status:** Draft v1 — April 12, 2026
**Audience:** Engineering (Claude Code), design, stakeholder review

---

## 1. Vision

A full-screen, channel-surfing interface for the complete NPR Tiny Desk Concerts catalog. Every video is classified by an LLM with genre, mood, era, instrumentation, and cultural context tags. Users browse through a grid reminiscent of Yes Yes Y'all, zap between custom "channels" like Channel Surfer, and build personal playlists backed by a crate-digger's info overlay synthesized from MusicBrainz, Discogs, and Spotify.

Tiny Desk is one of the most genre-diverse music libraries on the internet. YouTube's native interface buries that diversity under a generic playlist. This project treats the catalog the way a record store clerk would — organized, annotated, and made for discovery.

## 2. Why this, why now

- NPR's Tiny Desk catalog contains ~1,200+ videos spanning 15+ years, every genre, every continent.
- YouTube's interface doesn't support filtering by genre/mood, has no playlist permanence, and buries the concert inside the recommendation algorithm.
- Modern LLMs can classify this catalog at high fidelity for <$50 one-time cost.
- The "channel" metaphor — saved filters as stations you flip through — is underused in music discovery apps and emotionally resonant (it feels like tuning a radio).

## 3. Target users

**Primary persona — "The Crate Digger"**
Aged 25–55. Music-obsessed, finds YouTube insufficient, loves genre-specific discovery, values editorial context. Will share custom channels with friends.

**Secondary persona — "The Background Listener"**
Wants ambient high-quality live music on a big screen while working/cooking. Cares about mood filtering ("something mellow"), not metadata depth.

**Tertiary persona — "The NPR Member"**
Over-indexed on public radio, trusts editorial curation, wants a better way to re-watch their favorites.

## 4. Jobs-to-be-done

1. *"I want to find every Tiny Desk by a Black woman from Brazil"* → tag-based filtering
2. *"I want an ambient jazz channel to play while I cook"* → saved filter channels + auto-play
3. *"I want to show a friend three Tiny Desks that changed my life"* → shareable playlists with public URLs
4. *"I want to surf through Tiny Desks the way I'd channel-surf cable"* → keyboard-driven zap interface
5. *"I just watched Anderson .Paak — what else should I watch?"* → LLM-synthesized recommendations based on sonic DNA
6. *"Who is this artist and why should I care?"* → info overlay with editorial blurb + label + scene + similar artists

## 5. Scope — MVP (v0.1)

The smallest thing worth shipping.

- **Ingestion:** Full backfill of NPR Tiny Desk playlist `PL1B627337ED6F55F0`. Daily cron for new videos.
- **Classification:** Gemini 3 Pro classifies every video with genre, moods, era, instrumentation, language, region, vibe tags. Claude Haiku 4.5 parses artist/title.
- **Grid view:** Responsive tile grid with thumbnail, artist, song title, primary genre badge. Filters for channel, genre, mood, era, region. Search by artist or title.
- **Full-screen player:** YouTube IFrame embed, auto-fade chrome, keyboard shortcuts (`←/→` prev/next, `↑/↓` channel switch, `Space`, `F`, `S` shuffle, `I` info, `M` mute).
- **Built-in channels:** 10–15 auto-generated from primary genre buckets + 2–3 editorial "Tarik's Picks."
- **Vid of the Day:** Random daily rotation, hero slot on home.
- **Auth:** Clerk. Unauthenticated users can watch and browse. Auth required for favorites, playlists, custom channels.
- **Playlists:** Create, name, order, make public/private. Shareable URL `/p/{slug}`.
- **Custom channels:** Saved filter = channel. Share a channel URL `/c/{slug}`.
- **Info overlay:** Artist bio, Spotify genres, Discogs styles, country, "if you like this" from our library.

## 6. Scope — V1 (post-launch)

- **Rewind Timeline** (`/rewind`) — horizontal year-by-year view of the entire catalog, 2008 → now, with era-appropriate styling per year. Signature differentiator. See DESIGN.md §9.
- **MusicBrainz + Apple Music enrichment.** MBID-linked metadata everywhere.
- **Claude-synthesized editorial blurbs** per artist (replaces raw API dumps).
- **Watch history + resume playback.**
- **"Shuffle All"** surf mode — randomly jump between genres every N seconds, simulating actual channel surfing.
- **Social:** public user profiles with their channels/playlists at `/u/{handle}`.
- **Hover-preview** on grid tiles (muted 10-second clip).
- **Admin/moderation view** for low-confidence classifications.
- **Analytics:** most-watched, most-shared, genre heatmap.

## 7. Scope — V2 (nice-to-have)

- **Smart shuffle** — ML-based "because you watched X" channel generation.
- **Concert notes/timestamps** — Claude annotates each video with per-song timestamps by reading the description.
- **Collab playlists** — multi-user playlist editing.
- **TV mode / Chromecast / AirPlay** optimized layout.
- **Mobile apps** (PWA first; native if usage justifies).
- **"Crate"** integration — pipe Tiny Desk data into Tarik's Crate app via MCP.

## 8. Explicitly out of scope

- **Downloading or storing video files.** Embed only. YouTube ToS compliance is non-negotiable.
- **Ad-free playback.** We don't own the stream; YouTube's ads play as served.
- **Covering non-Tiny-Desk NPR content** (World Cafe, Jazz Night in America, etc.) in v1. Possible v2.
- **Monetization in v1.** No paywall, no ads, no affiliate links. Public radio adjacent = stay clean.
- **User-uploaded video.** Ingestion is NPR playlist only.

## 9. User stories (MVP)

### Browse & discover
- As a visitor, I can see a grid of Tiny Desk concerts on the homepage without signing in.
- As a visitor, I can filter the grid by primary genre, mood, era, or region using dropdowns.
- As a visitor, I can search by artist name or song title.
- As a visitor, I can click any tile to enter the full-screen player.

### Play & surf
- As a viewer, I can use keyboard shortcuts to navigate without a mouse (←/→, ↑/↓, space, F, I, M, S, +).
- As a viewer, I can see a fading chrome bar that hides after 3 seconds of inactivity.
- As a viewer, I can press `I` to see an info overlay with artist context.
- As a viewer, I can press `↑/↓` to switch to the next/previous channel.

### Save & share
- As a signed-in user, I can favorite videos (heart icon).
- As a signed-in user, I can create a playlist, name it, add videos, and reorder.
- As a signed-in user, I can make a playlist or channel public and share the URL.
- As a signed-in user, I can create a custom channel by saving a filter combination.

### Daily content
- As any user, I see a "Vid of the Day" hero on the homepage that rotates daily.

## 10. Success metrics

**North-star metric (6-month target):** 30-minute median session length among signed-in users. (This is an "ambient music" product. Long sessions = it's working.)

**Leading indicators:**
- Classification confidence ≥ 0.75 on 90% of videos.
- 80% of sessions use keyboard shortcuts at least once (measures whether the "channel surfer" primitive lands).
- Median user creates ≥ 1 playlist or channel within first week of signup.
- ≥ 30% of signed-in sessions end with a "shared" action.

**Operational metrics:**
- Daily ingestion job succeeds 99%+ of days.
- LLM classification cost stays under $10/month ongoing (post-backfill).
- Full-screen player TTI < 1 second on broadband.

## 11. Naming

**Locked:** **DESKSIDE**

The compound-word approach (like "fireside," "bedside," "stoveside") captures the spirit of Tiny Desk — intimate proximity to the performer — without using the trademarked phrase. Evokes invitation, closeness, being *beside* the desk rather than watching from the back of a venue.

**Legal posture:** "Tiny Desk" is an NPR trademark. Deskside does not use the trademark. The about page must clearly state Deskside is an unofficial fan project using publicly available YouTube embeds, with a link to NPR's official Tiny Desk page. Do not use NPR's visual identity, logo, or color palette anywhere in the product.

**Wordmark direction:** Archivo Black all-caps "**DESKSIDE**." Optional secondary mark: "**DS**" monogram for favicons, app icons, compact UI contexts. Single-color treatment (off-white `--border` on `--bg`), with accent-color variants reserved for specific moments (yellow for Vid of the Day branding, cyan for Rewind Timeline, etc.).

**Domain strategy:** prefer `.fm` / `.tv` / `.co` over `.com`. Verify availability before announcing.

## 12. Legal & ethical considerations

- **YouTube ToS:** Embed only via IFrame API. Do not scrape, download, or re-host video. ✓ Compliant by design.
- **NPR trademark:** Do not use "Tiny Desk" or "NPR" in the product name or logo. Do not imply endorsement. ✓ Addressed in §11.
- **YouTube API quota:** Default 10,000 units/day. Full backfill ≈ 55 units. Incremental cron ≈ 5 units/day. ✓ Well under.
- **Artist rights:** All classification tags are editorial opinion, not factual claims. Info overlay clearly attributes data sources (MusicBrainz, Discogs, Spotify). No AI-generated claims about living artists without source attribution.
- **User data:** Clerk handles PII. Watch history stored but never sold/shared. Privacy policy required pre-launch.
- **Accessibility:** WCAG 2.2 AA. Keyboard-only operation must work end-to-end. All images need alt text. Captions inherited from YouTube embed where available.

## 13. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| NPR or YouTube asks us to take it down | High | Keep it small, non-commercial, clearly unofficial. Pre-emptively link to NPR's official site. Respond quickly if contacted. |
| Classification is subtly biased (US/English over global/non-English) | High | Use Gemini 3 grounding for non-English artists. Manual review queue for confidence < 0.6. Ensure controlled vocab includes non-Western genre terms (afrobeats, reggaeton, k-pop, amapiano, etc.). |
| Spotify/Discogs API terms change or get expensive | Medium | Cache aggressively at artist level. MusicBrainz is our fallback/primary — free and open. |
| LLM costs balloon on repeated reclassification | Medium | Version prompts; only reclassify affected rows. Daily caps on LLM spend. |
| YouTube video becomes unavailable (takedown, geo-block) | Low | `isAvailable` field + daily reconciliation. Show gracefully as "this one's missing." |
| Full-screen auto-play blocked by browser | Medium | Require user-initiated first interaction. Fall back to muted auto-play. |

## 14. Non-requirements (intentional)

- Does not need to match YouTube's raw feature set (likes, comments, subscriptions).
- Does not need to be a mobile app in v1 — web-first.
- Does not need to support non-Tiny-Desk content.
- Does not need to be real-time collaborative.

## 15. Open questions

1. Should low-confidence classifications go live and be labeled, or hide until reviewed? *Recommend: go live, soft-flag for admin, hide from built-in channel auto-generation only.*
2. Should Vid of the Day be truly random, weighted by Spotify popularity, or editorial override-able? *Recommend: random with admin override.*
3. Built-in channels — auto-generated from genres, or hand-curated by Tarik? *Recommend: both. Auto-generated channels for each primary genre + 2-3 editorial channels (e.g., "Tarik's Late Night," "New This Month").*
4. Should unauthenticated users be able to save state in localStorage (playlists, favorites) and sync on signup? *Recommend: yes, reduces signup friction.*
5. How do we handle a Tiny Desk where a real artist collaborates with someone problematic (e.g., artist X ft. controversial figure)? *Recommend: surface both, let users filter out specific artist IDs if desired. No editorial censorship.*
