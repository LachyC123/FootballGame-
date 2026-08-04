# 06 — ART & AUDIO BIBLE

> One visual language, one sonic palette. Any asset — hand-made, purchased, or
> AI-assisted-then-repainted — is rejected if it breaks these rules (Master Plan §6
> anti-generic review applies to every merge).

## 1. Visual identity in one line

**Golden-hour harbour town, chunky confident pixels, football as street theatre.**

## 2. Global rules

| Rule | Value |
|---|---|
| Base unit | 16×16 px tiles; world assets snap to 8 px sub-grid |
| Perspective | Top-down at slight tilt ("¾ RPG view"): fronts of objects visible, tops foreshortened; NO isometric, NO side-view assets |
| Outline | 1 px, coloured (darkest ramp of the fill, never pure black) on characters & ball; environment tiles have no outer outline |
| Palette | ONE master palette ≤48 colours for the whole game (recommend deriving from a published ramp-friendly palette, then locking). District accents are *sub-selections*, not new colours |
| Saturation hierarchy | Gameplay-critical (ball, players, goals, prompts) = most saturated; environment sits 1–2 steps duller. A greyscale screenshot must still show ball & players brightest |
| Light | Global key light from upper-left, warm; shadows are flat single-colour ellipses at 40% opacity, no gradients |
| Animation | Snappy 2-frame anticipation, held keys, 1-frame smears on kicks; NO motion tween on character sprites (frame animation only); UI may tween |
| Dithering | Sparingly, sky/water only |
| Fonts | Bitmap fonts only in-world: one 8 px-height font for HUD/dialogue (e.g. a licensed m5x7/m6x11-class font), one chunky display font for score slams & title. No system fonts visible anywhere |

## 3. Character sprites (match + hub share ONE rig style)

| Property | Spec |
|---|---|
| Frame canvas | 24×24 px (character occupies ~12×18) |
| Directions | 4 (S, N, E; W = flipped E). Match uses 8-way *facing* but 4-way *sprites* with diagonal handled by nearest cardinal — proven readable at this size |
| Palette per character | ≤10 colours incl. outline; kit colours are palette-swap layers (team home/away handled by swap, not new sheets) |
| Pivot | Bottom-centre at ground contact; verified via overlay test |

**Animation set per field character** (tags in Aseprite, exact names):

| Tag | Frames | Notes |
|---|---|---|
| `idle` | 4 | breathing + weight shift |
| `run` | 6 | with ball-carry variant `run-ball` 6 |
| `sprint` | 6 | lean + longer stride |
| `kick` | 3 | anticipation, contact (event frame), follow-through |
| `tackle` | 4 | slide + recover |
| `stumble` | 3 | tackle-miss recovery |
| `hit` | 2 | shoulder-charge reaction |
| `celebrate` | 6 | per-character personality (Juno backflip, Bram shy wave…) |
| `dejected` | 2 | loss state |

Hub-only rigs (Tero, Mabel, Nino, ambient NPCs): `idle` 4 + `walk` 6 only.

**Roster sheet count:** 11 unique field characters (Ash, 4 crew, 6 captains) + 12
generic squadmate variants via palette/hair swap from 3 base bodies + 8 hub rigs.
Portraits: 32×32 busts, 2 expressions each for mains (neutral + emotive), 1 for minors.

## 4. The ball & pitch furniture

- Ball: 8×8 sprite (visual r≈3), 4-frame roll cycle, white/high-value with single accent
  colour; **always the brightest object on the pitch**. Height `z` shown by scale
  (1.0→1.4) + separated shadow ellipse.
- Goals: 48×24 recess pieces per arena, share silhouette, differ in dressing.
- Cage walls: modular 16 px tile strips + corner wedges; per-district dressing layer
  (nets/lanterns/moss/scrap/neon/gold) sits OVER a shared structural silhouette so all
  six cages read as "the same sport, different temple".
- Crowd: 2-frame bobbing silhouette clusters on fence-tops, 3 density tiers (quality
  governor drops to tier 1, never zero on story finals).

