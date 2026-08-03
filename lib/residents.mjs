/** 丘の住人データ（八人衆・発掘・シークレット） */

export const MAIN8 = [
  {
    id: "sleepy",
    name: "ねむけはにわ",
    oneLiner: "あくびも立派な直立",
    assetBase: "assets/resident-a",
  },
  {
    id: "banzai",
    name: "ばんざいはにわ",
    oneLiner: "よろこびは両手で足りない",
    assetBase: "assets/resident-b",
  },
  {
    id: "shy",
    name: "てれはにわ",
    oneLiner: "正面は休職中。斜めからこんにちは",
    assetBase: "assets/resident-c",
  },
  {
    id: "doya",
    name: "ドヤはにわ",
    oneLiner: "右手を上げると、なんとなく強い",
    assetBase: "assets/resident-d",
  },
  {
    id: "dizzy",
    name: "くらくらはにわ",
    oneLiner: "考えが回りすぎて、自分が回る",
    assetBase: "assets/resident-e",
  },
  {
    id: "hungry",
    name: "はらぺこはにわ",
    oneLiner: "ごはん前は、直立もすこし傾く",
    assetBase: "assets/resident-f",
  },
  {
    id: "worry",
    name: "びくびくはにわ",
    oneLiner: "「もしも」のコレクション係",
    assetBase: "assets/resident-g",
  },
  {
    id: "chill",
    name: "のんびりはにわ",
    oneLiner: "急がない。それがはにわの奥義",
    assetBase: "assets/resident-h",
  },
];

/** 通常発掘枠（ガチャ IN） */
export const DIG_NORMAL = [
  {
    id: "utouto",
    name: "うとうとはにわ",
    oneLiner: "まぶたの開閉が、本日の業務",
    assetBase: "assets/resident-dig-utouto",
  },
  {
    id: "nobinobi",
    name: "のびのびはにわ",
    oneLiner: "腕も心も、のびしろ全開",
    assetBase: "assets/resident-dig-nobinobi",
  },
  {
    id: "pokapoka",
    name: "ぽかぽかはにわ",
    oneLiner: "体温だけで空気がやさしい",
    assetBase: "assets/resident-dig-pokapoka",
  },
  {
    id: "mojimoji",
    name: "もじもじはにわ",
    oneLiner: "あいさつより先に、指がもじもじ",
    assetBase: "assets/resident-dig-mojimoji",
  },
  {
    id: "fuwafuwa",
    name: "ふわふわはにわ",
    oneLiner: "重力と、いま仲なおり中",
    assetBase: "assets/resident-dig-fuwafuwa",
  },
  {
    id: "kusukusu",
    name: "くすくすはにわ",
    oneLiner: "小さな笑いの発電所",
    assetBase: "assets/resident-dig-kusukusu",
  },
  {
    id: "bonyari",
    name: "ぼんやりはにわ",
    oneLiner: "焦点は遠い。やさしさは近い",
    assetBase: "assets/resident-dig-bonyari",
  },
  {
    id: "chokochoko",
    name: "ちょこちょこはにわ",
    oneLiner: "小さな用事で、一日は満席",
    assetBase: "assets/resident-dig-chokochoko",
  },
  {
    id: "shizushizu",
    name: "しずしずはにわ",
    oneLiner: "足音より、気配が先に来る",
    assetBase: "assets/resident-dig-shizushizu",
  },
  {
    id: "munyamunya",
    name: "むにゃむにゃはにわ",
    oneLiner: "夢の続きを、直立しながら再生中",
    assetBase: "assets/resident-dig-munyamunya",
  },
  {
    id: "howahowa",
    name: "ほわほわはにわ",
    oneLiner: "輪郭ふわふわ係。角は持ちません",
    assetBase: "assets/resident-dig-howahowa",
  },
  {
    id: "guutara",
    name: "ぐうたらはにわ",
    oneLiner: "がんばらない職人。認定済",
    assetBase: "assets/resident-dig-guutara",
  },
  {
    id: "soyosoyo",
    name: "そよそよはにわ",
    oneLiner: "風の通訳。翻訳料は笑顔",
    assetBase: "assets/resident-dig-soyosoyo",
  },
  {
    id: "pakupaku",
    name: "ぱくぱくはにわ",
    oneLiner: "おやつの時間を、全力で守る",
    assetBase: "assets/resident-dig-pakupaku",
  },
  {
    id: "nikoniko",
    name: "にこにこはにわ",
    oneLiner: "口角だけ、先に出勤してる",
    assetBase: "assets/resident-dig-nikoniko",
  },
  {
    id: "urouro",
    name: "うろうろはにわ",
    oneLiner: "目的地より、道のほうが好き",
    assetBase: "assets/resident-dig-urouro",
  },
];

