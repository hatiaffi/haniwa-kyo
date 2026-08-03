import {
  ZUKAN_SECTIONS,
  assetPaths,
  catalogLabel,
} from "./lib/residents.mjs";
import {
  UPRIGHT_NEED,
  canDig,
  loadExcavation,
  performDig,
  progressSummary,
  saveExcavation,
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
const statusMsg = document.getElementById("dig-status-msg");
const digBtn = document.getElementById("dig-btn");
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
  if (summary.dugToday) {
    return "きょうの発掘はおわり。またあした、土がやわらかくなる。";
  }
  if (summary.canDig) {
    return "直立がそろった。丘を、いちどだけ掘れる。";
  }
  const left = Math.max(0, UPRIGHT_NEED - summary.uprightPresses);
  return `心の直立チェックがあと ${left} 回で、きょうの発掘ができる。（いま ${summary.uprightPresses} / ${UPRIGHT_NEED}）`;
};

const renderProgress = () => {
  const summary = progressSummary();
  if (unlockedEl) unlockedEl.textContent = String(summary.unlocked);
  if (totalEl) totalEl.textContent = String(summary.total);
  if (fluffEl) fluffEl.textContent = String(summary.fluffCount);
  if (statusMsg) statusMsg.textContent = statusCopy(summary);
  if (digBtn) {
    digBtn.disabled = !summary.canDig || digging;
    digBtn.textContent = summary.dugToday
      ? "きょうは掘りおわった"
      : summary.canDig
        ? "丘を掘る"
        : "まだ掘れない";
  }
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
  digResult?.classList.remove("is-secret", "is-duplicate");
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
  const { resident, rarity, duplicate, fluffGained } = outcome;
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
    resultNote.textContent = duplicate
      ? `もう登録ずみ。土のかけら +${fluffGained}。この丘での発掘記録に、やさしい重複。`
      : "この丘での発掘記録に、名前を記した。";
  }
  digResult.classList.toggle("is-secret", rarity === "secret");
  digResult.classList.toggle("is-duplicate", duplicate);
  resultName?.focus();
};

const runDig = async () => {
  if (digging || !canDig() || !digModal) return;
  digging = true;
  modalReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : digBtn;
  renderProgress();

  digModal.hidden = false;
  document.body.classList.add("is-dig-modal-open");
  digResult.hidden = true;
  if (digExcavate) {
    digExcavate.hidden = false;
    digExcavate.classList.add("is-running");
    digExcavate.setAttribute("aria-hidden", "false");
  }

  const wait = reduceMotion ? 120 : 1100;
  await new Promise((r) => setTimeout(r, wait));

  const outcome = performDig();
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

digBtn?.addEventListener("click", () => {
  runDig();
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

// ?dig=1（または #dig-test）で直立クリア済み＋未発掘を強制
// localhost / key=mound なら ?test=1 なしでも可
const hashDigTest = /(?:^|[&#])dig-test\b/.test(window.location.hash);
if ((testGateOk && urlParams.get("dig") === "1") || hashDigTest) {
  const s = loadExcavation();
  s.daily.uprightPresses = UPRIGHT_NEED;
  s.daily.dug = false;
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

renderProgress();
renderGrid();
