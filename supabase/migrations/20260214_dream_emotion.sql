-- Add emotion column to tasks table for dream emotion tagging
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS emotion TEXT;

-- Index for filtering dreams by emotion
CREATE INDEX IF NOT EXISTS idx_tasks_emotion ON tasks (emotion) WHERE emotion IS NOT NULL;
