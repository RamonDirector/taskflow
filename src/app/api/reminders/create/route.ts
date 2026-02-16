import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Parse reminder_time string into a Date.
 * Handles: "07:30", "15:00", "tomorrow 09:00", "in 30 minutes", "in 2 hours"
 */
/**
 * Get the CET offset and current Amsterdam time
 */
function getAmsterdamContext() {
  const now = new Date();
  const amsterdamNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
  const cetOffset = Math.round((amsterdamNow.getTime() - now.getTime()) / (60 * 60 * 1000));
  return { now, amsterdamNow, cetOffset };
}

/**
 * Create a Date in CET timezone from hours/minutes, on a specific date
 */
function createCETDate(baseDate: Date, hours: number, minutes: number, cetOffset: number): Date {
  const target = new Date(baseDate);
  target.setUTCHours(hours - cetOffset, minutes, 0, 0);
  return target;
}

/**
 * Get next occurrence of a weekday (0=Sun, 1=Mon, ..., 6=Sat)
 * If "next" prefix, always skip this week
 */
function getNextWeekday(targetDay: number, skipThisWeek: boolean = false): Date {
  const { amsterdamNow } = getAmsterdamContext();
  const currentDay = amsterdamNow.getDay();
  let daysAhead = targetDay - currentDay;
  if (daysAhead <= 0 || skipThisWeek) daysAhead += 7;
  if (skipThisWeek && daysAhead <= 7) daysAhead += 7; // "next" = skip this week entirely
  // Wait, "next thursday" when today is monday should be this thursday? No — "next" typically means the one after the coming one
  // Actually in common Spanish: "el próximo jueves" = this coming thursday. "el jueves que viene" = same.
  // Let's simplify: skipThisWeek only adds 7 if daysAhead was already positive
  if (skipThisWeek) {
    daysAhead = targetDay - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    // "próximo" in Spanish usually just means "this coming one", same as "el jueves"
    // Only force +7 if we want to truly skip. For now treat "próximo" = next occurrence.
  }
  
  const result = new Date(amsterdamNow);
  result.setDate(result.getDate() + daysAhead);
  return result;
}

const DAY_NAMES_EN: Record<string, number> = {
  'sunday': 0, 'sun': 0,
  'monday': 1, 'mon': 1,
  'tuesday': 2, 'tue': 2, 'tues': 2,
  'wednesday': 3, 'wed': 3,
  'thursday': 4, 'thu': 4, 'thurs': 4,
  'friday': 5, 'fri': 5,
  'saturday': 6, 'sat': 6,
};

const DAY_NAMES_ES: Record<string, number> = {
  'domingo': 0, 'dom': 0,
  'lunes': 1, 'lun': 1,
  'martes': 2, 'mar': 2,
  'miércoles': 3, 'miercoles': 3, 'mié': 3, 'mie': 3,
  'jueves': 4, 'jue': 4,
  'viernes': 5, 'vie': 5,
  'sábado': 6, 'sabado': 6, 'sáb': 6, 'sab': 6,
};

function parseReminderTime(timeStr: string | null): Date {
  if (!timeStr) {
    // Default: 1 hour from now
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  const lower = timeStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const original = timeStr.toLowerCase().trim();
  const { now, cetOffset } = getAmsterdamContext();

  // "in X minutes"
  const inMinMatch = lower.match(/(?:in|en)\s+(\d+)\s*min/);
  if (inMinMatch) {
    return new Date(Date.now() + parseInt(inMinMatch[1]) * 60 * 1000);
  }

  // "in X hours" / "en X horas"
  const inHourMatch = lower.match(/(?:in|en)\s+(\d+)\s*h/);
  if (inHourMatch) {
    return new Date(Date.now() + parseInt(inHourMatch[1]) * 60 * 60 * 1000);
  }

  // "in X days" / "en X días"
  const inDayMatch = lower.match(/(?:in|en)\s+(\d+)\s*(?:days?|dias?)/);
  if (inDayMatch) {
    return new Date(Date.now() + parseInt(inDayMatch[1]) * 24 * 60 * 60 * 1000);
  }

  // "tomorrow HH:MM" or "mañana HH:MM"
  const tomorrowMatch = original.match(/(tomorrow|mañana)\s+(\d{1,2})[:\s](\d{2})/);
  if (tomorrowMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return createCETDate(d, parseInt(tomorrowMatch[2]), parseInt(tomorrowMatch[3]), cetOffset);
  }

  // "tomorrow" / "mañana" without time → tomorrow 9:00 CET
  if (/^(tomorrow|manana)$/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return createCETDate(d, 9, 0, cetOffset);
  }

  // Day of week detection (EN + ES)
  // Matches: "thursday", "el jueves", "next friday", "el próximo sábado", "on wednesday", "this tuesday"
  // Optional time after: "thursday 19:00", "el jueves a las 20:00"
  const allDays = { ...DAY_NAMES_EN, ...DAY_NAMES_ES };
  const dayPattern = Object.keys(allDays).sort((a, b) => b.length - a.length).join('|');
  const dayRegex = new RegExp(`(?:(?:el|on|this|next|proximo|la|el proximo|el siguiente)\\s+)?(?:coming\\s+)?(${dayPattern})(?:\\s+(?:a las|at)?\\s*(\\d{1,2})[:\\s](\\d{2}))?`);
  const dayMatch = lower.match(dayRegex);
  
  if (dayMatch) {
    const dayName = dayMatch[1];
    const targetDay = allDays[dayName];
    const isNext = /(?:next|proximo|siguiente)/.test(lower);
    
    if (targetDay !== undefined) {
      const targetDate = getNextWeekday(targetDay, isNext);
      
      // Extract time if provided, otherwise default based on context
      let hours = 9; // default 9:00 AM CET
      let minutes = 0;
      
      if (dayMatch[2] && dayMatch[3]) {
        hours = parseInt(dayMatch[2]);
        minutes = parseInt(dayMatch[3]);
      } else {
        // Check for time keywords
        if (/(?:dinner|cenar|cena|evening|noche|tarde)/.test(lower)) {
          hours = 19; // 7 PM for dinner
        } else if (/(?:lunch|comer|comida|almuerz|mediod[ií]a)/.test(lower)) {
          hours = 13; // 1 PM for lunch
        } else if (/(?:morning|manana|desayun)/.test(lower)) {
          hours = 9;
        } else if (/(?:afternoon|tarde)/.test(lower)) {
          hours = 15;
        }
      }
      
      return createCETDate(targetDate, hours, minutes, cetOffset);
    }
  }

  // "today" / "hoy" with optional time
  const todayMatch = lower.match(/(?:today|hoy)(?:\s+(?:a las|at)?\s*(\d{1,2})[:\s](\d{2}))?/);
  if (todayMatch) {
    const hours = todayMatch[1] ? parseInt(todayMatch[1]) : 9;
    const minutes = todayMatch[2] ? parseInt(todayMatch[2]) : 0;
    const target = createCETDate(now, hours, minutes, cetOffset);
    if (target <= now) {
      target.setTime(target.getTime() + 60 * 60 * 1000); // if past, 1h from now
    }
    return target;
  }

  // Plain time "HH:MM" — assume today, or tomorrow if time already passed
  const timeMatch = original.match(/(\d{1,2})[:\s](\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const target = createCETDate(now, hours, minutes, cetOffset);
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
