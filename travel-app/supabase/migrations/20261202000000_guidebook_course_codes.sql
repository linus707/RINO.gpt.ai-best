-- Phase 4 (결제 제외): 가이드북 코스 · 이용권 코드 · 내 일정으로 불러오기

-- 1) 코스의 각 장소와 리노의 팁 (가이드북 본문). 미리보기 일차는 누구나, 나머지는 보유자만
create table public.guidebook_stops (
  id uuid primary key default gen_random_uuid(),
  guidebook_id text not null references public.guidebooks(id) on delete cascade,
  day_number int not null,
  sort_order int not null,
  place_id text not null references public.places(id),
  tip text not null default '',
  unique (guidebook_id, day_number, sort_order)
);
alter table public.guidebook_stops enable row level security;

-- 보유 여부 = 검증된 구매 기록(스토어·웹 결제 또는 이용권 코드)
create or replace function public.owns_guidebook(p_guidebook text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from purchases where guidebook_id = p_guidebook and user_id = auth.uid() and receipt_status = 'verified');
$$;
grant execute on function public.owns_guidebook(text) to anon, authenticated;

create policy "가이드북 장소 열람" on public.guidebook_stops for select using (
  exists (
    select 1 from public.guidebooks g where g.id = guidebook_id and g.published
      and (day_number <= g.preview_days or public.owns_guidebook(g.id))
  )
);

-- 2) 이용권 코드 (베타 테스터·이벤트 선물용). 코드는 해시만 저장하고 사용자는 표를 볼 수 없다
alter table public.purchases drop constraint if exists purchases_store_check;
alter table public.purchases add constraint purchases_store_check check (store in ('apple', 'google', 'web', 'code'));

create table public.guidebook_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  guidebook_id text not null references public.guidebooks(id) on delete cascade,
  max_uses int not null default 1 check (max_uses > 0),
  used_count int not null default 0,
  expires_at timestamptz,
  memo text not null default '',             -- 예: '인스타 이벤트 12월'
  created_at timestamptz not null default now()
);
alter table public.guidebook_codes enable row level security;   -- 정책 없음 = 사용자 접근 불가
revoke all on public.guidebook_codes from anon, authenticated;

create table public.guidebook_code_uses (
  code_id uuid not null references public.guidebook_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (code_id, user_id)
);
alter table public.guidebook_code_uses enable row level security;
revoke all on public.guidebook_code_uses from anon, authenticated;

-- 코드 정규화: 대소문자·공백·하이픈 무시
create or replace function public.normalize_code(p text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- 관리자용(대시보드 SQL 편집기에서 실행): 코드 만들기
create or replace function public.create_guidebook_code(p_guidebook text, p_code text, p_max_uses int default 1, p_expires timestamptz default null, p_memo text default '')
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v uuid;
begin
  if length(normalize_code(p_code)) < 6 then raise exception 'CODE_TOO_SHORT'; end if;
  insert into guidebook_codes(code_hash, guidebook_id, max_uses, expires_at, memo)
  values (encode(digest(normalize_code(p_code), 'sha256'), 'hex'), p_guidebook, p_max_uses, p_expires, p_memo)
  returning id into v;
  return v;
end $$;
revoke all on function public.create_guidebook_code(text, text, int, timestamptz, text) from public, anon, authenticated;

-- 사용자용: 코드 등록 → 검증된 구매 기록 생성. 하루 시도 횟수 제한(무작위 대입 방지)
-- 주의: 실패를 예외로 던지면 시도 횟수 기록까지 되돌려져 제한이 무력해진다 → 결과를 값으로 돌려준다
create or replace function public.redeem_guidebook_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := auth.uid();
  c guidebook_codes%rowtype;
begin
  if v_user is null then return jsonb_build_object('error', 'NOT_AUTHENTICATED'); end if;
  if not bump_api_usage(v_user, 'redeem', 10) then return jsonb_build_object('error', 'TOO_MANY_ATTEMPTS'); end if;
  select * into c from guidebook_codes where code_hash = encode(digest(normalize_code(p_code), 'sha256'), 'hex') for update;
  if not found then return jsonb_build_object('error', 'INVALID_CODE'); end if;
  if c.expires_at is not null and c.expires_at < now() then return jsonb_build_object('error', 'CODE_EXPIRED'); end if;
  if exists (select 1 from purchases where user_id = v_user and guidebook_id = c.guidebook_id and receipt_status = 'verified') then
    return jsonb_build_object('guidebook_id', c.guidebook_id);  -- 이미 보유: 횟수를 쓰지 않음
  end if;
  if c.used_count >= c.max_uses then return jsonb_build_object('error', 'CODE_USED_UP'); end if;
  insert into guidebook_code_uses(code_id, user_id) values (c.id, v_user);
  update guidebook_codes set used_count = used_count + 1 where id = c.id;
  insert into purchases(user_id, guidebook_id, store, receipt_status) values (v_user, c.guidebook_id, 'code', 'verified')
  on conflict (user_id, guidebook_id, store) do update set receipt_status = 'verified';
  return jsonb_build_object('guidebook_id', c.guidebook_id);
end $$;
revoke all on function public.redeem_guidebook_code(text) from public, anon;
grant execute on function public.redeem_guidebook_code(text) to authenticated;

-- 3) 내 일정으로 불러오기: 보유한 가이드북 코스를 내 여행으로 복사 (무료 횟수 차감 없음)
--    복사본은 사용자 일정이라 자유롭게 고칠 수 있고, 원본이 바뀌어도 그대로 유지된다
create or replace function public.import_guidebook(p_guidebook text, p_start date)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  g guidebooks%rowtype;
  v_trip uuid;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into g from guidebooks where id = p_guidebook and published;
  if not found then raise exception 'GUIDEBOOK_NOT_FOUND'; end if;
  if not exists (select 1 from purchases where user_id = v_user and guidebook_id = g.id and receipt_status = 'verified') then
    raise exception 'NOT_OWNED';
  end if;
  insert into trips(user_id, city, start_date, end_date, companion, style, from_guidebook_id)
  values (v_user, g.city, p_start, p_start + (g.days - 1), '', '가이드북 코스', g.id)
  returning id into v_trip;
  insert into trip_days(trip_id, day_number, date)
  select v_trip, n, p_start + (n - 1) from generate_series(1, g.days) n;
  insert into itinerary_items(trip_day_id, place_id, place_source, sort_order)
  select d.id, s.place_id, 'our', row_number() over (partition by s.day_number order by s.sort_order) - 1
  from guidebook_stops s join trip_days d on d.trip_id = v_trip and d.day_number = s.day_number
  where s.guidebook_id = g.id;
  return v_trip;
end $$;
revoke all on function public.import_guidebook(text, date) from public, anon;
grant execute on function public.import_guidebook(text, date) to authenticated;

-- 4) 목차(일차 제목)는 누구나 보이게, 코스 장소는 guidebook_stops(잠금 적용)로만.
--    예전 guidebook_days.place_ids에는 전체 코스가 들어 있어 잠금을 우회할 수 있으므로 지운다.
drop policy if exists "가이드북 일차 열람" on public.guidebook_days;
create policy "가이드북 목차 공개" on public.guidebook_days for select using (
  exists (select 1 from public.guidebooks g where g.id = guidebook_id and g.published)
);
alter table public.guidebook_days drop column if exists place_ids;
