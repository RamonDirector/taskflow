/**
 * Timezone detection and sync for Hansei.
 * Uses IANA timezone strings (e.g. "America/New_York", "Europe/Amsterdam").
 * Fallback chain: localStorage → detectTimezone() → 'UTC'
 */

const STORAGE_KEY = 'hansei-timezone';

/** Detect the user's timezone from the browser */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Get the user's timezone (localStorage → detect → UTC) */
export function getUserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  return localStorage.getItem(STORAGE_KEY) || detectTimezone();
}

/** Sync timezone to localStorage and Supabase user metadata */
export async function syncTimezone(supabase: { auth: { updateUser: (params: { data: Record<string, unknown> }) => Promise<unknown> } }): Promise<void> {
  const tz = detectTimezone();
  const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

  if (tz !== stored) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, tz);
    }
    try {
      await supabase.auth.updateUser({ data: { timezone: tz } });
    } catch (e) {
      console.error('Failed to sync timezone:', e);
    }
  }
}
