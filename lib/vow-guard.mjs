/** サーバー／クライアント共用のちかいガード（長さ・NG・個人情報） */

export const VOW_MAX_LEN = 40;
export const VOW_MIN_LEN = 2;
export const NAME_MAX_LEN = 20;

const NG_WORDS = {
  vulgar: [
    "ちんこ", "ちんぽ", "まんこ", "おめこ", "うんこ", "うんち", "しっこ", "おしっこ",
    "セックス", "せっくす", "エロ", "えろ", "おっぱい", "ぱいぱい", "乳首", "ちくび",
    "ペニス", "ぺにす", "ヴァギナ", "ばぎな", "フェラ", "ふぇら", "オナニー", "おなにー",
    "マスターベーション", "やりまん", "やりちん", "ポルノ", "ぽるの", "ヌード", "ぬーど",
    "あなる", "アナル", "くそったれ", "fuck", "shit", "bitch", "dick", "pussy",
    "porn", "sex", "nude", "hentai",
  ],
  rude: [
    "ころす", "ころせ", "ころして", "しね", "しねよ", "しんで", "くたばれ", "ぶちころす",
    "しばく", "しばき", "刺すぞ", "銃で", "ばくはつ", "爆発", "テロ", "kill",
    "くそがき", "きちがい", "ばかやろう", "くそやろう", "のろい", "のろえ",
  ],
  bully: [
    "いじめ", "苛め", "いぢめ", "仲間はずれ", "仲間外れ", "のけもの", "村八分",
    "晒す", "さらす", "うざい", "きしょい", "きめえ", "きめぇ", "ぶす", "でぶ",
    "消えろ", "のろま", "がいじ", "部落", "在日", "チョン",
  ],
  harm: [
    "じさつ", "しにたい", "しんでしま", "きえたい", "りすとかっと", "りすか",
    "くびつり", "首つり", "オーバードーズ", "オーバドーズ",
  ],
  adult: [
    "たばこ", "タバコ", "煙草", "酒飲む", "さけのみ", "ビール", "日本酒", "焼酎",
    "大麻", "覚せい剤", "覚醒剤", "ドラッグ", "でらっぐ", "weed", "drug",
    "出会い系", "せふれ", "セフレ", "パパ活", "ぱぱかつ", "援助交際", "えんこう",
    "援交", "下着", "下着写真",
  ],
  personal: [
    "本名", "苗字", "名字", "住所", "じゅうしょ", "電話番号", "でんわばんごう",
    "携帯番号", "けいたい", "メールアドレス", "らいんid", "lineid", "ラインid",
    "ディスコード", "discord", "インスタ", "instagram", "学校名", "がっこうめい",
    "学年", "クラス", "出席番号", "パスワード", "pasuwado", "家の場所", "うちのばしょ",
  ],
};

export const MSG = {
  vulgar: "そのことばは、丘ではつかえないよ。やさしいことばで書いてみて。",
  rude: "乱暴なことばはつかえないよ。はにわは、やわらかいことばで立つ。",
  bully: "だれかを傷つけることばは、はにわ教ではつかえないよ。",
  harm: "つらいときはひとりでかかえず、身近な大人や相談できる人に話してみてね。",
  adult: "やさしいことばの丘だから、その内容は入力できないよ。",
  personal: "本名・住所・連絡先・学校の情報は入れないでね。はにわネームでどうぞ。",
  empty: "空欄のままでは立てないよ。",
  short: "もうすこしことばを足してみて。",
  long: "ちかいは40文字までだよ。",
  longName: "おなまえは20文字までだよ。",
  rate: "ちょっと間をあけてから、もういちど立ててね。",
  duplicate: "おなじちかいは、もう丘にあるよ。ことばをすこし変えてみて。",
  forbidden: "この場所からは立てられないみたい。サイトからもういちどどうぞ。",
  other: "その内容は入力できないよ。やわらかいことばで書きなおしてみて。",
};

export const normalizeSafe = (raw) => {
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

const looksPersonal = (raw, field = "vow") => {
  const t = String(raw || "").trim();
  const n = normalizeSafe(t);
  const d = digitsOnly(t);
  const spacedOut = t.replace(/[\s\p{Z}\u200B-\u200D\uFEFF]/gu, "");

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(spacedOut)) return "personal";
  if (/(?:https?:\/\/|www\.)\S+/i.test(spacedOut)) return "personal";
  if (
    /(?:line|discord|instagram|tiktok|twitter|x)/i.test(n) &&
    /(?:id|アカウント|あかいんと)/.test(n)
  ) {
    return "personal";
  }
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

  if (
    field === "name" &&
    /^[一-龥々〆ヵヶ]+$/.test(spacedOut) &&
    spacedOut.length >= 3 &&
    spacedOut.length <= 6
  ) {
    return "personal";
  }
  if (field === "name" && /^[A-Za-z]{2,12}(?:\s+[A-Za-z]{2,12})+$/.test(t)) {
    return "personal";
  }
  return null;
};

/** @param {string} raw @param {"vow"|"name"} [field] */
export const findNgCategory = (raw, field = "vow") => {
  const t = String(raw || "").trim();
  if (!t) return "empty";
  if (field === "vow" && [...t].length > VOW_MAX_LEN) return "long";
  if (field === "name" && [...t].length > NAME_MAX_LEN) return "longName";

  const n = normalizeSafe(t);
  if (n.length < VOW_MIN_LEN) return "short";

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

export const validateVow = (raw) => {
  const vow = String(raw || "").trim();
  const cat = findNgCategory(vow, "vow");
  if (cat) {
    return { ok: false, error: cat, message: MSG[cat] || MSG.other };
  }
  return { ok: true, vow };
};
