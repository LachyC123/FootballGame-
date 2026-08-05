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

## 1b. THE UNDERTIDE — the hidden story (the game's soul; spoilers for everything)

> Design intent: an Outer Wilds-shaped secret — a quiet, personal truth that has been
> **hiding in plain sight since the title screen**, assembled by the player from
> optional fragments, which recontextualizes every name, colour and ritual in the game
> without changing a single match or chapter. The surface story (beat the districts,
> face the Monarchs) is complete on its own; the Undertide is what makes it ache.

### The truth

**Solport is Sol's port.** Not sun — a person. **Sol Marrow**: dockworker, striker,
the first King of the Cage, the reason there are cages at all. Three more truths nest
inside that one, revealed in this order:

1. **The rituals are her.** Goals are "bells" because her crew rang the harbor bell
   when she scored. The chalk crescent on every pitch is half of her crest — the
   eclipse mark. The gold that accents every cage is "Sol's colour." "The wall is the
   sixth man" is her line — she said the cage itself was the crewmate who never left.
   DJ Tide's sign-off — *"keep a light on the water"* — is how she ended every match.
2. **Tero and Vey were her crew.** The famous lost final 19 years ago: Tero and Vey
   didn't lose to the Monarchs — they played the Royal Cage **the week Sol died**,
   two where there should have been three. Vey didn't "freeze." She walked to the spot
   where Sol always stood, and stood there, and would not play it as a duo. The city
   called it choking. It was grief. Tero has hated her for 19 years for telling the
   truth with her feet.
3. **Ash is a Marrow.** Sol was Ash's grandmother — "gran," who taught a small kid
   wall-passes at dusk and never once mentioned she was the person the city is named
   for. Ash never knew; Kairo did (dock families talk), and never said — one more pass
   he never gave. Ash's full name is spoken aloud exactly once, by Vey, before the
   final: *"Say your whole name, kid."*

**The pins:** the six crew pins, held together, assemble into Sol's full crest —
sun, crescent, bell. The Gauntlet is not a tournament; it's **Sol's will**. She
designed it so the crown could only be reached by someone who had made a crew of the
whole city — her answer, in advance, to every soloist who would come after her,
including the one she knew best: herself.

**The crown** at the Royal Cage is not a trophy. It is the clapper of the original
harbor bell, hung on a chain. The Monarchs have kept it ringable and unrung for 19
years. Whoever wins may ring it. Vey has spent two decades making sure nobody
unworthy ever did — that is her stewardship, the mirror of Tero's netshed.

### LOUD QUESTION, QUIET ANSWER (the anti-too-hidden doctrine)

The classic failure of hidden stories is hiding the *question* along with the answer —
players never learn a mystery exists, so they never care. Outer Wilds is not subtle
about its mystery (the sun explodes in your face in act one; the ship log nags); it is
only subtle about the resolution. We copy that split explicitly:

1. **The inciting incident IS the mystery.** Ash didn't just drift home — **Ash came
   back for a funeral.** Gran died three weeks ago. It's said plainly in the Ch.1
   intro; Tero's reaction ("...She hated flowers. The harbor sent flowers.") is the
   first crack. The player is holding the grief from scene one — the question is
   never "what's this city trivia," it's *"who was my gran, and why does every adult
   go quiet when I ask?"* Nobody fails to care about that.
2. **The question is asked out loud, repeatedly, by characters.** Ch.1: Nino asks
   "why's it even called SOLPORT?" and reports that every adult he asks suddenly has
   chores. Each district repeats the deflection pattern — someone almost says it and
   stops. An on-screen question a character keeps asking becomes the player's
   question automatically.
3. **Nino's Ledger is the ship log.** From Ch.1 it has a visible page — THE BIG
   QUESTION — with hand-drawn empty boxes. Finding a fragment fills a box with
   Nino's sketch of it. Diegetic, charming, and impossible to not notice. Talking to
   Nino after any fragment gets his kid-detective theory (often hilariously wrong —
   which keeps the tone from getting heavy too early).
