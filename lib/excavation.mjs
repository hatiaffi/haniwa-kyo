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

const emptyDaily = (date) => ({
  date,
  uprightPresses: 0,
  dug: false,
});

export function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalize(raw) {
  const date = localDateKey();
  const base = {
    label: "この丘での発掘記録",
    unlockedIds: [],
    fluffCount: 0,
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

  let daily = emptyDaily(date);
  if (raw.daily && typeof raw.daily === "object" && raw.daily.date === date) {
    daily = {
      date,
      uprightPresses: Math.max(
        0,
        Math.min(99, Math.floor(Number(raw.daily.uprightPresses) || 0))
      ),
      dug: Boolean(raw.daily.dug),
    };
  }

  let lastUnlock = null;
  if (raw.lastUnlock && typeof raw.lastUnlock.id === "string") {
    lastUnlock = {
      id: raw.lastUnlock.id,
      at: typeof raw.lastUnlock.at === "string" ? raw.lastUnlock.at : null,
    };
  }

  return {
    label: "この丘での発掘記録",
    unlockedIds,
    fluffCount,
    daily,
    lastUnlock,
  };
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

export function canDig(state = loadExcavation()) {
  const s = normalize(state);
  return s.daily.uprightPresses >= UPRIGHT_NEED && !s.daily.dug;
}

export function recordUprightPress(state = loadExcavation()) {
  const s = normalize(state);
  s.daily.uprightPresses = Math.min(99, s.daily.uprightPresses + 1);
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
 * 1日1回の発掘を実行。already dug なら null。
 */
export function performDig(state = loadExcavation(), rng = Math.random) {
  const s = normalize(state);
  if (s.daily.uprightPresses < UPRIGHT_NEED || s.daily.dug) {
    return null;
  }

  const { id, rarity } = rollDig(rng);
  const resident = ZUKAN_BY_ID[id];
  const already = s.unlockedIds.includes(id);
  s.daily.dug = true;

  let fluffGained = 0;
  if (already) {
    fluffGained = 1;
    s.fluffCount += 1;
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

export function progressSummary(state = loadExcavation()) {
  const s = normalize(state);
  const total = Object.keys(ZUKAN_BY_ID).length;
  return {
    unlocked: s.unlockedIds.length,
    total,
    fluffCount: s.fluffCount,
    uprightPresses: s.daily.uprightPresses,
    dugToday: s.daily.dug,
    canDig: canDig(s),
    label: s.label,
  };
}
