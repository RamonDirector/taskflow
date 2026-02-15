-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'once' CHECK (schedule_type IN ('once', 'recurring')),
  trigger_at TIMESTAMPTZ,
  interval_ms BIGINT,
  last_triggered TIMESTAMPTZ,
  next_trigger TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual' CHECK (source IN ('kai', 'manual'))
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders" ON reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_reminders_next_trigger ON reminders (next_trigger) WHERE active = true;
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id) WHERE active = true;

-- Push notification log for anti-spam
CREATE TABLE IF NOT EXISTS push_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE
);

ALTER TABLE push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own push log" ON push_log
  FOR SELECT USING (auth.uid() = user_id);

-- Service role needs to INSERT push_log (from API routes)
-- We'll use service role key for cron operations
