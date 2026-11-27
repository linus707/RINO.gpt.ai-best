import { useQuery } from '@tanstack/react-query';
import { fetchUsage } from './api';

export const usageKey = ['usage'] as const;
export const useUsage = () => useQuery({ queryKey: usageKey, queryFn: fetchUsage });
