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
import { CLOISTER, defaultMatchConfig, KETTLE, type ArenaDress, type DrillSpec } from './MatchScene';
import type { MatchConfig, PlayerState } from '../domain/match/types';
import * as props from '../presentation/props';
import * as buildings from '../presentation/buildings';

/**
 * District hubs — the chapters' stages (docs/04 §2). Every chapter plays IN
 * PLACE: NPCs exist only when the story summons them, gates say what they mean,
 * the objective chip always points forward. Brine Harbor = Ch.1, Spicegate =
 * Ch.2. Districts are data below; Tiled maps arrive when count grows.
 */
type DistrictId = 'harbor' | 'spicegate' | 'oldcobble';

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

/** Cobble Saints: the ninety-year low block (docs/03 §10.4) — deep, walled,
 * patient, and Ivy up front as the one fast thing on the hill. */
export function cloisterMatchConfig(seed: number): MatchConfig {
  const config = defaultMatchConfig(seed);
  config.away = {
    teamId: 'team_saints',
    human: false,
    reactionMs: 210,
    aiProfile: { press: 0.15, line: 0.15, tempo: 0.3, risk: 0.2, phys: 0.4, show: 0.0, wall: 0.9, stam: 0.9 },
    players: [
      { id: 'chr_prior', stats: { pace: 3, power: 6, touch: 5, guard: 9, engine: 7 } },
      { id: 'chr_saint_a', stats: { pace: 4, power: 5, touch: 5, guard: 7, engine: 6 } },
      { id: 'chr_ivy', stats: { pace: 9, power: 3, touch: 7, guard: 3, engine: 7 } },
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
  private stepDust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastObjective: string | null = null;

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
    this.lastObjective = null;

    if (this.district === 'harbor') this.drawHarbor();
    else if (this.district === 'spicegate') this.drawSpicegate();
    else this.drawOldCobble();

    this.sfxp = new SfxPlayer(this);
    music.play(
      this.district === 'spicegate' ? 'market' : this.district === 'oldcobble' ? 'cloister' : 'harbor',
    );
    fadeIn(this);

    // Footstep dust puffs (shared pixel texture with MatchScene).
    if (!this.textures.exists('px-dust')) {
      const dg = this.make.graphics({ x: 0, y: 0 }, false);
      dg.fillStyle(0x8a8f98);
      dg.fillRect(0, 0, 2, 2);
      dg.generateTexture('px-dust', 2, 2);
      dg.destroy();
    }
    this.stepDust = this.add.particles(0, 0, 'px-dust', {
      speed: { min: 6, max: 22 },
      lifespan: 320,
      quantity: 0,
      alpha: { start: 0.5, end: 0 },
      emitting: false,
    });
    this.stepDust.setDepth(3);

    const spawn =
      this.district === 'harbor'
        ? { x: 90, y: 210 }
        : this.district === 'spicegate'
          ? { x: 40, y: 190 }
          : { x: 246, y: 210 }; // Old Cobble: you arrive up the steps from the south
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

    const npcSource =
      this.district === 'harbor'
        ? this.harborNpcs()
        : this.district === 'spicegate'
          ? this.spicegateNpcs()
          : this.oldcobbleNpcs();
    this.npcs = npcSource.filter((npc) => this.meets(npc.requires));
    this.gates =
      this.district === 'harbor'
        ? this.harborGates()
        : this.district === 'spicegate'
          ? this.spicegateGates()
          : this.oldcobbleGates();

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
        // Generous radius: the walkable corner by the cage must stay inside it.
        r: 34,
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
          this.has('ch3.errand') && !this.has('ch3.lantern')
            ? 'ch3_lantern'
            : this.has('ch2.complete')
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
        r: 34,
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
      {
        x: 246,
        y: 104,
        r: 24,
        label: () =>
          this.has('ch2.complete') ? 'OLD COBBLE STEPS ▴ [A]' : 'THE STEPS — the hill hears no drums yet',
        locked: () => !this.has('ch2.complete'),
        action: () => {
          this.registry.set('district', 'oldcobble');
          transitionTo(this, 'Hub', { district: 'oldcobble' }, 250);
        },
      },
    ];
  }

  private oldcobbleNpcs(): HubNpc[] {
    return [
      {
        id: 'ivy',
        spriteKey: 'char_ivy',
        x: 150,
        y: 148,
        dialogueId: () =>
          this.has('ch3.complete')
            ? this.has('ivy.crew')
              ? 'hub_ivy_crew'
              : 'hub_ivy_earn'
            : !this.has('ch3.metIvy')
              ? 'ch3_ivy_intro'
              : 'ch3_ivy_wait',
      },
      {
        id: 'alder',
        spriteKey: 'char_alder',
        x: 258,
        y: 116,
        dialogueId: () =>
          this.has('ch3.complete')
            ? 'hub_alder'
            : !this.has('ch3.metIvy')
              ? 'ch3_alder_first'
              : !this.has('ch3.errand')
                ? 'ch3_alder'
                : !this.has('ch3.lantern')
                  ? 'ch3_alder_wait'
                  : !this.has('ch3.keeperTalk')
                    ? 'ch3_alder2'
                    : 'ch3_alder_vouched',
      },
      {
        id: 'prior',
        spriteKey: 'char_prior',
        x: 386,
        y: 168,
        dialogueId: () =>
          this.has('ch3.complete')
            ? 'hub_prior'
            : this.has('ch3.keeperTalk')
              ? 'ch3_prior_ready'
              : 'ch3_prior',
      },
      // Undertide fragment 3: the tower plaque, unlocked once the Saints fall.
      {
        id: 'plaque',
        spriteKey: '',
        x: 240,
        y: 98,
        requires: ['ch3.complete'],
        dialogueId: 'cloister_plaque',
        prompt: 'THE TOWER [A]',
      },
    ];
  }

  private oldcobbleGates(): Gate[] {
    return [
      {
        x: 246,
        y: 238,
        r: 22,
        label: () => '▾ THE STEPS — down to Spicegate [A]',
        locked: () => false,
        action: () => {
          this.registry.set('district', 'spicegate');
          transitionTo(this, 'Hub', { district: 'spicegate' }, 250);
        },
      },
      {
        x: 430,
        y: 190,
        r: 34,
        label: () =>
          !this.has('ch3.keeperTalk') && !this.has('ch3.complete')
            ? 'THE CLOISTER — the Saints only play the vouched-for'
            : !this.has('ch3.complete')
              ? 'CHALLENGE THE SAINTS [A]'
              : 'PLAY A FRIENDLY [A]',
        locked: () => !this.has('ch3.keeperTalk') && !this.has('ch3.complete'),
        action: () => {
          if (!this.has('ch3.complete')) {
            this.sequence = [
              { kind: 'dialogue', id: 'ch3_prematch' },
              { kind: 'match', config: (): MatchConfig => cloisterMatchConfig(Math.floor(Math.random() * 1e9)), arena: CLOISTER },
              { kind: 'dialogue', id: 'ch3_aftermath' },
            ];
            this.startSequence();
          } else {
            music.stop(250);
            transitionTo(this, 'Match', {
              returnTo: 'Hub',
              config: cloisterMatchConfig(Math.floor(Math.random() * 1e9)),
              arena: CLOISTER,
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
      if (!this.has('ch3.complete')) return '▸ Old Cobble is open — the steps past Spicegate';
      return '▸ Three pins home · the coast is yours';
    }
    if (this.district === 'spicegate') {
      if (!this.has('ch2.metNadia')) return '▸ Find Nadia at the Kettle';
      if (!this.has('ch2.crate')) return "▸ Seppi's stall — earn your cage time";
      if (!this.has('ch2.delivered')) return '▸ Deliver the crate to Nadia';
      if (!this.has('ch2.junoTalk')) return '▸ Talk to Juno — she knows this crew';
      if (!this.has('ch2.complete')) return '▸ Challenge the Spice Runners at the Kettle';
      if (this.has('ch3.errand') && !this.has('ch3.lantern')) return "▸ A storm-lantern for the hill — Nadia's stall";
      if (!this.has('ch3.complete')) return '▸ The steps to Old Cobble are open — the north arch';
      return '▸ Spicegate is yours';
    }
    if (!this.has('ch3.metIvy')) return '▸ Someone is playing alone up here — find them';
    if (!this.has('ch3.errand')) return '▸ Ask the bell keeper to vouch for you';
    if (!this.has('ch3.lantern')) return '▸ Bring a storm-lantern up from Spicegate';
    if (!this.has('ch3.keeperTalk')) return '▸ Take the lantern to Keeper Alder';
    if (!this.has('ch3.complete')) return '▸ Challenge the Saints at the Cloister';
    return '▸ The hill is quiet · three pins home';
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
        dialogueId:
          this.district === 'harbor' ? 'ch1_retry' : this.district === 'spicegate' ? 'ch2_retry' : 'ch3_retry',
      });
    }
  };

  private finishChapter(): void {
    this.sequenceIndex = -1;
    const chapter = this.district === 'harbor' ? 2 : this.district === 'spicegate' ? 3 : 4;
    void this.saveProgress(chapter);
    this.pinCeremony(
      this.district === 'harbor'
        ? 'THE GULL PIN IS YOURS'
        : this.district === 'spicegate'
          ? 'THE SPICE PIN IS YOURS'
          : 'THE SAINT PIN IS YOURS',
      this.district === 'harbor' ? 'Stinger' : null,
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
    const objective = this.objective();
    if (objective !== this.lastObjective) {
      // New marching orders: the chip slides in and glints gold for a beat.
      this.lastObjective = objective;
      this.objectiveText.setText(objective).setVisible(objective !== '');
      if (objective !== '') {
        this.objectiveText.setX(-this.objectiveText.width).setAlpha(0.4);
        this.objectiveText.setColor('#f2c14e');
        this.tweens.add({
          targets: this.objectiveText,
          x: 6,
          alpha: 1,
          duration: 320,
          ease: 'Cubic.easeOut',
          onComplete: () => this.objectiveText.setColor('#e8e3d0'),
        });
      }
    }
    if (this.inDialogue || this.sequenceIndex >= 0) return;
    // Generous dt cap: hub movement is a clamped box, not physics, so honour
    // real elapsed time even on slow devices — a tight cap silently eats walk
    // distance at low fps and makes gates unreachable.
    const dt = Math.min(deltaMs / 1000, 0.25);
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
        this.stepDust.emitParticleAt(state.pos.x, state.pos.y + 8, 2);
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
    // Living water: glints that drift with an unseen swell.
    for (let i = 0; i < 4; i++) {
      const glintLine = this.add.rectangle(50 + i * 110, 52 + (i % 3) * 8, 18, 1, 0xf2c14e, 0.16);
      this.tweens.add({
        targets: glintLine,
        x: glintLine.x + 26,
        alpha: 0.04,
        duration: 2600 + i * 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    // Far shore across the water: warehouse rooflines, a crane, lit windows.
    buildings.farShore(g, 46);
    g.fillStyle(0x39424e);
    g.fillRect(0, 78, GAME_WIDTH, 6);
    // Quay paving: flagstone courses with cracks and weeds, not a checkerboard.
    buildings.flagstones(g, 0, 84, GAME_WIDTH, GAME_HEIGHT - 84);
    buildings.drainGrate(g, 232, 168);
    buildings.drainGrate(g, 96, 236);
    // Bollards and chain along the water's edge.
    buildings.bollards(g, 81, [20, 108, 246, 334, 424]);
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
    // Tero's net shop: tin roof, plank walls, a lit window, the door he
    // stands in front of all day.
    buildings.shack(g, 40, 104, {
      w: 90,
      h: 44,
      roofH: 14,
      door: 47,
      windows: [10],
      scene: this,
    });
    // Nets drying against the wall between window and door.
    g.lineStyle(1, 0x39525a, 0.8);
    for (let nx = 32; nx < 46; nx += 5) g.lineBetween(40 + nx, 108, 40 + nx - 3, 140);
    for (let ny = 112; ny < 140; ny += 7) g.lineBetween(70, ny, 86, ny + 2);
    // Buoys hung on the planks.
    g.fillStyle(0xc2643a);
    g.fillCircle(116, 116, 3);
    g.fillStyle(0x2e9e8f);
    g.fillCircle(123, 120, 3);
    g.lineStyle(1, 0x191621, 0.7);
    g.lineBetween(116, 108, 116, 113);
    g.lineBetween(123, 108, 123, 117);
    props.crate(g, 340, 100, 22);
    props.crate(g, 352, 88, 18);
    props.crate(g, 332, 112, 12);
    // Set dressing: the harbor is a working dock, not a stage.
    props.lamppost(this, g, 168, 132);
    props.lamppost(this, g, 300, 190);
    props.barrel(g, 138, 158);
    props.barrel(g, 148, 160);
    props.ropeCoil(g, 160, 172);
    props.netPile(g, 52, 162);
    props.netPile(g, 260, 100);
    props.fishCrate(g, 138, 96);
    props.fishCrate(g, 372, 168);
    props.puddle(this, g, 250, 175, 30);
    props.puddle(this, g, 120, 232, 22);
    props.bench(g, 214, 106);
    props.poster(g, 44, 104, 0xf2c14e);
    props.poster(g, 56, 106, 0xc2643a);
    props.chalkCrescent(g, 240, 210, 14);
    // Gulls tag by the cage — crossed out in teal once the pin comes home.
    props.chalkScrawl(g, 386, 226, this.has('ch1.complete'));
    props.laundry(this, g, 132, 208, 94);
    props.cat(this, 150, 320, 236);
    props.pigeon(this, 210, 130);
    props.pigeon(this, 230, 136);
    props.ambientWalker(this, 'char_oldkid_a', 260, 400, 226, 9000);
    // A dinghy and mooring ropes on the water line.
    g.fillStyle(0x2b303a);
    g.fillRect(150, 66, 26, 6);
    g.lineStyle(1, 0x8a7a5c, 0.6);
    g.lineBetween(110, 81, 118, 70);
    g.lineBetween(290, 81, 296, 71);
    // The Netyard: a real street cage — kerb, capped posts, diamond mesh.
    buildings.cage(g, 408, 110, 64, 80, { tint: 0xf2c14e, tintAlpha: 0.1 });
    // East road to Spicegate, framed by stone pillars.
    g.fillStyle(0x2d2622, 1);
    g.fillRect(440, 208, 40, 26);
    buildings.roadPillars(g, 466, 184, 234);
    buildings.signboard(this, g, 85, 92, "TERO'S NETS", { color: '#d9d3c0' });
    buildings.signboard(this, g, 440, 100, 'THE NETYARD', { color: UI.gold, hang: true });
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'BRINE HARBOR', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#4a4a55' })
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.duskGrade();
  }

  /** Soft edge darkening so the district sits in evening light, not a void. */
  private duskGrade(): void {
    const grade = this.add.graphics().setDepth(15);
    grade.fillStyle(0x0e0e14, 0.08);
    grade.fillRect(0, 0, 16, GAME_HEIGHT);
    grade.fillRect(GAME_WIDTH - 16, 0, 16, GAME_HEIGHT);
    grade.fillStyle(0x0e0e14, 0.12);
    grade.fillRect(0, GAME_HEIGHT - 12, GAME_WIDTH, 12);
  }

  private drawSpicegate(): void {
    const g = this.add.graphics();
    // Warm dusk over the market.
    g.fillStyle(0x33222a);
    g.fillRect(0, 0, GAME_WIDTH, 60);
    g.fillStyle(0xc2643a, 0.35);
    g.fillRect(0, 50, GAME_WIDTH, 4);
    // Market floor — worn brick pavers, stained by years of spice trade.
    buildings.flagstones(g, 0, 54, GAME_WIDTH, GAME_HEIGHT - 54, {
      base: 0x2d2624,
      alt: 0x342b27,
      dark: 0x261f1d,
      mortar: 0x1e1917,
      weed: 0x4a3a26,
    });
    for (const [sx, sy, sw, color] of [
      [150, 160, 26, 0xc2643a],
      [260, 200, 20, 0xb03535],
      [90, 120, 18, 0xd08f2e],
      [340, 230, 24, 0xc2643a],
    ] as const) {
      g.fillStyle(color, 0.07);
      g.fillEllipse(sx, sy, sw, sw * 0.5);
    }
    buildings.drainGrate(g, 208, 190);
    // The street the market leans against: brick shopfronts, shutters, arches.
    buildings.shopfrontRow(g, 0, 50, GAME_WIDTH, 40);
    // Stall rows: legs, planked counters, spice mounds, scalloped awnings.
    buildings.marketStall(g, 60, 96, 72, 0xb03535);
    buildings.marketStall(g, 160, 84, 64, 0xd08f2e);
    buildings.marketStall(g, 300, 96, 88, 0xb03535); // Nadia's stall
    buildings.marketStall(g, 64, 196, 56, 0xd08f2e);
    buildings.marketStall(g, 160, 210, 72, 0xb03535);
    buildings.marketStall(g, 280, 218, 60, 0xd08f2e);
    // Market floor life: rugs, sacks of spice, produce, the working mess.
    props.rug(g, 140, 150, 44, 22, 0x7c2424, 0xd08f2e);
    props.rug(g, 246, 168, 36, 18, 0x5e4826, 0xb03535);
    props.sack(g, 96, 130, 0xc2643a);
    props.sack(g, 108, 132, 0xd08f2e);
    props.sack(g, 102, 140, 0xb03535);
    props.sack(g, 236, 116, 0xd08f2e);
    props.sack(g, 178, 116, 0xb03535);
    props.barrel(g, 132, 120);
    props.potStack(g, 246, 122);
    props.potStack(g, 130, 226);
    props.crate(g, 200, 122, 14);
    props.crate(g, 212, 128, 12);
    props.puddle(this, g, 200, 246, 26);
    props.chalkCrescent(g, 90, 176, 10, 0.1);
    props.pigeon(this, 150, 180);
    props.pigeon(this, 168, 186);
    props.pigeon(this, 260, 210);
    props.cat(this, 300, 120, 244);
    props.ambientWalker(this, 'char_gull_b', 90, 250, 170, 8000);
    props.ambientWalker(this, 'char_oldkid_b', 320, 140, 236, 11000);
    // Juno's old delivery cart, parked and fading (she walks past it daily).
    g.fillStyle(0x54432f);
    g.fillRect(36, 226, 26, 10);
    g.fillStyle(0x2f2b28);
    g.fillCircle(42, 238, 4);
    g.fillCircle(56, 238, 4);
    g.fillStyle(0xd08f2e, 0.35);
    g.fillRect(40, 228, 18, 3);
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
    buildings.cage(g, 404, 150, 68, 84, { tint: 0xb03535, tintAlpha: 0.12, accent: 0xb03535 });
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
    // Spice haze: gold motes drifting up through the lantern light.
    for (let i = 0; i < 8; i++) {
      const mote = this.add
        .rectangle(50 + i * 52, 110 + (i % 4) * 34, 1, 1, 0xf2c14e, 0.5)
        .setDepth(6);
      this.tweens.add({
        targets: mote,
        y: mote.y - 26,
        x: mote.x + (i % 2 === 0 ? 10 : -10),
        alpha: 0,
        duration: 5200 + i * 640,
        repeat: -1,
        delay: i * 800,
        ease: 'Sine.easeInOut',
      });
    }
    // West road back to the harbor, framed by stone pillars.
    g.fillStyle(0x2d2622);
    g.fillRect(0, 176, 36, 28);
    buildings.roadPillars(g, 6, 152, 204);
    buildings.signboard(this, g, 346, 86, "NADIA'S", { bg: 0x7c2424 });
    buildings.signboard(this, g, 438, 140, 'THE KETTLE', { color: UI.gold, hang: true });
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'SPICEGATE MARKET', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#5e4a45' })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.duskGrade();
  }

  private drawOldCobble(): void {
    const g = this.add.graphics();
    // Dusk over the hill — and far below, the whole town you climbed from.
    g.fillStyle(0x1c2030);
    g.fillRect(0, 0, GAME_WIDTH, 30);
    g.fillStyle(0x141822);
    for (let x = 8; x < GAME_WIDTH; x += 26) {
      g.fillRect(x, 20 + ((x * 7) % 3), 14, 8 - ((x * 7) % 3));
    }
    g.fillStyle(0x1a2732);
    g.fillRect(0, 26, GAME_WIDTH, 4); // the sea, a thin line from up here
    for (let i = 0; i < 14; i++) {
      // Harbor lights still burning below. One of them is Tero's window.
      g.fillStyle(0xf2c14e, 0.5 + ((i * 13) % 3) * 0.12);
      g.fillRect(14 + ((i * 37) % 452), 21 + ((i * 11) % 6), 1, 1);
    }
    // Parapet at the yard's edge.
    g.fillStyle(0x3a3e3a);
    g.fillRect(0, 30, GAME_WIDTH, 5);
    g.fillStyle(0x4c524c);
    g.fillRect(0, 30, GAME_WIDTH, 2);
    // The monastery wall and its cloister arcade.
    g.fillStyle(0x33372f);
    g.fillRect(0, 35, GAME_WIDTH, 55);
    g.fillStyle(0x3b4036, 0.9);
    for (let by = 38; by < 88; by += 6) {
      for (let bx = ((by / 6) % 2) * 7; bx < GAME_WIDTH; bx += 14) g.fillRect(bx, by, 13, 5);
    }
    for (let ax = 24; ax < GAME_WIDTH - 30; ax += 52) {
      if (ax > 190 && ax < 290) continue; // the tower owns the centre
      g.fillStyle(0x14161a, 0.95);
      g.fillRect(ax, 56, 20, 34);
      g.fillCircle(ax + 10, 58, 10);
      g.fillStyle(0xc9a06a, 0.35); // candlelight deep in the walk
      g.fillRect(ax + 9, 78, 2, 2);
    }
    // The bell tower — the First Bell lives here.
    g.fillStyle(0x3a3e3a);
    g.fillRect(216, 6, 60, 92);
    g.fillStyle(0x4c524c);
    g.fillRect(216, 6, 60, 3);
    g.fillRect(216, 6, 3, 92);
    g.fillStyle(0x2b2f2b);
    for (let sy = 14; sy < 92; sy += 9) g.fillRect(219, sy, 54, 1);
    g.fillStyle(0x14161a);
    g.fillRect(228, 16, 36, 26); // the bell chamber
    g.fillCircle(246, 20, 17);
    g.fillStyle(0xa08d48); // the First Bell, old gold going green
    g.fillRect(238, 20, 16, 12);
    g.fillRect(240, 32, 12, 3);
    g.fillStyle(0x6e7a5a, 0.8);
    g.fillRect(238, 26, 4, 6); // patina
    g.fillStyle(0x241f2b);
    g.fillRect(245, 35, 2, 2); // clapper
    const bellGlint = this.add.rectangle(250, 22, 2, 2, 0xffffff, 0.9).setDepth(3).setAlpha(0);
    this.tweens.add({ targets: bellGlint, alpha: { from: 0, to: 0.9 }, duration: 200, yoyo: true, repeat: -1, repeatDelay: 3400 });
    // Tower door below the chamber — the plaque waits inside.
    g.fillStyle(0x241f2b);
    g.fillRect(238, 66, 16, 24);
    g.fillCircle(246, 66, 8);
    g.fillStyle(0x3a3026);
    g.fillRect(240, 70, 12, 20);
    g.fillStyle(0xc9a06a, 0.5);
    g.fillRect(249, 80, 2, 2);
    // Yard paving: cool stone gone mossy at the joints.
    buildings.flagstones(g, 0, 90, GAME_WIDTH, GAME_HEIGHT - 90, {
      base: 0x272b27,
      alt: 0x2d322c,
      dark: 0x22261f,
      mortar: 0x1c1f1b,
      weed: 0x4a6b3a,
    });
    buildings.drainGrate(g, 180, 200);
    // Ivy's practice wall: a chalk target ring and a scuffed spot — she has
    // been out here alone for years.
    g.fillStyle(0x33372f);
    g.fillRect(96, 90, 96, 14);
    g.lineStyle(2, 0xe8e3d0, 0.3);
    g.strokeCircle(144, 97, 6);
    g.fillStyle(0x22261f, 0.7);
    g.fillEllipse(144, 104, 30, 6);
    props.chalkCrescent(g, 122, 122, 9, 0.12);
    // The Cloister cage, holding its ninety years.
    buildings.cage(g, 404, 150, 68, 84, { tint: 0x6e7a5a, tintAlpha: 0.12, accent: 0xa08d48 });
    buildings.signboard(this, g, 438, 140, 'THE CLOISTER', { color: UI.gold, hang: true });
    // Ivy on the cage — the plant, not the girl. Though also the girl.
    g.lineStyle(1, 0x4a6b3a, 0.8);
    for (let vx = 408; vx < 468; vx += 12) {
      g.lineBetween(vx, 150, vx + 2, 150 + 10 + ((vx * 7) % 12));
      g.fillStyle((vx * 13) % 3 === 0 ? 0x6e8a4a : 0x4a6b3a, 0.9);
      g.fillRect(vx + 1, 158 + ((vx * 7) % 8), 2, 2);
    }
    // South steps back down to Spicegate.
    g.fillStyle(0x2d2622);
    g.fillRect(226, 236, 40, 34);
    g.fillStyle(0x241f2b, 0.5);
    for (let sy = 240; sy < 268; sy += 6) g.fillRect(226, sy, 40, 2);
    buildings.roadPillars(g, 214, 214, 214);
    buildings.roadPillars(g, 262, 214, 214);
    // Yard furniture: benches for the patient, planters, candles at dusk.
    props.bench(g, 60, 150);
    props.bench(g, 320, 132);
    props.lamppost(this, g, 90, 190);
    props.lamppost(this, g, 360, 210);
    g.fillStyle(0x4a4f58); // stone planters
    g.fillRect(30, 106, 12, 8);
    g.fillRect(452, 100, 12, 8);
    g.fillStyle(0x4a6b3a);
    g.fillRect(32, 100, 3, 7);
    g.fillRect(37, 102, 3, 5);
    g.fillRect(455, 96, 3, 5);
    g.fillRect(459, 94, 3, 7);
    props.puddle(this, g, 260, 170, 22);
    props.pigeon(this, 210, 150);
    props.pigeon(this, 226, 156);
    props.pigeon(this, 300, 200);
    props.cat(this, 60, 180, 226);
    props.ambientWalker(this, 'char_saint_a', 70, 320, 216, 12000);
    // Leaves letting go of the hill, one at a time.
    for (let i = 0; i < 7; i++) {
      const leaf = this.add
        .rectangle(50 + i * 64, 96 + (i % 3) * 30, 2, 2, i % 2 === 0 ? 0x8a6d3a : 0x6e8a4a, 0.8)
        .setDepth(6);
      this.tweens.add({
        targets: leaf,
        y: leaf.y + 120,
        x: leaf.x + (i % 2 === 0 ? 24 : -18),
        angle: 160,
        alpha: 0,
        duration: 8000 + i * 1500,
        repeat: -1,
        delay: i * 1100,
        ease: 'Sine.easeInOut',
      });
    }
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'OLD COBBLE', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#4c524c' })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.duskGrade();
  }
}
