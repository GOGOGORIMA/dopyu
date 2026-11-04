# DOPYU

ストップウォッチで記録して、年間ランキングで世界と競う記録・ランキング Web アプリです。
**サーバー不要の静的サイト**として GitHub Pages で動きます。データはすべて、閲覧しているブラウザの `localStorage` に保存されます。

公開 URL: `https://<GitHub ユーザー名>.github.io/dopyu/`（Cloudflare Pages ではルートドメインで配信できます）

## 主な機能

| 画面 | 内容 |
| --- | --- |
| 新規登録 / ログイン | 登録項目はメールアドレス・パスワード・生年月日・ユーザーネーム・所属国（既定 JP）。18 歳未満は登録できません。「デモアカウントで試す」を押すと、今年分のサンプル記録つきアカウントでログインします |
| 記録（ホーム） | ストップウォッチ（開始 / 一時停止 / 完了 / リセット）。計測状態は localStorage に保存されるため、リロードしても計測が続きます。完了すると記録画面が開き、日時と計測時間が自動入力されます。オカズタグは新規作成と、過去のタグからのワンタップ選択ができます |
| ランキング | 日本 / 世界 / 国別ワールドカップの 3 タブがあります。集計期間は「歴代・年間・月間・週間」の 4 種類で、リセットまでの残り時間を表示します。並び替えは「総量」（既定）/「平均」/「総回数」の 3 種類です。画面下部には自分（ワールドカップでは所属国）の現在順位と、1 つ上の順位までの差を常に表示します。日本・世界ではユーザー名の横にアイコンを表示します |
| マイページ | 今年の総回数・推定総量・平均所要時間、時間帯別グラフ、オカズランキング TOP10、月間カレンダー、最近の記録（削除可）を表示します |

## データの保存方式（静的サイト版）

GitHub Pages ではサーバー処理が動かないため、API Routes・Prisma・SQLite は使っていません。

- **保存先**: ユーザー、ログイン状態、記録はすべてブラウザの `localStorage`（`dopyu:v1:*`）に保存されます。外部には一切送信しません（実装は `src/lib/local-db.ts`）。
- **パスワード**: ソルト付き SHA-256 で保存します。同じブラウザ内でアカウントを分けるための簡易的な仕組みで、サーバー認証のような安全性はありません。
- **ランキング**: 組み込みのダミーユーザー 20 人（11 か国）と、このブラウザ内のアカウントの記録を合算して集計します。ダミーユーザーの登録日は 2023 年から今週までに分散させているので、どの集計期間でも順位がつきます。
  - ダミーユーザーの記録は固定シードの乱数で日ごとに生成するため、誰が見ても同じ結果になり、日が進むと回数も増えます（`src/lib/dummy-data.ts`）。
  - 他の端末のユーザーとは共有されません。
- **プライバシー**: ランキングに出るのはユーザーネーム・所属国・回数・推定総量だけです。タグや記録時刻は表示しません（`src/lib/ranking.ts`）。

## 仕様メモ

- **推定量**: 年齢から 1 回あたりの推定量を決めます（29 歳以下 3.5ml、30 代 3.0ml、40 代 2.5ml、50 代 2.0ml、60 歳以上 1.5ml）。記録ごとに、記録時点の年齢で計算した値を保存します。
- **ランキング集計条件（`isRanked`）**: 正常な記録はすべてマイページ（カレンダー・統計・タグ集計・時間帯グラフ）に保存されます。次の条件をすべて満たす記録だけがランキング（年間・国別）に集計されます（判定は `src/lib/ranking-rules.ts`）。
  - 計測時間が 120 分（7200 秒）以内であること。超えた場合は放置とみなします。下限はありません。
  - 直前の記録の完了から 30 分を過ぎていること（クールダウン）。期間中も計測と保存はできます。
  - その日（0:00〜23:59、ランキングのタイムゾーン）のランキング対象が 5 回未満であること。
  - クールダウン中や 5 回上限に達しているときは、ストップウォッチ画面にステータスを表示します。
  - 保存時のトーストで「ランキング集計対象」か「マイページ専用（理由）」かを表示します。
