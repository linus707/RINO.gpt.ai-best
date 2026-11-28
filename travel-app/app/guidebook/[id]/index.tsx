import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { LockBadge, Tag } from '@/components/Badges';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ImportSheet } from '@/components/ImportSheet';
import { RedeemSheet } from '@/components/RedeemSheet';
import { Screen } from '@/components/Screen';
import { StopRow } from '@/components/StopRow';
import { Suitcase } from '@/components/Suitcase';
import { color, radius, space } from '@/constants/design';
import { useGuidebook } from '@/features/guidebooks/hooks';
import { PURCHASE_ENABLED } from '@/lib/iap';

/** 가이드북 상세 — 목차(누구나) + 1일차 무료 미리보기. 보유하면 전체 코스·내 일정으로 불러오기 */
export default function GuidebookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { book, owned, isLoading } = useGuidebook(id);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  if (!book) return <Screen>{isLoading ? <AppText color={color.sub}>불러오는 중…</AppText> : <EmptyState title="가이드북을 찾을 수 없어요" description="스토어에서 다시 골라 주세요." />}</Screen>;
  const preview = book.stops.filter((s) => s.day <= book.previewDays);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: book.title }} />
      <View style={s.cover}>
        <View style={{ position: 'absolute', right: 0, top: 4 }}><Suitcase width={120} height={138} /></View>
        <AppText v="title" color={color.white} style={{ fontWeight: '800' }}>{book.title}</AppText>
        <AppText v="caption" color={color.white}>{book.theme}</AppText>
      </View>
      <View style={s.meta}>
        <AppText v="bodyBold">{owned ? '보유 중' : '가격 미정'}</AppText>
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          {owned ? <Tag label="전체 코스 열림" /> : null}
          {book.isSample ? <Tag label="샘플" tone="outline" /> : null}
        </View>
      </View>

      <AppText v="subtitle" style={{ marginTop: space.xl, marginBottom: space.sm }}>목차</AppText>
      {book.toc.map((t, i) => (
        <View key={t} style={s.toc}>
          <AppText v="body" style={{ flex: 1 }}>{i + 1}일차 · {t}</AppText>
          {i < book.previewDays || owned ? <AppText v="caption" color={color.sub}>열람 가능</AppText> : <LockBadge />}
        </View>
      ))}

      {owned ? (
        <View style={{ gap: space.sm, marginTop: space.xl }}>
          <Button label="전체 코스 보기" onPress={() => router.push(`/guidebook/${book.id}/course`)} />
          <Button label="내 일정으로 불러오기" variant="secondary" onPress={() => setImportOpen(true)} />
          <AppText v="caption" color={color.sub}>불러온 일정은 무료 횟수와 관계없이 자유롭게 고칠 수 있어요.</AppText>
        </View>
      ) : (
        <>
          <AppText v="subtitle" style={{ marginTop: space.xl, marginBottom: space.sm }}>1일차 무료 미리보기</AppText>
          {preview.map((st, i) => <StopRow key={`${st.day}-${st.order}`} stop={st} order={i + 1} />)}
          <View style={{ gap: space.sm, marginTop: space.xl }}>
            <Button label={PURCHASE_ENABLED ? '구매하기' : '구매하기 (결제 연결 준비 중)'} disabled={!PURCHASE_ENABLED} />
            <Button label="이용권 코드가 있어요" variant="secondary" onPress={() => setRedeemOpen(true)} />
            <AppText v="caption" color={color.sub}>이벤트·베타 테스트로 받은 코드를 넣으면 전체 코스가 열려요.</AppText>
          </View>
        </>
      )}
      <RedeemSheet visible={redeemOpen} onClose={() => setRedeemOpen(false)} />
      <ImportSheet book={book} visible={importOpen} onClose={() => setImportOpen(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  cover: { backgroundColor: color.brand, borderRadius: radius.xl, padding: space.xl, minHeight: 150, justifyContent: 'flex-end', overflow: 'hidden' },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  toc: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: color.line, gap: space.sm },
});
