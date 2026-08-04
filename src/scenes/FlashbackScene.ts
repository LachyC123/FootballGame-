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

  constructor() {
    super('Flashback');
  }

  create(): void {
    this.beat = 0;
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
        // Ash dribbles toward the right goal, Kairo makes his run.
        this.tweens.add({ targets: [this.ash], x: 220, duration: 1600 });
        this.tweens.add({ targets: [this.ball], x: 230, y: 152, duration: 1600 });
        this.tweens.add({ targets: [this.kairo], x: 330, y: 100, duration: 1600 });
        this.tweens.add({ targets: [this.defender], x: 268, duration: 1600 });
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
        this.ash.setFrame(17); // E-row kick contact
        this.sfxp.play('shot', 0.9);
        this.tweens.add({
          targets: this.ball,
          x: 452,
          y: 118,
          duration: 260,
          ease: 'Linear',
          onComplete: () => {
            // Clang. Off the frame.
            this.sfxp.play('post', 1);
            if (!reduced) this.cameras.main.shake(90, 0.004);
            this.tweens.add({ targets: this.ball, x: 300, y: 170, duration: 500 });
          },
        });
        this.wait(1400, () => this.next());
        break;
      }
      case 3: {
        // The counter: their kid takes it the other way and scores.
        this.rival.setFlipX(false);
        this.tweens.add({ targets: this.rival, x: 120, y: 160, duration: 1100 });
        this.tweens.add({
          targets: this.ball,
          x: 110,
          y: 162,
          duration: 1000,
          onComplete: () => {
            this.tweens.add({
              targets: this.ball,
              x: 24,
              y: 135,
              duration: 220,
              onComplete: () => {
                this.sfxp.play('bell', 0.5, -400);
                this.overlay.setFillStyle(0x1a1520, 0.45); // the colour drains
                this.card.setText('');
              },
            });
          },
        });
        this.wait(2100, () => this.next());
        break;
      }
      case 4: {
        // Silence. Kairo turns and walks off.
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
    const g = this.add.graphics();
    g.fillStyle(0x2b2620);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x332d24);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = (x / 32) % 2 === 0 ? 0 : 16; y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    g.lineStyle(1, 0x5c5344);
    g.strokeRect(16, 16, 448, 238);
    g.lineBetween(240, 16, 240, 254);
    g.strokeCircle(240, 135, 30);
    g.lineStyle(2, 0x8a7a5c, 0.9);
    g.strokeRect(4, 115, 12, 40);
    g.strokeRect(464, 115, 12, 40);
  }
}
