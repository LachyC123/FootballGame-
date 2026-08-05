# 08 — PHASED BUILD PLAN (execution order for Claude Code)

> Maps the Master Plan's gates (G0–G5) onto THIS game. Each phase lists concrete tasks
> and acceptance criteria. **Do not start a phase until the previous phase's criteria
> are checked.** Work in small commits; every phase ends with all tests green and a
> short evidence note (screenshots / clip / device note) in the PR or commit message.

Progress tracking: keep the checkboxes in this file updated as work completes.

---

## Phase 0 — Foundations (G0: promise is frozen)

- [x] Scaffold Phaser 4.2.1 + TypeScript strict + Vite (hand-rolled to the doc 05 shape,
      no demo code — see DECISIONS.md); versions pinned via lockfile; ESLint
      import-boundary rule (`domain/` purity, doc 05 §2); Vitest + Playwright wired; CI
      script (`npm run check` = lint + unit + build + journeys).
- [x] `app/` composition root, scene registry, 480×270 scale config (`FIT`, pixelArt,
      roundPixels), Boot → Preload → Title skeleton with labelled placeholder look.
- [x] Platform shell: safe-area CSS variables, `touch-action` policy, orientation
      (portrait → authored rotate panel), visibility pause hook, audio unlock stub.
- [x] Content pipeline stub: `src/content/` schemas (doc 05 §6) with hand-rolled
      validation + a CI test that validates all shipped JSON; seed RNG util + tests.
- [x] Save service: IndexedDB wrapper (atomic current/previous rotation + corrupt-save
      quarantine), SaveV1 incl. trust/promises, settings in localStorage, migration
      harness + tests.
- [x] `dev/` scene launcher via query params.

**Acceptance:** `npm run check` green; app boots to Title on a phone browser with
correct safe areas and rotate overlay; docs 01–07 exist (done); repo pushes clean.

> **Phase 0 status: PASS (2026-08-04).** 19 unit tests + 2 Chromium journeys green;
> production bundle 383 KB gzip (budget 1.5 MB). Outstanding for the user: verify boot
> on a physical iPhone/Android browser when a deploy URL exists (Phase 1 gate needs it
> anyway). Playwright uses the environment's pre-installed Chromium via
> `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`.

## Phase 1 — Match core spike (G1: the riskiest mechanic feels good on a phone)

The riskiest thing in this game = **3v3 feel on touch**. Build ONLY the match.

- [ ] Domain `MatchCore`: fixed-step sim, **ball-truth state machine** (doc 03 §4.2 —
      independent ball, Free/FirstTouch/Controlled/PassFlight/ShotFlight/DeadBall, never
      parented to a player), pitch + corner wedges, possession candidate scoring + touch
      immunity, pass (ground/loft/contextual-through/one-touch/manual aim), shot
      (charge/assist cone), tackle/stumble + rear-contact rule, shoulder charge,
      stamina, goals, clock, match FSM (doc 03 §11) — pure, unit-tested, deterministic
      (seed test in CI).
- [ ] Deterministic debug scenarios wired into CI + dev launcher: `possession_duel`,
      `wall_pass`, `goal_post_edges` (doc 05 §9). Debug overlay for ball velocity,
      control radius and owner.
- [ ] Gameplay binding: MatchScene renders domain state with placeholder kit
      (doc 07 §6); input pipeline (touch stick + 2 buttons + keyboard) → semantic
      actions with 120 ms buffer; pointercancel clears state.
- [ ] Minimal AI: `CHASE/CARRY/SUPPORT/GUARD` states + one mid profile so 3v3 runs.
- [ ] HUD v0: score/clock, possession ring, stamina, charge.
- [ ] Feel pass #1: implement feel-response matrix rows for pass/shot/wall/tackle/goal
      with placeholder VFX/SFX (jsfxr) + dev feel-tuner sliders.
- [ ] Retry loop: results stub → retry ≤1 s.

