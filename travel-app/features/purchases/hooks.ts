import { useQuery } from '@tanstack/react-query';
import { ensureSession, supabase } from '@/lib/supabase';

/**
 * 구매 여부 = 서버의 purchases 기록(영수증 검증 완료)으로만 판정한다.
 * 데모 모드나 결제 연결 전(Phase 1)에는 항상 '구매 안 함'.
 */
export function useIsPurchased(guidebookId: string) {
  return useQuery({
    queryKey: ['purchase', guidebookId],
    queryFn: async () => {
      if (!supabase) return false;
      await ensureSession();
      const { data, error } = await supabase
        .from('purchases').select('id').eq('guidebook_id', guidebookId).eq('receipt_status', 'verified').limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });
}
