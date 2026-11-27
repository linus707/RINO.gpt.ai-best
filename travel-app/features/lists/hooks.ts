import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlaceRef } from '@/features/places/types';
import { createList, deleteList, fetchLists, renameList, setInList } from './api';
import type { PlaceList } from './types';

export const listsKey = ['lists'] as const;
export const useLists = () => useQuery({ queryKey: listsKey, queryFn: fetchLists });

/** 모음 편집 — 화면 먼저 바꾸고 저장, 실패하면 되돌림 */
export function useListEdit() {
  const qc = useQueryClient();
  const optimistic = async (fn: (ls: PlaceList[]) => PlaceList[]) => {
    await qc.cancelQueries({ queryKey: listsKey });
    const prev = qc.getQueryData<PlaceList[]>(listsKey) ?? [];
    qc.setQueryData(listsKey, fn(prev));
    return { prev };
  };
  const base = {
    onError: (_e: unknown, _v: unknown, ctx?: { prev: PlaceList[] }) => ctx && qc.setQueryData(listsKey, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: listsKey }),
  };
  const create = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => createList(title, id),
    onMutate: ({ id, title }) => optimistic((ls) => [{ id, title: title.trim(), createdAt: new Date().toISOString(), items: [] }, ...ls]),
    ...base,
  });
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameList(id, title),
    onMutate: ({ id, title }) => optimistic((ls) => ls.map((l) => (l.id === id ? { ...l, title: title.trim() } : l))),
    ...base,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteList(id),
    onMutate: (id) => optimistic((ls) => ls.filter((l) => l.id !== id)),
    ...base,
  });
  const toggle = useMutation({
    mutationFn: ({ listId, ref, on }: { listId: string; ref: PlaceRef; on: boolean }) => setInList(listId, ref, on),
    onMutate: ({ listId, ref, on }) => optimistic((ls) => ls.map((l) => {
      if (l.id !== listId) return l;
      const rest = l.items.filter((i) => !(i.source === ref.source && i.id === ref.id));
      return { ...l, items: on ? [{ ...ref, itemId: `tmp-${ref.id}`, addedAt: new Date().toISOString() }, ...rest] : rest };
    })),
    ...base,
  });
  return { create, rename, remove, toggle };
}