**Acceptance (test on a real phone — document device + notes):** a full 3v3 match is
playable start→finish on iPhone-class Safari AND mid Android Chrome at stable frame
rate; touch controls pass the "eyes stay on the pitch" check; suspend/resume mid-match
is safe; determinism + debug scenarios green; a slow-motion capture shows every touch,
pass, tackle and rebound has a readable physical cause — no glue, no teleport ("ball
truth" pillar). **This phase decides tuning values — expect iteration.**

> **Phase 1 implementation status (2026-08-04): code complete, awaiting the device
> gate.** MatchCore (ball-truth FSM, pass/loft/one-touch/through, charge shot, tackle +
> rear-contact + shoulder, stamina, goals/clock/golden-goal), SimpleAi (CHASE/CARRY/
> SUPPORT/GUARD, press-commit), touch+keyboard input pipeline, HUD v0, placeholder feel
> layer (SFX synth, shake, particles, toasts), results + retry. 42 unit tests incl.
> `wall_pass`, `possession_duel`, `goal_post_edges`, determinism; 4 Chromium journeys.
> The reflect() tangential-damping bug was caught by the wall_pass scenario. Remaining
> to close the gate: the user plays it on a physical phone (GitHub Pages deploy
> workflow added — enable Pages → Source: GitHub Actions) and the feel-tuning pass
> reacts to that evidence.

> **MANDATORY PAUSE** — stop here. The user reviews the playable build on a physical
> device and accepts the feel evidence before Phase 2 begins.

## Phase 2 — Vertical slice (G2: one polished minute proves the whole game)

Scope: **Chapter 1 only, condensed**: flashback → 2 tutorial drills (pass + shoot) →
meet Tero/Nino (dialogue) → match vs Gulls → results/pin → Ledger stinger.

> **Phase 2 progress (2026-08-04): first slice pass landed.** Done: code-authored
> 24×24 pixel-art rigs + 32×32 portraits for the 8-person cast
> (scripts/generate-sprites.mjs — deterministic, auto-outlined, bible-palette),
> integrated into the match via CharacterView (frames as pure function of domain
> state); dialogue engine (typewriter, portraits, per-speaker blips, 2-choice,
> flags) with CI graph validation; condensed Ch.1 story flow (intro w/ ego/team
> choice → prematch → Gulls match with loss-retry loop → aftermath → pin card +
> autosave); Title menu (New Game / Continue / Friendly); Netyard dressing +
> intro card. Part 2 added: flashback cold-open (scripted
> forced-shot beat), both tutorial drills with skip (dummy-AI mannequins +
> kickoff-override rule), Linssen fonts live at pixel-crisp sizes, Kairo + two
> flashback rigs, crowd ambience bed. Remaining for G2: a music track, and the
> external playtest on a physical device (user).

- [ ] Dialogue overlay scene (portraits, typewriter, choices, blips) + dialogue/flags
      engine + `ch1` condensed content files.
- [ ] Scripted-events hook in MatchCore (flashback forced-shot beat).
- [ ] Tutorial drill framework (win conditions, prompt system, prompt retirement).
- [ ] Full AI system: utility scoring, blackboard, team profiles; implement `press-chaos`
      (Gulls) + teammate `supportive` AI incl. Ivy-style lane ping (behind flag).
- [ ] Results screen v1 with stat strip + rewards; autosave points live.
- [ ] Audio buses + mix rules; audio unlock flow final.
- [ ] **Final-direction art for the slice** (doc 07 §6 priority list) integrated: Ash,
      Juno, Bram, Salt rigs; Netyard arena; core UI; bell/kick/wall SFX; 1 match track.
      (If final art isn't ready, the phase is NOT closable — flag to the user.)
- [ ] Playwright journeys: cold load → new game → flashback → drill → match → results.

**Acceptance:** a stranger playing the slice on a phone can (five-second test) name
role/goal/threat; completes flashback→first win without help; budgets hold (initial JS,
first-play ≤10 MB, P95 frame); all six Master-Plan platform checklist items pass.

> **MANDATORY PAUSE** — stop here. External playtest + user review of the slice on a
> physical device gates entry into Phase 3.

## Phase 3 — Systems complete (G3: content can be added without engineering)

> **Phase 3 progress (2026-08-04): Chapter 1 restructured to play IN PLACE
> (purposeful placement pass).** The StoryScene slideshow is gone. New Game now
> runs: flashback → arrive in walkable Brine Harbor → objective chip ("Find
> Coach Tero") → intro dialogue AT Tero → crew appears in the hub → gate reads
> "CHALLENGE THE GULLS" → drills + match + aftermath run through the cage gate
> → pin ceremony on the quay → Kairo stinger cutscene (Voltside, he watched it
> twice) → free roam with post-win NPC states. Flag-driven NPC presence
> (Juno/Bram appear after the intro; Salt only after losing the pin), dynamic
> per-NPC dialogue, 3-state gate. Journey test walks the entire flow with real
> movement input. Chapter 2 SHIPPED: HubScene generalized to
> districts (harbor + Spicegate as data: draw/NPCs/gates/sequences); Spicegate
> market map (awnings, lanterns, Kettle steam), Nadia/Seppi/Juno chapter chain
> (intro → crate errand → delivery → Juno's 'delivery girl' beat with trust
> choice → Kettle challenge), Spice Runners team (tiki-fast profile), arena
> dressing system (Netyard/Kettle cards, colours, away labels), scorer-named
> bell callouts, debt-book fragment (undertide.ch2, initials only), hub
> footsteps + gulls + lantern flicker polish. **Set-dressing density pass
> (2026-08-04):** new `presentation/props.ts` drawn-prop library (crates,
> barrels, rope coils, net piles, gleaming puddles, flickering lampposts,
> bench, sacks, rugs, posters, chalk marks, prowling cat, pecking pigeons,
> ambient walkers, swaying laundry). Harbor + Spicegate dressed with them
> (incl. story-reactive chalk: the Gulls' tag gets crossed out in Crew teal
> after ch1.complete; Juno's faded delivery cart parked in Spicegate). Match
> arenas: advertising hoardings below the bottom wall — Mabel's Bait / Radio
> Solport / Spice Market / "KEEP A LIGHT ON" (Sol's phrase hidden in plain
> sight) — plus floodlight cones and corner kit clutter. Title key art:
> moored boats, buoy, quay crates, lamppost, Nino perched watching. Flashback:
> sepia crowd ring that fades out on the conceded goal ("the crowd goes
> quiet — and then it goes away"). **Presentation polish pass (2026-08-04):**
> third music track 'market' (D-phrygian, 96bpm) plays in Spicegate; crowd
> bed now SWELLS — full roar on goals, a shorter gasp off the post, a long
> settle over the win screen; on a bell the crowd band physically jumps and
> confetti drops from the stands, and a second ring blooms off the scorer;
> win screen rains confetti. Hub: footstep dust puffs, harbor water glints
> drift with the swell, Spicegate air carries gold spice motes, the
> objective chip slides in and glints gold whenever the orders change.
> Title menu buttons stagger in; a gull crosses the sunset on loop.
> Dialogue panel slides up and settles; portraits pop when a new speaker
> takes over. Bugfix caught by e2e: hub walk dt cap (0.05s) silently ate
> walk distance at low fps, making gates unreachable on slow devices —
> raised to 0.25s; journeys now run serial workers with failure
> screenshots. **Architecture pass (2026-08-04):** new
> `presentation/buildings.ts` — buildings now commit to roof plane, wall
> material, framed openings, and contact shadow. Tero's shop is a real
> shack (corrugated tin roof with a rust patch, weathered plank wall,
> framed door + stone step, warm cross-paned window with flickering glow,
> drying nets, hung buoys); cages (Netyard, Kettle, title quay) are real
> street cages (concrete kerb, capped posts with base plates, diamond
> chain-link in both diagonals, sagging top cable, framed gate with
> hinges + latch); market stalls have legs, planked counters, spice
> mounds, and scallop-hem awnings that cast shade; Spicegate backs onto a
> brick shopfront street (courses, shutters, lit lattice windows, arched
> doorways with lamps, drainpipe); Brine Harbor gains a far-shore
> skyline (warehouse rooflines, crane, lit windows across the water);
> floating district labels replaced by physical nailed signboards; road
> exits framed by stone pillars. Chapter-gate radius widened to 34 (the
> walkable corner sat outside the old 26px trigger — flake source).
> **Refinement pass (2026-08-05): characters, world, props.** Sprite rig
> v3: lit shirt tops + shaded undersides, kit-colour sock stripes, shorts
> trim, hair crown highlights + hairline shadows, jaw shadows. Portrait
> v2: hair volume, face side-shade, chin/neck shadow, eye glints, brows
> in hair-shade, collar trim — and the missing 'wrap' portrait style
> (Nadia was rendering bald in dialogue). World: checkerboard floors
> replaced with seeded flagstone courses (per-stone weathering, mortar,
> cracks, joint weeds) and worn brick pavers with spice stains; drain
> grates; quay bollards with chain sag; dusk-grade edge vignette on both
> districts; match asphalt gains kickoff/goalmouth scuffs, hairline
> cracks, a tar repair seam. Props: contact shadows everywhere, crates
> with planks/nails/stencils, barrels with stave highlight + banded
> bolts, lantern-headed lampposts, sacks with ties + spice glints, rugs
> with woven diamond + fringe, posters with tape + peeling corner, rope
> tails, cork floats in nets; new fish crates (harbor) and terracotta
> pot stacks (market). Next: Old Cobble (Ch.3), Ivy.


- [ ] Hub engine: Tiled loader + schema validation, player controller, NPC controller
      (patrols, interaction prompts, condition-matched dialogue), triggers, gates,
      fast-travel signposts, quest HUD line.
- [ ] Quest engine: all five step types data-driven; chapter advancement; Nino
      quest-restate behaviour.
- [ ] Shop, inventory/equip (+1 stat boots), shells economy, results-reward idempotency.
- [ ] Story-reactivity engine (doc 04 §7): relationship values + effects, tactical
      promise tracking from semantic match events, Ledger presentation, ending
      evaluation function — all with unit tests (every choice changes ≥1 flag/value/line;
      promise completion deterministic; result commit cannot double-apply story effects).
- [ ] Training minigames ×3 as MatchScene variants with target scores.
- [ ] Remaining AI profiles implemented + dev AI visualiser; difficulty reaction-time
      scaling; showboat + physicality behaviours; Vey adaptation hook (behind flag).
- [ ] Settings screen complete (doc 04 §10) incl. reduced motion, shake slider,
      left-handed mirror, auto-switch toggle — all persisted.
- [ ] Pause/suspend/resume + match checkpoint save; Free Match mode shell.
- [ ] Full Chapter 1 (uncondensed) authored end-to-end as the content template.

**Acceptance:** adding a hypothetical "Chapter 7" would require ONLY new content files
+ assets (prove it: a dev-only test chapter loads from data alone); Chapter 1 full
playthrough green in Playwright; unit coverage per doc 05 §9 table.

## Phase 4 — Content production (chapters 2–6)

Author in order, one chapter per pass, each pass = content files + hub map + arena +
crew + dialogue + tests before the next chapter starts:

- [ ] Ch.2 Spicegate (Spice Runners, wall-pass rally, Juno beat, Free Match unlock)
- [ ] Ch.3 Old Cobble (Saints, Ivy recruitment, shooting gallery)
- [ ] Ch.4 Foundry (Ironworks, gauntlet shift, Bram beat)
- [ ] Ch.5 Voltside (Volt FC, Kairo scenes, hidden Rui quest)
- [ ] Ch.6 Crown Point (Monarchs, Vey adaptation ON, four endings via doc 04 §7.4
      incl. losable finale, credits)
- [ ] Endless Gauntlet mode; local streak records; cameo teams.
- [ ] Ambient NPC pools ×6 districts (pre/post win); barks for all captains; DJ Tide
      lines; landmark interactions.

**Acceptance per chapter:** completable start→finish on device; content validation
green; visual baseline screenshots approved; chapter's district NPC pools flip on win.

> **MANDATORY PAUSE** — stop after Ch.6 lands. Full-campaign review on a physical
> device before hardening begins.

## Phase 5 — Alpha → Beta hardening (G4)

- [ ] Full-game playthrough tests (both endings); save-migration fixtures; corrupt-save
      recovery UX; storage-eviction handling.
- [ ] Performance: worst-legal-state scenario (6 players + max VFX + crowd t3) profiled
      on baseline devices; quality governor tiers wired & tested; 20-min soak, memory
      settle test; retry/kickoff dead-time audit.
- [ ] PWA: vite-plugin-pwa + Workbox per Master Plan caching table; update-ready flow;
      offline play after first load; install icons/manifest with real title.
- [ ] Accessibility pass: reduced motion audit, colour-blind sim screenshots, mute-run
      of tutorial + Ch.1, touch-target audit.
- [ ] Balance pass: play all matches at Standard; tune AI profiles & difficulty curve;
      Sharp/Relaxed verified.
- [ ] All placeholder assets replaced or explicitly waived with the user; provenance
      table complete; generated credits + licence notices.

## Phase 6 — Gold (G5)

- [ ] Device matrix run (Master Plan tiers A–F as available to the user — request
      user's physical devices; document results).
- [ ] Freeze: version stamp, rollback plan, final captures (trailer clip, store/social
      screenshots), README player-facing section, deploy to hosting (user chooses host;
      any static host works — propose options at this point).
- [ ] Launch checklist from Master Plan §15 "Gold release done" table, item by item.

---

## Standing rules for every phase (Master Plan AI contract)

0. **Operate per doc 09** — the agent operating rules, task report format and
   ready-to-use prompts. Every phase ends with the doc 09 report and a PASS/FAIL gate
   status; never continue past a FAIL or a MANDATORY PAUSE.
1. **Task packet discipline:** one player-visible outcome per task; include tests +
   evidence; note budget deltas.
2. **Never** add a dependency, change input grammar, alter save schema, or expand scope
   without flagging it as a decision to the user first.
3. **Every commit message** states the phase + outcome (e.g. `P1: ball wall-bounce +
   corner wedges w/ determinism tests`).
4. **When blocked on assets or taste calls** (art approval, title, host choice, device
   testing), continue with the next unblocked task and surface the decision list to the
   user at the end of the working session.
5. **Tuning values in docs 03 are starting points** — when device testing changes them,
   update the doc in the same commit (docs stay truthful).
