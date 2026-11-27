import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlaceRef } from '@/features/places/types';
import { fetchSaved, savePlace, unsavePlace, updateSaved } from './api';
import type { SavedPatch, SavedPlace } from './types';

export const savedKey = ['saved'] as const;
export const useSaved = () => useQuery({ queryKey: savedKey, queryFn: fetchSaved });

export function useSavedFor(ref: PlaceRef | null) {
  const { data } = useSaved();
  return ref ? data?.find((s) => s.source === ref.source && s.ref === ref.id) ?? null : null;
}

/** 하트 누르기/풀기 — 화면 먼저 바꾸고 저장, 실패하면 되돌림 */
export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ref, on }: { ref: PlaceRef; on: boolean }) => (on ? savePlace(ref) : unsavePlace(ref)),
    onMutate: async ({ ref, on }) => {
      await qc.cancelQueries({ queryKey: savedKey });
      const prev = qc.getQueryData<SavedPlace[]>(savedKey) ?? [];
      const next = on
        ? [{ id: `tmp-${ref.id}`, source: ref.source, ref: ref.id, memo: '', myRating: null, tags: [], visitedAt: null, createdAt: new Date().toISOString() }, ...prev]
        : prev.filter((s) => !(s.source === ref.source && s.ref === ref.id));
      qc.setQueryData(savedKey, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(savedKey, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: savedKey }),
  });
}

export function useUpdateSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SavedPatch }) => updateSaved(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: savedKey });
      const prev = qc.getQueryData<SavedPlace[]>(savedKey) ?? [];
      qc.setQueryData(savedKey, prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(savedKey, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: savedKey }),
  });
}
