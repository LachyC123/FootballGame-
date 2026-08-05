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

    // Kairo's room at Voltside: a dark dorm lit by the city and a phone.
    const g = this.add.graphics();
    g.fillStyle(0x0a0a12);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Floorboards.
    g.fillStyle(0x12101c);
    g.fillRect(0, 150, GAME_WIDTH, GAME_HEIGHT - 150);
    g.fillStyle(0x171422, 0.8);
    for (let fy = 158; fy < GAME_HEIGHT; fy += 14) g.fillRect(0, fy, GAME_WIDTH, 1);
    // The window: rain streaking down, the Volt tower's neon beyond it.
    g.fillStyle(0x161430);
    g.fillRect(318, 52, 60, 46);
    g.fillStyle(0x5a4fcf, 0.35); // tower sign glow
    g.fillRect(334, 60, 4, 30);
    g.fillStyle(0xd14fcf, 0.3);
    g.fillRect(352, 66, 3, 22);
    g.fillStyle(0x2a2444);
    g.fillRect(360, 74, 12, 24); // block silhouette
    g.lineStyle(1, 0x8a86b8, 0.25); // rain on the glass
    for (let rx = 322; rx < 376; rx += 9) g.lineBetween(rx, 54, rx - 2, 96);
    g.lineStyle(2, 0x241f2b, 1); // frame
    g.strokeRect(318, 52, 60, 46);
    g.lineBetween(348, 52, 348, 98);
    g.lineBetween(318, 75, 378, 75);
    g.fillStyle(0x5a4fcf, 0.05); // window light spilling onto the floor
    g.fillTriangle(318, 98, 378, 98, 400, 190);
    g.fillTriangle(318, 98, 400, 190, 296, 190);
    // Bunk against the far wall, blanket in Volt colours, boots kicked off.
    g.fillStyle(0x1c1a2c);
    g.fillRect(66, 158, 78, 30);
    g.fillStyle(0x2a2740);
    g.fillRect(70, 162, 16, 10); // pillow
    g.fillStyle(0x5a4fcf, 0.45);
    g.fillRect(92, 162, 48, 12); // blanket
    g.fillStyle(0x241f2b);
    g.fillRect(66, 186, 78, 3); // frame rail
    g.fillStyle(0x241f2b);
    g.fillRect(152, 184, 7, 4); // boots
    g.fillRect(161, 185, 7, 3);
    // Volt pennant + tally marks scratched by the bed. He counts something.
    g.fillStyle(0x5a4fcf, 0.9);
    g.fillTriangle(96, 66, 124, 66, 110, 88);
    g.fillStyle(0xe8e3d0, 0.9);
    g.fillRect(104, 70, 2, 6);
    g.fillRect(110, 70, 2, 6);
    g.lineStyle(1, 0x4a4658, 0.7);
    for (let t = 0; t < 5; t++) g.lineBetween(150 + t * 4, 118, 151 + t * 4, 126);
    g.lineBetween(148, 126, 168, 117);
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
