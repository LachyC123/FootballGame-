# 03 — GAMEPLAY SPEC: THE 3v3 CAGE MATCH

> The match is the product. This spec is implementation-ready: rules, controls, physics,
> feel values and AI. All numeric values are **starting tunings** — tune on device, never
> in an editor-only build (Master Plan §5). Everything here uses Phaser Arcade Physics;
> no external physics engine.

## 1. Match rules ("Cage Law")

| Rule | Value |
|---|---|
| Players | 3 vs 3, no dedicated goalkeeper. Any player may guard the goal. |
| Pitch | Walled cage. **No out of bounds** — walls and fence-tops keep everything in play. No corners, no throw-ins. |
| Goals | Recessed goal mouths in each end wall, small (≈2.5 player-widths). |
| Win condition | First to **3 bells (goals)**, or higher score when the **180 s** clock ends. Tie at full time → next bell wins (golden goal, max +60 s, then shootout of 3 alternating 1v1 breakaways). |
| Kickoff | Conceding team restarts with ball at centre; opponents must be in own half until first touch. |
| Fouls | None. Tackles are always clean by rule; balance comes from tackle recovery time (missed tackle = you're beaten). Shoulder-charge (Ironworks speciality) is legal but staminal. |
| Halftime | Story matches only: brief bark-exchange overlay at first-to-2-or-90 s (whichever first), 2 s, non-interactive. Finale uses it for Vey's adaptation. |
| Restarts after goal | 1.5 s celebration beat (non-blocking VFX + barks) → auto kickoff. Total dead time ≤4 s. |

**Match length rationale:** 3 bells / 180 s keeps sessions in the 2–4 min contract from
doc 01 and makes instant retry painless.

## 2. The pitch (dimensions & camera)

- Logical pitch: **480 × 270 world px** (16:9), walls inset so playable area ≈ 448 × 238.
  This fits ONE SCREEN — **no camera scrolling during matches**. Full-pitch visibility is
  a core readability decision: every pass option is always on screen (and it removes an
  entire class of camera/feel problems on mobile).
- Camera: fixed, with micro-impulses only (shake budget doc §6). HUD in screen space.
- Rendering scale: integer zoom from a 480×270 internal resolution (Phaser `Scale.FIT`,
  `pixelArt: true`, roundPixels). See doc 05 §8.
- Goal mouths: recesses in left/right walls, 40 px opening, 12 px deep. Goal line inside
  the recess; ball fully past line = bell.
- Wall physics zones: 4 wall segments + 4 chamfered corner wedges (45°) so ball never
  dead-stops in a corner — corner wedges always return the ball toward play.

## 3. Entities on the pitch

| Entity | Body | Notes |
|---|---|---|
| Player (×6) | Circle r=5 px, arcade body | Max speed varies by stats; facing = last non-zero move vector (8-way for sprites, 360° for physics). |
| Ball | Circle r=3 px | Bounce 0.82 vs walls, linear drag 0.985/frame when free; **never parented to a player** — possession is a controlled sequence of dribble touches (see §4.2). |
| Goal sensors | Static zones | Overlap → goal resolution in domain layer (single authority; never resolve in a sprite callback). |
| Ball shadow | Visual only | Offset by ball "height" (see §4.5). |

## 4. Core mechanics

### 4.1 Movement

- 360° analog movement (virtual stick / WASD with normalised diagonals).
- Base max speed 85 px/s (stat-scaled ±20%). Acceleration 600 px/s², friction 800 px/s²
  (snappy stop — arcade feel, no ice).
- **Sprint** (hold): ×1.45 speed, drains stamina (see §5). While sprinting, turn rate is
  limited and dribble touches push the ball farther ahead (~10 px instead of ~6 px) —
  sprint dribbling risks losing the ball, on purpose.

### 4.2 Ball truth: possession & dribbling (adopted from the THREEFOLD bible)

The ball is an **independent simulated object at all times** — never parented to a
player sprite, never teleported by an animation. Possession is a controlled sequence of
small touches toward a dribble point. This produces visible looseness while staying
playable, and it is the game's deepest feel investment. Non-negotiable.

**Ball state machine (domain-owned):**

| State | Entry | Update | Exit |
|---|---|---|---|
| `Free` | Kickoff, rebound, deflection, heavy touch, failed control | Velocity, drag, wall restitution every fixed tick | Valid control candidate → `FirstTouch` |
| `FirstTouch` | Player reaches ball inside control radius (8 px) at acceptable relative speed | Velocity damped toward a reception direction over ~0.15 s; under pressure a first touch can miscontrol (Touch stat reduces the chance) | Stable → `Controlled`; intercepted or too fast → `Free` |
| `Controlled` | Possession token assigned by domain | Periodic dribble impulses place the ball ~6 px ahead of movement (+ tiny bobble); sprint lengthens the offset to ~10 px | Pass, shot, tackle, collision, goal or heavy touch |
| `PassFlight` | Pass released with target point + receiver hint | Ground drag; the receiver hint adds control utility but **never magnetises** the ball | `FirstTouch`, `Free`, rebound or goal |
| `ShotFlight` | Shot released | Higher speed; stronger wall/post restitution (0.88); brief control ineligibility | Goal, rebound, or `Free` after speed decays |
| `DeadBall` | Goal beat, pause, restart | Frozen; excluded from possession queries | Kickoff creates a fresh `Controlled` ball |

**Possession resolution rules:**

- **One authority:** only the domain (`MatchCore`) assigns the possession owner.
  Animation callbacks never decide possession, goals or tackles.
- **Candidate score:** distance, facing, relative speed, approach angle, pressure and
  touch immunity. Two qualifiers in the same tick resolve by score; a genuine tie
  produces a loose ball, never arbitrary ownership.
- **Touch immunity:** the kicker cannot reclaim their own pass/shot for ~120 ms unless
  it rebounds off a wall (wall self-passes are intended play).
- **No teleport receive:** the ball must physically enter the receiver's control radius.
  Pass assist only chooses the direction.
- A clean first touch grants 0.15 s tackle immunity ("controlled first touch").
- **No dribbling "moves" or skill buttons** in v1 — beating players is done with angle
  changes, speed changes (sprint toggling) and wall-passes. This is the "no abilities"
  doctrine expressed mechanically.

### 4.3 Passing (button A — PASS / SWITCH)

- With ball: tap = **ground pass** to best teammate in the aimed 120° cone (aim = stick
  direction, or facing if neutral). Pass speed 240 px/s + leads the receiver's movement
  (0.25 s prediction). If no teammate in cone → pass goes to nearest teammate (forgiving;
  never "no-op" on a deliberate press).
- **Contextual through pass (no third button):** if the aimed teammate is sprinting into
  open space, the ground pass automatically becomes a lead pass projected 0.3–0.6 s
  ahead of their run — riskier (may run to a wall or opponent) but attack-creating.
- **Manual aim override:** holding the stick clearly away from every auto-target passes
  to a point on the pitch instead — maximum control, no forgiveness. Wall passes are
  simply manual passes into a wall; there is no special wall-pass state.
- **One-touch pass:** pressing A during the `FirstTouch` window releases the pass off
  the reception frame without settling into control — fast combination play with higher
  aim error under pressure. Free depth on the same two buttons.
- Hold A ≥0.25 s with ball: **lofted pass** — ball gains "height" (see §4.5), travels over
  intervening players, cannot be intercepted mid-flight, worse first touch for receiver
  (0.3 s control delay). Risk/reward vs ground pass.
- Without ball: tap A = **switch control** to teammate nearest the ball (with 0.2 s
  input-carryover so held movement transfers — no ghost stop). Auto-switch also offered
  on interceptions (setting: auto/manual, default auto).
- Input buffered 120 ms: a pass pressed during a first-touch animation fires when legal.

### 4.4 Shooting (button B — SHOOT / TACKLE)

- With ball: press starts **charge** (max 0.6 s), release fires. Power 260→420 px/s by
  charge; accuracy cone narrows as charge grows *until* 0.5 s then jitters if overheld
  (greed penalty, ±6° error). Aim = stick direction blended toward goal-mouth centre
  within 30° (assist, tunable; off in Endless Gauntlet "pure" option).
- Shots have slight height: full-charge shots can rise above intercept height mid-flight
  then drop (allows shooting over a blocker from range; keeps low-charge shots blockable).
- **Wall shots are intended play**: ball retains 82% speed off walls; banked goals count
  and trigger special commentary ("off the sixth man!").
- Without ball: press B = **tackle lunge** — 14 px lunge in facing direction, 0.12 s
  active window. Success (contact with ball, or possessor's ball-side) → clean ball win +
  0.15 s possession immunity. Miss → 0.5 s recovery stumble (beaten). Tackling is
  positional skill, not a stat check.
- **Rear contact never steals cleanly:** a lunge from directly behind the carrier makes
  the tackler stumble and gives the carrier a small protection impulse — fairness
  without a foul/referee system. AI obeys the same rule.
- Shoulder charge: sprint + tackle within 6 px of possessor = body contest; higher
  Strength wins the ball but costs 25 stamina. (Ferra's crew uses this constantly.)

### 4.5 Ball "height" (2.5D lite)

Single scalar `z` with gravity, purely visual+filter: entities can only touch the ball
when `z < 10`. Used by lofted passes, charged shots, wall-top bounces. Shadow stays on
the ground plane and is the player's read of landing spot. No jumping/heading in v1.

### 4.6 Goal & save moments

- Any defender within goal recess gets +30% lateral acceleration ("goalmouth scramble")
  — makes last-ditch blocks feel possible without a keeper role.
- Goal-line clearances and blocks trigger near-miss feedback tier (see §6).

## 5. Stamina

- Pool 100. Sprint drains 18/s; shoulder charge 25 flat; recovery 12/s when not
  sprinting, 20/s when standing still. Below 20: sprint unavailable until 40
  (hysteresis), player sprite shows sweat drip + slower animation.
- AI respects identical stamina rules (fairness is felt).
- Stat `Engine` scales pool 80–120.

## 6. Feel-response matrix (per Master Plan §5 — implement ALL rows)

| Event | Motion/VFX | Camera | Audio | UI/State |
|---|---|---|---|---|
| Pass | Kick pose 2 frames; ball streak 3 px | none | Soft thump, pitch varies ±10% | possession arrow jumps to receiver on arrival |
| First touch | Squash on ball 1 frame | none | Felt tap | control ring pulses once |
| Charged shot release | Recoil pose; muzzle-style dust puff at foot | 1 px impulse | Punchy strike, charge tier layers | charge bar hides instantly |
| Wall bounce | Spark + wall flex 2 px decal | none | Cage rattle (metallic), volume ∝ speed | — |
| Tackle win | Slide dust; ball pops 4 px | 1 px impulse | Cloth scuff + whistle-less "clean" chirp | switch indicator if auto-switch |
| Tackle miss | Stumble frames | none | Whiff | brief desaturate on stumbling player |
| Near miss (shot off frame / line clearance) | Time dilation 0.85× for 0.25 s; graze line | 2 px directional nudge | Crowd "OOOH" + post ping if frame hit | DJ Tide bark |
| **BELL (goal)** | Net ripple, confetti burst ≤40 particles, scorer run cycle | 3 px shake 120 ms | Bell sample + crowd surge + DJ Tide sting | Score flips with slam animation; barks |
| Concede | Brief grey wash 0.3 s | settle | Low drum | kickoff prompt |
| Halftime/whistle | Freeze poses | none | Whistle | overlay |
| Win match | Crew celebration poses on pitch | slow 0.5 s zoom-in (only allowed zoom) | Victory motif | results panel (doc 04 §5) |
| Lose match | Opponents celebrate, crew heads down | none | Muted crowd | instant RETRY focused by default |

Reduced-motion setting: replaces shakes/zoom/time-dilation with flash+outline cues
(Master Plan P8). Never remove information, only motion.

## 7. Controls

### Touch (primary — landscape)

- **Left half of screen: floating joystick** — origin captured on touch, clamp radius
  48 CSS px, dead zone 12%, released cleanly on `pointercancel` (Master Plan touch policy).
- **Right side: two buttons** — A (PASS/SWITCH) lower-right, B (SHOOT/TACKLE) above-right
  of it. Visible size 56 px, **hit region 76 px**, 12 px gap, both inset from screen edge
  ≥ safe-area + 16 px. Hold gestures on the same buttons handle loft/charge.
- Sprint: **drag stick past 80% radius** = sprint (no third button). Setting offers an
  optional dedicated sprint button for players who want it.
- All match input via Pointer Events; multi-touch tracked by pointer ID; `pointercancel`
  clears all held state.

### Keyboard (desktop secondary)

- WASD/arrows move; **J/Z** = A; **K/X** = B; **Shift** = sprint; **Esc/P** = pause;
  **E/Enter** = interact (hub). Remappable post-v1 only (no-go list guard).

### Hub controls

Same stick/WASD movement; A = interact/advance dialogue; B = cancel. Interactables show
a floating prompt icon when in range (24 px radius).

## 8. HUD (match)

| Element | Position | Notes |
|---|---|---|
| Score + clock | Top centre | `H 1–2 A · 1:24`; slams on change; ≤10% viewport height |
| Possession arrow + ring | World-space over controlled player | Highest-priority readability item; team-colour |
| Stamina bar | 24×3 px under controlled player only | Fades when full |
| Charge bar | Radial around controlled player while charging | |
| Barks/toasts | Bottom centre | Never obscures goals; queue max 1 |
| Touch controls | As §7 | Opacity 40%, brighten on press |

## 9. Player stats (light RPG layer — the ONLY numeric progression)

Five stats, range 1–10, affect play ±20% around baselines:

| Stat | Affects |
|---|---|
| **Pace** | Max speed, sprint speed |
| **Power** | Shot speed cap, lofted pass distance |
| **Touch** | Pass accuracy lead, first-touch immunity duration, charge jitter onset |
| **Guard** | Tackle recovery time, shoulder-charge contest, goalmouth scramble bonus |
| **Engine** | Stamina pool & recovery |

- Ash starts 5/5/5/4/5 and gains +1 picks at chapter ends (max 8 in v1 — competence, not
  godhood; matches stay skill-first).
- Teammates have fixed authored spreads expressing identity (Juno Pace 8/Touch 6/Guard 3;
  Bram Guard 8/Power 7/Pace 3; Ivy Touch 8/vision AI bonus/Guard 4; Rui 6s across).
- Opponent crews' spreads defined in `src/content/teams.json` (doc 05 schema).
- Boots/gear from Mabel: exactly one equip slot, +1 to one stat (doc 04 §6). No
  consumables, no stacking.

## 10. AI (the heart of "each crew is a philosophy")

### 10.1 Architecture

Utility-scored state machine per AI player, evaluated at 10 Hz (not per frame), acting
through **the same input interface as the player** (move vector + A/B presses) — AI
cannot do anything the player can't. Shared team blackboard: ball state, possession,
threat map (coarse 12×7 grid of pitch influence).

### 10.2 Individual states

`CHASE_BALL, CARRY, SUPPORT_OFFENSE, MARK, GUARD_GOAL, PRESS, RECOVER, CELEBRATE`

Each state outputs a desired position + action intents. Utility weights come from the
**team profile** so the same code produces all six crews.

### 10.3 Team profile parameters (data-driven, `teams.json`)

| Parameter | Range | Meaning |
|---|---|---|
| `pressAggression` | 0–1 | How many players chase ball carrier |
| `lineHeight` | 0–1 | Defensive depth (0 = parked in goal recess) |
| `passTempo` | 0–1 | How quickly AI releases the ball |
| `riskTaking` | 0–1 | Long shots / lofted passes frequency |
| `physicality` | 0–1 | Shoulder-charge willingness |
| `showboat` | 0–1 | Taunt/delay when winning (Volt FC) |
| `wallUse` | 0–1 | Intentional bank passes/shots |
| `staminaDiscipline` | 0–1 | Sprint budgeting |

### 10.4 Crew profiles (starting values)

| Crew | press | line | tempo | risk | phys | show | wall | stam |
|---|---|---|---|---|---|---|---|---|
| Gulls (Ch1) | 0.9 | 0.5 | 0.2 | 0.3 | 0.3 | 0.1 | 0.1 | 0.2 |
| Spice Runners (Ch2) | 0.5 | 0.6 | 0.9 | 0.4 | 0.1 | 0.3 | 0.4 | 0.6 |
| Cobble Saints (Ch3) | 0.15 | 0.1 | 0.3 | 0.2 | 0.4 | 0.0 | 0.2 | 0.9 |
| Ironworks (Ch4) | 0.6 | 0.4 | 0.3 | 0.6 | 1.0 | 0.1 | 0.3 | 0.7 |
| Volt FC (Ch5) | 0.35 | 0.35 | 0.7 | 0.7 | 0.2 | 0.9 | 0.6 | 0.8 |
| Monarchs (Ch6) | 0.6 | 0.5 | 0.7 | 0.5 | 0.6 | 0.2 | 0.7 | 1.0 |

Difficulty across chapters also scales AI stat spreads and reaction latency
(Ch1: 280 ms reaction; Ch6: 120 ms). **Never** scale by cheating physics.

### 10.5 Teammate AI

Uses the same system with a `supportive` bias: prioritise open passing lanes, make one
run beyond the last defender when Ash carries, track back honestly. Teammate
personality nudges: Juno exaggerates forward runs; Bram auto-covers goal side; Ivy
requests (pings a lane indicator) the highest-value pass every few seconds — a diegetic
hint system.

### 10.6 Finale adaptation (Vey's "boss mechanic")

Track player pattern counters during first half: `wallGoals, soloGoals, passesPerBell,
sprintShare`. At halftime pick the dominant pattern and shift Monarch profile against it
(e.g. many wall goals → `wallUse` defence +, positioning biased to walls; solo dribbles →
`pressAggression` +0.3 on carrier). Surface it through Vey's halftime bark so the player
*feels seen*: "Your wall trick. It's borrowed. Watch." — this is the Blue Lock drama beat
executed with sliders, not superpowers.

## 11. Match flow state machine

`INTRO (cage flyover 2 s + DJ Tide card) → KICKOFF → PLAY ⇄ BELL_SEQUENCE → HALF_BEAT →
PLAY → FULL_TIME → (GOLDEN_GOAL → SHOOTOUT)? → RESULTS`

- Deterministic: fixed-step simulation at 60 Hz accumulator; all randomness through a
  seeded RNG recorded per match (replayable bugs; Master Plan state/time rules).
- Pause legal in any state; suspend (tab hidden) auto-pauses and clamps delta on resume.
- RETRY from results or pause: full domain reset + same seed re-roll, ≤1 s, no reload.

## 12. Training minigames (spec summary — full flows in doc 04 §4)

1. **Shooting Gallery (Netyard):** targets light up in the goal mouth; score by hitting
   lit segment; charge mechanics required for far targets. 45 s. Used in Ch.3 (Ivy test).
2. **Wall-Pass Rally (Kettle):** keep a one-two off the wall going vs a presser;
   combo counter. Used in Ch.2.
3. **1v1 Keep-away (any cage):** survive N seconds vs a single presser inside centre
   circle; teaches shielding & first touch. Used in Ch.2 & Ch.4 gauntlet.

Each minigame reuses match systems 1:1 (no bespoke physics), takes a target score from
quest data, and awards coin + Ledger flavour.
