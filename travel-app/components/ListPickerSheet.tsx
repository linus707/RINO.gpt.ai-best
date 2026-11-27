import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { color, font, radius, space } from '@/constants/design';
import { useListEdit, useLists } from '@/features/lists/hooks';
import type { PlaceRef } from '@/features/places/types';
import { newItemId } from '@/features/trips/itinerary';
import { AppText } from './AppText';
import { Button } from './Button';

/** 장소를 내 모음에 넣고 빼기 + 새 모음 바로 만들기 */
export function ListPickerSheet({ place, name, visible, onClose }: { place: PlaceRef; name: string; visible: boolean; onClose: () => void }) {
  const { data: lists } = useLists();
  const edit = useListEdit();
  const [title, setTitle] = useState('');
  const create = () => {
    const t = title.trim();
    if (!t) return;
    const id = newItemId();
    edit.create.mutate({ id, title: t }, { onSuccess: () => edit.toggle.mutate({ listId: id, ref: place, on: true }) });
    setTitle('');
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={s.sheet} onPress={() => {}} accessibilityViewIsModal>
          <AppText v="title">모음에 담기</AppText>
          <AppText v="caption" color={color.sub} style={{ marginBottom: space.md }}>{name}</AppText>
          <ScrollView style={{ maxHeight: 280 }}>
            {(lists ?? []).map((l) => {
              const on = l.items.some((i) => i.source === place.source && i.id === place.id);
              return (
                <Pressable key={l.id} onPress={() => edit.toggle.mutate({ listId: l.id, ref: place, on: !on })}
                  accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} style={s.item}>
                  <View style={[s.box, on && s.boxOn]}>{on ? <AppText v="caption" color={color.white} style={{ fontWeight: '800' }}>✓</AppText> : null}</View>
                  <AppText v="body" style={{ flex: 1 }}>{l.title}</AppText>
                  <AppText v="caption" color={color.sub}>{l.items.length}곳</AppText>
                </Pressable>
              );
            })}
            {!lists?.length ? <AppText v="caption" color={color.sub}>아직 모음이 없어요. 아래에서 첫 모음을 만들어 보세요.</AppText> : null}
          </ScrollView>
          <View style={s.newRow}>
            <TextInput value={title} onChangeText={setTitle} onSubmitEditing={create} placeholder="새 모음 이름 (예: 오사카 맛집 후보)"
              maxLength={40} style={s.input} accessibilityLabel="새 모음 이름" />
            <Button label="만들기" onPress={create} disabled={!title.trim()} style={{ minHeight: 48 }} />
          </View>
          <Button label="완료" variant="ghost" onPress={onClose} style={{ marginTop: space.sm }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { flex: 1, backgroundColor: color.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 520, backgroundColor: color.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: space.xxl },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  box: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: color.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.action, borderColor: color.action },
  newRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  input: { ...font.body, flex: 1, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.md, color: color.ink },
});
