(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  // ?test=1 でシークレット類をすぐ確認できる
  const testMode = new URLSearchParams(window.location.search).has("test");
  if (isTouch) document.body.classList.add("is-touch");
  if (testMode) document.body.classList.add("is-test");

  // Year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Scroll progress + header
  const progress = document.getElementById("scroll-progress");
  const header = document.getElementById("site-header");
  const onScrollChrome = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.width = `${(p * 100).toFixed(2)}%`;
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScrollChrome, { passive: true });
  onScrollChrome();

  // Split text
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.textContent || "";
    el.setAttribute("aria-label", text);
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "split-char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.transitionDelay = `${i * 0.035}s`;
      el.appendChild(span);
    });
  });

  // Reveal + split trigger
  const revealEls = document.querySelectorAll(".reveal, [data-split]");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          entry.target.querySelectorAll(".split-char").forEach((c) => c.classList.add("is-in"));
          if (entry.target.matches("[data-split]")) {
            entry.target.querySelectorAll(".split-char").forEach((c) => c.classList.add("is-in"));
          }
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
    // hero split on load
    requestAnimationFrame(() => {
      document.querySelectorAll(".hero [data-split] .split-char").forEach((c, i) => {
        setTimeout(() => c.classList.add("is-in"), 80 + i * 28);
      });
    });
  } else {
    revealEls.forEach((el) => {
      el.classList.add("is-visible");
      el.querySelectorAll(".split-char").forEach((c) => c.classList.add("is-in"));
    });
  }

  // 保険: ヒーロー見出しが消えたままにならないように
  setTimeout(() => {
    document.querySelectorAll(".hero [data-split] .split-char").forEach((c) => {
      c.classList.add("is-in");
    });
  }, 1200);

  // Parallax
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  let parallaxTicking = false;
  const updateParallax = () => {
    parallaxTicking = false;
    if (reduceMotion) return;
    const y = Math.min(window.scrollY, window.innerHeight);
    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.getAttribute("data-parallax") || "0");
      if (el.classList.contains("spin-stage")) {
        // keep horizontal centering; only nudge vertically while in hero
        el.style.translate = `0 ${y * speed * 0.35}px`;
      } else {
        el.style.translate = `0 ${y * speed}px`;
      }
    });
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!parallaxTicking) {
        parallaxTicking = true;
        requestAnimationFrame(updateParallax);
      }
    },
    { passive: true }
  );

  // Cursor blob + magnetic buttons
  const blob = document.getElementById("cursor-blob");
  if (blob && !isTouch && !reduceMotion) {
    let mx = -100;
    let my = -100;
    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        blob.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      },
      { passive: true }
    );

    document.querySelectorAll("a, button, input, .ritual-pad").forEach((el) => {
      el.addEventListener("pointerenter", () => blob.classList.add("is-hot"));
      el.addEventListener("pointerleave", () => blob.classList.remove("is-hot"));
    });

    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.22}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  // Dust particles
  const dustCanvas = document.getElementById("dust-canvas");
  if (dustCanvas && !reduceMotion) {
    const ctx = dustCanvas.getContext("2d");
    const particles = [];
    const resize = () => {
      dustCanvas.width = window.innerWidth * devicePixelRatio;
      dustCanvas.height = window.innerHeight * devicePixelRatio;
      dustCanvas.style.width = `${window.innerWidth}px`;
      dustCanvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.6 + Math.random() * 1.8,
        vx: -0.15 + Math.random() * 0.3,
        vy: -0.25 + Math.random() * 0.15,
        a: 0.15 + Math.random() * 0.35,
      });
    }

    const tickDust = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) p.y = window.innerHeight + 10;
        if (p.x < -10) p.x = window.innerWidth + 10;
        if (p.x > window.innerWidth + 10) p.x = -10;
        ctx.beginPath();
        ctx.fillStyle = `rgba(143, 90, 50, ${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tickDust);
    };
    requestAnimationFrame(tickDust);
  }

  // 丘からのつぶやき — はにわ周囲に小→大→小で浮かんで消える
  const voiceField = document.getElementById("voice-field");
  const voiceStage = document.getElementById("spin-stage");
  const whispers = [
    "くらべず、ゆるして、すこし笑う。これで合格。",
    "あくびは罪じゃない。立派な直立の一種です。",
    "二度寝は文化財。大切に保護しよう。",
    "ごはんまでの待ち時間は、たのしみのカウントダウン。",
    "おなかがすいたら哲学が深まる。まず何か食べよう。",
    "もしものコレクションより、いまのおやつを優先。",
    "雨の日は、ぬくぬくが正規ルート。",
    "ばんざいの練習に、理由はいらない。",
    "ドヤ顔の中身は、だいたいふつうでちょうどいい。",
    "傾き5度までは、個性の範囲です。",
    "ねむけも、丘の住民票があれば正当派。",
    "ほめられたら斜めににじむ。それがてれの証明。",
    "失敗はヒビ。直さなくても、味になる。",
    "完璧より、ちょっと傾いたやさしさ。",
    "右手を上げたら、なんとなく一日が始まった。",
    "スマホより先に、空を一秒見る。それだけで天気が変わる。",
    "言い返さずに三秒立ったら、けんかが雲になった。",
    "だれかと比べるのをやめたら、ごはんがおいしくなった。",
    "友だちのぼやきに、正解を言わなくてよかった。",
    "へんな自分も、焼きものの味だと気づいた。",
    "くちびるの端を、いちミリだけ上げてみる。",
    "ゆるした瞬間、肩の土がふわっと軽くなる。",
    "風まかせで立ってたら、いい景色だった。",
    "となりのはにわの腕の長さ、もう測らなくていい。",
    "考えが回りすぎたら、一回すわってお茶でも。",
    "正面は苦手でも、斜めからのやさしさは得意。",
    "よろこびが両手で足りない日は、足も使っていい。",
    "はにわになってから、夜がやわらかい。",
    "笑うこと、いちばんむずかしいのにいちばん効く。",
    "土の温度くらいで、いきてみよう。",
    "今日の自分に、土へのありがとうをひとつ。",
    "急がない勇気は、丘いちばんのわざ。",
    "はにわ教の戒律は三つだけ。くらべず、ゆるして、笑う。",
    "友だちの話に、正解じゃなくて耳をひらく。",
    "ねむい朝も、心のなかで右手だけ上げている。",
    "テストの前より、おやつの前のほうが真剣。それでいい。",
    "転んでも土の味見。立ち直せば満点寄り。",
    "「めんどい」は、休憩の予告放送です。",
    "笑うと顔がほぐれる。はにわも、たぶんそう。",
    "宿題より先に、水を一杯。体は小さな古墳。",
    "友だちのネタに乗れた日は、もう勝ち。",
    "変顔は親善大使。空気がふわっとなる。",
    "遅刻しそうな朝も、靴下一歩から直立開始。",
    "好きな曲のサビで、心だけばんざい。",
    "消しゴムかすも、がんばった証拠の雪。",
    "今日のラッキーアイテムは、あたたかいごはん。",
    "ちょっとした親切は、丘のWi-Fiよりつながる。",
    "失敗談は、明日の自分へのお土産。",
    "空を見あげたら、宿題の重さが3グラム減った。",
    "「まあいいか」は、はにわ教の高級呪文。",
    "顔が赤いのはてれ。エンジンの暖機運転。",
    "昼休みの立ち話に、小さな祭りがある。",
    "消しゴムで消せることは、だいたい大丈夫。",
    "自分に満点はむずかしい。合格点で前進しよう。",
    "雨宿りも立派な作戦。濡れない勝ち。",
    "笑った回数が多い日は、記録に残したい。",
    "肩の力が抜けたら、腕がばんざいしやすい。",
    "苦手なことは、斜めからながめてみよう。",
    "「ありがとう」は、いちばん軽い贈り物。",
    "寝ぐせは個性。朝のはにわスタイル。",
    "小さくうなずくだけで、会話がやわらかくなる。",
    "きょう立てた自分に、ひと言だけ拍手。",
    "おにぎり一個で、世界はだいたい立て直せる。",
    "風が強い日は、髪の毛と一緒に笑う。",
    "まちがえても、ページをめくれる。それが強さ。",
    "好きな色のペンで書いたら、文字が元気になる。",
    "丘のルール：くらべない、あせらない、すこし笑う。",
    "心の天気がくもりでも、直立はできる。",
    "「だいじょうぶ」は、自分にも言っていい。",
    "ちょっと休憩。はにわも、ずっとは動かない。",
    "今日の自分、昨日より0.1ミリやさしい。合格。",
    "笑顔の練習は、鏡なしでもできる。",
    "友だちと分けたおかしは、幸福度が倍になる。",
    "ゆっくり歩く日も、ちゃんと前に進んでいる。",
    "はにわは急がない。なのに、ちゃんと立っている。",
  ];
  // 丘のみんなのちかい（API不通時のフォールバック）＋共有倉庫＋この端末
  const communityVows = [
    "くらべる前に、まず笑う。",
    "今日はゆるしの日。自分にも適用。",
    "宿題より先に、空を一秒。",
    "傾いても、心は直立。",
    "おやつの前の真剣顔、認めてほしい。",
    "友だちのぼやきに、うなずく係。",
    "ばんざいは無言でも通じる。",
    "ねむけは罪じゃない。文化です。",
    "失敗したら、味が増えたと思う。",
    "雨の日はぬくぬく信仰。",
    "てれても、いちミリ笑う。",
    "急がない。はにわでいい。",
    "ごはんが炊けたら、世界平和。",
    "苦手なことは斜めから見る。",
    "消しゴムかすも、がんばりの雪。",
    "「まあいいか」を今日の呪文に。",
    "ほめられたら、斜めににじむ。",
    "二度寝を守る会、会員です。",
    "正しい答えより、あたたかい耳。",
    "小さくうなずく勇者になりたい。",
    "転んだら、土の味見して立ち直る。",
    "好きな曲のサビで心ばんざい。",
    "完璧じゃなくて、合格点で進む。",
    "おにぎり一個のちからを信じてる。",
    "となりと比べない宣言、更新中。",
    "あくびも立派な直立です。",
    "今日の自分に、ひそか拍手。",
    "風が強くても、すこし笑う。",
    "まちがえても、ページはめくれる。",
    "丘の住民として、やさしく立つ。",
  ];
  const VOW_STORAGE_KEY = "haniwa-kyo-vows";
  const userVows = [];
  let remoteVows = [];

  const loadStoredVows = () => {
    try {
      const raw = localStorage.getItem(VOW_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list)
        ? list.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
        : [];
    } catch (_) {
      return [];
    }
  };

  const saveStoredVow = (vow) => {
    const text = String(vow || "").trim();
    if (!text) return;
    const list = loadStoredVows().filter((t) => t !== text);
    list.unshift(text);
    try {
      localStorage.setItem(VOW_STORAGE_KEY, JSON.stringify(list.slice(0, 40)));
    } catch (_) {
      /* ignore quota */
    }
  };

  const getVowPool = () => {
    const seen = new Set();
    const pool = [];
    const push = (t) => {
      const text = String(t || "").trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      pool.push(text);
    };
    userVows.forEach(push);
    remoteVows.forEach(push);
    loadStoredVows().forEach(push);
    // 共有倉庫が空／不通のときだけサンプルを足す
    if (remoteVows.length < 3) communityVows.forEach(push);
    return pool;
  };

  const refreshRemoteVows = async () => {
    try {
      const res = await fetch("/api/vows?limit=60", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.ok || !Array.isArray(data.vows)) return;
      remoteVows = data.vows
        .filter((t) => typeof t === "string" && t.trim())
        .map((t) => t.trim())
        .slice(0, 80);
    } catch (_) {
      /* オフライン時はローカル／サンプルで継続 */
    }
  };

  const shareVowRemote = async (vow) => {
    try {
      const res = await fetch("/api/vows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vow }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          message: data?.message || "ちかい倉庫に届かなかったみたい。",
        };
      }
      if (data?.vow && !remoteVows.includes(data.vow)) {
        remoteVows.unshift(data.vow);
        if (remoteVows.length > 80) remoteVows.length = 80;
      }
      return { ok: true };
    } catch (_) {
      return { ok: false, message: "通信エラーで、みんなの丘にはまだ届いてないよ。" };
    }
  };

  refreshRemoteVows();
  setInterval(refreshRemoteVows, 120000);

  // 直近に出した文言（連続・同じ並びを避ける）
  const recentWhisperTexts = [];
  const RECENT_WHISPER_LIMIT = 10;
  // 直近に出した位置（近くへの連打表示を防ぐ）
  const recentVoiceSpots = [];

  const pickRandomWhisper = (pool) => {
    if (!pool.length) return "";
    const blocked = new Set(recentWhisperTexts);
    let choices = pool.filter((t) => !blocked.has(t));
    if (!choices.length) {
      // 直近が埋まったら、いちばん古いもの以外から選ぶ
      const last = recentWhisperTexts[recentWhisperTexts.length - 1];
      choices = pool.filter((t) => t !== last);
      if (!choices.length) choices = [...pool];
    }
    return choices[Math.floor(Math.random() * choices.length)];
  };

  const rememberWhisper = (text) => {
    if (!text) return;
    recentWhisperTexts.push(text);
    while (recentWhisperTexts.length > RECENT_WHISPER_LIMIT) {
      recentWhisperTexts.shift();
    }
  };

  const recentWasVow = () => {
    const vows = new Set(getVowPool());
    return recentWhisperTexts.slice(-4).some((t) => vows.has(t));
  };

  // 縦書き用：句読点・助詞など、日本語として自然な位置で改行
  const breakVerticalText = (raw) => {
    const text = String(raw || "").replace(/\s+/g, "");
    const chars = [...text];
    if (chars.length <= 8) return text;

    // 行頭禁則
    const noLineStart = new Set([
      "。", "、", "．", "，", "！", "？", "!", "?", "ー", "〜", "…",
      "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "っ", "ゃ", "ゅ", "ょ", "ゎ",
      "ァ", "ィ", "ゥ", "ェ", "ォ", "ッ", "ャ", "ュ", "ョ", "ヮ",
      "」", "』", "）", "〕", "】", "］", "〉", "》",
    ]);
    // 行末禁則
    const noLineEnd = new Set(["「", "『", "（", "〔", "【", "［", "〈", "《"]);

    // 2文字助詞・接続（この並びの直後で切ると自然）
    const pairAfter = new Set([
      "から", "まで", "より", "など", "ので", "のに", "けど", "ても", "でも",
      "には", "では", "とは", "にも", "へも", "をも", "とか", "って", "たり",
      "たら", "なら", "れば", "かも", "ほど", "だけ", "ばかり",
      "して", "きて", "みて", "いて",
    ]);

    // 1文字：強く切ってよい（句読点・終助詞まわり）
    const strongAfter = new Set(["。", "．", "！", "？", "!", "?", "、", "，", "」", "』", "）"]);
    // 1文字助詞（語中のい・う・ん等では切らない）
    const particleAfter = new Set(["を", "に", "は", "が", "で", "と", "も", "へ", "や", "の", "か"]);
    // 接続のて・で（やや弱め）
    const softAfter = new Set(["て", "で", "た", "だ", "ね", "よ", "さ", "ば", "り"]);

    const scoreBreakAfter = (i) => {
      if (i < 0 || i >= chars.length - 1) return -Infinity;
      const ch = chars[i];
      const prev = chars[i - 1];
      const next = chars[i + 1];
      if (noLineEnd.has(ch)) return -Infinity;
      if (next && noLineStart.has(next)) return -Infinity;

      let score = 0;
      const pair = (prev || "") + ch;
      if (pairAfter.has(pair)) score += 18;
      if (strongAfter.has(ch)) score += 22;
      else if (particleAfter.has(ch)) score += 14;
      else if (softAfter.has(ch)) score += 7;
      else score -= 4; // 語の途中はなるべく避ける

      // 「、」の直後など、すでに切れている並びはさらに加点しない（重複しない）
      return score;
    };

    const ideal = 7;
    const minLen = 4;
    const maxLen = 10;
    const lines = [];
    let start = 0;

    while (start < chars.length) {
      const remain = chars.length - start;
      if (remain <= maxLen) {
        lines.push(chars.slice(start).join(""));
        break;
      }

      let best = -1;
      let bestScore = -Infinity;
      const from = start + minLen - 1;
      const to = Math.min(chars.length - 2, start + maxLen - 1);

      for (let i = from; i <= to; i += 1) {
        let score = scoreBreakAfter(i);
        if (score === -Infinity) continue;

        const len = i - start + 1;
        score -= Math.abs(len - ideal) * 1.6;
        // 末尾が極端に短くなる切り方を避ける
        const left = chars.length - (i + 1);
        if (left > 0 && left < 3) score -= 14;
        if (left >= 3 && left <= maxLen && left < minLen + 1) score -= 4;
        // 句読点直後は特に優先
        if (strongAfter.has(chars[i])) score += 4;

        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }

      // 良い境界がなければ、禁則だけ守って理想長付近で切る
      if (best < 0 || bestScore < 0) {
        best = Math.min(chars.length - 2, start + ideal - 1);
        while (best > start + minLen - 2 && (noLineEnd.has(chars[best]) || (chars[best + 1] && noLineStart.has(chars[best + 1])))) {
          best -= 1;
        }
        while (
          best < chars.length - 2 &&
          chars[best + 1] &&
          noLineStart.has(chars[best + 1])
        ) {
          best += 1;
        }
        // それでも助詞境界があれば寄せる
        for (let i = Math.min(to, start + maxLen - 1); i >= from; i -= 1) {
          if (scoreBreakAfter(i) >= 14) {
            best = i;
            break;
          }
        }
      }

      lines.push(chars.slice(start, best + 1).join(""));
      start = best + 1;
    }

    return lines.filter(Boolean).join("\n");
  };

  const spawnVoiceBubble = (text, { isVow = false, force = false, fromSpin = false } = {}) => {
    if (!voiceField || !voiceStage) return false;
    if (!force && reduceMotion) return false;
    if (!force && window.scrollY > window.innerHeight * 0.85) return false;

    const fieldRect = voiceField.getBoundingClientRect();
    const stageRect = voiceStage.getBoundingClientRect();
    if (fieldRect.width < 40 || stageRect.width < 40) return false;

    const isNarrow = fieldRect.width < 720 || isTouch;
    // 自動は2個、回転ごほうびは6個まで
    const maxLive = fromSpin ? 6 : 2;
    if (!force && voiceField.querySelectorAll(".voice-bubble").length >= maxLive) return false;

    // スマホは縦書き多め、PCは半々
    const useVertical = Math.random() < (isNarrow ? 0.65 : 0.5);
    const displayText = useVertical ? breakVerticalText(text) : text;
    const vLines = useVertical ? displayText.split("\n") : [];
    const plainLen = Math.max(1, text.replace(/[。、．！？!?\s　「」『』]/g, "").length);

    // サイズ見積もり（狭い画面はコンパクトに）
    let estW = Math.min(fieldRect.width * (isNarrow ? 0.4 : 0.55), isVow ? (isNarrow ? 200 : 280) : isNarrow ? 150 : 240);
    let estH = Math.min(isNarrow ? 88 : 140, (isNarrow ? 34 : 44) + Math.ceil(Math.min(text.length, 28) / (isNarrow ? 14 : 12)) * (isNarrow ? 22 : 28));
    if (useVertical) {
      estH = Math.min(fieldRect.height * (isNarrow ? 0.3 : 0.5), (isNarrow ? 40 : 52) + Math.min(isNarrow ? 7 : 9, plainLen) * (isNarrow ? 18 : 24));
      estW = Math.min(isNarrow ? 110 : 220, (isNarrow ? 28 : 40) + Math.max(1, vLines.length) * (isNarrow ? 24 : 34));
    }

    const hardBlocks = [];
    const softBlocks = [];
    const forbidden = []; // はにわ真後ろなど絶対NG
    const pushRect = (list, r, pad = 10) => {
      if (!r || r.width < 2 || r.height < 2) return;
      list.push({
        left: r.left - pad,
        top: r.top - pad,
        right: r.right + pad,
        bottom: r.bottom + pad,
      });
    };
    const pushEl = (list, el, pad) => {
      if (!el || el.hidden) return;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      if (parseFloat(style.opacity || "1") < 0.15) return;
      pushRect(list, el.getBoundingClientRect(), pad);
    };

    // 見出し文言だけ避ける（CTA込みの .hero-copy 全体はスマホで画面を埋めすぎる）
    const textPad = isNarrow ? 6 : 14;
    pushEl(forbidden, document.querySelector(".hero-copy .brand"), textPad);
    pushEl(forbidden, document.querySelector(".hero-copy h1"), textPad);
    pushEl(forbidden, document.querySelector(".hero-copy .lede"), textPad + 2);
    pushEl(hardBlocks, document.getElementById("site-header"), useVertical ? 2 : 4);
    pushEl(softBlocks, document.querySelector(".scroll-cue"), 6);
    pushEl(softBlocks, document.getElementById("spin-hint"), isNarrow ? 4 : 8);
    pushEl(softBlocks, document.querySelector(".cta-group"), isNarrow ? 4 : 8);
    // 表示中の文言は広めに避ける（被り防止）
    voiceField.querySelectorAll(".voice-bubble").forEach((b) => pushEl(forbidden, b, isNarrow ? 24 : 56));

    // はにわ本体の真後ろ（中央シルエット）は禁止。端への少しの被りはOK
    {
      const xRatio = isNarrow ? 0.36 : 0.3;
      const wRatio = isNarrow ? 0.28 : 0.4;
      const left = stageRect.left + stageRect.width * xRatio;
      const top = stageRect.top + stageRect.height * (isNarrow ? 0.12 : 0.08);
      const width = stageRect.width * wRatio;
      const height = stageRect.height * (isNarrow ? 0.62 : 0.78);
      pushRect(
        forbidden,
        { left, top, width, height, right: left + width, bottom: top + height },
        isNarrow ? 2 : 6
      );
    }

    const now = performance.now();
    for (let i = recentVoiceSpots.length - 1; i >= 0; i -= 1) {
      if (recentVoiceSpots[i].until <= now) recentVoiceSpots.splice(i, 1);
    }
    // 直近スポットから離す距離（スマホは狭くて失敗しやすいので短め）
    const minGap = isNarrow
      ? Math.min(88, Math.max(48, Math.min(fieldRect.width, fieldRect.height) * 0.12))
      : Math.min(160, Math.max(90, Math.min(fieldRect.width, fieldRect.height) * 0.18));

    const hits = (list, left, top, right, bottom) =>
      list.some((b) => left < b.right && right > b.left && top < b.bottom && bottom > b.top);

    const scorePos = (localX, localY, { ignoreRecent = false } = {}) => {
      const left = fieldRect.left + localX - estW / 2;
      const top = fieldRect.top + localY - estH / 2;
      const right = left + estW;
      const bottom = top + estH;
      const inset = useVertical ? 2 : 3;
      if (
        left < fieldRect.left + inset ||
        right > fieldRect.right - inset ||
        top < fieldRect.top + inset ||
        bottom > fieldRect.bottom - inset
      ) {
        return -1;
      }
      // はにわ真後ろ・既存文言は不可
      if (hits(forbidden, left, top, right, bottom)) return -1;

      // 直近に出した位置の近くも不可
      let nearest = Infinity;
      if (!ignoreRecent) {
        for (let i = 0; i < recentVoiceSpots.length; i += 1) {
          const s = recentVoiceSpots[i];
          const d = Math.hypot(localX - s.x, localY - s.y);
          if (d < minGap) return -1;
          if (d < nearest) nearest = d;
        }
      }

      let score = 40 + Math.random() * 40;
      if (hits(hardBlocks, left, top, right, bottom)) score -= useVertical ? 40 : 55;
      if (hits(softBlocks, left, top, right, bottom)) score -= 35;
      // 既存スポットから遠いほど少し加点（決定打にはしない）
      if (nearest < Infinity) score += Math.min(24, (nearest - minGap) * 0.12);
      // スマホははにわ周り・上半分をやや優先（コピー帯と被りにくい）
      if (isNarrow) {
        const dy = Math.abs(localY - cy);
        if (localY < fieldRect.height * 0.55) score += 12;
        if (dy < baseR * 0.55) score += 8;
      }
      return score;
    };

    const padX = estW / 2 + 4;
    const padY = estH / 2 + 4;
    const cx = stageRect.left + stageRect.width * 0.5 - fieldRect.left;
    const cy = stageRect.top + stageRect.height * 0.42 - fieldRect.top;
    const baseR = Math.min(stageRect.width, stageRect.height);

    // 画面全体を広くランダムサンプリング（固定プリセットは使わない）
    const candidates = [];
    const pushCand = (x, y) => {
      candidates.push({
        x,
        y,
        side: x >= fieldRect.width * 0.5 ? 1 : -1,
      });
    };

    const sampleN = isNarrow ? 110 : 72;
    for (let i = 0; i < sampleN; i += 1) {
      pushCand(
        padX + Math.random() * Math.max(8, fieldRect.width - padX * 2),
        padY + Math.random() * Math.max(8, fieldRect.height - padY * 2)
      );
    }
    // はにわ周囲リングもランダムで少し足す（真後ろは score で落とす）
    for (let i = 0; i < (isNarrow ? 40 : 24); i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = baseR * (0.22 + Math.random() * 0.85);
      pushCand(
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius * (0.5 + Math.random() * 0.65)
      );
    }
    // スマホは左右帯・上帯を明示的に足す
    if (isNarrow) {
      for (let t = 0.08; t <= 0.72; t += 0.08) {
        pushCand(padX + 2, fieldRect.height * t);
        pushCand(fieldRect.width - padX - 2, fieldRect.height * t);
      }
      for (let x = 0.12; x <= 0.88; x += 0.1) {
        pushCand(fieldRect.width * x, padY + 6);
        pushCand(fieldRect.width * x, Math.min(fieldRect.height * 0.42, cy - baseR * 0.15));
      }
    }

    const pickWeighted = (list) => {
      if (!list.length) return null;
      const total = list.reduce((sum, c) => sum + Math.max(1, c.score), 0);
      let roll = Math.random() * total;
      for (let i = 0; i < list.length; i += 1) {
        roll -= Math.max(1, list[i].score);
        if (roll <= 0) return list[i];
      }
      return list[Math.floor(Math.random() * list.length)];
    };

    let valid = [];
    candidates.forEach((c) => {
      const s = scorePos(c.x, c.y);
      if (s >= 0) valid.push({ ...c, score: s });
    });

    // 空きがなければ直近距離を無視して再評価（スマホで沈黙しすぎない）
    if (!valid.length) {
      candidates.forEach((c) => {
        const s = scorePos(c.x, c.y, { ignoreRecent: true });
        if (s >= 0) valid.push({ ...c, score: s });
      });
    }

    let best = pickWeighted(valid);

    // 空きがなければ出さない（被って出すより待つ）／誓いは強制配置
    if (!best) {
      if (!force && !isNarrow) return false;
      // 誓いやスマホは禁止領域だけ守ってランダム配置
      const forced = [];
      candidates.forEach((c) => {
        const left = fieldRect.left + c.x - estW / 2;
        const top = fieldRect.top + c.y - estH / 2;
        const right = left + estW;
        const bottom = top + estH;
        if (
          left < fieldRect.left + 2 ||
          right > fieldRect.right - 2 ||
          top < fieldRect.top + 2 ||
          bottom > fieldRect.bottom - 2
        ) {
          return;
        }
        if (hits(forbidden, left, top, right, bottom)) return;
        forced.push(c);
      });
      if (!forced.length) return false;
      best = forced[Math.floor(Math.random() * forced.length)];
    }

    const el = document.createElement("p");
    el.className = [
      "voice-bubble",
      isVow ? "voice-bubble--vow" : "",
      useVertical ? "voice-bubble--vertical" : "",
    ]
      .filter(Boolean)
      .join(" ");
    el.textContent = displayText;

    const drift = 18 + Math.random() * 28;
    const side = best.side;
    const lifeMs = ((isVow ? 16 : isNarrow ? 15 : 16.5) + Math.random() * 3) * 1000;
    el.style.left = `${best.x}px`;
    el.style.top = `${best.y}px`;
    el.style.setProperty("--life", `${lifeMs / 1000}s`);
    el.style.setProperty("--mx", `${side * (4 + Math.random() * 10)}px`);
    el.style.setProperty("--my", `${-6 - Math.random() * 10}px`);
    el.style.setProperty("--mx2", `${side * (8 + Math.random() * 14)}px`);
    el.style.setProperty("--my2", `${-14 - Math.random() * 12}px`);
    el.style.setProperty("--mx3", `${side * (10 + Math.random() * 18)}px`);
    el.style.setProperty("--my3", `${-28 - drift}px`);

    recentVoiceSpots.push({
      x: best.x,
      y: best.y,
      until: performance.now() + Math.min(lifeMs, isNarrow ? 11000 : 13000),
    });

    voiceField.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    return true;
  };

  const spawnWhisper = ({ fromSpin = false } = {}) => {
    // 基本は定番つぶやき。丘のみんな／自分のちかいがたまに混ざる
    // 回転ごほうびは定番多め（すぐ反応して楽しく）
    const vowPool = getVowPool();
    const vowChance = fromSpin ? 0.08 : 0.16;
    const canShowVow = vowPool.length > 0 && !recentWasVow() && Math.random() < vowChance;
    const isVow = canShowVow;
    const pool = isVow ? vowPool : whispers;
    const text = pickRandomWhisper(pool);
    if (!text) return false;
    rememberWhisper(text);
    const ok = spawnVoiceBubble(text, { isVow, fromSpin });
    // 配置失敗時だけ、少し間を置いて1回だけ再挑戦（回転時は待たない）
    if (!ok && !fromSpin && !reduceMotion && window.scrollY <= window.innerHeight * 0.85) {
      setTimeout(() => {
        spawnVoiceBubble(text, { isVow, fromSpin: false });
      }, 1800);
    }
    return ok;
  };

  const showVowOnHero = (vow) => {
    const text = String(vow || "").trim();
    if (!text) return;
    userVows.unshift(text);
    if (userVows.length > 12) userVows.length = 12;
    saveStoredVow(text);
    rememberWhisper(text);
    // みんなの丘へ共有（失敗しても入信自体は成功）
    shareVowRemote(text).then((result) => {
      if (result.ok) refreshRemoteVows();
    });

    // 入信後にページ先頭へ戻さない。ヒーローが見えているときだけ一度浮かべる
    const heroVisible = window.scrollY < window.innerHeight * 0.55;
    if (!heroVisible) return;

    spawnVoiceBubble(text, { isVow: true, force: true });
  };

  if (voiceField && voiceStage && !reduceMotion) {
    setTimeout(spawnWhisper, 2200);
    setInterval(spawnWhisper, 10000);
  }

  // フリックで回る埴輪（初期静止 → 強さに応じた速さ → 自然減速）
  const stage = document.getElementById("spin-stage");
  const haniwa = document.getElementById("haniwa-spin");
  const shadow = document.getElementById("spin-shadow");

  if (stage && haniwa) {
    let angle = 0;
    let speed = 0; // deg/sec
    let dragging = false;
    let last = performance.now();
    const samples = [];
    const maxSpeed = 1400;
    const friction = 1.65; // 指数減衰（大きいほど早く止まる）
    const stopSpeed = 3;
    const dragGain = 0.55; // px → deg
    const flickGain = 1.35; // px/ms → deg/sec 換算用
    // 回せば回すほどことばが増える（速さで頻度アップ、同時は最大6）
    let spinAccDeg = 0;
    let lastSpinWhisperAt = 0;
    const SPIN_MAX_LIVE = 6;
    // 約12回転に1回、住民の顔にちらっと変身
    const frontImg = haniwa.querySelector(".haniwa-face--front");
    const superFlash = document.getElementById("hero-super-flash");
    const heroEl = document.querySelector(".hero");
    const defaultFrontSrc =
      frontImg?.getAttribute("src") || "assets/haniwa-front.png";
    const altFaces = [
      "assets/resident-a.png",
      "assets/resident-b.png",
      "assets/resident-c.png",
      "assets/resident-d.png",
      "assets/resident-e.png",
      "assets/resident-f.png",
      "assets/resident-g.png",
      "assets/resident-h.png",
    ];
    const secretFaces = [
      "assets/resident-secret-a.png",
      "assets/resident-secret-b.png",
      "assets/resident-secret-c.png",
    ];
    const superSecretFace = "assets/resident-secret-super.png";
    [...altFaces, ...secretFaces, superSecretFace].forEach((src) => {
      const pre = new Image();
      pre.src = src;
    });
    let faceAccDeg = 0;
    let faceSwapTimer = 0;
    let lastAltFace = "";
    const FACE_NEED_DEG = (testMode ? 0.35 : 12) * 360;
    const FACE_HOLD_MS = 480;
    // シークレットは変身のうち約8%、スーパーはそのうちさらにレア（?test=1 でほぼ毎回スーパー）
    const SECRET_FACE_CHANCE = testMode ? 0.05 : 0.08;
    const SUPER_SECRET_FACE_CHANCE = testMode ? 0.9 : 0.012;

    const spinParamsForRate = (degPerSec) => {
      const r = Math.abs(degPerSec);
      if (r >= 750) return { needDeg: 26, cooldown: 150, burst: 2 };
      if (r >= 420) return { needDeg: 40, cooldown: 220, burst: 1 };
      if (r >= 180) return { needDeg: 58, cooldown: 340, burst: 1 };
      return { needDeg: 88, cooldown: 620, burst: 1 };
    };

    const whisperFromSpin = ({ force = false, burst = 1, cooldown = 0 } = {}) => {
      if (reduceMotion || !voiceField) return;
      if (window.scrollY > window.innerHeight * 0.85) return;
      const now = performance.now();
      if (!force && now - lastSpinWhisperAt < cooldown) return;
      lastSpinWhisperAt = now;
      spinAccDeg = 0;
      const n = Math.max(1, burst);
      for (let i = 0; i < n; i += 1) {
        const live = voiceField.querySelectorAll(".voice-bubble").length;
        if (live >= SPIN_MAX_LIVE) break;
        spawnWhisper({ fromSpin: true });
      }
    };

    const maybeSwapFace = (deltaDeg) => {
      if (!frontImg || reduceMotion) return;
      faceAccDeg += Math.abs(deltaDeg);
      if (faceAccDeg < FACE_NEED_DEG) return;
      faceAccDeg = 0;

      const roll = Math.random();
      const useSuper = roll < SUPER_SECRET_FACE_CHANCE;
      const useSecret = !useSuper && roll < SUPER_SECRET_FACE_CHANCE + SECRET_FACE_CHANCE;
      let pick;
      if (useSuper) {
        pick = superSecretFace;
      } else {
        const pool = useSecret ? secretFaces : altFaces;
        pick = pool[Math.floor(Math.random() * pool.length)];
        if (pool.length > 1) {
          let guard = 0;
          while (pick === lastAltFace && guard < 6) {
            pick = pool[Math.floor(Math.random() * pool.length)];
            guard += 1;
          }
        }
      }
      lastAltFace = pick;
      frontImg.src = pick;
      haniwa.classList.add("is-face-swap");
      haniwa.classList.toggle("is-face-secret", useSecret || useSuper);
      haniwa.classList.toggle("is-face-super-secret", useSuper);
      if (useSuper) {
        // スーパーだけ画面がはっきり光る
        if (superFlash) {
          superFlash.classList.remove("is-on");
          // 再トリガー用にリフロー
          void superFlash.offsetWidth;
          superFlash.classList.add("is-on");
        }
        heroEl?.classList.add("is-super-flash");
        window.setTimeout(() => {
          heroEl?.classList.remove("is-super-flash");
          superFlash?.classList.remove("is-on");
        }, 700);
      }
      window.clearTimeout(faceSwapTimer);
      const hold = useSuper ? FACE_HOLD_MS + 360 : useSecret ? FACE_HOLD_MS + 160 : FACE_HOLD_MS;
      faceSwapTimer = window.setTimeout(() => {
        frontImg.src = defaultFrontSrc;
        haniwa.classList.remove("is-face-swap", "is-face-secret", "is-face-super-secret");
      }, hold);
    };

    const accumulateSpin = (deltaDeg, degPerSec) => {
      const d = Math.abs(deltaDeg);
      if (d < 0.15) return;
      spinAccDeg += d;
      maybeSwapFace(d);
      const { needDeg, cooldown, burst } = spinParamsForRate(degPerSec);
      if (spinAccDeg >= needDeg) {
        whisperFromSpin({ force: false, burst, cooldown });
      }
    };

    const render = () => {
      const cos = Math.cos((angle * Math.PI) / 180);
      const width = Math.max(0.12, Math.abs(cos));
      haniwa.style.setProperty("--face-sx", width.toFixed(4));
      haniwa.style.transform = `scaleX(${width.toFixed(4)})`;
      haniwa.classList.toggle("is-back", cos < 0);
      haniwa.classList.toggle("is-fast", Math.abs(speed) > 480);
      if (shadow) {
        shadow.style.transform = `translateX(-50%) scaleX(${(0.35 + width * 0.65).toFixed(3)})`;
        shadow.style.opacity = (0.14 + width * 0.14).toFixed(3);
      }
    };

    const pushSample = (x, t) => {
      samples.push({ x, t });
      while (samples.length > 8) samples.shift();
      // 古いサンプルを捨てる（直近約100ms）
      while (samples.length > 2 && t - samples[0].t > 100) samples.shift();
    };

    const velocityFromSamples = () => {
      if (samples.length < 2) return 0;
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = Math.max(1, b.t - a.t); // ms
      const vx = ((b.x - a.x) / dt) * 1000; // px/sec
      // 横フリック → 縦軸回転。右フリックで手前が左へ回る感覚
      return (-vx * flickGain) / 2.2;
    };

    stage.addEventListener("pointerdown", (e) => {
      if (reduceMotion) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      speed = 0;
      samples.length = 0;
      pushSample(e.clientX, performance.now());
      stage.classList.add("is-hint-gone");
      try {
        stage.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    stage.addEventListener("pointermove", (e) => {
      if (!dragging || reduceMotion) return;
      const prev = samples[samples.length - 1];
      const x = e.clientX;
      const t = performance.now();
      if (prev) {
        const dx = x - prev.x;
        const delta = -dx * dragGain;
        const dtMs = Math.max(1, t - prev.t);
        const degPerSec = (Math.abs(delta) / dtMs) * 1000;
        angle = (angle + delta) % 360;
        if (angle < 0) angle += 360;
        accumulateSpin(delta, degPerSec);
      }
      pushSample(x, t);
      render();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      let v = velocityFromSamples();
      if (!Number.isFinite(v)) v = 0;
      // ごく弱いフリックは無視（タップで誤爆しない）
      if (Math.abs(v) < 40) v = 0;
      speed = Math.max(-maxSpeed, Math.min(maxSpeed, v));
      samples.length = 0;
      // フリックの強さで初撃の量を変える
      const abs = Math.abs(speed);
      if (abs >= 120) {
        const burst = abs >= 700 ? 2 : 1;
        whisperFromSpin({ force: true, burst, cooldown: 0 });
      }
    };

    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("lostpointercapture", endDrag);

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!dragging && !reduceMotion && Math.abs(speed) > 0) {
        const delta = speed * dt;
        angle = (angle + delta) % 360;
        if (angle < 0) angle += 360;
        accumulateSpin(delta, Math.abs(speed));
        // 自然な減速（摩擦力 ≈ 速度に比例 → 指数減衰）
        speed *= Math.exp(-friction * dt);
        if (Math.abs(speed) < stopSpeed) speed = 0;
        render();
      }

      requestAnimationFrame(tick);
    };

    render();
    requestAnimationFrame(tick);
  }

  // Counters
  const standEl = document.getElementById("stand-seconds");
  let stood = 0;
  if (standEl && !reduceMotion) {
    setInterval(() => {
      stood += 1;
      standEl.textContent = String(stood);
    }, 1000);
  } else if (standEl) {
    standEl.textContent = "∞";
  }

  // 信徒数・いま立ってる人：リアルタイムで増減
  const believerEl = document.getElementById("believer-count");
  const standingEl = document.getElementById("standing-now");
  let believers = 12840;
  let standingNow = 318;

  const jitterStat = (current, min, max, step) => {
    const delta = Math.floor(Math.random() * (step * 2 + 1)) - step;
    return Math.max(min, Math.min(max, current + delta));
  };

  const formatNum = (n) => String(n);

  if (believerEl && standingEl && !reduceMotion) {
    setInterval(() => {
      believers = jitterStat(believers, 9000, 18000, 37);
      standingNow = jitterStat(standingNow, 80, 900, 11);
      believerEl.textContent = formatNum(believers);
      standingEl.textContent = formatNum(standingNow);
    }, 900 + Math.floor(Math.random() * 500));
  }

  // シークレット丘の住人（3人＋スーパー1人）— たまに1体だけ出現
  const gallerySection = document.querySelector(".gallery");
  const galleryLead = document.getElementById("gallery-lead");
  const secretResidents = [...document.querySelectorAll("[data-secret-resident]")];
  const superSecretResident = document.querySelector("[data-super-secret-resident]");
  const SECRET_CHANCE = testMode ? 0.15 : 0.22; // だいたい5回に1回くらい
  const SUPER_SECRET_CHANCE = testMode ? 0.95 : 0.04; // だいたい25回に1回くらい

  // いったん全員非表示（CSSの display:grid 対策も含め明示）
  [...secretResidents, superSecretResident].filter(Boolean).forEach((el) => {
    el.hidden = true;
    el.classList.remove("is-revealed", "is-visible");
  });

  const revealGalleryGuest = (pick, { superSecret = false } = {}) => {
    if (!pick) return;
    gallerySection?.classList.add(superSecret ? "is-super-secret-open" : "is-secret-open");
    if (galleryLead) {
      galleryLead.textContent = superSecret
        ? "……むげんはにわが、きょうだけ丘に立ってる。回し続けた人への手紙みたい。"
        : "ぽんこつ八人衆に、きょうはシークレットがひとりまざった。……見た？";
    }
    pick.hidden = false;
    requestAnimationFrame(() => {
      setTimeout(() => {
        pick.classList.add("is-revealed", "reveal", "is-visible");
      }, 160);
    });
  };

  if (superSecretResident && Math.random() < SUPER_SECRET_CHANCE) {
    revealGalleryGuest(superSecretResident, { superSecret: true });
  } else if (secretResidents.length && Math.random() < SECRET_CHANCE) {
    revealGalleryGuest(
      secretResidents[Math.floor(Math.random() * secretResidents.length)]
    );
  }

  // カードレール：ゆっくり自動ループ ＋ ドラッグ操作
  document.querySelectorAll(".card-rail").forEach((rail) => {
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;
    let paused = false;
    let resumeTimer = 0;
    let loopWidth = 0;
    let scrollCarry = 0; // 小数pxを蓄積（scrollLeftの切り捨て対策）
    const autoSpeed = 28; // px/sec

    // シームレスループ用に中身を複製
    const originals = [...rail.children];
    originals.forEach((child) => {
      const clone = child.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.classList.remove("reveal", "is-visible");
      clone.querySelectorAll(".reveal, .is-visible").forEach((el) => {
        el.classList.remove("reveal", "is-visible");
      });
      rail.appendChild(clone);
    });

    const measureLoop = () => {
      const first = rail.children[0];
      const mid = rail.children[originals.length];
      if (first && mid) {
        // 複製セット先頭までの距離＝1ループ幅（スクロール位置に依存しない）
        loopWidth = mid.getBoundingClientRect().left - first.getBoundingClientRect().left;
      } else {
        loopWidth = rail.scrollWidth / 2;
      }
      if (!Number.isFinite(loopWidth) || loopWidth < 8) {
        loopWidth = rail.scrollWidth / 2;
      }
    };
    measureLoop();
    requestAnimationFrame(measureLoop);
    window.addEventListener("resize", measureLoop);
    if ("ResizeObserver" in window) {
      new ResizeObserver(measureLoop).observe(rail);
    }

    const wrapScroll = () => {
      if (loopWidth <= 0) return;
      while (rail.scrollLeft >= loopWidth) {
        rail.scrollLeft -= loopWidth;
      }
      while (rail.scrollLeft < 0) {
        rail.scrollLeft += loopWidth;
      }
    };

    const pauseAuto = (ms = 0) => {
      paused = true;
      window.clearTimeout(resumeTimer);
      if (ms > 0) {
        resumeTimer = window.setTimeout(() => {
          if (!dragging) paused = false;
        }, ms);
      }
    };

    const resumeAuto = () => {
      window.clearTimeout(resumeTimer);
      if (!dragging) paused = false;
    };

    if (!reduceMotion) {
      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused && !dragging && loopWidth > 1) {
          // ブラウザは scrollLeft を整数化しがちなので、端数を持ち越す
          scrollCarry += autoSpeed * dt;
          const step = scrollCarry >= 1 ? Math.floor(scrollCarry) : 0;
          if (step > 0) {
            scrollCarry -= step;
            rail.scrollLeft += step;
            wrapScroll();
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // マウスホバー中だけ一時停止（タッチの pointerenter 取り残し防止）
    rail.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") pauseAuto();
    });
    rail.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && !dragging) resumeAuto();
    });
    rail.addEventListener(
      "touchstart",
      () => pauseAuto(0),
      { passive: true }
    );
    rail.addEventListener(
      "touchend",
      () => pauseAuto(1600),
      { passive: true }
    );
    rail.addEventListener(
      "touchcancel",
      () => pauseAuto(800),
      { passive: true }
    );

    rail.addEventListener("pointerdown", (e) => {
      // タッチはブラウザ標準の横スクロールに任せる
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      pauseAuto();
      rail.classList.add("is-dragging");
      try {
        rail.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    rail.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startScroll - dx;
      wrapScroll();
      startScroll = rail.scrollLeft;
      startX = e.clientX;
    });

    const endDragRail = () => {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove("is-dragging");
      pauseAuto(1400);
    };

    rail.addEventListener("pointerup", endDragRail);
    rail.addEventListener("pointercancel", endDragRail);
    rail.addEventListener("lostpointercapture", endDragRail);

    rail.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true
    );
  });

  // Ritual pad — たまに心が直立してない
  const pad = document.getElementById("ritual-pad");
  const ritualCount = document.getElementById("ritual-count");
  const ritualLabel = document.getElementById("ritual-label");
  const ritualMsg = document.getElementById("ritual-msg");
  const uprightLines = [
    "心のなかで、ちょっと直立できた。",
    "だれかと比べる手が、下がっていく。",
    "自分への「ゆるし」が、ひとつ増えた。",
    "くちびるの端が、はにわみたいに上がる。",
    "よし、きょうは土の温度ちょうどいい。",
    "右手、心のなかでちゃんと上がってる。",
  ];
  const wobblyLines = [
    "いま、かなりななめ。……まあ、はにわ。",
    "直立どころか、ころがりそう。休憩推奨。",
    "心がねむけはにわ化してる。あくびは罪じゃない。",
    "くらべぐせが顔を出して傾いた。気づいた時点で勝利。",
    "はらぺこでふらふら直立。まずおやつを検討せよ。",
    "びくびくが暴走中。「もしも」をいったん置く。",
    "てれすぎて正面を向けない。斜め立ち、暫定合格。",
    "考えが回りすぎて、心がくらくら。一回、座る。",
  ];
  const doneUpright = ["直立完了", "きょうも、やさしいはにわ", "合格。ゆるく立つ"];
  const doneWobbly = ["ななめ完了", "ふらふら合格", "傾き賞を受賞"];
  const doneUprightMsg = [
    "達成。きょうも、やさしいはにわ。",
    "五点満点の直立。丘がちょっと微笑んだ。",
  ];
  const doneWobblyMsg = [
    "最終診断：いまは直立してない。それでも、ここにいる。",
    "傾いたまま五回タッチ。それが今日の正直なはにわ。",
    "完了！……ただし心は少し斜め。明日また立てばいい。",
  ];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let taps = 0;
  let wobblyHits = 0;
  if (pad) {
    pad.addEventListener("click", () => {
      if (taps >= 5) return;
      taps += 1;
      // だいたい3回に1回は直立してない
      const isWobbly = Math.random() < 0.34;
      if (isWobbly) wobblyHits += 1;

      const line = isWobbly ? pick(wobblyLines) : pick(uprightLines);
      if (ritualCount) ritualCount.textContent = `${taps} / 5`;
      if (ritualMsg) {
        ritualMsg.textContent = line;
        ritualMsg.classList.toggle("is-wobbly", isWobbly);
      }

      pad.classList.remove("is-wobbly");
      // reflow して毎回ゆらす
      void pad.offsetWidth;
      if (isWobbly) pad.classList.add("is-wobbly");

      pad.animate(
        [
          { transform: isWobbly ? "rotate(0deg) scale(1)" : "scale(1)" },
          { transform: isWobbly ? "rotate(6deg) scale(1.05)" : "scale(1.06)" },
          { transform: isWobbly ? "rotate(0deg) scale(1)" : "scale(1)" },
        ],
        { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );

      if (taps >= 5) {
        // 傾きが多い／最後が傾き／たまにランダムで「直立してない完了」
        const endTilted = wobblyHits >= 2 || isWobbly || Math.random() < 0.28;
        pad.classList.add("is-done");
        pad.classList.toggle("is-tilted", endTilted);
        pad.classList.remove("is-wobbly");
        if (ritualLabel) {
          ritualLabel.textContent = endTilted ? pick(doneWobbly) : pick(doneUpright);
        }
        if (ritualMsg) {
          ritualMsg.textContent = endTilted ? pick(doneWobblyMsg) : pick(doneUprightMsg);
          ritualMsg.classList.toggle("is-wobbly", endTilted);
        }
      }
    });
  }

  // Join form + burst + やさしいことばの入力ガード
  const form = document.getElementById("join-form");
  const note = document.getElementById("form-note");
  const burstCanvas = document.getElementById("burst-canvas");
  const nameInput = document.getElementById("join-name");
  const vowInput = document.getElementById("join-vow");

  // スペース・記号除去＋ネットスラングを本語へ寄せて判定
  const normalizeSafe = (raw) => {
    let s = String(raw || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
      )
      .replace(/[\s\p{Z}\u200B-\u200D\uFEFF\u2060]/gu, "")
      .replace(
        /[・･.…‥.。,、\-–—―_/\\|｜_＿＊*★☆♪!！?？#＃@＠'"`~^+=（）()「」『』【】[\]{}<>＜＞]/g,
        ""
      );

    // タヒね／氏ね／基地外 など
    s = s
      .replace(/たひ/g, "し")
      .replace(/氏/g, "し")
      .replace(/死/g, "し")
      .replace(/逝/g, "し")
      .replace(/殺/g, "ころ")
      .replace(/基地外/g, "きちがい")
      .replace(/気違い|気狂い/g, "きちがい")
      .replace(/苛め|虐め|いぢめ/g, "いじめ")
      .replace(/晒/g, "さら")
      .replace(/えっち|ｴﾁ/g, "えろ")
      .replace(/ｈ(?=な|に)/g, "えろ")
      .replace(/h(?=な|に)/g, "えろ");

    return s;
  };

  const digitsOnly = (raw) => String(raw || "").normalize("NFKC").replace(/\D/g, "");

  const NG_WORDS = {
    vulgar: [
      "ちんこ",
      "ちんぽ",
      "まんこ",
      "おめこ",
      "うんこ",
      "うんち",
      "しっこ",
      "おしっこ",
      "セックス",
      "せっくす",
      "エロ",
      "えろ",
      "おっぱい",
      "ぱいぱい",
      "乳首",
      "ちくび",
      "ペニス",
      "ぺにす",
      "ヴァギナ",
      "ばぎな",
      "フェラ",
      "ふぇら",
      "オナニー",
      "おなにー",
      "マスターベーション",
      "やりまん",
      "やりちん",
      "ポルノ",
      "ぽるの",
      "ヌード",
      "ぬーど",
      "あなる",
      "アナル",
      "くそったれ",
      "fuck",
      "shit",
      "bitch",
      "dick",
      "pussy",
      "porn",
      "sex",
      "nude",
      "hentai",
    ],
    rude: [
      "ころす",
      "ころせ",
      "ころして",
      "しね",
      "しねよ",
      "しんで",
      "くたばれ",
      "ぶちころす",
      "しばく",
      "しばき",
      "刺すぞ",
      "銃で",
      "ばくはつ",
      "爆発",
      "テロ",
      "kill",
      "くそがき",
      "きちがい",
      "ばかやろう",
      "くそやろう",
      "のろい",
      "のろえ",
    ],
    bully: [
      "いじめ",
      "苛め",
      "いぢめ",
      "仲間はずれ",
      "仲間外れ",
      "のけもの",
      "村八分",
      "晒す",
      "さらす",
      "うざい",
      "きしょい",
      "きめえ",
      "きめぇ",
      "ぶす",
      "でぶ",
      "消えろ",
      "のろま",
      "がいじ",
      "部落",
      "在日",
      "チョン",
    ],
    harm: [
      "じさつ",
      "しにたい",
      "しんでしま",
      "きえたい",
      "りすとかっと",
      "りすか",
      "くびつり",
      "首つり",
      "オーバードーズ",
      "オーバドーズ",
    ],
    adult: [
      "たばこ",
      "タバコ",
      "煙草",
      "酒飲む",
      "さけのみ",
      "ビール",
      "日本酒",
      "焼酎",
      "大麻",
      "覚せい剤",
      "覚醒剤",
      "ドラッグ",
      "でらっぐ",
      "weed",
      "drug",
      "出会い系",
      "せふれ",
      "セフレ",
      "パパ活",
      "ぱぱかつ",
      "援助交際",
      "えんこう",
      "援交",
      "下着",
      "下着写真",
    ],
    personal: [
      "本名",
      "苗字",
      "名字",
      "住所",
      "じゅうしょ",
      "電話番号",
      "でんわばんごう",
      "携帯番号",
      "けいたい",
      "メールアドレス",
      "らいんid",
      "lineid",
      "ラインid",
      "ディスコード",
      "discord",
      "インスタ",
      "instagram",
      "学校名",
      "がっこうめい",
      "学年",
      "クラス",
      "出席番号",
      "パスワード",
      "pasuwado",
      "家の場所",
      "うちのばしょ",
    ],
  };

  const MSG = {
    vulgar: "そのことばは、丘ではつかえないよ。やさしいことばで書いてみて。",
    rude: "乱暴なことばはつかえないよ。はにわは、やわらかいことばで立つ。",
    bully: "だれかを傷つけることばは、はにわ教ではつかえないよ。",
    harm: "つらいときはひとりでかかえず、身近な大人や相談できる人に話してみてね。",
    adult: "やさしいことばの丘だから、その内容は入力できないよ。",
    personal: "本名・住所・連絡先・学校の情報は入れないでね。はにわネームでどうぞ。",
    empty: "空欄のままでは立てないよ。",
    short: "もうすこしことばを足してみて。",
    long: "文字数がおおすぎるよ。すこし短くしてみて。",
    rate: "ちょっと間をあけてから、もういちど立ててね。",
    other: "その内容は入力できないよ。やわらかいことばで書きなおしてみて。",
  };

  const looksPersonal = (raw, field) => {
    const t = String(raw || "").trim();
    const n = normalizeSafe(t);
    const d = digitsOnly(t);
    // スペースだけ除いた文字列（住所・学年など用）
    const spacedOut = t.replace(/[\s\p{Z}\u200B-\u200D\uFEFF]/gu, "");

    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(spacedOut)) return "personal";
    if (/(?:https?:\/\/|www\.)\S+/i.test(spacedOut)) return "personal";
    if (
      /(?:line|discord|instagram|tiktok|twitter|x)/i.test(n) &&
      /(?:id|アカウント|あかいんと)/.test(n)
    ) {
      return "personal";
    }
    // 郵便番号・電話（あいだのスペース／ハイフン付きも）
    if (/^\d{7}$/.test(d) && /(?:〒|郵便|都|道|府|県|市|区|町|村)/.test(t + n)) {
      return "personal";
    }
    if (/^0\d{9,10}$/.test(d)) return "personal";
    if (
      /(?:都|道|府|県|市|区|町|村|丁目|番地|号室|マンション|アパート|団地)/.test(spacedOut) &&
      /\d/.test(spacedOut)
    ) {
      return "personal";
    }
    if (/(?:都|道|府|県).{0,12}(?:市|区|町|村)/.test(spacedOut)) return "personal";
    if (/\d年\d組/.test(n) || /\d\s*年\s*\d\s*組/.test(t)) return "personal";

    // 本名っぽい漢字フルネーム（間のスペースあり／なし）
    if (
      field === "name" &&
      /^[一-龥々〆ヵヶ]+$/.test(spacedOut) &&
      spacedOut.length >= 3 &&
      spacedOut.length <= 6
    ) {
      return "personal";
    }
    // First Last の英語本名っぽいもの（間のスペース複数も）
    if (field === "name" && /^[A-Za-z]{2,12}(?:\s+[A-Za-z]{2,12})+$/.test(t)) {
      return "personal";
    }
    return null;
  };

  const findNgCategory = (raw, field) => {
    const t = String(raw || "").trim();
    if (!t) return "empty";
    if (field === "vow" && [...t].length > 40) return "long";
    if (field === "name" && [...t].length > 20) return "long";

    // 「ち ん こ」「い　じ　め」などもスペース除去後に判定
    const n = normalizeSafe(t);
    if (n.length < 2) return "short";

    const personalHit = looksPersonal(t, field);
    if (personalHit) return personalHit;

    for (const [cat, words] of Object.entries(NG_WORDS)) {
      for (const w of words) {
        const nw = normalizeSafe(w);
        if (nw && n.includes(nw)) return cat;
      }
    }
    return null;
  };

  const setFormNote = (text, isError = false) => {
    if (!note) return;
    note.textContent = text;
    note.classList.toggle("is-error", isError);
  };

  const burst = (x, y) => {
    if (!burstCanvas || reduceMotion) return;
    const ctx = burstCanvas.getContext("2d");
    const rect = burstCanvas.getBoundingClientRect();
    burstCanvas.width = rect.width * devicePixelRatio;
    burstCanvas.height = rect.height * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const lx = x - rect.left;
    const ly = y - rect.top;
    const bits = Array.from({ length: 42 }, () => ({
      x: lx,
      y: ly,
      vx: -4 + Math.random() * 8,
      vy: -6 + Math.random() * 3,
      r: 2 + Math.random() * 4,
      life: 1,
      color: Math.random() > 0.5 ? "#c48a58" : "#2f4636",
    }));

    const tick = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      let alive = false;
      bits.forEach((b) => {
        b.life -= 0.018;
        if (b.life <= 0) return;
        alive = true;
        b.vy += 0.12;
        b.x += b.vx;
        b.y += b.vy;
        ctx.globalAlpha = Math.max(0, b.life);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (alive) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const validateField = (input, field) => {
    if (!input) return true;
    const cat = findNgCategory(input.value, field);
    if (!cat) {
      input.setCustomValidity("");
      return true;
    }
    const msg = MSG[cat] || MSG.other;
    input.setCustomValidity(msg);
    setFormNote(msg, true);
    return false;
  };

  [nameInput, vowInput].forEach((input) => {
    if (!input) return;
    const field = input === nameInput ? "name" : "vow";
    input.addEventListener("input", () => {
      if (validateField(input, field) && note?.classList.contains("is-error")) {
        setFormNote("", false);
      }
    });
    input.addEventListener("blur", () => validateField(input, field));
  });

  if (form && note) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nameOk = validateField(nameInput, "name");
      const vowOk = validateField(vowInput, "vow");
      if (!nameOk || !vowOk) {
        form.reportValidity();
        return;
      }

      const name = String(nameInput?.value || "").trim();
      const vow = String(vowInput?.value || "").trim();
      if (!name || !vow) {
        setFormNote(MSG.empty, true);
        return;
      }

      setFormNote(
        `ようこそ、${name}よ。「${vow}」——ちかい、丘のみんなにもそっと届いたよ。`,
        false
      );
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        const r = btn.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
      }
      showVowOnHero(vow);
      form.reset();
      nameInput?.setCustomValidity("");
      vowInput?.setCustomValidity("");
    });
  }

  // はにわ診断（通常8体＋たまにシークレット）
  const TYPES = {
    sleepy: {
      id: "sleepy",
      name: "ねむけはにわ",
      src: "assets/resident-a.png",
      tag: "あくびも立派な直立",
      note: "まぶたが半分でも、心は立ってる。あくび回数、本日も優秀賞。",
      secret: false,
    },
    banzai: {
      id: "banzai",
      name: "ばんざいはにわ",
      src: "assets/resident-b.png",
      tag: "よろこびは両手で足りない",
      note: "うれしい理由がなくても、腕は上がる。空気を明るくする係、任命。",
      secret: false,
    },
    shy: {
      id: "shy",
      name: "てれはにわ",
      src: "assets/resident-c.png",
      tag: "正面は苦手。斜めが得意",
      note: "正面突破より斜めからのやさしさ。耳だけは、いつも開けてる。",
      secret: false,
    },
    doya: {
      id: "doya",
      name: "ドヤはにわ",
      src: "assets/resident-d.png",
      tag: "右手を上げると、なんとなく強い",
      note: "中身はふつう。でも右手を上げた瞬間、なぜか物語がはじまる。",
      secret: false,
    },
    dizzy: {
      id: "dizzy",
      name: "くらくらはにわ",
      src: "assets/resident-e.png",
      tag: "考えが回りすぎて、自分が回る",
      note: "アイデア運動会の主催者。回るほど、おもしろい景色が見えるタイプ。",
      secret: false,
    },
    hungry: {
      id: "hungry",
      name: "はらぺこはにわ",
      src: "assets/resident-f.png",
      tag: "ごはんまで、心がふらふら直立",
      note: "ごはん愛が強いのは才能。満ちたおなかは、やさしい世界への近道。",
      secret: false,
    },
    worry: {
      id: "worry",
      name: "びくびくはにわ",
      src: "assets/resident-g.png",
      tag: "「もしも」のコレクション係",
      note: "もしもを集めるのは、大事な人を想う力。先まわり上手のやさしいはにわ。",
      secret: false,
    },
    chill: {
      id: "chill",
      name: "のんびりはにわ",
      src: "assets/resident-h.png",
      tag: "急がない。それが最高のわざ",
      note: "風まかせ、腕もまかせ。急がない勇気は、立派な直立の一種。",
      secret: false,
    },
    shadow: {
      id: "shadow",
      name: "かげぼしはにわ",
      src: "assets/resident-secret-a.png",
      tag: "いるのに、いない。夕方だけ出勤",
      note: "レア出勤、おめでとう。影みたいにそっと支えてるタイプ、発掘された。",
      secret: true,
    },
    sparkle: {
      id: "sparkle",
      name: "きらきらはにわ",
      src: "assets/resident-secret-b.png",
      tag: "たまに光る。理由は非公開",
      note: "きょうの丘に、きらめき当選。理由は非公開だけど、かなりついてる。",
      secret: true,
    },
    night: {
      id: "night",
      name: "よるだけはにわ",
      src: "assets/resident-secret-c.png",
      tag: "夜勤の丘の番人。昼寝は権利",
      note: "夜の部の住人票、発行。昼寝は職務に含まれる。堂々とまぶたを閉じてよし。",
      secret: true,
    },
    mugen: {
      id: "mugen",
      name: "むげんはにわ",
      src: "assets/resident-secret-super.png",
      tag: "回し続けた人だけが、たまに会える",
      note: "スーパーシークレット当選。星の目が開いた。……まだ先があるってことだよ。",
      secret: true,
      superSecret: true,
    },
  };

  const SECRET_KEYS = ["shadow", "sparkle", "night"];
  const SUPER_SECRET_KEY = "mugen";
  const DIAGNOSE_SECRET_CHANCE = testMode ? 0.1 : 0.14; // だいたい7回に1回くらい
  const DIAGNOSE_SUPER_SECRET_CHANCE = testMode ? 0.85 : 0.03; // さらにレア
  const QUIZ_LEN = 4;

  // 設問プール15問（ここから毎回ランダムで4問）／答えは前向きユーモア
  const diagnoseQuestionPool = [
    {
      q: "朝、目がさめたときの心の姿勢は？",
      choices: [
        { text: "あくびでウォームアップ。ゆるく始動が得意", scores: { sleepy: 2, chill: 1 } },
        { text: "心の右手だけ先にバンザイして開店", scores: { doya: 2, banzai: 1 } },
        { text: "きょうのたのしみを、先に三つ思い出す", scores: { worry: 2, dizzy: 1 } },
        { text: "おなかが「おはよう」を一番に言ってる", scores: { hungry: 2, sleepy: 1 } },
      ],
    },
    {
      q: "ちょっとうれしいことがあったとき？",
      choices: [
        { text: "よろこびが腕からあふれて、二本じゃ足りない", scores: { banzai: 2, doya: 1 } },
        { text: "内心お祭り。てれ隠しに斜めスマイル", scores: { shy: 2, chill: 1 } },
        { text: "うれしさを分解して、味わい尽くす係", scores: { dizzy: 2, worry: 1 } },
        { text: "ごほうびのごはんパーティーが頭に浮かぶ", scores: { hungry: 2, banzai: 1 } },
      ],
    },
    {
      q: "友だちに急に話しかけられたとき？",
      choices: [
        { text: "斜めからのやさしい距離感でこたえる", scores: { shy: 2, sleepy: 1 } },
        { text: "なんとなく頼もしい返事をプレゼント", scores: { doya: 2, banzai: 1 } },
        { text: "相手が話しやすい言葉を、ていねいに選ぶ", scores: { worry: 2, shy: 1 } },
        { text: "「うん」をあたたかく、ゆっくり届ける", scores: { chill: 2, sleepy: 1 } },
      ],
    },
    {
      q: "ごはんまでの待ち時間、なにをしてる？",
      choices: [
        { text: "ねむけとじゃんけんしつつ、ごきげん直立", scores: { sleepy: 2, chill: 1 } },
        { text: "頭の中で献立フェスが開幕してる", scores: { dizzy: 2, hungry: 1 } },
        { text: "おなかの音が、たのしみのカウントダウン", scores: { hungry: 2, worry: 1 } },
        { text: "「まだかな」を楽しむのが上手", scores: { chill: 2, banzai: 1 } },
      ],
    },
    {
      q: "雨の日の気分は？",
      choices: [
        { text: "ぬくぬく勝ち。まぶたが優勝候補", scores: { sleepy: 2, chill: 1 } },
        { text: "水たまり発見で、なぜか祝勝会", scores: { banzai: 2, doya: 1 } },
        { text: "かさも予報も準備OK。安心が好き", scores: { worry: 2, dizzy: 1 } },
        { text: "雨音BGMで、ぼんやりご褒美タイム", scores: { chill: 2, shy: 1 } },
      ],
    },
    {
      q: "ほめられたときのリアクションは？",
      choices: [
        { text: "てれ熱で視線が斜めににじむ。幸せサイン", scores: { shy: 2, sleepy: 1 } },
        { text: "「まあね」顔。右手だけが正直に上がる", scores: { doya: 2, banzai: 1 } },
        { text: "ほめ言葉を大事に、頭の中でリピート再生", scores: { dizzy: 2, worry: 1 } },
        { text: "よろこびが腕を増設したがる", scores: { banzai: 2, hungry: 1 } },
      ],
    },
    {
      q: "休日の理想的な過ごし方は？",
      choices: [
        { text: "二度寝を、国の文化財にする", scores: { sleepy: 2, chill: 1 } },
        { text: "予定ゼロを守る、プロののんびり", scores: { chill: 2, shy: 1 } },
        { text: "おやつ遠征。目的地はだいたい冷蔵庫", scores: { hungry: 2, banzai: 1 } },
        { text: "たのしみ予定をたくさん並べてワクワク回転", scores: { dizzy: 2, banzai: 1 } },
      ],
    },
    {
      q: "だれかと意見がちがうとき？",
      choices: [
        { text: "三秒はにわ立ち。おだやかな空気を待つ", scores: { chill: 2, shy: 1 } },
        { text: "みんな気持ちよくなれる着地を探す", scores: { worry: 2, dizzy: 1 } },
        { text: "斜めからのやさしい聞き役にまわる", scores: { shy: 2, chill: 1 } },
        { text: "自分の考えを、はっきりやさしく伝える", scores: { doya: 2, banzai: 1 } },
      ],
    },
    {
      q: "夜、ねる前のひとことは？",
      choices: [
        { text: "きょうも立てたな。あくびでおやすみ賞", scores: { sleepy: 2, chill: 1 } },
        { text: "あしたのたのしみを、ふとんにしまっておく", scores: { worry: 2, chill: 1 } },
        { text: "夜ごはんの余韻でふらふら幸福", scores: { hungry: 2, sleepy: 1 } },
        { text: "布団の中で、心だけばんざい", scores: { banzai: 2, doya: 1 } },
      ],
    },
    {
      q: "自分を一言で表すなら？",
      choices: [
        { text: "アイデア回転系。頭の中はいつもフェス", scores: { dizzy: 2, banzai: 1 } },
        { text: "ゆるい。でも土台はちゃんとある", scores: { chill: 2, sleepy: 1 } },
        { text: "てれ上手。応援はかげから配送プロ", scores: { shy: 2, chill: 1 } },
        { text: "なんとなく頼もしい枠（中はあたたかい）", scores: { doya: 2, banzai: 1 } },
      ],
    },
    {
      q: "写真を撮られるとき、どうする？",
      choices: [
        { text: "斜めポーズが得意技。自然体でかわいい", scores: { shy: 2, chill: 1 } },
        { text: "右手上げて、なんとなく主役感", scores: { doya: 2, banzai: 1 } },
        { text: "ねむけスマイル。ゆるさが写るタイプ", scores: { sleepy: 2, chill: 1 } },
        { text: "いちばんいい笑顔角度を、研究してから勝負", scores: { dizzy: 2, doya: 1 } },
      ],
    },
    {
      q: "おやつの選び方は？",
      choices: [
        { text: "選ぶ時間が、すでにおやつ時間", scores: { dizzy: 2, hungry: 1 } },
        { text: "見た瞬間に心がばんざいしたら勝ち", scores: { banzai: 2, hungry: 1 } },
        { text: "みんなで分けやすいものを優先する", scores: { worry: 2, shy: 1 } },
        { text: "近くにあるものに、感謝して出会う", scores: { chill: 2, sleepy: 1 } },
      ],
    },
    {
      q: "友だちの話を聞いたとき？",
      choices: [
        { text: "アドバイスより、耳をフル開花", scores: { shy: 2, chill: 1 } },
        { text: "一緒に小さくばんざいして元気を足す", scores: { banzai: 2, doya: 1 } },
        { text: "やさしいひと言を、じっくり探す", scores: { worry: 2, dizzy: 1 } },
        { text: "「だいじょうぶだよ」を、ゆっくり届ける", scores: { chill: 2, sleepy: 1 } },
      ],
    },
    {
      q: "急いでる人を見たときの気持ちは？",
      choices: [
        { text: "自分は急がない係。風に任命されてる", scores: { chill: 2, sleepy: 1 } },
        { text: "いってらっしゃいの気もちで見守る", scores: { worry: 2, shy: 1 } },
        { text: "応援の気持ちで、心のなか右手上げ", scores: { doya: 2, banzai: 1 } },
        { text: "元気そうでえらい。自分はおやつを想う", scores: { hungry: 2, chill: 1 } },
      ],
    },
    {
      q: "丘の上でいちばん大事なことは？",
      choices: [
        { text: "くらべない。みんな違って、みんな土", scores: { chill: 2, shy: 1 } },
        { text: "笑うこと。くちびるの端をちょっと上げる", scores: { banzai: 2, doya: 1 } },
        { text: "ゆるすこと。ヒビも味のうち", scores: { shy: 2, worry: 1 } },
        { text: "まず立つこと。あくび付きでも立派", scores: { sleepy: 2, doya: 1 } },
      ],
    },
  ];

  const diagnoseStart = document.getElementById("diagnose-start");
  const diagnoseQuiz = document.getElementById("diagnose-quiz");
  const diagnoseResult = document.getElementById("diagnose-result");
  const diagnoseBegin = document.getElementById("diagnose-begin");
  const diagnoseRetry = document.getElementById("diagnose-retry");
  const diagnoseProgress = document.getElementById("diagnose-progress");
  const diagnoseQuestion = document.getElementById("diagnose-question");
  const diagnoseChoices = document.getElementById("diagnose-choices");
  const resultArt = document.getElementById("diagnose-result-art");
  const resultName = document.getElementById("diagnose-result-name");
  const resultTag = document.getElementById("diagnose-result-tag");
  const resultNote = document.getElementById("diagnose-result-note");
  const resultLabel = document.getElementById("diagnose-result-label");
  const resultYou = document.getElementById("diagnose-result-you");
  const secretBadge = document.getElementById("diagnose-secret-badge");
  const diagnoseSparkles = document.getElementById("diagnose-sparkles");
  const diagnosePanel = document.getElementById("diagnose-panel");

  let diagnoseIndex = 0;
  let diagnoseScores = {};
  let activeQuestions = [];

  const shuffle = (list) => {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  };

  const resetDiagnoseScores = () => {
    diagnoseScores = {
      sleepy: 0,
      banzai: 0,
      shy: 0,
      doya: 0,
      dizzy: 0,
      hungry: 0,
      worry: 0,
      chill: 0,
    };
  };

  const showDiagnoseView = (view) => {
    if (diagnoseStart) diagnoseStart.hidden = view !== "start";
    if (diagnoseQuiz) diagnoseQuiz.hidden = view !== "quiz";
    if (diagnoseResult) diagnoseResult.hidden = view !== "result";
  };

  const pickWinner = () => {
    // ごくまれにスーパーシークレット、たまにシークレット（設問とは別抽選）
    if (Math.random() < DIAGNOSE_SUPER_SECRET_CHANCE) {
      return SUPER_SECRET_KEY;
    }
    if (Math.random() < DIAGNOSE_SECRET_CHANCE) {
      return SECRET_KEYS[Math.floor(Math.random() * SECRET_KEYS.length)];
    }

    let best = -1;
    const winners = [];
    Object.keys(diagnoseScores).forEach((key) => {
      const s = diagnoseScores[key];
      if (s > best) {
        best = s;
        winners.length = 0;
        winners.push(key);
      } else if (s === best) {
        winners.push(key);
      }
    });
    return winners[Math.floor(Math.random() * winners.length)] || "chill";
  };

  const fillSparkles = () => {
    if (!diagnoseSparkles) return;
    diagnoseSparkles.innerHTML = "";
    for (let i = 0; i < 14; i += 1) {
      const dot = document.createElement("span");
      dot.style.left = `${8 + Math.random() * 84}%`;
      dot.style.top = `${10 + Math.random() * 70}%`;
      dot.style.animationDelay = `${Math.random() * 1.4}s`;
      dot.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
      diagnoseSparkles.appendChild(dot);
    }
  };

  const renderDiagnoseQuestion = () => {
    const item = activeQuestions[diagnoseIndex];
    if (!item || !diagnoseQuestion || !diagnoseChoices || !diagnoseProgress) return;
    diagnoseProgress.textContent = `${diagnoseIndex + 1} / ${activeQuestions.length}`;
    diagnoseQuestion.textContent = item.q;
    diagnoseChoices.innerHTML = "";
    item.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "diagnose-choice";
      btn.textContent = choice.text;
      btn.addEventListener("click", () => {
        Object.entries(choice.scores).forEach(([key, val]) => {
          diagnoseScores[key] = (diagnoseScores[key] || 0) + val;
        });
        diagnoseIndex += 1;
        if (diagnoseIndex >= activeQuestions.length) {
          showDiagnoseResult();
        } else {
          renderDiagnoseQuestion();
        }
      });
      diagnoseChoices.appendChild(btn);
    });
  };

  const showDiagnoseResult = () => {
    const key = pickWinner();
    const type = TYPES[key];
    if (!type) return;
    const isSecret = Boolean(type.secret);
    const isSuper = Boolean(type.superSecret);

    if (diagnoseResult) {
      diagnoseResult.classList.toggle("is-secret", isSecret);
      diagnoseResult.classList.toggle("is-super-secret", isSuper);
    }
    if (diagnosePanel) {
      diagnosePanel.classList.toggle("is-secret-result", isSecret);
      diagnosePanel.classList.toggle("is-super-secret-result", isSuper);
    }
    if (secretBadge) {
      secretBadge.hidden = !isSecret;
      secretBadge.textContent = isSuper ? "SUPER SECRET" : "SECRET";
    }
    if (resultLabel) {
      resultLabel.textContent = isSuper
        ? "スーパーシークレット診断結果"
        : isSecret
          ? "シークレット診断結果"
          : "診断結果";
    }
    if (resultYou) {
      resultYou.textContent = isSuper
        ? "なんとなんと、あなたは"
        : isSecret
          ? "なんと、あなたは"
          : "あなたは";
    }
    if (resultArt) {
      resultArt.src = type.src;
      resultArt.alt = type.name;
    }
    if (resultName) resultName.textContent = type.name;
    if (resultTag) resultTag.textContent = type.tag;
    if (resultNote) resultNote.textContent = type.note;
    if (isSecret) fillSparkles();
    else if (diagnoseSparkles) diagnoseSparkles.innerHTML = "";

    showDiagnoseView("result");
  };

  const startDiagnose = () => {
    diagnoseIndex = 0;
    resetDiagnoseScores();
    activeQuestions = shuffle(diagnoseQuestionPool).slice(0, QUIZ_LEN);
    if (diagnoseResult) {
      diagnoseResult.classList.remove("is-secret", "is-super-secret");
    }
    if (diagnosePanel) {
      diagnosePanel.classList.remove("is-secret-result", "is-super-secret-result");
    }
    if (secretBadge) {
      secretBadge.hidden = true;
      secretBadge.textContent = "SECRET";
    }
    if (resultLabel) resultLabel.textContent = "診断結果";
    if (resultYou) resultYou.textContent = "あなたは";
    if (diagnoseSparkles) diagnoseSparkles.innerHTML = "";
    showDiagnoseView("quiz");
    renderDiagnoseQuestion();
  };

  if (diagnoseBegin) {
    diagnoseBegin.addEventListener("click", startDiagnose);
  }
  if (diagnoseRetry) {
    diagnoseRetry.addEventListener("click", startDiagnose);
  }
})();
