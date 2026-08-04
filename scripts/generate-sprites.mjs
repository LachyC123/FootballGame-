#!/usr/bin/env node
/**
 * Code-first sprite authoring (docs/07 §1 official art path).
 * Generates 24×24 character sheets (10 frames × 3 directions) + 32×32 portraits
 * as PNGs with zero dependencies. Deterministic: same input → same bytes.
 *
 * Sheet layout: rows: 0=S(front) 1=E(side, W=flipX) 2=N(back)
 * cols: 0-1 idle · 2-5 run · 6-7 kick · 8 slide · 9 stumble
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------- minimal PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- tiny canvas ----------
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4);
  }
  set(x, y, hex) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = (hex >> 16) & 0xff;
    this.data[i + 1] = (hex >> 8) & 0xff;
    this.data[i + 2] = hex & 0xff;
    this.data[i + 3] = 255;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    const i = (y * this.w + x) * 4;
    return this.data[i + 3] === 0 ? 0 : (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2];
  }
  filled(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.data[(y * this.w + x) * 4 + 3] !== 0;
  }
  rect(x, y, w, h, hex) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, hex);
  }
  /** 1px auto-outline around every filled region (docs/06: coloured, not black). */
  outline(hex) {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.filled(x, y)) continue;
        if (this.filled(x + 1, y) || this.filled(x - 1, y) || this.filled(x, y + 1) || this.filled(x, y - 1)) {
          marks.push([x, y]);
        }
      }
    }
    for (const [x, y] of marks) this.set(x, y, hex);
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        if (src.filled(x, y)) this.set(dx + x, dy + y, src.get(x, y));
      }
    }
  }
  upscale(f) {
    const out = new Canvas(this.w * f, this.h * f);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.filled(x, y)) out.rect(x * f, y * f, f, f, this.get(x, y));
      }
    }
    return out;
  }
}

const OUTLINE = 0x241f2b;

// ---------- characters ----------
const CHARACTERS = [
  { id: 'ash', skin: 0xe8b28a, hair: 0x3d3a45, style: 'crop', kit: 'crew', build: 'avg' },
  { id: 'juno', skin: 0xc98f66, hair: 0xd08f2e, style: 'spiky', kit: 'crew', build: 'slim' },
  { id: 'bram', skin: 0xf0c8a0, hair: 0x6b4a2f, style: 'buzz', kit: 'crew', build: 'big' },
  { id: 'salt', skin: 0xd8a273, hair: 0xdfe3e8, style: 'bandana', kit: 'gulls', build: 'avg' },
  { id: 'gull_a', skin: 0xcaa27c, hair: 0x4a4440, style: 'crop', kit: 'gulls', build: 'avg' },
  { id: 'gull_b', skin: 0xb98d63, hair: 0x2f2b28, style: 'buzz', kit: 'gulls', build: 'slim' },
  { id: 'tero', skin: 0xd9a67e, hair: 0xcfcfd4, style: 'crop', kit: 'coach', build: 'avg' },
  { id: 'nino', skin: 0xe0a878, hair: 0x2f2b28, style: 'spiky', kit: 'kid', build: 'slim' },
];

const KITS = {
  crew: { shirt: 0x2e9e8f, shade: 0x1d6b60, shorts: 0x24333d, socks: 0xd9d3c0, boots: 0x3a3f47 },
  gulls: { shirt: 0xc2643a, shade: 0x8a4527, shorts: 0x3a3230, socks: 0xcbbfa4, boots: 0x2f2b28 },
  coach: { shirt: 0x3f4652, shade: 0x2b303a, shorts: 0x2b303a, socks: 0x8a8f98, boots: 0x241f2b },
  kid: { shirt: 0xf2c14e, shade: 0xc29433, shorts: 0x24333d, socks: 0xd9d3c0, boots: 0x3a3f47 },
};

// Run cycle leg offsets [frontLeg dy, backLeg dy] and body bob per frame.
const RUN = [
  { l: -2, r: 0, bob: 0, armL: -1, armR: 1 },
  { l: -1, r: -1, bob: -1, armL: 0, armR: 0 },
  { l: 0, r: -2, bob: 0, armL: 1, armR: -1 },
  { l: -1, r: -1, bob: -1, armL: 0, armR: 0 },
];

/**
 * Draw one 24×24 frame. dir: 's'|'e'|'n'. pose: 'idle0','idle1','run0'..'run3','kick0','kick1','slide','stumble'.
 */
