# 在庫管理システム

米袋・シール等の在庫管理を行うWebアプリケーションです。

## 機能

- **ダッシュボード** - 在庫状況の概要表示
- **在庫一覧** - 商品別の在庫確認、カテゴリ別フィルタリング
- **発注管理** - 出荷依頼の作成・履歴確認
- **特売イベント** - イベント作成、イベント別在庫確保

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **UI**: Radix UI + shadcn/ui + Tailwind CSS
- **テスト**: Jest + Testing Library

## セットアップ

### 必要要件

- Node.js 20以上
- npm 10以上

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd 在庫管理システム

# 依存関係のインストール
npm install
```

### 環境変数

現在、環境変数は使用していません。将来的にAPIエンドポイント等を追加予定です。

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# Lint実行
npm run lint

# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage
```

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # ダッシュボードレイアウト
│   │   ├── dashboard/      # ダッシュボードページ
│   │   ├── inventory/      # 在庫一覧ページ
│   │   ├── orders/         # 発注管理ページ
│   │   └── events/         # 特売イベントページ
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/             # レイアウトコンポーネント
│   └── ui/                 # UIコンポーネント (shadcn/ui)
├── lib/
│   ├── services/           # ビジネスロジック層
│   │   ├── data-source.ts      # データソース抽象化
│   │   ├── inventory-service.ts # 在庫サービス
│   │   ├── order-service.ts     # 発注サービス
│   │   └── event-service.ts     # イベントサービス
│   ├── mock-data.ts        # モックデータ
│   └── utils.ts            # ユーティリティ
└── types/                  # 型定義
    └── index.ts
```

## テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm test -- --watch

# 特定ファイルのみ
npm test -- inventory-service
```

### テストカバレッジ目標

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## CI/CD

GitHub Actionsでの自動チェック:

- **push/PR時**: lint → test → build
- **PR時のみ**: カバレッジレポート生成

設定ファイル: `.github/workflows/ci.yml`

## コーディング規約

- コメントは日本語、コードは英語
- `interface` より `type` を優先
- すべての関数に戻り値の型を明示
- `any` 型は使用禁止

## ライセンス

Private
