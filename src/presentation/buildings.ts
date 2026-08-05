import Phaser from 'phaser';
import { FONT_BODY, FS_BODY } from '../app/constants';

/**
 * Hand-built architecture (docs/07 code-first art path). Buildings are the
 * hardest thing to fake — they read as "programmer boxes" unless they have a
 * roof plane, wall material, framed openings, and a contact shadow. Every
 * structure here commits to those four things. Detail placement is
 * deterministic (position-hashed), never random.
 */
type G = Phaser.GameObjects.Graphics;

const OUTLINE = 0x191621;

function seeded(n: number): number {
  // Cheap position hash → [0,1). Deterministic, good enough for weathering.
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Soft contact shadow that seats a structure on the ground. */
export function groundShadow(g: G, x: number, y: number, w: number): void {
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(x + w / 2, y, w + 6, 7);
}

export interface ShackSpec {
  w: number;
  h: number; // wall height (roof adds on top)
  roofH?: number;
  wall?: number;
  wallAlt?: number;
  roof?: number;
  door?: number | null; // x offset of the door inside the wall; null = none
  windows?: number[]; // x offsets of windows
  scene?: Phaser.Scene; // enables window-glow flicker
}

/**
 * A working harbor building: corrugated tin roof with an overhang and a rust
 * patch, plank wall, framed door with a stone step, warm lit windows.
 * (x, y) is the top-left of the WALL; the roof rises roofH above it.
 */
export function shack(g: G, x: number, y: number, spec: ShackSpec): void {
  const { w, h } = spec;
  const roofH = spec.roofH ?? 14;
  const wall = spec.wall ?? 0x2e3440;
  const wallAlt = spec.wallAlt ?? 0x343b49;
  const roof = spec.roof ?? 0x46505e;

  groundShadow(g, x, y + h, w);

  // Wall: vertical planks with per-plank weathering.
  for (let px = 0; px < w; px += 6) {
    const t = seeded(x + px);
    g.fillStyle(t > 0.72 ? wallAlt : t < 0.14 ? 0x282e39 : wall);
    g.fillRect(x + px, y, Math.min(6, w - px), h);
    g.fillStyle(OUTLINE, 0.35);
    g.fillRect(x + px, y, 1, h);
  }
  // Skirt: the bottom row is always damp.
  g.fillStyle(0x232833);
  g.fillRect(x, y + h - 3, w, 3);
  // Corner trim posts.
  g.fillStyle(0x232833);
  g.fillRect(x, y, 2, h);
  g.fillRect(x + w - 2, y, 2, h);

  // Roof: corrugated tin, overhanging both sides.
  const rx = x - 3;
  const rw = w + 6;
  const ry = y - roofH;
  g.fillStyle(roof);
  g.fillRect(rx, ry, rw, roofH);
  g.fillStyle(0x5a6675); // lit ridge
  g.fillRect(rx, ry, rw, 2);
  g.fillStyle(0x3a4350, 0.8); // corrugation grooves
  for (let cx = rx + 3; cx < rx + rw - 1; cx += 4) g.fillRect(cx, ry + 2, 1, roofH - 2);
  // One rusted sheet, position-hashed.
  const rustX = rx + 4 + Math.floor(seeded(x * 3 + y) * (rw - 16));
  g.fillStyle(0x6b4a3a, 0.85);
  g.fillRect(rustX, ry + 2, 8, roofH - 2);
  g.fillStyle(0x3a4350, 0.6);
  for (let cx = rustX + 1; cx < rustX + 8; cx += 4) g.fillRect(cx, ry + 2, 1, roofH - 2);
  // Eave shadow onto the wall.
  g.fillStyle(0x000000, 0.3);
  g.fillRect(x, y, w, 3);
  // Roof outline.
  g.lineStyle(1, OUTLINE, 0.9);
  g.strokeRect(rx + 0.5, ry + 0.5, rw - 1, roofH - 1);

  // Door.
  if (spec.door !== null && spec.door !== undefined) {
    const dx = x + spec.door;
    const dw = 18;
    const dh = Math.min(30, h - 4);
    const dy = y + h - dh;
    g.fillStyle(0x1c212b); // frame
    g.fillRect(dx - 2, dy - 2, dw + 4, dh + 2);
    g.fillStyle(0x3a3026); // door planks
    g.fillRect(dx, dy, dw, dh);
    g.fillStyle(0x2b2420);
    for (let px = dx + 5; px < dx + dw; px += 6) g.fillRect(px, dy, 1, dh);
    g.fillStyle(0x554838); // lintel
    g.fillRect(dx - 2, dy - 2, dw + 4, 2);
    g.fillStyle(0xf2c14e); // handle
    g.fillRect(dx + dw - 5, dy + Math.floor(dh / 2), 2, 2);
    g.fillStyle(0x3f454f); // stone step
    g.fillRect(dx - 1, y + h, dw + 2, 3);
    g.fillStyle(0x4a515c);
    g.fillRect(dx - 1, y + h, dw + 2, 1);
  }

  // Windows: frame, protruding sill, warm cross-paned glass, light pool.
  for (const wx of spec.windows ?? []) {
    const wxa = x + wx;
    const wy = y + 8;
    g.fillStyle(0xf2c14e, 0.05);
    g.fillEllipse(wxa + 8, y + h + 3, 30, 10);
    g.fillStyle(0x1c212b);
    g.fillRect(wxa - 1, wy - 1, 18, 14);
    g.fillStyle(0xe8b84a, 0.9);
    g.fillRect(wxa, wy, 16, 12);
    g.fillStyle(0xc2934a, 0.9);
    g.fillRect(wxa, wy + 8, 16, 4); // lower panes read dimmer
    g.fillStyle(0x1c212b);
    g.fillRect(wxa + 7, wy, 2, 12);
    g.fillRect(wxa, wy + 5, 16, 2);
    g.fillStyle(0x5a6675); // sill
    g.fillRect(wxa - 2, wy + 12, 20, 2);
    if (spec.scene) {
      const glow = spec.scene.add.rectangle(wxa + 8, wy + 3, 14, 4, 0xffe9a8, 0.35).setDepth(1);
      spec.scene.tweens.add({
        targets: glow,
        alpha: 0.1,
        duration: 1600 + ((wxa * 31) % 900),
        yoyo: true,
        repeat: -1,
      });
    }
  }
}

/** A wooden signboard with nailed corners, mounted where you put it. */
export function signboard(
  scene: Phaser.Scene,
  g: G,
  cx: number,
  cy: number,
  label: string,
  opts: { color?: string; bg?: number; hang?: boolean } = {},
): void {
  const text = scene.add
    .text(cx, cy, label, {
      fontFamily: FONT_BODY,
      fontSize: FS_BODY,
      color: opts.color ?? '#e8d9b8',
    })
    .setOrigin(0.5)
    .setDepth(2);
  const bw = text.width + 10;
  const bh = 13;
  if (opts.hang) {
    g.lineStyle(1, 0x191621, 0.9);
    g.lineBetween(cx - bw / 2 + 3, cy - bh / 2, cx - bw / 2 + 3, cy - bh / 2 - 4);
    g.lineBetween(cx + bw / 2 - 3, cy - bh / 2, cx + bw / 2 - 3, cy - bh / 2 - 4);
  }
  g.fillStyle(0x000000, 0.35);
  g.fillRect(cx - bw / 2 + 1, cy - bh / 2 + 2, bw, bh);
  g.fillStyle(opts.bg ?? 0x3a3026);
  g.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  g.fillStyle(0x554838);
  g.fillRect(cx - bw / 2, cy - bh / 2, bw, 1);
  g.lineStyle(1, OUTLINE, 0.9);
  g.strokeRect(cx - bw / 2 + 0.5, cy - bh / 2 + 0.5, bw - 1, bh - 1);
  g.fillStyle(0xf2c14e, 0.9);
  for (const [nx, ny] of [
    [cx - bw / 2 + 1, cy - bh / 2 + 1],
    [cx + bw / 2 - 2, cy - bh / 2 + 1],
    [cx - bw / 2 + 1, cy + bh / 2 - 2],
    [cx + bw / 2 - 2, cy + bh / 2 - 2],
  ] as const) {
    g.fillRect(nx, ny, 1, 1);
  }
}

export interface CageSpec {
  accent?: number; // latch/keeper colour
  tint?: number; // interior wash
  tintAlpha?: number;
  gate?: 'left' | 'none';
}

/**
 * A street cage that has survived weather: concrete kerb, capped steel posts,
 * diamond chain-link (both diagonals), a sagging top cable, and a framed gate
 * with hinges. (x, y, w, h) is the fence rectangle.
 */
export function cage(g: G, x: number, y: number, w: number, h: number, spec: CageSpec = {}): void {
  // Concrete kerb footing.
  g.fillStyle(0x3a4048);
  g.fillRect(x - 3, y + h - 2, w + 6, 5);
  g.fillStyle(0x4a515c);
  g.fillRect(x - 3, y + h - 2, w + 6, 2);
  g.fillStyle(0x000000, 0.25);
  g.fillRect(x - 3, y + h + 3, w + 6, 2);

  // Interior wash.
  if (spec.tint !== undefined) {
    g.fillStyle(spec.tint, spec.tintAlpha ?? 0.1);
    g.fillRect(x, y, w, h);
  }

  // Chain-link mesh: both diagonals make diamonds, not prison bars.
  g.lineStyle(1, 0x6e7887, 0.6);
  for (let c = -h; c <= w; c += 8) {
    // Down-right diagonals through (x+c, y), clipped to the fence rect.
    const sx = Math.max(x, x + c);
    const ex = Math.min(x + w, x + c + h);
    if (sx < ex) g.lineBetween(sx, y + (sx - (x + c)), ex, y + (ex - (x + c)));
  }
  for (let c = 0; c <= w + h; c += 8) {
    // Down-left diagonals through (x+c, y), clipped.
    const sx = Math.min(x + w, x + c);
    const ex = Math.max(x, x + c - h);
    if (ex < sx) g.lineBetween(sx, y + (x + c - sx), ex, y + (x + c - ex));
  }

  // Top rail + the sag every real cage has.
  g.lineStyle(2, 0x7c8694, 1);
  g.lineBetween(x, y, x + w, y);
  g.lineStyle(1, 0x5b6472, 0.9);
  g.lineBetween(x + 2, y + 2, x + Math.floor(w / 2), y + 4);
  g.lineBetween(x + Math.floor(w / 2), y + 4, x + w - 2, y + 2);

  // Posts: corners + middle, with caps and base plates.
  const posts = [x, x + Math.floor(w / 2) - 1, x + w - 3];
  for (const px of posts) {
    g.fillStyle(0x6b7482);
    g.fillRect(px, y - 1, 3, h + 1);
    g.fillStyle(0x8a94a2);
    g.fillRect(px, y - 1, 3, 2); // cap
    g.fillRect(px, y - 1, 1, h + 1); // lit edge
    g.fillStyle(0x3a4048);
    g.fillRect(px - 1, y + h - 2, 5, 3); // base plate
  }

  // Gate: framed section with hinges and a latch that catches the light.
  if (spec.gate !== 'none') {
    const gw = 16;
    const gx = x + 4;
    g.lineStyle(2, 0x7c8694, 1);
    g.strokeRect(gx, y + 4, gw, h - 6);
    g.lineStyle(1, 0x5b6472, 0.8);
    g.lineBetween(gx, y + 4, gx + gw, y + h - 2);
    g.fillStyle(0x8a94a2);
    g.fillRect(gx - 1, y + 8, 2, 3); // hinges
    g.fillRect(gx - 1, y + h - 12, 2, 3);
    g.fillStyle(spec.accent ?? 0xf2c14e);
    g.fillRect(gx + gw - 2, y + Math.floor(h / 2), 3, 3); // latch
  }
}

/**
 * Market stall v2: legs, planked counter with goods, side poles, and a
 * scallop-edged awning that casts shade on the counter.
 */
export function marketStall(g: G, x: number, y: number, w: number, primary: number): void {
  const counterY = y + 12;
  const counterH = 16;
  groundShadow(g, x, counterY + counterH + 2, w);

  // Legs.
  g.fillStyle(0x2b2420);
  g.fillRect(x + 1, counterY + counterH - 2, 3, 6);
  g.fillRect(x + w - 4, counterY + counterH - 2, 3, 6);

  // Counter: horizontal planks + lip.
  g.fillStyle(0x4a3a2a);
  g.fillRect(x, counterY, w, counterH);
  g.fillStyle(0x413325);
  g.fillRect(x, counterY + 6, w, 1);
  g.fillRect(x, counterY + 11, w, 1);
  g.fillStyle(0x6b573c); // lip
  g.fillRect(x - 1, counterY - 2, w + 2, 3);
  g.lineStyle(1, OUTLINE, 0.7);
  g.strokeRect(x + 0.5, counterY + 0.5, w - 1, counterH - 1);

  // Goods on the counter: spice mounds + a bowl, position-hashed colours.
  const goods = [0xc2643a, 0xd08f2e, 0xb03535, 0x8a6d3a];
  for (let i = 0; i < Math.floor(w / 16); i++) {
    const gx = x + 5 + i * 15;
    const color = goods[Math.floor(seeded(x + i * 7) * goods.length)]!;
    g.fillStyle(color);
    g.fillTriangle(gx, counterY - 2, gx + 8, counterY - 2, gx + 4, counterY - 7);
    g.fillStyle(0xffffff, 0.25);
    g.fillTriangle(gx + 3, counterY - 4, gx + 4, counterY - 7, gx + 5, counterY - 4);
  }

  // Side poles up to the awning.
  g.fillStyle(0x2b2420);
  g.fillRect(x, y - 2, 2, counterY - y + 2);
  g.fillRect(x + w - 2, y - 2, 2, counterY - y + 2);

  // Awning: stripes, ridge, scalloped hem, cast shade.
  for (let i = 0; i < w; i += 8) {
    g.fillStyle(Math.floor(i / 8) % 2 === 0 ? primary : 0xe8d9b8);
    g.fillRect(x + i, y - 4, Math.min(8, w - i), 9);
  }
  g.fillStyle(0xffffff, 0.18);
  g.fillRect(x, y - 4, w, 2); // lit ridge
  for (let i = 0; i < w; i += 8) {
    // Scalloped hem: little triangles hanging off the edge.
    g.fillStyle(Math.floor(i / 8) % 2 === 0 ? primary : 0xe8d9b8);
    g.fillTriangle(x + i, y + 5, x + i + 8, y + 5, x + i + 4, y + 8);
  }
  g.fillStyle(0x000000, 0.25); // awning shade on the counter
  g.fillRect(x, y + 8, w, 3);
  g.lineStyle(1, OUTLINE, 0.6);
  g.lineBetween(x, y - 4, x + w, y - 4);
}

/** Distant far-shore silhhouettes: warehouses, a crane, a few lit windows. */
export function farShore(g: G, y: number): void {
  g.fillStyle(0x151b26);
  // Warehouse row with varied rooflines.
  const blocks: Array<[number, number, number]> = [
    [12, 30, 10],
    [50, 42, 14],
    [128, 36, 9],
    [210, 26, 12],
    [268, 48, 15],
    [352, 34, 10],
    [420, 44, 13],
  ];
  for (const [bx, bw, bh] of blocks) {
    g.fillStyle(0x151b26);
    g.fillRect(bx, y - bh, bw, bh);
    // Pitched roof hint.
    g.fillTriangle(bx, y - bh, bx + bw, y - bh, bx + bw / 2, y - bh - 4);
  }
  // Crane over the middle.
  g.fillStyle(0x151b26);
  g.fillRect(176, y - 26, 3, 26);
  g.fillRect(160, y - 26, 34, 2);
  g.fillRect(190, y - 24, 1, 8);
  // A few windows still lit across the water.
  g.fillStyle(0xf2c14e, 0.5);
  for (const [wx, wy] of [
    [58, 8],
    [74, 8],
    [276, 10],
    [292, 6],
    [430, 9],
  ] as const) {
    g.fillRect(wx, y - wy, 2, 2);
  }
}

/**
 * A brick shopfront strip for market streets: brick courses, shuttered and
 * lit openings, a drainpipe — the wall the stalls lean against.
 */
export function shopfrontRow(g: G, x: number, y: number, w: number, h: number): void {
  // Brick field.
  g.fillStyle(0x4a3028);
  g.fillRect(x, y, w, h);
  g.fillStyle(0x553830, 0.9);
  for (let by = y; by < y + h; by += 5) {
    for (let bx = x + (((by - y) / 5) % 2 === 0 ? 0 : 5); bx < x + w; bx += 10) {
      g.fillRect(bx, by, 9, 4);
    }
  }
  g.fillStyle(0x3a251f);
  g.fillRect(x, y + h - 2, w, 2); // footing course

  // Openings, spaced along the wall.
  for (let ox = x + 14; ox < x + w - 30; ox += 58) {
    const kind = Math.floor(seeded(ox * 11) * 3);
    if (kind === 0) {
      // Shuttered window.
      g.fillStyle(0x241f2b);
      g.fillRect(ox - 1, y + 8, 20, 18);
      g.fillStyle(0x5e4826);
      g.fillRect(ox, y + 9, 9, 16);
      g.fillRect(ox + 10, y + 9, 9, 16);
      g.fillStyle(0x4a3a2a);
      g.fillRect(ox + 4, y + 9, 1, 16);
      g.fillRect(ox + 14, y + 9, 1, 16);
      g.fillStyle(0x8a6d3a);
      g.fillRect(ox - 2, y + 26, 22, 2); // sill
    } else if (kind === 1) {
      // Warm lit window behind lattice.
      g.fillStyle(0x241f2b);
      g.fillRect(ox - 1, y + 8, 20, 18);
      g.fillStyle(0xe8b84a, 0.85);
      g.fillRect(ox, y + 9, 18, 16);
      g.fillStyle(0x241f2b);
      g.fillRect(ox + 8, y + 9, 2, 16);
      g.fillRect(ox, y + 16, 18, 2);
      g.fillStyle(0x8a6d3a);
      g.fillRect(ox - 2, y + 26, 22, 2);
    } else {
      // Arched doorway, dark inside.
      g.fillStyle(0x241f2b);
      g.fillRect(ox, y + 10, 16, h - 12);
      g.fillCircle(ox + 8, y + 10, 8);
      g.fillStyle(0x151016);
      g.fillRect(ox + 2, y + 12, 12, h - 14);
      g.fillCircle(ox + 8, y + 12, 6);
      g.fillStyle(0xd08f2e, 0.5); // lamp inside the arch
      g.fillRect(ox + 7, y + 14, 2, 2);
    }
  }
  // Drainpipe near the right end.
  g.fillStyle(0x2b2420);
  g.fillRect(x + w - 22, y, 3, h);
  g.fillStyle(0x3a3026);
  g.fillRect(x + w - 23, y + 4, 5, 2);
}

/**
 * Flagstone paving: irregular stone courses with per-stone weathering, mortar
 * gaps, the odd crack, and weeds in the joints. Kills the checkerboard tell.
 */
export function flagstones(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { base?: number; alt?: number; dark?: number; mortar?: number; weed?: number } = {},
): void {
  const base = opts.base ?? 0x25282f;
  const alt = opts.alt ?? 0x2a2e36;
  const dark = opts.dark ?? 0x212429;
  const mortar = opts.mortar ?? 0x1c1f25;
  const weed = opts.weed ?? 0x2e4a41;
  g.fillStyle(mortar);
  g.fillRect(x, y, w, h);
  const rowH = 13;
  for (let ry = y, row = 0; ry < y + h; ry += rowH, row++) {
    let sx = x - Math.floor(seeded(row * 17) * 18);
    while (sx < x + w) {
      const sw = 20 + Math.floor(seeded(sx * 3 + row * 29) * 22);
      const t = seeded(sx * 7 + row * 11);
      const cx0 = Math.max(x, sx);
      const cw = Math.min(x + w, sx + sw) - cx0 - 1;
      const ch = Math.min(y + h, ry + rowH) - ry - 1;
      if (cw > 0 && ch > 0) {
        g.fillStyle(t > 0.75 ? alt : t < 0.16 ? dark : base);
        g.fillRect(cx0, ry, cw, ch);
        // Lit top edge on some stones.
        if (t > 0.55) {
          g.fillStyle(0xffffff, 0.04);
          g.fillRect(cx0, ry, cw, 1);
        }
        // A crack across the occasional stone.
        if (seeded(sx * 13 + row * 7) > 0.9 && cw > 10) {
          g.lineStyle(1, mortar, 0.9);
          g.lineBetween(cx0 + 2, ry + ch - 1, cx0 + Math.min(cw - 2, 8), ry + 1);
        }
        // Weeds in a few joints.
        if (seeded(sx * 5 + row * 23) > 0.88) {
          g.fillStyle(weed, 0.9);
          g.fillRect(cx0 + cw - 1, ry + ch - 3, 1, 2);
          g.fillRect(cx0 + cw, ry + ch - 2, 1, 2);
        }
      }
      sx += sw;
    }
  }
}

/** A cast-iron drain grate set into the paving. */
export function drainGrate(g: G, x: number, y: number): void {
  g.fillStyle(0x1a1d23);
  g.fillRect(x, y, 14, 8);
  g.fillStyle(0x3a4048);
  g.fillRect(x, y, 14, 1);
  g.fillStyle(0x0e1014);
  for (let i = 2; i < 13; i += 3) g.fillRect(x + i, y + 2, 1, 5);
}

/** Quay bollards with chain sag between them, along the water's edge. */
export function bollards(g: G, y: number, xs: number[]): void {
  for (let i = 0; i < xs.length; i++) {
    const bx = xs[i]!;
    if (i < xs.length - 1) {
      const nx = xs[i + 1]!;
      const mid = (bx + nx) / 2;
      g.lineStyle(1, 0x5b6472, 0.9);
      g.lineBetween(bx + 2, y - 3, mid, y + 1);
      g.lineBetween(mid, y + 1, nx - 2, y - 3);
    }
    g.fillStyle(0x39424e);
    g.fillRect(bx - 2, y - 5, 4, 6);
    g.fillStyle(0x4c5663);
    g.fillRect(bx - 3, y - 6, 6, 2);
    g.fillStyle(0x5b6472);
    g.fillRect(bx - 2, y - 6, 2, 1);
  }
}

/** Squared stone gate pillars flanking a road exit at the screen edge. */
export function roadPillars(g: G, x: number, y1: number, y2: number): void {
  for (const py of [y1, y2]) {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x + 4, py + 22, 14, 5);
    g.fillStyle(0x4a515c);
    g.fillRect(x, py, 8, 22);
    g.fillStyle(0x5b6472);
    g.fillRect(x, py, 8, 2);
    g.fillRect(x, py, 2, 22);
    g.fillStyle(0x3a4048);
    for (let sy = py + 5; sy < py + 20; sy += 6) g.fillRect(x, sy, 8, 1);
    g.fillStyle(0x6b7482);
    g.fillRect(x - 1, py - 2, 10, 3); // cap stone
  }
}
