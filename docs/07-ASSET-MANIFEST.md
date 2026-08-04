# 07 — ASSET MANIFEST & SOURCING GUIDE

> The complete list of assets v1 needs, what YOU (the human) need to provide or approve,
> what Claude Code can generate as placeholders, and the licensing rules every asset
> must pass before shipping (Master Plan §9 provenance gate).

## 1. How assets get made — the three lanes

**OFFICIAL v1 ART PATH (user decision, 2026-08): code-first.** Claude Code authors ALL
art programmatically to the best achievable quality — real pixel-art sheets, not just
greyboxes — targeting "keepable" status, with the doc 06 bible as the quality bar. Human
polish (Aseprite edits) or commissioning are optional upgrades decided AFTER playing the
vertical slice. Lane A below is therefore promoted: code-generated assets may graduate
from `PLACEHOLDER` to `FINAL` if they pass the doc 06 §9 acceptance checklist; anything
that can't pass stays `PLACEHOLDER` and is listed as an upgrade candidate.

| Lane | What | Rule |
|---|---|---|
| **A. Placeholder (Claude Code)** | Programmatic/greybox sprites, tone-generated SFX, silence-with-metronome music | Allowed through Phase 2 development builds ONLY; every placeholder is visibly labelled (magenta accent + `PH-` key prefix) and listed below as `PLACEHOLDER` |
| **B. Acquired (you)** | Purchased/free packs, commissioned art & music | Must match the Art Bible (doc 06) or be repainted to match; licence recorded below BEFORE merge |
| **C. Authored (you / artist, in Aseprite + Tiled)** | Final characters, arenas, portraits, music | The intended end state for anything player-judged |

**Reality check on scope:** final art for this game is roughly **3–5 weeks of a solo
pixel artist's time**. The single highest-value purchases are (1) a cohesive character
base + animation template pack you can re-dress, and (2) a chiptune music pack or a
small commission. Claude Code can take you all the way to a fully playable, placeholder-
art game first, so art can land late without blocking development.

## 2. What you need to get / decide (the human shopping list)

1. **Aseprite licence** (~USD 20) if you'll author or even re-tag sprites — the pipeline
   assumes Aseprite export format. (LibreSprite is a free fallback.)
2. **Bitmap fonts:** pick and licence two (doc 06 §2). Recommended style: m5x7 /
   m6x11-class free fonts (check each font's licence file and record it below).
3. **Character/tile art**, choose one path:
   - Commission a pixel artist with doc 06 as the brief (best result), or
   - Buy base packs to re-dress: search itch.io for "16x16 top-down RPG character
     base + tileset" packs with commercial licences (Kenney.nl assets are CC0 and
     useful for UI/props but too clean-vector-styled for characters here), or
   - Author it yourself over time — the manifest below is your worklist.
4. **Music:** commission (~6–10 short loops) or licence a chiptune pack that allows
   games (record terms). SFX can start from CC0 (Kenney audio, jsfxr/ChipTone
   self-generated) and usually survive to ship.
5. **Decide the game's real title** (working: *Solport Cages*) before Beta — affects
   title art, PWA manifest, domain.

**AI-image generation note:** acceptable for *concept/reference boards only*. Generated
images do not ship as sprites: pixel-perfect sheets need consistent pivots, palettes and
tags that generation doesn't produce. Any AI-assisted asset that IS repainted into
compliance must record tool + prompt + editor per the Master Plan provenance table.

## 2b. Concrete shopping list (specific packs & creators)

> Prices, availability and licence terms change — **verify each item's current licence
> text at purchase time** and add a row to §5 before it ships. Everything below is a
> well-established pack/creator as of this document's writing.

### Free / CC0 — get these first (near-zero risk)

| Item | Where | Use here |
|---|---|---|
| **Kenney asset packs** (all CC0) — *UI Pack*, *Game Icons*, *Interface Sounds*, *Impact Sounds* | kenney.nl (also on itch.io) | UI-sound foundation, icon references, menu SFX. Kenney's visual style is too clean-vector for our sprites, but audio + icon sources are excellent |
| **Juhani Junkala — "The Essential Retro Video Game Sound Effects Collection"** (CC0) | OpenGameArt / itch.io | Huge SFX base to edit into kick/whistle/UI variant pools |
| **Daniel Linssen bitmap fonts — m5x7, m3x6, m6x11** (free) | managore.itch.io | The dialogue/HUD font family this doc set assumes; check each font's readme for its (very permissive) terms |
| **monogram** by datagoblin (free) | datagoblin.itch.io | Alternative dialogue font with big character coverage |
| **BDragon1727 effect packs** (free/cheap, credit required) | bdragon1727.itch.io | Pixel smoke/impact/particle sheets to recolour into our VFX grammar (doc 06 §7) |
| **jsfxr / ChipTone** (free tools) | sfxr.me / sfbgames.itch.io | Self-generate UI blips and placeholder SFX; recipes committed for reproducibility |

