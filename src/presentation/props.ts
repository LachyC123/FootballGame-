import Phaser from 'phaser';

/**
 * Drawn prop library (docs/07 code-first art path) — set dressing so districts
 * feel inhabited. All pure Graphics + tiny tweens; palette per docs/06.
 */
type G = Phaser.GameObjects.Graphics;

export function crate(g: G, x: number, y: number, s = 16): void {
  g.fillStyle(0x4a4030);
  g.fillRect(x, y, s, s * 0.75);
  g.lineStyle(1, 0x2f2b28);
  g.strokeRect(x, y, s, s * 0.75);
  g.lineBetween(x, y + s * 0.375, x + s, y + s * 0.375);
  g.fillStyle(0x5e5240);
  g.fillRect(x + 1, y + 1, s - 2, 2);
}

export function barrel(g: G, x: number, y: number): void {
  g.fillStyle(0x54432f);
  g.fillRect(x, y, 10, 12);
  g.fillStyle(0x6b573c);
  g.fillRect(x + 1, y, 8, 2);
  g.lineStyle(1, 0x2f2b28);
  g.strokeRect(x, y, 10, 12);
  g.lineBetween(x, y + 4, x + 10, y + 4);
  g.lineBetween(x, y + 8, x + 10, y + 8);
}

export function ropeCoil(g: G, x: number, y: number): void {
  g.lineStyle(2, 0x8a7a5c);
  g.strokeCircle(x, y, 5);
  g.strokeCircle(x, y, 2);
}

export function netPile(g: G, x: number, y: number): void {
  g.fillStyle(0x39525a, 0.6);
  g.fillEllipse(x, y, 22, 10);
  g.lineStyle(1, 0x5b6472, 0.8);
  for (let i = -8; i <= 8; i += 4) g.lineBetween(x + i, y - 4, x + i - 3, y + 4);
  for (let j = -3; j <= 3; j += 3) g.lineBetween(x - 10, y + j, x + 10, y + j);
}

export function puddle(scene: Phaser.Scene, g: G, x: number, y: number, w: number): void {
  g.fillStyle(0x1a2732, 0.7);
  g.fillEllipse(x, y, w, w * 0.4);
  const gleam = scene.add.rectangle(x - w * 0.2, y - 1, w * 0.35, 1, 0xf2c14e, 0.25);
  scene.tweens.add({
    targets: gleam,
    alpha: 0.08,
    duration: 1400 + ((x * 13) % 900),
    yoyo: true,
    repeat: -1,
  });
}

export function lamppost(scene: Phaser.Scene, g: G, x: number, y: number): void {
  // Warm dusk pool on the ground, then the post over it.
  g.fillStyle(0xf2c14e, 0.06);
  g.fillEllipse(x, y + 2, 44, 18);
  g.fillStyle(0x2f333c);
  g.fillRect(x - 1, y - 26, 3, 27);
  g.fillRect(x - 4, y - 27, 9, 3);
  const lamp = scene.add.rectangle(x + 0.5, y - 28, 5, 4, 0xf2c14e, 0.95).setDepth(3);
  scene.tweens.add({
    targets: lamp,
    alpha: 0.65,
    duration: 1100 + ((x * 7) % 500),
    yoyo: true,
    repeat: -1,
  });
}

export function bench(g: G, x: number, y: number): void {
  g.fillStyle(0x54432f);
  g.fillRect(x, y, 22, 3);
  g.fillRect(x + 1, y + 3, 2, 4);
  g.fillRect(x + 19, y + 3, 2, 4);
  g.fillStyle(0x6b573c);
  g.fillRect(x, y, 22, 1);
}

export function sack(g: G, x: number, y: number, spice: number): void {
  g.fillStyle(0xc9b48a);
  g.fillRect(x, y + 2, 10, 8);
  g.fillRect(x + 2, y, 6, 3);
  g.lineStyle(1, 0x8a7a5c);
  g.strokeRect(x, y + 2, 10, 8);
  g.fillStyle(spice);
  g.fillRect(x + 2, y + 1, 6, 2);
}

export function rug(g: G, x: number, y: number, w: number, h: number, c1: number, c2: number): void {
  g.fillStyle(c1, 0.85);
  g.fillRect(x, y, w, h);
  g.fillStyle(c2, 0.85);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(c1, 0.85);
  g.fillRect(x + 4, y + 4, w - 8, h - 8);
}

export function poster(g: G, x: number, y: number, color: number): void {
  g.fillStyle(0xe8d9b8, 0.9);
  g.fillRect(x, y, 10, 13);
  g.fillStyle(color, 0.9);
  g.fillRect(x + 1, y + 1, 8, 5);
  g.lineStyle(1, 0x241f2b, 0.6);
  for (let i = 0; i < 3; i++) g.lineBetween(x + 2, y + 8 + i * 2, x + 8, y + 8 + i * 2);
}

