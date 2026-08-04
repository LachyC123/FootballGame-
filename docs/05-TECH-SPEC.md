# 05 — TECHNICAL SPECIFICATION

> Follows the Master Plan's default route and architecture rules. This doc is the
> contract for how the code is organised; the build order lives in doc 08.

## 1. Stack (pinned at Phase 0 after the device spike)

| Concern | Choice |
|---|---|
| Engine | **Phaser 4** (current stable), WebGL-first, Canvas fallback |
| Language | **TypeScript strict** (`noImplicitAny`, exhaustive unions, no `any` at boundaries) |
| Build | **Vite** from the official Phaser 4 TS template; demo code stripped |
| Physics | Phaser Arcade only |
| Maps | **Tiled** JSON exports, schema-validated at build |
| Tests | **Vitest** (domain/unit) + **Playwright** (Chromium/Firefox/WebKit journeys) |
| PWA | `vite-plugin-pwa` + Workbox at Beta phase, per Master Plan caching plan |
| Audio | Phaser sound (Web Audio). No Howler unless a demonstrated gap appears |
| Deps policy | No other runtime dependencies without a recorded owner/purpose/licence |

## 2. Directory layout (Master Plan project shape, specialised)

```
src/
  app/            main.ts, game config, composition root, scene registry
  domain/         PURE simulation & rules — no Phaser imports allowed
    match/        match FSM, ball/player kinematic rules, goal resolution, stats counting
    ai/           utility scoring, team blackboard, profiles (pure functions)
    progress/     chapters, quests, ledger, economy, save model + migrations
    rng.ts        seeded RNG (mulberry32-style), injected everywhere
  gameplay/       Phaser-side systems binding domain → entities (fixed-step driver)
  presentation/   animation controllers, VFX pools, HUD adapters, camera impulses
  platform/       input (pointer/keyboard → semantic actions), save I/O (IndexedDB),
                  audio bus policy, lifecycle (visibility/orientation), quality governor
  scenes/         Boot, Preload, Title, Hub, Match, Minigame, Dialogue(overlay),
                  Results(overlay), Pause(overlay), Shop(overlay), Settings, Credits
  content/        TYPED data + JSON: teams, characters, items, quests, dialogue,
                  strings, tutorial, arenas; zod-style validation at boot & in CI
  dev/            debug scene launcher, seed replayer, AI visualiser, budget overlay
assets-src/       Aseprite/Tiled/audio sources + export recipes (versioned, not bundled)
public/assets/    generated atlases, audio, map JSON, manifest.json (hashed)
tests/            unit/ integration/ journeys/ visual/
docs/             these documents
```

**Hard rule:** `domain/` never imports Phaser, DOM, or storage. Enforced by an ESLint
import-boundary rule + a CI grep test. This makes match logic unit-testable and
deterministic (seed + inputs → identical result).

## 3. Scene graph & flow

| Scene | Type | Notes |
|---|---|---|
| `BootScene` | system | Read build metadata, saved settings, device caps; ≤1 asset (logo strip) |
| `PreloadScene` | system | Route-based loading: title+hub pack first; match packs per district on demand; progress bar + retry |
| `TitleScene` | screen | First tap = audio unlock; menu per doc 04 §1 |
| `HubScene` | world | Loads district by id; Tiled map, NPC controller, quest triggers |
| `MatchScene` | world | Owns fixed-step driver; parameterised by `MatchConfig` (teams, arena, rules, seed, scripted-events?) — the SAME scene runs story matches, free matches, gauntlet, scrimmage and the flashback (scripted-events hook) |
| `MinigameScene` | world | Thin variant of MatchScene systems with alternate win conditions |
| `DialogueScene` | overlay | Runs above Hub/Match; portrait, typewriter (skippable), 2-choice support |
| `ResultsScene` | overlay | Doc 04 §5 |
| `PauseScene` | overlay | Resume/retry/settings/quit; auto-launched on visibility loss |
| `ShopScene` | overlay | Mabel inventory from `items.json` |
| `SettingsScene` | overlay | Doc 04 §10 |
| `CreditsScene` | screen | Generated licence notices included |

Overlay pattern: Phaser scene stacking (`launch` + input lock below), not DOM — except
Settings sliders and name entry, which may use a minimal styled DOM layer (better a11y
and keyboard focus per Master Plan).

## 4. Simulation model

- Fixed-step accumulator: domain ticks at **60 Hz**, presentation interpolates; delta
  clamped to 250 ms max after suspension (Master Plan state/time rules).
- Single authority: `MatchCore` (domain) resolves possession, tackles, goals, clock —
  Phaser bodies are *moved from* domain state each tick, collisions feed *events into*
  domain, which decides outcomes exactly once.
- All randomness through injected seeded RNG; match seed shown in dev overlay + stored
  in results (bug reports: seed + input log replays the match in `dev/` replayer).
- Typed event bus at boundaries: `matchEvent: BellRung | TackleWon | NearMiss | ...`,
  `storyEvent: FlagSet | QuestAdvanced | ...`. Presentation and audio subscribe;
  domain never knows about them.

## 5. Input pipeline (Master Plan §5 stages)

`sample (Pointer Events, IDs, timestamps) → interpret (stick vector, taps vs holds,
dead zones, hysteresis) → buffer (120 ms action buffer) → resolve (domain consumes
semantic actions on tick) → present (immediate visual ack)`.
Keyboard maps into the same semantic action layer. `pointercancel`/blur/pause clears
ALL held state (ghost-input prevention checklist item).