- **改ざん検知**: 開始時刻（startTime）、完了時刻（endTime）、一時停止の合計時間を保存します。実際の経過秒数と「計測秒数 + 一時停止秒数」が 3 秒以上ずれている場合は、不正データとして保存を拒否します。
- **タグ必須**: オカズタグを 1 つ以上選ぶか入力するまで、「記録を保存」ボタンは押せません。
- そのほか、未来の日時と 7 日より前の日時は受け付けません。
- **年の区切り**: ランキングは Asia/Tokyo 基準です（ビルド時の `NEXT_PUBLIC_APP_TIME_ZONE` で変更できます）。マイページはブラウザのタイムゾーンで集計します。
- **集計期間**: 境界はすべてランキングのタイムゾーン（Asia/Tokyo）の 0:00 です（`src/lib/ranking-period.ts`）。
  - 歴代：全期間の累計
  - 年間：今年の 1/1 から現在まで
  - 月間：今月の 1 日から現在まで
  - 週間：今週の月曜日から現在まで（毎週月曜 0:00 にリセット）
  - 週の起点の月曜日は `(曜日 + 6) % 7` で求めます。日曜日は直前の月曜日から始まる週に含まれます。
- **並び替え指標**（`src/lib/ranking.ts`）:
  - 個人ランキング
    - 総量：期間内の推定量の合計（ml）
    - 平均：期間内の推定量 ÷ 経過日数（ml/日）。経過日数は期間開始日と登録日の遅いほうから数え、最低 1 日です。期間の途中に登録した人も日割りペースで競えます。
    - 総回数：期間内の記録回数
  - ワールドカップ
    - 総量：国全体の推定量の合計
    - 平均：国全体の推定量 ÷ 期間内に記録した参加ユーザー数（ml/人）
    - 総回数：国全体の記録回数の合計
  - 指標の値が同じ場合は同順位になります。
- **ユーザーアイコン（任意）**: 新規登録時、またはマイページの「プロフィールを編集」から設定できます。
  - プリセットアイコン 12 種から選ぶ方式のみです。他人の顔写真（なりすまし・名誉毀損）や違法・わいせつ画像を扱わないよう、画像のアップロード機能はありません。
  - 以前のバージョンでアップロードした画像が残っていても、未設定として扱います。
  - 未設定の場合はデフォルトのアイコンを表示します（`src/lib/avatar.ts`）。

## 開発

Node.js 20.19 以上（22 推奨）が必要です。

```bash
npm install
```

```bash
npm run dev
```

開発サーバーは http://localhost:3000 で、basePath なしで動きます。

### 本番ビルド（GitHub Pages と同じ）

```bash
npm run build
```

`out/` に静的ファイルが出力されます。ローカルでは basePath なし（ルート配信）なので、`npm run preview` でそのまま確認できます。

GitHub Pages と同じ `/dopyu` 配下の構成で確認する場合は、次のようにします。

```bash
GITHUB_ACTIONS=true npm run build
mkdir -p /tmp/site && cp -r out /tmp/site/dopyu && python3 -m http.server 8000 -d /tmp/site
```

`http://localhost:8000/dopyu/` を開きます。

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 静的エクスポート（`out/`） |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック |
| `npm test` | ユニットテスト（推定量・タイムゾーン・入力検証・ランキング集計条件） |

## デプロイ

### 配信先ごとの basePath とサイト URL の自動切り替え

`next.config.ts` がビルド時の環境変数から自動で決めます（ルールは `src/lib/deploy-env.ts`、テストは `src/lib/deploy-env.test.ts`）。

basePath（CSS・JS・画像・リンクの接頭辞）:

| 優先 | 条件 | basePath |
| --- | --- | --- |
| 1 | `CF_PAGES` がある（Cloudflare Pages）、または `NEXT_PUBLIC_BASE_PATH=""` | `""`（ルート配信） |
| 2 | `GITHUB_ACTIONS=true` | `"/<リポジトリ名>"`（`GITHUB_REPOSITORY` から。`<owner>.github.io` リポジトリは `""`） |
| 3 | それ以外（ローカルの dev / build） | `""` |

`NEXT_PUBLIC_BASE_PATH` に `/app` のような値を入れた場合は、それをそのまま使います。

サイト URL（`og:image`・`twitter:image`・`og:url` の絶対 URL）:

1. `NEXT_PUBLIC_SITE_URL`
2. `CF_PAGES_URL`（Cloudflare Pages が自動で設定）
3. GitHub Pages の URL `https://<owner>.github.io/<repo>`（`GITHUB_REPOSITORY`、なければ `git remote get-url origin` から算出）

