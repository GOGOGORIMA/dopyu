# DOPYU

ストップウォッチで記録して、年間ランキングで世界と競う記録・ランキング Web アプリです。
**サーバー不要の静的サイト**として GitHub Pages で動きます。データはすべて、閲覧しているブラウザの `localStorage` に保存されます。

公開 URL: `https://<GitHub ユーザー名>.github.io/dopyu/`

## 主な機能

| 画面 | 内容 |
| --- | --- |
| 新規登録 / ログイン | 登録項目はメールアドレス・パスワード・生年月日・ユーザーネーム・所属国（既定 JP）。18 歳未満は登録できません。「デモアカウントで試す」を押すと、今年分のサンプル記録つきアカウントでログインします |
| 記録（ホーム） | ストップウォッチ（開始 / 一時停止 / 完了 / リセット）。計測状態は localStorage に保存されるため、リロードしても計測が続きます。完了すると記録画面が開き、日時と計測時間が自動入力されます。オカズタグは新規作成と、過去のタグからのワンタップ選択ができます |
| ランキング | 今年 1/1〜12/31 の年間集計で、日本 / 世界 / 国別ワールドカップの 3 タブがあります。ワールドカップは「1 人あたり平均回数」と「国全体の総量」で並べ替えられます |
| マイページ | 今年の総回数・推定総量・平均所要時間、時間帯別グラフ、オカズランキング TOP10、月間カレンダー、最近の記録（削除可）を表示します |

## データの保存方式（静的サイト版）

GitHub Pages ではサーバー処理が動かないため、API Routes・Prisma・SQLite は使っていません。

- **保存先**: ユーザー、ログイン状態、記録はすべてブラウザの `localStorage`（`dopyu:v1:*`）に保存されます。外部には一切送信しません（実装は `src/lib/local-db.ts`）。
- **パスワード**: ソルト付き SHA-256 で保存します。同じブラウザ内でアカウントを分けるための簡易的な仕組みで、サーバー認証のような安全性はありません。
- **ランキング**: 組み込みのダミーユーザー 20 人（11 か国）と、このブラウザ内のアカウントの記録を合算して集計します。
  - ダミーユーザーの記録は固定シードの乱数で日ごとに生成するため、誰が見ても同じ結果になり、日が進むと回数も増えます（`src/lib/dummy-data.ts`）。
  - 他の端末のユーザーとは共有されません。
- **プライバシー**: ランキングに出るのはユーザーネーム・所属国・回数・推定総量だけです。タグや記録時刻は表示しません（`src/lib/ranking.ts`）。

## 仕様メモ

- **推定量**: 年齢から 1 回あたりの推定量を決めます（29 歳以下 3.5ml、30 代 3.0ml、40 代 2.5ml、50 代 2.0ml、60 歳以上 1.5ml）。記録ごとに、記録時点の年齢で計算した値を保存します。
- **10 秒ルール**: 10 秒未満の記録は警告を表示したうえで、ランキング集計の対象外として保存します。
  - そのほか、未来の日時、7 日より前の日時、24 時間を超える計測、11 個以上のタグは受け付けません。
- **年の区切り**: ランキングは Asia/Tokyo 基準です（ビルド時の `NEXT_PUBLIC_APP_TIME_ZONE` で変更できます）。マイページはブラウザのタイムゾーンで集計します。
- **ワールドカップの平均回数**: 国の総回数 ÷ 所属ユーザー数（今年記録のない人も人数に含みます）。

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

`out/` に静的ファイルが出力されます。basePath は `/dopyu` です。
GitHub Pages と同じ URL 構成で確認するには、`out` を `dopyu` という名前のフォルダに置いて配信し、`http://localhost:8000/dopyu/` を開きます。

```bash
mkdir -p /tmp/site && cp -r out /tmp/site/dopyu && python3 -m http.server 8000 -d /tmp/site
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 静的エクスポート（`out/`） |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック |
| `npm test` | ユニットテスト（推定量・タイムゾーン・入力検証） |

## デプロイ（GitHub Actions → GitHub Pages）

`main` へ push すると `.github/workflows/nextjs.yml` が動き、`npm ci` → `npm run build` を実行して `./out` を GitHub Pages に公開します。

- basePath は `actions/configure-pages` が返すパスを `PAGES_BASE_PATH` 経由で `next.config.ts` に渡しています。
- `_next` フォルダが Jekyll に無視されないよう、ビルド後に `out/.nojekyll` を作成しています。
- リポジトリの **Settings → Pages → Source** を「GitHub Actions」にしておく必要があります。

## 構成

```
.github/workflows/nextjs.yml   Pages デプロイ
next.config.ts                 output: "export" / basePath / trailingSlash / images.unoptimized
src/
  app/(auth)/login, register   認証画面（ログイン済みならホームへ）
  app/(app)/                   ホーム（ストップウォッチ）・ランキング・マイページ（未ログインならログインへ）
  components/auth-gate.tsx     クライアント側のルートガード
  components/stopwatch/        ストップウォッチ・記録画面・タグ選択
  components/ranking/          ランキング
  components/mypage/           グラフ・カレンダー・最近の記録
  lib/local-db.ts              localStorage のデータ層（ユーザー・セッション・記録・タグ）
  lib/dummy-data.ts            ランキング用ダミーユーザーとデモ記録の生成
  lib/ranking.ts               ランキング集計
  lib/analytics.ts             マイページ集計
  lib/volume.ts                年齢と推定量の計算
  lib/time.ts                  タイムゾーン境界の計算
```

## 注意

推定量は年齢区分による目安で、医学的な根拠を示すものではありません。
本アプリは 18 歳以上の利用を前提としています。
