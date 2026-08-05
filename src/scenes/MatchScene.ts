import Phaser from 'phaser';
import { FONT_BODY, FONT_DISPLAY, FS_BODY, FS_DISPLAY, FS_DISPLAY_2X, GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { MatchCore } from '../domain/match/core';
import { GOAL_BOTTOM, GOAL_TOP, PITCH } from '../domain/match/geometry';
import { TUNING as T } from '../domain/match/tuning';
import type { MatchConfig, MatchEvent, MatchSnapshot } from '../domain/match/types';
import { InputService } from '../platform/input/inputService';
import { loadSettings, saveSettings } from '../platform/settings';
import { crowd, resumeSfx } from '../platform/sfx';
import { music } from '../platform/music';
import { drawPanel, fadeIn, makeButton, transitionTo, UI } from '../presentation/ui';
import { SfxPlayer } from '../platform/sfxPlayer';
import { CharacterView } from '../presentation/characterView';
import * as props from '../presentation/props';

/**
 * MatchScene: renders MatchCore state; owns the fixed-step accumulator, HUD,
 * touch UI, placeholder feel layer and retry loop (docs/08 Phase 1).
 * PH- visuals throughout — generated textures, replaced from Phase 2.
 */
export interface DrillSpec {
  type: 'pass' | 'shoot';
  target: number;
  title: string;
}

export interface ArenaDress {
  title: string;
  subtitle: string;
  awayLabel: string;
  netColor: number;
  floorAccent: number;
  crowdColors: number[];
  /** Which dressing kit the arena uses — every venue is a place, not a skin. */
  theme: 'netyard' | 'kettle';
  bellMetal: number;
}

const NETYARD: ArenaDress = {
  title: 'THE NETYARD',
  subtitle: 'DJ TIDE: LIVE FROM BRINE HARBOR!',
  awayLabel: 'GULLS',
  netColor: 0x39525a,
  floorAccent: 0x2e9e8f,
  crowdColors: [0x2e9e8f, 0xc2643a, 0xd9d3c0, 0x8a94a2],
  theme: 'netyard',
  bellMetal: 0xd9a437,
};

export const KETTLE: ArenaDress = {
  title: 'THE KETTLE',
  subtitle: 'DJ TIDE: SPICEGATE, MAKE SOME NOISE!',
  awayLabel: 'RUNNERS',
  netColor: 0x7c4a2a,
  floorAccent: 0xb03535,
  crowdColors: [0xb03535, 0xf2c14e, 0xd9d3c0, 0xc2643a],
  theme: 'kettle',
  bellMetal: 0xb06a44,
};

interface SceneData {
  config?: MatchConfig;
  story?: boolean;
  drill?: DrillSpec;
  returnTo?: string;
  arena?: ArenaDress;
}

const NAMES: Record<string, string> = {
  chr_ash: 'ASH',
  chr_juno: 'JUNO',
  chr_bram: 'BRAM',
  chr_salt: 'SALT',
  chr_nadia: 'NADIA',
};

const BALL_COLOR = 0xf5f1e3;

export class MatchScene extends Phaser.Scene {
  private core!: MatchCore;
  private inputSvc!: InputService;
  private accumulator = 0;
  private paused = false;

  private playerSprites = new Map<string, CharacterView>();
  private storyMode = false;
  private drill: DrillSpec | null = null;
  private lastDeltaS = 1 / 60;
  private sceneData: SceneData = {};
  private prevPhase = '';
  private pauseGroup: Array<{ destroy(): void }> = [];
  private arena: ArenaDress = NETYARD;
  private crowdA: Phaser.GameObjects.Graphics | null = null;
  private crowdB: Phaser.GameObjects.Graphics | null = null;
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
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private matchOver = false;

  // Premium feel state (docs/03 §6): hit stop + time dilation + squash.
  private sfxp!: SfxPlayer;
  private freezeMs = 0;
  private timeScale = 1;
  private timeScaleTween: Phaser.Tweens.Tween | null = null;
  private ballSquash = 1;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private bellText!: Phaser.GameObjects.Text;
  private stepClock = 0;
  private lastClockShown = -1;
  // Arena identity: real bells over the goals, gulls on the wall.
  private bells: Array<{ c: Phaser.GameObjects.Container; side: -1 | 1 }> = [];
  private introCard: Phaser.GameObjects.Text[] = [];
  private perchedGulls: Array<{ c: Phaser.GameObjects.Container; homeX: number; away: boolean }> =
    [];

  constructor() {
    super('Match');
  }

  create(data: SceneData): void {
    const config = data.config ?? defaultMatchConfig(Math.floor(Math.random() * 1e9));
    this.core = new MatchCore(config);
    this.storyMode = data.story ?? false;
    this.drill = data.drill ?? null;
    this.sceneData = data;
    this.arena = data.arena ?? NETYARD;
    this.prevPhase = '';
    this.pauseGroup = [];
    this.introCard = [];
    music.play(this.drill ? 'harbor' : 'match');
    fadeIn(this);
    this.accumulator = 0;
    this.paused = false;
    this.matchOver = false;
    this.playerSprites.clear();
    this.resultsGroup = [];

    this.drawPitch();
    this.createParticles();

    // Entities — generated pixel-art rigs (docs/07 code-first art path).
    const snap = this.core.snapshot();
    for (const p of snap.players) {
      this.playerSprites.set(p.id, new CharacterView(this, p.id));
    }
    this.ballShadow = this.add.ellipse(0, 0, 7, 4, 0x000000, 0.35).setDepth(4);
    this.ballSprite = this.add.ellipse(0, 0, 6, 6, BALL_COLOR).setDepth(6);
    this.ballSprite.setStrokeStyle(1, 0x9c9784);
    this.controlRing = this.add.circle(0, 0, 9).setDepth(3);
    this.controlRing.setStrokeStyle(1, 0xf2c14e, 0.9);
    this.controlRing.setFillStyle(0, 0);

    // HUD (score chip keeps text readable over the crowd band).
    this.add
      .rectangle(GAME_WIDTH / 2, 20, 148, 36, 0x0e0e14, 0.72)
      .setDepth(19)
      .setStrokeStyle(1, 0x39424e, 0.8);
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 6, '', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#e8e3d0' })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.clockText = this.add
      .text(GAME_WIDTH / 2, 20, '', { fontFamily: FONT_BODY, fontSize: FS_BODY, color: '#9a968a' })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.toastText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 34, '', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#f2c14e',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.staminaBack = this.add.rectangle(0, 0, 24, 3, 0x000000, 0.5).setDepth(19).setVisible(false);
    this.staminaBar = this.add.rectangle(0, 0, 24, 3, 0x7bd88f).setDepth(20).setVisible(false);
    this.chargeArc = this.add.graphics().setDepth(20);

    // Premium feel objects.
    this.sfxp = new SfxPlayer(this);
    this.freezeMs = 0;
    this.timeScale = 1;
    this.ballSquash = 1;
    this.stepClock = 0;
    this.lastClockShown = -1;
    this.flashRect = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 1)
      .setDepth(28)
      .setAlpha(0);
    this.bellText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: FS_DISPLAY_2X,
        color: '#f2c14e',
        stroke: '#0e0e14',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(29)
      .setAlpha(0);

    // Input + touch UI.
    this.inputSvc = new InputService(this, {
      a: { x: GAME_WIDTH - 78, y: GAME_HEIGHT - 34, r: 16, hitR: 24 },
      b: { x: GAME_WIDTH - 34, y: GAME_HEIGHT - 62, r: 16, hitR: 24 },
    });
    this.touchGfx = this.add.graphics().setDepth(25);

    if (this.drill) {
      // Drill dressing: objective replaces the clock; skip is always available.
      this.scoreText.setText(this.drill.title);
      const skip = this.add
        .text(6, GAME_HEIGHT - 16, 'skip drill ›', {
          fontFamily: FONT_BODY,
          fontSize: FS_BODY,
          color: '#9a968a',
        })
        .setDepth(26)
        .setInteractive({ useHandCursor: true });
      skip.on('pointerdown', () => this.completeDrill());
      this.input.keyboard?.on('keydown-ESC', () => this.completeDrill());
    }

    // Pause (ESC skips drills instead — see drill block above).
    if (!this.drill) this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.game.events.on('solport-suspend', this.onSuspend, this);
    this.events.once('shutdown', () => {
      this.game.events.off('solport-suspend', this.onSuspend, this);
    });

    resumeSfx();
    crowd.start(this.drill ? 0.02 : 0.05);
    this.events.once('shutdown', () => crowd.stop());
    if (window.__SOLPORT__) {
      window.__SOLPORT__.scene = 'Match';
      window.__SOLPORT__.mode = this.drill ? 'drill' : 'match';
    }
  }

  private onSuspend = (): void => {
    if (!this.paused && !this.matchOver) this.togglePause();
  };

  private togglePause(): void {
    if (this.matchOver) return;
    this.paused = !this.paused;
    this.inputSvc.reset();
    if (this.paused) {
      const cx = GAME_WIDTH / 2;
      const dim = this.add
        .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e14, 0.7)
        .setDepth(29);
      const panel = drawPanel(this, cx - 90, 62, 180, 146, 30);
      const title = this.add
        .text(cx, 78, 'PAUSED', { fontFamily: FONT_DISPLAY, fontSize: FS_DISPLAY, color: UI.textMain })
        .setOrigin(0.5)
        .setDepth(31);
      const resume = makeButton(this, cx, 106, 'RESUME', () => this.togglePause(), {
        primary: true,
        width: 150,
      });
      const restart = makeButton(this, cx, 130, 'RESTART MATCH', () => {
        this.scene.restart({ ...this.sceneData });
      }, { width: 150 });
      const sound = makeButton(
        this,
        cx,
        154,
        loadSettings().muted ? 'SOUND: OFF' : 'SOUND: ON',
        () => {
          const settings = loadSettings();
          settings.muted = !settings.muted;
          saveSettings(settings);
          sound.setLabel(settings.muted ? 'SOUND: OFF' : 'SOUND: ON');
          if (settings.muted) music.stop(150);
          else music.play(this.drill ? 'harbor' : 'match');
        },
        { width: 150 },
      );
      const quit = makeButton(this, cx, 178, 'QUIT TO TITLE', () => {
        if (this.scene.isSleeping('Hub')) this.scene.stop('Hub');
        music.stop(300);
        transitionTo(this, 'Title');
      }, { width: 150 });
      this.pauseGroup = [dim, panel, title, resume, restart, sound, quit];
    } else {
      for (const item of this.pauseGroup) item.destroy();
      this.pauseGroup = [];
    }
  }

  override update(_time: number, deltaMs: number): void {
    if (this.paused || this.matchOver) {
      this.renderTouchUi();
      return;
    }
    // Hit stop: freeze simulation, keep rendering (docs/03 §6, 20–90 ms).
    if (this.freezeMs > 0) {
      this.freezeMs -= deltaMs;
      this.renderTouchUi();
      return;
    }
    // Fixed-step accumulator with suspension clamp (docs/05 §4) + time dilation.
    this.accumulator += Math.min((deltaMs / 1000) * this.timeScale, 0.25);
    const command = this.inputSvc.sample();
    while (this.accumulator >= T.fixedDt) {
      this.core.tick(command);
      this.accumulator -= T.fixedDt;
      for (const event of this.core.drainEvents()) this.onEvent(event);
    }
    this.lastDeltaS = deltaMs / 1000;
    this.emitAmbientFeel(deltaMs / 1000);
    this.render(this.core.snapshot());
  }

  // ---- juice helpers ------------------------------------------------------

  private hitStop(ms: number): void {
    if (loadSettings().reducedMotion) ms *= 0.5;
    this.freezeMs = Math.max(this.freezeMs, ms);
  }

  private slowMo(scale: number, recoverMs: number): void {
    if (loadSettings().reducedMotion) return;
    this.timeScaleTween?.stop();
    this.timeScale = scale;
    this.timeScaleTween = this.tweens.add({
      targets: this,
      timeScale: 1,
      duration: recoverMs,
      ease: 'Sine.easeIn',
    });
  }

  private flash(alpha: number, ms: number, color = 0xffffff): void {
    this.flashRect.setFillStyle(color).setAlpha(alpha);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: ms });
  }

  private shockwave(x: number, y: number, tint = 0xf2c14e): void {
    const ring = this.add.circle(x, y, 4).setDepth(27);
    ring.setStrokeStyle(2, tint, 0.9);
    ring.setFillStyle(0, 0);
    this.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private flashPlayer(playerId: string): void {
    this.playerSprites.get(playerId)?.flashWhite(this);
  }

  /** Sprint footsteps + dust, ball trail — continuous feel, not event-driven. */
  private emitAmbientFeel(dt: number): void {
    const snap = this.core.snapshot();
    this.stepClock += dt;
    const stepDue = this.stepClock >= 0.16;
    if (stepDue) this.stepClock = 0;
    for (const p of snap.players) {
      if (p.sprinting && stepDue) {
        this.dust.emitParticleAt(p.pos.x, p.pos.y + 4, 1);
        if (p.id === snap.controlledId) this.sfxp.play('step', 0.12, 300);
      }
    }
    const b = snap.ball;
    const speed = Math.hypot(b.vel.x, b.vel.y);
    if (speed > 230 && (b.mode === 'shotFlight' || b.mode === 'passFlight')) {
      this.trail.emitParticleAt(b.pos.x, b.pos.y - b.z * 0.5, 1);
    }
    // Final-10-seconds clock pulse.
    const clock = Math.max(0, Math.ceil(snap.clockS));
    if (snap.phase === 'play' && clock <= 10 && clock !== this.lastClockShown) {
      this.lastClockShown = clock;
      this.clockText.setColor('#d9534f');
      this.tweens.add({
        targets: this.clockText,
        scale: { from: 1.5, to: 1 },
        duration: 200,
      });
      this.sfxp.play('uiClick', 0.25, 50);
    }
  }

  // ---- rendering ----------------------------------------------------------

  private render(snap: MatchSnapshot): void {
    for (const p of snap.players) {
      this.playerSprites.get(p.id)?.update(p, this.lastDeltaS);
    }

    const b = snap.ball;
    const zScale = 1 + Math.min(0.5, b.z / 40);
    // Squash & stretch: impacts squash the ball, easing back to round.
    this.ballSquash = Math.min(1, this.ballSquash + 0.08);
    this.ballSprite.setPosition(Math.round(b.pos.x), Math.round(b.pos.y - b.z * 0.5));
    this.ballSprite.setScale(zScale * (2 - this.ballSquash), zScale * this.ballSquash);
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

    // Phase-transition presentation: KICK OFF card + whistle.
    if (snap.phase !== this.prevPhase) {
      if (snap.phase === 'play' && this.prevPhase === 'kickoff' && !this.drill) {
        // The broadcast card yields the stage the instant play starts.
        for (const t of this.introCard) {
          this.tweens.killTweensOf(t);
          t.setAlpha(0);
        }
        this.sfxp.play('post', 0.15, 800); // short sharp whistle-ish ping
        this.bellText.setText('KICK OFF').setColor('#e8e3d0').setAlpha(1).setScale(1.6);
        this.tweens.add({ targets: this.bellText, scale: 1, duration: 200 });
        this.tweens.add({ targets: this.bellText, alpha: 0, delay: 500, duration: 250 });
      }
      this.prevPhase = snap.phase;
    }
    if (this.drill) {
      const progress = this.drill.type === 'pass' ? (snap.counters['passes'] ?? 0) : snap.score[0];
      this.clockText.setText(`${Math.min(progress, this.drill.target)} / ${this.drill.target}`);
      if (progress >= this.drill.target && !this.matchOver) this.completeDrill();
    } else {
      const clock = Math.max(0, Math.ceil(snap.clockS));
      const mm = Math.floor(clock / 60);
      const ss = (clock % 60).toString().padStart(2, '0');
      this.scoreText.setText(`CREW ${snap.score[0]} — ${snap.score[1]} ${this.arena.awayLabel}`);
      this.clockText.setText(snap.phase === 'goldenGoal' ? `NEXT BELL WINS` : `${mm}:${ss}`);
    }

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
    const settings = loadSettings();
    const reduced = settings.reducedMotion;
    const shake = (ms: number, intensity: number): void => {
      if (!reduced && settings.screenShake > 0) {
        this.cameras.main.shake(ms, intensity * settings.screenShake);
      }
    };
    switch (e.type) {
      case 'pass':
      case 'oneTouchPass':
        this.sfxp.play('pass', 0.7);
        if (e.playerId) this.flashPlayer(e.playerId);
        if (e.pos) this.dust.emitParticleAt(e.pos.x, e.pos.y, 3);
        break;
      case 'loftedPass':
        this.sfxp.play('pass', 0.9, 250);
        if (e.playerId) this.flashPlayer(e.playerId);
        if (e.pos) this.dust.emitParticleAt(e.pos.x, e.pos.y, 4);
        break;
      case 'firstTouch':
        this.ballSquash = 0.75;
        break;
      case 'shotFired': {
        const power = Math.min(1, (e.speed ?? 300) / 420);
        this.sfxp.play('shot', 0.5 + power * 0.5);
        if (e.playerId) this.flashPlayer(e.playerId);
        if (power > 0.85) this.hitStop(25); // full-charge release lands with weight
        shake(60, 0.002 + power * 0.002);
        this.ballSquash = 0.6;
        if (e.pos) this.dust.emitParticleAt(e.pos.x, e.pos.y, 6);
        break;
      }
      case 'wallBounce': {
        const v = Math.min(1, (e.speed ?? 100) / 420);
        this.sfxp.play('wall', 0.25 + v * 0.6);
        this.ballSquash = 1 - v * 0.45;
        if (e.pos) {
          this.spark.emitParticleAt(e.pos.x, e.pos.y, Math.round(2 + v * 8));
          if (v > 0.5) this.shockwave(e.pos.x, e.pos.y, 0x8a8f98);
          if (v > 0.35) this.scareGulls(e.pos.x, e.pos.y);
        }
        if (v > 0.6) shake(40, 0.0015);
        break;
      }
      case 'postHit':
        this.sfxp.play('post', 0.9);
        crowd.swell(2.5, 1); // the gasp
        this.hitStop(50);
        this.slowMo(0.85, 250); // near-miss dilation (docs/03 §6)
        shake(80, 0.003);
        if (reduced) this.flash(0.15, 120);
        if (e.pos) this.spark.emitParticleAt(e.pos.x, e.pos.y, 10);
        this.toast('OFF THE FRAME!');
        break;
      case 'bell': {
        // The signature moment: hit stop → flash → shockwave → slow-mo settle.
        this.sfxp.play('bell', 1);
        this.sfxp.play('uiConfirm', 0.5);
        this.hitStop(90);
        this.slowMo(0.35, 700);
        this.flash(reduced ? 0.2 : 0.35, 180);
        shake(150, 0.007);
        const px = e.pos?.x ?? GAME_WIDTH / 2;
        const py = e.pos?.y ?? GAME_HEIGHT / 2;
        this.ringBell(px);
        for (const gull of this.perchedGulls) this.scareGulls(gull.homeX, PITCH.minY); // a bell scatters every gull
        this.shockwave(px, py);
        this.time.delayedCall(80, () => this.shockwave(px, py, 0xe8e3d0));
        this.confetti.emitParticleAt(px, py, 40);
        // The stands answer: roar swell, crowd band jumps, confetti from above.
        crowd.swell(e.team === 0 ? 4.5 : 2.5, e.team === 0 ? 2 : 1.2);
        if (this.crowdA && this.crowdB && !reduced) {
          this.tweens.add({
            targets: [this.crowdA, this.crowdB],
            y: -2,
            duration: 110,
            yoyo: true,
            repeat: 9,
          });
        }
        if (e.team === 0 && !reduced) {
          this.time.addEvent({
            delay: 70,
            repeat: 12,
            callback: () => {
              const rx = 30 + ((Math.random() * (GAME_WIDTH - 60)) | 0);
              this.confetti.emitParticleAt(rx, 14, 2);
            },
          });
        }
        // Scorer spotlight: a second ring blooms off whoever rang it.
        if (e.playerId) {
          this.flashPlayer(e.playerId);
          const sp = this.core.snapshot().players.find((p) => p.id === e.playerId);
          if (sp) this.time.delayedCall(160, () => this.shockwave(sp.pos.x, sp.pos.y, 0x7bd88f));
        }
        this.bellText
          .setText(e.team === 0 ? 'BELL!' : 'CONCEDED')
          .setColor(e.team === 0 ? '#f2c14e' : '#c2643a')
          .setAlpha(1)
          .setScale(2.4);
        this.tweens.add({
          targets: this.bellText,
          scale: 1,
          duration: 260,
          ease: 'Back.easeOut',
        });
        this.tweens.add({ targets: this.bellText, alpha: 0, delay: 900, duration: 300 });
        const scorer = e.playerId ? NAMES[e.playerId] : undefined;
        this.toast(
          e.team === 0
            ? scorer
              ? `${scorer} RINGS THE BELL!`
              : 'THE CREW RINGS ONE IN!'
            : `THE ${this.arena.awayLabel} ANSWER.`,
        );
        this.scoreSlam();
        break;
      }
      case 'tackleWon':
        this.sfxp.play('tackle', 0.8);
        this.hitStop(30);
        shake(40, 0.0015);
        if (e.playerId) this.flashPlayer(e.playerId);
        if (e.pos) this.dust.emitParticleAt(e.pos.x, e.pos.y, 5);
        break;
      case 'tackleMissed':
        this.sfxp.play('step', 0.3, 400);
        break;
      case 'rearContact':
        this.sfxp.play('tackle', 0.4, 300);
        break;
      case 'shoulderWon':
        this.sfxp.play('shoulder', 0.9);
        this.hitStop(40);
        shake(60, 0.002);
        break;
      case 'switch':
        this.sfxp.play('uiSelect', 0.35);
        break;
      case 'kickoff':
        this.sfxp.play('uiClick', 0.4);
        break;
      case 'goldenGoalStart':
        this.sfxp.play('bell', 0.6, 400);
        this.flash(0.15, 200);
        this.toast('GOLDEN GOAL — NEXT BELL WINS');
        break;
      case 'fullTime':
        if (this.drill) {
          this.completeDrill();
          break;
        }
        this.sfxp.play('uiConfirm', 0.8);
        this.showResults();
        break;
      case 'heavyTouch':
        this.sfxp.play('step', 0.25, 500);
        break;
    }
  }

  /** Swing the bell over whichever goal just got rung. */
  private ringBell(atX: number): void {
    const side = atX > PITCH.centerX ? 1 : -1;
    const bell = this.bells.find((b) => b.side === side);
    if (!bell) return;
    this.tweens.killTweensOf(bell.c);
    bell.c.setAngle(0);
    this.tweens.add({
      targets: bell.c,
      angle: { from: -26, to: 26 },
      duration: 110,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({ targets: bell.c, angle: 0, duration: 240, ease: 'Sine.easeOut' });
      },
    });
    this.shockwave(bell.c.x, bell.c.y + 5, this.arena.bellMetal);
  }

  /** Netyard gulls perch on the top rail and scatter off nearby impacts. */
  private buildPerchedGulls(): void {
    this.perchedGulls = [];
    for (const gx of [120, 296, 398]) {
      const c = this.add.container(gx, PITCH.minY - 3).setDepth(2);
      const gg = this.add.graphics();
      gg.fillStyle(0xd9d3c0);
      gg.fillRect(-2, -2, 4, 2);
      gg.fillRect(1, -4, 2, 2);
      gg.fillStyle(0x8a94a2);
      gg.fillRect(-2, -2, 2, 1);
      gg.fillStyle(0xd08f2e);
      gg.fillRect(3, -3, 1, 1);
      c.add(gg);
      this.tweens.add({
        targets: c,
        y: c.y - 1,
        duration: 240,
        yoyo: true,
        repeat: -1,
        repeatDelay: 2200 + ((gx * 13) % 1900),
      });
      this.perchedGulls.push({ c, homeX: gx, away: false });
    }
  }

  private scareGulls(px: number, py: number): void {
    if (py > PITCH.minY + 46) return;
    for (const gull of this.perchedGulls) {
      if (gull.away || Math.abs(px - gull.homeX) > 72) continue;
      gull.away = true;
      this.tweens.killTweensOf(gull.c);
      this.tweens.add({
        targets: gull.c,
        x: gull.homeX + (gull.homeX < PITCH.centerX ? -44 : 44),
        y: -14,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.easeOut',
      });
      this.time.delayedCall(7000 + ((gull.homeX * 31) % 4000), () => {
        if (!gull.c.active) return;
        gull.c.setPosition(gull.homeX, PITCH.minY - 10).setAlpha(0);
        this.tweens.add({
          targets: gull.c,
          y: PITCH.minY - 3,
          alpha: 1,
          duration: 500,
          onComplete: () => {
            gull.away = false;
          },
        });
      });
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

  private completeDrill(): void {
    if (this.matchOver) return;
    this.matchOver = true;
    this.sfxp.play('uiConfirm', 0.8);
    this.flash(0.15, 150);
    this.toast('DRILL COMPLETE');
    this.time.delayedCall(700, () => {
      this.game.events.emit('story-match-result', { homeWon: true });
      this.scene.stop();
    });
  }

  private showResults(): void {
    this.matchOver = true;
    const snap = this.core.snapshot();
    const [h, a] = snap.score;
    const won = h > a;
    const cx = GAME_WIDTH / 2;
    const dim = this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0e14, 0.75)
      .setDepth(30);
    if (won && !loadSettings().reducedMotion) {
      crowd.swell(3.5, 3);
      this.confetti.setDepth(33);
      this.time.addEvent({
        delay: 110,
        repeat: 24,
        callback: () => {
          const rx = 20 + ((Math.random() * (GAME_WIDTH - 40)) | 0);
          this.confetti.emitParticleAt(rx, 8 + ((Math.random() * 30) | 0), 2);
        },
      });
    }
    const panel = drawPanel(this, cx - 110, 56, 220, 158, 30);
    const title = this.add
      .text(cx, 74, won ? 'FULL TIME — CREW WIN' : h < a ? `FULL TIME — ${this.arena.awayLabel} WIN` : 'FULL TIME', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: won ? UI.gold : UI.textMain,
      })
      .setOrigin(0.5)
      .setDepth(31);
    const score = this.add
      .text(cx, 100, `${h} — ${a}`, {
        fontFamily: FONT_DISPLAY,
        fontSize: FS_DISPLAY_2X,
        color: UI.textMain,
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setScale(1.5);
    this.tweens.add({ targets: score, scale: 1, duration: 300, ease: 'Back.easeOut' });
    const stats = this.add
      .text(
        cx,
        126,
        `passes ${snap.counters['passes'] ?? 0}  ·  shots ${snap.counters['shots'] ?? 0}  ·  tackles ${snap.counters['tackles'] ?? 0}`,
        { fontFamily: FONT_BODY, fontSize: FS_BODY, color: UI.textDim },
      )
      .setOrigin(0.5)
      .setDepth(31);
    const primaryLabel = this.storyMode ? (won ? 'CONTINUE' : 'RETRY') : 'RETRY';
    const primaryAction = (): void => {
      this.sfxp.play('uiClick', 0.6);
      if (this.storyMode) {
        this.game.events.emit('story-match-result', { homeWon: won });
        this.scene.stop();
      } else {
        this.scene.restart({ ...this.sceneData });
      }
    };
    const primary = makeButton(this, cx, 154, primaryLabel, primaryAction, {
      primary: true,
      width: 170,
    });
    this.input.keyboard?.once('keydown-J', primaryAction);
    this.resultsGroup = [dim, panel, title, score, stats, primary] as unknown as Phaser.GameObjects.GameObject[];
    if (!this.storyMode) {
      const dest = this.sceneData.returnTo ?? 'Title';
      const back = makeButton(this, cx, 180, dest === 'Hub' ? 'BACK TO THE HARBOR' : 'TITLE SCREEN', () => {
        this.sfxp.play('uiClick', 0.6);
        music.stop(300);
        transitionTo(this, dest);
      }, { width: 170 });
      (this.resultsGroup as unknown as Array<{ destroy(): void }>).push(back);
    }
  }

  // ---- arena art (docs/07 code-first path) --------------------------------

  private drawPitch(): void {
    const g = this.add.graphics().setDepth(0);
    const { minX, maxX, minY, maxY, wedge, goalDepth } = PITCH;

    // Asphalt floor with worn patches.
    g.fillStyle(0x23262d);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x272b33);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = (x / 32) % 2 === 0 ? 0 : 16; y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    g.fillStyle(this.arena.floorAccent, 0.04);
    g.fillRect(minX, 150, 90, 60);
    g.fillRect(320, 40, 110, 70);
    // Play has worn the asphalt: scuffed patches at kickoff and both goalmouths,
    // hairline cracks, an old repair seam.
    g.fillStyle(0x1e2128, 0.55);
    g.fillEllipse(PITCH.centerX, PITCH.centerY, 40, 22);
    g.fillEllipse(minX + 20, (GOAL_TOP + GOAL_BOTTOM) / 2, 26, 34);
    g.fillEllipse(maxX - 20, (GOAL_TOP + GOAL_BOTTOM) / 2, 26, 34);
    g.lineStyle(1, 0x1a1d23, 0.7);
    g.lineBetween(120, maxY - 8, 158, maxY - 34);
    g.lineBetween(150, maxY - 30, 166, maxY - 44);
    g.lineBetween(352, minY + 12, 384, minY + 30);
    g.fillStyle(0x2c313a, 0.8);
    g.fillRect(200, minY, 3, maxY - minY); // tar repair seam

    // Painted court identity: a rope-ring emblem (this town paints with what
    // it has) and the arena's name worn into the asphalt.
    const ropeTone = this.arena.theme === 'netyard' ? 0x8a7a5c : 0x9c5a3a;
    g.lineStyle(2, ropeTone, 0.2);
    g.strokeCircle(PITCH.centerX, PITCH.centerY, 37);
    g.lineStyle(1, ropeTone, 0.16);
    g.strokeCircle(PITCH.centerX, PITCH.centerY, 34);
    for (let a = 0; a < 4; a++) {
      const ang = Math.PI / 4 + (a * Math.PI) / 2;
      g.fillStyle(ropeTone, 0.22);
      g.fillRect(PITCH.centerX + Math.cos(ang) * 37 - 1, PITCH.centerY + Math.sin(ang) * 37 - 1, 3, 3);
    }
    this.add
      .text(PITCH.centerX, 206, this.arena.title, {
        fontFamily: FONT_DISPLAY,
        fontSize: FS_DISPLAY,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScale(1.5)
      .setAlpha(0.05);

    // Chalk lines + themed centre mark.
    g.lineStyle(1, 0x9aa3ad, 0.55);
    g.strokeRect(minX, minY, maxX - minX, maxY - minY);
    g.lineBetween(PITCH.centerX, minY, PITCH.centerX, maxY);
    g.strokeCircle(PITCH.centerX, PITCH.centerY, 30);
    if (this.arena.theme === 'netyard') {
      // Sol's crescent — the Brine Harbor motif.
      g.lineStyle(2, 0xf2c14e, 0.14);
      g.beginPath();
      g.arc(PITCH.centerX, PITCH.centerY, 20, Math.PI * 0.25, Math.PI * 1.25);
      g.strokePath();
    } else {
      // The Kettle's painted spice swirl.
      g.lineStyle(2, 0xb03535, 0.16);
      g.beginPath();
      g.arc(PITCH.centerX, PITCH.centerY, 20, 0, Math.PI * 1.4);
      g.strokePath();
      g.lineStyle(2, 0xd08f2e, 0.14);
      g.beginPath();
      g.arc(PITCH.centerX + 3, PITCH.centerY - 2, 12, Math.PI * 0.8, Math.PI * 2.1);
      g.strokePath();
    }

    // Corner wedge plates (match the physics).
    g.fillStyle(0x2c313a, 1);
    g.fillTriangle(minX, minY, minX + wedge, minY, minX, minY + wedge);
    g.fillTriangle(maxX, minY, maxX - wedge, minY, maxX, minY + wedge);
    g.fillTriangle(minX, maxY, minX + wedge, maxY, minX, maxY - wedge);
    g.fillTriangle(maxX, maxY, maxX - wedge, maxY, maxX, maxY - wedge);
    g.lineStyle(2, 0x4a5462, 1);
    g.lineBetween(minX, minY + wedge, minX + wedge, minY);
    g.lineBetween(maxX - wedge, minY, maxX, minY + wedge);
    g.lineBetween(minX, maxY - wedge, minX + wedge, maxY);
    g.lineBetween(maxX - wedge, maxY, maxX, maxY - wedge);

    // Walls: steel with a lit top edge + inner drop shadow for depth.
    g.fillStyle(0x000000, 0.22);
    g.fillRect(minX, minY, maxX - minX, 5);
    g.lineStyle(3, 0x5b6472, 1);
    g.lineBetween(minX, minY, minX, GOAL_TOP);
    g.lineBetween(minX, GOAL_BOTTOM, minX, maxY);
    g.lineBetween(maxX, minY, maxX, GOAL_TOP);
    g.lineBetween(maxX, GOAL_BOTTOM, maxX, maxY);
    g.lineBetween(minX, minY, maxX, minY);
    g.lineBetween(minX, maxY, maxX, maxY);
    g.lineStyle(1, 0x8a94a2, 0.8);
    g.lineBetween(minX, minY - 1, maxX, minY - 1);

    // Goal recesses: frame glow + net cross-hatch.
    for (const [gx, flip] of [
      [minX - goalDepth, 1],
      [maxX, 1],
    ] as const) {
      void flip;
      g.fillStyle(0xf2c14e, 0.06);
      g.fillRect(gx - 2, GOAL_TOP - 2, goalDepth + 4, GOAL_BOTTOM - GOAL_TOP + 4);
      g.fillStyle(0x11141a, 0.85);
      g.fillRect(gx, GOAL_TOP, goalDepth, GOAL_BOTTOM - GOAL_TOP);
      g.lineStyle(1, 0x6b7482, 0.5);
      for (let i = 0; i <= goalDepth; i += 4) {
        g.lineBetween(gx + i, GOAL_TOP, gx + i, GOAL_BOTTOM);
      }
      for (let y = GOAL_TOP; y <= GOAL_BOTTOM; y += 5) {
        g.lineBetween(gx, y, gx + goalDepth, y);
      }
      g.lineStyle(2, 0xf2c14e, 0.9);
      g.strokeRect(gx, GOAL_TOP, goalDepth, GOAL_BOTTOM - GOAL_TOP);
    }

    // THE BELLS. You don't score in Solport — you ring one. A gantry stands
    // over each goal recess with a real bell that swings when it's rung.
    this.bells = [];
    for (const [bx, side] of [
      [minX - goalDepth / 2, -1],
      [maxX + goalDepth / 2, 1],
    ] as const) {
      g.fillStyle(0x2f333c); // gantry posts + crossbar
      g.fillRect(bx - 6, GOAL_TOP - 13, 2, 13);
      g.fillRect(bx + 4, GOAL_TOP - 13, 2, 13);
      g.fillRect(bx - 7, GOAL_TOP - 14, 14, 2);
      g.fillStyle(0x424855);
      g.fillRect(bx - 7, GOAL_TOP - 14, 14, 1);
      const bell = this.add.container(bx, GOAL_TOP - 12).setDepth(2);
      const bg2 = this.add.graphics();
      const metal = this.arena.bellMetal;
      bg2.fillStyle(0x241f2b);
      bg2.fillRect(-1, 0, 2, 2); // hanger
      bg2.fillStyle(metal);
      bg2.fillRect(-2, 2, 4, 2);
      bg2.fillRect(-3, 4, 6, 3);
      bg2.fillStyle(0xf6dc8e);
      bg2.fillRect(-2, 2, 1, 5); // lit edge
      bg2.fillStyle(0x8a6423);
      bg2.fillRect(-4, 7, 8, 2); // mouth flare
      bg2.fillStyle(0x241f2b);
      bg2.fillRect(0, 9, 1, 1); // clapper
      bell.add(bg2);
      this.bells.push({ c: bell, side });
    }

    // Wall drape: the Netyard hangs its nets; the Kettle drapes market cloth.
    if (this.arena.theme === 'netyard') {
      g.lineStyle(1, this.arena.netColor, 0.5);
      for (let x = minX; x < maxX; x += 12) {
        g.lineBetween(x, minY, x + 6, minY + 5);
        g.lineBetween(x + 6, minY, x, minY + 5);
      }
      // Net swags sagging off the top rail, corks knotted at the gathers.
      g.lineStyle(1, this.arena.netColor, 0.8);
      for (let cx = minX + 28; cx < maxX - 10; cx += 56) {
        g.beginPath();
        g.arc(cx, minY + 1, 12, Math.PI * 0.12, Math.PI * 0.88);
        g.strokePath();
        g.fillStyle(0xc9b48a, 0.9);
        g.fillRect(cx - 12, minY + 1, 2, 2);
        g.fillRect(cx + 10, minY + 1, 2, 2);
      }
    } else {
      // Striped awning cloth lashed along the rail, scalloped hem.
      for (let x = minX; x < maxX; x += 12) {
        g.fillStyle((x / 12) % 2 === 0 ? 0xb03535 : 0xe8d9b8, 0.45);
        g.fillRect(x, minY + 1, Math.min(12, maxX - x), 4);
        g.fillTriangle(x, minY + 5, x + 12, minY + 5, x + 6, minY + 8);
      }
    }

    // Backdrop band above the cage — the place the cage lives in.
    g.fillStyle(this.arena.theme === 'netyard' ? 0x14171e : 0x241a1c);
    g.fillRect(0, 0, GAME_WIDTH, minY - 4);
    if (this.arena.theme === 'netyard') {
      // Masts and rigging on the water side, the harbor light at the point.
      for (let x = 30; x < 420; x += 74) {
        g.fillStyle(0x1b2029, 1);
        g.fillRect(x, 1, 2, 11);
        g.fillRect(x - 4, 3, 10, 1);
        g.lineStyle(1, 0x1b2029, 0.8);
        g.lineBetween(x + 1, 1, x + 8, 12);
      }
      g.fillStyle(0x2a303c); // lighthouse tower
      g.fillRect(452, 2, 6, 10);
      g.fillStyle(0xd9d3c0);
      g.fillRect(452, 5, 6, 2);
      const beacon = this.add.rectangle(455, 3, 4, 2, 0xf2c14e, 0.95).setDepth(1);
      this.tweens.add({ targets: beacon, alpha: 0.2, duration: 1300, yoyo: true, repeat: -1 });
    } else {
      // Brick parapet strung with pennants over the courtyard.
      g.fillStyle(0x3a2520, 1);
      g.fillRect(0, 0, GAME_WIDTH, 12);
      g.fillStyle(0x452c25, 0.9);
      for (let by = 0; by < 12; by += 4) {
        for (let bx = (by / 4) % 2 === 0 ? 0 : 5; bx < GAME_WIDTH; bx += 10) g.fillRect(bx, by, 9, 3);
      }
      g.lineStyle(1, 0x241f2b, 0.9);
      g.lineBetween(0, 12, GAME_WIDTH, 14);
      for (let px = 8; px < GAME_WIDTH; px += 26) {
        g.fillStyle(px % 52 === 8 ? 0xb03535 : 0xd08f2e, 0.9);
        g.fillTriangle(px, 12, px + 8, 12, px + 4, 17);
      }
    }
    this.crowdA?.destroy();
    this.crowdB?.destroy();
    this.crowdA = this.makeCrowd(0);
    this.crowdB = this.makeCrowd(1).setVisible(false);
    this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        if (!this.crowdA || !this.crowdB) return;
        const showA = !this.crowdA.visible;
        this.crowdA.setVisible(showA);
        this.crowdB.setVisible(!showA);
      },
    });

    // Advertising hoardings along the bottom band (street-final fiction).
    g.fillStyle(0x11141a);
    g.fillRect(0, maxY + 2, GAME_WIDTH, GAME_HEIGHT - maxY - 2);
    const ads: Array<[string, number, string]> = [
      ["MABEL'S BAIT", 0x2e9e8f, '#7fd4c8'],
      ['RADIO SOLPORT', 0xf2c14e, '#f2c14e'],
      ['SPICE MARKET', 0xb03535, '#e08a8a'],
      ['KEEP A LIGHT ON', 0x8a94a2, '#aab2bd'],
    ];
    ads.forEach(([label, color, textColor], i) => {
      const bx = 8 + i * 118;
      g.fillStyle(0x1b1f27);
      g.fillRect(bx, maxY + 4, 110, 11);
      g.lineStyle(1, color, 0.7);
      g.strokeRect(bx, maxY + 4, 110, 11);
      this.add
        .text(bx + 55, maxY + 10, label, {
          fontFamily: FONT_BODY,
          fontSize: FS_BODY,
          color: textColor,
        })
        .setOrigin(0.5)
        .setDepth(1);
    });
    // Floodlight cones from the top corners — the cage is lit for the night.
    g.fillStyle(0xfff4d6, 0.035);
    g.fillTriangle(minX + 4, minY, minX + 120, maxY, minX + 4, maxY);
    g.fillTriangle(maxX - 4, minY, maxX - 120, maxY, maxX - 4, maxY);
    // Kit clutter in the dead corners: bags, cones, a spare ball.
    g.fillStyle(0x2b303a);
    g.fillRect(2, minY + 24, 10, 7);
    g.fillStyle(0xc2643a);
    g.fillTriangle(468, maxY - 30, 471, maxY - 24, 465, maxY - 24);
    g.fillTriangle(470, maxY - 42, 473, maxY - 36, 467, maxY - 36);
    g.fillStyle(0xf5f1e3);
    g.fillCircle(7, maxY - 38, 3);
    g.fillStyle(0x9c9784);
    g.fillRect(6, maxY - 39, 1, 1);

    // String lights swagged off the top corners (out of the HUD's way).
    const lightsGroup = this.add.container(0, 0).setDepth(2);
    for (const flip of [1, -1] as const) {
      const ox = flip === 1 ? minX : maxX;
      g.lineStyle(1, 0x241f2b, 0.8);
      g.lineBetween(ox, minY + 2, ox + flip * 92, minY + 15);
      for (let i = 1; i <= 5; i++) {
        const lx = ox + flip * i * 17;
        const ly = minY + 2 + i * 2.4 + (i === 5 ? 0 : 1);
        if (this.arena.theme === 'netyard') {
          lightsGroup.add(this.add.circle(lx, ly + 2, 1.5, 0xf2c14e, 0.95));
          lightsGroup.add(this.add.circle(lx, ly + 2, 3, 0xf2c14e, 0.12));
        } else {
          // Paper lanterns on the Kettle's strings.
          lightsGroup.add(this.add.rectangle(lx, ly + 3, 4, 5, i % 2 === 0 ? 0xb03535 : 0xd08f2e, 0.95));
          lightsGroup.add(this.add.rectangle(lx, ly + 1, 2, 1, 0x241f2b, 1));
        }
      }
    }
    this.tweens.add({ targets: lightsGroup, alpha: 0.72, duration: 1500, yoyo: true, repeat: -1 });

    if (this.arena.theme === 'netyard') {
      // The harbor light sweeps the cage every few seconds.
      const beam = this.add.graphics({ x: 455, y: 2 }).setDepth(1);
      beam.fillStyle(0xfff4d6, 0.04);
      beam.fillTriangle(0, 0, -170, 290, -60, 300);
      this.tweens.add({
        targets: beam,
        angle: { from: -14, to: 26 },
        duration: 5200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Creel stack and buoys in the dead margins — nets get mended here.
      g.lineStyle(1, 0x54432f, 1);
      g.strokeRect(2, maxY - 62, 11, 8);
      g.strokeRect(3, maxY - 70, 9, 8);
      g.fillStyle(0x11141a, 0.9);
      g.fillEllipse(7.5, maxY - 58, 6, 4);
      g.fillEllipse(7.5, maxY - 66, 5, 4);
      g.fillStyle(0xc2643a);
      g.fillCircle(472, minY + 30, 3);
      g.fillStyle(0x2e9e8f);
      g.fillCircle(476, minY + 36, 3);
      this.buildPerchedGulls();
    } else {
      // The Kettle's namesake: a drum in the corner, always steaming.
      g.fillStyle(0x3a3026);
      g.fillRect(468, minY + 26, 10, 12);
      g.fillStyle(0x54432f);
      g.fillRect(468, minY + 26, 10, 2);
      g.lineStyle(1, 0x241f2b, 0.9);
      g.strokeRect(468, minY + 26, 10, 12);
      props.potStack(g, 2, maxY - 66);
      props.sack(g, 3, maxY - 50, 0xd08f2e);
      if (!this.textures.exists('px-steam')) {
        const sg = this.make.graphics({ x: 0, y: 0 }, false);
        sg.fillStyle(0xe8d9b8);
        sg.fillRect(0, 0, 2, 2);
        sg.generateTexture('px-steam', 2, 2);
        sg.destroy();
      }
      this.add
        .particles(473, minY + 26, 'px-steam', {
          speedY: { min: -12, max: -6 },
          speedX: { min: -3, max: 3 },
          alpha: { start: 0.3, end: 0 },
          scale: { start: 1, end: 2 },
          lifespan: 2200,
          frequency: 300,
        })
        .setDepth(1);
    }

    // Vignette.
    g.fillStyle(0x0a0b10, 0.16);
    g.fillRect(0, 0, GAME_WIDTH, 8);
    g.fillRect(0, GAME_HEIGHT - 8, GAME_WIDTH, 8);
    g.fillRect(0, 0, 8, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 8, 0, 8, GAME_HEIGHT);

    // Intro card (skippable by being brief). Drills skip the broadcast fiction.
    if (this.drill) return;
    const card = this.add
      .text(GAME_WIDTH / 2, 100, this.arena.title, {
        fontFamily: FONT_DISPLAY,
        fontSize: FS_DISPLAY,
        color: '#e8e3d0',
        stroke: '#0e0e14',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(26)
      .setAlpha(0.95);
    const sub = this.add
      .text(GAME_WIDTH / 2, 116, this.arena.subtitle, {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#f2c14e',
      })
      .setOrigin(0.5)
      .setDepth(26);
    this.introCard = [card, sub];
    this.tweens.add({ targets: [card, sub], alpha: 0, delay: 1400, duration: 400 });
  }

  /** One crowd frame: bobbing heads with scarf colours (deterministic layout). */
  private makeCrowd(frame: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setDepth(1);
    const colors = this.arena.crowdColors;
    for (let i = 0; i < 56; i++) {
      const x = 8 + i * 8.4;
      const row = i % 2;
      const bob = (i * 7 + frame * 3) % 2;
      const y = 4 + row * 5 + bob;
      g.fillStyle(colors[(i * 13) % colors.length]!, 0.75);
      g.fillCircle(x, y, 2);
    }
    return g;
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
    this.trail = this.add.particles(0, 0, 'px-confetti', {
      speed: 0,
      lifespan: 180,
      quantity: 0,
      alpha: { start: 0.5, end: 0 },
      scale: { start: 1, end: 0.4 },
      tint: 0xf5f1e3,
      emitting: false,
    });
    this.trail.setDepth(5);
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
