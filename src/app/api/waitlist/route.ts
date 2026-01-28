import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

async function supabase(endpoint: string, options: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
}

async function getCount(): Promise<number> {
  const res = await supabase('waitlist?select=id', {
    headers: { 'Prefer': 'count=exact' },
  });
  return parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    const checkRes = await supabase(
      `waitlist?email=eq.${encodeURIComponent(normalizedEmail)}&select=id`
    );
    const existing = await checkRes.json();

    if (existing?.length > 0) {
      const count = await getCount();
      return NextResponse.json({ message: 'Already registered', count });
    }

    // Insert
    const insertRes = await supabase('waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail, source: 'landing-page' }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.json();
      console.error('Supabase error:', err);
      throw new Error('Insert failed');
    }

    const count = await getCount();
    console.log(`📧 Waitlist signup: ${normalizedEmail} (Total: ${count})`);

    return NextResponse.json({ message: 'Success', count });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const count = await getCount();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
