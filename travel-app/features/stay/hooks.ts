import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlaceRef } from '@/features/places/types';
import { tripsKey } from '@/features/trips/hooks';
import type { Trip } from '@/features/trips/types';
import { addStay, chooseStay, fetchStays, removeStay, updateStay } from './api';
import type { StayCandidate } from './types';

const key = (tripId: string) => ['stays', tripId] as const;
export const useStays = (tripId: string | undefined) =>
  useQuery({ queryKey: key(tripId ?? ''), queryFn: () => fetchStays(tripId!), enabled: !!tripId });

export function useStayEdit(tripId: string | undefined) {
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: key(tripId ?? '') }); qc.invalidateQueries({ queryKey: tripsKey }); };
  const add = useMutation({ mutationFn: (ref: PlaceRef) => addStay(tripId!, ref), onSettled: refresh });
  const update = useMutation({
    mutationFn: ({ candId, patch }: { candId: string; patch: { memo?: string; priceNote?: string } }) => updateStay(candId, patch),
    onMutate: ({ candId, patch }) => {
      const prev = qc.getQueryData<StayCandidate[]>(key(tripId!)) ?? [];
      qc.setQueryData(key(tripId!), prev.map((c) => (c.candId === candId ? { ...c, ...patch } : c)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(key(tripId!), ctx.prev),
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: (c: StayCandidate) => removeStay(c), onSettled: refresh });
  const choose = useMutation({
    mutationFn: (ref: PlaceRef | null) => chooseStay(tripId!, ref),
    onMutate: (ref) => {
      const prev = qc.getQueryData<Trip[]>(tripsKey);
      if (prev) qc.setQueryData(tripsKey, prev.map((t) => (t.id === tripId ? { ...t, stay: ref } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(tripsKey, ctx.prev),
    onSettled: refresh,
  });
  return { add, update, remove, choose };
}
