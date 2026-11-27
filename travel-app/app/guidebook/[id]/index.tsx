import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { LockBadge, Tag } from '@/components/Badges';
import { Button } from '@/components/Button';
import { PlaceRow } from '@/components/Cards';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Suitcase } from '@/components/Suitcase';
import { color, radius, space } from '@/constants/design';
import { guidebookById } from '@/features/guidebooks/data';
import { placeById } from '@/features/places/data';
import { ourToResolved } from '@/features/places/hooks';
import { useIsPurchased } from '@/features/purchases/hooks';
import { PURCHASE_ENABLED } from '@/lib/iap';

/** 가이드북 상세 — 목차 + 첫날 무료 미리보기. 구매 전 본문 잠금 (로그인 없이 열람 가능) */
export default function GuidebookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = guidebookById(id);
  const { data: purchased } = useIsPurchased(id);
  if (!book) return <Screen><EmptyState title="가이드북을 찾을 수 없어요" description="스토어에서 다시 골라 주세요." /></Screen>;
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: book.title }} />
      <View style={s.cover}>
        <View style={{ position: 'absolute', right: 0, top: 4 }}><Suitcase width={120} height={138} /></View>
        <AppText v="title" color={color.white} style={{ fontWeight: '800' }}>{book.title}</AppText>
        <AppText v="caption" color={color.white}>{book.theme}</AppText>
      </View>
      <View style={s.meta}>
        <AppText v="bodyBold">가격 미정</AppText>
        {book.isSample ? <Tag label="샘플" tone="outline" /> : null}
      </View>

      <AppText v="subtitle" style={{ marginTop: space.xl, marginBottom: space.sm }}>목차</AppText>
      {book.toc.map((t, i) => (
        <View key={t} style={s.toc}>
          <AppText v="body" style={{ flex: 1 }}>{i + 1}일차 · {t}</AppText>
          {i < book.previewDays || purchased ? <AppText v="caption" color={color.sub}>열람 가능</AppText> : <LockBadge />}
        </View>
      ))}

      <AppText v="subtitle" style={{ marginTop: space.xl, marginBottom: space.sm }}>1일차 무료 미리보기</AppText>
      {book.previewPlaceIds.map((pid, i) => {
        const p = placeById(pid);
        return p ? <PlaceRow key={pid} place={ourToResolved(p)} order={i + 1} /> : null;
      })}

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        {purchased ? (
          <Button label="전체 코스 보기" onPress={() => router.push(`/guidebook/${book.id}/course`)} />
        ) : (
          <>
            <Button label={PURCHASE_ENABLED ? '구매하기' : '구매하기 (Phase 4에서 연결)'} disabled={!PURCHASE_ENABLED} />
            <AppText v="caption" color={color.sub}>앱은 스토어 인앱결제, 웹은 외부 결제로 연결돼요. 구매한 코스는 무료 횟수와 관계없이 내 일정으로 불러올 수 있어요.</AppText>
          </>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  cover: { backgroundColor: color.brand, borderRadius: radius.xl, padding: space.xl, minHeight: 150, justifyContent: 'flex-end', overflow: 'hidden' },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  toc: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: color.line, gap: space.sm },
});
