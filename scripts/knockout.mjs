/**
 * White-background knockout → transparent PNG
 * Usage: node scripts/knockout.mjs <in> <out>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import { CRC32 } from "./crc32.mjs";

// Minimal PNG decode/encode for RGBA8
function readPNG(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(sig)) {
    throw new Error("not png");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bit = data[8];
      const color = data[9];
      if (bit !== 8 || (color !== 2 && color !== 6)) {
        throw new Error(`unsupported png format bit=${bit} color=${color}`);
      }
      var hasAlpha = color === 6;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
    offset += 12 + len;
  }
  const inflated = inflateSync(Buffer.concat(idat));
  const channels = hasAlpha ? 4 : 3;
  const stride = width * channels;
  const rgba = Buffer.alloc(width * height * 4);
  let ip = 0;
  let op = 0;
  const prev = Buffer.alloc(stride);
  const row = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[ip++];
    inflated.copy(row, 0, ip, ip + stride);
    ip += stride;
    if (filter === 1) {
      for (let i = channels; i < stride; i++) row[i] = (row[i] + row[i - channels]) & 255;
    } else if (filter === 2) {
      for (let i = 0; i < stride; i++) row[i] = (row[i] + prev[i]) & 255;
    } else if (filter === 3) {
      for (let i = 0; i < stride; i++) {
        const a = i >= channels ? row[i - channels] : 0;
        row[i] = (row[i] + ((a + prev[i]) >> 1)) & 255;
      }
    } else if (filter === 4) {
      for (let i = 0; i < stride; i++) {
        const a = i >= channels ? row[i - channels] : 0;
        const b = prev[i];
        const c = i >= channels ? prev[i - channels] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        row[i] = (row[i] + pr) & 255;
      }
    } else if (filter !== 0) {
      throw new Error(`bad filter ${filter}`);
    }
    for (let x = 0; x < width; x++) {
      const si = x * channels;
      rgba[op++] = row[si];
      rgba[op++] = row[si + 1];
      rgba[op++] = row[si + 2];
      rgba[op++] = hasAlpha ? row[si + 3] : 255;
    }
    row.copy(prev);
  }
  return { width, height, rgba };
}

function writePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    rgba.copy(raw, o, y * stride, y * stride + stride);
    o += stride;
  }
  const compressed = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const chunks = [chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))];
  return Buffer.concat([sig, ...chunks]);
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC32(crcBuf) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

function knockout(rgba, width, height) {
  const out = Buffer.from(rgba);
  const n = width * height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = out[o];
    const g = out[o + 1];
    const b = out[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = (r + g + b) / 3;
    // white / near-white paper
    if (lum > 232 && sat < 0.08) {
      out[o + 3] = 0;
      continue;
    }
    if (lum > 210 && sat < 0.06) {
      out[o + 3] = Math.min(out[o + 3], Math.floor(((245 - lum) / 35) * 255));
    }
    // soft fringe: bright desaturated near clay
    if (lum > 195 && sat < 0.14 && r > 180 && g > 170 && b > 160) {
      const a = Math.max(0, Math.min(255, Math.floor((220 - lum) * 6)));
      out[o + 3] = Math.min(out[o + 3], a);
    }
  }
  return out;
}

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("usage: node scripts/knockout.mjs <in.png> <out.png>");
  process.exit(1);
}
const { width, height, rgba } = readPNG(readFileSync(input));
const cut = knockout(rgba, width, height);
writeFileSync(output, writePNG(width, height, cut));
console.log(`ok ${width}x${height} -> ${output}`);
