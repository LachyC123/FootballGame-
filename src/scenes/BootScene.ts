import Phaser from 'phaser';
import { BUILD_VERSION } from '../app/buildInfo';
import { loadSettings } from '../platform/settings';

/**
 * Boot: read build metadata, device capabilities and persisted settings.
 * Loads no gameplay assets (Master Plan scene/state flow).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const settings = loadSettings();
    this.registry.set('settings', settings);
    this.registry.set('buildVersion', BUILD_VERSION);
    // Load the pixel fonts before any text renders; a failed load falls back
    // to monospace rather than blocking boot.
    const fonts = Promise.all([
      document.fonts.load('16px m5x7'),
      document.fonts.load('22px m6x11plus'),
    ]);
    void Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).finally(() => {
      this.scene.start('Preload');
    });
  }
}
