import Phaser from 'phaser';
import { FONT_BODY, FS_BODY, GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { CharacterView } from '../presentation/characterView';
import { InputService } from '../platform/input/inputService';
import { music } from '../platform/music';
import { SfxPlayer } from '../platform/sfxPlayer';
import { fadeIn, transitionTo, UI } from '../presentation/ui';
import type { PlayerState } from '../domain/match/types';

/**
 * Phase 3 start: walkable Brine Harbor (docs/04 §2). Single-screen for now;
 * NPCs with post-chapter dialogue, the Netyard gate launching friendlies.
 * Tiled-authored maps arrive when the district count grows (docs/DECISIONS).
 */
interface HubNpc {
  id: string;
  spriteKey: string;
  x: number;
  y: number;
  dialogueId: string;
  prompt?: string;
  view?: CharacterView;
}

const NPCS: HubNpc[] = [
  { id: 'tero', spriteKey: 'char_tero', x: 96, y: 150, dialogueId: 'hub_tero' },
  { id: 'nino', spriteKey: 'char_nino', x: 320, y: 120, dialogueId: 'hub_nino' },
  { id: 'salt', spriteKey: 'char_salt', x: 220, y: 208, dialogueId: 'hub_salt' },
  // Undertide fragment 1 (docs/02 §1b): the harbor bell. Never quest-marked.
  { id: 'bell', spriteKey: '', x: 196, y: 96, dialogueId: 'hub_bell', prompt: 'LOOK [A]' },
];

const WALK_SPEED = 70;
const BOUNDS = { minX: 24, maxX: 456, minY: 92, maxY: 240 };
const GATE = { x: 430, y: 150, r: 26 };

export class HubScene extends Phaser.Scene {
  private inputSvc!: InputService;
  private sfxp!: SfxPlayer;
  private player!: { view: CharacterView; state: PlayerState };
  private npcs: HubNpc[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private promptTarget: HubNpc | 'gate' | null = null;
  private prevInteract = false;
  private inDialogue = false;

  constructor() {
    super('Hub');
  }

  create(): void {
    this.drawHarbor();
    this.sfxp = new SfxPlayer(this);
    music.play('harbor');
    fadeIn(this);

    // Player rig reuses the match view with a synthetic domain state.
    this.player = {
      view: new CharacterView(this, 'chr_ash'),
      state: {
        id: 'chr_ash',
        team: 0,
        pos: { x: 120, y: 200 },
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

    this.npcs = NPCS.map((npc) => ({ ...npc }));
    for (const npc of this.npcs) {
      if (!this.textures.exists(npc.spriteKey)) continue;
      this.add.ellipse(npc.x, npc.y + 9, 12, 4, 0x000000, 0.3);
      const sprite = this.add.sprite(npc.x, npc.y, npc.spriteKey, 0).setDepth(4);
      this.time.addEvent({
        delay: 480 + Math.floor(Math.random() * 160),
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

    this.inputSvc = new InputService(this, {
      a: { x: GAME_WIDTH - 40, y: GAME_HEIGHT - 40, r: 16, hitR: 26 },
      b: { x: -100, y: -100, r: 1, hitR: 1 }, // unused in the hub
    });

    // The bell's polished clapper catches the light (docs/02 §1b: fragments
    // glint — optional never means invisible).
    const glint = this.add.rectangle(194, 93, 2, 2, 0xffffff, 0.9).setDepth(3).setAlpha(0);
    this.tweens.add({
      targets: glint,
      alpha: { from: 0, to: 0.9 },
      duration: 180,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2600,
    });

    this.game.events.on('dialogue-done', this.onDialogueDone, this);
    this.events.once('shutdown', () => {
      this.game.events.off('dialogue-done', this.onDialogueDone, this);
    });

    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Hub';
  }

  private onDialogueDone = (): void => {
    this.inDialogue = false;
    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Hub';
  };

  override update(_time: number, deltaMs: number): void {
    if (this.inDialogue) return;
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

    // Interaction targeting: nearest NPC in range, else the cage gate.
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
      this.prompt.setVisible(true).setText('PLAY A FRIENDLY [A]').setPosition(GATE.x - 20, GATE.y - 20);
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
      this.sfxp.play('uiSelect', 0.4);
      if (this.promptTarget === 'gate') {
        music.stop(250);
        transitionTo(this, 'Match', { returnTo: 'Hub' });
      } else {
        this.inDialogue = true;
        this.inputSvc.reset();
        this.scene.launch('Dialogue', { dialogueId: this.promptTarget.dialogueId });
      }
    }
    this.prevInteract = interact;
  }

  /** Brine Harbor at dusk — quay, water, netshed, the cage gate. */
  private drawHarbor(): void {
    const g = this.add.graphics();
    // Sky + water (north edge).
    g.fillStyle(0x2a3040);
    g.fillRect(0, 0, GAME_WIDTH, 46);
    g.fillStyle(0xc2643a, 0.2);
    g.fillRect(0, 36, GAME_WIDTH, 4);
    g.fillStyle(0x1a2732);
    g.fillRect(0, 40, GAME_WIDTH, 40);
    g.fillStyle(0xf2c14e, 0.08);
    for (let i = 0; i < 8; i++) g.fillRect(30 + i * 60, 48 + (i % 3) * 9, 26, 1);
    // Quay edge + bollards.
    g.fillStyle(0x39424e);
    g.fillRect(0, 78, GAME_WIDTH, 6);
    // Quay floor.
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
    // The harbor bell — green with salt, clapper still polished.
    g.fillStyle(0x39424e);
    g.fillRect(193, 84, 2, 10);
    g.fillRect(189, 82, 10, 2);
    g.fillStyle(0x5a7a5e);
    g.fillRect(191, 86, 6, 5);
    g.fillRect(190, 90, 8, 2);
    g.fillStyle(0xf2c14e);
    g.fillRect(193, 92, 2, 2);
    // Tero's boat, moored on the water. Nobody remarks on the name.
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
    // Tero's netshed (west).
    g.fillStyle(0x2b303a);
    g.fillRect(40, 96, 90, 52);
    g.fillStyle(0x39424e);
    g.fillRect(40, 88, 90, 12);
    g.fillStyle(0x11141a);
    g.fillRect(70, 118, 18, 30);
    g.lineStyle(1, 0x5b6472, 0.7);
    for (let x = 44; x < 126; x += 8) g.lineBetween(x, 100, x - 4, 146);
    // Crates near Nino.
    g.fillStyle(0x4a4030);
    g.fillRect(340, 100, 22, 16);
    g.fillRect(352, 88, 18, 14);
    g.lineStyle(1, 0x2f2b28);
    g.strokeRect(340, 100, 22, 16);
    g.strokeRect(352, 88, 18, 14);
    // The Netyard gate (east).
    g.lineStyle(2, 0x5b6472);
    g.strokeRect(408, 110, 64, 80);
    g.lineStyle(1, 0x39525a, 0.7);
    for (let x = 412; x < 470; x += 8) g.lineBetween(x, 110, x - 4, 190);
    g.fillStyle(0xf2c14e, 0.12);
    g.fillRect(408, 110, 64, 80);
    // Signs.
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
