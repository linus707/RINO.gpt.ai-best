"""매장 POS 가격표 엑셀 만들기: 빈 양식(pos-price-template.xlsx) + 현재 매장 가격표를 채운 파일(pos-price-store.xlsx)

쓰는 법(저장소 맨 위에서): python3 scripts/make-price-xlsx.py . .
store-prices.json을 바꿨으면 다시 돌려서 두 파일을 함께 커밋해요. openpyxl이 필요해요(pip install openpyxl).
"""
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment

repo, out = sys.argv[1], sys.argv[2]
MENUS = ['매트리스', '프레임', '사이드옵션', '슬립케어', '사은품']
GID = {'matt': '매트리스', 'frame': '프레임', 'side': '사이드옵션', 'care': '슬립케어', 'gift': '사은품'}
HEAD = ['메뉴', '순서', '모델명', '타입', '규격', '색상', '정상가(원)', '할인율(%)', '검색어', '상품코드', '설명']
WIDTH = [12, 7, 26, 18, 10, 18, 14, 11, 16, 14, 44]
NOTE = {
    '메뉴': '꼭 적어요. 목록에서 골라요: 매트리스·프레임·사이드옵션·슬립케어·사은품',
    '순서': '비워도 돼요. 숫자가 작을수록 메뉴에서 앞에 나와요.',
    '모델명': '꼭 적어요. 같은 메뉴에서 모델명이 같으면 한 제품으로 묶여요(예: BARONT). 그 안에서 타입·규격·색상을 골라요.',
    '타입': '비워도 돼요. 한 제품 안의 종류(T, N, T (LED일체형) 등). 2개 이상이면 손님 화면에 「타입」 선택이 먼저 나와요. 없으면 비워요.',
    '규격': 'SS·DD·LQ·K·LK 등. 없으면 비워요.',
    '색상': '색상이나 옵션 이름. 없으면 비워요.',
    '정상가(원)': '꼭 적어요. 숫자만(콤마·원은 있어도 돼요).',
    '할인율(%)': '비워도 돼요. 이 품목의 기본 제품 할인율(0~100).',
    '검색어': '비워도 돼요. 검색에 쓰일 다른 이름(예: 하이브리드).',
    '상품코드': '비워도 돼요. 있으면 겹치지 않게 적어요(사진·가격 수정이 이 코드에 붙어요).',
    '설명': '비워도 돼요. 제품 그림 안 제품 아래와 목록 카드에 나와요(모델마다 한 번만 적으면 돼요, 200자까지).',
}
REQ = {'메뉴', '모델명', '정상가(원)'}

thin = Side(style='thin', color='DDDDDD')
H_FILL = PatternFill('solid', fgColor='000000')
R_FILL = PatternFill('solid', fgColor='2189FF')
EX_FILL = PatternFill('solid', fgColor='F5FAFF')


def sheet_price(ws, rows, example=False):
    ws.title = '가격표'
    ws.append(HEAD)
    for i, h in enumerate(HEAD, 1):
        c = ws.cell(row=1, column=i)
        c.font = Font(bold=True, color='FFFFFF')
        c.fill = R_FILL if h in REQ else H_FILL
        c.alignment = Alignment(horizontal='center', vertical='center')
        c.comment = Comment(NOTE[h], '매장 POS')
        ws.column_dimensions[c.column_letter].width = WIDTH[i - 1]
    ws.row_dimensions[1].height = 24
    for r in rows:
        ws.append(r)
    n = max(ws.max_row, 2)
    last = 2000 if example else n + 500  # 아래에 더 적어도 같은 규칙이 걸리게
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        row[6].number_format = '#,##0'
        row[1].number_format = '0'
        row[9].number_format = '@'
        row[10].alignment = Alignment(wrap_text=True, vertical='top')
        for c in row:
            c.border = Border(bottom=thin)
            if example:
                c.fill = EX_FILL
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = f'A1:K{n}'
    dv = DataValidation(type='list', formula1='"' + ','.join(MENUS) + '"', allow_blank=False, showErrorMessage=True,
                        errorTitle='메뉴', error='매트리스·프레임·사이드옵션·슬립케어·사은품 중에서 골라 주세요.')
    dv.add(f'A2:A{last}')
    price = DataValidation(type='decimal', operator='greaterThan', formula1='0', showErrorMessage=True,
                           errorTitle='정상가', error='0보다 큰 숫자로 적어 주세요.')
    price.add(f'G2:G{last}')
    rate = DataValidation(type='decimal', operator='between', formula1='0', formula2='100', allow_blank=True, showErrorMessage=True,
                          errorTitle='할인율', error='0~100 사이 숫자로 적어 주세요(%는 빼요).')
    rate.add(f'H2:H{last}')
    order = DataValidation(type='whole', operator='greaterThanOrEqual', formula1='0', allow_blank=True, showErrorMessage=True,
                           errorTitle='순서', error='0 이상의 정수로 적어 주세요.')
    order.add(f'B2:B{last}')
    for v in (dv, price, rate, order):
        ws.add_data_validation(v)


