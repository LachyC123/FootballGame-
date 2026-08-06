import Phaser from 'phaser';
import {
  FONT_BODY,
  FONT_DISPLAY,
  FS_BODY,
  FS_DISPLAY,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../app/constants';
import { SfxPlayer } from '../platform/sfxPlayer';
import { music } from '../platform/music';
import { loadSettings } from '../platform/settings';
import { transitionTo } from '../presentation/ui';

/**
 * Ch.1 cold open (docs/02, docs/04 §3.1): the Netyard final, three years ago.
 * Kid Ash is prompted to pass to Kairo — whatever the player presses, Ash
 * shoots, clangs the frame, the counter scores, the crowd goes quiet. The ONLY
 * scripted input override in the game: it IS the story beat.
 * Pure presentation (tweens), no MatchCore. Tap advances any beat early.
 */
export class FlashbackScene extends Phaser.Scene {
  private sfxp!: SfxPlayer;
  private beat = 0;
  private beatDone: (() => void) | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private ash!: Phaser.GameObjects.Sprite;
  private kairo!: Phaser.GameObjects.Sprite;
  private defender!: Phaser.GameObjects.Sprite;
  private rival!: Phaser.GameObjects.Sprite;
  private ball!: Phaser.GameObjects.Ellipse;
  private card!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Rectangle;
  private crowd!: Phaser.GameObjects.Graphics;
  // Whoever is dribbling: the ball rides at their feet with a touch rhythm
  // instead of drifting on its own tween.
  private carrier: Phaser.GameObjects.Sprite | null = null;
  private carryLead = { x: 9, y: 5 };

  constructor() {
    super('Flashback');
  }

  override update(): void {
    if (!this.carrier) return;
    // Push-and-catch: the ball surges a few px ahead of the boot and waits.
    const pulse = (Math.sin(this.time.now * 0.014) + 1) / 2; // 0..1
    this.ball.x = this.carrier.x + this.carryLead.x + this.carryLead.x * 0.5 * pulse;
    this.ball.y = this.carrier.y + this.carryLead.y + 1 * pulse;
  }

  create(): void {
    this.beat = 0;
    this.carrier = null;
    this.sfxp = new SfxPlayer(this);
    music.stop(500);
    this.drawSepiaNetyard();

    const mk = (key: string, x: number, y: number, frame = 0): Phaser.GameObjects.Sprite => {
      this.add.ellipse(x, y + 9, 12, 4, 0x000000, 0.3);
      return this.add.sprite(x, y, key, frame).setDepth(5);
    };
    this.ash = mk('char_ash', 150, 150, 10); // side view, carrying
    this.kairo = mk('char_kairo', 210, 90, 10);
    this.defender = mk('char_oldkid_a', 300, 140, 10);
    this.rival = mk('char_oldkid_b', 250, 200, 10);
    this.defender.setFlipX(true);
    this.rival.setFlipX(true);
    this.ball = this.add.ellipse(160, 156, 6, 6, 0xf5f1e3).setDepth(6);
    this.ball.setStrokeStyle(1, 0x9c9784);

    // Memory haze.
    this.overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xc9a06a, 0.14)
      .setDepth(20);
    this.card = this.add
      .text(GAME_WIDTH / 2, 48, 'THREE YEARS AGO — THE NETYARD FINAL', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#e8d9b8',
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.promptText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#f2c14e',
      })
      .setOrigin(0.5)
      .setDepth(21);

    const skip = (): void => {
      if (this.beatDone) {
        const fn = this.beatDone;
        this.beatDone = null;
        fn();
      }
    };
    this.input.on('pointerdown', skip);
    this.input.keyboard?.on('keydown', skip);

    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Flashback';
    this.runBeat();
  }

  /** Advance to the next beat after ms (or on tap, whichever first). */
  private wait(ms: number, then: () => void): void {
    const timer = this.time.delayedCall(ms, () => {
      if (this.beatDone) {
        this.beatDone = null;
        then();
      }
    });
    this.beatDone = () => {
      timer.remove();
      then();
    };
  }

  private next(): void {
    this.beat++;
    this.runBeat();
  }

  private runBeat(): void {
    const reduced = loadSettings().reducedMotion;
    switch (this.beat) {
      case 0: {
        // Ash dribbles toward the right goal, Kairo makes his run. The ball
        // rides Ash's boot (update loop), it doesn't float on its own.
        this.carrier = this.ash;
        this.carryLead = { x: 9, y: 5 };
        this.tweens.add({ targets: [this.ash], x: 220, duration: 1600, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: [this.kairo], x: 330, y: 100, duration: 1600, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: [this.defender], x: 268, duration: 1600, ease: 'Sine.easeInOut' });
        this.wait(1700, () => this.next());
        break;
      }
      case 1: {
        // The prompt — the one input the game will betray.
        this.promptText.setText('PASS!  KAIRO IS FREE!  [ A ]');
        this.tweens.add({ targets: this.promptText, alpha: 0.4, duration: 300, yoyo: true, repeat: -1 });
        this.wait(2200, () => this.next());
        break;
      }
      case 2: {
        // Whatever was pressed: Ash shoots.
        this.tweens.killTweensOf(this.promptText);
        this.promptText.setAlpha(1).setText('');
        this.carrier = null; // the ball leaves the boot
        this.ash.setFrame(17); // E-row kick contact
        this.sfxp.play('shot', 0.9);
        this.tweens.add({
          targets: this.ball,
          x: 452,
          y: 118,
          duration: 230,
          ease: 'Linear',
          onComplete: () => {
            // Clang. Off the frame — a hard kick-back that dies into a roll.
            this.sfxp.play('post', 1);
            if (!reduced) this.cameras.main.shake(90, 0.004);
            this.ball.setScale(0.6, 1.3); // impact squash
            this.tweens.add({ targets: this.ball, scaleX: 1, scaleY: 1, duration: 140 });
            this.tweens.add({
              targets: this.ball,
              x: 330,
              y: 152,
              duration: 380,
              ease: 'Cubic.easeOut',
              onComplete: () => {
                this.tweens.add({ targets: this.ball, x: 318, y: 156, duration: 450, ease: 'Sine.easeOut' });
              },
            });
          },
        });
        this.wait(1500, () => this.next());
        break;
      }
      case 3: {
        // The counter: their kid collects the loose ball, carries it the
        // whole way, and buries it. Pick up → dribble → finish.
        this.rival.setFlipX(false);
        this.tweens.add({
          targets: this.rival,
          x: 328,
          y: 150,
          duration: 420,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.carrier = this.rival;
            this.carryLead = { x: -9, y: 5 };
            this.rival.setFlipX(true);
            this.tweens.add({
              targets: this.rival,
              x: 118,
              y: 158,
              duration: 1050,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                this.carrier = null;
                this.rival.setFrame(17);
                this.sfxp.play('shot', 0.7);
                this.tweens.add({
                  targets: this.ball,
                  x: 24,
                  y: 135,
                  duration: 210,
                  ease: 'Linear',
                  onComplete: () => {
                    this.sfxp.play('bell', 0.5, -400);
                    this.overlay.setFillStyle(0x1a1520, 0.45); // the colour drains
                    this.card.setText('');
                    // The crowd goes quiet — and then it goes away.
                    this.tweens.add({ targets: this.crowd, alpha: 0.12, duration: 1800 });
                  },
                });
              },
            });
          },
        });
        this.wait(2400, () => this.next());
        break;
      }
      case 4: {
        // Silence. Kairo turns and walks off.
        this.carrier = null; // in case the beat was skipped mid-dribble
        this.kairo.setFlipX(true);
        this.tweens.add({ targets: this.kairo, x: 460, alpha: 0.4, duration: 1600 });
        this.ash.setFrame(9); // stumble/dejected pose
        this.promptText.setText('the pass never came.');
        this.promptText.setColor('#9a968a');
        this.wait(2400, () => this.next());
        break;
      }
      case 5: {
        this.overlay.setFillStyle(0x0e0e14, 0.85);
        this.promptText.setText('');
        const later = this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'THREE YEARS LATER', {
            fontFamily: FONT_DISPLAY,
            fontSize: FS_DISPLAY,
            color: '#e8e3d0',
          })
          .setOrigin(0.5)
          .setDepth(22)
          .setAlpha(0);
        this.tweens.add({ targets: later, alpha: 1, duration: 600 });
        this.wait(2000, () => this.done());
        break;
      }
    }
  }

  private done(): void {
    transitionTo(this, 'Hub', undefined, 500);
  }

  private drawSepiaNetyard(): void {
    // The SAME Netyard the player returns to three years later — bells, net
    // swags, rope emblem — remembered in sepia. Recognition is the payoff.
    const g = this.add.graphics();
    g.fillStyle(0x2b2620);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x332d24);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = (x / 32) % 2 === 0 ? 0 : 16; y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    // The asphalt was younger then — lighter wear, but the same spots.
    g.fillStyle(0x262119, 0.45);
    g.fillEllipse(240, 135, 36, 20);
    g.fillEllipse(34, 135, 22, 30);
    g.fillEllipse(446, 135, 22, 30);
    // Rope-ring emblem + Sol's crescent, fresh paint back then.
    g.lineStyle(2, 0x6e6248, 0.35);
    g.strokeCircle(240, 135, 37);
    g.lineStyle(2, 0xa08d68, 0.3);
    g.beginPath();
    g.arc(240, 135, 20, Math.PI * 0.25, Math.PI * 1.25);
    g.strokePath();
    g.lineStyle(1, 0x5c5344);
    g.strokeRect(16, 16, 448, 238);
    g.lineBetween(240, 16, 240, 254);
    g.strokeCircle(240, 135, 30);
    // Net drape + swags along the top rail, corks at the gathers.
    g.lineStyle(1, 0x4a4234, 0.7);
    for (let x = 16; x < 464; x += 12) {
      g.lineBetween(x, 16, x + 6, 21);
      g.lineBetween(x + 6, 16, x, 21);
    }
    for (let cx = 44; cx < 454; cx += 56) {
      g.beginPath();
      g.arc(cx, 17, 12, Math.PI * 0.12, Math.PI * 0.88);
      g.strokePath();
      g.fillStyle(0x8a7a5c, 0.9);
      g.fillRect(cx - 12, 17, 2, 2);
      g.fillRect(cx + 10, 17, 2, 2);
    }
    // Warm evening floodlight, the way memory lights things.
    g.fillStyle(0xc9a06a, 0.05);
    g.fillTriangle(20, 16, 140, 254, 20, 254);
    g.fillTriangle(460, 16, 340, 254, 460, 254);
    // The whole harbor came to watch (they fade when the silence lands).
    this.crowd = this.add.graphics().setDepth(2);
    const crowdColors = [0x8a7a5c, 0x6e6248, 0xa08d68];
    for (let i = 0; i < 40; i++) {
      const cxp = 22 + ((i * 47) % 436);
      const cyp = i % 2 === 0 ? 8 : 262;
      this.crowd.fillStyle(crowdColors[(i * 7) % 3]!, 0.8);
      this.crowd.fillCircle(cxp, cyp, 3);
      this.crowd.fillRect(cxp - 2, cyp + 2, 4, 4);
    }
    // Goals with their bell gantries — the bells were already old.
    g.lineStyle(2, 0x8a7a5c, 0.9);
    g.strokeRect(4, 115, 12, 40);
    g.strokeRect(464, 115, 12, 40);
    for (const bx of [10, 470]) {
      g.fillStyle(0x4a4234);
      g.fillRect(bx - 6, 102, 2, 13);
      g.fillRect(bx + 4, 102, 2, 13);
      g.fillRect(bx - 7, 101, 14, 2);
      g.fillStyle(0xa08d68);
      g.fillRect(bx - 2, 105, 4, 2);
      g.fillRect(bx - 3, 107, 6, 3);
      g.fillStyle(0x6e6248);
      g.fillRect(bx - 4, 110, 8, 2);
    }
  }
}
