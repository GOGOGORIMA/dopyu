/**
 * Recommendation (affiliate) slots. Replace `url` / texts with real affiliate links before going live.
 * Links open in a new tab with rel="sponsored noopener noreferrer" and are labelled "PR".
 */
export type AffiliateSlot = "cooldown" | "endurance" | "okazu";

export type AffiliateAd = {
  /** Small label above the title */
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  url: string;
};

/** Separate links and copy per UI language (ja: Japanese users, en: English-speaking users). */
export const AFFILIATES: Record<"ja" | "en", Record<AffiliateSlot, AffiliateAd>> = {
  ja: {
  // Shown on the stopwatch screen during the 30-minute cooldown ("賢者タイム")
  cooldown: {
    eyebrow: "賢者タイムのおともに",
    title: "賢者タイム短縮・明日の活力チャージに【必須ミネラル・亜鉛サプリ】",
    description: "毎日の栄養補給に。人気の亜鉛サプリをチェック",
    cta: "詳しく見る",
    url: "https://example.com/affiliate/zinc",
  },
  // Shown on the completion message when the measurement was under 180 seconds
  endurance: {
    eyebrow: "ヘルスケア",
    title: "もっと長く楽しみたい方へ【持久力トレーニング・ヘルスケア】",
    description: "トレーニング器具・ヘルスケア用品の人気アイテム",
    cta: "詳しく見る",
    url: "https://example.com/affiliate/endurance",
  },
  // Shown under the stopwatch and under the okazu ranking on My Page
  okazu: {
    eyebrow: "今日のおかず探し",
    title: "今日のおかずを探す【話題の人気ランキング・新作チェック】",
    description: "話題作・新作を人気ランキングからチェック",
    cta: "ランキングを見る",
    url: "https://example.com/affiliate/okazu",
  },
  },
  en: {
    cooldown: {
      eyebrow: "Post-nut recovery",
      title: "Recharge faster: Zinc & Vitality Supplements",
      description: "Top-rated zinc and men's vitality supplements",
      cta: "Check it out",
      url: "https://example.com/affiliate/en/vitality",
    },
    endurance: {
      eyebrow: "Health & fitness",
      title: "Last longer: Stamina Training & Pelvic Floor Gear",
      description: "Popular stamina trainers and wellness products",
      cta: "Check it out",
      url: "https://example.com/affiliate/en/stamina",
    },
    okazu: {
      eyebrow: "Today's sauce",
      title: "Trending Sauce: What's hot this week",
      description: "Browse the top-ranked and newest picks",
      cta: "See the ranking",
      url: "https://example.com/affiliate/en/trending",
    },
  },
};