function drawFrame(char, dir, pose) {
  const c = new Canvas(24, 24);
  const kit = KITS[char.kit];
  const wide = char.build === 'big' ? 1 : 0;
  const slim = char.build === 'slim' ? 1 : 0;
  const cx = 12; // center

  let bob = 0;
  let legL = 0;
  let legR = 0;
  let lean = 0;
  if (pose === 'idle1') bob = 1;
  if (pose.startsWith('run')) {
    const r = RUN[Number(pose[3])];
    bob = r.bob;
    legL = r.l;
    legR = r.r;
  }
  if (pose === 'kick0') lean = -1;
  if (pose === 'kick1') lean = 1;
  if (pose === 'stumble') {
    lean = 1;
    bob = 2;
  }

  const groundY = 21;
  const legH = 4;
  const bodyTop = 10 + bob;
  const bodyH = groundY - legH - bodyTop; // torso rows
  const bodyW = 8 + wide * 2 - slim;
  const bx = cx - Math.floor(bodyW / 2) + lean;

  if (pose === 'slide') {
    // Sliding low: body horizontal-ish, one leg extended.
    const dirSign = dir === 'e' ? 1 : 0;
    c.rect(cx - 5, groundY - 4, 10, 3, kit.shirt);
    c.rect(cx - 5, groundY - 1, 4, 1, kit.shorts);
    c.rect(cx + (dirSign ? 3 : -1), groundY - 1, 5, 1, kit.socks);
    c.rect(cx + (dirSign ? 7 : -3), groundY - 1, 2, 1, kit.boots);
    drawHead(c, char, dir, cx + (dirSign ? -4 : 0), groundY - 9);
    c.outline(OUTLINE);
    return c;
  }

  // Legs (socks + boots).
  const legW = 2;
  const legGap = char.build === 'big' ? 3 : 2;
  const lx = cx - legGap + lean;
  const rx = cx + legGap - legW + lean;
  if (pose === 'kick1' && (dir === 'e' || dir === 's')) {
    // Contact frame: kicking leg extended forward.
    const kx = dir === 'e' ? cx + 4 : cx + 3;
    c.rect(lx, groundY - legH - legL, legW, legH + legL, kit.socks);
    c.rect(lx, groundY - 1, legW, 2, kit.boots);
    c.rect(kx, groundY - legH - 1, legW + 1, 2, kit.socks);
    c.rect(kx + 2, groundY - legH - 1, 2, 2, kit.boots);
  } else {
    c.rect(lx, groundY - legH - legL, legW, legH + legL, kit.socks);
    c.rect(rx, groundY - legH - legR, legW, legH + legR, kit.socks);
    c.rect(lx, groundY - 1 - legL, legW, 2, kit.boots);
    c.rect(rx, groundY - 1 - legR, legW, 2, kit.boots);
  }

  // Shorts.
  c.rect(bx, groundY - legH - 2, bodyW, 2, kit.shorts);

  // Torso.
  c.rect(bx, bodyTop, bodyW, bodyH, kit.shirt);
  if (dir === 's') c.rect(bx + bodyW - 2, bodyTop + 1, 2, bodyH - 1, kit.shade); // key light upper-left → shade right
  if (dir === 'e') c.rect(bx + bodyW - 2, bodyTop, 2, bodyH, kit.shade);
  if (dir === 'n') c.rect(bx + bodyW - 3, bodyTop + 1, 2, bodyH - 2, kit.shade);

  // Arms.
  const armY = bodyTop + 1;
  const armH = 4;
  if (dir !== 'e') {
    c.rect(bx - 1, armY, 1, armH, char.skin);
    c.rect(bx + bodyW, armY, 1, armH, char.skin);
  } else {
    const swing = pose.startsWith('run') ? RUN[Number(pose[3])].armL : 0;
    c.rect(bx + bodyW - 1, armY + swing, 1, armH, char.skin);
  }

  // Head.
  drawHead(c, char, dir, cx - 3 + lean, bodyTop - 7);

  c.outline(OUTLINE);
  return c;
}

