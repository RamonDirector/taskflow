-- Add completed_at timestamp to track when tasks were completed
-- Used to auto-hide completed tasks after 24h from main view
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill: set completed_at for already-completed tasks (use updated_at or now)
UPDATE tasks SET completed_at = COALESCE(updated_at, NOW()) WHERE completed = true AND completed_at IS NULL;
