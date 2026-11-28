import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { GuidebookCard } from '@/components/Cards';
import { EmptyState } from '@/components/EmptyState';
import { RedeemSheet } from '@/components/RedeemSheet';
import { Screen } from '@/components/Screen';
import { space } from '@/constants/design';
import { GUIDEBOOKS } from '@/features/guidebooks/data';
import { useGuidebooks, useOwned } from '@/features/guidebooks/hooks';

/** 가이드북 스토어 — 로그인 없이 둘러볼 수 있다(심사 기준). 첫 상품: 오사카 3박 4일 */
export default function Store() {
  const { data } = useGuidebooks();
  const { data: owned } = useOwned();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const books = data ?? GUIDEBOOKS;
  return (
    <Screen title="가이드북" right={<Button label="코드 등록" variant="secondary" onPress={() => setRedeemOpen(true)} style={{ minHeight: 36 }} />}>
      <View style={{ gap: space.xl }}>
        {books.map((b) => <GuidebookCard key={b.id} book={b} purchased={!!owned?.includes(b.id)} onPress={() => router.push(`/guidebook/${b.id}`)} />)}
        <EmptyState title="다음 도시 가이드북 준비 중" description="오사카가 첫 상품이에요. 도시가 늘어나면 이곳에 카드가 쌓여요." />
      </View>
      <RedeemSheet visible={redeemOpen} onClose={() => setRedeemOpen(false)} onDone={(id) => router.push(`/guidebook/${id}`)} />
    </Screen>
  );
}
