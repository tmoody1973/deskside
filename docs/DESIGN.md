# Design Document
## Deskside

**Status:** Draft v2 — April 12, 2026 *(revised for RetroUI Pro + Rewind direction)*
**Audience:** Engineering (Claude Code), visual reference for the build

---

## 1. Design philosophy

**Retro cable TV guide meets a crate-digger's record store.**

Three principles, in priority order:

1. **The video is the product.** Everything else is chrome. Chrome fades, video stays. If a design decision competes with giving the video more pixels, the video wins.
2. **Treat the catalog like a record store, not a media library.** Tags are editorial. Copy has voice. The info overlay is liner notes, not a Wikipedia dump.
3. **Keyboard-first, mouse-graceful.** The Channel Surfer primitive only lands if the keys feel like a TV remote. Mouse interactions are fallbacks, not primary.

The aesthetic is unapologetic: thick borders, hard offset shadows, chunky display type, neon accents against deep black. Not minimal, not "clean." Loud, confident, specific. A record store clerk's zine energy, not a SaaS dashboard.

## 2. Reference aesthetic

- **RetroUI Pro** — licensed component library, neobrutalism styled, React + Tailwind + shadcn-compatible. Primary visual language. All standard components (buttons, cards, dialogs, dropdowns, badges, inputs) come from here.
- **YouTube Rewind timeline** — the horizontal year-by-year scroll, each era evoking its moment. Direct inspiration for our Rewind Timeline view (§9).
- **Yes Yes Y'all** — chrome-fading full-bleed player, minimal controls, single-accent discipline during playback.
- **Channel Surfer** — grid-to-channel toggle, Vid of the Day hero, dropdown-based filtering, zap-through channels.
- **Channel bug / OSD overlays** — think cable TV channel change graphics. "CH 07 · LATE NIGHT JAZZ" appearing briefly in the corner when you zap. (This is an original touch — not in any reference site.)

What we're **not** copying:
- RetroUI's default light mode (we're dark-only).
- YouTube Rewind's playful mascot/character work (too cute for our thing).
- Any specific logo, iconography, or typeface from the reference sites.

## 3. Mood board (verbal)

- A CRT TV glowing at 2am in an apartment filled with records.
- The on-screen display when you change channels on a late-'90s cable box.
- A zine made by someone who loves both hip-hop and Bauhaus.
- Spray paint stencils on a concrete wall, but the wall is black and the paint is neon.
- Not "music tech startup." Not "streaming service." Not "algorithm."

## 4. Color system

**Dark neobrutalism — black-first, neon accents, solid colored shadows.**

RetroUI ships light-mode default. We override their tokens for a fully custom dark palette. Engineering note: update `tailwind.config.ts` to extend RetroUI's palette rather than replacing it — we want component behavior intact, only color values swapped.

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0A0A0F` | Page background. CRT black, not pure black. |
| `--bg-surface` | `#14141C` | Card fill, dropdown background |
| `--bg-elevated` | `#1E1E28` | Modal, info overlay background |
| `--border` | `#F5F0E8` | Default border — warm off-white (NOT pure white, feels softer) |
| `--border-dim` | `#2A2A34` | Hairline dividers, subtle borders inside cards |
| `--text-primary` | `#F5F0E8` | Headlines, artist names |
| `--text-secondary` | `#B8B0A4` | Body, metadata |
| `--text-tertiary` | `#6B665E` | Timestamps, subtle labels |
| `--accent-yellow` | `#FFD93D` | Primary accent. "On-air" color. Vid of the Day border, primary CTAs, active states. |
| `--accent-pink` | `#FF3EA5` | Secondary accent. Hover/active on interactive elements, genre tag variant. |
| `--accent-cyan` | `#3EDBFF` | Tertiary accent. Links, in-player highlights, keyboard hint chips. |
| `--accent-lime` | `#B6F36F` | Quaternary — used sparingly, confirmation states, "LIVE" tags. |
| `--shadow` | `#F5F0E8` | Solid offset shadow color (white-ish). Default. |
| `--shadow-yellow` | `#FFD93D` | Offset shadow for primary CTAs |
| `--shadow-pink` | `#FF3EA5` | Offset shadow for Vid of the Day tile |

