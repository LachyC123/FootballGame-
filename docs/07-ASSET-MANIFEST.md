# 07 — ASSET MANIFEST & SOURCING GUIDE

> The complete list of assets v1 needs, what YOU (the human) need to provide or approve,
> what Claude Code can generate as placeholders, and the licensing rules every asset
> must pass before shipping (Master Plan §9 provenance gate).

## 1. How assets get made — the three lanes

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
| *(empty — every row added before the asset's first FINAL merge)* | | | | | |

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
