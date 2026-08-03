/**
 * この丘での発掘記録（localStorage）
 * key: haniwaKyo.okaExcavation.v1
 */
import {
  DIG_NORMAL,
  DIG_SECRETS,
  SECRET_TOTAL_RATE,
  ZUKAN_BY_ID,
} from "./residents.mjs";

export const STORAGE_KEY = "haniwaKyo.okaExcavation.v1";
export const UPRIGHT_NEED = 5;
/** 掘れる回数の上限（きょうのもらいぶん＋ストック＋かけら補充） */
export const DIG_STOCK_CAP = 3;
/** かけら → 掘れる回数 +1 */
export const FLUFF_COST_STOCK = 5;
/** かけら → 未所持が出やすい掘り（＋掘れる回数 1） */
export const FLUFF_COST_SOFT_PITY = 10;
/** 未所持寄り抽選の重み（ソフトな寄り。保証ではない） */
export const SOFT_PITY_UNOWNED_WEIGHT = 0.78;
/** 生涯かけら獲得 N 個ごとに背景の土盛り +1 */
export const MOUND_FLUFF_PER = 3;
export const MOUND_MAX = 10;

const emptyDaily = (date) => ({
  date,
  uprightPresses: 0,
  granted: false,
});

export function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampStock(n) {
  return Math.max(0, Math.min(DIG_STOCK_CAP, Math.floor(Number(n) || 0)));
}

function digPoolEntries() {
  return [
    ...DIG_NORMAL.map((r) => ({ id: r.id, rarity: "normal" })),
    ...DIG_SECRETS.map((r) => ({ id: r.id, rarity: "secret" })),
  ];
}

/**
 * 旧スキーマ（daily.dug）／日跨ぎから digStock を推定。
 * 新スキーマでは未使用分はすでに digStock に入っているので、日跨ぎで二重加算しない。
 */
function migrateStockFromLegacy(raw, today) {
  const daily = raw.daily && typeof raw.daily === "object" ? raw.daily : null;
  const dug = Boolean(daily?.dug);
  const presses = Math.max(0, Math.floor(Number(daily?.uprightPresses) || 0));
  const sameDay = daily?.date === today;
  const hasStock = typeof raw.digStock === "number";

  if (hasStock) {
    const stock = clampStock(raw.digStock);
    if (sameDay) {
      // granted 未反映でも、あとの grantDailyIfReady が直立済みなら付与する
      return { digStock: stock, granted: Boolean(daily?.granted) || dug };
    }
    // 日跨ぎ: ストックはそのまま持ち越し。granted はリセット。
    return { digStock: stock, granted: false };
  }

  // digStock 未定義（完全な旧データ）
  if (!daily) {
    return { digStock: 0, granted: false };
  }
  if (sameDay) {
    if (dug) return { digStock: 0, granted: true };
    if (presses >= UPRIGHT_NEED) return { digStock: 1, granted: true };
    return { digStock: 0, granted: false };
  }
  // 別日の旧データ: 未使用のきょうの発掘 → ストックへ持ち越し
  if (!dug && presses >= UPRIGHT_NEED) {
    return { digStock: 1, granted: false };
  }
  return { digStock: 0, granted: false };
}

