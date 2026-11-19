#!/usr/bin/env python3
"""여행 홈(travel/)의 '이달의 여행지 날씨' 자료를 만들어요.

- 일본 도시: 일본 기상청(JMA) 공식 평년값 1991~2020 (출처 표시하면 상업 이용 가능)
- 그 밖의 도시: 미국 해양대기청(NOAA NCEI) GHCN-Daily 관측값으로 2015~2024년 월평균을 계산 (미국 정부 공개 자료)
결과: travel/data/climate.json  (월별 평균 최고·최저 기온 ℃, 월 강수량 mm)

도시 추가: 아래 SOURCES 에 한 줄 넣고 실행하세요.
  python3 scripts/travel-climate.py
JMA 지점 번호(prec_no, block_no)는 기상청 '과거의 기상 데이터 검색'에서, NOAA 지점 ID는 NCEI 검색에서 찾을 수 있어요.
"""
import collections, html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

SOURCES = {
    'fukuoka': ('jma', 82, 47807),
    'osaka':   ('jma', 62, 47772),
    'tokyo':   ('jma', 44, 47662),
    'bangkok': ('noaa', 'THM00048453'),
    'paris':   ('noaa', 'FRM00007156'),
    'newyork': ('noaa', 'USW00094728'),
    'sydney':  ('noaa', 'ASN00066062'),
}
UA = {'User-Agent': 'travel-climate-script/1.0'}

def fetch(url, as_json=False):
    last = None
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
                body = r.read()
                return json.loads(body) if as_json else body.decode('utf-8', 'replace')
        except Exception as e:  # 네트워크가 잠깐 끊기면 다시 시도
            last = e; time.sleep(3)
    raise last

def jma(prec, block):
    url = f'https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no={prec}&block_no={block}&year=&month=&day=&view='
    page = fetch(url)
    months = []
    for row in re.findall(r'<tr class="mtx"[^>]*>(.*?)</tr>', page, re.S):
        cells = [html.unescape(re.sub('<[^>]+>', '', c)).strip() for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', row, re.S)]
        m = re.fullmatch(r'(\d{1,2})月', cells[0]) if cells else None
        if m:  # 열 순서: 월, 현지기압, 해면기압, 강수량 합계, 평균기온, 일최고, 일최저, ...
            months.append({'hi': float(cells[5]), 'lo': float(cells[6]), 'rain': round(float(cells[3]))})
    if len(months) != 12: raise ValueError(f'JMA 표를 읽지 못했어요: {url}')
    return {'months': months, 'source': '일본 기상청(JMA) 평년값', 'period': '1991~2020', 'url': url}

def noaa(station):
    q = {'dataset': 'daily-summaries', 'stations': station, 'dataTypes': 'TMAX,TMIN,PRCP',
         'startDate': '2015-01-01', 'endDate': '2024-12-31', 'format': 'json', 'units': 'metric'}
    rows = fetch('https://www.ncei.noaa.gov/access/services/data/v1?' + urllib.parse.urlencode(q), as_json=True)
    by = collections.defaultdict(lambda: {'x': [], 'n': [], 'p': []})
    for r in rows:
        for key, col in (('x', 'TMAX'), ('n', 'TMIN'), ('p', 'PRCP')):
            if r.get(col) not in (None, ''): by[r['DATE'][:7]][key].append(float(r[col]))
    months = []
    for m in range(1, 13):
        cur = [v for k, v in by.items() if int(k[5:]) == m]
        xs = [sum(v['x']) / len(v['x']) for v in cur if len(v['x']) >= 20]   # 하루 20일 이상 기록된 달만
        ns = [sum(v['n']) / len(v['n']) for v in cur if len(v['n']) >= 20]
        ps = [sum(v['p']) for v in cur if len(v['p']) >= 25]
        if len(xs) < 5 or len(ns) < 5: raise ValueError(f'{station} {m}월 자료가 5년 미만이에요')
        months.append({'hi': round(sum(xs) / len(xs), 1), 'lo': round(sum(ns) / len(ns), 1), 'rain': round(sum(ps) / len(ps)) if len(ps) >= 5 else None})
    return {'months': months, 'source': '미국 NOAA NCEI 관측값(GHCN-Daily)', 'period': '2015~2024 평균', 'station': station}

def main():
    out_path = Path(__file__).resolve().parent.parent / 'travel' / 'data' / 'climate.json'
    result = {}
    for city, src in SOURCES.items():
        try:
            result[city] = jma(src[1], src[2]) if src[0] == 'jma' else noaa(src[1])
            jul = result[city]['months'][6]
            print(f'{city:8s} OK  7월 최고 {jul["hi"]}° 최저 {jul["lo"]}° 강수 {jul["rain"]}mm')
        except Exception as e:
            print(f'{city:8s} 실패: {e}', file=sys.stderr)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('저장:', out_path)

if __name__ == '__main__':
    main()
