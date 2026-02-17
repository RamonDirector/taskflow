-- Kai Conversation Memory
-- Stores chat history between user and Kai for contextual continuity

CREATE TABLE kai_conversations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  kai_response TEXT NOT NULL,
  tools_used JSONB DEFAULT '[]'::jsonb,
  model TEXT DEFAULT 'sonnet',  -- 'gemini' or 'sonnet'
  locale TEXT DEFAULT 'es',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups ordered by recency
CREATE INDEX idx_kai_conversations_user_recent 
  ON kai_conversations (user_id, created_at DESC);

-- RLS
ALTER TABLE kai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON kai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON kai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can also insert (for API routes)
CREATE POLICY "Service role full access"
  ON kai_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-cleanup: keep only last 100 conversations per user
-- (handled in application code, not DB trigger, for simplicity)
