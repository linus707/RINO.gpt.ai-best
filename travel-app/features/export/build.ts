import type { PlaceList } from '@/features/lists/types';
import { placeById } from '@/features/places/data';
import type { PlaceRef } from '@/features/places/types';
import type { SavedPlace } from '@/features/saved/types';
import type { StayCandidate } from '@/features/stay/types';
import type { Trip } from '@/features/trips/types';

/**
 * 내 데이터 내보내기 — 내가 만든 기록(일정·메모·별점·모음·숙소 후보)을 파일로.
 * Google 장소는 이름 대신 장소 ID와 Google 지도 링크로 내보낸다(약관상 Google 정보를 밖으로 복사하지 않음).
 */
export type ExportInput = { trips: Trip[]; saved: SavedPlace[]; lists: PlaceList[]; stays: StayCandidate[]; email?: string | null; now?: Date };

const mapsUrl = (id: string) => `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(id)}`;
function placeOut(r: PlaceRef) {
  if (r.source === 'our') {
    const p = placeById(r.id);
    return { source: '리노 추천', id: r.id, name: p?.name ?? null, area: p?.area ?? null };
  }
  return { source: 'Google', id: r.id, name: null, link: mapsUrl(r.id) };
}

export function buildJson(d: ExportInput) {
  const now = d.now ?? new Date();
  const data = {
    app: '리노 트립',
    format: 1,
    exportedAt: now.toISOString(),
    account: d.email ? { email: d.email } : null,
    trips: d.trips.map((t) => ({
      city: t.city, startDate: t.startDate, endDate: t.endDate, companion: t.companion, style: t.style,
      stay: t.stay ? placeOut(t.stay) : null,
      stayCandidates: d.stays.filter((s) => s.tripId === t.id).map((s) => ({ ...placeOut(s), memo: s.memo, priceNote: s.priceNote })),
      days: t.days.map((day) => ({
        day: day.dayNumber, date: day.date,
        places: day.items.map((i) => ({ order: i.order + 1, ...placeOut({ source: i.source ?? 'our', id: i.placeId }), memo: i.memo ?? null })),
      })),
    })),
    savedPlaces: d.saved.map((s) => ({ ...placeOut({ source: s.source, id: s.ref }), myRating: s.myRating, visitedAt: s.visitedAt, memo: s.memo, tags: s.tags, savedAt: s.createdAt })),
    lists: d.lists.map((l) => ({ title: l.title, places: l.items.map((i) => placeOut(i)) })),
  };
  return JSON.stringify(data, null, 2);
}

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // 엑셀 수식 주입 방지 + 쉼표·따옴표·줄바꿈 감싸기
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const row = (vals: unknown[]) => vals.map(cell).join(',');

/** 엑셀에서 바로 열리는 CSV (한글 깨짐 방지 BOM 포함) — 일정과 저장한 장소를 한 표에 */
export function buildCsv(d: ExportInput) {
  const lines = [row(['구분', '여행/모음', '일차', '날짜', '순서', '출처', '장소 ID', '이름', '지도 링크', '내 별점', '다녀온 날', '메모'])];
  for (const t of d.trips) {
    const title = `${t.city} ${t.startDate}~${t.endDate}`;
    if (t.stay) { const p = placeOut(t.stay); lines.push(row(['숙소', title, '', '', '', p.source, p.id, p.name, 'link' in p ? p.link : '', '', '', ''])); }
    for (const day of t.days) for (const i of day.items) {
      const p = placeOut({ source: i.source ?? 'our', id: i.placeId });
      lines.push(row(['일정', title, day.dayNumber, day.date, i.order + 1, p.source, p.id, p.name, 'link' in p ? p.link : '', '', '', i.memo ?? '']));
    }
  }
  for (const s of d.saved) {
    const p = placeOut({ source: s.source, id: s.ref });
    lines.push(row(['저장한 장소', '', '', '', '', p.source, p.id, p.name, 'link' in p ? p.link : '', s.myRating ?? '', s.visitedAt ?? '', s.memo]));
  }
  for (const l of d.lists) for (const i of l.items) {
    const p = placeOut(i);
    lines.push(row(['모음', l.title, '', '', '', p.source, p.id, p.name, 'link' in p ? p.link : '', '', '', '']));
  }
  return '﻿' + lines.join('\r\n');
}

export const exportFileName = (ext: 'json' | 'csv', now = new Date()) => `rino-trip-${now.toISOString().slice(0, 10)}.${ext}`;
