-- AI Rate Limiting & User Controls
-- Run this in Supabase SQL Editor

-- Table to track AI usage per user
CREATE TABLE IF NOT EXISTS user_ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Admin controls
  ai_enabled BOOLEAN DEFAULT true,
  
  -- Limits (testing phase: generous limits)
  daily_limit INTEGER DEFAULT 200,
  hourly_limit INTEGER DEFAULT 50,
  
  -- Usage counters
  calls_today INTEGER DEFAULT 0,
  calls_this_hour INTEGER DEFAULT 0,
  
  -- Reset timestamps
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  last_hourly_reset TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON user_ai_settings(user_id);

-- RLS policies
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own settings
CREATE POLICY "Users can read own AI settings"
  ON user_ai_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via API)
CREATE POLICY "Service role can manage AI settings"
  ON user_ai_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to increment usage counters atomically
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_ai_settings
  SET 
    calls_today = calls_today + 1,
    calls_this_hour = calls_this_hour + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_ai_usage(UUID) TO authenticated;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_ai_settings_updated_at
  BEFORE UPDATE ON user_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
