-- Phase 2: 일정 순서 바꾸기를 한 번에 저장 (일부만 바뀌는 일 없이)
-- security invoker라서 RLS("본인 일정 항목")가 그대로 적용된다 — 남의 일정은 못 바꾼다.
create or replace function public.reorder_itinerary(p_day uuid, p_ids uuid[])
returns void
language sql security invoker set search_path = public as $$
  update itinerary_items i
     set sort_order = x.ord - 1
    from unnest(p_ids) with ordinality as x(id, ord)
   where i.id = x.id and i.trip_day_id = p_day;
$$;

revoke all on function public.reorder_itinerary(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_itinerary(uuid, uuid[]) to authenticated;
