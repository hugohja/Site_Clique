// Gera icon-192.png e icon-512.png sem dependências externas (PNG cru + zlib).
// Desenho: fundo café #16130f, anel âmbar (lente) e ponto coral (flash),
// espelhando public/icon.svg. Rode com: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BG = [0x16, 0x13, 0x0f];
const AMBER = [0xe8, 0xa3, 0x3d];
const CORAL = [0xd8, 0x54, 0x3a];

function crc32(buf) {
  let c,
    table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makeIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const ringOuter = size * 0.38;
  const ringInner = size * 0.295;
  const hub = size * 0.11;
  const flashX = size * 0.8;
  const flashY = size * 0.2;
  const flashR = size * 0.05;

  const raw = Buffer.alloc(size * (1 + size * 3));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filtro none por scanline
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const df = Math.hypot(x - flashX, y - flashY);
      let color = BG;
      if ((d <= ringOuter && d >= ringInner) || d <= hub) color = AMBER;
      else if (df <= flashR) color = CORAL;
      raw[offset++] = color[0];
      raw[offset++] = color[1];
      raw[offset++] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), makeIcon(size));
  console.log(`public/icon-${size}.png ok`);
}
