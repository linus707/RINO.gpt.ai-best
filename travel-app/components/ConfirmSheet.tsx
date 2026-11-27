import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { AppText } from './AppText';
import { Button } from './Button';

/** 되돌릴 수 없는 일을 하기 전 확인 (계정 삭제·로그아웃) */
export function ConfirmSheet({ visible, title, body, confirmLabel, danger, busy, onConfirm, onClose }: {
  visible: boolean; title: string; body: string; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={s.sheet} onPress={() => {}} accessibilityViewIsModal>
          <AppText v="title">{title}</AppText>
          <AppText v="body" color={color.sub} style={{ marginTop: space.xs }}>{body}</AppText>
          <View style={{ gap: space.sm, marginTop: space.xl }}>
            <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} loading={busy} />
            <Button label="취소" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { flex: 1, backgroundColor: color.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 520, backgroundColor: color.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: space.xxl },
});
