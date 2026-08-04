# 02 — WORLD, STORY & CHARACTERS

> All narrative content for v1. Dialogue samples here set the voice; final dialogue lives
> in `src/content/dialogue/*.json` and must match these voices. Nothing in this document
> requires mechanics beyond doc 03/04.

## 1. The world: SOLPORT

Solport is a crescent-shaped harbour city on its own — no named country, no real-world
references, its own flags, radio station and slang. Trade built it; football owns it.

**The founding myth (told by NPCs in fragments):** dock workers with one ball and no
pitch welded the first cage from shipping-container frames a hundred years ago. Now every
district has its cage, every cage has its crew, and once a generation the crews climb
**the Gauntlet** — a challenge ladder ending at the **Royal Cage** on the cliff, home of
the **Monarchs**, undefeated for 19 years.

**Rules of the world (players learn these through play and NPCs, never a lore dump):**

- **Cage law:** 3v3, walls in play, first to 3 goals or best score after 3 minutes.
  Winner takes the loser's *pin* (a crew badge). Pins are reputation.
- **The Gauntlet:** to challenge a district crew you need the previous district's pin.
  To challenge the Monarchs you need all five.
- **Slang:** a goal is a "bell" ("rang three bells on 'em"), a nutmeg is a "keyhole",
  the cage walls are "the sixth man", losing your pin is "going quiet".
- **Radio Solport** — commentary/announcer voice used in match intros and hub ambience
  text ticker. One personality: **DJ Tide** (text-only, no VO in v1).

### Districts (hub maps, west → east along the waterfront)

| # | District | Look / palette accent | Identity | Cage |
|---|---|---|---|---|
| 1 | **Brine Harbor** | Rusted teal, rope, gulls, crates | Fishing docks, the player's home turf | **The Netyard** — cage draped with old fishing nets |
| 2 | **Spicegate Market** | Awning reds/oranges, lanterns | Bazaar chaos, fastest talkers in Solport | **The Kettle** — cage in a courtyard, always steaming from food stalls |
| 3 | **Old Cobble** | Grey-blue stone, moss, chapel bell | Oldest district, tradition, silence | **The Yard** — chalk-line pitch inside monastery walls |
| 4 | **The Foundry** | Iron black, furnace orange sparks | Steelworks, shift whistles, muscle | **The Crucible** — cage of welded scrap, floor plates ring when the ball bounces |
| 5 | **Voltside** | Night district: neon magenta/cyan | New money, screens, style over everything | **The Grid** — glass-walled rooftop cage under floodlights |
| 6 | **Crown Point** | White stone, gold light, sea cliff | Seat of the Monarchs; half museum, half fortress | **The Royal Cage** — the original container-frame cage, restored |

Each district hub map contains: the cage (match entry), 2–4 story NPCs, 3–6 ambient
NPCs, one landmark interaction (flavour), and a connection gate to the next district
(locked until that chapter unlocks).

## 2. Main cast

### The player — **ASH** (name re-enterable at new game; "Ash" is default)

17, grew up in Brine Harbor, left for three years after a public humiliation (see
Chapter 1), just returned. Quiet until the whistle. The story tests one question:
*does Ash play to prove people wrong, or to win with people?* Silent-ish protagonist:
short chooseable reply lines (2 options, flavour only), never long speeches.

### The crew (recruitable teammates — each has stats in doc 03 §9)

| Character | Role on pitch | Personality | Recruited | Personal arc |
|---|---|---|---|---|
| **JUNO** (she/her) | Winger — pace, dribbling | Market courier; talks at sprint speed; allergic to sitting still | Ch.1 (auto) | Wants to be *seen* as more than fast; her chapter beat is learning to slow down and finish |
| **BRAM** (he/him) | Anchor — strength, tackling | Fisherman's son, huge, gentle, apologises when he wins the ball | Ch.1 (quest) | Plays timid because he once injured a friend; must learn his strength protects people |
| **IVY** (she/her) | Playmaker — passing, vision | Old Cobble chess prodigy; speaks in short verdicts; keeps a notebook on every opponent | Ch.3 (quest) | Left the Saints because they "solved" football into boredom; wants proof beauty wins |
| **RUI** (he/him) | Free role — balanced, high ceiling | Secret recruit. Ex-Monarch, expelled; washes dishes in Spicegate | Ch.5 (hidden quest) | The Monarchs erased him; joining Ash is his answer. Unlocks alternate finale dialogue |

