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
  { id: 'kairo', skin: 0xdcab7f, hair: 0x2c2440, style: 'spiky', kit: 'volt', build: 'avg' },
  { id: 'nadia', skin: 0xb98d63, hair: 0xf2c14e, style: 'wrap', kit: 'spice', build: 'slim' },
  { id: 'seppi', skin: 0xd8a273, hair: 0x6b4a2f, style: 'crop', kit: 'market', build: 'big' },
  { id: 'spice_a', skin: 0xc59a70, hair: 0x241f2b, style: 'crop', kit: 'spice', build: 'avg' },
  { id: 'spice_b', skin: 0xe0a878, hair: 0x3a352f, style: 'buzz', kit: 'spice', build: 'slim' },
  { id: 'oldkid_a', skin: 0xc59a70, hair: 0x3a352f, style: 'crop', kit: 'oldkids', build: 'big' },
  { id: 'oldkid_b', skin: 0xd8a273, hair: 0x241f2b, style: 'buzz', kit: 'oldkids', build: 'avg' },
  { id: 'ivy', skin: 0xd8a273, hair: 0x8a4a2c, style: 'long', kit: 'saints', build: 'slim' },
  { id: 'prior', skin: 0xcaa27c, hair: 0xcfcfd4, style: 'buzz', kit: 'saints', build: 'big' },
  { id: 'saint_a', skin: 0xe0a878, hair: 0x4a4440, style: 'crop', kit: 'saints', build: 'avg' },
  { id: 'alder', skin: 0xd9a67e, hair: 0x6e5a3a, style: 'hood', kit: 'cloth', build: 'avg' },
];

