import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { unlockAudio } from '../platform/audio';

/**
 * Title: first tap unlocks audio (Master Plan P7) and reveals the menu stub.
 * PH- note: system-font text is Phase 0 placeholder UI, replaced in Phase 2.
 */
export class TitleScene extends Phaser.Scene {
  private unlocked = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.unlocked = false;
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 88, 'SOLPORT CAGES', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#e8e3d0',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 112, 'working title • PH build', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#7d7a6e',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, 178, 'TAP TO START', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f2c14e',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(GAME_WIDTH - 4, GAME_HEIGHT - 4, `v${this.registry.get('buildVersion') as string}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#4a4a55',
      })
      .setOrigin(1, 1);

    let stage: 0 | 1 = 0;
    const onPress = (): void => {
      if (stage === 0) {
        stage = 1;
        unlockAudio(this);
        this.unlocked = true;
        this.tweens.killTweensOf(prompt);
        prompt.setText('AGAIN — FRIENDLY VS THE GULLS').setAlpha(1);
        return;
      }
      this.input.off('pointerdown', onPress);
      this.input.keyboard?.off('keydown', onPress);
      this.scene.start('Match', {});
    };
    this.input.on('pointerdown', onPress);
    this.input.keyboard?.on('keydown', onPress);

    if (window.__SOLPORT__) {
      window.__SOLPORT__.scene = 'Title';
    }
  }

  isAudioUnlockAttempted(): boolean {
    return this.unlocked;
  }
}
