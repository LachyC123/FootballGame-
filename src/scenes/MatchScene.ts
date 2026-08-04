import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { MatchCore } from '../domain/match/core';
import { GOAL_BOTTOM, GOAL_TOP, PITCH } from '../domain/match/geometry';
import { TUNING as T } from '../domain/match/tuning';
import type { MatchConfig, MatchEvent, MatchSnapshot } from '../domain/match/types';
import { InputService } from '../platform/input/inputService';
import { loadSettings } from '../platform/settings';
import { sfx, resumeSfx } from '../platform/sfx';

/**
 * MatchScene: renders MatchCore state; owns the fixed-step accumulator, HUD,
 * touch UI, placeholder feel layer and retry loop (docs/08 Phase 1).
 * PH- visuals throughout — generated textures, replaced from Phase 2.
 */
interface SceneData {
  config?: MatchConfig;
}

const HOME_COLOR = 0x2e9e8f; // harbor teal
const HOME_DARK = 0x1d6b60;
const AWAY_COLOR = 0xc2643a; // gull rust
const AWAY_DARK = 0x8a4527;
const BALL_COLOR = 0xf5f1e3;

export class MatchScene extends Phaser.Scene {
  private core!: MatchCore;
  private inputSvc!: InputService;
  private accumulator = 0;
  private paused = false;

  private playerSprites = new Map<string, Phaser.GameObjects.Container>();
  private ballSprite!: Phaser.GameObjects.Ellipse;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private controlRing!: Phaser.GameObjects.Arc;
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private staminaBack!: Phaser.GameObjects.Rectangle;
  private chargeArc!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private resultsGroup: Phaser.GameObjects.GameObject[] = [];
  private touchGfx!: Phaser.GameObjects.Graphics;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private spark!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private matchOver = false;

  constructor() {
    super('Match');
  }

  create(data: SceneData): void {
    const config = data.config ?? defaultMatchConfig(Math.floor(Math.random() * 1e9));
    this.core = new MatchCore(config);
    this.accumulator = 0;
    this.paused = false;
    this.matchOver = false;
    this.playerSprites.clear();
    this.resultsGroup = [];

    this.drawPitch();
    this.createParticles();

    // Entities.
    const snap = this.core.snapshot();
    for (const p of snap.players) {
      this.playerSprites.set(p.id, this.makePlayerSprite(p.team));
    }
    this.ballShadow = this.add.ellipse(0, 0, 7, 4, 0x000000, 0.35).setDepth(4);
    this.ballSprite = this.add.ellipse(0, 0, 6, 6, BALL_COLOR).setDepth(6);
    this.ballSprite.setStrokeStyle(1, 0x9c9784);
    this.controlRing = this.add.circle(0, 0, 9).setDepth(3);
    this.controlRing.setStrokeStyle(1, 0xf2c14e, 0.9);
    this.controlRing.setFillStyle(0, 0);

    // HUD.
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 6, '', { fontFamily: 'monospace', fontSize: '12px', color: '#e8e3d0' })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.clockText = this.add
      .text(GAME_WIDTH / 2, 20, '', { fontFamily: 'monospace', fontSize: '9px', color: '#9a968a' })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.toastText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 34, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#f2c14e',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.staminaBack = this.add.rectangle(0, 0, 24, 3, 0x000000, 0.5).setDepth(19).setVisible(false);
    this.staminaBar = this.add.rectangle(0, 0, 24, 3, 0x7bd88f).setDepth(20).setVisible(false);
    this.chargeArc = this.add.graphics().setDepth(20);

    // Input + touch UI.
    this.inputSvc = new InputService(this, {
      a: { x: GAME_WIDTH - 78, y: GAME_HEIGHT - 34, r: 16, hitR: 24 },
      b: { x: GAME_WIDTH - 34, y: GAME_HEIGHT - 62, r: 16, hitR: 24 },
    });
    this.touchGfx = this.add.graphics().setDepth(25);