export function chalkCrescent(g: G, x: number, y: number, r: number, alpha = 0.18): void {
  g.lineStyle(2, 0xe8e3d0, alpha);
  g.beginPath();
  g.arc(x, y, r, Math.PI * 0.2, Math.PI * 1.3);
  g.strokePath();
}

export function chalkScrawl(g: G, x: number, y: number, crossed: boolean): void {
  g.lineStyle(1, 0xc2643a, 0.4);
  g.lineBetween(x, y, x + 26, y - 1);
  g.lineBetween(x + 2, y + 4, x + 22, y + 3);
  if (crossed) {
    g.lineStyle(2, 0x2e9e8f, 0.55);
    g.lineBetween(x - 2, y + 5, x + 28, y - 3);
  }
}

/** Little black harbor cat, prowling between two x positions. */
export function cat(scene: Phaser.Scene, x1: number, x2: number, y: number): void {
  const c = scene.add.container(x1, y).setDepth(4);
  const g = scene.add.graphics();
  g.fillStyle(0x1a181f);
  g.fillRect(0, 0, 8, 4); // body
  g.fillRect(6, -3, 4, 4); // head
  g.fillRect(6, -5, 1, 2); // ear
  g.fillRect(9, -5, 1, 2); // ear
  g.fillRect(-3, -1, 3, 1); // tail
  g.fillStyle(0xf2c14e);
  g.fillRect(8, -2, 1, 1); // eye
  c.add(g);
  scene.tweens.add({
    targets: c,
    x: x2,
    duration: 6000 + Math.abs(x2 - x1) * 20,
    yoyo: true,
    repeat: -1,
    hold: 2400,
    repeatDelay: 3200,
    onYoyo: () => c.setScale(-1, 1),
    onRepeat: () => c.setScale(1, 1),
  });
}

/** A pigeon that pecks, hops a few pixels, pecks again. */
export function pigeon(scene: Phaser.Scene, x: number, y: number): void {
  const g = scene.add.graphics({ x, y }).setDepth(3);
  g.fillStyle(0x8a94a2);
  g.fillRect(0, 0, 4, 3);
  g.fillStyle(0x6b7482);
  g.fillRect(3, -2, 2, 2);
  const hop = (): void => {
    scene.tweens.add({
      targets: g,
      x: g.x + (Math.random() * 16 - 8),
      y: g.y + (Math.random() * 4 - 2),
      duration: 300,
      delay: 1200 + Math.random() * 2600,
      onComplete: hop,
    });
  };
  hop();
}

/** Non-interactive ambient walker: strolls between two points forever. */
export function ambientWalker(
  scene: Phaser.Scene,
  spriteKey: string,
  x1: number,
  x2: number,
  y: number,
  durMs: number,
): void {
  if (!scene.textures.exists(spriteKey)) return;
  scene.add.ellipse(x1, y + 9, 12, 4, 0x000000, 0.3).setDepth(3);
  const s = scene.add.sprite(x1, y, spriteKey, 12).setDepth(4);
  let frameT = 0;
  scene.time.addEvent({
    delay: 160,
    loop: true,
    callback: () => {
      frameT = (frameT + 1) % 4;
      s.setFrame(12 + frameT); // E-row run frames read as walking
    },
  });
  scene.tweens.add({
    targets: s,
    x: x2,
    duration: durMs,
    yoyo: true,
    repeat: -1,
    hold: 1800,
    repeatDelay: 1400,
    onYoyo: () => s.setFlipX(true),
    onRepeat: () => s.setFlipX(false),
    onUpdate: () => {
      const shadow = s.getData('shadow') as Phaser.GameObjects.Ellipse | undefined;
      shadow?.setPosition(s.x, s.y + 9);
    },
  });
  const shadow = scene.add.ellipse(x1, y + 9, 12, 4, 0x000000, 0.3).setDepth(3);
  s.setData('shadow', shadow);
}

/** Laundry line strung between two points, sheets swaying. */
export function laundry(scene: Phaser.Scene, g: G, x1: number, x2: number, y: number): void {
  g.lineStyle(1, 0x8a94a2, 0.45);
  g.lineBetween(x1, y, x2, y + 3);
  const colors = [0xe8d9b8, 0x2e9e8f, 0xc2643a];
  const n = Math.floor((x2 - x1) / 18);
  for (let i = 0; i < n; i++) {
    const px = x1 + 8 + i * 18;
    const sheet = scene.add.rectangle(px, y + 6, 10, 8, colors[i % colors.length]!, 0.9).setDepth(2);
    scene.tweens.add({
      targets: sheet,
      scaleX: 0.82,
      duration: 900 + i * 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
