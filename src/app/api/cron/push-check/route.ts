import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gethansei.com';

async function sendPush(userId: string, title: string, body: string, pushType: string, url = '/app', tag?: string) {
  const res = await fetch(`${APP_URL}/api/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ userId, title, body, pushType, url, tag: tag || pushType }),
  });
  return res.json();
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  const results: string[] = [];

  // Get all users with active push subscriptions
  const { data: subscribers } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .eq('active', true);

  if (!subscribers?.length) {
    return NextResponse.json({ message: 'No subscribers', results });
  }

  const uniqueUserIds = [...new Set(subscribers.map(s => s.user_id))];

  for (const userId of uniqueUserIds) {
    try {
      await processUser(supabase, userId, now, results);
    } catch (err) {
      results.push(`Error for ${userId}: ${err}`);
    }
  }

  return NextResponse.json({ processed: uniqueUserIds.length, results });
}

async function processUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  now: Date,
  results: string[]
) {
  // Anti-spam: check today's push count (exclude custom reminders)
  // Use user's local midnight in UTC — NOT UTC midnight (critical for negative-offset timezones like HST)
  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);
  const hNow = parseInt(todayParts.find(p => p.type === 'hour')?.value || '0');
  const mNow = parseInt(todayParts.find(p => p.type === 'minute')?.value || '0');
  const sNow = parseInt(todayParts.find(p => p.type === 'second')?.value || '0');
  // Subtract elapsed seconds since midnight in user's TZ to get user's local midnight in UTC
  const todayStart = new Date(now.getTime() - (hNow * 3600 + mNow * 60 + sNow) * 1000);

  const { data: todayPushes } = await supabase
    .from('push_log')
    .select('id, push_type, dismissed')
    .eq('user_id', userId)
    .gte('sent_at', todayStart.toISOString())
    .neq('push_type', 'custom_reminder');

  const systemPushCount = todayPushes?.length || 0;
  if (systemPushCount >= 2) {
    results.push(`${userId}: max daily pushes reached`);
    return;
  }

  // Anti-spam: check consecutive dismisses
  const { data: recentPushes } = await supabase
    .from('push_log')
    .select('dismissed')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(3);

  if (recentPushes?.length === 3 && recentPushes.every(p => p.dismissed)) {
    results.push(`${userId}: 3 consecutive dismisses, skipping`);
    return;
  }

  // Get user's timezone from metadata
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
  const userTimezone = (authUser as any)?.user_metadata?.timezone || 'UTC';
  const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  const hour = userNow.getHours();

  // Quiet hours: 23:00-07:00 in user's timezone
  if (hour >= 23 || hour < 7) {
    return;
  }

  // Anti-spam: check if app opened recently (via activity_log)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const { data: recentActivity } = await supabase
    .from('activity_log')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', twoHoursAgo.toISOString())
    .limit(1);

  if (recentActivity?.length) {
    results.push(`${userId}: active recently, skipping system pushes`);
    // Still process custom reminders below
  }

  const isRecentlyActive = (recentActivity?.length || 0) > 0;

  // === Custom Reminders (always processed, no anti-spam limits) ===
  const { data: dueReminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .lte('next_trigger', now.toISOString());

  if (dueReminders?.length) {
    for (const reminder of dueReminders) {
      await sendPush(
        userId,
        reminder.title,
        reminder.title,
        'custom_reminder',
        '/app/tasks',
        `reminder-${reminder.id}`
      );

      if (reminder.schedule_type === 'recurring' && reminder.interval_ms) {
        const nextTrigger = new Date(now.getTime() + reminder.interval_ms);
        await supabase
          .from('reminders')
          .update({ last_triggered: now.toISOString(), next_trigger: nextTrigger.toISOString() })
          .eq('id', reminder.id);
      } else {
        await supabase
          .from('reminders')
          .update({ active: false, last_triggered: now.toISOString() })
          .eq('id', reminder.id);
      }

      results.push(`${userId}: sent reminder "${reminder.title}"`);
    }
  }

  // Skip system pushes if recently active
  if (isRecentlyActive) return;

  // Check which system push types were already sent today
  const sentTypes = new Set(todayPushes?.map(p => p.push_type) || []);

  // === Morning Nudge (7-9 UTC window) ===
  if (hour >= 7 && hour < 9 && !sentTypes.has('morning_nudge')) {
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'task')
      .eq('completed', false)
      .is('parent_idea_id', null);

    const count = pendingTasks?.length || 0;
    if (count > 0) {
      await sendPush(
        userId,
        'Good morning',
        `You have ${count} pending task${count > 1 ? 's' : ''}`,
        'morning_nudge',
        '/app/tasks',
        'morning_nudge'
      );
      results.push(`${userId}: morning nudge (${count} tasks)`);
      return; // Max 1 system push per cron run
    }
  }

  // === Idea Decay (72h without action) ===
  if (!sentTypes.has('idea_decay')) {
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const { data: staleIdeas } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', userId)
      .eq('type', 'idea')
      .lte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: true })
      .limit(1);

    if (staleIdeas?.length) {
      const idea = staleIdeas[0];
      await sendPush(
        userId,
        'Idea waiting',
        `Your idea "${idea.title}" is waiting for action`,
        'idea_decay',
        '/app/ideas',
        'idea_decay'
      );
      results.push(`${userId}: idea decay "${idea.title}"`);
      return;
    }
  }

  // === Streak Protection (17-19 UTC window) ===
  if (hour >= 17 && hour < 19 && !sentTypes.has('streak_protection')) {
    // Check if user has completed a task today
    const { data: todayCompleted } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', todayStart.toISOString())
      .limit(1);

    // Check if user had a streak yesterday
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const { data: yesterdayCompleted } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', yesterday.toISOString())
      .lt('completed_at', todayStart.toISOString())
      .limit(1);

    if (!todayCompleted?.length && yesterdayCompleted?.length) {
      await sendPush(
        userId,
        'Streak alert',
        "Don't break your streak! Complete a task today.",
        'streak_protection',
        '/app/tasks',
        'streak_protection'
      );
      results.push(`${userId}: streak protection`);
      return;
    }
  }

  // === Dream Journal Nudge (21-23 UTC window, 7+ days without dream) ===
  if (hour >= 21 && hour < 23 && !sentTypes.has('dream_nudge')) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: recentDreams } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'dream')
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(1);

    if (!recentDreams?.length) {
      await sendPush(
        userId,
        'Dream journal',
        "Record tonight's dream before you forget.",
        'dream_nudge',
        '/app/dreams',
        'dream_nudge'
      );
      results.push(`${userId}: dream nudge`);
    }
  }
}

// Also support POST for Vercel Cron
export async function POST(request: NextRequest) {
  return GET(request);
}