決まった値は `NEXT_PUBLIC_BASE_PATH` / `NEXT_PUBLIC_SITE_URL` としてクライアントからも参照できます。パスの組み立ては `src/lib/site.ts` に一本化しています。

- `withBasePath("/icon.png")`: Next.js が自動で接頭辞を付けない生の `href` / `src` に使います。
- `absoluteUrl("/ogp.png")`: OGP など、サイト外から参照される URL に使います。

### GitHub Pages（GitHub Actions）

`main` へ push すると `.github/workflows/nextjs.yml` が動き、`npm ci` → `npm run build` を実行して `./out` を GitHub Pages に公開します。

- basePath は `GITHUB_ACTIONS` / `GITHUB_REPOSITORY` から自動で `/dopyu` になります。サイト URL には `actions/configure-pages` の `base_url` を渡しています。
- `_next` フォルダが Jekyll に無視されないよう、ビルド後に `out/.nojekyll` を作成しています。
- リポジトリの **Settings → Pages → Source** を「GitHub Actions」にしておく必要があります。

### Cloudflare Pages

- ビルドコマンドは `npm run build`、出力ディレクトリは `out` にします。Node.js のバージョンは `.node-version`（22）で指定しています。
- `CF_PAGES` が自動で設定されるため、basePath なし（ルート配信）でビルドされます。
- `CF_PAGES_URL` はデプロイごとの URL（`https://<hash>.<project>.pages.dev`）です。本番ドメインや独自ドメインを OGP に使う場合は、Cloudflare の環境変数に `NEXT_PUBLIC_SITE_URL`（例: `https://dopyu.pages.dev`）を設定してください。
- セキュリティヘッダーは `public/_headers` に書いてあり、ビルドで `out/_headers` にコピーされます（Cloudflare Pages が全ページに付与します。GitHub Pages では無視されます）。
  - `X-Frame-Options: DENY`（クリックジャッキング対策）
  - `X-Content-Type-Options: nosniff`（MIME スニッフィング対策）
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### OGP / X（Twitter）カード

- `public/ogp.png`（1200×630 PNG、`summary_large_image` 用）と `public/icon.png`（512×512）をコミットしています。X は SVG の OGP 画像に対応していないため PNG です。
- 画像は `scripts/generate-og-images.mjs`（SVG → sharp で PNG 化）で再生成できます。フォントは再生成時だけ必要なので依存関係には入れていません。

```bash
npm install --no-save @expo-google-fonts/orbitron @expo-google-fonts/noto-sans-jp @expo-google-fonts/share-tech-mono
npm run og:generate
```

- `og:image` などは絶対 URL が必要なため、上記の「サイト URL」を `absoluteUrl()` で組み立てています（GitHub Pages / Cloudflare Pages のどちらでもリンク切れになりません）。
- 確認: X の Card Validator はプレビュー機能が廃止されているため、X の投稿画面に URL を貼るか、`out/index.html` の `<meta property="og:image">` を見てください。

## 構成

```
.github/workflows/nextjs.yml   Pages デプロイ
next.config.ts                 output: "export" / basePath・サイト URL の自動判定 / trailingSlash / images.unoptimized
src/
  app/(auth)/login, register   認証画面（ログイン済みならホームへ）
  app/(app)/                   ホーム（ストップウォッチ）・ランキング・マイページ（未ログインならログインへ）
  components/auth-gate.tsx     クライアント側のルートガード
  components/stopwatch/        ストップウォッチ・記録画面・タグ選択
  components/ranking/          ランキング
  components/mypage/           グラフ・カレンダー・最近の記録
  lib/local-db.ts              localStorage のデータ層（ユーザー・セッション・記録・タグ）
  lib/server-payload.ts        サーバーへ送る項目のホワイトリスト（タグ等は送らない）
  lib/deploy-env.ts            basePath・サイト URL の判定（GitHub Pages / Cloudflare Pages / ローカル）
  lib/site.ts                  withBasePath() / absoluteUrl() / 共有用 URL
  lib/username-filter.ts       ユーザーネームの NG ワード・個人情報フィルター
  lib/dummy-data.ts            ランキング用ダミーユーザーとデモ記録の生成
  lib/ranking.ts               ランキング集計
  lib/analytics.ts             マイページ集計
  lib/volume.ts                年齢と推定量の計算
  lib/time.ts                  タイムゾーン境界の計算
```

## 公開・収益化まわり

