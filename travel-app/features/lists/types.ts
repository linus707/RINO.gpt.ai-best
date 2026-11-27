import type { PlaceRef } from '@/features/places/types';

/** 나만의 장소 모음 */
export type PlaceList = { id: string; title: string; createdAt: string; items: (PlaceRef & { itemId: string; addedAt: string })[] };
