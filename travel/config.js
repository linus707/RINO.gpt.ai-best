// ===== 여행 홈 설정 (리노님이 고치는 파일) =====
window.TRAVEL_HOME_CONFIG = {
  title: '여행 숙소 지도',
  subtitle: '도시별 추천 숙소 지도와 이달의 날씨',

  // ── 구글 애드센스 (선택) ──
  // 애드센스 승인 후 받은 게시자 ID를 넣으면 광고가 켜져요. 예: 'ca-pub-1234567890123456'
  // 비워두면 광고 코드를 전혀 불러오지 않아요.
  adsenseClient: '',
  // 직접 만든 광고 단위가 있으면 슬롯 번호를 넣어요(선택). 비우면 '자동 광고'만 써요.
  adsenseSlot: '',

  // ── 도시 목록 ──
  // id: 날씨 자료(data/climate.json) 이름과 같게
  // map: 그 도시 숙소 지도 주소. 아직 없으면 '' (카드에 "준비 중"으로 보여요)
  //      예) '/travel-map/?sheet=' + encodeURIComponent('구글시트 CSV 주소')
  // photo: 도시 사진 (img/cities/ 폴더 또는 https 주소). 비우면 색 배경으로 보여요. 직접 찍은 사진을 추천해요.
  // photoCredit: 남의 사진을 쓸 때 저작자·라이선스·원본 주소. 화면 아래 '사진 출처'에 자동으로 나와요. 내 사진이면 지워도 돼요.
  //   지금 사진들은 위키미디어 커먼즈의 자유 라이선스 사진을 4:3으로 자르고 줄인 거예요.
  // aliases: 검색에 걸리게 할 다른 이름(동네·영어·현지어)
  cities: [
    { id: 'fukuoka', name: '후쿠오카', en: 'Fukuoka', country: '일본', flag: '🇯🇵', map: '/travel-map/', photo: 'img/cities/fukuoka.jpg', photoCredit: {"artist": "そらみみ", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:Hakata_Port_from_Fukuoka_Tower.jpg"},
      aliases: ['하카타', '텐진', '나카스', '규슈', '福岡'], colors: ['#5055B1', '#7C82D6'] },
    { id: 'osaka', name: '오사카', en: 'Osaka', country: '일본', flag: '🇯🇵', map: '', photo: 'img/cities/osaka.jpg', photoCredit: {"artist": "663highland", "license": "CC BY 2.5", "licenseUrl": "https://creativecommons.org/licenses/by/2.5", "source": "https://commons.wikimedia.org/wiki/File:Osaka_Castle_02bs3200.jpg"},
      aliases: ['난바', '우메다', '도톤보리', '간사이', '大阪'], colors: ['#E0656B', '#F2A07B'] },
    { id: 'tokyo', name: '도쿄', en: 'Tokyo', country: '일본', flag: '🇯🇵', map: '', photo: 'img/cities/tokyo.jpg', photoCredit: {"artist": "Morio", "license": "CC BY-SA 3.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0", "source": "https://commons.wikimedia.org/wiki/File:Skyscrapers_of_Shinjuku_2009_January_(revised).jpg"},
      aliases: ['신주쿠', '시부야', '긴자', '아사쿠사', '東京'], colors: ['#2A9D8F', '#7BC8B8'] },
    { id: 'bangkok', name: '방콕', en: 'Bangkok', country: '태국', flag: '🇹🇭', map: '', photo: 'img/cities/bangkok.jpg', photoCredit: {"artist": "Preecha.MJ", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:Temple_of_the_Emerald_of_buddha_or_Wat_Phra_Kaew_(cropped).jpg"},
      aliases: ['시암', '수쿰빗', '카오산', 'กรุงเทพ'], colors: ['#E9A23B', '#F4C978'] },
    { id: 'danang', name: '다낭', en: 'Da Nang', country: '베트남', flag: '🇻🇳', map: '', photo: 'img/cities/danang.jpg', photoCredit: {"artist": "Cuong Tran", "license": "Public domain", "licenseUrl": "", "source": "https://commons.wikimedia.org/wiki/File:Dragon_bridge_from_above.png"},
      aliases: ['호이안', '미케 비치', 'Đà Nẵng'], colors: ['#3A86C8', '#86BDE8'] },
    { id: 'paris', name: '파리', en: 'Paris', country: '프랑스', flag: '🇫🇷', map: '', photo: 'img/cities/paris.jpg', photoCredit: {"artist": "Yann Caradec from Paris, France", "license": "CC BY-SA 2.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0", "source": "https://commons.wikimedia.org/wiki/File:La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques,_Paris_ao%C3%BBt_2014_(2).jpg"},
      aliases: ['에펠탑', '마레', '몽마르트'], colors: ['#6D597A', '#B5838D'] },
    { id: 'rome', name: '로마', en: 'Rome', country: '이탈리아', flag: '🇮🇹', map: '', photo: 'img/cities/rome.jpg', photoCredit: {"artist": "Bert Kaufmann from Roermond, Netherlands", "license": "CC BY-SA 2.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0", "source": "https://commons.wikimedia.org/wiki/File:Rome_Skyline_(8012016319).jpg"},
      aliases: ['콜로세움', '트레비', '바티칸', 'Roma'], colors: ['#C8553D', '#F28F3B'] },
    { id: 'newyork', name: '뉴욕', en: 'New York', country: '미국', flag: '🇺🇸', map: '', photo: 'img/cities/newyork.jpg', photoCredit: {"artist": "Fred Hsu on en.wikipedia", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:NYC_Downtown_Manhattan_Skyline_seen_from_Paulus_Hook_2019-12-20_IMG_7347_FRD_(cropped).jpg"},
      aliases: ['맨해튼', '타임스 스퀘어', '브루클린', 'NYC'], colors: ['#264653', '#5E8C9A'] },
    { id: 'sydney', name: '시드니', en: 'Sydney', country: '호주', flag: '🇦🇺', map: '', photo: 'img/cities/sydney.jpg', photoCredit: {"artist": "W. Bulach", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:00_3178_Sydney,_Australia.jpg"},
      aliases: ['오페라하우스', '본디', '서큘러 키'], colors: ['#118AB2', '#73C2DB'] },
  ],
};
