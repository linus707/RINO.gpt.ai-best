import { Text, type TextProps } from 'react-native';
import { color as C, font } from '@/constants/design';

type Variant = keyof typeof font;
export function AppText({ v = 'body', color = C.ink, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <Text {...rest} style={[font[v], { color }, style]} />;
}