const KITS = {
  crew: { shirt: 0x2e9e8f, shade: 0x1d6b60, shorts: 0x24333d, socks: 0xd9d3c0, boots: 0x3a3f47 },
  gulls: { shirt: 0xc2643a, shade: 0x8a4527, shorts: 0x3a3230, socks: 0xcbbfa4, boots: 0x2f2b28 },
  coach: { shirt: 0x3f4652, shade: 0x2b303a, shorts: 0x2b303a, socks: 0x8a8f98, boots: 0x241f2b },
  kid: { shirt: 0xf2c14e, shade: 0xc29433, shorts: 0x24333d, socks: 0xd9d3c0, boots: 0x3a3f47 },
  volt: { shirt: 0x5a4fcf, shade: 0x3d3591, shorts: 0x241f2b, socks: 0xe8e3d0, boots: 0x241f2b },
  oldkids: { shirt: 0x6e7681, shade: 0x4c525b, shorts: 0x3a3f47, socks: 0xb9b3a4, boots: 0x2f2b28 },
  spice: { shirt: 0xb03535, shade: 0x7c2424, shorts: 0x241f2b, socks: 0xf2c14e, boots: 0x2f2b28 },
  market: { shirt: 0x8a6a3a, shade: 0x5e4826, shorts: 0x3a3f47, socks: 0xcbbfa4, boots: 0x2f2b28 },
  saints: { shirt: 0x6e7a5a, shade: 0x4c563d, shorts: 0x4a4f58, socks: 0xd9cbaa, boots: 0x2f2b28 },
  cloth: { shirt: 0x6e5a3a, shade: 0x4c3f28, shorts: 0x6e5a3a, socks: 0x4c3f28, boots: 0x2f2b28 },
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
 * v2 rig: chibi proportions (8px head), visible faces, arm swing, kick anticipation.
 */
function drawFrame(char, dir, pose) {
  const c = new Canvas(24, 24);
  const kit = KITS[char.kit];
  const wide = char.build === 'big' ? 1 : 0;
  const slim = char.build === 'slim' ? 1 : 0;
  const cx = 12;

  let bob = 0;
  let legL = 0;
  let legR = 0;
  let lean = 0;
  let armL = 0;
  let armR = 0;
  if (pose === 'idle1') bob = 1;
  if (pose.startsWith('run')) {
    const r = RUN[Number(pose[3])];
    bob = r.bob;
    legL = r.l;
    legR = r.r;
    armL = r.armL;
    armR = r.armR;
  }
  if (pose === 'kick0') lean = dir === 'e' ? -1 : 0;
  if (pose === 'kick1') lean = 1;
  if (pose === 'stumble') {
    lean = 1;
    bob = 2;
  }

  const groundY = 21;
  const legH = 4;
  const shortsH = 2;
  const torsoH = 4;
  const bodyTop = groundY - legH - shortsH - torsoH + bob; // 11 + bob
  const bodyW = 7 + wide * 2 - slim;
  const bx = cx - Math.floor(bodyW / 2) + lean;

  if (pose === 'slide') {
    c.rect(cx - 5, groundY - 4, 10, 3, kit.shirt);
    c.rect(cx - 5, groundY - 2, 3, 1, kit.shade);
    c.rect(cx - 1, groundY - 1, 4, 1, kit.shorts);
    c.rect(cx + 3, groundY - 1, 4, 1, kit.socks);
    c.rect(cx + 7, groundY - 1, 2, 1, kit.boots);
    drawHead(c, char, dir, cx - 8, groundY - 11);
    c.outline(OUTLINE);
    return c;
  }

  // Legs.
  const legW = 2;
  const legGap = char.build === 'big' ? 3 : 2;
  const lx = cx - legGap + lean;
  const rx = cx + legGap - legW + lean;
  if (pose === 'kick1' && dir !== 'n') {
    const kx = cx + 3;
    c.rect(lx, groundY - legH, legW, legH, kit.socks);
    c.rect(lx, groundY - 1, legW, 2, kit.boots);
    c.rect(kx, groundY - legH - 1, 3, 2, kit.socks);
    c.rect(kx + 3, groundY - legH - 1, 2, 2, kit.boots);
  } else if (pose === 'kick0' && dir !== 'n') {
    // Anticipation: kicking leg drawn back.
    c.rect(lx, groundY - legH, legW, legH, kit.socks);
    c.rect(lx, groundY - 1, legW, 2, kit.boots);
    c.rect(cx - 5, groundY - 2, 2, 2, kit.socks);
    c.rect(cx - 7, groundY - 2, 2, 2, kit.boots);
  } else {
    c.rect(lx, groundY - legH - legL, legW, legH + legL, kit.socks);
    c.rect(rx, groundY - legH - legR, legW, legH + legR, kit.socks);
    // Sock stripe in the kit colour — the football-kit tell.
    c.rect(lx, groundY - legH - legL, legW, 1, kit.shirt);
    c.rect(rx, groundY - legH - legR, legW, 1, kit.shirt);
    c.rect(lx, groundY - 1 - legL, legW, 2, kit.boots);
    c.rect(rx, groundY - 1 - legR, legW, 2, kit.boots);
  }

  // Shorts with side trim.
  c.rect(bx, groundY - legH - shortsH, bodyW, shortsH, kit.shorts);
  c.rect(bx, groundY - legH - shortsH, 1, shortsH, lite(kit.shorts));
  c.rect(bx + bodyW - 1, groundY - legH - shortsH, 1, shortsH, shade(kit.shorts));

  // Torso: lit top row, shaded right + underside, collar, crest.
  c.rect(bx, bodyTop, bodyW, torsoH, kit.shirt);
  c.rect(bx + bodyW - 2, bodyTop, 2, torsoH, kit.shade);
  c.rect(bx, bodyTop + torsoH - 1, bodyW, 1, kit.shade);
  c.rect(bx, bodyTop, bodyW - 2, 1, lite(kit.shirt));
  if (dir === 's') {
    c.rect(bx + Math.floor(bodyW / 2) - 1, bodyTop, 2, 1, kit.shade); // collar
    if (char.kit === 'crew') c.set(bx + 1, bodyTop + 1, 0xf2c14e); // crest
  }

  // Arms (skin, swinging on runs).
  const armH = 3;
  if (dir === 'e') {
    const swing = pose.startsWith('run') ? armL : 0;
    c.rect(bx + bodyW - 1, bodyTop + 1 + swing, 1, armH, char.skin);
  } else {
    c.rect(bx - 1, bodyTop + 1 + armL, 1, armH, char.skin);
    c.rect(bx + bodyW, bodyTop + 1 + armR, 1, armH, char.skin);
  }

  // Head — 8 wide, 8 tall, chibi.
  drawHead(c, char, dir, cx - 4 + lean, bodyTop - 8);

  c.outline(OUTLINE);
  return c;
}

function drawHead(c, char, dir, hx, hy) {
  const skinShade = shade(char.skin);
  // Face block: rows hy+2..hy+7 (6 rows), 8 wide.
  c.rect(hx, hy + 2, 8, 6, char.skin);
  c.rect(hx + 6, hy + 3, 2, 5, skinShade);
  c.rect(hx, hy + 7, 8, 1, skinShade); // jaw shadow
  const hair = char.hair;
  if (dir === 'n') {
    c.rect(hx, hy, 8, 6, hair);
    c.rect(hx, hy, 6, 1, lite(hair)); // crown catches the light
    c.rect(hx, hy + 5, 8, 1, shade(hair));
    c.rect(hx, hy + 6, 1, 1, hair);
    c.rect(hx + 7, hy + 6, 1, 1, hair);
    if (char.style === 'bandana') {
      c.rect(hx, hy + 4, 8, 1, 0xdfe3e8);
      c.rect(hx, hy, 8, 4, 0x8d939c);
      c.rect(hx, hy, 6, 1, 0xa8aeb8);
    }
    if (char.style === 'wrap') {
      c.rect(hx, hy, 8, 4, hair);
      c.rect(hx, hy, 6, 1, lite(hair));
      c.rect(hx + 3, hy + 4, 2, 2, shade(hair)); // knot at the back
    }
    if (char.style === 'long') {
      c.rect(hx, hy, 8, 7, hair); // full fall of hair from behind
      c.rect(hx, hy, 6, 1, lite(hair));
      c.rect(hx, hy + 6, 8, 1, shade(hair));
    }
    if (char.style === 'hood') {
      c.rect(hx - 1, hy, 10, 7, hair); // cowl covers everything
      c.rect(hx - 1, hy, 8, 1, lite(hair));
      c.rect(hx - 1, hy + 6, 10, 1, shade(hair));
    }
    return;
  }
  switch (char.style) {
    case 'crop':
      c.rect(hx, hy, 8, 2, hair);
      c.rect(hx, hy, 6, 1, lite(hair));
      c.rect(hx, hy + 2, 1, 2, hair);
      c.rect(hx + 7, hy + 2, 1, 2, hair);
      c.rect(hx + 1, hy + 2, 6, 1, skinShade); // hairline shadow
      break;
    case 'spiky':
      c.rect(hx, hy, 8, 2, hair);
      c.rect(hx, hy, 5, 1, lite(hair));
      c.set(hx + 1, hy - 1, hair);
      c.set(hx + 4, hy - 1, lite(hair));
      c.set(hx + 6, hy - 1, hair);
      c.rect(hx + 7, hy + 2, 1, 3, hair);
      c.rect(hx + 1, hy + 2, 6, 1, skinShade);
      break;
    case 'buzz':
      c.rect(hx, hy + 1, 8, 1, hair);
      c.rect(hx, hy + 1, 5, 1, lite(hair));
      c.set(hx, hy + 2, hair);
      c.set(hx + 7, hy + 2, hair);
      break;
    case 'bandana':
      c.rect(hx, hy, 8, 2, 0xdfe3e8);
      c.set(hx + 8, hy + 1, 0xdfe3e8);
      c.rect(hx, hy, 8, 1, 0x8d939c);
      c.rect(hx + 1, hy + 2, 6, 1, skinShade);
      break;
    case 'wrap':
      c.rect(hx, hy, 8, 3, hair);
      c.rect(hx, hy, 6, 1, lite(hair));
      c.set(hx - 1, hy + 1, hair);
      c.set(hx - 1, hy + 2, shade(hair));
      c.rect(hx + 1, hy + 3, 6, 1, skinShade);
      break;
    case 'long':
      c.rect(hx, hy, 8, 2, hair);
      c.rect(hx, hy, 6, 1, lite(hair));
      c.rect(hx, hy + 2, 1, 5, hair); // falls past the jaw both sides
      c.rect(hx + 7, hy + 2, 1, 5, hair);
      c.rect(hx + 1, hy + 2, 6, 1, skinShade);
      break;
    case 'hood':
      c.rect(hx - 1, hy - 1, 10, 3, hair); // cowl overhangs the brow
      c.rect(hx - 1, hy - 1, 8, 1, lite(hair));
      c.rect(hx - 1, hy + 2, 1, 5, hair);
      c.rect(hx + 8, hy + 2, 1, 5, hair);
      c.rect(hx, hy + 2, 8, 1, shade(hair)); // cowl shadow on the face
      break;
  }
  if (dir === 's') {
    c.set(hx + 2, hy + 4, OUTLINE);
    c.set(hx + 5, hy + 4, OUTLINE);
  } else {
    c.set(hx + 5, hy + 4, OUTLINE);
    c.set(hx + 7, hy + 5, char.skin); // nose
  }
}

function shade(hex) {
  const r = Math.max(0, ((hex >> 16) & 0xff) - 38);
  const g = Math.max(0, ((hex >> 8) & 0xff) - 34);
  const b = Math.max(0, (hex & 0xff) - 26);
  return (r << 16) | (g << 8) | b;
}

function lite(hex) {
  const r = Math.min(255, ((hex >> 16) & 0xff) + 34);
  const g = Math.min(255, ((hex >> 8) & 0xff) + 30);
  const b = Math.min(255, (hex & 0xff) + 24);
  return (r << 16) | (g << 8) | b;
}

function drawPortrait(char) {
  const c = new Canvas(32, 32);
  const kit = KITS[char.kit];
  const skinShade = shade(char.skin);
  // Shoulders with collar trim.
  c.rect(6, 25, 20, 7, kit.shirt);
  c.rect(6, 25, 3, 7, kit.shade);
  c.rect(22, 25, 4, 7, kit.shade);
  c.rect(9, 25, 13, 1, lite(kit.shirt));
  // Neck + head, shaded on the right.
  c.rect(14, 22, 4, 3, char.skin);
  c.rect(14, 22, 4, 1, skinShade); // chin shadow on the neck
  c.rect(9, 8, 14, 14, char.skin);
  c.rect(21, 9, 2, 13, skinShade);
  const hair = char.hair;
  switch (char.style) {
    case 'crop':
      c.rect(8, 5, 16, 5, hair);
      c.rect(9, 5, 13, 1, lite(hair));
      c.rect(8, 10, 2, 4, hair);
      c.rect(22, 10, 2, 4, hair);
      c.rect(10, 10, 12, 1, skinShade); // hairline shadow
      break;
    case 'spiky':
      c.rect(8, 6, 16, 4, hair);
      c.rect(9, 6, 12, 1, lite(hair));
      c.set(10, 4, hair);
      c.set(14, 3, lite(hair));
      c.set(18, 4, hair);
      c.set(21, 5, hair);
      c.rect(22, 10, 2, 6, hair);
      c.rect(10, 10, 11, 1, skinShade);
      break;
    case 'buzz':
      c.rect(8, 6, 16, 3, hair);
      c.rect(9, 6, 12, 1, lite(hair));
      c.rect(8, 9, 1, 3, hair);
      c.rect(23, 9, 1, 3, hair);
      break;
    case 'bandana':
      c.rect(8, 5, 16, 5, 0xdfe3e8);
      c.rect(24, 7, 2, 2, 0xdfe3e8);
      c.rect(8, 5, 16, 2, 0x8d939c);
      c.rect(9, 5, 13, 1, 0xa8aeb8);
      c.rect(10, 10, 12, 1, skinShade);
      break;
    case 'wrap':
      // Head wrap with a side knot and an earring — Nadia's whole look.
      c.rect(8, 4, 16, 7, hair);
      c.rect(9, 4, 13, 1, lite(hair));
      c.rect(8, 9, 16, 1, shade(hair));
      c.rect(6, 7, 2, 4, hair); // knot
      c.set(6, 11, shade(hair));
      c.rect(10, 11, 12, 1, skinShade);
      c.set(23, 20, 0xf2c14e); // earring
      break;
    case 'long':
      // Hair falls past the shoulders on both sides.
      c.rect(8, 5, 16, 5, hair);
      c.rect(9, 5, 13, 1, lite(hair));
      c.rect(7, 9, 3, 16, hair);
      c.rect(22, 9, 3, 16, hair);
      c.rect(7, 23, 3, 2, shade(hair));
      c.rect(22, 23, 3, 2, shade(hair));
      c.rect(10, 10, 12, 1, skinShade);
      break;
    case 'hood':
      // A keeper's cowl, face half in its shadow.
      c.rect(6, 3, 20, 8, hair);
      c.rect(7, 3, 17, 1, lite(hair));
      c.rect(6, 9, 2, 15, hair);
      c.rect(24, 9, 2, 15, hair);
      c.rect(8, 10, 16, 2, shade(hair));
      c.rect(9, 12, 14, 1, skinShade);
      break;
  }
  // Eyes with a glint, brows, mouth.
  c.rect(12, 14, 2, 2, OUTLINE);
  c.rect(19, 14, 2, 2, OUTLINE);
  c.set(12, 14, 0x8a94a2);
  c.set(19, 14, 0x8a94a2);
  const brow = hair === 0xdfe3e8 || hair === 0xcfcfd4 ? 0x4a4440 : shade(hair);
  c.rect(12, 12, 3, 1, brow);
  c.rect(18, 12, 3, 1, brow);
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
