# 04 — GAME STRUCTURE: FLOW, HUB, TUTORIAL, QUESTS, PROGRESSION

> Everything that wraps the match: how the player moves through the game from first tap
> to the credits, and every system outside the pitch.

## 1. Top-level game flow

```
BOOT → PRELOAD → TITLE
TITLE → Continue | New Game | Free Match* | Endless Gauntlet* | Settings | Credits
        (* shown-locked until story unlocks them)
NEW GAME → name entry → Ch.1 cold-open flashback (playable) → Hub (Brine Harbor)
HUB ⇄ Dialogue / Shop / Training / Quest scenes
HUB → Cage entry → MATCH → RESULTS → HUB (story beat)
```

- **First meaningful input ≤10 s:** Title requires one tap (audio unlock, Master Plan
  P7) then New Game goes straight into the playable flashback — no logo parade, no
  lore scroll.
- Every screen transition ≤400 ms, skippable where longer (cage flyover: tap to skip).

## 2. The hub (district maps)

### 2.1 Structure

- Top-down pixel maps, ~40×30 tiles of 16 px (640×480 world), camera follows Ash with
  soft deadzone, clamped to map bounds. (The hub DOES scroll; only matches are
  single-screen.)
- Authored in **Tiled** (Master Plan R14): layers `ground / decor-under / collision /
  decor-over / triggers / spawns`. Logic only in object layers (never in tile art).
- Districts connect linearly: exit gates east/west. Locked gate shows a short gatekeeper
  NPC line stating the requirement ("Spicegate's closed to quiet crews. Get the Gull
  pin.") — requirements always diegetic.

### 2.2 Hub contents per district (authoring checklist)

- 1 cage entrance (match/minigame menu when story allows).
- 2–4 story NPCs with quest/dialogue state machines.
- 3–6 ambient NPCs (pre-win/post-win dialogue pools, doc 02).
- 1 landmark interaction (pure flavour + 1 Ledger line).
- 1 fast-travel signpost (unlocks once a district is cleared; opens district list —
  avoids retread walking; implemented as a simple menu, no map screen in v1).
- Brine Harbor only: Mabel's shop, Tero's netshed (training menu), Ash's room (save
  point flavour — saving is actually automatic, the bed just also heals nothing and
  exists for story scenes).

### 2.3 Hub NPC interaction model

- Walk into 24 px radius → prompt bobs over NPC → A opens dialogue.
- NPC state machine per NPC: `id, conditions (flags), dialogueRef, onComplete flags`.
  All data-driven from `src/content/npcs/*.json` (schema doc 05 §6).
- NPCs idle-wander small authored patrol paths (2–3 waypoints) or stand; they never
  block doorways (collision-excluded from player path bottlenecks).

## 3. Tutorial (Chapter 1 in full detail — implementation script)

Principle (Master Plan onboarding): **teach through successful action, one beat at a
time, prompts disappear after demonstrated mastery.** No text walls; Tero talks in
drills.

### 3.1 Cold-open flashback (scripted match fragment, ~60 s)

