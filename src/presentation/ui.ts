import Phaser from 'phaser';
import { FONT_BODY, FS_BODY } from '../app/constants';

/**
 * Shared UI language (docs/06 §6): dark panels with gold strokes, chunky
 * buttons with visible pressed states, and scene fade transitions.
 */
export const UI = {
  panelFill: 0x131118,
  panelStroke: 0xf2c14e,
  textMain: '#e8e3d0',
  textDim: '#9a968a',
  gold: '#f2c14e',
} as const;

export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 30,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  // Drop shadow.
  g.fillStyle(0x000000, 0.45);
  g.fillRect(x + 2, y + 3, w, h);
  // Body.
  g.fillStyle(UI.panelFill, 0.96);
  g.fillRect(x, y, w, h);
  // Inner top highlight + gold frame with notched corners (pixel style).
  g.fillStyle(0x2a2433, 1);
  g.fillRect(x + 1, y + 1, w - 2, 1);
  g.lineStyle(1, UI.panelStroke, 0.85);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.fillStyle(UI.panelStroke, 0.85);
  for (const [cx, cy] of [
    [x, y],
    [x + w - 2, y],
    [x, y + h - 2],
    [x + w - 2, y + h - 2],
  ] as const) {
    g.fillRect(cx, cy, 2, 2);
  }
  return g;
}

export interface UiButton {
  destroy(): void;
  setLabel(label: string): void;
  /** Entrance animation: fade + settle from a few pixels below. */
  appear(delayMs: number): void;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: { primary?: boolean; width?: number; depth?: number } = {},
): UiButton {
  const depth = opts.depth ?? 31;
  const width = opts.width ?? 132;
  const height = 20;
  const bg = scene.add
    .rectangle(x, y, width, height, opts.primary ? 0x2b2433 : 0x1c1922, 1)
    .setDepth(depth)
    .setStrokeStyle(1, opts.primary ? 0xf2c14e : 0x4a4455, 0.9)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(x, y - 1, label, {
      fontFamily: FONT_BODY,
      fontSize: FS_BODY,
      color: opts.primary ? UI.gold : UI.textMain,
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);
  bg.on('pointerover', () => bg.setFillStyle(0x332b3d));
  bg.on('pointerout', () => bg.setFillStyle(opts.primary ? 0x2b2433 : 0x1c1922));
  bg.on('pointerdown', () => {
    bg.y += 1;
    text.y += 1;
  });
  bg.on('pointerup', () => {
    bg.y -= 1;
    text.y -= 1;
    onClick();
  });
  bg.on('pointerupoutside', () => {
    bg.y -= 1;
    text.y -= 1;
  });
  return {
    destroy: () => {
      bg.destroy();
      text.destroy();
    },
    setLabel: (l: string) => text.setText(l),
    appear: (delayMs: number) => {
      bg.setAlpha(0);
      text.setAlpha(0);
      bg.y += 6;
      text.y += 6;
      scene.tweens.add({
        targets: [bg, text],
        alpha: 1,
        y: '-=6',
        duration: 220,
        delay: delayMs,
        ease: 'Cubic.easeOut',
      });
    },
  };
}

const FADE_COLOR: [number, number, number] = [14, 14, 20];

export function fadeIn(scene: Phaser.Scene, ms = 220): void {
  scene.cameras.main.fadeIn(ms, ...FADE_COLOR);
}

/** Fade out, then switch scenes — the standard transition everywhere. */
export function transitionTo(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  ms = 200,
): void {
  scene.cameras.main.fadeOut(ms, ...FADE_COLOR);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
}
