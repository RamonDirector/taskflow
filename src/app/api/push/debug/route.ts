import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'SET (' + process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.substring(0, 10) + '...)' : 'MISSING',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ? 'SET' : 'MISSING',
    vapidEmail: process.env.VAPID_EMAIL || 'MISSING',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
  });
}