- **X シェア**:
  - 記録完了メッセージとランキング下部の順位バーに「Xで戦績をシェア」ボタンがあります。
  - 投稿文には公開 URL が自動で入ります（`NEXT_PUBLIC_SITE_URL` を設定した場合はその URL）。
  - 推定量は身近な単位に換算して添えます（`src/lib/share.ts`）。15ml 未満は大さじ、100ml 未満は乳酸菌飲料（65ml）、500ml 未満は栄養ドリンク（120ml）、それ以上は 500ml ペットボトルで数えます。
- **おすすめ枠（アフィリエイト）**:
  - 文言と URL は `src/config/affiliates.ts` で差し替えます。
  - 枠は 3 種類です。`cooldown` はクールダウン中のホーム画面、`endurance` は計測 3 分未満のときの完了メッセージ、`okazu` は通常時のホーム画面とマイページのオカズランキング下に表示します。
  - どの枠もカード右上に「PR」バッジを表示し、リンクには `rel="sponsored"` を付けています（ステマ規制対応）。
  - 薬機法対策として、医療的な効能表現（「精液量が増える」「治療・改善する」「持続」「短縮」など）は使いません。`PROHIBITED_AD_EXPRESSIONS` に禁止表現を定義し、`src/config/affiliates.test.ts` で文言を自動チェックしています。
- **年齢確認ゲート**:
  - どのページでも、初回は 18 歳以上かどうかの確認を表示します（`dopyu_age_verified`）。
  - 新規登録も、生年月日から満 18 歳未満と判定された場合はその場でブロックします。
- **利用規約・免責事項・プライバシーポリシー**: `/legal` にまとめ、フッターとマイページからリンクしています。
- **ユーザーネームの制限**（`src/lib/username-filter.ts`）:
  - URL・ドメイン（`http`、`.com` など）、メールアドレス、電話番号（8 桁以上の連続した数字、または区切り入りの 10 桁以上）を弾きます。
  - 公序良俗に反する語（ひらがな・カタカナ・大文字小文字・伏せ字の揺れも吸収）と、運営になりすます名前（`公式`、`運営`、`admin` など）も弾きます。
  - 同じ URL・メール・電話番号のチェックは、Supabase のテーブル制約でも行っています。
- **退会**: マイページの「全データを削除して退会する」で、アカウントと全記録を完全に削除します（Supabase 利用時はサーバー上のデータも含みます）。

## Supabase で本番運用する（任意）

環境変数を設定しなければ、これまでどおり localStorage だけで動きます。
設定すると、アカウントと競技用の記録を全ユーザーで共有し、ランキングは Realtime で自動更新されます。

**サーバーに保存するのは競技用の数値データと、本人しか読めない生年月日だけです**（個人情報保護法・GDPR の性生活データ対策）。

- サーバー（Supabase）に保存するもの:
  - 公開: ユーザー ID、ユーザーネーム、プリセットアイコン ID、国コード、登録日時、記録完了日時（UTC）、計測秒数、推定量（ml）、ランキング対象フラグ。
  - 本人のみ（RLS）: 生年月日（年齢確認と推定量の計算に使用）。
- 端末（localStorage）だけに保存するもの: **オカズタグ**、計測の開始時刻、ランキング対象外の理由。
- 送信する行は `src/lib/server-payload.ts` のホワイトリストで 1 項目ずつ組み立てます。サーバーにはタグ用の列自体がありません。`src/lib/server-payload.test.ts` でタグが含まれないことを確認しています。
- **端末間の同期**: 別の端末でログインしても、生年月日と記録はサーバーから読み込むので、年齢・1 回あたりの推定量・総量（ml）はどの端末でも同じになります。
  - ログイン中も、画面を開いたときやタブに戻ったときに再同期します。他の端末で追加・削除した記録も反映されます。
  - オカズタグだけは端末ごとの保存です。サーバーの競技データ（日時・計測秒数・`volume_ml`・`isRanked`）に、その端末のタグを組み合わせて表示します。別の端末では、タグの履歴は空から始まります。
