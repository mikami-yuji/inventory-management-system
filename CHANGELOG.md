# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.8.5] - 2026-03-26
### Fixed
- **特売引当計算の修正**: 終了（completed）または中止（cancelled）された特売イベントを在庫引当の合計計算から除外するように修正。在庫一覧（Bags）、スキャン画面、および特売引当詳細モーダルの全箇所でロジックを統一し、有効在庫の計算精度を向上させました。

## [0.8.4] - 2026-03-25
### Added
- **Excel (.xlsx) 出力機能**: 「在庫状況報告書」、「在庫回転率レポート」に加えて、メインの **「米袋在庫管理」** ページにもExcelダウンロード機能を追加。取引先へのデータ共有をより容易にしました。

### Optimized
- **PDF出力のさらなる軽量化・視認性向上**: 商品画像の埋め込みを廃止し、画像列を削除。空いたスペースを商品名に割り当て、長い商品名も省略（...）せず全て表示されるように改善しました。
- **PDF出力の劇的な軽量化**: OKLCHカラー、シャドウ、透明度、背景描画を印刷時に徹底的に排除（RGB/単色化）し、ファイルサイズが100MBを超える問題を根本的に解決。数百KB〜数MB程度まで軽量化しました。
- **印刷レイアウトの安定化**: テーブルのオーバーフロー制御や、ページ跨ぎの制御を改善。

## [0.8.3] - 2026-03-15

### Changed
- **入荷予定ダイアログのリファクタリング**: ユーザーの要望に基づき、新規登録フォームを削除し「編集のみ」のUIに変更。編集フォームは判別しやすいようオレンジ色の背景を適用。

### Fixed
- **無限ループエラーの解消**: `BagsInventoryPage` における `refetch` のメモ化と、`IncomingStockDialog` の初期化ロジックに `useRef` を導入することで、Reactの無限再レンダリングループを修正。
- **APIスキーマ不整合の修正**: データベースに存在しない `shipped_date` カラムへの参照をAPIおよびUIから完全に削除し、500エラーを解消。
- **コード品質の向上**: コンポーネントの `any` 型を適切な型定義に修正し、不足していた関数戻り値の型明示を追加。

## [0.8.2] - 2026-03-15
### Fixed
- **コード品質の監査と包括的なヘルスチェックの実施**:
  - `npm run lint` および `npx tsc --noEmit` での 0 エラーを達成。
  - `use-inventory.ts` 等の重要フックから `any` 型を排除し、厳密な型定義を導入。
  - `useEffect`, `useMemo` の依存関係不足を完全に修正し、コンポーネントの安定性を向上。
  - 全コンポーネントおよびAPIルートから未使用の変数、インポート、アイコンを削除しコードをクリーン化。
  - パフォーマンス最適化のため、再レンダリング頻度の高い関数に `useCallback` を適用。

## [0.8.1] - 2026-03-12
### Fixed
- **本番環境での実行時エラー (TypeError) の徹底的な解消**: APIレスポンスが非配列（エラーオブジェクトやnull等）である場合に発生していた `.map()` や `.filter()` の呼び出しを、`Array.isArray()` チェックにより保護。ダッシュボード、在庫管理、レポート、注文、スキャン、アクティビティログ等の全主要コンポーネントで修正を適用。
- **Git マージコンフリクトの解消**: 他PCでのセキュリティ強化に伴うマージコンフリクトを解消し、ソースコードを最新状態に同期。
- **共有フックの堅牢化**: `useInventory`, `useSaleEvents`, `useWorkInProgress` 等のデータ取得フックにバリデーションを追加し、システム全体の耐障害性を向上。


## [0.8.0] - 2026-03-11
### Added
- **サーバー側エラーログ機能の基盤構築**:
  - `src/lib/logger.ts` ユーティリティを追加。Supabaseの `error_logs` テーブルへ、ルート・メソッド・スタックトレース等の自動記録が可能に。
  - 主要API (`/api/inventory`, `/api/orders`, `/api/products`, `/api/sale-events`) の各 `catch` ブロックにロガーを統合。
- **データベース・パフォーマンス最適化**:
  - `products.sku`, `orders.status`, `inventory.product_id` 等の頻繁にクエリされるカラムにB-Treeインデックスを追加するマイグレーションスクリプトを作成・適用。
- **自動化ワークフロー (CI/CD) の構築**:
  - **GitHub Actions**: `.github/workflows/ci.yml` を作成し、プッシュ/PR時にビルド・Lint・テストをクラウド上で自動実行。
  - **Husky & lint-staged**: Gitコミット前にローカルで `eslint` と `jest` を強制実行するGitフックを導入し、品質不良の混入を防止。

### Changed
- **メール送信機能の安定化**: `src/lib/mail.ts` 内の `console.log` 等を削除し、エラーハンドリングを `logError` ユーティリティに集約。

### Removed
- **デバッグ用コードの削除**: 全コードベースから `console.log` および `console.warn` を一掃し、本番環境向けのクリーンなコード状態へ移行。

## [Unreleased]

## [0.7.0] - 2026-03-11

### Security
- **API認証基盤の強化**: `getServerSession` を各APIルート (`/api/inventory`, `/api/orders`, `/api/products`, `/api/suppliers`, `/api/work-in-progress`) に導入し、未認証アクセスを遮断。
- **入力バリデーションの導入**: `Zod` スキーマを全主要APIのPOST/PUT/PATCHエンドポイントに適用し、不正なペイロードによるデータ更新を防止。
- **依存関係の脆弱性対応**: `npm audit fix` によりパッケージの既知の脆弱性を自動修正。
- **ビルド・型チェックの厳密化**: `any` 型キャストを排除し、厳格な型推論による安全なAPI実装に変更。
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
