import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsKey } from './hooks';
import { applyChange, newItemId, saveChange, type ItineraryChange } from './itinerary';
import type { Trip } from './types';

/**
 * 일정 편집 훅. 화면을 먼저 바꾸고(낙관적 반영) 저장에 실패하면 되돌린다.
 * 그래서 순서를 바꾸면 지도 탭도 즉시 따라 바뀐다(같은 데이터를 공유).
 */
export function useItineraryEdit(trip: Trip | null) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (c: ItineraryChange) => saveChange(trip!, c),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: tripsKey });
      const prev = qc.getQueryData<Trip[]>(tripsKey);
      if (prev) qc.setQueryData<Trip[]>(tripsKey, applyChange(prev, c));
      return { prev };
    },
    onError: (_e, _c, ctx) => { if (ctx?.prev) qc.setQueryData(tripsKey, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: tripsKey }),
  });

  return {
    error: m.error,
    add: (dayNumber: number, placeId: string) => {
      if (!trip) return;
      m.mutate({ type: 'add', tripId: trip.id, dayNumber, item: { id: newItemId(), placeId, order: 999 } });
    },
    remove: (dayNumber: number, itemId: string) => trip && m.mutate({ type: 'remove', tripId: trip.id, dayNumber, itemId }),
    reorder: (dayNumber: number, itemIds: string[]) => trip && m.mutate({ type: 'reorder', tripId: trip.id, dayNumber, itemIds }),
  };
}
