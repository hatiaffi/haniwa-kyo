/**
 * PNG → webp / 320 / 512 variants
 * Usage: node scripts/make-resident-webp.mjs [glob...]
 * Default: assets/resident-dig-*.png
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const assets = path.join(root, "assets");

const args = process.argv.slice(2);
let files;
if (args.length) {
  files = args.map((f) => path.resolve(f));
} else {
  files = readdirSync(assets)
    .filter((n) => /^resident-dig-.*\.png$/i.test(n))
    .map((n) => path.join(assets, n));
}

if (!files.length) {
  console.error("no png files");
  process.exit(1);
}

for (const file of files) {
  const base = file.replace(/\.png$/i, "");
  const img = sharp(file).ensureAlpha();
  await img.clone().webp({ quality: 86 }).toFile(`${base}.webp`);
  await img
    .clone()
    .resize(512, 512, { fit: "inside" })
    .webp({ quality: 84 })
    .toFile(`${base}-512.webp`);
  await img
    .clone()
    .resize(320, 320, { fit: "inside" })
    .webp({ quality: 82 })
    .toFile(`${base}-320.webp`);
  console.log("ok", path.basename(file));
}
