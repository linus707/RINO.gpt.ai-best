/**
 * 가이드북 결제 자리. Phase 4에서 연결한다.
 * - 앱: Apple / Google 인앱결제 → 영수증을 Supabase Edge Function에서 검증 → purchases 기록
 * - 웹: 외부 결제(PG) → 결제 완료 콜백을 서버에서 검증 → purchases 기록
 * 뼈대 단계에서는 결제를 열지 않는다.
 */
export const PURCHASE_ENABLED = false;
