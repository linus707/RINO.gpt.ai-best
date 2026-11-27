import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PlaceRow } from '@/components/Cards';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { color, font, radius, space } from '@/constants/design';
import { useListEdit, useLists } from '@/features/lists/hooks';
import { GoogleAttribution } from '@/features/places/GoogleAttribution';
import { useResolvedPlaces } from '@/features/places/hooks';
import { refKey, routeId } from '@/features/places/types';

/** 모음 한 개 — 이름 바꾸기, 장소 빼기, 모음 삭제 */
export default function ListDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lists, isLoading } = useLists();
  const edit = useListEdit();
  const list = lists?.find((l) => l.id === id);
  const { byKey, loading } = useResolvedPlaces(list?.items ?? []);
  const [title, setTitle] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (list) setTitle(list.title); }, [list?.title]);

  if (!list) {
    return <Screen>{isLoading ? <AppText color={color.sub}>불러오는 중…</AppText> : <EmptyState title="모음을 찾을 수 없어요" description="삭제됐거나 다른 계정의 모음이에요." actionLabel="내 모음으로" onAction={() => router.replace('/saved')} />}</Screen>;
  }
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: list.title }} />
      <View style={s.row}>
        <TextInput value={title} onChangeText={setTitle} maxLength={40} style={s.input} accessibilityLabel="모음 이름" />
        <Button label="이름 저장" variant="secondary" onPress={() => edit.rename.mutate({ id: list.id, title })} disabled={!title.trim() || title.trim() === list.title} style={{ minHeight: 48 }} />
      </View>
      {list.items.length ? list.items.map((i) => {
        const p = byKey.get(refKey(i));
        return p ? (
          <PlaceRow key={i.itemId} place={p} onPress={() => router.push(`/place/${encodeURIComponent(routeId(p))}`)}
            right={
              <Pressable onPress={() => edit.toggle.mutate({ listId: list.id, ref: i, on: false })} accessibilityRole="button" accessibilityLabel={`${p.name} 모음에서 빼기`}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={18} color={color.sub} />
              </Pressable>
            } />
        ) : <AppText key={i.itemId} v="caption" color={color.sub} style={{ marginBottom: space.sm }}>{loading ? '장소 정보를 불러오는 중…' : '장소 정보를 불러오지 못했어요'}</AppText>;
      }) : (
        <EmptyState title="아직 비어 있어요" description="장소 상세 화면의 '모음에 담기'로 이 모음에 장소를 넣어요." actionLabel="장소 둘러보기" onAction={() => router.push('/place/search')} />
      )}
      {list.items.some((i) => i.source === 'google') ? <GoogleAttribution /> : null}
      <Button label="모음 삭제" variant="ghost" onPress={() => setConfirm(true)} style={{ marginTop: space.xl }} />
      <ConfirmSheet visible={confirm} title="모음을 삭제할까요?" body="모음만 지워지고, 저장한 장소와 일정은 그대로 남아요." confirmLabel="모음 삭제" danger
        onConfirm={() => { edit.remove.mutate(list.id); setConfirm(false); router.replace('/saved'); }} onClose={() => setConfirm(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  input: { ...font.body, flex: 1, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.md, color: color.ink },
});
