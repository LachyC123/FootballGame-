import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { getStartOverride } from '../dev/launcher';

/**
 * Preload: loads only the next playable route. Phase 0 has no assets yet;
 * the progress bar contract is in place for Phase 1 route packs.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const bar = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 4, 4, 0xe8e3d0);
    this.load.on('progress', (value: number) => {
      bar.width = Math.max(4, 160 * value);
    });
  }

  create(): void {
    const override = getStartOverride();
    this.scene.start(override?.scene ?? 'Title');
  }
}
