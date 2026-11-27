import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usageKey } from '@/features/usage/hooks';
import { useAppStore } from '@/stores/appStore';
import { createTrip, fetchTrips } from './api';

export const tripsKey = ['trips'] as const;

export const useTrips = () => useQuery({ queryKey: tripsKey, queryFn: fetchTrips });

/** 선택한 여행 (없으면 가장 최근 여행) */
export function useCurrentTrip() {
  const { data, ...rest } = useTrips();
  const selected = useAppStore((s) => s.selectedTripId);
  const trip = data?.find((t) => t.id === selected) ?? data?.[0] ?? null;
  return { trip, ...rest };
}

export function useCreateTrip() {
  const qc = useQueryClient();
  const selectTrip = useAppStore((s) => s.selectTrip);
  return useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      selectTrip(trip.id);
      qc.invalidateQueries({ queryKey: tripsKey });
      qc.invalidateQueries({ queryKey: usageKey });
    },
  });
}
