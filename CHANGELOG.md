# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-02-22

### Added
- **発注・出荷フローの強化 (Phase 20)**:
  - 出荷元の選択機能（メーカー在庫 vs 仕掛仕上がり分）を追加。自社在庫（社内用）を除外。
  - 納品先マスタに「好みの形状（RA / RZ / 単袋）」登録機能を追加。
  - 発注画面で選択した納品先の属性（住所、TEL、推奨形状）の表示に対応。
  - 仕掛中アイテムからの出荷予約・バリデーションロジック実装。
- **レポート分析の実データ連携 (Phase 19)**:
  - レポートダッシュボードを実際の「発注履歴」および「在庫履歴」に接続。
  - 月別の発注件数・金額の動的集計ロジック実装。
  - 平均発注金額などの統計バッジのリアルタイム化。
  - 商品レポート画面へのクイックリンク追加。

### Changed
- **発注APIの拡張**: 
  - `unit_price` および `printing_cost` の取得に対応し、レポート集計を可能に。
  - `shipmentSource` および `preferred_shape` の保存・取得に対応。
- **納品先API/DB**: `delivery_addresses` テーブルに `preferred_shape` カラムを追加し、APIで利用可能に。

## [0.5.0] - 2026-02-11

### Added
- **アクティビティログ機能**: `/activity-log` ページ追加。ユーザー操作（在庫調整、特売登録）の履歴確認が可能。
- **通知機能**: `/notifications` ページ追加。在庫切れ/低在庫アラートのリアルタイム確認と履歴管理。
- **サイドバー更新**: アクティビティログと通知へのナビゲーションリンク追加。

### Fixed
- **ビルドエラー修正**: `inventory/page.tsx` における `wipMap` の型不整合を修正。
- **API厳密型チェック対応**: `api/orders/route.ts` および `api/work-in-progress/route.ts` におけるSupabase型定義との不整合を修正（`update`/`insert` 時の型キャスト追加）。

### Changed
- **アクティビティログDB統合**: `activity_log` テーブル用マイグレーションスクリプト作成 (`scripts/migrations/004_create_activity_log.sql`)。

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