### Mentor & home

- **COACH TERO** (he/him), 58 — runs the Netyard, fixes nets, was one bell away from
  beating the Monarchs 19 years ago; his partner froze, they went quiet, and Tero never
  played again. Grumpy, precise, teaches the tutorial. Arc: forgiving his old partner —
  who is now **Marshal Vey of the Monarchs**.
- **MABEL** (she/her) — Harbor shop owner ("Mabel's Boots & Bait"). Sells boots/gear
  (doc 04 §6). Fierce, motherly, extends credit exactly once, mid-story, as a beat.
- **NINO** (he/him), 9 — superfan kid who assigns himself as the crew's "manager".
  Comic relief; delivers tutorial reminders diegetically ("Coach says stop hogging!").

### Rivals (one per district — each crew has a captain + 2 named squadmates)

| Captain | Crew | Playstyle (AI profile, doc 03 §10) | Character |
|---|---|---|---|
| **SALT** (he/him) | Brine Gulls | `press-chaos`: swarm ball, no shape | Loud dock apprentice; Ash's old bully — but post-match he's the first to respect the win. Becomes recurring comic ally |
| **NADIA** (she/her) | Spice Runners | `tiki-fast`: one-touch passing, high tempo | Market queen of banter; treats matches like haggling — every pass a lowball offer. Post-loss she sponsors the crew's travel |
| **BROTHER OSSIAN** (he/him) | Cobble Saints | `low-block`: deep wall, counters only | Serene monastery groundskeeper; believes patience is virtue; the match is a sermon. Ivy's former mentor |
| **FERRA** (she/her) | Ironworks | `physical`: hard (legal) shoulder charges, long shots | Forewoman; respects only what survives contact; laughs when Bram finally shoves back |
| **KAIRO** (he/him) | Volt FC | `counter-flash`: bait, break, showboat finishes | THE rival. Ash's childhood best friend and old strike partner — the other half of the Chapter-1 humiliation. Left for Voltside sponsorship. Cold on camera, guilty off it |
| **MARSHAL VEY** (she/her) | Monarchs | `complete`: adapts style each half | Tero's old partner — *she* froze 19 years ago, became a Monarch rather than face him. The final boss is also the story's wound |

Monarch squadmates **ORO** and **Sable** (few lines, imposing presence). Every other crew's
two squadmates get 1–2 lines each (see dialogue pools).

### Ambient NPC pools (per district, 3–6 walkabout NPCs)

Each has a 2–3 line rotating pool that changes after that district's match is won
(before: doubt/mockery; after: respect/gossip about next district). This is the world's
main "reactivity" and is cheap: two pools per NPC.

## 3. Story structure — six chapters

Structure per chapter (the **Chapter Loop**, identical skeleton, authored content):

1. **Arrive** — enter district, short scene with its captain (they dismiss you).
2. **Earn the challenge** — 2–3 hub quests (talk/fetch/train/mini-match) that introduce
   the district's people and the crew's philosophy. One quest recruits/develops a
   teammate.
3. **The match** — full 3v3 vs the crew. Loss = retry freely; story continues only on
   win. (Exception: the Ch.6 finale can be lost with the story continuing — see Ch.6.)
4. **Aftermath** — pin ceremony, captain's real face shown, district NPC pools flip,
   next gate opens, Ledger scene (doc 04 §7).

### Chapter 1 — "Come Home Quiet" (Brine Harbor) — TUTORIAL CHAPTER

