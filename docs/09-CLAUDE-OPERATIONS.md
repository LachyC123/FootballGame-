# 09 — CLAUDE CODE OPERATING RULES & READY-TO-USE PROMPTS

> Adapted from the THREEFOLD production bible's agent contract (its strongest section)
> for the Solport Cages docs and phases. These rules govern every working session on
> this repository.

## 1. Non-negotiable agent contract

**CLAUDE MUST:** inspect before changing; implement one player-visible outcome at a
time; preserve architecture boundaries (`domain/` purity above all); write tests; run
the build; report changed files; and stop at the phase gate. Claude must NOT silently
add libraries, alter the control grammar, change the pixel scale or camera model, touch
the save schema, replace the art direction, or broaden scope. Any of those requires a
written decision proposal to the user first.

## 2. Hard rules (checked on every task)

1. Pure domain rules (`src/domain/`) never import Phaser, DOM, storage or audio.
2. All devices (touch/keyboard) map into semantic commands; match rules never read raw
   keys or pointers.
3. **The ball is an independent simulated object and is never parented to a player
   sprite** (doc 03 §4.2). Animation callbacks never decide possession, goals or
   tackles.
4. Deterministic seed behaviour is preserved — no `Math.random()`, no wall-clock time
   in domain code.
5. No generic placeholder shapes/fonts in a judged (gate-review) build. Dev-build
   placeholders stay visibly labelled (doc 07 §6).
6. Asset provenance and licences recorded before merge; example/demo media never ships.
7. Every change to controls, camera, pixel scale, save schema or target baseline gets
   an entry in `docs/DECISIONS.md` (create it on first use).
8. Result/reward commits are idempotent; a resumed lifecycle event can never
   double-grant.
9. One phase branch at a time (e.g. `phase/1-match-core`); small commits that separate
   domain rules, presentation and content data where possible.
10. Every task report states how to revert without corrupting saves.

## 3. Standard task report format (end of every task / phase)

```
## Outcome
What the player can now do or see.
## Changed files
- path: purpose
## Tests and evidence
- command: result
- scenario: result
- screenshot/capture location
## Budget delta
- bundle bytes / route media bytes / frame & object notes
## Known limitations
Only real remaining issues.
## Rollback
Exact commit or files to revert.
## Gate status
PASS / FAIL — do not begin the next phase unless PASS (and never past a MANDATORY PAUSE).
```

## 4. Common failure prevention (from THREEFOLD, kept verbatim in spirit)

| Failure | Prevention |
|---|---|
| Building everything at once | Phase plan (doc 08); every prompt names one outcome and a stop gate |
| Ball becomes glued or scripted | Ball state machine lives in pure domain rules; verify with slow-motion deterministic scenarios (`wall_pass`, `possession_duel`) |
| AI chases ball in a clump | Team shape/blackboard lands before rival profiles |
| Prototype UI survives | Placeholders labelled; slice gate forbids default rectangles/fonts |
| Story logic scatters through scenes | All conditions/effects flow through the domain story engine with validated content IDs |
| Save duplicates rewards | Unique completion IDs + idempotency tests (`result_resume` scenario) |
| Mobile controls break desktop (or vice versa) | Semantic command layer only |
| Scope grows after the slice | Any addition must replace a named feature or content item |

## 5. Ready-to-use prompts

### 5.1 Repository master prompt (paste at the start of a working session)

```
You are the implementation lead for SOLPORT CAGES, a polished single-player 3v3
pixel-football browser game. Read docs/01–09 in this repository before changing code.
Operating rules:
1. Inspect the repo, conventions, package versions and current phase (docs/08) first.
2. Work only on the current phase, one player-visible outcome at a time.
3. Preserve architecture: src/domain/ never imports Phaser, DOM, storage or audio.
4. Map touch and keyboard to semantic commands; match rules never read raw input.
5. The ball is an independent simulated object, never parented to a player sprite.
6. Do not add a dependency, change controls, pixel scale, camera, save schema or scope
   without stopping and writing a decision proposal.
7. Add deterministic tests for authoritative rules and run the production build.
8. No generic placeholder shapes in judged builds; label dev placeholders.
9. Record asset provenance and licences (docs/07 §5); example media never ships.
10. Stop at the phase gate and return the report in docs/09 §3. Do not continue
    automatically past a gate or MANDATORY PAUSE.
```

### 5.2 Phase-start prompt template

```
CURRENT PHASE: [number + name from docs/08]
PLAYER-VISIBLE GOAL: [one outcome]
READ FIRST: [doc sections + exact existing files]
INPUTS: [content IDs, maps, assets, accepted tuning values]
IMPLEMENT: [3–6 bounded tasks, tests last]
CONSTRAINTS: no new dependencies; do not alter [input grammar / save schema / camera /
pixel scale]; authoritative logic stays in domain; preserve seeded determinism.
ACCEPTANCE: [unit tests] + [Playwright journey] + [deterministic scenario] +
[performance or visual proof]
DO NOT START THE NEXT PHASE. Return the docs/09 §3 report and gate status.
```

### 5.3 Bug-fix prompt

```
Fix one bug only.
BUG / BUILD / DEVICE / SEED / REPRODUCTION / EXPECTED: [details]
First reproduce it in the smallest deterministic scenario. Classify the cause as
domain, input, presentation, lifecycle, asset, save or performance. Add a regression
test with the fix. Do not refactor unrelated systems. Return changed files, evidence,
remaining risk and rollback path.
```

### 5.4 Content authoring prompt

```
Author one content unit: [chapter quest step / dialogue scene / match config / promise].
Use only existing schemas (docs/05 §6) and mechanics — do not invent a gameplay system.
Preserve character voice rules (docs/02 §4) and story facts (docs/02 §3).
Deliver: validated data with stable IDs; all conditions/effects and win/loss routes;
string keys, never inline text; asset refs that exist in the manifest; tests for
conditions and completion; one line on the unit's emotional purpose + football lesson.
Not complete until win/loss, re-entry, save/resume and already-seen states work.
```

### 5.5 Art integration prompt

```
Integrate [asset] into the current route without changing gameplay rules.
Before editing: inspect frame sizes, pivots, tags, palette and licence metadata;
compare to docs/06 at actual 480×270 gameplay size.
Implement: manifest entry, animation keys + event markers in data, presentation adapter
only (no authoritative outcomes in animation callbacks), pivot/hit-region debug
overlay, visual baseline capture.
Reject and report the asset instead of forcing it in if it has crop drift, mismatched
pixel density, inconsistent lighting, missing frames, pseudo-text or unclear rights.
```

## 6. Naming conventions (stable IDs; never renamed after a save schema ships)

```
Characters: chr_ash, chr_juno          Teams: team_crew, team_gulls
Match configs: mc_ch1_gulls            Arenas: arena_netyard
Dialogue: dlg_ch3_ivy_test             Flags: flag_ch5_rui_found
Promises: promise_feed_juno            Audio: sfx_bell_01, mus_harbor
Strings: ui.results.retry / dialogue.tero.drill2.001
```
Display names live in strings files and may change freely; IDs may not.
