import { router } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function NotFound() {
  return (
    <Screen title="길을 잃었어요">
      <EmptyState title="없는 페이지예요" description="주소가 바뀌었거나 삭제된 화면이에요." actionLabel="홈으로" onAction={() => router.replace('/')} />
    </Screen>
  );
}
