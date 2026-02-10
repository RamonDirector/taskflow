import { SupabaseClient } from '@supabase/supabase-js';

type ActivityAction =
  | 'task_created'
  | 'task_completed'
  | 'task_uncompleted'
  | 'task_deleted'
  | 'task_edited'
  | 'idea_created'
  | 'idea_deleted'
  | 'dream_created'
  | 'dream_deleted'
  | 'brain_dump'
  | 'action_plan_generated'
  | 'action_plan_tasks_added';

type EntityType = 'task' | 'idea' | 'dream';

interface LogActivityParams {
  supabase: SupabaseClient;
  userId: string;
  action: ActivityAction;
  entityType?: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity({
  supabase,
  userId,
  action,
  entityType,
  entityId,
  metadata = {},
}: LogActivityParams) {
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (e) {
    // Silent fail — activity logging should never break the app
    console.error('Activity log error:', e);
  }
}
