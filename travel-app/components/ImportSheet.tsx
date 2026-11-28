import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { color, font, radius, space } from '@/constants/design';
import type { Guidebook } from '@/features/guidebooks/data';
import { useImportGuidebook } from '@/features/guidebooks/hooks';
import { addDays, isValidDate, shortDate } from '@/features/trips/dates';
import { AppText } from './AppText';
import { Button } from './Button';

const defaultStart = () => addDays(new Date().toISOString().slice(0, 10), 30);

/** 내 일정으로 불러오기 — 출발일만 고르면 코스가 내 여행으로 복사된다 (무료 횟수 차감 없음) */
export function ImportSheet({ book, visible, onClose }: { book: Guidebook; visible: boolean; onClose: () => void }) {
  const [start, setStart] = useState(defaultStart);
  const imp = useImportGuidebook();
  const ok = isValidDate(start);
  const run = () => imp.mutate({ book, startDate: start }, { onSuccess: () => { onClose(); router.push('/itinerary'); } });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={s.sheet} onPress={() => {}} accessibilityViewIsModal>
          <AppText v="title">내 일정으로 불러오기</AppText>
          <AppText v="body" color={color.sub} style={{ marginTop: space.xs }}>
            {book.title} 코스가 내 여행으로 복사돼요. 무료 횟수는 줄지 않고, 복사한 일정은 자유롭게 고칠 수 있어요.
          </AppText>
          <AppText v="caption" style={{ fontWeight: '700', marginTop: space.lg, marginBottom: space.sm }}>출발일</AppText>
          <TextInput value={start} onChangeText={setStart} style={s.input} placeholder="2027-01-15" inputMode="numeric" accessibilityLabel="출발일" />
          {ok ? <AppText v="caption" color={color.sub} style={{ marginTop: space.sm }}>{shortDate(start)} – {shortDate(addDays(start, book.days - 1))} · {book.days}일</AppText>
            : <AppText v="caption" color={color.danger} style={{ marginTop: space.sm }}>날짜를 2027-01-15 형식으로 적어 주세요.</AppText>}
          {imp.error ? <AppText v="caption" color={color.danger} style={{ marginTop: space.sm }}>불러오지 못했어요. 잠시 후 다시 시도해 주세요.</AppText> : null}
          <Button label="불러오기" onPress={run} disabled={!ok} loading={imp.isPending} style={{ marginTop: space.lg }} />
          <Button label="닫기" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { flex: 1, backgroundColor: color.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 520, backgroundColor: color.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: space.xxl },
  input: { ...font.body, fontSize: 16, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.md, color: color.ink },
});
