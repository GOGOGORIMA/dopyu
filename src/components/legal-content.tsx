"use client";

import { useI18n } from "@/lib/i18n";
import { TAG_PRIVACY_NOTE } from "@/lib/i18n-dict";

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
        "本アプリ内の「おすすめ枠」は広告です。アフィリエイトプログラム（Amazonアソシエイト、DMMアフィリエイト等の第三者配信広告）によるプロモーションリンクであり、各カードに「PR」と表示しています。",
        "掲載商品は医薬品ではなく、疾病の治療・予防や身体機能の改善等の効果・効能を示すものではありません。",
      ],
    ],
    en: [
      "4. Advertising Disclosure",
      [
        "\"Sponsored\" cards in the app are advertisements: promotional affiliate links (third-party programs such as Amazon Associates and other affiliate networks), each marked \"PR\".",
        "Featured products are not medicines and make no claim to diagnose, treat, cure or prevent any disease or to improve any bodily function.",
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
    "【端末内のみに保存されるデータ】オカズタグ、生年月日、計測の開始時刻、ランキング対象外の理由、アップロードしたアイコン画像は、あなたの端末（ブラウザの localStorage）にのみ保存され、サーバーには一切送信・保存されません。端末のデータを消去すると復元できません。",
    "【サーバーに保存されるデータ（オンライン版のみ）】ランキング集計のため、ユーザーID・ユーザーネーム・プリセットアイコンID・国コード・記録完了日時（UTC）・計測秒数・推定量（ml）・ランキング対象フラグの競技用数値データのみを保存します。ログイン用のメールアドレスとパスワードは認証基盤（Supabase Auth）で管理され、公開されることはありません。",
    "ランキングで他のユーザーに公開されるのは、ユーザーネーム・国・プリセットアイコン・ランキング対象の記録日時と推定量のみです。",
    "マイページの「全データを削除して退会する」から、いつでもアカウントとすべての記録（端末内・サーバー上の両方）を完全に削除できます。",
  ],
  en: [
    "Device-only data: your Sauce Tags, date of birth, stopwatch start times, ranking-exclusion reasons and any uploaded icon image are stored only on your device (browser localStorage) and are never sent to or stored on any server. Clearing your device data removes them permanently.",
    "Server data (online version only): to compute rankings we store competition data only — user ID, username, preset icon ID, country code, completion time (UTC), measured seconds, estimated volume (ml) and the ranked flag. Your login email and password are handled by the authentication provider (Supabase Auth) and are never shown to anyone.",
    "Rankings only show other users your username, country, preset icon, and the time and estimated volume of ranked records.",
    "You can permanently delete your account and all records (on this device and on the server) at any time from \"Delete all data\" on My Page.",
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
      {/* The tag notice is always shown in both languages */}
      <p className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-emerald-100 ring-1 ring-emerald-500/25">
        {TAG_PRIVACY_NOTE[lang]}
        <br />
        <span className="text-xs opacity-80">{TAG_PRIVACY_NOTE[lang === "ja" ? "en" : "ja"]}</span>
      </p>
      {PRIVACY[lang].map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
