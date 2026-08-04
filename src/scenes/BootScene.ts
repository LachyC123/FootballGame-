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
    this.scene.start('Preload');
  }
}
