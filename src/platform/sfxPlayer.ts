import type Phaser from 'phaser';
import { SFX_FAMILIES } from '../content/audioManifest';
import { loadSettings } from './settings';
import { sfx as synth } from './sfx';

/**
 * Variant-pool SFX player (docs/06 §8): random variant + detune per play so
 * frequent events never machine-gun. Concurrency-capped per family. Falls back
 * to the synth recipes when a file isn't loaded (e.g. dev cold start).
 */
const FAMILY_CAP = 4;

export class SfxPlayer {
  private scene: Phaser.Scene;
  private active = new Map<string, number>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(family: keyof typeof SFX_FAMILIES | string, volume = 1, detuneCents = 150): void {
    const settings = loadSettings();
    if (settings.muted) return;
    const files = SFX_FAMILIES[family as string];
    const count = this.active.get(family as string) ?? 0;
    if (count >= FAMILY_CAP) return;

    const pick = files ? files[Math.floor(Math.random() * files.length)] : undefined;
    if (pick && this.scene.cache.audio.exists(pick)) {
      this.active.set(family as string, count + 1);
      const sound = this.scene.sound.add(pick, {
        volume: volume * settings.sfxVolume,
        detune: (Math.random() * 2 - 1) * detuneCents,
      });
      sound.once('complete', () => {
        this.active.set(family as string, (this.active.get(family as string) ?? 1) - 1);
        sound.destroy();
      });
      sound.play();
      return;
    }
    this.fallback(family as string, volume);
  }

  private fallback(family: string, volume: number): void {
    switch (family) {
      case 'pass':
        synth.pass(Math.random() * 2 - 1);
        break;
      case 'shot':
        synth.kick(volume);
        break;
      case 'wall':
        synth.wall(volume * 400);
        break;
      case 'post':
        synth.post();
        break;
      case 'tackle':
      case 'shoulder':
        synth.tackle();
        break;
      case 'bell':
        synth.bell();
        break;
      case 'uiClick':
      case 'uiSelect':
      case 'uiConfirm':
        synth.ui();
        break;
      default:
        break;
    }
  }
}
