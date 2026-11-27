import { ensureSession, supabase } from '@/lib/supabase';
import { useDemoStore } from '@/stores/demoStore';
import { FREE_TRIP_LIMIT } from './constants';

export type Usage = { used: number; limit: number; remaining: number };

/** 남은 무료 횟수 — 서버의 usage_counter가 기준 (설계서 3장 핵심 규칙) */
export async function fetchUsage(): Promise<Usage> {
  let used = 0;
  if (!supabase) {
    used = useDemoStore.getState().freeUsed;
  } else {
    const session = await ensureSession();
    const { data, error } = await supabase
      .from('usage_counter')
      .select('free_used')
      .eq('user_id', session!.user.id)
      .maybeSingle();
    if (error) throw error;
    used = data?.free_used ?? 0;
  }
  return { used, limit: FREE_TRIP_LIMIT, remaining: Math.max(0, FREE_TRIP_LIMIT - used) };
}