def sheet_guide(wb, filled):
    ws = wb.create_sheet('작성 방법')
    ws.column_dimensions['A'].width = 18
    ws.column_dimensions['B'].width = 92
    lines = [
        ('매장 POS 가격표 서식', None),
        ('', None),
        ('불러오는 방법', '매장 POS › ⚙ 설정 › 가격표·검색 › 「엑셀 가격표 불러오기」 → 이 파일 선택 → 확인 창에서 메뉴별 줄 수·오류 줄 확인 → 「적용」'),
        ('', '적용하면 그 기기에서는 이 가격표만 써요. 되돌리려면 같은 곳의 「불러온 엑셀 지우기」.'),
        ('', '「가격표」 시트를 읽어요(없으면 첫 시트). 1행 제목은 그대로 두세요.'),
        ('', None),
        ('칸', '설명'),
    ]
    for h in HEAD:
        lines.append((h + (' (필수)' if h in REQ else ''), NOTE[h]))
    lines += [
        ('', None),
        ('모델 묶기 예', '메뉴 「매트리스」 · 모델명 「HT-R 26NEW」 · 규격 SS / DD / LQ 세 줄 → 매장 POS에서 「HT-R 26NEW」 하나에 규격 3개로 나와요.'),
        ('타입 묶기 예', '메뉴 「프레임」 · 모델명 「BARONT」 · 타입 T → 규격 SS/LQ/K/LK 줄들, 타입 N → 규격 SS 줄. 모델명을 모두 「BARONT」로 같게 적고 타입 칸만 다르게 쓰면 BARONT 하나를 열고 타입 → 규격 → 색상 순서로 골라요. 새 제품을 더할 때도 이렇게 적어요.'),
        ('타입 칸 주의', '타입을 쓰지 않던 옛 엑셀도 그대로 읽혀요(타입 칸이 없으면 타입 없는 제품). 같은 제품의 모든 줄에 타입을 쓰거나, 모두 비우세요.'),
        ('규격 예', 'S 싱글 · SS 슈퍼싱글 · DS · DD 더블 · Q 퀸 · LQ 라지퀸 · K 킹 · K3 · LK 라지킹 (LK(1800)처럼 괄호도 돼요)'),
        ('할인 순서', '품목 할인(장바구니) > 장바구니 제품 칸 > 모델별 할인율(설정) > 이 엑셀의 할인율 > 메뉴별 할인율 > 기본 제품 할인율'),
        ('진열용', '모델명에 「진열용」이 들어 있으면 매장 POS에 나오지 않아요.'),
        ('사은품', '메뉴를 「사은품」으로 적으면 사은품 메뉴에 들어가고, 거기서 담으면 0원이에요.'),
        ('저장', '엑셀(.xlsx) 그대로 저장해요. 오래된 기기에서 안 읽히면 「CSV UTF-8」로 저장해 불러와도 돼요.'),
    ]
    if filled:
        lines += [('', None), ('이 파일', filled)]
    for a, b in lines:
        ws.append([a, b])
    ws['A1'].font = Font(bold=True, size=16)
    for r in ws.iter_rows(min_row=2):
        r[0].font = Font(bold=True)
        r[1].alignment = Alignment(wrap_text=True, vertical='top')
        r[0].alignment = Alignment(vertical='top')
    for r in ws.iter_rows():
        if r[0].value == '칸':
            for c in r:
                c.font = Font(bold=True, color='FFFFFF')
                c.fill = H_FILL


# 1) 빈 양식(예시 5줄 — 지우고 채워요)
wb = Workbook()
sheet_price(wb.active, [
    ['매트리스', 1, 'HT-R 26NEW', None, 'SS', '', 2159000, None, '하이브리드', '', '하이브리드 스프링으로 몸을 고르게 받쳐 줘요'],
    ['매트리스', 1, 'HT-R 26NEW', None, 'LQ', '', 2838000, None, '하이브리드', '', None],
    ['프레임', 2, 'BARONT', 'T', 'SS', '뱅가드월넛', 1204000, None, '바론트', '', '같은 제품 BARONT 안에서 타입(T·N)을 골라요'],
    ['프레임', 2, 'BARONT', 'T', 'LQ', '뱅가드월넛', 1626000, None, '바론트', '', None],
    ['프레임', 2, 'BARONT', 'N', 'SS', '뱅가드월넛', 948000, None, '바론트', '', None],
    ['사이드옵션', 3, '협탁#51', None, '', '내츄럴오크', 157000, None, '', '', None],
    ['사은품', 4, '마이크로케어 방수커버', None, 'SS', '화이트', 185000, None, '', '', None],
], example=True)
sheet_guide(wb, None)
wb.active = 0
wb.save(f'{out}/pos-price-template.xlsx')

# 2) 지금 매장 가격표(store-prices.json) 채운 파일
st = json.load(open(f'{repo}/store-prices.json', encoding='utf-8'))
rows = []
for it in st['items']:
    ordv = it.get('ord')
    rows.append([GID[it['group']], None if ordv is None or ordv >= 1_000_000 else int(ordv), it['model'], it.get('type') or None, it.get('size') or None,
                 it.get('color') or None, int(it['price']), it.get('rate'), it.get('kw') or None, it['code'], it.get('desc') or None])
wb = Workbook()
sheet_price(wb.active, rows)
sheet_guide(wb, f'매장 POS에 들어 있는 매장 가격표(「{st["name"]}」, {st["at"]}, {len(rows)}줄)를 이 서식으로 옮긴 거예요. 가격·이름을 고치고 줄을 더해 불러오면 돼요.')
wb.active = 0
wb.save(f'{out}/pos-price-store.xlsx')
print('rows', len(rows))
