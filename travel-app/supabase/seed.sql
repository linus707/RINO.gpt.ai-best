-- 샘플 데이터 (화면 확인용). 실제 판매 전에 공식 출처 확인값으로 바꾼다.
insert into public.guidebooks (id, city, title, theme, days, preview_days, published)
values ('osaka-3n4d', '오사카', '오사카 3박 4일', '먹고 걷고 찍는 첫 오사카', 4, 1, true)
on conflict (id) do nothing;

insert into public.places (id, name, category, lat, lng, area, note, source) values
  ('osk-dotonbori', '도톤보리', 'attraction', 34.6687, 135.5013, '난바', '공식 일정 확인 전', 'sample'),
  ('osk-kuromon', '구로몬 시장', 'food', 34.6652, 135.5066, '닛폰바시', '대표 메뉴: 해산물 꼬치', 'sample'),
  ('osk-shinsaibashi', '신사이바시스지', 'shop', 34.6748, 135.5012, '신사이바시', '일정 근처 쇼핑 거리', 'sample'),
  ('osk-castle', '오사카성 공원', 'attraction', 34.6873, 135.5262, '모리노미야', '공식 일정 확인 전', 'sample'),
  ('osk-umeda-sky', '우메다 스카이빌딩', 'photo', 34.7053, 135.4896, '우메다', '촬영 팁: 해 질 녘 전망대', 'sample'),
  ('osk-nakazakicho', '나카자키초 골목 카페', 'cafe', 34.7088, 135.504, '나카자키초', '동선 중 휴식 지점', 'sample'),
  ('osk-namba-stay', '난바 권역 숙소', 'stay', 34.6655, 135.501, '난바', '교통 중심, 첫날·마지막 날 이동이 짧음', 'sample'),
  ('osk-shinsekai', '츠텐카쿠·신세카이', 'photo', 34.6525, 135.5063, '신세카이', '촬영 팁: 네온 간판, 야간 모드', 'sample')
on conflict (id) do nothing;

insert into public.guidebook_days (guidebook_id, day_number, title, place_ids) values
  ('osaka-3n4d', 1, '난바 도착과 도톤보리 밤', array['osk-namba-stay','osk-dotonbori','osk-shinsaibashi']),
  ('osaka-3n4d', 2, '오사카성과 강변 산책', array['osk-castle','osk-nakazakicho']),
  ('osaka-3n4d', 3, '우메다 전망과 신세카이 네온', array['osk-umeda-sky','osk-shinsekai']),
  ('osaka-3n4d', 4, '시장 아침 후 출국', array['osk-kuromon'])
on conflict (guidebook_id, day_number) do nothing;
