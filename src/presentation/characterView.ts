import Phaser from 'phaser';
import type { PlayerState } from '../domain/match/types';

/**
 * Renders a domain PlayerState with the generated 24×24 sheets.
 * Frames are selected directly (no Phaser anim registry) so presentation is a
 * pure function of domain state + elapsed time — nothing can desync.
 *
 * Sheet: rows 0=S 1=E 2=N · cols 0-1 idle · 2-5 run · 6-7 kick · 8 slide · 9 stumble
 */
const COLS = 10;

export function spriteKeyFor(characterId: string): string {
  return characterId.replace(/^chr_/, 'char_');
}

export class CharacterView {
  readonly container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private animT = 0;

  constructor(scene: Phaser.Scene, characterId: string) {
    const key = spriteKeyFor(characterId);
    this.shadow = scene.add.ellipse(0, 9, 12, 4, 0x000000, 0.3);
    this.sprite = scene.add.sprite(0, 0, key, 0);
    this.container = scene.add.container(0, 0, [this.shadow, this.sprite]).setDepth(5);
  }

  update(p: PlayerState, dt: number): void {
    this.animT += dt * (p.sprinting ? 1.5 : 1);
    this.container.setPosition(Math.round(p.pos.x), Math.round(p.pos.y - 8));

    // Direction row + horizontal flip.
    let row: number;
    let flip = false;
    if (Math.abs(p.facing.x) >= Math.abs(p.facing.y)) {
      row = 1;
      flip = p.facing.x < 0;
    } else {
      row = p.facing.y > 0 ? 0 : 2;
      flip = false;
    }

    // Column from action state.
    let col: number;
    const speed = Math.hypot(p.vel.x, p.vel.y);
    switch (p.action) {
      case 'kick':
        col = p.actionT > 0.06 ? 6 : 7;
        break;
      case 'lunge':
        col = 8;
        break;
      case 'stumble':
        col = 9;
        break;
      default:
        if (speed > 12) {
          col = 2 + (Math.floor(this.animT * 10) % 4);
        } else {
          col = Math.floor(this.animT * 2) % 2;
        }
        break;
    }
    this.sprite.setFrame(row * COLS + col);
    this.sprite.setFlipX(flip);
    this.sprite.setAlpha(p.action === 'stumble' ? 0.75 : 1);
  }

  flashWhite(scene: Phaser.Scene): void {
    // Phaser 4 tint API: fill mode + colour.
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    scene.time.delayedCall(60, () => {
      this.sprite.clearTint();
      this.sprite.setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
