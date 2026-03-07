ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "receives_order_emails" boolean DEFAULT false;
