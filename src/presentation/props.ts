import Phaser from 'phaser';

/**
 * Drawn prop library (docs/07 code-first art path) — set dressing so districts
 * feel inhabited. All pure Graphics + tiny tweens; palette per docs/06.
 */
type G = Phaser.GameObjects.Graphics;

export function crate(g: G, x: number, y: number, s = 16): void {
  const h = Math.round(s * 0.75);
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(x + s / 2, y + h + 1, s + 2, 4);
  // Vertical planks with a gap line.
  g.fillStyle(0x4a4030);
  g.fillRect(x, y, s, h);
  g.fillStyle(0x413828);
  g.fillRect(x + Math.floor(s / 2), y, 1, h);
  g.fillRect(x + Math.floor(s / 4), y, 1, h);
  g.fillRect(x + Math.floor((3 * s) / 4), y, 1, h);
  g.fillStyle(0x5e5240); // lit top edge
  g.fillRect(x + 1, y + 1, s - 2, 2);
  g.lineStyle(1, 0x2f2b28);
  g.strokeRect(x, y, s, h);
  g.lineBetween(x, y + h / 2, x + s, y + h / 2);
  // Corner nails + a stencil mark.
  g.fillStyle(0x241f2b);
  g.fillRect(x + 1, y + 1, 1, 1);
  g.fillRect(x + s - 2, y + 1, 1, 1);
  g.fillRect(x + 1, y + h - 2, 1, 1);
  g.fillRect(x + s - 2, y + h - 2, 1, 1);
  if (s >= 14) {
    g.fillStyle(0x2f2b28, 0.8);
    g.fillRect(x + 3, y + h - 5, 4, 2); // shipping stencil
  }
}

export function barrel(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(x + 5, y + 13, 12, 4);
  g.fillStyle(0x54432f);
  g.fillRect(x, y, 10, 12);
  g.fillStyle(0x63503a); // stave highlight
  g.fillRect(x + 2, y, 2, 12);
  g.fillStyle(0x6b573c); // top rim
  g.fillRect(x + 1, y, 8, 2);
  g.fillStyle(0x463726);
  g.fillRect(x + 2, y + 1, 6, 1); // dark interior hint
  g.lineStyle(1, 0x2f2b28);
  g.strokeRect(x, y, 10, 12);
  // Iron bands with bolts.
  g.lineBetween(x, y + 4, x + 10, y + 4);
  g.lineBetween(x, y + 8, x + 10, y + 8);
  g.fillStyle(0x8a94a2, 0.9);
  g.fillRect(x + 1, y + 4, 1, 1);
  g.fillRect(x + 8, y + 8, 1, 1);
}

export function ropeCoil(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(x, y + 4, 14, 4);
  g.lineStyle(2, 0x8a7a5c);
  g.strokeCircle(x, y, 5);
  g.strokeCircle(x, y, 2);
  g.lineStyle(1, 0x6b5c42, 0.9);
  g.strokeCircle(x, y, 4); // shadowed inner winding
  g.lineStyle(2, 0x8a7a5c);
  g.lineBetween(x + 5, y + 2, x + 9, y + 5); // loose tail
}

export function netPile(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(x, y + 4, 24, 5);
  g.fillStyle(0x39525a, 0.6);
  g.fillEllipse(x, y, 22, 10);
  g.lineStyle(1, 0x5b6472, 0.8);
  for (let i = -8; i <= 8; i += 4) g.lineBetween(x + i, y - 4, x + i - 3, y + 4);
  for (let j = -3; j <= 3; j += 3) g.lineBetween(x - 10, y + j, x + 10, y + j);
  // Cork floats caught in the mesh.
  g.fillStyle(0xc9b48a);
  g.fillRect(x - 6, y - 2, 2, 2);
  g.fillRect(x + 4, y + 1, 2, 2);
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
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(x + 1, y + 1, 8, 3);
  // Fluted post with a lit edge, cross-arm, and a lantern box with a cap.
  g.fillStyle(0x2f333c);
  g.fillRect(x - 1, y - 26, 3, 27);
  g.fillStyle(0x424855);
  g.fillRect(x - 1, y - 26, 1, 27);
  g.fillStyle(0x2f333c);
  g.fillRect(x - 4, y - 27, 9, 2);
  g.fillRect(x - 4, y - 20, 2, 1); // bracket curl
  g.fillStyle(0x241f2b); // lantern cap + finial
  g.fillRect(x - 3, y - 32, 7, 2);
  g.fillRect(x, y - 33, 1, 1);
  g.fillStyle(0x241f2b);
  g.fillRect(x - 3, y - 27, 1, 5); // lantern frame sides
  g.fillRect(x + 3, y - 27, 1, 5);
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
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(x + 11, y + 8, 24, 4);
  g.fillStyle(0x54432f);
  g.fillRect(x, y, 22, 3);
  g.fillStyle(0x463726);
  g.fillRect(x + 10, y, 1, 3); // plank split
  g.fillStyle(0x3a2f22);
  g.fillRect(x + 1, y + 3, 2, 4);
  g.fillRect(x + 19, y + 3, 2, 4);
  g.fillStyle(0x6b573c);
  g.fillRect(x, y, 22, 1);
}

