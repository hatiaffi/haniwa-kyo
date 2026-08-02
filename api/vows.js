import { Redis } from "@upstash/redis";
import { MSG, validateVow } from "../lib/vow-guard.mjs";
import { VOW_SEEDS } from "../lib/vows-seed.mjs";

const VOW_KEY = "haniwa:vows";
const VOW_MAX_STORE = 500;
const RATE_WINDOW_SEC = 60;
const RATE_HOURLY_MAX = 5;
const HOUR_SEC = 60 * 60;

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};

const clientIp = (req) => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ensureSeeded = async (redis) => {
  const len = await redis.llen(VOW_KEY);
  if (len > 0) return;
  if (VOW_SEEDS.length) {
    await redis.rpush(VOW_KEY, ...VOW_SEEDS);
  }
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const redis = getRedis();
  if (!redis) {
    json(res, 503, {
      ok: false,
      error: "unavailable",
      message: "ちかい倉庫の準備中だよ。すこししてからまた来てね。",
    });
    return;
  }

  try {
    if (req.method === "GET") {
      await ensureSeeded(redis);
      const limit = Math.min(80, Math.max(1, Number(req.query?.limit) || 40));
      const list = await redis.lrange(VOW_KEY, 0, 199);
      const vows = shuffle(
        (list || []).filter((t) => typeof t === "string" && t.trim())
      ).slice(0, limit);
      json(res, 200, { ok: true, vows });
      return;
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body || "{}");
        } catch (_) {
          body = {};
        }
      }
      body = body && typeof body === "object" ? body : {};

      const checked = validateVow(body.vow);
      if (!checked.ok) {
        json(res, 400, {
          ok: false,
          error: checked.error,
          message: checked.message,
        });
        return;
      }

      const ip = clientIp(req);
      const minuteKey = `haniwa:rl:m:${ip}`;
      const hourKey = `haniwa:rl:h:${ip}`;

      const minuteCount = await redis.incr(minuteKey);
      if (minuteCount === 1) await redis.expire(minuteKey, RATE_WINDOW_SEC);
      if (minuteCount > 1) {
        json(res, 429, { ok: false, error: "rate", message: MSG.rate });
        return;
      }

      const hourCount = await redis.incr(hourKey);
      if (hourCount === 1) await redis.expire(hourKey, HOUR_SEC);
      if (hourCount > RATE_HOURLY_MAX) {
        json(res, 429, { ok: false, error: "rate", message: MSG.rate });
        return;
      }

      await ensureSeeded(redis);
      await redis.lpush(VOW_KEY, checked.vow);
      await redis.ltrim(VOW_KEY, 0, VOW_MAX_STORE - 1);

      json(res, 201, { ok: true, vow: checked.vow });
      return;
    }

    json(res, 405, { ok: false, error: "method", message: "そのやり方では立てられないよ。" });
  } catch (err) {
    console.error("vows api error", err);
    json(res, 500, {
      ok: false,
      error: "server",
      message: "丘がすこし混乱してるみたい。あとでまた立ててね。",
    });
  }
}
