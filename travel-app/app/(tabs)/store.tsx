import { router } from 'expo-router';
import { View } from 'react-native';
import { GuidebookCard } from '@/components/Cards';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { space } from '@/constants/design';
import { GUIDEBOOKS } from '@/features/guidebooks/data';
import { useIsPurchased } from '@/features/purchases/hooks';

function Item({ id }: { id: string }) {
  const book = GUIDEBOOKS.find((b) => b.id === id)!;
  const { data: purchased } = useIsPurchased(id);
  return <GuidebookCard book={book} purchased={!!purchased} onPress={() => router.push(`/guidebook/${id}`)} />;
}

/** 가이드북 스토어 — 로그인 없이 둘러볼 수 있다(심사 기준). 첫 상품: 오사카 3박 4일 */
export default function Store() {
  return (
    <Screen title="가이드북">
      <View style={{ gap: space.xl }}>
        {GUIDEBOOKS.map((b) => <Item key={b.id} id={b.id} />)}
        <EmptyState title="다음 도시 가이드북 준비 중" description="오사카가 첫 상품이에요. 도시가 늘어나면 이곳에 카드가 쌓여요." />
      </View>
    </Screen>
  );
}
