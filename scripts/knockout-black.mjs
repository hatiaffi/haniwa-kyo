/**
 * Near-black plate knockout via edge flood-fill → transparent PNG
 * Usage: node scripts/knockout-black.mjs <in.png> [out.png]
 *        node scripts/knockout-black.mjs --glob "assets/resident-dig-*.png"
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");

/** Max channel below this = plate candidate (ignores tiny RGB imbalance "sat") */
const HARD = 28;
const SOFT = 48;

function isHardBlack(r, g, b) {
  return Math.max(r, g, b) <= HARD;
}

function isSoftBlack(r, g, b) {
  const max = Math.max(r, g, b);
  if (max <= HARD) return true; // tiny RGB imbalance can look "saturated"
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return max <= SOFT && sat < 0.45;
}

async function knockoutBlack(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`expected RGBA, got ${channels}`);

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
      // soft fringe: fade by max channel
      const max = Math.max(r, g, b);
      const a = Math.max(0, Math.min(255, Math.floor(((max - HARD) / (SOFT - HARD)) * 255)));
      data[o + 3] = Math.min(data[o + 3], a);
    }

    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(output);
  console.log(`ok ${width}x${height} -> ${path.relative(root, output)}`);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error(
    'usage: node scripts/knockout-black.mjs <in.png> [out.png]\n' +
      '       node scripts/knockout-black.mjs --glob "assets/resident-dig-*.png"'
  );
  process.exit(1);
}

if (args[0] === "--glob") {
  const pattern = args[1] || "assets/resident-dig-*.png";
  const dir = path.resolve(root, path.dirname(pattern));
  const re = new RegExp(
    "^" +
      path
        .basename(pattern)
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*") +
      "$",
    "i"
  );
  const files = readdirSync(dir)
    .filter((n) => re.test(n))
    .map((n) => path.join(dir, n));
  for (const file of files) {
    await knockoutBlack(file, file);
  }
} else {
  const input = path.resolve(args[0]);
  const output = path.resolve(args[1] || args[0]);
  await knockoutBlack(input, output);
}
