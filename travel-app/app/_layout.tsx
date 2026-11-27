import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { AuthListener } from '@/components/AuthListener';
import { color } from '@/constants/design';

/** 전체 레이아웃: 서버 데이터(TanStack Query) + 화면 쌓기(Stack). 탭은 (tabs)/_layout.tsx */
export default function RootLayout() {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return (
    <QueryClientProvider client={qc}>
      <AuthListener />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: color.ink,
          headerStyle: { backgroundColor: color.bg },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: color.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trip/new" options={{ title: '여행 만들기', presentation: 'modal' }} />
        <Stack.Screen name="place/search" options={{ title: '장소 탐색' }} />
        <Stack.Screen name="place/[id]" options={{ title: '장소' }} />
        <Stack.Screen name="guidebook/[id]/index" options={{ title: '가이드북' }} />
        <Stack.Screen name="guidebook/[id]/course" options={{ title: '전체 코스' }} />
        <Stack.Screen name="saved" options={{ title: '저장한 장소' }} />
        <Stack.Screen name="login" options={{ title: '로그인 · 가입', presentation: 'modal' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