4. **Fragments sit in the main path's blast radius.** Every mandatory quest walks
   the player within a screen of that district's fragment, and something visibly
   glints/marks it (the bell's polished clapper catches light). Optional means
   "one tap you could skip," never "pixel-hunt."
5. **The full twist is delivered to EVERY player on the mandatory path** — Ferra's
   Ch.4 line, Kairo's Ch.5 slip, Tero's Ch.6 confession, Vey's "say your whole
   name." Fragments don't gatekeep the truth; they determine how much it resonates
   (and unlock the Whole Bell epilogue). A player who ignores everything still gets
   the story; a player who chased it gets to *have known first* — the Outer Wilds
   feeling of realizing before the game says it.

### How it's discovered (fragment system)

One interactable per district (the "landmark interaction" already budgeted in doc 04
§2.2), each ≤3 lines, each filling a visible box on Nino's BIG QUESTION Ledger page.

| Ch | Fragment | What it shows |
|---|---|---|
| 1 | **The harbor bell** (Brine Harbor quay) | Green with salt, clapper still polished. Scratched into the rim: *"RING IT FOR ME WHEN I CAN'T — S."* |
| 2 | **Nadia's debt book** (Spicegate) | A page of old stall debts, one crossed out generations deep: *"S. Marrow — paid in full, forever"* — Sol bought the market's first cage nets |
| 3 | **The monastery bell** (Old Cobble) | Inscription: *"FOR S., WHO RANG FIRST"* — the Saints' silence is mourning that never ended |
| 4 | **The first pin mould** (Foundry) | Ferra's grandmother cast the original six pins; the mould's six recesses form one crest. Initials in the corner: S.M. |
| 5 | **The degraded clip** (Voltside screens) | 8 seconds of scratchy footage on loop between ads: a striker ringing a bell at dusk, face unreadable, celebration identical to one of Ash's own |
| 6 | **The sixth locker** (Crown Point museum) | Five lockers labelled with legendary crews. The sixth: unlabelled, unlocked, empty except a chalk stick and a folded net. Vey's line if asked: "It's not empty. It's *kept*." |

**Hiding in plain sight from minute one** (no flags, pure recontextualization): the
title "SOLPORT," the sun on the title screen, the gold rule under the logo, the
crescent in the centre circle, "bells," Tero's boat (named *MARROW*, visible in the
hub, never remarked on), the netshed sign whose rust hides an "& SOL'S," DJ Tide's
sign-off. On a second playthrough, the title screen is a memorial.

### What it changes (and refuses to change)

- **Chapter spine: unchanged.** Same matches, same order, same win conditions. The
  Undertide is carried in fragments, one mid-story scene, and the finale.
- **Ch.4 aftermath +1 beat:** Ferra, hammering the four pins into a brace, pauses at
  the mould: "You know what these are, harbor kid? No? …Ask your coach whose crest
  he's been renting." First time the surface story acknowledges the Undertide.
- **Ch.5 Kairo scene +1 line:** the honest night conversation now contains the second
  betrayal, said almost too quietly: *"You really don't know. …Ash, why do you think
  the city has your name in it?"* (Wrong way round — the city has HER name; Kairo's
  error is the tell that he learned it secondhand too.)
- **Ch.6 rewritten around the truth:** Crown Point's museum walk becomes Tero's
  confession — not that he lost, but who they lost. Vey's pre-match question stays
  but lands differently: *"Did you come to watch, or to finish it?"* means Sol's
  final, the one that was never really played. If the player found ≥4 fragments,
  Vey adds the name: "Say your whole name, kid." → the one time "Ash Marrow" is heard.
- **The finale's halftime adaptation** (Vey reading your patterns) gains its true
  text: she is checking, pattern by pattern, whether Sol's game survived two
  generations. Her barks quote Sol's lines back at you.
- **Endings, recontextualized (same four states, doc 04 §7.4):**
  - *The Sixth Man*: Ash rings the bell, then hangs the clapper on the Netyard fence
    — exactly what Sol did the one time she won her own Gauntlet. Tero and Vey stand
    at the same fence, not reconciled, but adjacent. Final shot: the harbor bell,
    a new scratch beside the old one: *"RANG IT FOR YOU — A.M."*
  - *King of the Cage*: Ash rings the bell alone. The city cheers. The last line is
    Vey's, quiet, not cruel: "She'd have loved the noise. She'd have asked where your
    crew went." The crown travels with Ash; the fence stays bare.
  - *Empty Crown*: the bell rings; nobody Ash loves is close enough to hear it well.
  - *Next Season*: the clapper stays unrung one more year — and Vey, for the first
    time in 19 years, is the one who says "come back." Because now she wants it rung.
- **Post-game (all 6 fragments + any win): "The Whole Bell"** — a two-minute
  epilogue scene at dawn: Nino reads the finished Ledger aloud on the quay while the
  crew, Tero, Vey, Salt, Nadia — everyone — plays a no-stakes, no-HUD kickabout in
  the Netyard behind him. The game's last line is Sol's, finally heard complete, as
  the sun comes up over her port: *"Keep a light on the water. Keep a crew on the
  cage. The rest is just the score."*

### Voice rules for the Undertide (restraint is the whole trick)

- Nobody monologues about Sol. Fragments are ≤3 lines. Grief speaks in objects.
- Tero never says her name until Ch.6. He says "we," catches it, says "I."
- Vey's love is procedural: 19 years of maintenance. Show the polish, not tears.
- The game never explains the title in dialogue — no character says "Solport means
  Sol's port." But the game makes SURE the player is asking (Nino's question, the
  deflections, the Ledger page). Loud question, quiet answer: awareness is
  guaranteed on the main path; the click of realization is the player's to have.

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
- Present day: Ash returns by ferry — **for gran's funeral, three weeks gone** (docs
  02 §1b: the funeral is the mystery's front door; gran is never named here). Meets
  Nino (thinks Ash is a legend), Mabel (worried), Tero (won't look at Ash, and goes
  silent at any mention of gran). Tutorial beats in the Netyard: move, pass, shoot,
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