function drawHead(c, char, dir, hx, hy) {
  // 7×7 head box at (hx, hy).
  c.rect(hx, hy + 1, 7, 6, char.skin);
  const hair = char.hair;
  if (dir === 'n') {
    // Back of head: hair covers most.
    c.rect(hx, hy, 7, 5, hair);
    if (char.style === 'bandana') {
      c.rect(hx, hy + 3, 7, 1, 0xdfe3e8);
      c.rect(hx, hy, 7, 3, 0x8d939c);
    }
    return;
  }
  switch (char.style) {
    case 'crop':
      c.rect(hx, hy, 7, 2, hair);
      c.rect(hx, hy + 2, 1, 2, hair);
      c.rect(hx + 6, hy + 2, 1, 2, hair);
      break;
    case 'spiky':
      c.rect(hx, hy, 7, 2, hair);
      c.set(hx + 1, hy - 1, hair);
      c.set(hx + 3, hy - 1, hair);
      c.set(hx + 5, hy - 1, hair);
      c.rect(hx + 6, hy + 2, 1, 3, hair);
      break;
    case 'buzz':
      c.rect(hx, hy, 7, 1, hair);
      c.rect(hx, hy + 1, 1, 1, hair);
      c.rect(hx + 6, hy + 1, 1, 1, hair);
      break;
    case 'bandana':
      c.rect(hx, hy, 7, 2, 0xdfe3e8);
      c.set(hx + 7, hy + 1, 0xdfe3e8); // knot
      break;
  }
  // Face.
  if (dir === 's') {
    c.set(hx + 2, hy + 3, OUTLINE);
    c.set(hx + 5, hy + 3, OUTLINE);
  } else if (dir === 'e') {
    c.set(hx + 5, hy + 3, OUTLINE);
    c.rect(hx + 6, hy + 4, 1, 1, char.skin); // nose hint
  }
}

function drawPortrait(char) {
  const c = new Canvas(32, 32);
  const kit = KITS[char.kit];
  // Shoulders.
  c.rect(6, 25, 20, 7, kit.shirt);
  c.rect(6, 25, 3, 7, kit.shade);
  // Neck + head.
  c.rect(14, 22, 4, 3, char.skin);
  c.rect(9, 8, 14, 14, char.skin);
  const hair = char.hair;
  switch (char.style) {
    case 'crop':
      c.rect(8, 5, 16, 5, hair);
      c.rect(8, 10, 2, 4, hair);
      c.rect(22, 10, 2, 4, hair);
      break;
    case 'spiky':
      c.rect(8, 6, 16, 4, hair);
      c.set(10, 4, hair);
      c.set(14, 3, hair);
      c.set(18, 4, hair);
      c.set(21, 5, hair);
      c.rect(22, 10, 2, 6, hair);
      break;
    case 'buzz':
      c.rect(8, 6, 16, 3, hair);
      c.rect(8, 9, 1, 3, hair);
      c.rect(23, 9, 1, 3, hair);
      break;
    case 'bandana':
      c.rect(8, 5, 16, 5, 0xdfe3e8);
      c.rect(24, 7, 2, 2, 0xdfe3e8);
      c.rect(8, 5, 16, 2, 0x8d939c);
      break;
  }
  // Eyes, brows, mouth.
  c.rect(12, 14, 2, 2, OUTLINE);
  c.rect(19, 14, 2, 2, OUTLINE);
  c.rect(12, 12, 3, 1, hair === 0xdfe3e8 ? 0x4a4440 : hair);
  c.rect(18, 12, 3, 1, hair === 0xdfe3e8 ? 0x4a4440 : hair);
  c.rect(14, 19, 4, 1, 0xa06a4a);
  c.outline(OUTLINE);
  return c;
}

// ---------- build sheets ----------
const POSES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'kick0', 'kick1', 'slide', 'stumble'];
const DIRS = ['s', 'e', 'n'];
const outDir = join(process.cwd(), 'public', 'assets', 'sprites');
const previewDir = join(process.cwd(), 'assets-src', 'preview');
mkdirSync(outDir, { recursive: true });
mkdirSync(previewDir, { recursive: true });

const previewAll = new Canvas(24 * POSES.length, 24 * DIRS.length * CHARACTERS.length);

for (const [ci, char] of CHARACTERS.entries()) {
  const sheet = new Canvas(24 * POSES.length, 24 * DIRS.length);
  for (const [row, dir] of DIRS.entries()) {
    for (const [col, pose] of POSES.entries()) {
      const frame = drawFrame(char, dir, pose);
      sheet.blit(frame, col * 24, row * 24);
      previewAll.blit(frame, col * 24, (ci * DIRS.length + row) * 24);
    }
  }
  writeFileSync(join(outDir, `char_${char.id}.png`), encodePng(sheet.w, sheet.h, sheet.data));
  const portrait = drawPortrait(char);
  writeFileSync(join(outDir, `portrait_${char.id}.png`), encodePng(portrait.w, portrait.h, portrait.data));
}

// Human-inspection preview at 4×.
const up = previewAll.upscale(4);
writeFileSync(join(previewDir, 'characters-preview.png'), encodePng(up.w, up.h, up.data));

console.log(`Generated ${CHARACTERS.length} character sheets + portraits → ${outDir}`);
