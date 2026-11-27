import { isDemoMode } from '@/lib/env';
import { describeAccount, useAuthStore } from '@/stores/authStore';

export function useAccount() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const meta = (session?.user.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    ...describeAccount(session, ready, isDemoMode),
    name: meta.name ?? meta.full_name ?? meta.nickname ?? null,
  };
}
