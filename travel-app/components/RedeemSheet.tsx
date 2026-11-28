import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { color, font, radius, space } from '@/constants/design';
import { RedeemError } from '@/features/guidebooks/api';
import { useRedeem } from '@/features/guidebooks/hooks';
import { isDemoMode } from '@/lib/env';
import { AppText } from './AppText';
import { Button } from './Button';

const MSG: Record<RedeemError['reason'], string> = {
  invalid: '코드를 다시 확인해 주세요.',
  expired: '사용 기간이 지난 코드예요.',
  used_up: '이미 모두 사용된 코드예요.',
  too_many: '오늘 시도 횟수를 넘었어요. 내일 다시 시도해 주세요.',
  error: '등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

/** 이용권 코드 등록 — 베타 테스트·이벤트 선물용 (결제와 같은 '보유' 기록이 생김) */
export function RedeemSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone?: (guidebookId: string) => void }) {
  const [code, setCode] = useState('');
  const redeem = useRedeem();
  const err = redeem.error instanceof RedeemError ? MSG[redeem.error.reason] : redeem.error ? MSG.error : '';
  const submit = () => redeem.mutate(code, { onSuccess: (id) => { setCode(''); onClose(); onDone?.(id); } });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={s.sheet} onPress={() => {}} accessibilityViewIsModal>
          <AppText v="title">이용권 코드 등록</AppText>
          <AppText v="body" color={color.sub} style={{ marginTop: space.xs }}>
            받은 코드를 넣으면 가이드북 전체 코스가 열려요.{isDemoMode ? ' (데모 코드: DEMO-OSAKA)' : ''}
          </AppText>
          <TextInput value={code} onChangeText={(t) => { setCode(t); redeem.reset(); }} onSubmitEditing={submit} autoCapitalize="characters" autoCorrect={false}
            placeholder="예: RINO-2027-ABCD" style={s.input} accessibilityLabel="이용권 코드" maxLength={40} />
          {err ? <AppText v="caption" color={color.danger} style={{ marginTop: space.sm }} accessibilityLiveRegion="polite">{err}</AppText> : null}
          <Button label="등록하기" onPress={submit} disabled={code.trim().length < 6} loading={redeem.isPending} style={{ marginTop: space.lg }} />
          <Button label="닫기" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { flex: 1, backgroundColor: color.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 520, backgroundColor: color.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: space.xxl },
  input: { ...font.bodyBold, fontSize: 18, letterSpacing: 1, minHeight: 52, borderRadius: radius.md, backgroundColor: color.surface, paddingHorizontal: space.lg, color: color.ink, marginTop: space.lg },
});