/** シークレット（ガチャ低確率） */
export const DIG_SECRETS = [
  {
    id: "shadow",
    name: "かげぼしはにわ",
    oneLiner: "いるのに、いない。夕方だけ出勤",
    assetBase: "assets/resident-secret-a",
    rate: 0.012,
  },
  {
    id: "sparkle",
    name: "きらきらはにわ",
    oneLiner: "たまに光る。理由は非公開",
    assetBase: "assets/resident-secret-b",
    rate: 0.012,
  },
  {
    id: "night",
    name: "よるだけはにわ",
    oneLiner: "夜勤の丘の番人。昼寝は権利",
    assetBase: "assets/resident-secret-c",
    rate: 0.012,
  },
];

/** スーパー（ガチャ対象外・スピンのみ） */
export const MUGEN = {
  id: "mugen",
  name: "むげんはにわ",
  oneLiner: "回し続けた人だけが、たまに会える",
  assetBase: "assets/resident-secret-super",
  superSecret: true,
};

/** 図鑑に並ぶ発掘枠（通常16＋シークレット3＋むげん1） */
export const ZUKAN_RESIDENTS = [...DIG_NORMAL, ...DIG_SECRETS, MUGEN];

export const ZUKAN_BY_ID = Object.fromEntries(
  ZUKAN_RESIDENTS.map((r) => [r.id, r])
);

/**
 * 図鑑番号ラベル
 * - 通常発掘: No.01–No.16（配列順）
 * - シークレット: No.S01–（別枠・独自番号）
 * - むげん: スーパーシークレット（通常／シークレットのどちらの連番にも入らない）
 */
export function catalogLabel(residentOrId) {
  const id =
    typeof residentOrId === "string" ? residentOrId : residentOrId?.id;
  if (!id) return "No.??";
  if (id === MUGEN.id || residentOrId?.superSecret) return "スーパーシークレット";
  const secretIdx = DIG_SECRETS.findIndex((r) => r.id === id);
  if (secretIdx >= 0) {
    return `No.S${String(secretIdx + 1).padStart(2, "0")}`;
  }
  const normalIdx = DIG_NORMAL.findIndex((r) => r.id === id);
  if (normalIdx >= 0) {
    return `No.${String(normalIdx + 1).padStart(2, "0")}`;
  }
  return "No.??";
}

/** 図鑑セクション定義（表示順） */
export const ZUKAN_SECTIONS = [
  {
    key: "normal",
    title: "いつもの発掘",
    lead: "丘を掘れば、だいたいこの顔たち。掘るたび、はじめましてが増える。",
    residents: DIG_NORMAL,
  },
  {
    key: "secret",
    title: "シークレット",
    lead: "照れ屋な丘の住人たち、会えたら右手を高く上げよう。",
    residents: DIG_SECRETS,
  },
  {
    key: "extra",
    title: "スーパーシークレット",
    lead: "むげんはにわは、ガチャには出ない——回し続けた先にだけ。",
    residents: [MUGEN],
  },
];

/** face-swap の asset base → 図鑑 id */
export const FACE_BASE_TO_ZUKAN_ID = {
  "assets/resident-secret-a": "shadow",
  "assets/resident-secret-b": "sparkle",
  "assets/resident-secret-c": "night",
  "assets/resident-secret-super": "mugen",
};

export const SECRET_TOTAL_RATE = DIG_SECRETS.reduce((s, r) => s + r.rate, 0);

export function assetPaths(base) {
  return {
    png: `${base}.png`,
    webp: `${base}.webp`,
    srcset320: `${base}-320.webp 320w`,
    srcset512: `${base}-512.webp 512w`,
  };
}
