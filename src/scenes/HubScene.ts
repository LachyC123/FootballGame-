import Phaser from 'phaser';
import { FONT_BODY, FS_BODY, GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { BUILD_VERSION } from '../app/buildInfo';
import { CharacterView } from '../presentation/characterView';
import { InputService } from '../platform/input/inputService';
import { music } from '../platform/music';
import { SfxPlayer } from '../platform/sfxPlayer';
import { createDefaultSave } from '../domain/progress/save';
import { commitSave } from '../platform/saveStore';
import { fadeIn, transitionTo, UI } from '../presentation/ui';
import { defaultMatchConfig, type DrillSpec } from './MatchScene';
import type { MatchConfig, PlayerState } from '../domain/match/types';

/**
 * Brine Harbor — the chapter's stage, not a menu (docs/04 §2). Chapter 1 plays
 * IN PLACE: walk to Tero for the intro, enter the Netyard gate for drills and
 * the Gulls match, pin ceremony on the quay, Kairo stinger, then free roam.
 * Progress is flag-driven; the objective chip always says what's next.
 */
interface HubNpc {
  id: string;
  spriteKey: string;
  x: number;
  y: number;
  /** flag conditions: all must hold ('!' prefix negates) */
  requires?: string[];
  dialogueId: string | (() => string);
  prompt?: string;
}

type SeqStep =
  | { kind: 'dialogue'; id: string }
  | { kind: 'drill'; spec: DrillSpec }
  | { kind: 'match' };

const CAGE_SEQUENCE: SeqStep[] = [
  { kind: 'dialogue', id: 'ch1_drill_pass' },
  { kind: 'drill', spec: { type: 'pass', target: 6, title: 'THE HONEST PASS' } },
  { kind: 'dialogue', id: 'ch1_drill_shoot' },
  { kind: 'drill', spec: { type: 'shoot', target: 3, title: 'RING IT' } },
  { kind: 'dialogue', id: 'ch1_prematch' },
  { kind: 'match' },
  { kind: 'dialogue', id: 'ch1_aftermath' },
];

function drillConfig(seed: number): MatchConfig {
  const config = defaultMatchConfig(seed);
  config.rules = { durationS: 600, scoreLimit: 99, goldenGoal: false, kickoffOverride: 0 };
  config.away.dummy = true;
  return config;
}

const WALK_SPEED = 70;
const BOUNDS = { minX: 24, maxX: 456, minY: 92, maxY: 240 };
const GATE = { x: 430, y: 150, r: 26 };

export class HubScene extends Phaser.Scene {
  private inputSvc!: InputService;
  private sfxp!: SfxPlayer;
  private player!: { view: CharacterView; state: PlayerState };
  private npcs: HubNpc[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private promptTarget: HubNpc | 'gate' | null = null;
  private prevInteract = false;
  private inDialogue = false;
  private sequenceIndex = -1; // -1 = not in the cage sequence

  constructor() {
    super('Hub');
  }

  // ---- flags --------------------------------------------------------------

  private flags(): Set<string> {
    return new Set((this.registry.get('flags') as string[] | undefined) ?? []);
  }

  private addFlags(newFlags: string[]): void {
    const set = this.flags();
    for (const f of newFlags) set.add(f);
    this.registry.set('flags', [...set]);
  }

  private has(flag: string): boolean {
    return this.flags().has(flag);
  }

  private meets(requires: string[] | undefined): boolean {
    if (!requires) return true;
    return requires.every((r) =>
      r.startsWith('!') ? !this.has(r.slice(1)) : this.has(r),
    );
  }

  // ---- lifecycle ----------------------------------------------------------

  create(): void {
    this.sequenceIndex = -1;
    this.inDialogue = false;
    this.prevInteract = true; // swallow the button that entered the scene
    this.drawHarbor();
    this.sfxp = new SfxPlayer(this);
    music.play('harbor');
    fadeIn(this);

    this.player = {
      view: new CharacterView(this, 'chr_ash'),
      state: {
        id: 'chr_ash',
        team: 0,
        pos: { x: 90, y: 210 },
        vel: { x: 0, y: 0 },
        facing: { x: 1, y: 0 },
        stamina: 100,
        sprintLocked: false,
        sprinting: false,
        action: 'normal',
        actionT: 0,
        chargeT: 0,
        passHoldT: -1,
      },
    };

    // Cast placement is chapter-state-aware (docs: everything placed purposely).
    this.npcs = [
      {
        id: 'tero',
        spriteKey: 'char_tero',
        x: 96,
        y: 150,
        dialogueId: () => (this.has('ch1.metTero') ? 'hub_tero' : 'ch1_intro'),
      },
      // Juno & Bram answer Tero's shout — they exist in the hub only after it.
      { id: 'juno', spriteKey: 'char_juno', x: 372, y: 168, requires: ['ch1.metTero'], dialogueId: 'hub_juno' },
      { id: 'bram', spriteKey: 'char_bram', x: 396, y: 196, requires: ['ch1.metTero'], dialogueId: 'hub_bram' },
      // Nino is always underfoot.
      { id: 'nino', spriteKey: 'char_nino', x: 320, y: 120, dialogueId: () => (this.has('ch1.complete') ? 'hub_nino' : 'hub_nino_early') },
      // Salt hangs around the quay only after losing the pin.
      { id: 'salt', spriteKey: 'char_salt', x: 220, y: 208, requires: ['ch1.complete'], dialogueId: 'hub_salt' },
      // Undertide fragment 1: the harbor bell (docs/02 §1b). Glints; never marked.
      { id: 'bell', spriteKey: '', x: 196, y: 96, dialogueId: 'hub_bell', prompt: 'LOOK [A]' },
    ].filter((npc) => this.meets(npc.requires));

    for (const npc of this.npcs) {
      if (!npc.spriteKey || !this.textures.exists(npc.spriteKey)) continue;
      this.add.ellipse(npc.x, npc.y + 9, 12, 4, 0x000000, 0.3);
      const sprite = this.add.sprite(npc.x, npc.y, npc.spriteKey, 0).setDepth(4);
      this.time.addEvent({
        delay: 480 + ((npc.x * 7) % 200),
        loop: true,
        callback: () => sprite.setFrame(Number(sprite.frame.name) === 0 ? 1 : 0),
      });
    }

    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: UI.gold,
        backgroundColor: '#131118ee',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setVisible(false);

    // Objective chip (docs/04 §4: the current objective is always one line).
    this.objectiveText = this.add
      .text(6, 5, '', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#e8e3d0',
        backgroundColor: '#131118dd',
        padding: { x: 6, y: 2 },
      })
      .setDepth(21);

    // The bell's clapper catches the light (fragments glint, docs/02 §1b).
    const glint = this.add.rectangle(194, 93, 2, 2, 0xffffff, 0.9).setDepth(3).setAlpha(0);
    this.tweens.add({
      targets: glint,
      alpha: { from: 0, to: 0.9 },
      duration: 180,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2600,
    });

    this.inputSvc = new InputService(this, {
      a: { x: GAME_WIDTH - 40, y: GAME_HEIGHT - 40, r: 16, hitR: 26 },
      b: { x: -100, y: -100, r: 1, hitR: 1 },
    });

    this.game.events.on('dialogue-done', this.onDialogueDone, this);
    this.game.events.on('story-match-result', this.onMatchResult, this);
    this.events.once('shutdown', () => {
      this.game.events.off('dialogue-done', this.onDialogueDone, this);
      this.game.events.off('story-match-result', this.onMatchResult, this);
    });

    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Hub';
  }

  private objective(): string {
    if (this.sequenceIndex >= 0) return '';
    if (!this.has('ch1.metTero')) return '▸ Find Coach Tero';
    if (!this.has('ch1.complete')) return '▸ Enter the Netyard — take back the pin';
    return '▸ Spicegate opens soon · the harbor is yours';
  }

  // ---- the cage sequence (drills → match → aftermath, in place) -----------

  private startCageSequence(): void {
    this.sequenceIndex = 0;
    this.runSequenceStep();
  }

  private runSequenceStep(): void {
    const step = CAGE_SEQUENCE[this.sequenceIndex];
    if (!step) {
      this.finishChapter();
      return;
    }
    switch (step.kind) {
      case 'dialogue':
        this.inDialogue = true;
        this.inputSvc.reset();
        this.scene.launch('Dialogue', { dialogueId: step.id });
        break;
      case 'drill':
        this.scene.sleep();
        this.scene.launch('Match', {
          config: drillConfig(Math.floor(Math.random() * 1e9)),
          story: true,
          drill: step.spec,
        });
        break;
      case 'match':
        this.scene.sleep();
        this.scene.launch('Match', {
          config: defaultMatchConfig(Math.floor(Math.random() * 1e9)),
          story: true,
        });
        break;
    }
  }

  private onDialogueDone = (payload: { dialogueId: string; flags: string[] }): void => {
    this.addFlags(payload.flags);
    this.inDialogue = false;
    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Hub';
    // Tero's intro ends with the crew assembling — refresh the stage.
    if (payload.dialogueId === 'ch1_intro') {
      this.addFlags(['ch1.metTero']);
      this.scene.restart();
      return;
    }
    if (this.sequenceIndex >= 0) {
      this.sequenceIndex++;
      this.runSequenceStep();
    }
  };

  private onMatchResult = (payload: { homeWon: boolean }): void => {
    this.scene.wake();
    this.scene.bringToTop();
    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Hub';
    if (this.sequenceIndex < 0) return;
    if (payload.homeWon) {
      this.sequenceIndex++;
      this.runSequenceStep();
    } else {
      // Loss: Tero's retry talk, then the match again (docs/02: retry freely).
      // Park one before the match step; the dialogue-done advance re-runs it.
      this.sequenceIndex = CAGE_SEQUENCE.findIndex((s) => s.kind === 'match') - 1;
      this.inDialogue = true;
      this.scene.launch('Dialogue', { dialogueId: 'ch1_retry' });
    }
  };

  private finishChapter(): void {
    this.sequenceIndex = -1;
    void this.saveProgress();
    this.pinCeremony();
  }

  private async saveProgress(): Promise<void> {
    const save = createDefaultSave(BUILD_VERSION, Date.now());
    save.flags = [...this.flags()];
    save.chapter = 2;
    save.shells = 60;
    try {
      await commitSave(save);
    } catch {
      // Storage unavailable — session continues; Continue won't appear.
    }
  }

  private pinCeremony(): void {
    this.sfxp.play('bell', 0.7);
    const cx = GAME_WIDTH / 2;
    const dim = this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e14, 0.7)
      .setDepth(30);
    const pin = this.add
      .text(cx, GAME_HEIGHT / 2 - 18, '◈', { fontFamily: 'monospace', fontSize: '34px', color: '#f2c14e' })
      .setOrigin(0.5)
      .setDepth(31)
      .setScale(3)
      .setAlpha(0);
    this.tweens.add({ targets: pin, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });
    const label = this.add
      .text(cx, GAME_HEIGHT / 2 + 16, 'THE GULL PIN IS YOURS', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: UI.textMain,
      })
      .setOrigin(0.5)
      .setDepth(31);
    const hint = this.add
      .text(cx, GAME_HEIGHT / 2 + 34, 'tap to continue', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: UI.textDim,
      })
      .setOrigin(0.5)
      .setDepth(31);
    this.time.delayedCall(700, () => {
      const go = (): void => {
        dim.destroy();
        pin.destroy();
        label.destroy();
        hint.destroy();
        // Cut to Voltside: Kairo watches the clip (docs/02 Ch.1 end beat).
        transitionTo(this, 'Stinger', undefined, 350);
      };
      this.input.once('pointerdown', go);
      this.input.keyboard?.once('keydown', go);
    });
  }

  // ---- per-frame ----------------------------------------------------------

  override update(_time: number, deltaMs: number): void {
    this.objectiveText.setText(this.objective()).setVisible(this.objective() !== '');
    if (this.inDialogue || this.sequenceIndex >= 0) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const cmd = this.inputSvc.sample();
    const state = this.player.state;

    const len = Math.hypot(cmd.moveX, cmd.moveY);
    if (len > 0.15) {
      state.vel.x = (cmd.moveX / Math.max(1, len)) * WALK_SPEED;
      state.vel.y = (cmd.moveY / Math.max(1, len)) * WALK_SPEED;
      state.facing = { x: cmd.moveX / len, y: cmd.moveY / len };
    } else {
      state.vel.x = 0;
      state.vel.y = 0;
    }
    state.pos.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, state.pos.x + state.vel.x * dt));
    state.pos.y = Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, state.pos.y + state.vel.y * dt));
    this.player.view.update(state, dt);

    // Interaction targeting.
    this.promptTarget = null;
    let bestD = 26;
    for (const npc of this.npcs) {
      const d = Math.hypot(npc.x - state.pos.x, npc.y - state.pos.y);
      if (d < bestD) {
        bestD = d;
        this.promptTarget = npc;
      }
    }
    const gateD = Math.hypot(GATE.x - state.pos.x, GATE.y - state.pos.y);
    if (this.promptTarget === null && gateD < GATE.r) this.promptTarget = 'gate';

    if (this.promptTarget === 'gate') {
      const label = !this.has('ch1.metTero')
        ? 'THE NETYARD — chained. Find Coach Tero.'
        : !this.has('ch1.complete')
          ? 'CHALLENGE THE GULLS [A]'
          : 'PLAY A FRIENDLY [A]';
      this.prompt.setVisible(true).setText(label).setPosition(GATE.x - 20, GATE.y - 24);
    } else if (this.promptTarget) {
      this.prompt
        .setVisible(true)
        .setText(this.promptTarget.prompt ?? 'TALK [A]')
        .setPosition(this.promptTarget.x, this.promptTarget.y - 18);
    } else {
      this.prompt.setVisible(false);
    }

    const interact = cmd.pass;
    if (interact && !this.prevInteract && this.promptTarget) {
      if (this.promptTarget === 'gate') {
        if (!this.has('ch1.metTero')) {
          this.sfxp.play('uiClick', 0.3, 400); // rattling the chain
        } else if (!this.has('ch1.complete')) {
          this.sfxp.play('uiConfirm', 0.6);
          this.startCageSequence();
        } else {
          this.sfxp.play('uiConfirm', 0.6);
          music.stop(250);
          transitionTo(this, 'Match', { returnTo: 'Hub' });
        }
      } else {
        this.sfxp.play('uiSelect', 0.4);
        this.inDialogue = true;
        this.inputSvc.reset();
        const id = this.promptTarget.dialogueId;
        this.scene.launch('Dialogue', { dialogueId: typeof id === 'function' ? id() : id });
      }
    }
    this.prevInteract = interact;
  }

  // ---- backdrop -----------------------------------------------------------

  private drawHarbor(): void {
    const g = this.add.graphics();
    g.fillStyle(0x2a3040);
    g.fillRect(0, 0, GAME_WIDTH, 46);
    g.fillStyle(0xc2643a, 0.2);
    g.fillRect(0, 36, GAME_WIDTH, 4);
    g.fillStyle(0x1a2732);
    g.fillRect(0, 40, GAME_WIDTH, 40);
    g.fillStyle(0xf2c14e, 0.08);
    for (let i = 0; i < 8; i++) g.fillRect(30 + i * 60, 48 + (i % 3) * 9, 26, 1);
    g.fillStyle(0x39424e);
    g.fillRect(0, 78, GAME_WIDTH, 6);
    g.fillStyle(0x23262d);
    g.fillRect(0, 84, GAME_WIDTH, GAME_HEIGHT - 84);
    g.fillStyle(0x272b33);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = 84 + ((x / 32) % 2 === 0 ? 0 : 16); y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    for (let x = 20; x < GAME_WIDTH; x += 90) {
      g.fillStyle(0x39424e);
      g.fillCircle(x, 81, 3);
    }
    // The harbor bell.
    g.fillStyle(0x39424e);
    g.fillRect(193, 84, 2, 10);
    g.fillRect(189, 82, 10, 2);
    g.fillStyle(0x5a7a5e);
    g.fillRect(191, 86, 6, 5);
    g.fillRect(190, 90, 8, 2);
    g.fillStyle(0xf2c14e);
    g.fillRect(193, 92, 2, 2);
    // Tero's boat, MARROW. Nobody remarks on the name.
    g.fillStyle(0x2b303a);
    g.fillRect(288, 62, 46, 9);
    g.fillTriangle(334, 62, 334, 71, 344, 66);
    g.fillStyle(0x39424e);
    g.fillRect(296, 56, 3, 6);
    this.add
      .text(311, 68, 'MARROW', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#6b7482' })
      .setOrigin(0.5, 0.5)
      .setScale(0.5)
      .setAlpha(0.8);
    // Tero's netshed.
    g.fillStyle(0x2b303a);
    g.fillRect(40, 96, 90, 52);
    g.fillStyle(0x39424e);
    g.fillRect(40, 88, 90, 12);
    g.fillStyle(0x11141a);
    g.fillRect(70, 118, 18, 30);
    g.lineStyle(1, 0x5b6472, 0.7);
    for (let x = 44; x < 126; x += 8) g.lineBetween(x, 100, x - 4, 146);
    // Crates.
    g.fillStyle(0x4a4030);
    g.fillRect(340, 100, 22, 16);
    g.fillRect(352, 88, 18, 14);
    g.lineStyle(1, 0x2f2b28);
    g.strokeRect(340, 100, 22, 16);
    g.strokeRect(352, 88, 18, 14);
    // The Netyard gate.
    g.lineStyle(2, 0x5b6472);
    g.strokeRect(408, 110, 64, 80);
    g.lineStyle(1, 0x39525a, 0.7);
    for (let x = 412; x < 470; x += 8) g.lineBetween(x, 110, x - 4, 190);
    g.fillStyle(0xf2c14e, 0.12);
    g.fillRect(408, 110, 64, 80);
    this.add
      .text(85, 92, "TERO'S NETS", { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#9a968a' })
      .setOrigin(0.5, 1)
      .setAlpha(0.85);
    this.add
      .text(440, 106, 'THE NETYARD', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: UI.gold })
      .setOrigin(0.5, 1)
      .setAlpha(0.9);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'BRINE HARBOR', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#4a4a55',
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
  }
}
