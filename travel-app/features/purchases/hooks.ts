import { useOwned } from '@/features/guidebooks/hooks';

/**
 * 보유 여부 = 서버의 purchases 기록(검증된 결제 또는 이용권 코드)으로만 판정한다.
 * 결제(Phase 4 결제 단계)가 붙어도 같은 기록을 쓰므로 화면은 바뀌지 않는다.
 */
export function useIsPurchased(guidebookId: string) {
  const q = useOwned();
  return { ...q, data: q.data ? q.data.includes(guidebookId) : undefined };
}
