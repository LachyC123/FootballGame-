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
import { defaultMatchConfig, KETTLE, type ArenaDress, type DrillSpec } from './MatchScene';
import type { MatchConfig, PlayerState } from '../domain/match/types';

/**
 * District hubs — the chapters' stages (docs/04 §2). Every chapter plays IN
 * PLACE: NPCs exist only when the story summons them, gates say what they mean,
 * the objective chip always points forward. Brine Harbor = Ch.1, Spicegate =
 * Ch.2. Districts are data below; Tiled maps arrive when count grows.
 */
type DistrictId = 'harbor' | 'spicegate';

interface HubNpc {
  id: string;
  spriteKey: string;
  x: number;
  y: number;
  requires?: string[];
  dialogueId: string | (() => string);
  prompt?: string;
}

interface Gate {
  x: number;
  y: number;
  r: number;
  label: () => string;
  locked: () => boolean;
  action: () => void;
}

type SeqStep =
  | { kind: 'dialogue'; id: string }
  | { kind: 'drill'; spec: DrillSpec }
  | { kind: 'match'; config: () => MatchConfig; arena?: ArenaDress };

interface SceneData {
  district?: DistrictId;
}

function drillConfig(seed: number): MatchConfig {
  const config = defaultMatchConfig(seed);
  config.rules = { durationS: 600, scoreLimit: 99, goldenGoal: false, kickoffOverride: 0 };
  config.away.dummy = true;
  return config;
}

/** Spice Runners: tiki-fast (docs/03 §10.4) — one-touch tempo punishes chasing. */
export function spiceMatchConfig(seed: number): MatchConfig {
  const config = defaultMatchConfig(seed);
  config.away = {
    teamId: 'team_spice',
    human: false,
    reactionMs: 240,
    aiProfile: { press: 0.5, line: 0.6, tempo: 0.9, risk: 0.4, phys: 0.1, show: 0.3, wall: 0.4, stam: 0.6 },
    players: [
      { id: 'chr_nadia', stats: { pace: 6, power: 4, touch: 8, guard: 3, engine: 6 } },
      { id: 'chr_spice_a', stats: { pace: 5, power: 4, touch: 6, guard: 4, engine: 5 } },
      { id: 'chr_spice_b', stats: { pace: 6, power: 3, touch: 6, guard: 3, engine: 5 } },
    ],
  };
  return config;
}

const WALK_SPEED = 70;
const BOUNDS = { minX: 24, maxX: 456, minY: 92, maxY: 240 };

export class HubScene extends Phaser.Scene {
  private district: DistrictId = 'harbor';
  private inputSvc!: InputService;
  private sfxp!: SfxPlayer;
  private player!: { view: CharacterView; state: PlayerState };
  private npcs: HubNpc[] = [];
  private gates: Gate[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private promptTarget: HubNpc | Gate | null = null;
  private prevInteract = false;
  private inDialogue = false;
  private sequence: SeqStep[] = [];
  private sequenceIndex = -1;
  private stepClock = 0;

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
    return requires.every((r) => (r.startsWith('!') ? !this.has(r.slice(1)) : this.has(r)));
  }

  // ---- lifecycle ----------------------------------------------------------

