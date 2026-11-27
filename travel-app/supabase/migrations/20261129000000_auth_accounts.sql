-- 3-1 로그인·가입
-- 1) 새 사용자(익명 포함)가 생기면 프로필을 만든다. 카카오·Apple 이름이 있으면 닉네임으로.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이미 있는 사용자에게도 프로필 채우기
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- 2) 계정을 삭제해도 결제 기록은 법정 보관 기간 동안 남긴다(개인과의 연결만 끊음).
--    전자상거래법상 대금 결제·공급 기록 보관 의무가 있어 구매 기록을 같이 지우지 않는다.
alter table public.purchases alter column user_id drop not null;
alter table public.purchases drop constraint if exists purchases_user_id_fkey;
alter table public.purchases add constraint purchases_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
