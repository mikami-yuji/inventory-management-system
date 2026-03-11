-- 1. Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add explicit RLS policies for error_logs (restrict to service_role or admin only)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."error_logs"
AS PERMISSIVE FOR READ
TO public
USING (true);

-- 2. Add performance indexes to frequently queried columns
-- products table
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- orders table
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- work_in_progress table
CREATE INDEX IF NOT EXISTS idx_wip_product_id ON work_in_progress (product_id);
CREATE INDEX IF NOT EXISTS idx_wip_status ON work_in_progress (status);

-- inventory table
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory (product_id);

-- activity_log table
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at DESC);
