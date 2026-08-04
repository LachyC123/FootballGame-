# 01 — VISION & GAME CONTRACT

> This document freezes what the game is. Every later document obeys it. Changes here
> require a deliberate decision, not drift.

## 1. One-sentence promise

**Rise from nobody to King of the Cage in Solport's 3v3 street-football underworld —
winning matches with pure skill, and winning people with your story.**

## 2. The one-page game contract

| Item | Contract |
|---|---|
| **Player fantasy** | Compete as a hungry underdog striker in a world that feels *sun-bleached and electric*. |
| **Genre** | Top-down 2D pixel-art arcade football (3v3, walled cage arenas) wrapped in a light story-RPG structure (walkable hub, NPCs, dialogue, chapter quests). |
| **Core loop** | Talk & explore in the hub → take on a challenge → play a 3v3 cage match → win rewards, story beats and team growth → face a stronger crew. |
| **Session shape** | First meaningful input ≤10 s from load. One match = 2–4 minutes. One full story chapter = 20–35 minutes. Instant retry after any loss. |
| **Input grammar** | One movement grammar (left stick / WASD) + two primary context actions (PASS and SHOOT/TACKLE) + one secondary (SPRINT). Nothing else in v1. |
| **Mastery** | Reading the pitch: first-touch direction, wall passes, shot timing/charge, when to sprint (stamina), when to switch player. Mistakes are always visible and explainable. |
| **Replay reason** | Beat every district crew, complete the story, then chase perfect records (clean sheets, unbeaten runs) in Endless Gauntlet mode. |
| **Tone** | Earnest sports drama with warmth and humour. Blue Lock's *intensity of ego and rivalry*, but grounded: no powers, no glowing auras as mechanics (VFX flourish is fine), no dialogue longer than the player's patience. |
| **Platform** | Mobile browser (landscape) first; desktop browser keyboard second. Installable PWA at beta. |

## 3. Six polish pillars (from the Master Plan, made specific)

1. **Immediate** — the ball obeys the player's thumb. Touch-to-action ≤100 ms P95. No
   input ever feels eaten: input buffering on passes/shots, generous tackle windows.
2. **Readable** — at phone size you always know: who you control (arrow + outline), where
   the ball is (shadow + ring), where danger is (opponent proximity flash), where goals
   are. A greyscale screenshot still reads.
3. **Authored** — one palette, one perspective (top-down with slight south-facing bias),
   one outline rule. Solport looks like *one place photographed at golden hour*.
4. **Responsive** — every kick, wall-bounce, goal, tackle and near-miss has layered
   feedback (animation + sound + micro-shake + UI) per the feel-response matrix in
   doc 03.
5. **Trustworthy** — saves after every story beat and match; resume from backgrounding
   mid-match without lost inputs or duplicated goals; offline-capable once loaded.
6. **Ball truth** (adopted from the THREEFOLD bible) — the ball is a separate physical
   object, never glued to feet or teleported by canned animations. A slow-motion capture
   must show every touch, pass, tackle and rebound has a readable physical cause.

## 4. What makes it "its own world" (the Blue Lock lesson, minus abilities)

Blue Lock works because football *is the world*: institutions, philosophy, stakes and
identity all express through the game. We copy that structure, not the powers:

- **Football is Solport's social ladder.** Districts are defined by their crews. Beating a
  crew changes how NPCs in that district talk to you.
- **Every rival has a philosophy, expressed mechanically.** No abilities — instead each
  crew plays a *distinct legal style* (pressing, possession, park-the-bus, physicality,
  counters) driven by AI parameters. You beat their *idea*, not their stat bar.
- **Ego vs. team is the story's spine.** The player character's arc is learning when to be
  selfish (shoot) and when to trust (pass) — mirrored literally in gameplay choices the
  story reacts to (see doc 04 §7, "The Ledger").
- **The cage is theatre.** Crowds on the fences, chalk graffiti, commentary barks,
  district-specific arenas. Small arenas keep matches fast and personal.

## 5. Scope: v1 content box

| Content | Count | Notes |
|---|---|---|
| Story chapters | 6 | Prologue/tutorial + 5 districts (final district = finale). |
| Playable arenas (cages) | 6 | One per district + Royal Cage. Same pitch dimensions, different dressing. |
| Rival crews (full AI teams) | 6 | Gulls, Spice Runners, Cobble Saints, Ironworks, Volt FC, Monarchs. |
| Recruitable teammates | 4 | Juno, Bram, Ivy, + 1 secret (Rui). Player picks 2 to field per match. |
| Named story NPCs | ~14 | See doc 02 roster. |
| Ambient NPCs | ~10 dialogue pools | Market shoppers, dock workers, kids, fans. |
| Hub maps | 6 districts | Small, dense maps (~40×30 tiles each), connected linearly along the waterfront. |
| Training minigames | 3 | Shooting gallery, wall-pass rally, 1v1 keep-away. |
| Modes | Story + Endless Gauntlet + Free Match | Free Match unlocks post-chapter-2. |

## 6. No-go list (protects the quality budget — do not build in v1)

1. **No online multiplayer** of any kind. Local single-player only.
2. **No special abilities, meters, or power shots.** Skill expression only. (A charged
   shot is charging a normal shot, not a fireball.)
3. **No open-world scale hub.** Districts are small stages, not a continuous city.
4. **No branching plot machinery.** Choices flavour responses and feed relationship
   values, tactical promises and the Ledger (doc 04 §7) — which select ending states and
   dialogue variants — but the chapter spine is linear. No choice may be a fake branch:
   every choice changes at least one line, flag or value.
5. **No 11v11, 5v5 or variable team sizes.** 3v3 only, forever, in v1.
6. **No player-created characters/customisation** beyond name entry and boot equipment.
7. **No weather/day-night simulation.** Each district has one fixed, authored time-of-day
   look.
8. **No procedural content.** All matches, quests and maps are authored data.

## 7. Success criteria (measurable, per Master Plan G0)

- A first-time player reaches a playable match within 90 seconds of first load, with no
  external explanation, and can name their goal ("beat the Gulls") afterwards.
- Five-second test: a silent gameplay clip lets a stranger identify the controlled
  player, the objective (score in the far goal), and the threat (opponents).
- A failed match can be retried and back at kickoff in ≤1 s without page reload.
- Chapter 1 completable start-to-finish on an iPhone-class Safari device at stable
  frame rate with the Master Plan's budgets (doc 05 §8).
- Playtesters unprompted mention at least one *character* by name — proof the world
  landed, not just the mechanics.
