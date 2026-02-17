-- Add DELETE policy for tasks table
-- Users could not delete their own tasks/ideas due to missing RLS policy
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Also ensure UPDATE policy exists (for completed_at fallback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can update own tasks'
  ) THEN
    CREATE POLICY "Users can update own tasks"
      ON tasks FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
