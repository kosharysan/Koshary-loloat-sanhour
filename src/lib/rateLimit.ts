import { getServiceSupabase } from '@/lib/supabaseAdmin';

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function hitMemoryLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (current.count >= max) return true;
  current.count += 1;
  return false;
}

function clearMemoryLimit(key: string) {
  memoryBuckets.delete(key);
}

/** Returns true when the caller should be blocked. */
export async function hitRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('hit_rate_limit', {
        p_key: key,
        p_max: max,
        p_window_ms: windowMs,
      });
      if (!error && typeof data === 'boolean') return data;
    } catch {
      // Fall through to in-process limiter if the SQL function is not deployed yet.
    }
  }
  return hitMemoryLimit(key, max, windowMs);
}

export async function clearRateLimit(key: string): Promise<void> {
  clearMemoryLimit(key);
  const supabase = getServiceSupabase();
  if (!supabase) return;
  try {
    await supabase.from('rate_buckets').delete().eq('key', key);
  } catch {
    // Ignore missing table until the security SQL is applied.
  }
}