    // Pause.
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.game.events.on('solport-suspend', this.onSuspend, this);
    this.events.once('shutdown', () => {
      this.game.events.off('solport-suspend', this.onSuspend, this);
    });

    resumeSfx();
    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Match';
  }

  private onSuspend = (): void => {
    if (!this.paused && !this.matchOver) this.togglePause();
  };

  private togglePause(): void {
    if (this.matchOver) return;
    this.paused = !this.paused;
    this.inputSvc.reset();
    this.toast(this.paused ? 'PAUSED — tap/press ESC to resume' : '');
    if (this.paused) {
      this.input.once('pointerdown', () => {
        if (this.paused) this.togglePause();
      });
    }
  }

  override update(_time: number, deltaMs: number): void {
    if (this.paused || this.matchOver) {
      this.renderTouchUi();
      return;
    }
    // Fixed-step accumulator with suspension clamp (docs/05 §4).
    this.accumulator += Math.min(deltaMs / 1000, 0.25);
    const command = this.inputSvc.sample();
    while (this.accumulator >= T.fixedDt) {
      this.core.tick(command);
      this.accumulator -= T.fixedDt;
      for (const event of this.core.drainEvents()) this.onEvent(event);
    }
    this.render(this.core.snapshot());
  }

  // ---- rendering ----------------------------------------------------------

  private render(snap: MatchSnapshot): void {
    for (const p of snap.players) {
      const sprite = this.playerSprites.get(p.id);
      if (!sprite) continue;
      sprite.setPosition(Math.round(p.pos.x), Math.round(p.pos.y));
      const wedge = sprite.getByName('wedge') as Phaser.GameObjects.Triangle | null;
      if (wedge) wedge.setRotation(Math.atan2(p.facing.y, p.facing.x));
      const body = sprite.getByName('body') as Phaser.GameObjects.Ellipse | null;
      if (body) {
        body.setAlpha(p.action === 'stumble' ? 0.55 : 1);
        const squash = p.action === 'lunge' ? 0.8 : 1;
        body.setScale(1, squash);
      }
    }

    const b = snap.ball;
    const zScale = 1 + Math.min(0.5, b.z / 40);
    this.ballSprite.setPosition(Math.round(b.pos.x), Math.round(b.pos.y - b.z * 0.5));
    this.ballSprite.setScale(zScale);
    this.ballShadow.setPosition(Math.round(b.pos.x), Math.round(b.pos.y + 2));
    this.ballShadow.setScale(Math.max(0.5, 1 - b.z / 60));

    const controlled = snap.players.find((p) => p.id === snap.controlledId);
    if (controlled) {
      this.controlRing.setPosition(Math.round(controlled.pos.x), Math.round(controlled.pos.y));
      const engineScale = 1; // bar shows fraction of own pool
      const frac = Math.max(0, Math.min(1, controlled.stamina / (T.staminaMax * engineScale)));
      const showBar = frac < 0.98;
      this.staminaBack.setVisible(showBar).setPosition(controlled.pos.x, controlled.pos.y + 10);
      this.staminaBar
        .setVisible(showBar)
        .setPosition(controlled.pos.x - 12 + 12 * frac, controlled.pos.y + 10)
        .setSize(24 * frac, 3)
        .setFillStyle(frac < 0.25 ? 0xd9534f : 0x7bd88f);

      this.chargeArc.clear();
      if (controlled.chargeT > 0) {
        const cf = Math.min(1, controlled.chargeT / T.chargeMaxS);
        this.chargeArc.lineStyle(2, cf >= T.chargeSweetS / T.chargeMaxS ? 0xf2c14e : 0xe8e3d0, 0.9);
        this.chargeArc.beginPath();
        this.chargeArc.arc(
          controlled.pos.x,
          controlled.pos.y,
          12,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * cf,
        );
        this.chargeArc.strokePath();
      }
    }

    const clock = Math.max(0, Math.ceil(snap.clockS));
    const mm = Math.floor(clock / 60);
    const ss = (clock % 60).toString().padStart(2, '0');
    this.scoreText.setText(`CREW ${snap.score[0]} — ${snap.score[1]} GULLS`);
    this.clockText.setText(snap.phase === 'goldenGoal' ? `NEXT BELL WINS` : `${mm}:${ss}`);

    this.renderTouchUi();
  }

  private renderTouchUi(): void {
    const g = this.touchGfx;
    g.clear();
    if (!this.sys.game.device.input.touch) return;
    const state = this.inputSvc.touchState();
    const alpha = 0.35;
    // Buttons.
    const drawBtn = (x: number, y: number, pressed: boolean, label: string): void => {
      g.fillStyle(pressed ? 0xf2c14e : 0xe8e3d0, pressed ? 0.55 : alpha);
      g.fillCircle(x, y, 16);
      g.lineStyle(1, 0x0e0e14, 0.6);
      g.strokeCircle(x, y, 16);
      void label;
    };
    drawBtn(GAME_WIDTH - 78, GAME_HEIGHT - 34, state.a, 'A');
    drawBtn(GAME_WIDTH - 34, GAME_HEIGHT - 62, state.b, 'B');
    // Floating stick.
    if (state.stick.active) {
      g.fillStyle(0xe8e3d0, 0.18);
      g.fillCircle(state.stick.origin.x, state.stick.origin.y, 34);
      g.fillStyle(0xe8e3d0, 0.45);
      g.fillCircle(
        state.stick.origin.x + state.stick.vec.x * 34,
        state.stick.origin.y + state.stick.vec.y * 34,
        12,
      );
    }
  }

  // ---- events → feel (docs/03 §6 matrix) ---------------------------------

  private onEvent(e: MatchEvent): void {
    const reduced = loadSettings().reducedMotion;
    const shakeScale = loadSettings().screenShake;
    const shake = (ms: number, intensity: number): void => {
      if (!reduced && shakeScale > 0) this.cameras.main.shake(ms, intensity * shakeScale);
    };
    switch (e.type) {
      case 'pass':
      case 'loftedPass':
      case 'oneTouchPass':
        sfx.pass(Math.random() * 2 - 1);
        if (e.pos) this.dust.emitParticleAt(e.pos.x, e.pos.y, 3);
        break;
      case 'firstTouch':
        break;
      case 'shotFired':
        sfx.kick(Math.min(1, (e.speed ?? 300) / 420));
        shake(60, 0.002);
        if (e.pos) this.dust.emitParticleAt(e.pos.x, e.pos.y, 5);
        break;
      case 'wallBounce':
        sfx.wall(e.speed ?? 100);
        if (e.pos) this.spark.emitParticleAt(e.pos.x, e.pos.y, Math.min(8, (e.speed ?? 100) / 40));
        break;
      case 'postHit':
        sfx.post();
        shake(80, 0.003);
        this.toast('OFF THE FRAME!');
        break;
      case 'bell': {
        sfx.bell();
        shake(120, 0.006);
        const snap = this.core.snapshot();
        this.confetti.emitParticleAt(e.pos?.x ?? GAME_WIDTH / 2, e.pos?.y ?? GAME_HEIGHT / 2, 40);
        this.toast(e.team === 0 ? 'BELL! THE CREW RINGS ONE IN!' : 'BELL FOR THE GULLS.');
        this.scoreSlam();
        void snap;
        break;
      }
      case 'tackleWon':
        sfx.tackle();
        shake(40, 0.0015);
        break;
      case 'tackleMissed':
      case 'rearContact':
        sfx.stumble();
        break;
      case 'shoulderWon':
        sfx.tackle();
        shake(60, 0.002);
        break;
      case 'switch':
        sfx.switch();
        break;
      case 'kickoff':
        break;
      case 'goldenGoalStart':
        sfx.whistle();
        this.toast('GOLDEN GOAL — NEXT BELL WINS');
        break;
      case 'fullTime':
        sfx.whistle();
        this.showResults();
        break;
      case 'heavyTouch':
        break;
    }
  }

  private scoreSlam(): void {
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.6, to: 1 },
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  private toast(msg: string): void {
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    if (msg) {
      this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1400, duration: 400 });
    }
  }

  private showResults(): void {
    this.matchOver = true;
    const snap = this.core.snapshot();
    const [h, a] = snap.score;
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e14, 0.75)
      .setDepth(30);
    const title = this.add
      .text(GAME_WIDTH / 2, 86, h > a ? 'FULL TIME — CREW WIN' : h < a ? 'FULL TIME — GULLS WIN' : 'FULL TIME', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: h >= a ? '#f2c14e' : '#e8e3d0',
      })
      .setOrigin(0.5)
      .setDepth(31);
    const score = this.add
      .text(GAME_WIDTH / 2, 112, `${h} — ${a}`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e8e3d0',
      })
      .setOrigin(0.5)
      .setDepth(31);
    const stats = this.add
      .text(
        GAME_WIDTH / 2,
        140,
        `passes ${snap.counters['passes'] ?? 0} · shots ${snap.counters['shots'] ?? 0} · tackles ${snap.counters['tackles'] ?? 0}`,
        { fontFamily: 'monospace', fontSize: '8px', color: '#9a968a' },
      )
      .setOrigin(0.5)
      .setDepth(31);
    const retry = this.add
      .text(GAME_WIDTH / 2, 172, '[ RETRY ]', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f2c14e',
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setInteractive({ useHandCursor: true });
    const toTitle = this.add
      .text(GAME_WIDTH / 2, 192, 'title screen', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#9a968a',
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setInteractive({ useHandCursor: true });
    retry.on('pointerdown', () => {
      sfx.ui();
      this.scene.restart({});
    });
    toTitle.on('pointerdown', () => {
      sfx.ui();
      this.scene.start('Title');
    });
    this.input.keyboard?.once('keydown-J', () => this.scene.restart({}));
    this.resultsGroup = [dim, title, score, stats, retry, toTitle];
  }

  // ---- placeholder art (docs/07 §6) ---------------------------------------

  private makePlayerSprite(team: 0 | 1): Phaser.GameObjects.Container {
    const color = team === 0 ? HOME_COLOR : AWAY_COLOR;
    const dark = team === 0 ? HOME_DARK : AWAY_DARK;
    const shadow = this.add.ellipse(0, 4, 10, 4, 0x000000, 0.3);
    const body = this.add.ellipse(0, 0, 10, 10, color).setName('body');
    body.setStrokeStyle(1, dark);
    const wedge = this.add.triangle(0, 0, 6, 0, 2, -3, 2, 3, dark).setName('wedge');
    const container = this.add.container(0, 0, [shadow, body, wedge]).setDepth(5);
    return container;
  }

  private drawPitch(): void {
    const g = this.add.graphics().setDepth(0);
    // Asphalt floor.
    g.fillStyle(0x23262d);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x272b33);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = (x / 32) % 2 === 0 ? 0 : 16; y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    const { minX, maxX, minY, maxY, wedge, goalDepth } = PITCH;
    // Pitch lines.
    g.lineStyle(1, 0x4a5568, 1);
    g.strokeRect(minX, minY, maxX - minX, maxY - minY);
    g.lineBetween(PITCH.centerX, minY, PITCH.centerX, maxY);
    g.strokeCircle(PITCH.centerX, PITCH.centerY, 30);
    // Corner wedges.
    g.lineStyle(3, 0x39424e, 1);
    g.lineBetween(minX, minY + wedge, minX + wedge, minY);
    g.lineBetween(maxX - wedge, minY, maxX, minY + wedge);
    g.lineBetween(minX, maxY - wedge, minX + wedge, maxY);
    g.lineBetween(maxX - wedge, maxY, maxX, maxY - wedge);
    // Walls (leave the mouths open).
    g.lineStyle(3, 0x5b6472, 1);
    g.lineBetween(minX, minY, minX, GOAL_TOP);
    g.lineBetween(minX, GOAL_BOTTOM, minX, maxY);
    g.lineBetween(maxX, minY, maxX, GOAL_TOP);
    g.lineBetween(maxX, GOAL_BOTTOM, maxX, maxY);
    g.lineBetween(minX, minY, maxX, minY);
    g.lineBetween(minX, maxY, maxX, maxY);
    // Goal recesses.
    g.lineStyle(2, 0xf2c14e, 0.9);
    g.strokeRect(minX - goalDepth, GOAL_TOP, goalDepth, GOAL_BOTTOM - GOAL_TOP);
    g.strokeRect(maxX, GOAL_TOP, goalDepth, GOAL_BOTTOM - GOAL_TOP);
    // Crowd band (PH).
    g.fillStyle(0x1a1c22);
    g.fillRect(0, 0, GAME_WIDTH, minY - 4);
    g.fillStyle(0x2e9e8f, 0.15);
    for (let x = 8; x < GAME_WIDTH; x += 10) {
      g.fillCircle(x, 7, 3);
    }
  }

  private createParticles(): void {
    const mkTexture = (key: string, color: number): void => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(color);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture(key, 2, 2);
      g.destroy();
    };
    mkTexture('px-dust', 0x8a8f98);
    mkTexture('px-spark', 0xf2c14e);
    mkTexture('px-confetti', 0xe8e3d0);

    this.dust = this.add.particles(0, 0, 'px-dust', {
      speed: { min: 10, max: 40 },
      lifespan: 300,
      quantity: 0,
      alpha: { start: 0.7, end: 0 },
      emitting: false,
    });
    this.dust.setDepth(7);
    this.spark = this.add.particles(0, 0, 'px-spark', {
      speed: { min: 30, max: 90 },
      lifespan: 250,
      quantity: 0,
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.spark.setDepth(7);
    this.confetti = this.add.particles(0, 0, 'px-confetti', {
      speed: { min: 40, max: 120 },
      lifespan: 700,
      quantity: 0,
      gravityY: 120,
      tint: [0xf2c14e, 0x2e9e8f, 0xe8e3d0],
      emitting: false,
    });
    this.confetti.setDepth(7);
  }
}

