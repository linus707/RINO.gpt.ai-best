import { router, useLocalSearchParams } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { useIsPurchased } from '@/features/purchases/hooks';

/** 구매 후 열리는 전체 코스. 구매 기록(서버)이 없으면 잠금 안내 */
export default function Course() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: purchased } = useIsPurchased(id);
  return (
    <Screen edges={['bottom']}>
      {purchased ? (
        <EmptyState title="전체 코스 화면 자리" description="Phase 4에서 일자별 코스와 '내 일정으로 불러오기'가 들어와요." />
      ) : (
        <EmptyState title="구매 후 열리는 코스예요" description="첫날은 상세 화면에서 무료로 미리 볼 수 있어요." actionLabel="미리보기로 돌아가기" onAction={() => router.replace(`/guidebook/${id}`)} />
      )}
    </Screen>
  );
}