### Paid — high value for this specific game

| Item | Where / rough price | Use here |
|---|---|---|
| **Aseprite** | aseprite.org, itch.io or Steam, ~US$20 | The pipeline's assumed sprite tool (tags, pivots, deterministic export). Buy this regardless of art path |
| **LimeZu — "Modern Exteriors" (+ "Modern Interiors" if you want interior scenes)** | limezu.itch.io, ~US$10–20 each | The best-known 16×16 modern-city tileset on itch; a very strong repaint base for Solport's district hubs (harbour, market, rooftops). Licence allows commercial use with modification; no redistribution of raw assets |
| **Seliel the Shaper — "Mana Seed Character Base"** | seliel-the-shaper.itch.io, ~US$15–30 | A layered, heavily-animated top-down character base with a big animation library and clear commercial licence. Good starting rig for **hub** walk/idle sprites and NPCs. It does NOT include football actions — kick/tackle/celebrate frames are still custom work on top |
| **A chiptune/hybrid music pack with game licence** (e.g. Ovani Sound packs, or itch "royalty-free chiptune music pack" listings with commercial terms) | ovanisound.com / itch.io, ~US$20–60 per pack | Interim or final music. Check: loopable files, web-game use allowed, no per-title fee |

### What money CANNOT buy off the shelf (both source documents agree)

These must be commissioned or authored — no pack exists with our exact specs:

1. **The football animation set** — 24×24, 4-direction `kick/tackle/stumble/celebrate/
   dejected` frames matching doc 06 §3. This is the single unavoidable custom cost.
2. **Named-character identity** — Ash, the crew, the six captains (heads/hair/kits on
   shared bases keep this affordable).
3. **Portraits** (32×32 busts, doc 07 §3.3).
4. **Cage arena landmark dressing** — the Netyard nets, Kettle steam, Crucible scrap,
   Grid neon, Royal Cage — the shared cage structure can be built once in-house.
5. **Crew crests/pins + title art.**

### Commissioning guide (if you hire a pixel artist)

- Brief = doc 06 (art bible) + doc 07 §3 tables. Ask for **Aseprite source files with
  the exact tag names in doc 06 §3**, not just PNGs.
- Realistic indie ranges (vary widely by region/experience): full match rig for one
  character ~US$40–120; a portrait ~US$10–30; an arena composition ~US$60–150; the
  whole v1 sprite manifest roughly **US$800–2,000** total, or 3–5 weeks of one artist.
- Order of purchase: 1 character rig + Netyard arena first (unblocks the Phase 2
  vertical slice, doc 08), everything else can land during Phase 4.
- Contract must state: commercial use, modification rights, and that source files are
  deliverables. Record it all in §5.

### Buying rules (apply to every purchase)

- One pixel density: 16 px tile world — reject 32×32-native packs unless downscaling is
  actually redrawn, and never mix densities on screen (doc 06).
- Licence must permit commercial use AND modification; "no redistribution" is fine
  (we ship atlases, not source packs).
