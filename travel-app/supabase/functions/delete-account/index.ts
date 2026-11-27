// 계정 삭제 (앱스토어 심사 필수 항목)
// 로그인한 본인만 자기 계정을 지울 수 있다. 서비스 키는 이 서버 함수 안에만 있고 앱에는 없다.
// 삭제되면 일정·일자·일정 항목·무료 횟수·프로필은 함께 지워지고, 결제 기록은 개인 연결만 끊긴다.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data.user) return Response.json({ error: 'unauthorized' }, { status: 401, headers: cors });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // 3-3에서 사진 저장소가 생기면 여기서 사용자 폴더도 지운다.
  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) return Response.json({ error: 'delete_failed' }, { status: 500, headers: cors });
  return Response.json({ ok: true }, { headers: cors });
});
