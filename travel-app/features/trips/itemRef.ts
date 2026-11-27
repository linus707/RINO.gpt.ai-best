import type { PlaceRef } from '@/features/places/types';
import type { ItineraryItem } from './types';

/** 일정 항목 → 장소 참조 (예전 데이터는 source가 없으면 우리 장소) */
export const itemRef = (i: ItineraryItem): PlaceRef => ({ source: i.source ?? 'our', id: i.placeId });
export const sameRef = (i: ItineraryItem, r: PlaceRef) => (i.source ?? 'our') === r.source && i.placeId === r.id;
