import type { PlaceRef } from '@/features/places/types';

/** 숙소 후보 — 메모와 가격 메모는 사용자가 직접 적는 내용 */
export type StayCandidate = PlaceRef & { candId: string; tripId: string; memo: string; priceNote: string; createdAt: string };
