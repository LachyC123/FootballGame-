# SOLPORT CAGES (working title)

**A 2D pixel-art 3v3 street-football story game for mobile & desktop browsers.**

Inspired by the *drama and character focus* of sports anime like Blue Lock — but with **no
superpowers or abilities**. All drama comes from skill, style, rivalry and story. The game
lives in its own world: the coastal city of **Solport**, where 3v3 cage football decides
who matters.

Built to the standards of the **Mobile Browser Game Polish Master Plan** (Phaser 4 +
TypeScript strict + Vite + PWA, phase-gated quality, physical-device-first testing).

---

## Document map — read in this order

| Doc | Contents | Use it for |
|---|---|---|
| [docs/01-VISION.md](docs/01-VISION.md) | Game contract, pillars, scope, no-go list | Freezing what the game IS and IS NOT |
| [docs/02-WORLD-STORY.md](docs/02-WORLD-STORY.md) | Solport, the six chapters, every character, dialogue samples | All narrative content |
| [docs/03-GAMEPLAY-SPEC.md](docs/03-GAMEPLAY-SPEC.md) | Match rules, controls, mechanics, AI, tuning tables | Implementing the 3v3 match |
| [docs/04-GAME-STRUCTURE.md](docs/04-GAME-STRUCTURE.md) | Game flow, hub world, tutorial, quests, progression, economy, saves | Everything outside the match |
| [docs/05-TECH-SPEC.md](docs/05-TECH-SPEC.md) | Stack, architecture, scene list, data schemas, directory layout | How the code is organised |
| [docs/06-ART-AUDIO-BIBLE.md](docs/06-ART-AUDIO-BIBLE.md) | Art direction, sprite/tile specs, UI, audio palette | Making/judging every asset |
| [docs/07-ASSET-MANIFEST.md](docs/07-ASSET-MANIFEST.md) | Every asset the game needs + where to get it + licensing rules | Sourcing assets |
| [docs/08-BUILD-PLAN.md](docs/08-BUILD-PLAN.md) | Phased implementation plan with acceptance gates | Executing the build, in order |

## How Claude Code should use this repo

1. **Never start a phase early.** Follow [docs/08-BUILD-PLAN.md](docs/08-BUILD-PLAN.md)
   phase by phase; each phase has explicit acceptance criteria.
2. **One outcome per task.** Work in small, evidence-backed increments (tests,
   screenshots, device notes) per the Master Plan's AI work contract.
3. **Data-driven content.** Story, dialogue, teams, stats and quests live in validated
   JSON/TS data under `src/content/` — never hard-coded in scenes.
4. **Placeholders are labelled.** Greybox art is fine early, but must be visibly
   placeholder and tracked in `docs/07-ASSET-MANIFEST.md` status tables.
5. **Mobile is the bar.** Landscape mobile browser is the primary target; desktop
   keyboard is a supported secondary. Test with touch in mind at every step.