1. Fade in mid-match, kid Ash has ball, kid Kairo making a run. Prompt: `MOVE` (stick).
2. Prompt `PASS (A)` with Kairo flashing — **regardless of input**, Ash's animation
   shoots instead (scripted override, the only time input is overridden in the game —
   it IS the story beat). Shot clangs the frame, opponents counter, bell against, crowd
   silence, smash to title card. (Players later realise the controls always worked —
   Ash didn't.)

### 3.2 Netyard drills (each ≤45 s, each = one mechanic, Tero VO via dialogue boxes)

| Drill | Teaches | Pass condition | Prompt retirement |
|---|---|---|---|
| 1. "Walk it off" | Move + sprint + stamina | Reach 3 cones; sprint gauge shown once emptied | Move prompt never shown again |
| 2. "The honest pass" | Ground pass + switch | 6 completed passes with Bram | A-prompt retired after 3 clean |
| 3. "Sixth man" | Wall pass | 3 wall-bank passes to self | |
| 4. "Ring it" | Shot + charge | Score 3, one must be full charge | Charge UI explained once |
| 5. "Take it back" | Tackle + recovery | Dispossess Juno twice (she taunts) | |
| 6. Scrimmage | Everything | First to 2 vs Tero's drills team (Salt guest-stars) | All prompts off |

- Drills are replayable forever from Tero's netshed ("Training") with coin micro-rewards
  first time only.
- A returning player (save exists) can skip straight past any drill via Tero dialogue
  choice ("I remember." / "Run it again.").
- Contextual reminder system: if the player hasn't used a mechanic where it's clearly
  optimal (e.g. 0 wall passes by Ch.3), Nino delivers ONE gentle diegetic reminder line.
  Max one reminder per mechanic per chapter. Tracked in save flags.

## 4. Quest system

- Linear chapter quests only (no side-quest log sprawl): the current objective is always
  a single line under the clock in the hub HUD ("Find Ivy in the cloister") + Nino will
  restate it if talked to (he's the walking quest log — diegetic).
- Quest step types (engine supports exactly these five, all data-driven):
  1. `TALK` — speak to NPC (optionally with required flag).
  2. `GOTO` — reach trigger zone.
  3. `FETCH` — pick up item entity, deliver to NPC (timer optional, no fail — timer
     only flavours dialogue).
  4. `MINIGAME` — launch training minigame with target score.
  5. `MATCH` — story match with teams + rules ref.
- Quest data schema in doc 05 §6. Chapters are quest lists; completing the list's MATCH
  step advances the chapter.

## 5. Results & rewards screen (post-match)

Order: scoreline slam → stat strip (bells, shots, wall-bells, passes, tackles — the
counters the Ledger and Vey-AI also use) → rewards (coin, pin on story wins) → buttons:
`CONTINUE` (story) / `RETRY` (focused by default on loss) / `HUB`.
Everything skippable with one press. Total non-interactive time ≤3 s.

## 6. Economy & shop (deliberately tiny)

- **Coin ("shells")** from: story wins (60–150), minigame first-clears (20), Free
  Match wins (15), Endless Gauntlet milestones. No grind needed to finish story.
- **Mabel's shop stock:** 10 boots/items, each +1 to ONE stat when equipped (one equip
  slot per character, swap freely outside matches). Prices 50–400 shells, gated by
  chapter. Two flavour items (Nino's headband, Tero's old whistle) with no stats —
  pure story tokens that NPCs comment on. That's the whole economy; no upgrades tree,
  no currencies beyond shells (no-go list).

## 7. Story reactivity: the Ledger, relationships & tactical promises

*(This section merges the THREEFOLD bible's relationship model and tactical-promise
system into Solport's diegetic Ledger wrapper. It is the game's entire reactivity
machinery — nothing else branches.)*

### 7.1 The Ledger (diegetic wrapper)

Nino keeps a notebook ("the Ledger") tracking play-pattern totals the match already
counts: solo bells, assisted bells, wall bells, tackles, passes, promises kept. All
reactivity below is *presented* through the Ledger — Nino reading it aloud, teammates
arguing with it — never through HUD meters or "+1" popups.

### 7.2 Relationship values (stored in save; never shown as numbers)

| Value | Range | Increases when | Decreases when | Visible consequences |
|---|---|---|---|---|
| **Juno Trust** | −3..+5 | Return her passes, keep promises to feed her runs, back her without indulging her ego (Ch.2 beat) | Take every shot after promising combination play; dismiss her "delivery girl" wound | Celebration variants, optional night-market scene, ending state |
| **Bram Trust** | −3..+5 | Let him defend his way, support the Foundry reunion scene, calm responses after errors | Blame him for conceding; mock his gentleness | More honest scenes, stronger defensive call-outs, ending state |
| **Ivy Trust** | −3..+5 | Follow her lane pings, acknowledge her reads, respect her Saints history | Ignore three pings in a match she flagged; trivialise her notebook | Better ping quality (authored, not stat), ending state |
| **Harbor Bond** | 0..6 | Help district NPCs, complete kids' drills, choose community language in choices | Treat Solport as a stepping stone in choices | Hub decorations, crowd density at finals, epilogue state |
| **Self-Image** | −2..+4 | Ambition statements, accepting Kairo's framing, chasing records | Collective language, admitting uncertainty | Not good/bad — changes finale narration and Kairo scenes |

Rules (adopted verbatim from THREEFOLD): teammates never sabotage the player and low
trust never degrades core control responsiveness — it changes dialogue candour, optional
scenes and endings only. No fake branches: every choice changes at least one line, flag
or value. Values move through authored scene effects, not farmable conversation loops.

### 7.3 Tactical promises

Before selected story matches, a teammate asks for a concrete behaviour. The promise is
tracked through semantic match events the domain already emits, reported in the results
stat strip and the post-match scene, and moves that teammate's trust. Promises encourage
varied play but must never require throwing the match.

| Promise (asker) | Tracked events | Kept when |
|---|---|---|
| "Feed my runs" (Juno) | `throughPassAttempted`, `passReceivedBy:juno`, `shotAfterPass` | Create 2 real Juno chances, regardless of goals |
| "Hold the middle with me" (Bram) | `distanceFromAnchor`, `centralTurnover`, `successfulRecycle` | Stay in shape for 60% of settled possessions + 2 recycles |
| "Use the sixth man" (Ivy) | `wallPassCompleted`, `wallBell` | Complete 3 wall passes |
| "Take responsibility" (Tero, finale) | `playerShots`, `finalThirdTouches` | Attempt 3+ sensible shots (blocked desperation shots don't count) |

Promise progress appears on the pause screen only — never a permanent objective panel
during play. Max one active promise per match.

### 7.4 Ending selection (doc 02 Ch.6 has the scene content)

The finale is the ONE match that can be lost with the story continuing. Ending state is
selected from: finale result + average crew Trust + Harbor Bond + Self-Image:

| Ending | Conditions |
|---|---|
| **The Sixth Man** | Won; high crew Trust; high Harbor Bond |
| **King of the Cage** | Won; high Self-Image; lower Harbor Bond |
| **Empty Crown** | Won; low crew Trust — the cage is saved, the crew fractures; post-game scenes can repair it |
| **Next Season** | Lost; any values — the district rallies, the crew rebuilds; hopeful, not a failure screen. Unlocks a "run it back" finale rematch |

Implementation: a handful of integer comparisons + dialogue variant keys. Still no
branching plot machinery.

## 8. Modes

| Mode | Unlock | Description |
|---|---|---|
| **Story** | default | Chapters 1–6 as above. |
| **Free Match** | Ch.2 aftermath | Pick any unlocked cage + any beaten crew as opponent + your lineup. Rewards shells. Difficulty selector (Relaxed/Standard/Sharp = AI reaction scaling). |
| **Endless Gauntlet** | Post-credits | Ladder of crews with escalating AI profiles/mixes and win-streak tracking; leaderboard is **local only** (no-go: no online). Rui/Kairo cameo teams appear at streaks 5/10. |

## 9. Save system (player-facing behaviour; tech in doc 05 §7)

- **Autosave only**, at: chapter beats, quest step completion, match results, shop
  transactions, settings changes. Save icon pulse (top-right, 0.5 s) whenever committed.
- One profile slot in v1 + "New Game" with overwrite confirmation (explicit destructive
  confirm). Mid-match suspension stores a match checkpoint (score, clock, seed) so a
  killed tab resumes at last kickoff, never mid-rally (prevents dupe-goal states).
- Save versioned + migrated per Master Plan persistence contract.

## 10. Settings (v1 exact list)

Audio: master / music / SFX sliders, mute toggle.
Controls: auto-switch on interception (on/off), dedicated sprint button (off/on),
left-handed mode (mirror touch layout), invert switch behaviour (nearest vs last).
Video/feel: reduced motion, screen-shake slider (0–100), high-contrast ball ring.
System: language (en only v1, key-ready), reset save (double confirm), credits,
version + licences.

## 11. Accessibility commitments (v1, from Master Plan baseline)

- Reduced-motion profile (doc 03 §6). Shake slider.
- Colour-blind-safe team palettes: teams differ by *value and pattern* (home crew wears
  banded socks/trim), plus always-on controlled-player ring; verify with simulation.
- All gameplay-critical audio has a visual twin (bell = score slam; whistle = overlay).
- Touch targets ≥48 px CSS with expanded hit regions (doc 03 §7).
- Text: minimum 12 px equivalent at 100% UI scale; UI scale option post-v1 only if
  budget allows — font chosen for small-size legibility (doc 06).
- Tutorial completable without sound, without sprint, and with auto-switch on.
