// Generates the PWA / home-screen icons with no external dependencies.
// Draws a dark rounded tile with the InTruth hexagon glyph and encodes a PNG
// using only Node's built-in zlib. Run with: npm run build:icons
//
// (The PNG files are committed, so you only need this if you change the design.)

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const BG = [11, 11, 11];        // #0b0b0b
const ACCENT = [74, 222, 128];  // #4ade80 (green dot accent)
const STROKE = [232, 232, 232]; // #e8e8e8 hexagon

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// signed distance from point to segment
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function draw(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.30;            // hexagon radius
  const stroke = Math.max(2, size * 0.045);
  const corner = maskable ? size : size * 0.22; // maskable = full bleed square
  const dotR = size * 0.055;
  const dotX = cx + radius * 0.62, dotY = cy - radius * 0.72;

  // hexagon vertices (flat-top)
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    verts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // rounded-rect background mask
      const rx = Math.max(0, Math.abs(x - cx) - (cx - corner));
      const ry = Math.max(0, Math.abs(y - cy) - (cy - corner));
      const inside = Math.hypot(rx, ry) <= (maskable ? size : cx) ;
      let col = BG, alpha = 0;
      if (maskable || inside) { col = BG; alpha = 255; }

      // hexagon outline
      let minD = Infinity;
      for (let i = 0; i < 6; i++) {
        const [ax, ay] = verts[i];
        const [bx, by] = verts[(i + 1) % 6];
        minD = Math.min(minD, distToSeg(x, y, ax, ay, bx, by));
      }
      if (alpha > 0 && minD < stroke) col = STROKE;

      // accent dot
      if (alpha > 0 && Math.hypot(x - dotX, y - dotY) < dotR) col = ACCENT;

      rgba[idx] = col[0]; rgba[idx + 1] = col[1]; rgba[idx + 2] = col[2]; rgba[idx + 3] = alpha;
    }
  }
  return encodePNG(size, size, rgba);
}

const targets = [
  ['icon-180.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
];
for (const [name, size, maskable] of targets) {
  fs.writeFileSync(path.join(OUT, name), draw(size, maskable));
  console.log('wrote', name);
}
