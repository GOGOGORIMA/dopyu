"use client";

import { useI18n } from "@/lib/i18n";

type Section = { ja: [string, string[]]; en: [string, string[]] };

const TERMS: Section[] = [
  {
    ja: [
      "1. 医療・健康に関する免責事項",
      [
        "本アプリで算出される推定射精量（ml）や各種統計は、一般的な年代別目安に基づくエンターテインメント目的の推計値であり、医学的・科学的な正確性を保証するものではありません。",
        "本アプリの利用や過度な自慰行為等によって生じた体調不良、身体的・精神的損害について、運営者は一切の責任を負いません。無理のない範囲でご利用ください。",
      ],
    ],
    en: [
      "1. Medical & Health Disclaimer",
      [
        "Estimated volumes (ml) and statistics are entertainment-only approximations based on general age-group averages. They are not medically or scientifically accurate.",
        "The operator accepts no liability for any physical or mental harm, illness or injury resulting from use of the app or from excessive masturbation. Please use the app in moderation.",
      ],
    ],
  },
  {
    ja: [
      "2. ランキング・データ管理に関する免責",
      [
        "クールダウン制限や日次上限、不正検知ロジックによりランキング集計対象外となる場合があります。また、システム障害やメンテナンス等によるデータの消失について運営者は保証いたしません。",
      ],
    ],
    en: [
      "2. Rankings & Data",
      [
        "Records may be excluded from rankings by the cooldown, the daily limit or anti-cheat checks. The operator does not guarantee against data loss caused by outages or maintenance.",
      ],
    ],
  },
  {
    ja: [
      "3. 禁止事項",
      [
        "ユーザーネームやアイコン、タグ等に、他者の個人情報、誹謗中傷、公序良俗に反する違法な内容を設定することを禁止します。悪質なアカウントは予告なくランキングから除外または削除する場合があります。",
      ],
    ],
    en: [
      "3. Prohibited Conduct",
      [
        "Do not use usernames, icons or tags containing other people's personal information, harassment, or illegal or offensive content. Abusive accounts may be removed from rankings or deleted without notice.",
      ],
    ],
  },
  {
    ja: [
      "4. 広告の配信について（プロモーション表記）",
      [
        "本アプリ内の「おすすめ枠」等には、アフィリエイトプログラム（Amazonアソシエイト、DMMアフィリエイト等の第三者配信広告）によるプロモーションリンクが含まれます。",
      ],
    ],
    en: [
      "4. Advertising Disclosure",
      [
        "\"Sponsored\" cards in the app contain promotional affiliate links (third-party programs such as Amazon Associates and other affiliate networks).",
      ],
    ],
  },
  {
    ja: ["5. 年齢制限", ["本アプリは18歳以上の方を対象としています。18歳未満の方（高校生を含む）はご利用いただけません。"]],
    en: ["5. Age Restriction", ["DOPYU is for adults aged 18 and over only. Minors (including high-school students) may not use it."]],
  },
];

const PRIVACY: Record<"ja" | "en", string[]> = {
  ja: [
    "登録されたメールアドレス・生年月日等の個人情報は認証および統計算出のみに利用し、個人の「オカズタグ」等のプライベートな記録が他のユーザーに公開されることはありません。",
    "ランキングに公開される情報は、ユーザーネーム・所属国・アイコン・ランキング対象の記録日時と推定量のみです。",
    "マイページの「全データを削除して退会する」から、いつでもアカウントとすべての記録を完全に削除できます。",
  ],
  en: [
    "Your email address, date of birth and other personal data are used only for authentication and statistics. Private records such as your Sauce Tags are never shown to other users.",
    "Rankings only show your username, country, icon, and the time and estimated volume of ranked records.",
    "You can permanently delete your account and all records at any time from \"Delete all data\" on My Page.",
  ],
};

/** Terms of service and disclaimers (shared by /legal and the age gate). */
export function TermsContent() {
  const { lang } = useI18n();
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink-2">
      {TERMS.map((section) => {
        const [title, items] = section[lang];
        return (
          <section key={title}>
            <h3 className="font-semibold text-ink">{title}</h3>
            {items.length > 1 ? (
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">{items[0]}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function PrivacyContent() {
  const { lang } = useI18n();
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink-2">
      {PRIVACY[lang].map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
