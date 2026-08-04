import Phaser from 'phaser';
import {
  FONT_BODY,
  FONT_DISPLAY,
  FS_BODY,
  FS_DISPLAY_2X,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../app/constants';
import { BUILD_VERSION } from '../app/buildInfo';
import { loadSave } from '../platform/saveStore';
import { unlockAudio } from '../platform/audio';
import { resumeSfx } from '../platform/sfx';
import { music } from '../platform/music';
import { SfxPlayer } from '../platform/sfxPlayer';
import { fadeIn, makeButton, transitionTo, UI, type UiButton } from '../presentation/ui';
import { loadSettings, saveSettings } from '../platform/settings';

/**
 * Title v2: sunset harbor key art (all drawn), animated water + idle cast,
 * panel menu, music. First tap unlocks audio (Master Plan P7).
 */
export class TitleScene extends Phaser.Scene {
  private unlocked = false;
  private sfxp!: SfxPlayer;
  private buttons: UiButton[] = [];
  private castSprites: Phaser.GameObjects.Sprite[] = [];
  private waterLines: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    this.unlocked = false;
    this.sfxp = new SfxPlayer(this);
    this.buttons = [];
    this.castSprites = [];
    this.waterLines = [];
    const cx = GAME_WIDTH / 2;

    this.drawHarbor();

    // Logo with drop shadow + gold rule.
    this.add
      .text(cx + 2, 62, 'SOLPORT CAGES', {
        fontFamily: FONT_DISPLAY,
        fontSize: FS_DISPLAY_2X,
        color: '#0e0e14',
      })
      .setOrigin(0.5)
      .setAlpha(0.6);
    this.add
      .text(cx, 60, 'SOLPORT CAGES', {
        fontFamily: FONT_DISPLAY,
        fontSize: FS_DISPLAY_2X,
        color: UI.textMain,
      })
      .setOrigin(0.5);
    this.add.rectangle(cx, 78, 168, 2, 0xf2c14e, 0.9);
    this.add
      .text(cx, 88, 'a 3v3 street football story', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#9a968a',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, 150, 'TAP TO START', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: UI.gold,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(GAME_WIDTH - 4, GAME_HEIGHT - 4, `v${this.registry.get('buildVersion') as string}`, {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#4a4a55',
      })
      .setOrigin(1, 1)
      .setAlpha(0.7);

    const onFirst = (): void => {
      if (this.unlocked) return;
      this.unlocked = true;
      unlockAudio(this);
      resumeSfx();
      music.play('harbor');
      this.tweens.killTweensOf(prompt);
      prompt.destroy();
      void this.showMenu();
    };
    this.input.once('pointerdown', onFirst);
    this.input.keyboard?.once('keydown', onFirst);

    // Ambient animation: cast idle bob + water shimmer.
    this.time.addEvent({
      delay: 480,
      loop: true,
      callback: () => {
        for (const s of this.castSprites) {
          s.setFrame(Number(s.frame.name) === 0 ? 1 : 0);
        }
      },
    });
    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        for (const line of this.waterLines) {
          line.setAlpha(0.08 + Math.random() * 0.18);
          line.x = (line.getData('baseX') as number) + (Math.random() * 10 - 5);
        }
      },
    });

    fadeIn(this);
    if (window.__SOLPORT__) window.__SOLPORT__.scene = 'Title';
  }

  private async showMenu(): Promise<void> {
    const cx = GAME_WIDTH / 2;
    let hasSave = false;
    let chapterDone = false;
    try {
      const result = await loadSave(BUILD_VERSION);
      hasSave = result.kind !== 'fresh';
      chapterDone = result.save.flags.includes('ch1.complete');
      this.registry.set('flags', result.save.flags);
    } catch {
      // Storage unavailable — menu still works, just no Continue.
    }

    const entries: Array<{ label: string; primary?: boolean; action: () => void }> = [
      {
        label: 'NEW GAME',
        primary: true,
        action: () => {
          this.registry.set('flags', []);
          transitionTo(this, 'Flashback');
        },
      },
    ];
    if (hasSave) {
      entries.push({
        label: chapterDone ? 'CONTINUE — BRINE HARBOR' : 'CONTINUE',
        action: () => transitionTo(this, 'Hub'),
      });
    }
    entries.push({
      label: 'FRIENDLY VS THE GULLS',
      action: () => transitionTo(this, 'Match', {}),
    });
    const soundIndex = entries.length;
    entries.push({
      label: loadSettings().muted ? 'SOUND: OFF' : 'SOUND: ON',
      action: () => {
        const settings = loadSettings();
        settings.muted = !settings.muted;
        saveSettings(settings);
        this.buttons[soundIndex]?.setLabel(settings.muted ? 'SOUND: OFF' : 'SOUND: ON');
        if (settings.muted) {
          music.stop(200);
        } else {
          music.play('harbor');
        }
      },
    });

    entries.forEach((entry, i) => {
      const button = makeButton(
        this,
        cx,
        130 + i * 24,
        entry.label,
        () => {
          this.sfxp.play('uiConfirm', 0.6);
          entry.action();
        },
        { primary: entry.primary ?? false, width: 190 },
      );
      button.appear(i * 70);
      this.buttons.push(button);
    });
    const first = entries[0];
    if (first) {
      this.input.keyboard?.once('keydown-ENTER', first.action);
      this.input.keyboard?.once('keydown-J', first.action);
    }
  }

  /** Sunset over Brine Harbor — drawn, no assets. */
  private drawHarbor(): void {
    const g = this.add.graphics();
    const bands = [0x1b2233, 0x2a3040, 0x4a3a44, 0x7a4a44, 0xa85c42];
    bands.forEach((color, i) => {
      g.fillStyle(color);
      g.fillRect(0, i * 22, GAME_WIDTH, 22);
    });
    g.fillStyle(0xf2c14e, 0.9);
    g.fillCircle(360, 96, 14);
    g.fillStyle(0xf2c14e, 0.18);
    g.fillCircle(360, 96, 24);
    // Skyline: cranes, masts, containers.
    g.fillStyle(0x131722);
    g.fillRect(0, 100, GAME_WIDTH, 14);
    for (let x = 10; x < GAME_WIDTH; x += 46) {
      g.fillRect(x, 84, 3, 18);
      g.fillRect(x, 84, 14, 2);
    }
    g.fillRect(40, 92, 26, 10);
    g.fillRect(300, 90, 30, 12);
    // Water with shimmer lines (animated in create).
    g.fillStyle(0x1a2732);
    g.fillRect(0, 114, GAME_WIDTH, 60);
    for (let i = 0; i < 12; i++) {
      const y = 118 + i * 4.5;
      const line = this.add.rectangle(
        40 + ((i * 83) % 400),
        y,
        30 + ((i * 37) % 50),
        1,
        0xf2c14e,
        0.12,
      );
      line.setData('baseX', line.x);
      this.waterLines.push(line);
    }
    // Quay.
    g.fillStyle(0x23262d);
    g.fillRect(0, 174, GAME_WIDTH, GAME_HEIGHT - 174);
    g.fillStyle(0x272b33);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      for (let y = 174 + ((x / 32) % 2 === 0 ? 0 : 16); y < GAME_HEIGHT; y += 32) {
        g.fillRect(x, y, 16, 16);
      }
    }
    // Cage silhouette right.
    g.lineStyle(2, 0x39424e);
    g.strokeRect(392, 186, 76, 62);
    g.lineStyle(1, 0x39424e, 0.6);
    for (let x = 398; x < 466; x += 8) g.lineBetween(x, 186, x - 4, 248);

    // A gull crossing the sunset, over and over, because it lives here.
    const gullBird = this.add
      .text(-16, 72, '⌄', { fontFamily: 'monospace', fontSize: '10px', color: '#131722' })
      .setAlpha(0.85);
    this.tweens.add({
      targets: gullBird,
      x: GAME_WIDTH + 16,
      duration: 16000,
      repeat: -1,
      repeatDelay: 5000,
      onUpdate: () => {
        gullBird.y = 72 + Math.sin(gullBird.x / 30) * 5;
      },
    });

    // Moored boats + buoy on the water.
    g.fillStyle(0x131722);
    g.fillRect(70, 128, 38, 7);
    g.fillRect(84, 118, 2, 10);
    g.fillRect(150, 148, 24, 5);
    g.fillStyle(0xc2643a);
    g.fillCircle(330, 150, 3);
    // Quay clutter: crates, barrel, rope, lamppost glow.
    g.fillStyle(0x4a4030);
    g.fillRect(30, 214, 16, 12);
    g.fillRect(42, 206, 13, 10);
    g.lineStyle(1, 0x2f2b28);
    g.strokeRect(30, 214, 16, 12);
    g.strokeRect(42, 206, 13, 10);
    g.fillStyle(0x54432f);
    g.fillRect(120, 220, 10, 12);
    g.lineStyle(2, 0x8a7a5c);
    g.strokeCircle(146, 240, 5);
    g.fillStyle(0xf2c14e, 0.07);
    g.fillEllipse(340, 236, 60, 22);
    g.fillStyle(0x2f333c);
    g.fillRect(339, 204, 3, 32);
    g.fillStyle(0xf2c14e, 0.95);
    g.fillRect(337, 202, 7, 4);
    // Nino perched on the crates, watching his heroes.
    if (this.textures.exists('char_nino')) {
      this.castSprites.push(this.add.sprite(38, 206, 'char_nino', 0));
    }

    // The crew, idling on the quay with a ball.
    const lineup: Array<[string, number, number]> = [
      ['char_juno', 205, 232],
      ['char_ash', 240, 236],
      ['char_bram', 275, 230],
    ];
    for (const [key, x, y] of lineup) {
      if (!this.textures.exists(key)) continue;
      this.add.ellipse(x, y + 9, 12, 4, 0x000000, 0.3);
      this.castSprites.push(this.add.sprite(x, y, key, 0));
    }
    this.add.ellipse(252, 246, 7, 4, 0x000000, 0.3);
    this.add.ellipse(252, 244, 6, 6, 0xf5f1e3).setStrokeStyle(1, 0x9c9784);
  }

  isAudioUnlockAttempted(): boolean {
    return this.unlocked;
  }
}
