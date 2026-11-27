import { useState } from 'react';
import { useAccount } from '@/features/auth/hooks';
import { fetchLists } from '@/features/lists/api';
import { fetchSaved } from '@/features/saved/api';
import { fetchAllStays } from '@/features/stay/api';
import { fetchTrips } from '@/features/trips/api';
import { buildCsv, buildJson, exportFileName } from './build';
import { saveTextFile } from './save';

/** 내보내기 버튼용 — 서버에서 최신 기록을 다시 받아 파일로 만든다 */
export function useExport() {
  const account = useAccount();
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null);
  const [error, setError] = useState('');
  const run = async (kind: 'json' | 'csv') => {
    setBusy(kind); setError('');
    try {
      const [trips, saved, lists, stays] = await Promise.all([fetchTrips(), fetchSaved(), fetchLists(), fetchAllStays()]);
      const input = { trips, saved, lists, stays, email: account.email };
      if (kind === 'json') await saveTextFile(exportFileName('json'), buildJson(input), 'application/json');
      else await saveTextFile(exportFileName('csv'), buildCsv(input), 'text/csv');
    } catch {
      setError('내보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(null); }
  };
  return { run, busy, error };
}
