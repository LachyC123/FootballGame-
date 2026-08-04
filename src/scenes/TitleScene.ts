import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { BUILD_VERSION } from '../app/buildInfo';
import { loadSave } from '../platform/saveStore';
import { unlockAudio } from '../platform/audio';
import { resumeSfx } from '../platform/sfx';
import { SfxPlayer } from '../platform/sfxPlayer';

/**
 * Title: first tap unlocks audio (Master Plan P7), then a small menu.
 * PH- note: system-font text is placeholder UI until the bitmap fonts land.
 */
export class TitleScene extends Phaser.Scene {
  private unlocked = false;
  private sfxp!: SfxPlayer;

  constructor() {
    super('Title');
  }

  create(): void {
    this.unlocked = false;
    this.sfxp = new SfxPlayer(this);
    const cx = GAME_WIDTH / 2;

    // Backdrop: cast lineup on the harbor.
    const g = this.add.graphics();
    g.fillStyle(0x141821);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0xc2643a, 0.12);
    g.fillRect(0, 40, GAME_WIDTH, 4);
    g.fillStyle(0x1b2027);
    g.fillRect(0, 44, GAME_WIDTH, GAME_HEIGHT - 44);
    const lineup = ['char_juno', 'char_ash', 'char_bram'];
    lineup.forEach((key, i) => {
      if (this.textures.exists(key)) {
        this.add.ellipse(cx - 30 + i * 30, 208, 12, 4, 0x000000, 0.3);
        this.add.sprite(cx - 30 + i * 30, 199, key, 0);
      }
    });

    this.add
      .text(cx, 70, 'SOLPORT CAGES', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#e8e3d0',
        stroke: '#0e0e14',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 92, 'working title • vertical slice build', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#7d7a6e',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, 140, 'TAP TO START', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f2c14e',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(GAME_WIDTH - 4, GAME_HEIGHT - 4, `v${this.registry.get('buildVersion') as string}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#4a4a55',
      })
      .setOrigin(1, 1);

    const onFirst = (): void => {
      if (this.unlocked) return;
      this.unlocked = true;
      unlockAudio(this);
      resumeSfx();
      this.tweens.killTweensOf(prompt);
      prompt.destroy();
      void this.showMenu();
    };
    this.input.once('pointerdown', onFirst);
    this.input.keyboard?.once('keydown', onFirst);

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

    const entries: Array<{ label: string; action: () => void }> = [];
    entries.push({
      label: 'NEW GAME',
      action: () => {
        this.registry.set('flags', []);
        this.scene.start('Story');
      },
    });
    if (hasSave) {
      entries.push({
        label: chapterDone ? 'CONTINUE (friendly match)' : 'CONTINUE',
        action: () => {
          this.scene.start(chapterDone ? 'Match' : 'Story', {});
        },
      });
    }
    entries.push({ label: 'FRIENDLY VS THE GULLS', action: () => this.scene.start('Match', {}) });

    entries.forEach((entry, i) => {
      const t = this.add
        .text(cx, 132 + i * 18, entry.label, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: i === 0 ? '#f2c14e' : '#e8e3d0',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#f2c14e'));
      t.on('pointerout', () => t.setColor(i === 0 ? '#f2c14e' : '#e8e3d0'));
      t.on('pointerdown', () => {
        this.sfxp.play('uiConfirm', 0.6);
        entry.action();
      });
    });
    // Keyboard: Enter/J starts the first entry.
    const first = entries[0];
    if (first) {
      this.input.keyboard?.once('keydown-ENTER', first.action);
      this.input.keyboard?.once('keydown-J', first.action);
    }
  }

  isAudioUnlockAttempted(): boolean {
    return this.unlocked;
  }
}
