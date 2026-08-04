import Phaser from 'phaser';
import { FONT_BODY, FS_BODY, GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { BUILD_VERSION } from '../app/buildInfo';
import { createDefaultSave } from '../domain/progress/save';
import { commitSave } from '../platform/saveStore';
import { SfxPlayer } from '../platform/sfxPlayer';
import { defaultMatchConfig, type DrillSpec } from './MatchScene';
import type { MatchConfig } from '../domain/match/types';

type Step =
  | { kind: 'flashback' }
  | { kind: 'dialogue'; id: string }
  | { kind: 'drill'; spec: DrillSpec }
  | { kind: 'match' }
  | { kind: 'complete' };

const CH1_STEPS: Step[] = [
  { kind: 'flashback' },
  { kind: 'dialogue', id: 'ch1_intro' },
  { kind: 'dialogue', id: 'ch1_drill_pass' },
  { kind: 'drill', spec: { type: 'pass', target: 6, title: 'THE HONEST PASS' } },
  { kind: 'dialogue', id: 'ch1_drill_shoot' },
  { kind: 'drill', spec: { type: 'shoot', target: 3, title: 'RING IT' } },
  { kind: 'dialogue', id: 'ch1_prematch' },
  { kind: 'match' },
  { kind: 'dialogue', id: 'ch1_aftermath' },
  { kind: 'complete' },
];

/** Drill fixture: crew vs standing mannequins, crew always kicks off. */
function drillConfig(seed: number): MatchConfig {
  const config = defaultMatchConfig(seed);
  config.rules = { durationS: 600, scoreLimit: 99, goldenGoal: false, kickoffOverride: 0 };
  config.away.dummy = true;
  return config;
}

/**
 * Chapter orchestrator (Phase 2 condensed Chapter 1): Netyard backdrop with the
 * cast standing around, dialogue overlays, the Gulls match, loss-retry loop,
 * aftermath and autosave. Full quest/hub systems arrive in Phase 3.
 */
export class StoryScene extends Phaser.Scene {
  private stepIndex = 0;
  private flags = new Set<string>();
  private sfxp!: SfxPlayer;

  constructor() {
    super('Story');
  }

  create(): void {
    this.stepIndex = 0;
    this.flags = new Set(this.registry.get('flags') as string[] | undefined);
    this.sfxp = new SfxPlayer(this);
    this.drawBackdrop();

    this.game.events.on('dialogue-done', this.onDialogueDone, this);
    this.game.events.on('story-match-result', this.onMatchResult, this);
    this.game.events.on('flashback-done', this.onFlashbackDone, this);
    this.events.once('shutdown', () => {
      this.game.events.off('dialogue-done', this.onDialogueDone, this);
      this.game.events.off('story-match-result', this.onMatchResult, this);
      this.game.events.off('flashback-done', this.onFlashbackDone, this);
    });

    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Story';
    this.runStep();
  }

  private runStep(): void {
    const step = CH1_STEPS[this.stepIndex];
    if (!step) return;
    switch (step.kind) {
      case 'dialogue':
        this.scene.launch('Dialogue', { dialogueId: step.id });
        break;
      case 'flashback':
        this.scene.sleep();
        this.scene.launch('Flashback');
        break;
      case 'drill': {
        this.scene.sleep();
        this.scene.launch('Match', {
          config: drillConfig(Math.floor(Math.random() * 1e9)),
          story: true,
          drill: step.spec,
        });
        break;
      }
      case 'match': {
        const config = defaultMatchConfig(Math.floor(Math.random() * 1e9));
        this.scene.sleep();
        this.scene.launch('Match', { config, story: true });
        break;
      }
      case 'complete':
        void this.completeChapter();
        break;
    }
  }

  private onFlashbackDone = (): void => {
    this.scene.wake();
    this.scene.bringToTop();
    this.stepIndex++;
    this.runStep();
  };

  private onDialogueDone = (payload: { dialogueId: string; flags: string[] }): void => {
    for (const f of payload.flags) this.flags.add(f);
    this.registry.set('flags', [...this.flags]);
    this.stepIndex++;
    this.runStep();
  };

  private onMatchResult = (payload: { homeWon: boolean }): void => {
    this.scene.wake();
    this.scene.bringToTop();
    if (payload.homeWon) {
      this.stepIndex++;
      this.runStep();
    } else {
      // Loss: retry talk, then relaunch the match (docs/02: retry freely).
      this.scene.launch('Dialogue', { dialogueId: 'ch1_retry' });
      // When the retry dialogue ends, onDialogueDone advances stepIndex — undo
      // that by stepping back so the match step runs again.
      this.stepIndex--;
    }
  };

  private async completeChapter(): Promise<void> {
    const save = createDefaultSave(BUILD_VERSION, Date.now());
    save.flags = [...this.flags];
    save.chapter = 2;
    save.shells = 60;
    try {
      await commitSave(save);
    } catch {
      // Storage unavailable — the run continues; Continue just won't appear.
    }
    this.sfxp.play('uiConfirm', 0.8);
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e14, 0.7)
      .setDepth(30);
    void dim;
    const pin = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 18, '◈', {
        fontFamily: FONT_BODY,
        fontSize: '34px',
        color: '#f2c14e',
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setScale(3)
      .setAlpha(0);
    this.tweens.add({ targets: pin, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 16, 'THE GULL PIN IS YOURS', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#e8e3d0',
      })
      .setOrigin(0.5)
      .setDepth(31);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 34, 'tap to return to title', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#9a968a',
      })
      .setOrigin(0.5)
      .setDepth(31);
    this.time.delayedCall(600, () => {
      this.input.once('pointerdown', () => this.scene.start('Title'));
      this.input.keyboard?.once('keydown', () => this.scene.start('Title'));
    });
  }

  /** Netyard at dusk — placeholder-grade backdrop with the generated cast. */
  private drawBackdrop(): void {
    const g = this.add.graphics();
    g.fillStyle(0x1b2027);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Sky band + water.
    g.fillStyle(0x2a3340);
    g.fillRect(0, 0, GAME_WIDTH, 70);
    g.fillStyle(0xc2643a, 0.25);
    g.fillRect(0, 52, GAME_WIDTH, 6);
    g.fillStyle(0x22303c);
    g.fillRect(0, 58, GAME_WIDTH, 12);
    // Quay floor.
    g.fillStyle(0x23262d);
    g.fillRect(0, 70, GAME_WIDTH, GAME_HEIGHT - 70);
    g.fillStyle(0x272b33);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = 70 + ((x / 32) % 2 === 0 ? 0 : 16); y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    // Cage fence with nets (the Netyard).
    g.lineStyle(2, 0x5b6472);
    g.strokeRect(40, 84, GAME_WIDTH - 80, 130);
    g.lineStyle(1, 0x39424e, 0.7);
    for (let x = 48; x < GAME_WIDTH - 44; x += 10) {
      g.lineBetween(x, 84, x - 6, 214);
    }
    // Cast standing around (generated sprites, static frames).
    const place = (key: string, x: number, y: number, frame = 0, flip = false): void => {
      if (!this.textures.exists(key)) return;
      this.add.ellipse(x, y + 9, 12, 4, 0x000000, 0.3);
      this.add.sprite(x, y, key, frame).setFlipX(flip);
    };
    place('char_tero', 120, 150);
    place('char_nino', 142, 158);
    place('char_ash', 200, 170, 10, true); // side view facing tero
    place('char_juno', 260, 150);
    place('char_bram', 290, 162);
    place('char_salt', 360, 140, 10, true);
    place('char_gull_a', 384, 152);
    place('char_gull_b', 344, 158);
    this.add
      .text(GAME_WIDTH / 2, 76, 'THE NETYARD — BRINE HARBOR', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#9a968a',
      })
      .setOrigin(0.5);
  }
}