- Buy ONE base world tileset first and prove it repaints into Brine Harbor before
  buying anything else (THREEFOLD's purchase rule, adopted).
- Every purchase gets a §5 provenance row and its licence file saved into
  `assets-src/licenses/`.

## 3. Sprite manifest

Status values: `TODO` → `PLACEHOLDER` (in build, labelled) → `FINAL` (bible-compliant,
licensed). Claude Code updates this table as assets land.

### 3.1 Characters — match rigs (24×24, tag set per doc 06 §3)

| Key | Character | Sheets | Status |
|---|---|---|---|
| `chr-ash` | Ash (+ kit swap layers) | full match set + hub walk | TODO |
| `chr-juno` | Juno | full match set + hub walk | TODO |
| `chr-bram` | Bram | full match set + hub walk | TODO |
| `chr-ivy` | Ivy | full match set + hub walk | TODO |
| `chr-rui` | Rui | full match set + hub walk | TODO |
| `chr-salt` | Salt | full match set + hub walk | TODO |
| `chr-nadia` | Nadia | full match set + hub walk | TODO |
| `chr-ossian` | Brother Ossian | full match set + hub walk | TODO |
| `chr-ferra` | Ferra | full match set + hub walk | TODO |
| `chr-kairo` | Kairo (+ kid variant for flashback) | full match set + hub walk | TODO |
| `chr-vey` | Marshal Vey | full match set + hub walk | TODO |
| `chr-generic-a/b/c` | 3 base bodies × palette/hair swaps = 12 squadmates | full match set | TODO |
| `chr-kid-ash` | Kid Ash (flashback) | run/kick subset | TODO |

### 3.2 Characters — hub-only rigs (idle 4 + walk 6)

`chr-tero, chr-mabel, chr-nino, chr-djtide(poster only), chr-ambient-01..10`
(ambient rigs are palette swaps of 4 bases) — all TODO.

### 3.3 Portraits (32×32)

Mains ×2 expressions: Ash, Juno, Bram, Ivy, Rui, Tero, Kairo, Vey.
Singles: Mabel, Nino, Salt, Nadia, Ossian, Ferra, Oro, Sable, DJ Tide badge. — TODO.

### 3.4 World

| Key | Asset | Status |
|---|---|---|
| `ball` | 8×8, 4-frame roll | TODO |
| `arena-harbor..crown` | 6 match arena compositions (shared structure + dressing) | TODO |
| `tiles-harbor..crown` | 6 hub tilesets + prop sprites | TODO |
| `crowd-tiers` | 3 crowd density strips, 2-frame | TODO |
| `fx-*` | VFX inventory per doc 06 §7 (13 effects) | TODO |
| `ui-*` | 9-slice, buttons, icons (pins ×6, shells, gear…), touch controls, score numerals | TODO |
| `fonts` | 2 bitmap fonts converted to Phaser bitmap font format | TODO |
| `title-art` | Title screen key art (pixel, 480×270) | TODO |

## 4. Audio manifest

| Key | Asset | Source lane | Status |
|---|---|---|---|
| `mus-title, mus-hub×6, mus-match×3, mus-lastbell-layer, mus-flashback, mus-results×2, mus-credits` | 14 music pieces (doc 06 §8) | B or C | TODO |
| `sfx-*` | ~26 SFX families × 2–4 variants (doc 06 §8) | A→B (ChipTone/jsfxr can be FINAL if they pass review) | TODO |
| `amb-crowd×3, amb-harbor, amb-market…` | ambience beds | B | TODO |

## 5. Licensing & provenance table (append-only; one row per shipped asset source)

| Asset keys | Source (URL/author) | Licence | Proof/terms saved at | Modifications | Approved by |
|---|---|---|---|---|---|
| `sfx-*` (impact family sources) | Kenney — "Impact Sounds 1.0", kenney.nl | CC0 1.0 | `assets-src/licenses/kenney-impact-sounds-LICENSE.txt` | trim/layer/pitch per doc 06 §8 | user (uploaded 2026-08) |
| `sfx-*` (UI family sources) | Kenney — "Interface Sounds 1.0", kenney.nl | CC0 1.0 | `assets-src/licenses/kenney-interface-sounds-LICENSE.txt` | trim/layer/pitch per doc 06 §8 | user (uploaded 2026-08) |
| `fonts` (dialogue/HUD) | Daniel Linssen — m5x7, managore.itch.io/m5x7 | Free per itch page ("use however you like"; attribution appreciated — credit in Credits) | itch page terms; TTF at `assets-src/fonts/m5x7.ttf` | bitmap-font conversion | user (uploaded 2026-08) |
| `fonts` (display/score) | Daniel Linssen — m6x11plus, managore.itch.io/m6x11 | Free per itch page (as above — credit in Credits) | itch page terms; TTF at `assets-src/fonts/m6x11plus.ttf` | bitmap-font conversion | user (uploaded 2026-08) |

Rules (Master Plan §9): no asset ships without a row here; example/demo media from any
engine or tutorial repo never ships; fonts need their licence text bundled in Credits;
generated credits screen is built from this table.

## 6. Placeholder generation spec (so dev builds are still readable & testable)

Claude Code generates these programmatically at Phase 1 (committed under
`public/assets/placeholder/`, all magenta-tinged):

- Characters: 24×24 capsule bodies, team-coloured shirts, 2 px facing wedge, procedural
  4-dir frame sets (bob/lean baked by script).
- Ball: white circle + moving dot (roll read).
- Arena: flat pitch + line paint + wall strips, district accent colour band.
- UI: 9-slice from flat rects, system-free bitmap font placeholder (a public-domain
  8 px font may be committed early with its licence row filled).
- SFX: jsfxr-recipe-generated blips per family (recipes committed for reproducibility).
- Music: none (silence) — never placeholder music; it poisons feel reads. Crowd bed may
  use a filtered-noise loop generated by script.

This placeholder kit is enough to reach the Phase 2 playable slice with honest feel
testing (per Master Plan: judged milestone builds may NOT use placeholders — Phase gate
reviews use whatever FINAL art exists, and the vertical-slice gate G2 requires final-
direction art for its one minute of content: prioritise `chr-ash`, `chr-juno`,
`chr-bram`, `chr-salt` + `arena-harbor` + core UI + bell/kick/wall SFX + 1 match track).