## 6. Content data schemas (all validated at boot + CI; stable string IDs everywhere)

```ts
// teams.json
Team { id, name, crewName, palette: {primary, trim, pattern}, captainId,
       players: [{ characterId, stats: {pace,power,touch,guard,engine} } x3..5],
       aiProfile: {press,line,tempo,risk,phys,show,wall,stam}, reactionMs }

// characters.json
Character { id, name, pronouns, districtId, portraitKey, spriteKey, bio }

// arenas.json
Arena { id, districtId, name, tilesetKey, dressingLayers, crowdDensity, musicKey }

// items.json
Item { id, name, desc, price, statBonus?: {stat, amount}, chapterGate, flavor }

// quests/chN.json
Chapter { id, title, steps: QuestStep[] }
QuestStep =
  | { type:'TALK',  npcId, dialogueId, setFlags? }
  | { type:'GOTO',  mapId, triggerId, dialogueId? }
  | { type:'FETCH', itemEntityId, toNpcId, timerS?, dialogueId }
  | { type:'MINIGAME', minigameId, targetScore, rewardShells }
  | { type:'MATCH', matchConfigId, winDialogueId, loseDialogueId }

// dialogue/*.json
DialogueNode { id, speakerId|'ASH'|'RADIO', lines: string[],
               choices?: [{ text, next, ledger?: 'ego'|'team', setFlags? }],
               next?, conditions?: FlagExpr }

// npcs/*.json
Npc { id, characterId, mapId, spawn, patrol?, interactions:
      [{ conditions: FlagExpr, dialogueId, once? }] }  // first match wins, top-down

// matchconfigs.json
MatchConfig { id, homeTeamId, awayTeamId(orPLAYER), arenaId, rules: {bells, timeS,
              golden, halftime}, scriptedEvents?: ScriptedEvent[],  // flashback only
              aiAdaptation?: 'vey' }
```

`FlagExpr`: flat AND-list of `flag` / `!flag` strings. Flags are the entire story state:
`ch1.bramRecruited`, `ch5.ruiFound`, `pin.gulls`, etc. Save = flags + counters + inventory
+ stats + settings.

## 7. Persistence

- IndexedDB via a thin promise wrapper (no library): `save` store (versioned snapshot,
  atomic write, keep previous version until commit), `settings` in localStorage for
  pre-boot read (mute/reduced-motion needed before IDB opens).
- `SaveV1 { schemaVersion:1, buildVersion, updatedAt, flags: string[], counters:
  Record<string,number>, stats, lineup, inventory, equipped, shells, chapter,
  matchCheckpoint? }`
- Migrations: pure functions `migrateV1toV2` etc. with fixtures under `tests/`; forward
  one version at a time (Master Plan). Corrupt save → keep diagnostic copy, offer
  "repair (reset to chapter start)" choice.
- Idempotent rewards: every reward grant carries an idempotency key (`questStepId`,
  `matchConfigId+timestampBucket`) checked before commit — background/resume can't
  double-grant (Master Plan platform checklist).

## 8. Performance & platform budgets (inherit Master Plan §10 verbatim)

Key specialisations:
- Internal render 480×270 (match) / camera-scrolled equivalent (hub), integer-scaled;
  effective DPR clamped at 2.0/1.5/1.0 by quality governor tier.
- Single 2048² atlas for match+HUD; one per-district atlas for hub dressing (route
  loading); target texture working set far below the 64 MB cap.
- Object pools: ball trails, dust, confetti, toasts. Particle caps: 40 (goal), 12
  (ambient) — declared per-family with overflow-drop policy.
- Budgets in CI: initial JS ≤1.5 MB compressed; first-play package ≤10 MB; retry ≤1 s;
  P95 frame ≤16.7 ms on baseline devices.
- Mobile platform contract (safe areas, orientation overlay, audio unlock, visibility
  pause, `touch-action` on canvas only) implemented in `platform/` exactly per Master
  Plan §4 checklist — all six checklist items are Phase-1 acceptance criteria.

## 9. Testing strategy (what MUST have tests)

| Layer | Coverage targets |
|---|---|
| Vitest unit | Match FSM transitions; goal/tackle/possession resolution incl. edge cases (simultaneous touch, goal-line, corner wedges); stamina; charge curves; AI utility scoring per profile (property tests: parked-bus profile never leaves own third, etc.); quest engine; flag expressions; Ledger; save migrations; reward idempotency; content validation of ALL shipped JSON |
| Determinism test | Same seed + recorded input script ⇒ byte-identical match result & counters (run in CI) |
| Playwright journeys | Cold load → title → new game → flashback → first drill; full drill run; win a match; lose → retry ≤1 s; pause/resume; backgrounding mid-match; settings persistence; save/continue |
| Visual regression | Title, hub (each district), match kickoff, results, dialogue box — at 3 aspect ratios |
| Device (manual, logged) | Master Plan matrix tiers A/B every candidate build |

## 10. Debug tooling (`dev/`, stripped from production)

- Scene launcher (`?scene=match&config=ch3&seed=123`).
- AI visualiser: state labels, target positions, threat-grid heat overlay.
- Feel tuner: live sliders for doc 03 §4/§6 values, export to JSON diff.
- Seed replayer for bug reports. Budget overlay (frame P95, draw calls, pool stats).
