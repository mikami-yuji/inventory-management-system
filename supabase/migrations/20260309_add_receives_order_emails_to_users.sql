-- usersテーブルに注文通知メール受信設定を追加
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "receives_order_emails" boolean DEFAULT false;

-- コメントの追加
COMMENT ON COLUMN "public"."users"."receives_order_emails" IS '管理者宛の発注通知メールを受信するかどうか';