  create(data: SceneData): void {
    this.district = data.district ?? this.district ?? 'harbor';
    this.sequenceIndex = -1;
    this.inDialogue = false;
    this.prevInteract = true;
    this.stepClock = 0;

    if (this.district === 'harbor') this.drawHarbor();
    else this.drawSpicegate();

    this.sfxp = new SfxPlayer(this);
    music.play('harbor');
    fadeIn(this);

    const spawn = this.district === 'harbor' ? { x: 90, y: 210 } : { x: 40, y: 190 };
    this.player = {
      view: new CharacterView(this, 'chr_ash'),
      state: {
        id: 'chr_ash',
        team: 0,
        pos: spawn,
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

    this.npcs = (this.district === 'harbor' ? this.harborNpcs() : this.spicegateNpcs()).filter(
      (npc) => this.meets(npc.requires),
    );
    this.gates = this.district === 'harbor' ? this.harborGates() : this.spicegateGates();

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

    this.objectiveText = this.add
      .text(6, 5, '', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#e8e3d0',
        backgroundColor: '#131118dd',
        padding: { x: 6, y: 2 },
      })
      .setDepth(21);

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

  // ---- district definitions ----------------------------------------------

  private harborNpcs(): HubNpc[] {
    return [
      {
        id: 'tero',
        spriteKey: 'char_tero',
        x: 96,
        y: 150,
        dialogueId: () => (this.has('ch1.metTero') ? 'hub_tero' : 'ch1_intro'),
      },
      { id: 'juno', spriteKey: 'char_juno', x: 372, y: 168, requires: ['ch1.metTero', '!ch2.delivered'], dialogueId: 'hub_juno' },
      { id: 'bram', spriteKey: 'char_bram', x: 396, y: 196, requires: ['ch1.metTero'], dialogueId: 'hub_bram' },
      {
        id: 'nino',
        spriteKey: 'char_nino',
        x: 320,
        y: 120,
        dialogueId: () => (this.has('ch1.complete') ? 'hub_nino' : 'hub_nino_early'),
      },
      { id: 'salt', spriteKey: 'char_salt', x: 220, y: 208, requires: ['ch1.complete'], dialogueId: 'hub_salt' },
      { id: 'bell', spriteKey: '', x: 196, y: 96, dialogueId: 'hub_bell', prompt: 'LOOK [A]' },
    ];
  }

  private harborGates(): Gate[] {
    return [
      {
        x: 430,
        y: 150,
        r: 26,
        label: () =>
          !this.has('ch1.metTero')
            ? 'THE NETYARD — chained. Find Coach Tero.'
            : !this.has('ch1.complete')
              ? 'CHALLENGE THE GULLS [A]'
              : 'PLAY A FRIENDLY [A]',
        locked: () => !this.has('ch1.metTero'),
        action: () => {
          if (!this.has('ch1.complete')) {
            this.sequence = [
              { kind: 'dialogue', id: 'ch1_drill_pass' },
              { kind: 'drill', spec: { type: 'pass', target: 6, title: 'THE HONEST PASS' } },
              { kind: 'dialogue', id: 'ch1_drill_shoot' },
              { kind: 'drill', spec: { type: 'shoot', target: 3, title: 'RING IT' } },
              { kind: 'dialogue', id: 'ch1_prematch' },
              { kind: 'match', config: (): MatchConfig => defaultMatchConfig(Math.floor(Math.random() * 1e9)) },
              { kind: 'dialogue', id: 'ch1_aftermath' },
            ];
            this.startSequence();
          } else {
            music.stop(250);
            transitionTo(this, 'Match', { returnTo: 'Hub' });
          }
        },
      },
      {
        x: 462,
        y: 224,
        r: 22,
        label: () =>
          this.has('ch1.complete') ? 'SPICEGATE MARKET ▸ [A]' : "SPICEGATE ▸ — closed to quiet crews",
        locked: () => !this.has('ch1.complete'),
        action: () => {
          this.registry.set('district', 'spicegate');
          transitionTo(this, 'Hub', { district: 'spicegate' }, 250);
        },
      },
    ];
  }

  private spicegateNpcs(): HubNpc[] {
    return [
      {
        id: 'nadia',
        spriteKey: 'char_nadia',
        x: 330,
        y: 130,
        dialogueId: () =>
          this.has('ch2.complete')
            ? 'hub_nadia'
            : !this.has('ch2.metNadia')
              ? 'ch2_nadia_intro'
              : this.has('ch2.crate') && !this.has('ch2.delivered')
                ? 'ch2_deliver'
                : 'ch2_nadia_wait',
      },
      {
        id: 'seppi',
        spriteKey: 'char_seppi',
        x: 120,
        y: 140,
        requires: ['ch2.metNadia'],
        dialogueId: () => (this.has('ch2.crate') ? 'hub_seppi' : 'ch2_seppi'),
      },
      {
        id: 'juno',
        spriteKey: 'char_juno',
        x: 220,
        y: 200,
        requires: ['ch2.delivered'],
        dialogueId: () => (this.has('ch2.junoTalk') ? 'hub_juno_spice' : 'ch2_juno'),
      },
      // Undertide fragment 2: Nadia's debt book on the stall counter.
      { id: 'debtbook', spriteKey: '', x: 356, y: 118, requires: ['ch2.metNadia'], dialogueId: 'spice_debtbook', prompt: 'LOOK [A]' },
    ];
  }

  private spicegateGates(): Gate[] {
    return [
      {
        x: 20,
        y: 190,
        r: 22,
        label: () => '◂ BRINE HARBOR [A]',
        locked: () => false,
        action: () => {
          this.registry.set('district', 'harbor');
          transitionTo(this, 'Hub', { district: 'harbor' }, 250);
        },
      },
      {
        x: 430,
        y: 200,
        r: 26,
        label: () =>
          this.has('ch2.complete')
            ? 'PLAY A FRIENDLY [A]'
            : this.has('ch2.junoTalk')
              ? 'CHALLENGE THE SPICE RUNNERS [A]'
              : 'THE KETTLE — earn your cage time first',
        locked: () => !this.has('ch2.junoTalk') && !this.has('ch2.complete'),
        action: () => {
          if (!this.has('ch2.complete')) {
            this.sequence = [
              { kind: 'dialogue', id: 'ch2_prematch' },
              { kind: 'match', config: (): MatchConfig => spiceMatchConfig(Math.floor(Math.random() * 1e9)), arena: KETTLE },
              { kind: 'dialogue', id: 'ch2_aftermath' },
            ];
            this.startSequence();
          } else {
            music.stop(250);
            transitionTo(this, 'Match', {
              returnTo: 'Hub',
              config: spiceMatchConfig(Math.floor(Math.random() * 1e9)),
              arena: KETTLE,
            });
          }
        },
      },
    ];
  }

  private objective(): string {
    if (this.sequenceIndex >= 0) return '';
    if (this.district === 'harbor') {
      if (!this.has('ch1.metTero')) return '▸ Find Coach Tero';
      if (!this.has('ch1.complete')) return '▸ Enter the Netyard — take back the pin';
      if (!this.has('ch2.complete')) return '▸ Spicegate is open — head east';
      return '▸ Old Cobble opens soon · the coast is yours';
    }
    if (!this.has('ch2.metNadia')) return '▸ Find Nadia at the Kettle';
    if (!this.has('ch2.crate')) return "▸ Seppi's stall — earn your cage time";
    if (!this.has('ch2.delivered')) return '▸ Deliver the crate to Nadia';
    if (!this.has('ch2.junoTalk')) return '▸ Talk to Juno — she knows this crew';
    if (!this.has('ch2.complete')) return '▸ Challenge the Spice Runners at the Kettle';
    return '▸ Old Cobble opens soon · Spicegate is yours';
  }

  // ---- sequence runner ----------------------------------------------------

  private startSequence(): void {
    this.sfxp.play('uiConfirm', 0.6);
    this.sequenceIndex = 0;
    this.runSequenceStep();
  }

  private runSequenceStep(): void {
    const step = this.sequence[this.sequenceIndex];
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
          config: step.config(),
          story: true,
          ...(step.arena ? { arena: step.arena } : {}),
        });
        break;
    }
  }

  private onDialogueDone = (payload: { dialogueId: string; flags: string[] }): void => {
    this.addFlags(payload.flags);
    this.inDialogue = false;
    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Hub';
    // Scenes that change who is standing where restart the stage.
    if (payload.dialogueId === 'ch1_intro') {
      this.addFlags(['ch1.metTero']);
      this.scene.restart({ district: this.district });
      return;
    }
    if (['ch2_nadia_intro', 'ch2_seppi', 'ch2_deliver', 'ch2_juno'].includes(payload.dialogueId)) {
      this.scene.restart({ district: this.district });
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
      // Park one before the match step; the dialogue-done advance re-runs it.
      this.sequenceIndex = this.sequence.findIndex((s) => s.kind === 'match') - 1;
      this.inDialogue = true;
      this.scene.launch('Dialogue', {
        dialogueId: this.district === 'harbor' ? 'ch1_retry' : 'ch2_retry',
      });
    }
  };

  private finishChapter(): void {
    this.sequenceIndex = -1;
    const harbor = this.district === 'harbor';
    void this.saveProgress(harbor ? 2 : 3);
    this.pinCeremony(
      harbor ? 'THE GULL PIN IS YOURS' : 'THE SPICE PIN IS YOURS',
      harbor ? 'Stinger' : null,
    );
  }

  private async saveProgress(chapter: number): Promise<void> {
    const save = createDefaultSave(BUILD_VERSION, Date.now());
    save.flags = [...this.flags()];
    save.chapter = chapter;
    save.shells = chapter * 60;
    try {
      await commitSave(save);
    } catch {
      // Storage unavailable — session continues.
    }
  }

  private pinCeremony(label: string, nextScene: string | null): void {
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
    const text = this.add
      .text(cx, GAME_HEIGHT / 2 + 16, label, { fontFamily: FONT_BODY, fontSize: FS_BODY, color: UI.textMain })
      .setOrigin(0.5)
      .setDepth(31);
    const hint = this.add
      .text(cx, GAME_HEIGHT / 2 + 34, 'tap to continue', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: UI.textDim })
      .setOrigin(0.5)
      .setDepth(31);
    this.time.delayedCall(700, () => {
      const go = (): void => {
        dim.destroy();
        pin.destroy();
        text.destroy();
        hint.destroy();
        if (nextScene) transitionTo(this, nextScene, undefined, 350);
        else this.scene.restart({ district: this.district });
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
      // Footsteps on the quay stones.
      this.stepClock += dt;
      if (this.stepClock > 0.34) {
        this.stepClock = 0;
        this.sfxp.play('step', 0.08, 350);
      }
    } else {
      state.vel.x = 0;
      state.vel.y = 0;
    }
    state.pos.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, state.pos.x + state.vel.x * dt));
    state.pos.y = Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, state.pos.y + state.vel.y * dt));
    this.player.view.update(state, dt);

    // Interaction targeting: nearest NPC, else nearest gate.
    this.promptTarget = null;
    let bestD = 26;
    for (const npc of this.npcs) {
      const d = Math.hypot(npc.x - state.pos.x, npc.y - state.pos.y);
      if (d < bestD) {
        bestD = d;
        this.promptTarget = npc;
      }
    }
    if (this.promptTarget === null) {
      for (const gate of this.gates) {
        const d = Math.hypot(gate.x - state.pos.x, gate.y - state.pos.y);
        if (d < gate.r) {
          this.promptTarget = gate;
          break;
        }
      }
    }

    if (this.promptTarget) {
      const isGate = 'label' in this.promptTarget;
      const label = isGate
        ? (this.promptTarget as Gate).label()
        : ((this.promptTarget as HubNpc).prompt ?? 'TALK [A]');
      const px = isGate ? Math.min(this.promptTarget.x, GAME_WIDTH - 60) : this.promptTarget.x;
      const py = isGate ? this.promptTarget.y - 24 : this.promptTarget.y - 18;
      this.prompt.setVisible(true).setText(label).setPosition(px, py);
    } else {
      this.prompt.setVisible(false);
    }

    const interact = cmd.pass;
    if (interact && !this.prevInteract && this.promptTarget) {
      if ('label' in this.promptTarget) {
        const gate = this.promptTarget as Gate;
        if (gate.locked()) {
          this.sfxp.play('uiClick', 0.3, 400);
        } else {
          gate.action();
        }
      } else {
        const npc = this.promptTarget as HubNpc;
        this.sfxp.play('uiSelect', 0.4);
        this.inDialogue = true;
        this.inputSvc.reset();
        const id = npc.dialogueId;
        this.scene.launch('Dialogue', { dialogueId: typeof id === 'function' ? id() : id });
      }
    }
    this.prevInteract = interact;
  }

  // ---- backdrops ----------------------------------------------------------

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
    // Gulls drifting over the water.
    for (let i = 0; i < 3; i++) {
      const bird = this.add
        .text(60 + i * 140, 50 + (i % 2) * 10, '⌄', { fontFamily: 'monospace', fontSize: '10px', color: '#8a94a2' })
        .setAlpha(0.7);
      this.tweens.add({
        targets: bird,
        x: bird.x + 60 + i * 20,
        y: bird.y - 6,
        duration: 9000 + i * 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
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
    const glint = this.add.rectangle(194, 93, 2, 2, 0xffffff, 0.9).setDepth(3).setAlpha(0);
    this.tweens.add({ targets: glint, alpha: { from: 0, to: 0.9 }, duration: 180, yoyo: true, repeat: -1, repeatDelay: 2600 });
    // Tero's boat, MARROW.
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
    // Netshed, crates, cage gate.
    g.fillStyle(0x2b303a);
    g.fillRect(40, 96, 90, 52);
    g.fillStyle(0x39424e);
    g.fillRect(40, 88, 90, 12);
    g.fillStyle(0x11141a);
    g.fillRect(70, 118, 18, 30);
    g.lineStyle(1, 0x5b6472, 0.7);
    for (let x = 44; x < 126; x += 8) g.lineBetween(x, 100, x - 4, 146);
    g.fillStyle(0x4a4030);
    g.fillRect(340, 100, 22, 16);
    g.fillRect(352, 88, 18, 14);
    g.lineStyle(1, 0x2f2b28);
    g.strokeRect(340, 100, 22, 16);
    g.strokeRect(352, 88, 18, 14);
    g.lineStyle(2, 0x5b6472);
    g.strokeRect(408, 110, 64, 80);
    g.lineStyle(1, 0x39525a, 0.7);
    for (let x = 412; x < 470; x += 8) g.lineBetween(x, 110, x - 4, 190);
    g.fillStyle(0xf2c14e, 0.12);
    g.fillRect(408, 110, 64, 80);
    // East road to Spicegate.
    g.fillStyle(0x2d2622, 1);
    g.fillRect(440, 208, 40, 26);
    this.add
      .text(85, 92, "TERO'S NETS", { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#9a968a' })
      .setOrigin(0.5, 1)
      .setAlpha(0.85);
    this.add
      .text(440, 106, 'THE NETYARD', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: UI.gold })
      .setOrigin(0.5, 1)
      .setAlpha(0.9);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'BRINE HARBOR', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#4a4a55' })
      .setOrigin(0.5)
      .setAlpha(0.8);
  }

  private drawSpicegate(): void {
    const g = this.add.graphics();
    // Warm dusk over the market.
    g.fillStyle(0x33222a);
    g.fillRect(0, 0, GAME_WIDTH, 60);
    g.fillStyle(0xc2643a, 0.35);
    g.fillRect(0, 50, GAME_WIDTH, 4);
    // Market floor — warm brick.
    g.fillStyle(0x2b2422);
    g.fillRect(0, 54, GAME_WIDTH, GAME_HEIGHT - 54);
    g.fillStyle(0x322a26);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = 54 + ((x / 32) % 2 === 0 ? 0 : 16); y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    // Stall rows with awnings (alternating red/gold stripes).
    const stall = (x: number, y: number, w: number, primary: number): void => {
      g.fillStyle(0x4a3a2a);
      g.fillRect(x, y + 10, w, 18);
      for (let i = 0; i < w; i += 8) {
        g.fillStyle(i % 16 === 0 ? primary : 0xe8d9b8);
        g.fillRect(x + i, y, 8, 8);
      }
      g.fillStyle(0x241f2b);
      g.fillRect(x, y + 8, w, 2);
    };
    stall(60, 96, 72, 0xb03535);
    stall(160, 84, 64, 0xd08f2e);
    stall(300, 96, 88, 0xb03535); // Nadia's stall
    stall(64, 196, 56, 0xd08f2e);
    // Nadia's debt book on the counter (fragment 2 — it glints).
    g.fillStyle(0x5e4826);
    g.fillRect(352, 114, 10, 6);
    g.fillStyle(0xe8d9b8);
    g.fillRect(353, 115, 8, 1);
    const glint = this.add.rectangle(357, 116, 2, 2, 0xffffff, 0.9).setDepth(3).setAlpha(0);
    this.tweens.add({ targets: glint, alpha: { from: 0, to: 0.9 }, duration: 180, yoyo: true, repeat: -1, repeatDelay: 2400 });
    // Strung lanterns.
    for (let x = 40; x < GAME_WIDTH - 20; x += 44) {
      g.lineStyle(1, 0x241f2b, 0.8);
      g.lineBetween(x, 66, x + 44, 70);
      const lamp = this.add.rectangle(x + 22, 72, 4, 5, 0xf2c14e, 0.95).setDepth(2);
      this.tweens.add({
        targets: lamp,
        alpha: 0.55,
        duration: 900 + ((x * 13) % 600),
        yoyo: true,
        repeat: -1,
      });
    }
    // The Kettle — cage in the courtyard, always steaming.
    g.lineStyle(2, 0x5b6472);
    g.strokeRect(404, 150, 68, 84);
    g.lineStyle(1, 0x7c4a2a, 0.8);
    for (let x = 408; x < 468; x += 8) g.lineBetween(x, 150, x - 4, 234);
    g.fillStyle(0xb03535, 0.1);
    g.fillRect(404, 150, 68, 84);
    const steamTex = 'px-steam';
    if (!this.textures.exists(steamTex)) {
      const sg = this.make.graphics({ x: 0, y: 0 }, false);
      sg.fillStyle(0xe8d9b8);
      sg.fillRect(0, 0, 2, 2);
      sg.generateTexture(steamTex, 2, 2);
      sg.destroy();
    }
    const steam = this.add.particles(438, 150, steamTex, {
      speedY: { min: -14, max: -7 },
      speedX: { min: -4, max: 4 },
      alpha: { start: 0.35, end: 0 },
      scale: { start: 1, end: 2.2 },
      lifespan: 2600,
      frequency: 260,
    });
    steam.setDepth(2);
    // West road back to the harbor.
    g.fillStyle(0x2d2622);
    g.fillRect(0, 176, 36, 28);
    this.add
      .text(346, 92, "NADIA'S", { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#e8d9b8' })
      .setOrigin(0.5, 1)
      .setAlpha(0.9);
    this.add
      .text(438, 146, 'THE KETTLE', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: UI.gold })
      .setOrigin(0.5, 1)
      .setAlpha(0.9);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'SPICEGATE MARKET', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#5e4a45' })
      .setOrigin(0.5)
      .setAlpha(0.85);
  }
}