## 5. Arenas & hub tilesets

| Asset | Spec |
|---|---|
| Match arena base | One 480×270 composition per district: pitch floor (2–3 ground tile variants + painted lines), walls, goals, crowd band, skyline strip (parallax-lite, 2 layers max) |
| Hub tilesets | Per district: ~48–80 tiles (ground, walls, roofs, props) + 6–10 larger prop sprites (boats, stalls, furnace, screens…) |
| Palette accents | Harbor teal / Market amber / Cobble slate / Foundry ember / Voltside neon / Crown gold — accents only, master palette holds |

## 6. UI art

- 9-slice panel (16×16 corners), chalk-on-board texture motif (Tero's tactics board is
  the UI's fiction). Dialogue box bottom-aligned, portrait left, 3 lines max.
- Buttons: chunky 2 px bevel, pressed state = 1 px down-shift + darken (visible ON
  press, per Master Plan).
- Touch controls: stick base/cap + 2 buttons drawn in-style at 40% opacity.
- Icons: 16×16 set — pin (×6 crew designs), shells, boots, whistle, settings gear,
  audio, quest marker, interact prompt.
- Score slam numerals: dedicated 24 px display font sheet.

## 7. VFX inventory (all pooled, all palette-locked)

`dust-step, dust-slide, kick-puff, ball-streak, wall-spark + wall-flex decal, graze-line,
confetti (goal), net-ripple, sweat-drip, exclaim-ping (Ivy lane hint), bell-flash,
rain-of-pins (finale only)` — each ≤8 frames or ≤40 pooled particles, colours from
master palette only, reserved colours: red-orange = danger/tackle, gold = score/reward,
cyan = interact/prompt. Never cross these reservations.

## 8. Audio palette

### Music (loopable, chiptune-adjacent "chip-and-strings" — chip lead over warm pads)

| Track | Where | Length |
|---|---|---|
| `title` | Title | 60 s loop |
| `harbor, market, cobble, foundry, voltside, crown` | Hub per district | 60–90 s loops, shared motif family ("Solport theme") reharmonised per district |
| `match-early, match-mid, match-final` | Matches by chapter tier | 90 s loops, intensity tiers |
| `match-lastbell` | Any match at match point | 30 s loop layered over current match track (stinger-layer, not track swap) |
| `flashback` | Ch.1 cold open | 45 s, music-box version of Solport theme |
| `results-win / results-lose` | Results | 15 s stingers |
| `credits` | Credits | full Solport theme arrangement |

### SFX families (variant pools of 2–4 samples each, concurrency-capped)

kick-soft, kick-hard (charge tiers), first-touch, wall-rattle (∝ velocity), tackle-slide,
whiff, shoulder-thud, bell (THE signature sound — church-bell-meets-goal-horn, unique
per game not per arena), crowd-bed (loop, 3 intensities), crowd-oooh, crowd-surge,
whistle, UI tap/confirm/back/error, shop purchase, pin-award, dialogue blip (per-speaker
pitch — Tero low, Nino high, Ivy single dry tick), typewriter tick, shell pickup.

### Mix rules (Master Plan §8)

Buses: master/music/gameplay/UI/ambience. Gameplay informational cues duck music −4 dB
for 0.4 s on bell & whistle only. Mute-complete playability is an acceptance test.
Audio unlock on first Title tap; suspended on visibility loss; no queued-sound burst on
resume.

## 9. Asset acceptance checklist (every merged asset)

- [ ] At gameplay size over real background + HUD, approved in a screenshot
- [ ] Master palette only (CI palette-lint on exported PNGs)
- [ ] Correct pivot/tags/naming (`character/state` exact tag names §3)
- [ ] Source file + export recipe committed under `assets-src/`
- [ ] Provenance & licence recorded in `docs/07-ASSET-MANIFEST.md` table
- [ ] Greyscale + colour-blind sim spot check for gameplay-critical assets
