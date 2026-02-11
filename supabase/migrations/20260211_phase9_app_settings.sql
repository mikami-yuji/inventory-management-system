
-- Create app_settings table for key-value storage
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Settings are viewable by authenticated users" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Settings areupdatable by authenticated users" ON app_settings
  FOR UPDATE USING (auth.role() = 'authenticated');
  -- Ideally restrict to admin, but for now authenticated users is fine for MVP

CREATE POLICY "Settings are insertable by authenticated users" ON app_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default values
INSERT INTO app_settings (key, value, description)
VALUES 
  ('default_min_stock_alert', '100', 'Default minimum stock threshold for alerts')
ON CONFLICT (key) DO NOTHING;
