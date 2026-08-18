# データベース設計 & マイグレーションガイド

本リポジトリの Supabase / PostgreSQL スキーマ構成およびマイグレーションの管理方針です。

## テーブル構成一覧

| テーブル名 | 説明 | 主要リレーション |
| :--- | :--- | :--- |
| `users` | ユーザープロファイル・ロール管理（admin / client） | `auth.users(id)` |
| `products` | 商品マスタ（袋・ロール・ラベル・ピッチ・仕掛日数） | `suppliers(id)` |
| `inventory` | 在庫数（通常在庫・旧単価在庫数） | `products(id)` |
| `stock_history` | 入出庫・棚卸・履歴ログ | `products(id)`, `users(id)` |
| `suppliers` | 仕入先・メーカーマスタ | - |
| `price_revisions` | 価格改定履歴テーブル（適用日・新単価・新印刷代） | `products(id)` |
| `incoming_stock` | 入荷予定・納期管理 | `products(id)` |
| `app_settings` | システム設定（キー・バリュー） | - |

---

## ストアドファンクション (RPC)

### `update_inventory_atomic`
- **目的**: 在庫更新時のレースコンディション防止とトランザクション整合性の確保
- **ファイル**: [migrations/20260818_atomic_inventory_update.sql](file:///c:/Users/ASAHI/開発ファイル/inventory-management-system/supabase/migrations/20260818_atomic_inventory_update.sql)
- **処理内容**:
  1. `inventory` テーブルの該当商品行を行ロック（`FOR UPDATE`）
  2. 入庫（`incoming`）、出庫（`outgoing`）、調整（`adjustment`）に応じた在庫増減計算
  3. 出庫時の在庫不足チェック（不足時は例外送出・ロールバック）
  4. 旧単価在庫（FIFO）の優先消化計算
  5. `inventory` テーブルの UPSERT
  6. `stock_history` テーブルへのログ INSERT

---

## マイグレーション適用順序（新規環境構築時）

1. **基本スキーマの作成**:
   - `supabase/complete_schema.sql` を実行
2. **アトミック在庫更新 RPC の作成**:
   - `supabase/migrations/20260818_atomic_inventory_update.sql` を実行

---

## 運用ルール
- 今後のスキーマ変更は、`supabase/migrations/` 配下に `YYYYMMDD_説明.sql` の形式で作成してください。
- 直接の ad-hoc パッチ SQL の量産は禁止し、本マイグレーション管理に統一します。