export function sack(g: G, x: number, y: number, spice: number): void {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(x + 5, y + 10, 12, 3);
  g.fillStyle(0xc9b48a);
  g.fillRect(x, y + 2, 10, 8);
  g.fillRect(x + 2, y, 6, 3);
  g.fillStyle(0xb09c74); // shaded side + slump crease
  g.fillRect(x + 7, y + 3, 3, 7);
  g.fillRect(x + 1, y + 6, 8, 1);
  g.lineStyle(1, 0x8a7a5c);
  g.strokeRect(x, y + 2, 10, 8);
  g.fillStyle(0x6b5c42); // tie string
  g.fillRect(x + 2, y + 2, 6, 1);
  g.fillStyle(spice);
  g.fillRect(x + 2, y + 1, 6, 2);
  g.fillStyle(0xffffff, 0.25);
  g.fillRect(x + 3, y + 1, 2, 1); // spice glints
}

export function rug(g: G, x: number, y: number, w: number, h: number, c1: number, c2: number): void {
  g.fillStyle(c1, 0.85);
  g.fillRect(x, y, w, h);
  g.fillStyle(c2, 0.85);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(c1, 0.85);
  g.fillRect(x + 4, y + 4, w - 8, h - 8);
  // Woven diamond at the centre + tassel fringe on both ends.
  g.fillStyle(c2, 0.9);
  const mx = x + w / 2;
  const my = y + h / 2;
  g.fillTriangle(mx, my - 3, mx - 3, my, mx + 3, my);
  g.fillTriangle(mx, my + 3, mx - 3, my, mx + 3, my);
  g.fillStyle(0xe8d9b8, 0.8);
  for (let ty = y + 1; ty < y + h; ty += 3) {
    g.fillRect(x - 1, ty, 1, 1);
    g.fillRect(x + w, ty, 1, 1);
  }
}

export function poster(g: G, x: number, y: number, color: number): void {
  g.fillStyle(0xe8d9b8, 0.9);
  g.fillRect(x, y, 10, 13);
  g.fillStyle(color, 0.9);
  g.fillRect(x + 1, y + 1, 8, 5);
  g.lineStyle(1, 0x241f2b, 0.6);
  for (let i = 0; i < 3; i++) g.lineBetween(x + 2, y + 8 + i * 2, x + 8, y + 8 + i * 2);
  // Peeling corner + tape at the top.
  g.fillStyle(0xb8a888, 0.9);
  g.fillTriangle(x + 10, y + 13, x + 7, y + 13, x + 10, y + 10);
  g.fillStyle(0xffffff, 0.25);
  g.fillRect(x + 3, y - 1, 4, 2);
}

/** A fish crate by the water: grey catch on ice. */
export function fishCrate(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(x + 8, y + 11, 18, 4);
  g.fillStyle(0x4a4030);
  g.fillRect(x, y, 16, 10);
  g.lineStyle(1, 0x2f2b28);
  g.strokeRect(x, y, 16, 10);
  g.fillStyle(0xdfe6ea, 0.9); // ice
  g.fillRect(x + 1, y + 1, 14, 4);
  g.fillStyle(0x7c8694); // fish
  g.fillRect(x + 2, y + 2, 5, 2);
  g.fillRect(x + 8, y + 1, 5, 2);
  g.fillTriangle(x + 7, y + 3, x + 7, y + 2, x + 9, y + 3);
  g.fillStyle(0x5b6472);
  g.fillRect(x + 3, y + 2, 1, 1); // eye
}

/** Stacked terracotta pots for the market. */
export function potStack(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(x + 6, y + 13, 14, 4);
  for (let i = 0; i < 3; i++) {
    const py = y + i * 4;
    g.fillStyle(0x9c5a3a);
    g.fillRect(x + i, py, 12 - i * 2, 4);
    g.fillStyle(0xb06a44);
    g.fillRect(x + i, py, 12 - i * 2, 1);
    g.fillStyle(0x7c452c);
    g.fillRect(x + i, py + 3, 12 - i * 2, 1);
  }
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