export function defaultMatchConfig(seed: number): MatchConfig {
  return {
    seed,
    rules: { durationS: 180, scoreLimit: 3, goldenGoal: true },
    home: {
      teamId: 'team_crew',
      human: true,
      reactionMs: 200,
      aiProfile: { press: 0.5, line: 0.5, tempo: 0.5, risk: 0.4, phys: 0.3, show: 0, wall: 0.4, stam: 0.6 },
      players: [
        { id: 'chr_ash', stats: { pace: 5, power: 5, touch: 5, guard: 4, engine: 5 } },
        { id: 'chr_juno', stats: { pace: 8, power: 4, touch: 6, guard: 3, engine: 6 } },
        { id: 'chr_bram', stats: { pace: 3, power: 7, touch: 4, guard: 8, engine: 6 } },
      ],
    },
    away: {
      teamId: 'team_gulls',
      human: false,
      reactionMs: 280,
      aiProfile: { press: 0.9, line: 0.5, tempo: 0.2, risk: 0.3, phys: 0.3, show: 0.1, wall: 0.1, stam: 0.2 },
      players: [
        { id: 'chr_salt', stats: { pace: 5, power: 5, touch: 4, guard: 4, engine: 5 } },
        { id: 'chr_gull_a', stats: { pace: 4, power: 4, touch: 3, guard: 4, engine: 4 } },
        { id: 'chr_gull_b', stats: { pace: 4, power: 4, touch: 3, guard: 3, engine: 4 } },
      ],
    },
  };
}
