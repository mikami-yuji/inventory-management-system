# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-02-11

### Added
- **認証・セキュリティ**
  - `src/middleware.ts` - 認証ミドルウェア（ページ→リダイレクト / API→401 JSON）
  - `src/hooks/use-auth-session.ts` - セッション管理フック
  - `src/app/register/page.tsx` - ユーザー登録ページ
  - `src/app/api/auth/register/route.ts` - 登録API（Supabase Auth連携）
- **運用品質向上**
  - `src/components/error-boundary.tsx` - エラー境界コンポーネント
  - `src/lib/api-client.ts` - 統一APIクライアント（エラーハンドリング・401自動リダイレクト）
  - `src/app/(dashboard)/error.tsx` - Next.jsエラーページ
  - `src/app/(dashboard)/loading.tsx` - ローディングスケルトン
  - `src/app/(dashboard)/not-found.tsx` - 404ページ

### Changed
- **全ページのSupabase API化（モック依存ゼロ）**
  - ダッシュボード: 発注・入荷予定・特売イベントをAPI接続
  - 発注一覧: `/api/orders` GET APIで実データ表示
  - 特売イベント: 既存API活用、ダッシュボード表示をAPI化
- ダッシュボードレイアウトにErrorBoundaryを統合
- Navbar: ログアウト機能追加、ユーザードロップダウン表示


## [0.2.0] - 2026-01-08

### Added
- **サービス層の追加**: データ取得ロジックをページから分離
  - `src/lib/services/data-source.ts` - データソース抽象化
  - `src/lib/services/inventory-service.ts` - 在庫関連サービス
  - `src/lib/services/order-service.ts` - 発注関連サービス
  - `src/lib/services/event-service.ts` - イベント関連サービス
- **テスト環境の構築**
  - Jest + Testing Library 導入
  - `inventory-service.test.ts` に26のユニットテスト追加
- **ドキュメントの整備**
  - README.md の詳細化
  - CHANGELOG.md の追加

### Changed
- **型定義の改善**
  - `interface` から `type` に変更
  - `ProductCategory`, `ProductStatus`, `EventStatus` を個別の型として抽出
- **ページコンポーネントのリファクタリング**
  - `MOCK_DATA` 直接インポート → サービス経由に変更
  - `any` 型を適切な型に修正
  - `JSX.Element` → `React.ReactElement` に変更

### Fixed
- `isRollBag` 関数の null/undefined 安全性を修正

## [0.1.0] - 2026-01-06

### Added
- 初期リリース
- ダッシュボードページ
- 在庫一覧ページ（カテゴリフィルタリング機能）
- 発注管理ページ（新規出荷依頼機能）
- 特売イベント管理ページ
- ロール袋の概算枚数計算機能
