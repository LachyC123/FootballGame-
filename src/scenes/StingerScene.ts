import Phaser from 'phaser';
import { FONT_BODY, FS_BODY, GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { music } from '../platform/music';
import { transitionTo } from '../presentation/ui';

/**
 * Ch.1 closing stinger (docs/02 Ch.1 aftermath): cut to Voltside — Kairo
 * watching the clip of Ash's win. No dialogue. He watches it twice.
 * Beat-based like the flashback; tap advances.
 */
export class StingerScene extends Phaser.Scene {
  private beatDone: (() => void) | null = null;

  constructor() {
    super('Stinger');
  }

  create(): void {
    music.stop(400);
    const cx = GAME_WIDTH / 2;

    // Voltside at night: black, neon strips, rain of light.
    const g = this.add.graphics();
    g.fillStyle(0x0a0a12);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x5a4fcf, 0.25);
    g.fillRect(0, 40, GAME_WIDTH, 2);
    g.fillStyle(0xd14fcf, 0.18);
    g.fillRect(0, 46, GAME_WIDTH, 1);
    for (let i = 0; i < 14; i++) {
      g.fillStyle(i % 2 ? 0x5a4fcf : 0x2e9e8f, 0.1);
      g.fillRect(30 + i * 34, 60 + ((i * 13) % 30), 2, 40 + ((i * 29) % 60));
    }
    this.add
      .text(cx, 30, 'VOLTSIDE — THAT SAME NIGHT', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#8a86b8',
      })
      .setOrigin(0.5);

    // Kairo, back to us, lit by a phone screen.
    this.add.ellipse(cx, 189, 12, 4, 0x000000, 0.4);
    const kairo = this.add.sprite(cx, 180, 'char_kairo', 20); // N row idle (back)
    void kairo;
    const phoneGlow = this.add.rectangle(cx, 156, 26, 16, 0x9db8ff, 0.16);
    this.add.rectangle(cx, 156, 18, 11, 0x131824).setStrokeStyle(1, 0x4a5578);
    // The clip: a tiny teal dot ringing a tiny bell, looping.
    const clipDot = this.add.rectangle(cx - 5, 157, 2, 2, 0x2e9e8f);
    const clipFlash = this.add.rectangle(cx + 5, 155, 3, 3, 0xf2c14e, 0);
    this.tweens.add({
      targets: clipDot,
      x: cx + 3,
      duration: 900,
      repeat: -1,
      onRepeat: () => {
        clipFlash.setAlpha(0.9);
        this.tweens.add({ targets: clipFlash, alpha: 0, duration: 300 });
      },
    });
    this.tweens.add({ targets: phoneGlow, alpha: 0.05, duration: 800, yoyo: true, repeat: -1 });

    const caption = this.add
      .text(cx, GAME_HEIGHT - 42, '', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#9a968a',
      })
      .setOrigin(0.5);

    const skip = (): void => {
      if (this.beatDone) {
        const fn = this.beatDone;
        this.beatDone = null;
        fn();
      }
    };
    this.input.on('pointerdown', skip);
    this.input.keyboard?.on('keydown', skip);

    const wait = (ms: number, then: () => void): void => {
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
    };

    this.cameras.main.fadeIn(300, 10, 10, 18);
    wait(2600, () => {
      caption.setText('He watched it twice.');
      wait(2200, () => {
        caption.setText('He said nothing to anyone.');
        wait(2000, () => {
          transitionTo(this, 'Hub', undefined, 400);
        });
      });
    });

    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Stinger';
  }
}