**Why these choices:**
- **CRT black (#0A0A0F), not pure black** — softens the edge where cards meet background, avoids the harsh digital feel.
- **Warm off-white border (#F5F0E8), not pure white** — pairs with the CRT black, feels analog, not sterile.
- **Yellow as primary** — RetroUI's signature, and "on-air light" is traditionally yellow/amber. It reads as *broadcast*.
- **Pink + cyan as secondary/tertiary** — triadic with yellow, evokes VHS tracking / 80s television / early MTV.
- **Colored offset shadows** — this is the signature neobrutalist move. A dark card with a yellow shadow offset 6px bottom-right is unmistakable.

**Accessibility:** all text tokens tested at WCAG AA against `--bg` and `--bg-surface`. Accents used for decoration + redundant signaling, not as sole meaning carriers.

## 5. Typography

**Three fonts, two roles + one utility.**

| Role | Font | Weight | Size range | Why |
|---|---|---|---|---|
| Display / headlines | **Archivo Black** | 900 (only weight) | 24–72px | RetroUI's signature. Chunky, editorial, unmistakable. |
| Body / UI | **Space Grotesk** | 400, 500, 700 | 11–20px | Clean, technical, pairs with Archivo Black. RetroUI default. |
| Mono (admin/debug) | **IBM Plex Mono** | 400 | 12–14px | Only visible in admin views |

Load via `next/font/google`. Fonts are free, Google-hosted.

**Scale:**
- `display`: Archivo Black 64/72, tracking -0.02em — Vid of the Day hero, Rewind year labels
- `h1`: Archivo Black 40/48 — page titles
- `h2`: Archivo Black 28/36 — section headers, channel names
- `h3`: Space Grotesk 700 20/28 — card artist name
- `body`: Space Grotesk 400 15/24 — default
- `small`: Space Grotesk 500 13/20 — metadata
- `tiny`: Space Grotesk 700 11/16, tracking +0.08em, all-caps — genre badges, labels, channel numbers

**Typography rules:**
- Display type is **always** Archivo Black. No exceptions. Never use Space Grotesk for a hero or headline.
- `tiny` is always all-caps (it's label text).
- Body is never all-caps.
- Artist names use Space Grotesk 700 — not Archivo Black — to keep Archivo Black reserved for structural display moments.

## 6. Layout

### 6.1 Grid view

```
┌────────────────────────────────────────────────────────────────┐
│ ▦ DESKSIDE                                 🔍 SEARCH   (●) ME  │  72px top bar, thick bottom border
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌─────────────────────────────────────────────────────────┐ │
│   │ ★ VID OF THE DAY                                         │ │
│   │                                                          │ │
│   │  ┌────────────┐   ANDERSON .PAAK                         │ │ Archivo Black 40
│   │  │            │   oxnard, ca · neo-soul                  │ │ Space Grotesk, cyan
│   │  │ thumbnail  │                                          │ │
│   │  │            │   "Paak drums, sings, grins, and         │ │
│   │  └────────────┘    makes 29 minutes feel like 9."        │ │ Plex Serif one-liner
│   │                                              [ WATCH → ] │ │ Big CTA button
│   └─────────────────────────────────────────────────────────┘ │
│                                    ↑ thick white border + yellow offset shadow (8px)
│                                                                │
│   CHANNEL   [ ALL ▾ ]   VIBE   [ ANY ▾ ]   ERA   [ ANY ▾ ]    │ Chunky labels + RetroUI selects
│                                                                │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│   │          │ │          │ │          │ │          │          │
│   │  thumb   │ │  thumb   │ │  thumb   │ │  thumb   │          │
│   │          │ │          │ │          │ │          │          │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│   ARTIST        ARTIST       ARTIST       ARTIST               │ Space Grotesk 700
│   song title    song title   song title   song title           │ Space Grotesk 400
│   [HIP-HOP]     [JAZZ]       [FOLK]       [AFROBEATS]          │ Chunky badges
│                                                                │
│                ◀  01  02  03  …  35  ▶                         │ Pagination buttons
└────────────────────────────────────────────────────────────────┘
```

- Top bar: 72px (bigger than default — RetroUI feels bigger). 3px bottom border in `--border`.
- Vid of the Day hero: 2:1 aspect on desktop, full-width on mobile. 3px `--border` + 8px offset shadow in `--accent-pink`. "VID OF THE DAY" label in Archivo Black with a small `--accent-yellow` pulsing dot.
- Filter bar: sticky below hero. Dropdown labels in `tiny` style, selects in RetroUI's chunky Select component.
- Tile grid: 4 cols at ≥1280px, 3 at 1024, 2 at 640, 1 mobile. **20px gutters** (bigger than usual — neobrutalism breathes).
- Tile: 16:9 thumbnail with 3px `--border` + 6px offset shadow in `--border` color. Artist name below thumbnail, song title in secondary. Genre badge floats bottom-left of thumbnail.
- Pagination: RetroUI Pagination blocks. Current page number has yellow fill.

### 6.2 Full-screen player

```
┌────────────────────────────────────────────────────────────────┐
│ ▦  CH 07 · HIP-HOP ESSENTIALS                           [TDC]  │ Chrome (fades)
│                                                                │
│                                                                │
│                       VIDEO FILLS                              │
│                         ENTIRE                                 │
│                        VIEWPORT                                │
│                                                                │
│                                                                │
│ [▦] [?]         [◀] [⏸] [▶]                  HD [♪] [⇄] [⛶]  │ Chrome (fades)
└────────────────────────────────────────────────────────────────┘
```

- Video: `absolute inset-0`. Fills viewport. Safe-area padding in fullscreen.
- Chrome (top + bottom): 64px each. Background `rgba(10, 10, 15, 0.7)` with `backdrop-filter: blur(16px)`. **No border while chrome is present** — the blur is enough. Fades to opacity 0 after 3s idle.
- Channel badge upper-left: "CH 07 · HIP-HOP ESSENTIALS" in Space Grotesk 700, `tiny` style, yellow.
- Buttons: RetroUI IconButton variant, 44×44 hit, 24px lucide icons, transparent until hover then get the yellow outline treatment.

### 6.3 Info overlay (pressed `I`)

Slides in from right, 440px. `--bg-elevated` fill, 3px `--border` left edge, 6px `--accent-cyan` offset shadow pushing it off the video.

```
┌─────────────────────────────┐
│ [X]                         │ Close button (RetroUI)
│                             │
│ ANDERSON                    │ Archivo Black 48
│ .PAAK                       │
│ ─────                       │ 3px yellow line
│ OXNARD, CA · B. 1986        │ tiny, --text-tertiary
│                             │
│ Editorial blurb 2–3         │ Space Grotesk 15/24
│ paragraphs in Bob Boilen-   │ --text-secondary
│ at-WFMU voice…              │
│                             │
│ ─────────────────           │
│ ★ SONIC DNA                 │ tiny, yellow
│                             │
│ [ NEO-SOUL ]                │ Chunky pill badges, yellow/pink/cyan rotation
│ [ WEST-COAST-HIP-HOP ]      │
│ [ LIVE-INSTRUMENTATION ]    │
│                             │
│ ─────────────────           │
│ ★ IF YOU LIKE THIS          │ tiny, pink
│                             │
│ → THUNDERCAT                │ Archivo Black link-style
│   "Plays bass like…"        │ Space Grotesk 13/20
│                             │
│ → TOM MISCH                 │
│   "That late-night mood…"   │
│                             │
│ ─────────────────           │
│ ★ DISCOGRAPHY PICKS         │ tiny, cyan
│                             │
│ ◆ MALIBU (2016)             │ Space Grotesk 700
│   Steel Wool / Art Club     │ Space Grotesk 400
│   "The one that broke him." │
│                             │
│ ◆ OXNARD (2018)             │
│   Aftermath / 12 Tone       │
│                             │
│ ─────────────────           │
│ sources: musicbrainz        │ tiny, --text-tertiary
│ discogs · spotify           │
└─────────────────────────────┘
```

## 7. Components (RetroUI Pro mapping)

Claude Code: install RetroUI Pro via the shadcn CLI pattern. Override color tokens in `tailwind.config.ts` to match §4. Keep RetroUI's structural props (border widths, shadow offsets, radii) at defaults — that's the whole point of buying the license.

| Our component | RetroUI Pro component | Adaptations |
|---|---|---|
| Tile / grid card | `Card` | 3px border, 6px offset shadow. Vid of the Day variant uses pink shadow, 8px offset. |
| Genre badge | `Badge` | Chunky pill, rotates between yellow/pink/cyan/lime based on genre group. Uppercase. |
| Filter dropdown | `Select` | Label in `tiny` above select. Chunky chevron. |
| Search | `Input` | 3px border, yellow focus ring. Placeholder "FIND AN ARTIST, A SONG, A VIBE…" |
| Primary button | `Button` | Yellow fill, 3px border, 6px offset shadow in `--shadow`. Press-down animates shadow to 0,0. |
| Secondary button | `Button variant="outline"` | Transparent fill, 3px border, 4px offset shadow. |
| Icon button | `IconButton` | 40×40, transparent → yellow outline on hover. |
| Modal | `Dialog` | 3px border, 8px offset shadow pink. |
| Playlist picker | `Dialog` + `Checkbox` list | Standard pattern. |
| Pagination | Use RetroUI Pro Pagination block | Current page yellow fill. |
| Toast | `Toast` | Slides from bottom-right, yellow border, 4px offset shadow. |
| Keyboard hint chip | `Badge variant` custom | Cyan background, black text, small. Used in full-screen overlays. |

**Components we build custom (not in RetroUI):**
- **Channel bug / OSD** — §7.1 below
- **Chrome overlay** with fade behavior (native wrapper around RetroUI buttons)
- **Rewind Timeline** — §9
- **YouTube IFrame wrapper**
- **Channel switcher transition overlay** — §7.2

### 7.1 Channel bug (on-screen display)

The signature "you changed the channel" moment. Lives in top-left of full-screen player.

- Shows persistently when player chrome is visible.
- On channel change: briefly expands (600ms) to full channel name + number, then retracts to badge-only.
- Format: `CH 07 · HIP-HOP ESSENTIALS` in Space Grotesk 700, yellow.
- During expansion: Archivo Black, larger, with a pink 4px offset shadow. Feels like an old Comcast channel guide.
- Subtle scan-line overlay? Optional. If so, a `::before` pseudo-element with a very faint repeating 2px horizontal line pattern at 4% opacity.

### 7.2 Channel switcher transition (pressed ↑ or ↓)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   LATE NIGHT JAZZ    ●  HIP-HOP ESS.    GLOBAL GROOVE │  Horizontal strip, center highlighted
│      (dim 40%)          (on-air, yellow)   (dim 40%)  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Slides into view from top of player, 1.5s duration total (400ms in, 600ms hold, 500ms out).
- Active channel name in Archivo Black 32 yellow, with a small animated yellow "ON AIR" bug.
- Previous/next in Archivo Black 20, white at 40% opacity.
- Background: `rgba(10, 10, 15, 0.85)` with backdrop blur.
- Plays a subtle tactile audio cue ("click" — optional, off by default, can enable in settings).

## 8. Interaction patterns

### 8.1 Chrome auto-fade (full-screen player)

Same as before — 3s idle → fade out 400ms. Any activity → fade in 150ms.

### 8.2 Channel switching

- `↑`/`↓` from full-screen player: switch to next/prev channel.
- Transition: 300ms crossfade on video. Channel switcher overlay (§7.2) plays during transition.
- Channel bug (§7.1) expands to new channel name.
- If new channel is empty: toast "NO VIDEOS IN THIS CHANNEL" with yellow border, stay on current.

### 8.3 Video transitions within a channel

- `→`/`L` or video ends: 200ms crossfade.
- Next video starts muted 500ms then ramps to user's volume.
- Failed load: skip after 3s.

### 8.4 Hover on tile (desktop)

- After 1s hover: lift slightly (`transform: translate(-2px, -2px)`) and the offset shadow grows proportionally (`--shadow` from 6px to 8px offset) — the RetroUI "pop up" move.
- Genre badge color swaps to `--accent-pink` briefly.
- v1: muted video preview in the thumbnail frame. MVP: static only.

### 8.5 Click on tile

- Transitions into full-screen player with a brief "zoom from tile position" animation (300ms). Reinforces the "you entered" feeling.

### 8.6 Adding to playlist

- `+` or icon → RetroUI Dialog slides up from bottom. Existing playlists listed with checkboxes. "+ CREATE NEW" button top.
- Apply on `Enter`. Close on `Esc`.

## 9. Rewind Timeline (v1 feature)

**What it is:** A horizontal scrolling view showing Tiny Desks arranged by year, 2008 → now. Each year is a "zone" with all that year's concerts. Scroll horizontally (or press `→`/`←` to page through years). Inspired directly by YouTube Rewind's timeline.

**Why it matters:** Tiny Desk is ~17 years old. You can watch the musical 2010s unfold concert by concert. The year-by-year view reveals patterns (the 2015 hip-hop wave, the 2020 at-home year, the 2023 global music surge) that you can't see in a flat grid. It's also a huge shareability moment — "go look at 2013, that year was bonkers."

**Route:** `/rewind` and `/rewind/[year]`

**Layout:**

```
┌────────────────────────────────────────────────────────────────────────┐
│ ▦ DESKSIDE                                           🔍 SEARCH   ME    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  REWIND                                                                │ Archivo Black 72
│  15 YEARS OF TINY DESK                                                 │ Archivo Black 20
│                                                                        │
│  ◀ scroll  ─────────────────●──────────────────────────  scroll ▶       │ Year indicator line
│        2008 · 2009 · 2010 · [2011] · 2012 · 2013 · 2014 · 2015 ...      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │   2011                                                           │ │ Archivo Black 120 (huge)
│  │                                                                  │ │
│  │   "the year the desk got weird"                                  │ │ Editorial caption, Plex Serif italic
│  │                                                                  │ │
│  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │ │
│  │   │thb1│ │thb2│ │thb3│ │thb4│ │thb5│ │thb6│   ← horizontal scroll │ │
│  │   └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                       │ │
│  │   Artist  Artist  Artist Artist Artist Artist                    │ │
│  │                                                                  │ │
│  │   ─── 47 concerts this year ───                                  │ │ Subtle stat
│  │                                                                  │ │
│  │   THIS YEAR IN MUSIC:                                            │ │ tiny, cyan
│  │   · Adele's 21 dominated the year                                │ │ Era context bullets
│  │   · Odd Future broke through                                     │ │ (Claude-generated)
│  │   · Bon Iver won album of the year                               │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│          ◀ 2010                                          2012 ▶        │ Year nav buttons
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Per-year styling touches:**
- Year number in huge Archivo Black, always colored in that year's "era accent" (see below).
- Era accent: each year gets one of the four accent colors based on a subtle "era grouping" — 2008–2011 yellow (early era), 2012–2015 pink (growth), 2016–2019 cyan (hip-hop wave), 2020–2022 lime (at-home era), 2023+ yellow again (global/new era).
- Each year has an editorial caption (1 sentence, by Tarik or Claude-generated, e.g., "the year the desk got weird"). Claude can draft, Tarik approves.
- "This year in music" bullets — 3 contextual facts generated by Claude from a single prompt per year, stored in a `yearContext` table. One-time $5 generation for 17 years.

**Navigation:**
- Horizontal scroll wheel or swipe.
- Keyboard: `←`/`→` to page years, `↑`/`↓` to scroll concerts within a year.
- Click a year in the top rail to jump directly.
- Pressing `Enter` on a concert thumbnail enters full-screen player in a "Rewind [year]" channel that queues only that year's concerts.

**Empty / sparse years:**
- 2008 only has a handful of concerts (the format was new). Handle gracefully — don't pad, lean into "where it all started."

**Data requirement:**
- New Convex table: `yearContext { year: number, caption: string, bullets: string[], accentColor: string }`. ~17 rows total. One-time Claude Sonnet generation.

## 10. Motion

**Principles:**
- Motion serves navigation and signals "mode change." Never purely decorative.
- Neobrutalism motion should feel *tactile*, not springy. Hard offsets, crisp transitions — like a key press on a mechanical keyboard.
- No spring physics. Cubic beziers only.

**Standard eases:**
- `ease-retro: cubic-bezier(0.68, -0.1, 0.32, 1.1)` — signature "overshoot-and-settle" for buttons and card lifts.
- `ease-out-soft: cubic-bezier(0.22, 0.61, 0.36, 1)` — chrome fades, overlays.
- `ease-in-out-smooth: cubic-bezier(0.65, 0, 0.35, 1)` — video crossfades, channel transitions.
- `ease-linear` — progress bars only.

**Signature motion moments:**
- **Button press:** shadow offset drops to 0,0, card moves to shadow position — so the whole button "clicks down." 80ms in, 100ms out.
- **Tile hover:** card translates -2,-2, shadow grows from 6px to 8px offset. 200ms `ease-retro`.
- **Channel switch:** video fades 300ms, switcher overlay slides down 400ms, channel bug expands 600ms then retracts 400ms.
- **Rewind year change:** smooth scroll with momentum; the big year numeral counter-scrolls at 0.3× speed for parallax.

**Respect `prefers-reduced-motion`:** disable all transforms, keep color changes and opacity fades only.

## 11. Responsive behavior

| Breakpoint | Layout adjustments |
|---|---|
| ≥1536px (2xl) | 5-column grid, 24px gutters, max-width 1760px |
| ≥1280px (xl) | 4-column grid, 20px gutters |
| ≥1024px (lg) | 3-column grid, 20px gutters |
| ≥768px (md) | 3-column grid, 16px gutters, filter bar compact |
| ≥640px (sm) | 2-column grid, bottom-nav replaces top-nav |
| <640px | 1-column grid, bottom-nav, single-filter-at-a-time UI, Rewind timeline stacks vertically |

**Mobile-specific:**
- Full-screen player: tap-to-show chrome, auto-hide 2s.
- Swipe left/right = prev/next video. Swipe up = info overlay. Swipe down = exit.
- Rewind Timeline on mobile: vertical instead of horizontal scroll. Year headers sticky.
- No keyboard hints UI.
- Offset shadows reduced from 6px → 4px on mobile (looks heavy otherwise).

## 12. Accessibility (WCAG 2.2 AA)

- All interactive elements keyboard-reachable.
- Visible focus rings: 3px `--accent-cyan` outline with 2px offset — consistent across all components, overrides RetroUI defaults if they conflict.
- Skip-to-content link at top.
- `aria-label` on all icon-only buttons.
- `aria-live="polite"` on toasts and channel switch overlay.
- Reduced motion: disable transforms, keep fades (see §10).
- YouTube IFrame captions respected; our UI doesn't cover the CC button when chrome visible.
- Minimum tap target 44×44 on mobile.
- Color not sole meaning carrier — genre badges have text + color coding.
- Alt text on thumbnails: "Thumbnail for {artist} Tiny Desk Concert."
- Contrast: all accent-on-dark combos tested AA. Yellow on black passes AAA; pink/cyan on black pass AA.
- Chunky neobrutalism borders **help** accessibility — edges are clearer than subtle shadows.

## 13. Iconography

Use **lucide-react** exclusively. Neobrutalism benefits from the slightly heavier lucide stroke weight (use `strokeWidth={2.5}` as default).

| Action | Icon |
|---|---|
| Menu | `Menu` |
| Search | `Search` |
| Play | `Play` |
| Pause | `Pause` |
| Previous | `SkipBack` |
| Next | `SkipForward` |
| Shuffle | `Shuffle` |
| Info | `Info` |
| Add to playlist | `ListPlus` |
| Favorite (empty/filled) | `Heart` |
| Fullscreen | `Maximize` |
| Volume | `Volume2` / `VolumeX` |
| Channel | `Radio` |
| Share | `Share2` |
| Close | `X` |
| Rewind (year timeline) | `Clock3` |
| Keyboard hints | `Command` |

Sizes: 16 inline, 20 buttons, 24 primary controls, 32 Rewind view accents.

## 14. Microcopy voice

**Do:**
- "FLIP THROUGH CHANNELS WITH ↑ AND ↓."
- "SAVE THIS TO A PLAYLIST."
- "NO CONCERTS MATCH THOSE FILTERS. DROP ONE."
- "CHOOSE YOUR VIBE."
- "47 CONCERTS THIS YEAR."

**Don't:**
- "Please select a filter option."
- "Empty state: no results found."
- "Click here to add to playlist."
- "Discover more content."

Write like a DJ talking to a regular. Label-style text (filter headers, empty states, stats) can be all-caps chunky. Prose (editorial blurbs, info overlay) stays sentence case — it's reading, not shouting.

Ban words on sight: `eclectic`, `seamless`, `curated`, `content`, `discover`, `mesmerizing`, `haunting`, `ethereal`, `tour-de-force`, `genre-bending`.

## 15. Brand distance from Radio Milwaukee

Tarik's day job is Radio Milwaukee. This project sits in the same "public radio innovator" world but must be visually distinct from any RM station brand (88Nine, HYFIN, 414 Music, Rhythm Lab):
- Different type family (RM uses different faces).
- Different accent palette (yellow/pink/cyan/lime is NOT any RM station's brand).
- Different energy (neobrutalism is louder than RM's current brand work).

This is a personal project. The about page should say so.

## 16. What this doc is not

- A complete Figma file. RetroUI Pro ships a Figma kit — use that as the component source of truth; this doc is the overrides and extensions on top.
- A brand bible. Final brand locks when naming locks (PRD §11).
- Pixel-perfect specs. Anything not specified → engineering judgment → match philosophy in §1.

---

## Appendix A — Tailwind config snippet

For Claude Code reference. Extend (don't replace) RetroUI's defaults:

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0F",
        "bg-surface": "#14141C",
        "bg-elevated": "#1E1E28",
        border: "#F5F0E8",
        "border-dim": "#2A2A34",
        "text-primary": "#F5F0E8",
        "text-secondary": "#B8B0A4",
        "text-tertiary": "#6B665E",
        "accent-yellow": "#FFD93D",
        "accent-pink": "#FF3EA5",
        "accent-cyan": "#3EDBFF",
        "accent-lime": "#B6F36F",
      },
      fontFamily: {
        display: ["var(--font-archivo-black)", "sans-serif"],
        sans: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      boxShadow: {
        retro: "6px 6px 0 0 #F5F0E8",
        "retro-lg": "8px 8px 0 0 #F5F0E8",
        "retro-pink": "8px 8px 0 0 #FF3EA5",
        "retro-yellow": "6px 6px 0 0 #FFD93D",
        "retro-cyan": "6px 6px 0 0 #3EDBFF",
      },
      transitionTimingFunction: {
        retro: "cubic-bezier(0.68, -0.1, 0.32, 1.1)",
      },
    },
  },
};
```

## Appendix B — Font loading

```ts
// app/layout.tsx
import { Archivo_Black, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
});
```