- **サーバー側の不正対策**（`records` の BEFORE INSERT トリガー `enforce_record_rules()`）: 開発者ツールなどから API を直接呼んでも、クライアントの送信値は使いません。
  1. `completed_at` は DB サーバーの現在時刻 `now()` で上書きします（時刻の偽装を防止）。
  2. `volume_ml` は本人の非公開の生年月日から、現在（UTC）の年齢で算出します（29 歳以下 3.5 / 30 代 3.0 / 40 代 2.5 / 50 代 2.0 / 60 歳以上 1.5 ml）。
  3. `is_ranked` もサーバーで判定します。次のどれかに当てはまる場合は、何を送ってきても `false` になります。
     - 直前の記録から 30 分以内（クールダウン）
     - 当日（UTC）のランキング対象がすでに 5 件
     - `duration_sec` が 7200 秒超
  4. 直前の記録から 10 秒未満の INSERT は `Rate limit exceeded` で拒否します（連打・ボット対策）。
  - 同じユーザーの INSERT はアドバイザリーロックで 1 件ずつ処理するので、同時リクエストでもすり抜けられません。
  - アプリは、サーバーが確定した値（時刻・推定量・ランキング対象）を受け取って端末側の記録に反映します。
  - 推定量の区分と各上限がアプリ（`src/lib/volume.ts`、`src/lib/constants.ts`）と一致することを `src/lib/schema-volume.test.ts` で確認しています。
- **改ざん禁止**: `records` には UPDATE の権限もポリシーもありません。追加と本人による削除のみできます。
  - 行は更新できないため、誕生日を迎えて年代が変わっても、過去の記録の推定量は変わりません。
  - ランキングとマイページの総量は、この `volume_ml` の合計です。
- **生年月日は 1 回だけ設定できます**: `user_private` は本人だけが SELECT / INSERT できます。UPDATE はできません（後から若い年齢に変えて推定量を増やす不正を防ぐため）。
- **CHECK 制約**（API からも回避できません）:
  - `duration_sec` は 1〜86400
  - `volume_ml` は 1.5〜3.5
  - ユーザーネームは 2〜20 文字で、`<` `>` を含まないこと（XSS 対策）。URL・メール・電話番号も不可。
  - アプリ側の入力チェックも同じ範囲に揃えています（計測は 1 秒〜24 時間）。
- **未認証（anon）は読み取りのみです**: ランキング用の `profiles` と `records` を SELECT できるだけで、どのテーブルにも INSERT / UPDATE / DELETE はできません。`user_private` は読めません。
- **検証**: ローカルの PostgreSQL で `supabase/schema.sql` を実行し、次を確認しています。
  - 新規作成と旧スキーマからの移行（2 回実行しても問題ないこと）
  - 偽装した値（`volume_ml: 99999`・未来の時刻・`is_ranked: true`）が無効化されること
  - レート制限、クールダウン、1 日 5 回上限、120 分ルール、CHECK 制約
  - UPDATE が拒否されること、他人や anon が生年月日を読めないこと、anon が書き込めないこと
- 通信できないときに保存した記録は端末に「未同期」として残り、次回の同期で再送します。完了時刻はサーバー時刻で確定するため、再送時の時刻になります。
- 生年月日をサーバーに保存していなかった旧バージョンのアカウントは、次回ログイン時に一度だけ生年月日を入力してもらい、サーバーに保存します。

1. Supabase でプロジェクトを作り、SQL Editor に `supabase/schema.sql` を貼り付けて実行します（旧スキーマで作成済みの場合も、そのまま再実行すれば移行されます。`entries` テーブルは `records` に名前が変わり、オカズタグを含んでいた `entry_details` は削除されます）。
2. ビルド時の環境変数に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定します。
   - ローカルでは `.env.local` に書きます。
   - GitHub Pages では、リポジトリの Secrets を workflow の Build ステップの `env` で渡します。
3. Authentication 設定でメール確認を有効にしている場合、登録後は確認メールのリンクを開いてからログインします。

テーブル設計（RLS）:

| テーブル | 内容 | 読み取り | 書き込み |
| --- | --- | --- | --- |
| `profiles` | `id`・`username`・`country_code`・`avatar_id`（プリセット）・`created_at` | 全員 | 本人（`created_at` はサーバーが設定） |
| `records` | `completed_at`・`duration_sec`・`volume_ml`・`is_ranked`（いずれもサーバー確定） | 全員（ランキング用） | 本人（追加・削除のみ。更新不可） |
| `user_private` | `birth_date` | 本人のみ | 本人のみ（追加のみ。変更不可） |

退会時は `delete_my_account()` で認証ユーザーを削除し、関連する行はすべて cascade で削除されます。

## 注意

推定量は年齢区分による目安で、医学的な根拠を示すものではありません。
本アプリは 18 歳以上の利用を前提としています。
