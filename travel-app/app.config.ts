import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json을 기본으로 쓰고, 빌드할 때만 필요한 값을 환경변수에서 붙인다.
 * ANDROID_GOOGLE_MAPS_API_KEY: Android 정식 빌드(EAS)용 Google 지도 키. Expo Go 개발 중에는 없어도 된다.
 * (키는 Google Cloud에서 이 앱의 패키지 이름으로 사용 제한을 걸어 둔다)
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY }],
  ],
});
