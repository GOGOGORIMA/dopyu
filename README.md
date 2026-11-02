# DOPYU

ストップウォッチで記録して、年間ランキングで世界と競う記録・ランキング Web アプリです。
タグや記録時刻などの個人データは本人だけに表示し、ランキングには「回数」と「推定総量」だけを公開します。

## 主な機能

| 画面 | 内容 |
| --- | --- |
| 新規登録 / ログイン | メールアドレス・パスワード・生年月日・ユーザーネーム・所属国（ISO 国コード、既定 JP）。18 歳未満は登録不可 |
| 記録（ホーム） | ストップウォッチ（開始 / 一時停止 / 再開 / 完了 / リセット）。完了で記録画面が開き、完了日時と計測時間が自動入力される。オカズタグは新規作成と、過去タグのチップからのワンタップ選択（複数可）に対応 |
| ランキング | 今年 1/1〜12/31 の年間集計。日本 / 世界 / 国別ワールドカップの 3 タブ。ワールドカップは「1 人あたり平均回数」と「国全体の総量」で並び替え可能 |
| マイページ（非公開） | 今年の総回数・推定総量・平均所要時間、時間帯別グラフ（0〜23 時）、オカズランキング TOP10、月間カレンダー（記録日にスタンプと回数バッジ）、最近の記録（削除可） |

## 技術スタック

- **Next.js 16.4**（App Router / TypeScript / Turbopack / Cache Components / Partial Prefetching）
- **Tailwind CSS v4**、**Lucide React**（アイコン）、**Recharts 3**（グラフ）、**flag-icons**（国旗 SVG。Windows でも表示される）
- **Prisma 7** + **SQLite**（`@prisma/adapter-better-sqlite3`）。PostgreSQL へ移行できるスキーマ設計
- 認証: **jose**（HS256 署名の JWT を httpOnly Cookie に保存）+ **bcryptjs**
- 入力検証: **zod 4**

## セットアップ

Node.js 20.19 以上（22 推奨）が必要です。

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run db:setup
```

```bash
npm run dev
```

http://localhost:3000 を開きます。

- `npm install` の postinstall で Prisma Client（`src/generated/prisma`）が生成されます。
- `npm run db:setup` はマイグレーション適用（`prisma/dev.db` を作成）とシードデータ投入をまとめて行います。
- `.env` が無くても開発環境では動作します（開発用の固定キーで動き、警告を表示）。本番では `AUTH_SECRET`（32 文字以上）が必須です。

### デモアカウント

| メールアドレス | パスワード |
| --- | --- |
| `demo@dopyu.app` | `password123` |

シードでは 11 か国（JP / US / KR / CN / BR / DE / FR / GB / IN / TH / AU）のダミーユーザー 21 人と、約 4,000 件の記録を投入します。
前年 12 月分の記録（年間集計の対象外であることの確認用）と、10 秒未満の記録（ランキング対象外の確認用）も含みます。
全ダミーユーザーのパスワードは `password123` です。

### 本番ビルド

```bash
npm run build
```

```bash
npm start
```

## npm scripts

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` / `npm start` | 本番ビルド / 起動 |
| `npm run lint` | ESLint |
| `npm run typecheck` | ルート型生成 + `tsc --noEmit` |
| `npm test` | ユニットテスト（Node.js test runner + tsx） |
| `npm run db:setup` | マイグレーション適用 + シード |
| `npm run db:migrate` | スキーマ変更時のマイグレーション作成（`prisma migrate dev`） |
| `npm run db:seed` | シードの再投入（既存データは削除されます） |
| `npm run db:reset` | DB を作り直す |
| `npm run db:studio` | Prisma Studio |

## 環境変数

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | `file:./prisma/dev.db` | DB 接続先（相対パスはプロジェクトルート基準） |
| `AUTH_SECRET` | （開発時は固定キー） | セッション JWT の署名キー。本番では 32 文字以上が必須 |
| `APP_TIME_ZONE` | `Asia/Tokyo` | ランキングの年間集計期間（1/1〜12/31）を決めるタイムゾーン |

## 仕様と設計メモ

### 推定量（年齢から自動設定）

`src/lib/volume.ts` の `estimateVolumeMl(birthDate, at)` が生年月日から年齢を計算し、次の基準で 1 回あたりの推定量を返します。

| 年齢 | 推定量 |
| --- | --- |
| 29 歳以下 | 3.5 ml |
| 30 代 | 3.0 ml |
| 40 代 | 2.5 ml |
| 50 代 | 2.0 ml |
| 60 歳以上 | 1.5 ml |

記録を保存するたびに、完了時点の年齢で算出した値を `entries.volume_ml` に保存します。
誕生日をまたいでも過去の記録の値は変わらず、集計は単純な合計で済みます。

### 不正防止（10 秒ルール）

- 計測時間が 10 秒未満の記録は、記録画面に警告を表示したうえで `is_rankable = false` として保存します。ランキングには集計せず、マイページには表示します。
- 判定はサーバー側で行います（クライアントの値は信用しません）。
- そのほか、未来の完了日時、7 日より前の完了日時、24 時間を超える計測時間、11 個以上のタグは API で拒否します。

### ランキングとプライバシー

