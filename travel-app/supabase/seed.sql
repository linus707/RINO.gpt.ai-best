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

insert into public.guidebook_days (guidebook_id, day_number, title) values
  ('osaka-3n4d', 1, '난바 도착과 도톤보리 밤'),
  ('osaka-3n4d', 2, '오사카성과 강변 산책'),
  ('osaka-3n4d', 3, '우메다 전망과 신세카이 네온'),
  ('osaka-3n4d', 4, '시장 아침 후 출국')
on conflict (guidebook_id, day_number) do nothing;

-- 오사카 3박 4일 코스 + 리노의 팁 (샘플 문구 — 판매 전에 직접 다녀온 내용과 공식 정보로 교체)
insert into public.guidebook_stops (guidebook_id, day_number, sort_order, place_id, tip) values
  ('osaka-3n4d', 1, 0, 'osk-namba-stay', '첫날은 난바 권역에 짐을 풀면 공항 열차와 저녁 동선이 짧아져요.'),
  ('osaka-3n4d', 1, 1, 'osk-dotonbori', '해가 진 뒤 강 건너편 다리에서 간판이 물에 비치는 구도로 찍어 보세요.'),
  ('osaka-3n4d', 1, 2, 'osk-shinsaibashi', '아케이드라 비 오는 날 대체 코스로도 좋아요.'),
  ('osaka-3n4d', 2, 0, 'osk-castle', '천수각 입장 여부와 시간은 방문 전 공식 사이트에서 확인하세요.'),
  ('osaka-3n4d', 2, 1, 'osk-nakazakicho', '골목 카페가 모여 있어 오후 휴식 지점으로 넣었어요.'),
  ('osaka-3n4d', 3, 0, 'osk-umeda-sky', '해 질 녘 30분 전에 올라가면 낮·노을·야경을 한 번에 담을 수 있어요.'),
  ('osaka-3n4d', 3, 1, 'osk-shinsekai', '네온 간판은 아이폰 야간 모드보다 노출을 살짝 낮추는 편이 선명해요.'),
  ('osaka-3n4d', 4, 0, 'osk-kuromon', '출국 전 아침 식사 코스. 공항 가는 열차 시간을 먼저 정하고 움직이세요.')
on conflict (guidebook_id, day_number, sort_order) do nothing;
