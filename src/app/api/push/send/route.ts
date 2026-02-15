import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:hello@gethansei.com';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  pushType?: string;
  silent?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Verify internal call (API key or cron secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: PushPayload = await request.json();
    const { userId, title, body, url = '/app', tag, pushType = 'custom', silent = false } = payload;

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role to access push_subscriptions
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get active subscriptions for user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (error || !subscriptions?.length) {
      return NextResponse.json({ sent: 0, reason: 'No active subscriptions' });
    }

    const pushData = JSON.stringify({ title, body, url, tag, silent });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key,
            },
          },
          pushData
        );
        sent++;
      } catch (err: unknown) {
        const pushError = err as { statusCode?: number };
        // If subscription expired (410 Gone), deactivate it
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ active: false })
            .eq('id', sub.id);
        }
        failed++;
      }
    }

    // Log the push
    await supabase.from('push_log').insert({
      user_id: userId,
      push_type: pushType,
      title,
      body,
    });

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Failed to send push' }, { status: 500 });
  }
}
