import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { AppText } from './AppText';
import { Button } from './Button';

/**
 * 무료 5회를 다 썼을 때 — 막다른 화면이 아니라 안내 (설계서 8장).
 * 직접 짜기 이어 가기(결제 형태 미정)와 같은 도시 가이드북 보기를 함께 보여 준다.
 */
export function FreeLimitSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={s.sheet} onPress={() => {}}>
          <AppText v="title">무료 5회를 모두 썼어요</AppText>
          <AppText v="body" color={color.sub} style={{ marginTop: space.xs }}>
            이미 만든 일정은 계속 보고 고칠 수 있어요. 새 여행을 더 만들려면 아래에서 골라 주세요.
          </AppText>
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            <Button label="직접 짜기 이어 가기 (준비 중)" variant="secondary" disabled />
            <Button label="같은 도시 가이드북 보기" onPress={() => { onClose(); router.push('/store'); }} />
            <Button label="닫기" variant="ghost" onPress={onClose} />
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
