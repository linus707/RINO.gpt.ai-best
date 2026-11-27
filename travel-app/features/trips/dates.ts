/** 날짜 문자열(YYYY-MM-DD) 도우미 — 시간대 영향을 받지 않게 UTC로 계산 */
const toUTC = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};
export const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(toUTC(d));
export const addDays = (d: string, n: number) => new Date(toUTC(d) + n * 86400000).toISOString().slice(0, 10);
export const dayCount = (start: string, end: string) => Math.round((toUTC(end) - toUTC(start)) / 86400000) + 1;
export const shortDate = (d: string) => {
  const [, m, day] = d.split('-').map(Number);
  return `${m}.${day}`;
};
export const nightsDays = (n: number) => (n <= 1 ? '당일치기' : `${n - 1}박 ${n}일`);
/** 뼈대 단계에서 한 여행은 최대 14일 */
export const MAX_TRIP_DAYS = 14;