- 集計対象は `APP_TIME_ZONE` における今年の 1/1 00:00 から翌年 1/1 00:00 の直前まで、かつ `is_rankable = true` の記録です。
- 並び順は年間回数、同数なら推定総量です。両方同じなら同順位になります（1, 2, 2, 4 …）。
- 国別ワールドカップの「平均回数」は、国の総回数を所属ユーザー数（今年記録のないユーザーも含む）で割った値です。
- `src/lib/services/ranking.ts` は Prisma の `groupBy` で回数と総量の集計値だけを取得し、返却型（DTO）に列挙したフィールドだけを返します。
  ランキング API（`/api/rankings`）とランキング画面のどちらからも、タグ・完了時刻・計測時間・ユーザー ID・メールアドレスは返りません。

### ストップウォッチ

- `localStorage` に保存するのは、計測区間の開始時刻と、それまでの累積時間だけです。
  経過時間は「累積 + (現在時刻 − 開始時刻)」で毎回計算するため、リロードやタブを閉じても計測は続き、バックグラウンドのタイマー間引きでもずれません。
- 「完了」後の記録待ち状態も保存するので、記録画面でリロードしても画面が復元されます。
- `useSyncExternalStore` で購読しているため、複数タブ間でも同期します。

### 認証

- `src/proxy.ts`（Next.js 16 で Middleware から改名）は、JWT を検証して未ログインのアクセスを `/login` へリダイレクトする「楽観的チェック」です。
- 認可の本チェックは Data Access Layer（`src/lib/auth/dal.ts`）で行い、すべての API とデータ取得で毎回セッションを再検証します。
- Cookie は `httpOnly` / `SameSite=Lax` で、HTTPS 時は `Secure` を付けます。状態を変更する API は Origin ヘッダーも検証します（CSRF 対策の多重化）。
- ログイン失敗時は、アカウントの有無が分からない同一メッセージを返し、存在しないユーザーでもダミーハッシュと比較して応答時間をそろえます。

### マイページのタイムゾーン

時間帯別グラフとカレンダーは、ブラウザのタイムゾーン（`?tz=`）で日付と時刻を区切ります。
年間ランキングはサーバー共通の `APP_TIME_ZONE` で集計します。

## API

すべて JSON。ログインが必要な API は未ログイン時に `401` を返します。

| メソッド | パス | 内容 |
| --- | --- | --- |
| POST | `/api/auth/register` | 新規登録（成功時にセッション Cookie を発行） |
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/me` | 自分のプロフィール（年齢・1 回あたりの推定量を含む） |
| GET | `/api/me/stats?tz=Asia/Tokyo` | 今年のサマリー・時間帯別回数・タグ TOP10 |
| GET | `/api/me/calendar?tz=Asia/Tokyo&month=2026-11` | 月間カレンダーの日別回数 |
| GET | `/api/tags` | 自分の過去タグ（使用回数順） |
| GET | `/api/entries?limit=20` | 自分の最近の記録 |
| POST | `/api/entries` | 記録の保存。`{ completedAt, durationSeconds, tags[] }` |
| DELETE | `/api/entries/:id` | 自分の記録を削除 |
| GET | `/api/rankings?type=japan\|world\|worldcup&sort=average\|volume` | 年間ランキング（集計値のみ） |

## ディレクトリ構成

```
prisma/
  schema.prisma          DB スキーマ（snake_case にマッピング、Postgres 移行可能）
  migrations/            マイグレーション
  seed.ts                シード
prisma.config.ts         Prisma 7 の設定（DB URL・seed コマンド）
src/
  proxy.ts               未ログイン時のリダイレクト（楽観的チェック）
  app/
    (auth)/login, register   認証画面
    (app)/page.tsx           ストップウォッチ（ホーム）
    (app)/ranking            ランキング
    (app)/mypage             マイページ
    api/                     Route Handlers
  components/
    stopwatch/           ストップウォッチ・localStorage ストア・記録画面・タグ選択
    ranking/             ランキング表
    mypage/              グラフ・カレンダー・最近の記録
  lib/
    auth/                JWT・パスワード・DAL
    services/            集計と業務ロジック（ranking / stats / entries / tags）
    volume.ts            年齢と推定量の計算
    time.ts              タイムゾーン境界の計算（Intl のみ使用）
    validation.ts        zod スキーマ
```

## PostgreSQL への移行手順

スキーマは DB 固有の機能（enum・スカラー配列・`@db.*` ネイティブ型・生 SQL）を使っていないため、次の手順で移行できます。

1. アダプターをインストールします。

   ```bash
   npm install @prisma/adapter-pg pg
   ```

2. `prisma/schema.prisma` の `provider` を `"postgresql"` に変更します（任意で `birthDate` に `@db.Date` を付けます）。
3. `src/lib/db-adapter.ts` を `new PrismaPg({ connectionString: process.env.DATABASE_URL })` に書き換えます（アプリとシードの両方がこの関数を使っています）。
4. `.env` の `DATABASE_URL` を `postgresql://USER:PASSWORD@HOST:5432/dopyu` に変更します。
5. SQLite 用の `prisma/migrations` を削除し、PostgreSQL 用の初期マイグレーションを作り直してからシードを投入します。

   ```bash
   npx prisma migrate dev --name init
   ```

   ```bash
   npm run db:seed
   ```

ランキング集計は Prisma のクエリ API（`groupBy`）で書いているため、アプリ側のコード変更は不要です。
利用者が大幅に増えた場合は、集計をウィンドウ関数やマテリアライズドビューに置き換えたり、`"use cache"` と `cacheTag` でキャッシュしたりすることを検討してください。

## 注意

推定量は年齢区分による目安で、医学的な根拠を示すものではありません。
本アプリは 18 歳以上の利用を前提としています。
