import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface AIAccessResult {
  allowed: boolean;
  error?: string;
  remaining?: number;
  userId?: string;
}

/**
 * Check if user can access AI features
 * Verifies: ai_enabled, daily limit, hourly limit
 */
export async function checkAIAccess(): Promise<AIAccessResult> {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { allowed: false, error: 'No autenticado' };
  }

  // Get or create user AI settings
  const { data: settings, error: settingsError } = await supabase
    .from('user_ai_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // If no settings exist, create default ones
  if (settingsError && settingsError.code === 'PGRST116') {
    // Try to create settings for new user
    const { error: insertError } = await supabase
      .from('user_ai_settings')
      .insert({
        user_id: user.id,
        ai_enabled: true,
        daily_limit: 200, // Testing phase
        hourly_limit: 50,
        calls_today: 0,
        calls_this_hour: 0,
        last_daily_reset: new Date().toISOString().split('T')[0],
        last_hourly_reset: new Date().toISOString(),
      });

    if (insertError) {
      // During testing phase, allow access even if settings creation fails
      console.error('Failed to create AI settings (allowing anyway):', insertError);
      return { allowed: true, remaining: 200, userId: user.id };
    }

    return { allowed: true, remaining: 200, userId: user.id };
  }

  if (settingsError) {
    // During testing phase, allow access on any error
    console.error('Failed to get AI settings (allowing anyway):', settingsError);
    return { allowed: true, remaining: 200, userId: user.id };
  }

  // Check if AI is enabled for this user
  if (!settings.ai_enabled) {
    return { allowed: false, error: 'AI deshabilitado para esta cuenta' };
  }

  // Check if we need to reset daily counter
  const today = new Date().toISOString().split('T')[0];
  let callsToday = settings.calls_today;
  
  if (settings.last_daily_reset !== today) {
    // Reset daily counter
    callsToday = 0;
    await supabase
      .from('user_ai_settings')
      .update({ 
        calls_today: 0, 
        last_daily_reset: today 
      })
      .eq('user_id', user.id);
  }

  // Check if we need to reset hourly counter
  const now = new Date();
  const lastHourlyReset = new Date(settings.last_hourly_reset);
  const hoursSinceReset = (now.getTime() - lastHourlyReset.getTime()) / (1000 * 60 * 60);
  let callsThisHour = settings.calls_this_hour;

  if (hoursSinceReset >= 1) {
    // Reset hourly counter
    callsThisHour = 0;
    await supabase
      .from('user_ai_settings')
      .update({ 
        calls_this_hour: 0, 
        last_hourly_reset: now.toISOString() 
      })
      .eq('user_id', user.id);
  }

  // Check daily limit
  if (callsToday >= settings.daily_limit) {
    return { 
      allowed: false, 
      error: `Límite diario alcanzado (${settings.daily_limit} llamadas)`,
      remaining: 0 
    };
  }

  // Check hourly limit
  if (callsThisHour >= settings.hourly_limit) {
    return { 
      allowed: false, 
      error: `Límite por hora alcanzado (${settings.hourly_limit} llamadas)`,
      remaining: settings.daily_limit - callsToday 
    };
  }

  return { 
    allowed: true, 
    remaining: settings.daily_limit - callsToday - 1,
    userId: user.id 
  };
}

/**
 * Increment the AI call counter for a user
 */
export async function incrementAIUsage(userId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  
  await supabase.rpc('increment_ai_usage', { p_user_id: userId });
}

/**
 * Wrapper for AI route handlers
 */
export function withAIRateLimit<T>(
  handler: (userId: string) => Promise<T>
): () => Promise<T | Response> {
  return async () => {
    const access = await checkAIAccess();
    
    if (!access.allowed) {
      return new Response(
        JSON.stringify({ error: access.error }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const result = await handler(access.userId!);
      // Increment counter after successful call
      await incrementAIUsage(access.userId!);
      return result;
    } catch (error) {
      throw error;
    }
  };
}
