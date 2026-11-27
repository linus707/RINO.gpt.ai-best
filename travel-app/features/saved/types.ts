import type { PlaceSource } from '@/features/places/types';

/** 내가 저장한 장소 — 메모·별점·태그·다녀온 날은 사용자가 쓴 내용이라 자유롭게 저장 */
export type SavedPlace = {
  id: string;
  source: PlaceSource;
  ref: string;
  memo: string;
  myRating: number | null;
  tags: string[];
  visitedAt: string | null;
  createdAt: string;
};
export type SavedPatch = Partial<Pick<SavedPlace, 'memo' | 'myRating' | 'tags' | 'visitedAt'>>;