function normalize(raw) {
  const date = localDateKey();
  const base = {
    label: "この丘での発掘記録",
    unlockedIds: [],
    fluffCount: 0,
    fluffEarnedLifetime: 0,
    digStock: 0,
    daily: emptyDaily(date),
    lastUnlock: null,
  };
  if (!raw || typeof raw !== "object") return base;

  const unlockedIds = Array.isArray(raw.unlockedIds)
    ? [...new Set(raw.unlockedIds.filter((id) => typeof id === "string"))]
    : [];
  const fluffCount =
    typeof raw.fluffCount === "number" && raw.fluffCount >= 0
      ? Math.floor(raw.fluffCount)
      : 0;
  const fluffEarnedLifetime =
    typeof raw.fluffEarnedLifetime === "number" && raw.fluffEarnedLifetime >= 0
      ? Math.floor(raw.fluffEarnedLifetime)
      : fluffCount;

  const { digStock: migratedStock, granted: migratedGranted } =
    migrateStockFromLegacy(raw, date);

  let daily = emptyDaily(date);
  if (raw.daily && typeof raw.daily === "object" && raw.daily.date === date) {
    daily = {
      date,
      uprightPresses: Math.max(
        0,
        Math.min(99, Math.floor(Number(raw.daily.uprightPresses) || 0))
      ),
      granted: migratedGranted,
    };
  } else {
    daily = emptyDaily(date);
    daily.granted = false;
  }

  let lastUnlock = null;
  if (raw.lastUnlock && typeof raw.lastUnlock.id === "string") {
    lastUnlock = {
      id: raw.lastUnlock.id,
      at: typeof raw.lastUnlock.at === "string" ? raw.lastUnlock.at : null,
    };
  }

  const next = {
    label: "この丘での発掘記録",
    unlockedIds,
    fluffCount,
    fluffEarnedLifetime,
    digStock: migratedStock,
    daily,
    lastUnlock,
  };
  grantDailyIfReady(next);
  return next;
}

export function loadExcavation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalize(null);
    return normalize(JSON.parse(raw));
  } catch {
    return normalize(null);
  }
}

