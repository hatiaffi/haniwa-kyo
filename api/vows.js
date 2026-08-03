import { Redis } from "@upstash/redis";
import { MSG, validateVow } from "../lib/vow-guard.mjs";
import { VOW_SEEDS } from "../lib/vows-seed.mjs";

const VOW_KEY = "haniwa:vows";
const VOW_SEED_LOCK = "haniwa:vows:seedlock";
const VOW_MAX_STORE = 500;
const RATE_WINDOW_SEC = 60;
const RATE_HOURLY_MAX = 5;
const HOUR_SEC = 60 * 60;
const DUP_LOOKBACK = 80;

const json = (res, status, body, cacheControl = "no-store") => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
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

const hostAllowed = (hostname) => {
  const h = String(hostname || "").toLowerCase();
  if (!h) return false;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h === "haniwa-kyo.vercel.app") return true;
  if (h.endsWith(".vercel.app") && h.includes("haniwa")) return true;
  if (h.endsWith(".github.io")) return true;
  return false;
};

const isAllowedPostOrigin = (req) => {
  const origin = String(req.headers.origin || "").trim();
  const hostHeader = String(req.headers.host || "").trim();
  const hostName = hostHeader.split(":")[0];

  if (origin) {
    try {
      return hostAllowed(new URL(origin).hostname);
    } catch (_) {
      return false;
    }
  }
  // Origin なし（同一オリジンや一部クライアント）は Host で判定
  return hostAllowed(hostName);
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

  // 同時リクエストでの二重シードを防ぐ
  const locked = await redis.set(VOW_SEED_LOCK, "1", { nx: true, ex: 30 });
  if (locked !== "OK" && locked !== true) return;

  const len2 = await redis.llen(VOW_KEY);
  if (len2 > 0) return;
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
      json(res, 200, { ok: true, vows }, "public, max-age=30");
      return;
    }

    if (req.method === "POST") {
      if (!isAllowedPostOrigin(req)) {
        json(res, 403, {
          ok: false,
          error: "forbidden",
          message: MSG.forbidden,
        });
        return;
      }

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

      // 失敗時に枠を消費しないよう、保存成功後にだけ加算する
      const minuteCount = Number((await redis.get(minuteKey)) || 0);
      if (minuteCount >= 1) {
        json(res, 429, { ok: false, error: "rate", message: MSG.rate });
        return;
      }
      const hourCount = Number((await redis.get(hourKey)) || 0);
      if (hourCount >= RATE_HOURLY_MAX) {
        json(res, 429, { ok: false, error: "rate", message: MSG.rate });
        return;
      }

      await ensureSeeded(redis);

      const recent = await redis.lrange(VOW_KEY, 0, DUP_LOOKBACK - 1);
      if ((recent || []).some((t) => t === checked.vow)) {
        json(res, 409, {
          ok: false,
          error: "duplicate",
          message: MSG.duplicate,
        });
        return;
      }

      await redis.lpush(VOW_KEY, checked.vow);
      await redis.ltrim(VOW_KEY, 0, VOW_MAX_STORE - 1);

      const minuteAfter = await redis.incr(minuteKey);
      if (minuteAfter === 1) await redis.expire(minuteKey, RATE_WINDOW_SEC);
      const hourAfter = await redis.incr(hourKey);
      if (hourAfter === 1) await redis.expire(hourKey, HOUR_SEC);

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
