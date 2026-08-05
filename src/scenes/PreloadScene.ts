import Phaser from 'phaser';
import { FONT_BODY, FONT_DISPLAY, FS_BODY, FS_DISPLAY, GAME_HEIGHT, GAME_WIDTH } from '../app/constants';
import { allSfxEntries } from '../content/audioManifest';
import { getStartOverride } from '../dev/launcher';
import { CLOISTER, KETTLE } from './MatchScene';
import { cloisterMatchConfig, spiceMatchConfig } from './HubScene';

/**
 * Preload: loads only the next playable route. Phase 0 has no assets yet;
 * the progress bar contract is in place for Phase 1 route packs.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Branded loading beat: title, framed bar, a line of harbor patience.
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0e0e14);
    this.add
      .text(cx, cy - 28, 'SOLPORT CAGES', {
        fontFamily: FONT_DISPLAY,
        fontSize: FS_DISPLAY,
        color: '#e8e3d0',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 26, 'mending the nets…', {
        fontFamily: FONT_BODY,
        fontSize: FS_BODY,
        color: '#9a968a',
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.add.rectangle(cx, cy, 168, 10, 0x131118).setStrokeStyle(1, 0xf2c14e, 0.7);
    const bar = this.add.rectangle(cx - 82, cy, 4, 6, 0xf2c14e).setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => {
      bar.width = Math.max(4, 164 * value);
    });
    for (const { key, url } of allSfxEntries()) {
      this.load.audio(key, url);
    }
    // Generated pixel-art rigs + portraits (scripts/generate-sprites.mjs).
    const cast = ['ash', 'juno', 'bram', 'salt', 'gull_a', 'gull_b', 'tero', 'nino', 'kairo', 'oldkid_a', 'oldkid_b', 'nadia', 'seppi', 'spice_a', 'spice_b', 'ivy', 'prior', 'saint_a', 'alder'];
    for (const id of cast) {
      this.load.spritesheet(`char_${id}`, `assets/sprites/char_${id}.png`, {
        frameWidth: 24,
        frameHeight: 24,
      });
      this.load.image(`portrait_${id}`, `assets/sprites/portrait_${id}.png`);
    }
  }

  create(): void {
    const override = getStartOverride();
    if (override?.district) {
      // Dev: jumping into a later district implies its prerequisites.
      const flags = ['ch1.metTero', 'ch1.complete'];
      if (override.district === 'oldcobble') {
        flags.push('ch2.metNadia', 'ch2.crate', 'ch2.delivered', 'ch2.junoTalk', 'ch2.complete');
      }
      this.registry.set('flags', flags);
      this.scene.start(override.scene, { district: override.district });
    } else if (override?.arena === 'kettle') {
      // Dev: preview the Kettle dressing without playing to chapter 2.
      this.scene.start(override.scene, { arena: KETTLE, config: spiceMatchConfig(override.seed) });
    } else if (override?.arena === 'cloister') {
      this.scene.start(override.scene, { arena: CLOISTER, config: cloisterMatchConfig(override.seed) });
    } else {
      this.scene.start(override?.scene ?? 'Title');
    }
  }
}
