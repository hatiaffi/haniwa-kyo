import {
  ZUKAN_SECTIONS,
  assetPaths,
  catalogLabel,
} from "./lib/residents.mjs";
import {
  DIG_STOCK_CAP,
  FLUFF_COST_SOFT_PITY,
  FLUFF_COST_STOCK,
  MOUND_MAX,
  UPRIGHT_NEED,
  canDig,
  loadExcavation,
  performDig,
  performSoftPityDig,
  progressSummary,
  saveExcavation,
  spendFluffForStock,
  unlockAllZukan,
} from "./lib/excavation.mjs";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const urlParams = new URLSearchParams(window.location.search);
const hostName = window.location.hostname;
// file:// は hostname 空。::1 もローカル扱い
const isLocalHost =
  hostName === "localhost" ||
  hostName === "127.0.0.1" ||
  hostName === "[::1]" ||
  hostName === "::1" ||
  hostName === "";
const testGateOk = isLocalHost || urlParams.get("key") === "mound";
// hash でも test 可（.html→clean URL で query が落ちる環境向け）
const hashTest = /(?:^|[&#])test\b/.test(window.location.hash);
const testMode = (urlParams.has("test") || hashTest) && testGateOk;
if (testMode) document.body.classList.add("is-test");

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const progress = document.getElementById("scroll-progress");
const header = document.getElementById("site-header");
const onScrollChrome = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const t = max > 0 ? window.scrollY / max : 0;
  if (progress) progress.style.width = `${Math.min(1, Math.max(0, t)) * 100}%`;
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};
window.addEventListener("scroll", onScrollChrome, { passive: true });
onScrollChrome();

const unlockedEl = document.getElementById("dig-unlocked");
const totalEl = document.getElementById("dig-total");
const fluffEl = document.getElementById("dig-fluff");
const stockEl = document.getElementById("dig-stock");
const stockCapEl = document.getElementById("dig-stock-cap");
const statusMsg = document.getElementById("dig-status-msg");
const digBtn = document.getElementById("dig-btn");
const buyStockBtn = document.getElementById("dig-buy-stock");
const softPityBtn = document.getElementById("dig-soft-pity");
const fluffHint = document.getElementById("dig-fluff-hint");
const fluffAccordionBtn = document.getElementById("dig-fluff-accordion-btn");
const fluffAccordionPanel = document.getElementById("dig-fluff-accordion-panel");
const digMounds = document.getElementById("dig-mounds");
const digZukanBody = document.getElementById("dig-zukan-body");
const digModal = document.getElementById("dig-modal");
const digExcavate = document.getElementById("dig-excavate");
const digResult = document.getElementById("dig-result");
const resultEyebrow = document.getElementById("dig-result-eyebrow");
const resultWebp = document.getElementById("dig-result-webp");
const resultImg = document.getElementById("dig-result-img");
const resultNo = document.getElementById("dig-result-no");
const resultName = document.getElementById("dig-result-name");
const resultLine = document.getElementById("dig-result-line");
const resultNote = document.getElementById("dig-result-note");

let digging = false;
let modalReturnFocus = null;

const statusCopy = (summary) => {
  if (summary.canDig) {
    if (summary.digStock >= 2) {
      return `掘れる回数 ${summary.digStock}。丘を掘れる。`;
    }
    return "掘れる回数がひとつある。";
  }
  if (!summary.grantedToday) {
    return "直立チェックを五つそろえると、発掘がひとつもらえる。";
  }
  if (summary.fluffCount >= FLUFF_COST_STOCK && summary.digStock < summary.digStockCap) {
    return `きょうの発掘はつかった。かけら${FLUFF_COST_STOCK}で回数を足せる。`;
  }
  if (summary.digStock >= summary.digStockCap) {
    return "掘れる回数は上限まで。まずは丘を掘ろう。";
  }
  return "掘れる回数がない。また明日、またはかけらで足せる。";
};

const fluffHintCopy = (summary) => {
  return `かけら${FLUFF_COST_STOCK} → 掘れる回数 +1（上限${summary.digStockCap}）。かけら${FLUFF_COST_SOFT_PITY}＋回数1 → さがし掘り（未所持がすこし出やすい。保証ではない）。重複発掘でかけらが増える。`;
};

const MOUND_LAYOUT = [
  { x: 8, s: 0.85, y: 0 },
  { x: 18, s: 1.05, y: 4 },
  { x: 29, s: 0.7, y: 1 },
  { x: 40, s: 1.15, y: 6 },
  { x: 52, s: 0.9, y: 2 },
  { x: 63, s: 1.2, y: 5 },
  { x: 74, s: 0.75, y: 0 },
  { x: 84, s: 1.0, y: 3 },
  { x: 12, s: 0.65, y: 10 },
  { x: 91, s: 0.95, y: 7 },
];

const renderMounds = (count) => {
  if (!digMounds) return;
  const n = Math.max(0, Math.min(MOUND_MAX, count));
  digMounds.dataset.count = String(n);
  digMounds.innerHTML = MOUND_LAYOUT.slice(0, n)
    .map(
      (m, i) =>
        `<span class="dig-mound dig-mound--${(i % 3) + 1}" style="--mx:${m.x}%;--ms:${m.s};--my:${m.y}px"></span>`
    )
    .join("");
};

const renderProgress = () => {
  const summary = progressSummary();
  if (unlockedEl) unlockedEl.textContent = String(summary.unlocked);
  if (totalEl) totalEl.textContent = String(summary.total);
  if (fluffEl) fluffEl.textContent = String(summary.fluffCount);
  if (stockEl) stockEl.textContent = String(summary.digStock);
  if (stockCapEl) stockCapEl.textContent = String(summary.digStockCap);
  if (statusMsg) statusMsg.textContent = statusCopy(summary);
  if (fluffHint) fluffHint.textContent = fluffHintCopy(summary);
  if (digBtn) {
    digBtn.disabled = !summary.canDig || digging;
    digBtn.textContent = summary.canDig
      ? summary.digStock >= 2
        ? `丘を掘る（残り${summary.digStock}）`
        : "丘を掘る"
      : summary.grantedToday
        ? "いまは掘れない"
        : "まだ掘れない";
  }
  if (buyStockBtn) {
    buyStockBtn.disabled = !summary.canBuyStock || digging;
    buyStockBtn.textContent = `かけら${FLUFF_COST_STOCK}で +1回`;
  }
  if (softPityBtn) {
    softPityBtn.disabled = !summary.canSoftPity || digging;
    softPityBtn.textContent = `かけら${FLUFF_COST_SOFT_PITY}で さがし掘り`;
  }
  renderMounds(summary.moundCount);
};

const cardHtml = (resident, unlocked) => {
  const no = catalogLabel(resident);
  const rarityClass =
    resident.id === "mugen"
      ? " dig-card--super"
      : resident.rate != null
        ? " dig-card--secret"
        : "";
  if (!unlocked) {
    return `
      <figure class="dig-card is-locked${rarityClass}" data-id="${resident.id}">
        <div class="dig-card__art" aria-hidden="true">
          <img
            class="dig-card__silhouette"
            src="assets/haniwa-silhouette.png"
            alt=""
            width="217"
            height="320"
            decoding="async"
          />
          <span class="dig-card__q">？</span>
        </div>
        <figcaption>
          <p class="dig-card__no">${no}</p>
          <strong>？？？</strong>
          <p class="resident-desc">まだ土の中</p>
        </figcaption>
      </figure>
    `;
  }
  const paths = assetPaths(resident.assetBase);
  const badge =
    resident.id === "mugen"
      ? `<p class="secret-badge secret-badge--super" aria-hidden="true">SUPER</p>`
      : resident.rate != null
        ? `<p class="secret-badge" aria-hidden="true">SECRET</p>`
        : "";
  return `
    <figure class="dig-card is-unlocked${rarityClass}" data-id="${resident.id}">
      ${badge}
      <div class="dig-card__art">
        <picture>
          <source
            type="image/webp"
            srcset="${paths.srcset320}, ${paths.srcset512}"
            sizes="(max-width: 820px) 40vw, 140px"
          />
          <img
            class="resident-art"
            src="${paths.png}"
            alt="${resident.name}"
            width="1024"
            height="1024"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      <figcaption>
        <p class="dig-card__no">${no}</p>
        <strong>${resident.name}</strong>
        <p class="resident-desc">${resident.oneLiner}</p>
      </figcaption>
    </figure>
  `;
};

const sectionHtml = (section, unlocked) => {
  const cards = section.residents
    .map((r) => cardHtml(r, unlocked.has(r.id)))
    .join("");
  return `
    <section class="dig-zukan-section dig-zukan-section--${section.key}" aria-labelledby="dig-sec-${section.key}">
      <div class="dig-zukan-section__head">
        <h3 class="dig-zukan-section__title" id="dig-sec-${section.key}">${section.title}</h3>
        <p class="dig-zukan-section__lead">${section.lead}</p>
      </div>
      <div class="dig-grid dig-grid--${section.key}">
        ${cards}
      </div>
    </section>
  `;
};

const renderGrid = () => {
  if (!digZukanBody) return;
  const state = loadExcavation();
  const unlocked = new Set(state.unlockedIds);
  digZukanBody.innerHTML = ZUKAN_SECTIONS.map((section) =>
    sectionHtml(section, unlocked)
  ).join("");
};

const closeModal = ({ scrollToZukan = false } = {}) => {
  if (!digModal || digModal.hidden) return;
  // 掘っている最中（結果前）は閉じない。発掘自体は進める。
  if (digging && digResult?.hidden) return;
  digModal.hidden = true;
  document.body.classList.remove("is-dig-modal-open");
  digResult.hidden = true;
  digResult?.classList.remove("is-secret", "is-duplicate", "is-soft-pity");
  if (digExcavate) {
    digExcavate.hidden = false;
    digExcavate.classList.remove("is-running");
    digExcavate.setAttribute("aria-hidden", "true");
  }
  if (scrollToZukan && digZukanBody) {
    digZukanBody.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }
  const restore = modalReturnFocus;
  modalReturnFocus = null;
  (restore && document.contains(restore) ? restore : digBtn)?.focus?.({
    preventScroll: true,
  });
};

const showResult = (outcome) => {
  const { resident, rarity, duplicate, fluffGained, softPity, fluffSpent } = outcome;
  const paths = assetPaths(resident.assetBase);
  const no = catalogLabel(resident);
  if (digExcavate) {
    digExcavate.classList.remove("is-running");
    digExcavate.hidden = true;
    digExcavate.setAttribute("aria-hidden", "true");
  }
  digResult.hidden = false;

  if (resultEyebrow) {
    resultEyebrow.textContent = duplicate
      ? "また会えた"
      : softPity
        ? "さがし掘り成功"
        : rarity === "secret"
          ? "シークレット発掘"
          : "発掘成功";
  }
  if (resultWebp) {
    resultWebp.srcset = `${paths.srcset512}, ${paths.webp} 1024w`;
  }
  if (resultImg) {
    resultImg.src = paths.png;
    resultImg.alt = `${no} ${resident.name}`;
  }
  if (resultNo) resultNo.textContent = no;
  if (resultName) resultName.textContent = resident.name;
  if (resultLine) resultLine.textContent = resident.oneLiner;
  if (resultNote) {
    if (duplicate) {
      resultNote.textContent = softPity
        ? `もう登録ずみ。土のかけら +${fluffGained}（さがし掘りでかけら ${fluffSpent} つかった）。やさしい重複。`
        : `もう登録ずみ。土のかけら +${fluffGained}。この丘での発掘記録に、やさしい重複。`;
    } else if (softPity) {
      resultNote.textContent = `さがし掘りでかけら ${fluffSpent} と回数をひとつ。この丘での発掘記録に、名前を記した。`;
    } else {
      resultNote.textContent = "この丘での発掘記録に、名前を記した。";
    }
  }
  digResult.classList.toggle("is-secret", rarity === "secret");
  digResult.classList.toggle("is-duplicate", duplicate);
  digResult.classList.toggle("is-soft-pity", Boolean(softPity));
  resultName?.focus();
};

const beginDigModal = () => {
  modalReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : digBtn;
  digModal.hidden = false;
  document.body.classList.add("is-dig-modal-open");
  digResult.hidden = true;
  digResult?.classList.remove("is-secret", "is-duplicate", "is-soft-pity");
  if (digExcavate) {
    digExcavate.hidden = false;
    digExcavate.classList.add("is-running");
    digExcavate.setAttribute("aria-hidden", "false");
  }
};

const runDig = async ({ softPity = false } = {}) => {
  if (digging || !digModal) return;
  if (softPity) {
    const summary = progressSummary();
    if (!summary.canSoftPity) return;
  } else if (!canDig()) {
    return;
  }

  digging = true;
  renderProgress();
  beginDigModal();

  const wait = reduceMotion ? 120 : 1100;
  await new Promise((r) => setTimeout(r, wait));

  const outcome = softPity ? performSoftPityDig() : performDig();
  digging = false;
  if (!outcome) {
    closeModal();
    renderProgress();
    renderGrid();
    return;
  }

  showResult(outcome);
  renderProgress();
  renderGrid();
};

const setFluffAccordionOpen = (open) => {
  if (!fluffAccordionBtn || !fluffAccordionPanel) return;
  fluffAccordionBtn.setAttribute("aria-expanded", open ? "true" : "false");
  fluffAccordionPanel.hidden = !open;
};

fluffAccordionBtn?.addEventListener("click", () => {
  const open = fluffAccordionBtn.getAttribute("aria-expanded") !== "true";
  setFluffAccordionOpen(open);
});

// 説明用アコーディオンは初期クローズ（ボタンは外に出した）
setFluffAccordionOpen(false);

digBtn?.addEventListener("click", () => {
  runDig();
});

buyStockBtn?.addEventListener("click", () => {
  if (digging) return;
  const result = spendFluffForStock();
  renderProgress();
  if (!statusMsg) return;
  if (result.ok) {
    statusMsg.textContent = "かけらを使った。掘れる回数が +1。";
  } else if (result.reason === "cap") {
    statusMsg.textContent = "掘れる回数は上限まで。まずは丘を掘ろう。";
  } else {
    statusMsg.textContent = `かけらが足りない（${FLUFF_COST_STOCK}こで +1回）。重複発掘でかけらが増える。`;
  }
});

softPityBtn?.addEventListener("click", () => {
  runDig({ softPity: true });
});

digModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const closer = t.closest("[data-dig-close]");
  if (!closer) return;
  closeModal({ scrollToZukan: closer.hasAttribute("data-dig-close-focus") });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && digModal && !digModal.hidden) {
    e.preventDefault();
    closeModal();
  }
});

