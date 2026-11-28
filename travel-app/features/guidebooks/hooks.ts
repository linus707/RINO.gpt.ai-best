import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsKey } from '@/features/trips/hooks';
import { useAppStore } from '@/stores/appStore';
import { fetchGuidebooks, fetchOwned, importGuidebook, redeemCode } from './api';
import type { Guidebook } from './data';

export const guidebooksKey = ['guidebooks'] as const;
export const ownedKey = ['owned'] as const;

export const useGuidebooks = () => useQuery({ queryKey: guidebooksKey, queryFn: fetchGuidebooks });
export const useOwned = () => useQuery({ queryKey: ownedKey, queryFn: fetchOwned });

export function useGuidebook(id: string | undefined) {
  const list = useGuidebooks();
  const owned = useOwned();
  const book = list.data?.find((g) => g.id === id);
  return { book, owned: !!id && !!owned.data?.includes(id), isLoading: list.isLoading || owned.isLoading };
}

export function useRedeem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemCode,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ownedKey }); qc.invalidateQueries({ queryKey: guidebooksKey }); },
  });
}

export function useImportGuidebook() {
  const qc = useQueryClient();
  const selectTrip = useAppStore((s) => s.selectTrip);
  return useMutation({
    mutationFn: ({ book, startDate }: { book: Guidebook; startDate: string }) => importGuidebook(book, startDate),
    onSuccess: (tripId) => { selectTrip(tripId); qc.invalidateQueries({ queryKey: tripsKey }); },
  });
}
