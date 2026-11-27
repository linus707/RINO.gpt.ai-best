-- 3-3 나만의 장소 모음 · 숙소 후보 비교 · (내보내기는 앱에서 처리)

-- 1) 나만의 장소 모음 ("오사카 맛집 후보", "다음에 갈 카페")
create table public.place_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index place_lists_user_idx on public.place_lists(user_id, created_at desc);

create table public.place_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.place_lists(id) on delete cascade,
  place_source text not null check (place_source in ('our', 'google')),
  place_ref text not null,
  added_at timestamptz not null default now(),
  unique (list_id, place_source, place_ref)
);

alter table public.place_lists enable row level security;
alter table public.place_list_items enable row level security;
create policy "본인 모음" on public.place_lists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "본인 모음 항목" on public.place_list_items for all
  using (exists (select 1 from public.place_lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.place_lists l where l.id = list_id and l.user_id = auth.uid()));

-- 2) 숙소 후보 비교 → 하나를 골라 여행에 고정
create table public.trip_stay_candidates (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  place_source text not null check (place_source in ('our', 'google')),
  place_ref text not null,
  memo text not null default '' check (char_length(memo) <= 500),
  price_note text not null default '' check (char_length(price_note) <= 60), -- 사용자가 직접 적는 가격 메모
  created_at timestamptz not null default now(),
  unique (trip_id, place_source, place_ref)
);
alter table public.trip_stay_candidates enable row level security;
create policy "본인 숙소 후보" on public.trip_stay_candidates for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

alter table public.trips add column if not exists stay_place_source text check (stay_place_source in ('our', 'google'));
alter table public.trips add column if not exists stay_place_ref text;
