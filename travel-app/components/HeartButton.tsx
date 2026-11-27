import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color } from '@/constants/design';
import type { PlaceRef } from '@/features/places/types';
import { useSavedFor, useToggleSave } from '@/features/saved/hooks';

/** 저장(하트) — 빨강은 '저장됨' 표시에만 */
export function HeartButton({ place, name, size = 22 }: { place: PlaceRef; name: string; size?: number }) {
  const saved = useSavedFor(place);
  const toggle = useToggleSave();
  const on = !!saved;
  return (
    <Pressable
      onPress={() => toggle.mutate({ ref: place, on: !on })}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? `${name} 저장 취소` : `${name} 저장`}
      hitSlop={6}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
      testID={`heart-${place.id}`}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
          fill={on ? color.brand : 'none'} stroke={on ? color.brand : color.sub} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}
