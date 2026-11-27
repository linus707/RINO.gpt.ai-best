-- 3-2 Google 장소 검색 + 저장(하트)·메모
-- Google 약관: 장소 ID(place_id)만 영구 저장 가능. 이름·주소·영업시간·좌표 같은 상세 정보는
-- DB에 쌓지 않고, 화면을 열 때 서버 함수(places)로 새로 받아 온다.

-- 1) 일정 항목이 '우리 장소'와 'Google 장소'를 모두 가리킬 수 있게
alter table public.itinerary_items drop constraint if exists itinerary_items_place_id_fkey;
alter table public.itinerary_items add column if not exists place_source text not null default 'our'
  check (place_source in ('our', 'google'));

-- 2) 저장한 장소 (하트) — 사용자가 직접 쓴 메모·별점·태그·다녀온 날은 사용자의 자산이라 자유롭게 저장
create table public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_source text not null check (place_source in ('our', 'google')),
  place_ref text not null,                 -- 우리 장소 id 또는 Google place_id
  memo text not null default '' check (char_length(memo) <= 1000),
  my_rating smallint check (my_rating between 1 and 5),
  tags text[] not null default '{}',
  visited_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_source, place_ref)
);
create index saved_places_user_idx on public.saved_places(user_id, created_at desc);
alter table public.saved_places enable row level security;
create policy "본인 저장 장소" on public.saved_places for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) 검색 비용 안전장치: 사용자별 하루 호출 수 (서버 함수만 쓰고, 앱은 못 건드림)
create table public.api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  kind text not null,
  count int not null default 0,
  primary key (user_id, day, kind)
);
alter table public.api_usage enable row level security;  -- 정책 없음 = 사용자 접근 불가
revoke all on public.api_usage from anon, authenticated;

create or replace function public.bump_api_usage(p_user uuid, p_kind text, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into api_usage(user_id, day, kind, count) values (p_user, current_date, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = api_usage.count + 1
  returning count into v;
  return v <= p_limit;
end $$;
revoke all on function public.bump_api_usage(uuid, text, int) from public, anon, authenticated;
grant execute on function public.bump_api_usage(uuid, text, int) to service_role;
