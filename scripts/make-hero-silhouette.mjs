/**
 * Derive dig locked-card silhouette from the hero front haniwa.
 * Usage: node scripts/make-hero-silhouette.mjs
 */
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const input = path.join(root, "assets", "haniwa-front.png");
const outPng = path.join(root, "assets", "haniwa-silhouette.png");

const HARD = 28;
const SOFT = 48;
const FILL = [0x1a, 0x16, 0x13];

function isHardBlack(r, g, b) {
  return Math.max(r, g, b) <= HARD;
}

function isSoftBlack(r, g, b) {
  const max = Math.max(r, g, b);
  if (max <= HARD) return true;
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return max <= SOFT && sat < 0.45;
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const n = width * height;
const seen = new Uint8Array(n);
const q = new Int32Array(n);
let qh = 0;
let qt = 0;

const push = (x, y) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = y * width + x;
  if (seen[i]) return;
  const o = i * 4;
  if (!isSoftBlack(data[o], data[o + 1], data[o + 2])) return;
  seen[i] = 1;
  q[qt++] = i;
};

for (let x = 0; x < width; x++) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  push(0, y);
  push(width - 1, y);
}

while (qh < qt) {
  const i = q[qh++];
  const x = i % width;
  const y = (i / width) | 0;
  const o = i * 4;
  const r = data[o];
  const g = data[o + 1];
  const b = data[o + 2];

  if (isHardBlack(r, g, b)) {
    data[o + 3] = 0;
  } else {
    const max = Math.max(r, g, b);
    const a = Math.max(
      0,
      Math.min(255, Math.floor(((max - HARD) / (SOFT - HARD)) * 255))
    );
    data[o + 3] = Math.min(data[o + 3], a);
  }

  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

for (let i = 0; i < n; i++) {
  const o = i * 4;
  const a = data[o + 3];
  if (a === 0) continue;
  data[o] = FILL[0];
  data[o + 1] = FILL[1];
  data[o + 2] = FILL[2];
  if (a > 40) data[o + 3] = 255;
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 8 })
  .resize(320, 320, { fit: "inside", withoutEnlargement: false })
  .png()
  .toFile(outPng);

const meta = await sharp(outPng).metadata();
console.log(`ok ${path.relative(root, outPng)} ${meta.width}x${meta.height}`);
