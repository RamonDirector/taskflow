import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Parse reminder_time string into a Date.
 * Handles: "07:30", "15:00", "tomorrow 09:00", "in 30 minutes", "in 2 hours"
 */
function parseReminderTime(timeStr: string | null): Date {
  if (!timeStr) {
    // Default: 1 hour from now
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  const lower = timeStr.toLowerCase().trim();

  // "in X minutes"
  const inMinMatch = lower.match(/in\s+(\d+)\s*min/);
  if (inMinMatch) {
    return new Date(Date.now() + parseInt(inMinMatch[1]) * 60 * 1000);
  }

  // "in X hours"
  const inHourMatch = lower.match(/in\s+(\d+)\s*h/);
  if (inHourMatch) {
    return new Date(Date.now() + parseInt(inHourMatch[1]) * 60 * 60 * 1000);
  }

  // "en X minutos"
  const enMinMatch = lower.match(/en\s+(\d+)\s*min/);
  if (enMinMatch) {
    return new Date(Date.now() + parseInt(enMinMatch[1]) * 60 * 1000);
  }

  // "en X horas"
  const enHourMatch = lower.match(/en\s+(\d+)\s*hora/);
  if (enHourMatch) {
    return new Date(Date.now() + parseInt(enHourMatch[1]) * 60 * 60 * 1000);
  }

  // "tomorrow HH:MM" or "mañana HH:MM"
  const tomorrowMatch = lower.match(/(tomorrow|mañana)\s+(\d{1,2})[:\s](\d{2})/);
  if (tomorrowMatch) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(parseInt(tomorrowMatch[2]), parseInt(tomorrowMatch[3]), 0, 0);
    return d;
  }

  // Plain time "HH:MM" — assume today, or tomorrow if time already passed
  // Convert from CET to UTC (CET = UTC+1, CEST = UTC+2)
  const timeMatch = lower.match(/(\d{1,2})[:\s](\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    
    // Create date in Amsterdam timezone
    const now = new Date();
    const amsterdamNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
    
    const target = new Date();
    // Calculate CET offset (1 or 2 hours ahead of UTC)
    const cetOffset = (amsterdamNow.getTime() - now.getTime()) / (60 * 60 * 1000);
    // So the user says "15:00" meaning CET → we need UTC = 15:00 - cetOffset
    target.setUTCHours(hours - Math.round(cetOffset), minutes, 0, 0);
    
    // If time already passed today, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  // Fallback: 1 hour from now
  return new Date(Date.now() + 60 * 60 * 1000);
}

/**
 * Parse interval string to milliseconds.
 * Handles: "daily", "weekly", "every 2 hours", "hourly", "every hour"
 */
function parseInterval(intervalStr: string | null): number | null {
  if (!intervalStr) return null;
  const lower = intervalStr.toLowerCase().trim();

  if (lower === 'daily' || lower === 'diario' || lower === 'cada día') return 24 * 60 * 60 * 1000;
  if (lower === 'weekly' || lower === 'semanal') return 7 * 24 * 60 * 60 * 1000;
  if (lower === 'hourly' || lower === 'every hour' || lower === 'cada hora') return 60 * 60 * 1000;

  const everyHMatch = lower.match(/every\s+(\d+)\s*h|cada\s+(\d+)\s*h/);
  if (everyHMatch) {
    const h = parseInt(everyHMatch[1] || everyHMatch[2]);
    return h * 60 * 60 * 1000;
  }

  const everyMinMatch = lower.match(/every\s+(\d+)\s*min|cada\s+(\d+)\s*min/);
  if (everyMinMatch) {
    const m = parseInt(everyMinMatch[1] || everyMinMatch[2]);
    return m * 60 * 1000;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { title, reminder_time, recurring, interval } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    // Get user from session
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const triggerAt = parseReminderTime(reminder_time);
    const intervalMs = recurring ? parseInterval(interval) : null;

    // Use service role to bypass RLS
    const serviceSupabase = createSupabaseClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data, error } = await serviceSupabase.from('reminders').insert({
      user_id: user.id,
      title: title.trim(),
      schedule_type: recurring ? 'recurring' : 'once',
      trigger_at: triggerAt.toISOString(),
      next_trigger: triggerAt.toISOString(),
      interval_ms: intervalMs,
      active: true,
      source: 'manual',
    }).select().single();

    if (error) {
      console.error('Reminder insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const timeStr = triggerAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Europe/Amsterdam',
    });

    return NextResponse.json({
      success: true,
      reminder: data,
      message: `Reminder "${title}" set for ${timeStr}${recurring ? ` (recurring)` : ''}`,
    });
  } catch (error: any) {
    console.error('Reminder create error:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}
