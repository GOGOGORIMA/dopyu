/**
 * Recommendation (affiliate) slots. Replace `url` / texts with real affiliate links before going live.
 * Links open in a new tab with rel="sponsored noopener noreferrer" and are labelled "PR" (top-right badge).
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

/**
 * Copy rules (Japanese 薬機法 / 景品表示法 incl. the 2023 stealth-marketing rule, and the FTC rules for English):
 *   - No medical or efficacy claims: nothing like "increases semen volume", "treats / cures / improves",
 *     "boosts stamina", "shortens recovery", "lasts longer" (enforced by src/config/affiliates.test.ts).
 *   - Use neutral wording such as 「日々のコンディション維持・栄養補給に」「メンズヘルスケアサポート」.
 *   - Every card is visibly marked as an ad ("PR" badge, top right) and links use rel="sponsored".
 * Separate links and copy per UI language (ja: Japanese users, en: English-speaking users).
 */
export const AFFILIATES: Record<"ja" | "en", Record<AffiliateSlot, AffiliateAd>> = {
  ja: {
    // Shown on the stopwatch screen during the 30-minute cooldown
    cooldown: {
      eyebrow: "栄養補給",
      title: "日々のコンディション維持・栄養補給に【亜鉛・マルチミネラル】",
      description: "食生活で不足しがちな栄養素を手軽に。※食品であり、効果・効能を示すものではありません",
      cta: "詳しく見る",
      url: "https://example.com/affiliate/zinc",
    },
    // Shown on the completion message when the measurement was under 180 seconds
    endurance: {
      eyebrow: "メンズヘルスケア",
      title: "メンズヘルスケアサポート【フィットネス・セルフケア用品】",
      description: "毎日の運動習慣やセルフケアに。人気のフィットネス・ケア用品をチェック",
      cta: "詳しく見る",
      url: "https://example.com/affiliate/endurance",
    },
    // Shown under the stopwatch and under the okazu ranking on My Page
    okazu: {
      eyebrow: "今日のおかず探し",
      title: "今日のおかず探しに【話題の人気ランキング・新作チェック】",
      description: "話題作・新作を人気ランキングからチェック",
      cta: "ランキングを見る",
      url: "https://example.com/affiliate/okazu",
    },
  },
  en: {
    cooldown: {
      eyebrow: "Nutrition",
      title: "Everyday Nutrition Support: Zinc & Multi-Minerals",
      description: "An easy way to fill everyday nutritional gaps. A food supplement, not a medicine; no health claims are made.",
      cta: "Check it out",
      url: "https://example.com/affiliate/en/nutrition",
    },
    endurance: {
      eyebrow: "Men's healthcare",
      title: "Men's Healthcare Support: Fitness & Self-Care Gear",
      description: "Popular fitness and self-care products for your daily routine",
      cta: "Check it out",
      url: "https://example.com/affiliate/en/self-care",
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

/**
 * Expressions that must never appear in ad copy (medical / efficacy claims).
 * Checked by src/config/affiliates.test.ts whenever the copy is edited.
 */
export const PROHIBITED_AD_EXPRESSIONS: RegExp[] = [
  /増え|増量|増加|増大|倍増/,
  /治療|治る|治す|完治|改善|回復|予防|効く|効果抜群|即効/,
  /精力|勃起|早漏|遅漏|精液|精子|性欲|ED|活力|持続|長持ち|もっと長く|短縮|強化/,
  /\b(cure|cures|treat|treats|treatment|heal|prevent|boost|boosts|increase|increases|enlarge|enhance|restore)\b/i,
  /\b(stamina|last longer|libido|erection|semen|sperm|potency|vitality|recharge|recover|recovery)\b/i,
];
