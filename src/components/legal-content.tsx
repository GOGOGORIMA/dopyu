/** Terms of service, disclaimers and privacy policy (shared by /legal and the age gate). */
export function TermsContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink-2">
      <section>
        <h3 className="font-semibold text-ink">1. 医療・健康に関する免責事項</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            本アプリで算出される推定射精量（ml）や各種統計は、一般的な年代別目安に基づくエンターテインメント目的の推計値であり、医学的・科学的な正確性を保証するものではありません。
          </li>
          <li>
            本アプリの利用や過度な自慰行為等によって生じた体調不良、身体的・精神的損害について、運営者は一切の責任を負いません。無理のない範囲でご利用ください。
          </li>
        </ul>
      </section>
      <section>
        <h3 className="font-semibold text-ink">2. ランキング・データ管理に関する免責</h3>
        <p className="mt-1">
          クールダウン制限や日次上限、不正検知ロジックによりランキング集計対象外となる場合があります。また、システム障害やメンテナンス等によるデータの消失について運営者は保証いたしません。
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-ink">3. 禁止事項</h3>
        <p className="mt-1">
          ユーザーネームやアイコン、タグ等に、他者の個人情報、誹謗中傷、公序良俗に反する違法な内容を設定することを禁止します。悪質なアカウントは予告なくランキングから除外または削除する場合があります。
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-ink">4. 広告の配信について（プロモーション表記）</h3>
        <p className="mt-1">
          本アプリ内の「おすすめ枠」等には、アフィリエイトプログラム（Amazonアソシエイト、DMMアフィリエイト等の第三者配信広告）によるプロモーションリンクが含まれます。
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-ink">5. 年齢制限</h3>
        <p className="mt-1">本アプリは18歳以上の方を対象としています。18歳未満の方（高校生を含む）はご利用いただけません。</p>
      </section>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink-2">
      <p>
        登録されたメールアドレス・生年月日等の個人情報は認証および統計算出のみに利用し、個人の「オカズタグ」等のプライベートな記録が他のユーザーに公開されることはありません。
      </p>
      <p>
        ランキングに公開される情報は、ユーザーネーム・所属国・アイコン・ランキング対象の記録日時と推定量のみです。
      </p>
      <p>マイページの「全データを削除して退会する」から、いつでもアカウントとすべての記録を完全に削除できます。</p>
    </div>
  );
}