export function saveExcavation(state) {
  const next = normalize(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

export function moundCountFromLifetime(lifetime = 0) {
  const n = Math.max(0, Math.floor(Number(lifetime) || 0));
  return Math.min(MOUND_MAX, Math.floor(n / MOUND_FLUFF_PER));
}

/**
 * 直立達成で、きょうの無料発掘をストックへ（1日1回・cap 内）
 */
function grantDailyIfReady(s) {
  if (s.daily.granted) return s;
  if (s.daily.uprightPresses < UPRIGHT_NEED) return s;
  s.daily.granted = true;
  s.digStock = clampStock(s.digStock + 1);
  return s;
}

export function canDig(state = loadExcavation()) {
  return normalize(state).digStock >= 1;
}

export function recordUprightPress(state = loadExcavation()) {
  const s = normalize(state);
  s.daily.uprightPresses = Math.min(99, s.daily.uprightPresses + 1);
  grantDailyIfReady(s);
  return saveExcavation(s);
}

export function isUnlocked(id, state = loadExcavation()) {
  return normalize(state).unlockedIds.includes(id);
}

/**
 * スピン等で図鑑解放（新規のみ true）
 */
export function unlockResident(id, state = loadExcavation()) {
  const s = normalize(state);
  if (!ZUKAN_BY_ID[id]) return { state: s, newlyUnlocked: false };
  if (s.unlockedIds.includes(id)) {
    return { state: s, newlyUnlocked: false };
  }
  s.unlockedIds.push(id);
  s.lastUnlock = { id, at: new Date().toISOString() };
  return { state: saveExcavation(s), newlyUnlocked: true };
}

/**
 * 図鑑全解放（通常＋シークレット＋むげん）。fluffCount は触らない。
 * テスト用 URL（?test=1&zukan=1 / #zukan-test）向け。
 */
export function unlockAllZukan(state = loadExcavation()) {
  const s = normalize(state);
  const allIds = Object.keys(ZUKAN_BY_ID);
  const before = new Set(s.unlockedIds);
  s.unlockedIds = allIds;
  const newly = allIds.filter((id) => !before.has(id));
  if (newly.length) {
    s.lastUnlock = {
      id: newly[newly.length - 1],
      at: new Date().toISOString(),
    };
  }
  return { state: saveExcavation(s), newlyUnlocked: newly.length > 0 };
}

/**
 * ガチャ抽選（むげんは対象外）
 * @returns {{ id: string, rarity: "normal"|"secret" }}
 */
export function rollDig(rng = Math.random) {
  const roll = rng();
  if (roll < SECRET_TOTAL_RATE) {
    let cursor = 0;
    const secretRoll = rng() * SECRET_TOTAL_RATE;
    for (const secret of DIG_SECRETS) {
      cursor += secret.rate;
      if (secretRoll < cursor) {
        return { id: secret.id, rarity: "secret" };
      }
    }
    return { id: DIG_SECRETS[DIG_SECRETS.length - 1].id, rarity: "secret" };
  }
  const pick = DIG_NORMAL[Math.floor(rng() * DIG_NORMAL.length)];
  return { id: pick.id, rarity: "normal" };
}

/**
 * 未所持寄り（ソフト）。未所持がなければ通常抽選。
 */
export function rollDigFavorUnowned(state = loadExcavation(), rng = Math.random) {
  const s = normalize(state);
  const owned = new Set(s.unlockedIds);
  const missing = digPoolEntries().filter((e) => !owned.has(e.id));
  if (!missing.length) return rollDig(rng);
  if (rng() < SOFT_PITY_UNOWNED_WEIGHT) {
    const pick = missing[Math.floor(rng() * missing.length)];
    return { id: pick.id, rarity: pick.rarity };
  }
  return rollDig(rng);
}

function applyDigOutcome(s, { id, rarity }) {
  const resident = ZUKAN_BY_ID[id];
  const already = s.unlockedIds.includes(id);

  let fluffGained = 0;
  if (already) {
    fluffGained = 1;
    s.fluffCount += 1;
    s.fluffEarnedLifetime += 1;
  } else {
    s.unlockedIds.push(id);
    s.lastUnlock = { id, at: new Date().toISOString() };
  }

  const next = saveExcavation(s);
  return {
    state: next,
    resident,
    rarity,
    duplicate: already,
    fluffGained,
  };
}

/**
 * 発掘を実行（ストック 1 消費）。stock がなければ null。
 * @param {{ favorUnowned?: boolean }} [opts]
 */
export function performDig(
  state = loadExcavation(),
  rng = Math.random,
  opts = {}
) {
  const s = normalize(state);
  if (s.digStock < 1) return null;

  s.digStock = clampStock(s.digStock - 1);
  const favorUnowned = Boolean(opts.favorUnowned);
  const rolled = favorUnowned ? rollDigFavorUnowned(s, rng) : rollDig(rng);
  return applyDigOutcome(s, rolled);
}

/**
 * かけら5 → 掘れる回数 +1（cap まで。自動では掘らない）
 */
export function spendFluffForStock(state = loadExcavation()) {
  const s = normalize(state);
  if (s.fluffCount < FLUFF_COST_STOCK) {
    return { ok: false, reason: "fluff", state: s };
  }
  if (s.digStock >= DIG_STOCK_CAP) {
    return { ok: false, reason: "cap", state: s };
  }
  s.fluffCount -= FLUFF_COST_STOCK;
  s.digStock = clampStock(s.digStock + 1);
  return { ok: true, reason: null, state: saveExcavation(s) };
}

/**
 * かけら10 + ストック1 → 未所持寄り発掘
 */
export function performSoftPityDig(state = loadExcavation(), rng = Math.random) {
  const s = normalize(state);
  if (s.fluffCount < FLUFF_COST_SOFT_PITY) return null;
  if (s.digStock < 1) return null;

  s.fluffCount -= FLUFF_COST_SOFT_PITY;
  s.digStock = clampStock(s.digStock - 1);
  const rolled = rollDigFavorUnowned(s, rng);
  const outcome = applyDigOutcome(s, rolled);
  return { ...outcome, softPity: true, fluffSpent: FLUFF_COST_SOFT_PITY };
}

export function progressSummary(state = loadExcavation()) {
  const s = normalize(state);
  const total = Object.keys(ZUKAN_BY_ID).length;
  const canBuyStock =
    s.fluffCount >= FLUFF_COST_STOCK && s.digStock < DIG_STOCK_CAP;
  const canSoftPity =
    s.fluffCount >= FLUFF_COST_SOFT_PITY && s.digStock >= 1;
  return {
    unlocked: s.unlockedIds.length,
    total,
    fluffCount: s.fluffCount,
    fluffEarnedLifetime: s.fluffEarnedLifetime,
    digStock: s.digStock,
    digStockCap: DIG_STOCK_CAP,
    uprightPresses: s.daily.uprightPresses,
    grantedToday: s.daily.granted,
    dugToday: s.daily.granted && s.digStock === 0,
    canDig: canDig(s),
    canBuyStock,
    canSoftPity,
    moundCount: moundCountFromLifetime(s.fluffEarnedLifetime),
    label: s.label,
  };
}