- **Cold open (playable flashback, 60 s):** three years ago. Kid Ash and kid Kairo in the
  Netyard final vs older kids. Scripted sequence: player is prompted to PASS to Kairo —
  *whatever they press*, Ash shoots, hits the wall, counter concedes, crowd goes silent.
  This "forced failure" is the game teaching controls with training wheels AND the
  story's wound. (Implementation: doc 04 §3 tutorial script.)
- Present day: Ash returns by ferry. Meets Nino (thinks Ash is a legend), Mabel (worried),
  Tero (won't look at Ash). Tutorial beats in the Netyard: move, pass, shoot,
  tackle, sprint, switch — framed as Tero's "prove you learned anything" drills.
- Quest: help Bram haul nets → Bram joins. Juno joins after racing her cart across the
  hub (simple follow-the-path minigame, teaches hub movement).
- Match: **vs Brine Gulls (Salt).** Difficulty floor; Gulls have no shape, teaches that
  passing beats swarms.
- Aftermath: first pin. Tero, quietly: *"One down. Don't smile yet."* News of the win
  reaches Voltside — cut to Kairo watching a phone clip, saying nothing.

### Chapter 2 — "The Price of Everything" (Spicegate Market)

- Nadia won't accept the challenge until the crew "earns stall space": quests = deliver
  for Juno's old boss (hub fetch with a timer, no fail state), win the wall-pass rally
  minigame, and a 1v1 keep-away vs a Spice Runner squadmate.
- Character beat: Juno's ex-crewmates call her "the delivery girl". She wants to beat
  them alone; the quest scene lets the player choose to back her ego or coach patience —
  flavours the match intro dialogue and Ledger.
- Match: **vs Spice Runners (Nadia)** — `tiki-fast` teaches intercepting passing lanes.
- Aftermath: Nadia becomes a sponsor; unlocks **Free Match** mode diegetically ("friendly
  matches, any cage, no pins").

### Chapter 3 — "Stone Doesn't Argue" (Old Cobble)

- The Saints refuse everyone. Quests: restore the Yard's chalk lines (interaction quest
  that tours the district), find Ivy (she's annotating the crew's Ch.1–2 matches in her
  notebook — she scouts YOU), pass her "test": win the shooting-gallery minigame to a
  target score she sets.
- Ivy joins; Brother Ossian permits the match to show her "what patience is".
- Match: **vs Cobble Saints (Ossian)** — `low-block` teaches wall-passes and shot
  charging (breaking a parked bus in a cage = use the sixth man).
- Aftermath: Ossian blesses the crew. Ivy burns her old notebook page on the Saints.

### Chapter 4 — "What Survives the Fire" (The Foundry)

- Ferra's respect must be forged: quests = the Crucible's "gauntlet shift" (three
  back-to-back short 1v1/2v2 mini-matches vs Ironworks squadmates with stamina carrying
  over — teaches stamina management), plus Bram's beat: an Ironworker is the friend he
  injured years ago; the scene releases Bram's guilt.
- Match: **vs Ironworks (Ferra)** — `physical` teaches shielding and quick release.
- Aftermath: Ferra hammers the crew's four pins into a single brace. Kairo appears at
  the Foundry gate — first live meeting with Ash since the flashback. He says only:
  *"Voltside. Come lose where everyone can see it."*

### Chapter 5 — "Every Screen in the City" (Voltside)

- The Grid is a spectacle: entry requires "content" — the crew must trend. Quests:
  win a Free Match at any earlier cage with a style condition (e.g. score a wall-bounce
  bell), Nino runs the crew's fan page (comedy scene), and the hidden Rui quest: a
  dishwasher who keyholes Juno in a back-alley kickabout; digging into who he is unlocks
  him (optional — flagged in save, referenced in finale).
- Kairo scene before the match: night, empty Grid, the only honest conversation — he
  left because scouts wanted *one* of them, and staying meant watching Ash outgrow him.
- Match: **vs Volt FC (Kairo)** — `counter-flash`: punishes overcommitment; the AI
  showboats when ahead (taunt animations — legal, no mechanics change).
- Aftermath: Kairo gives his pin without ceremony: *"You were always going to be the
  one. I just needed you to prove it in front of everyone."* He signs on as the crew's
  "coach's assistant" for the finale (bench presence, dialogue only, does not play).

### Chapter 6 — "Nineteen Years of Quiet" (Crown Point) — FINALE

- No quests-as-chores: Crown Point is a short, reverent walk — a museum of the Gauntlet
  where NPCs are curators and old crew captains gather. Tero finally tells the full
  story of his final; Marshal Vey and Tero meet on the museum floor. She asks him one
  question: *"Did you come to watch, or to finish it?"*
- Match: **vs Monarchs (Vey)** — two "halves" mechanically: at half (first to 2 bells or
  90 s), Vey's AI profile switches to counter your most-used pattern this match
  (doc 03 §10.6 — the game's single "boss mechanic", built from existing AI parameters,
  not abilities).
- Ending: the pin ceremony reversed — Ash offers the Monarchs' pin *back* to Tero. Four
  ending states selected by finale result + relationship values (rules in doc 04 §7.4):
  - **The Sixth Man** (won, high trust + Harbor Bond): the crown is hung on the Netyard
    fence for the next kids; the crew stays together for the next Gauntlet.
  - **King of the Cage** (won, high Self-Image): crowned alone, respected, a little
    apart — Kairo's old path, and he says so.
  - **Empty Crown** (won, low crew trust): the cage is saved but the crew fractures;
    optional post-game scenes can repair each relationship.
  - **Next Season** (lost — the finale is the one match the story survives losing):
    Vey keeps the crown but publicly names the crew her next challengers; the district
    rallies; a "run it back" rematch unlocks. Hopeful, never a failure screen.
  All four unlock Endless Gauntlet with Rui/Kairo cameo opponents.

## 4. Dialogue system requirements (narrative side; tech in doc 05 §6)

- **Format:** speaker portrait (32×32 pixel bust), name plate, 1–3 short lines per box,
  max ~90 chars/line. Player replies: at most 2 choices, both ≤40 chars.
- **Volume budget:** ~450 dialogue nodes total for v1 (≈60–90 per chapter). Keep it.
- **Voice rules:** Tero never exceeds two sentences. Juno never uses full stops in
  excited state. Ivy's lines are ≤8 words. Ossian speaks in aphorisms. Nino misquotes
  Tero. DJ Tide speaks in radio patter, ALL CAPS on goal calls.
- **Sample (style calibration):**

  > **TERO:** The wall isn't out of bounds. It's the only teammate that never sulks.
  > **TERO:** Again. Pass it like you mean it.
  >
  > **JUNO:** okay okay okay — see the gap between the big one and the wall? that's not
  > a gap that's a DOOR
  >
  > **IVY:** He guards the middle. So the middle is a lie.
  >
  > **KAIRO (Grid, night):** Scouts don't buy duets, Ash. They buy soloists.
  > **KAIRO:** …I checked the ferry times for three years. You never came.
  >
  > **DJ TIDE:** THAT'S A BELL! Somebody tell Crown Point the harbor's gotten LOUD.

- **Match barks:** each captain has 6–10 one-line barks triggered by match events
  (concede, score, near-miss, halftime) shown as small toast text, never blocking play.

## 5. Writing deliverables checklist (content production)

| Deliverable | Count | File target |
|---|---|---|
| Chapter scripts (scene-by-scene) | 6 | `src/content/dialogue/ch1..ch6.json` |
| NPC ambient pools (pre/post win) | ~10 pools × 6 districts | `src/content/dialogue/ambient.json` |
| Match barks per captain | 6 × ~8 | `src/content/dialogue/barks.json` |
| DJ Tide match intro/outro lines | ~30 | `src/content/dialogue/radio.json` |
| Tutorial prompt copy | ~20 strings | `src/content/tutorial.json` |
| UI strings (menus, results, shop) | ~120 keys | `src/content/strings.json` |

All text goes through `strings/dialogue` files with stable keys — no literals in scenes —
so localisation stays possible later (per Master Plan content rules).
