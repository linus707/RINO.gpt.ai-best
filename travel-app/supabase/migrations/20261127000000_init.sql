-- 여행 앱 Phase 1 — 테이블 8개 (설계서 7장)
-- 원칙: 무료 횟수와 가이드북 열람 권한은 앱이 아니라 서버 데이터로 판정한다.
--       사용자는 자기 데이터만 읽고 쓴다 (Row Level Security).

create extension if not exists pgcrypto;

-- 1. users: Supabase Auth(auth.users)를 쓰고, 표시용 정보만 profiles에 둔다
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2. trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text not null,
  start_date date not null,
  end_date date not null,
  companion text not null default '',
  style text not null default '',
  status text not null default 'planning' check (status in ('planning', 'done')),
  from_guidebook_id text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index trips_user_idx on public.trips(user_id, created_at desc);

-- 3. trip_days
create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  date date not null,
  unique (trip_id, day_number)
);

-- 4. places: 공식 출처로 확인한 값만, 확인일과 함께. 미발표는 '미발표'
create table public.places (
  id text primary key,
  name text not null,
  category text not null check (category in ('attraction', 'food', 'stay', 'cafe', 'shop', 'photo')),
  lat double precision not null,
  lng double precision not null,
  address text,
  area text,
  note text,
  source text not null default 'sample',
  verified_at date
);

-- 5. itinerary_items: 장소 원본은 참조만, 순서·시간은 일정 쪽에 저장
create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references public.trip_days(id) on delete cascade,
  place_id text not null references public.places(id),
  sort_order int not null,
  visit_time time,
  memo text
);
create index itinerary_items_day_idx on public.itinerary_items(trip_day_id, sort_order);

-- 6. guidebooks / guidebook_days: 아이폰·안드로이드 상품 ID를 따로 저장
create table public.guidebooks (
  id text primary key,
  city text not null,
  title text not null,
  theme text,
  days int not null,
  preview_days int not null default 1,
  ios_product_id text,
  android_product_id text,
  web_product_id text,
  published boolean not null default false
);
create table public.guidebook_days (
  id uuid primary key default gen_random_uuid(),
  guidebook_id text not null references public.guidebooks(id) on delete cascade,
  day_number int not null,
  title text not null,
  place_ids text[] not null default '{}',
  unique (guidebook_id, day_number)
);

-- 7. purchases: 영수증을 서버(Edge Function)에서 검증한 뒤에만 'verified'
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guidebook_id text not null references public.guidebooks(id),
  store text not null check (store in ('apple', 'google', 'web')),
  receipt_status text not null default 'pending' check (receipt_status in ('pending', 'verified', 'refunded')),
  purchased_at timestamptz not null default now(),
  unique (user_id, guidebook_id, store)
);

-- 8. usage_counter: 무료 5회 판정의 기준
create table public.usage_counter (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_used int not null default 0 check (free_used >= 0),
  last_used_at timestamptz
);

-- ── Row Level Security ──────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.places enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.guidebooks enable row level security;
alter table public.guidebook_days enable row level security;
alter table public.purchases enable row level security;
alter table public.usage_counter enable row level security;

create policy "본인 프로필" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- 여행: 읽기·수정·삭제는 본인 것만. 새 여행 추가는 create_trip 함수로만(횟수 차감과 함께)
create policy "본인 여행 읽기" on public.trips for select using (user_id = auth.uid());
create policy "본인 여행 수정" on public.trips for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "본인 여행 삭제" on public.trips for delete using (user_id = auth.uid());

create policy "본인 일차" on public.trip_days for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "본인 일정 항목" on public.itinerary_items for all
  using (exists (select 1 from public.trip_days d join public.trips t on t.id = d.trip_id where d.id = trip_day_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trip_days d join public.trips t on t.id = d.trip_id where d.id = trip_day_id and t.user_id = auth.uid()));

-- 장소·가이드북 소개는 누구나 읽기(로그인 없이 미리보기 가능). 쓰기는 관리자(서비스 키)만
create policy "장소 공개 읽기" on public.places for select using (true);
create policy "가이드북 공개 읽기" on public.guidebooks for select using (published);

-- 가이드북 일차: 미리보기 범위는 누구나, 나머지는 검증된 구매자만
create policy "가이드북 일차 열람" on public.guidebook_days for select using (
  exists (
    select 1 from public.guidebooks g where g.id = guidebook_id and g.published and (
      day_number <= g.preview_days
      or exists (select 1 from public.purchases p where p.guidebook_id = g.id and p.user_id = auth.uid() and p.receipt_status = 'verified')
    )
  )
);

-- 구매·횟수: 본인 기록 읽기만. 쓰기는 서버 함수/Edge Function만
create policy "본인 구매 읽기" on public.purchases for select using (user_id = auth.uid());
create policy "본인 횟수 읽기" on public.usage_counter for select using (user_id = auth.uid());

-- ── 새 여행 만들기 = 무료 1회 차감 (한 번에, 원자적으로) ─────────────
create or replace function public.create_trip(
  p_city text, p_start_date date, p_end_date date, p_companion text, p_style text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_limit constant int := 5;
  v_used int;
  v_trip uuid;
  v_days int := p_end_date - p_start_date + 1;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_days < 1 or v_days > 14 then raise exception 'INVALID_DATES'; end if;

  insert into usage_counter(user_id) values (v_user) on conflict (user_id) do nothing;
  select free_used into v_used from usage_counter where user_id = v_user for update;
  if v_used >= v_limit then raise exception 'FREE_LIMIT_REACHED'; end if;

  insert into trips(user_id, city, start_date, end_date, companion, style)
  values (v_user, p_city, p_start_date, p_end_date, coalesce(p_companion, ''), coalesce(p_style, ''))
  returning id into v_trip;

  insert into trip_days(trip_id, day_number, date)
  select v_trip, g, p_start_date + (g - 1) from generate_series(1, v_days) g;

  update usage_counter set free_used = free_used + 1, last_used_at = now() where user_id = v_user;
  return v_trip;
end $$;

revoke all on function public.create_trip(text, date, date, text, text) from public, anon;
grant execute on function public.create_trip(text, date, date, text, text) to authenticated;