// ?dig=1（または #dig-test）で直立クリア済み＋ストック1以上を強制
// localhost / key=mound なら ?test=1 なしでも可
const hashDigTest = /(?:^|[&#])dig-test\b/.test(window.location.hash);
if ((testGateOk && urlParams.get("dig") === "1") || hashDigTest) {
  const s = loadExcavation();
  s.daily.uprightPresses = UPRIGHT_NEED;
  s.daily.granted = true;
  if (s.digStock < 1) s.digStock = 1;
  saveExcavation(s);
}

// 図鑑コンプリート（通常16＋シークレット3＋むげん）
// - 推奨: /dig?test=1&zukan=1 （拡張子なし・query 保持）
// - フォールバック: /dig.html#zukan-test または /dig#zukan-test
// - 本番: &key=mound が必要（localhost 以外）
const hashZukanTest = /(?:^|[&#])zukan-test\b/.test(window.location.hash);
if ((testGateOk && urlParams.get("zukan") === "1") || hashZukanTest) {
  unlockAllZukan();
}

// かけら／ストックのテスト補助（localhost または key=mound）
if (testGateOk && urlParams.get("fluff") != null) {
  const n = Math.max(0, Math.floor(Number(urlParams.get("fluff")) || 0));
  const s = loadExcavation();
  s.fluffCount = n;
  if (s.fluffEarnedLifetime < n) s.fluffEarnedLifetime = n;
  saveExcavation(s);
}
if (testGateOk && urlParams.get("stock") != null) {
  const n = Math.max(
    0,
    Math.min(DIG_STOCK_CAP, Math.floor(Number(urlParams.get("stock")) || 0))
  );
  const s = loadExcavation();
  s.digStock = n;
  saveExcavation(s);
}

renderProgress();
renderGrid();
