# task: 실제 폰에서 사이트 페이지가 제대로 뜨는지 확인 (읽기 전용)
#
# phone-harness 스크립트예요. 직접 python으로 돌리지 말고 run.sh로 실행하세요:
#   scripts/phone/run.sh scripts/phone/site-check.py
#
# 하는 일: 페이지를 폰 브라우저로 열고, 화면에 기대한 글자가 보이는지만 봐요.
# 누르기·입력·로그인은 하지 않아요.
#
# 주소를 바꾸려면 아래 SITE만 고치면 돼요.

SITE = "https://linuscompany.co.kr"

# (경로, 화면에 보여야 하는 글자). 글자는 각 페이지 첫 화면에 실제로 있는 것.
PAGES = [
    ("/", "로그인"),
    ("/price.html", "가격표"),
    ("/pos.html", "매장 POS"),
    ("/translate.html", "키보드 번역"),
    ("/japanese.html", "지금 말하기"),
]


def open_page(url):
    """폰 종류에 맞는 방법으로 주소를 열어요. 쓴 방법의 이름을 돌려줘요."""
    if supports("url.open"):  # 클라우드 폰
        open_url(url)
        return "open_url"
    if supports("raw"):  # 안드로이드: adb로 브라우저에 주소 전달
        shell("am start -a android.intent.action.VIEW -d '%s'" % url)
        return "adb"
    # 아이폰 미러링: 검색창(Spotlight)에 주소를 넣어 사파리로 열어요.
    # 주의: 이 길은 실제 아이폰에서 아직 확인하지 못했어요.
    open_app(url)
    return "spotlight"


ensure_device()
failed = []
for path, expect in PAGES:
    url = SITE + path
    how = open_page(url)
    hit = wait_for_text(expect, timeout=20)
    if hit:
        print("통과  %-18s '%s' 보임 (%s)" % (path, expect, how))
    else:
        seen = [o["text"] for o in screen()][:12]
        print("실패  %-18s '%s' 안 보임 (%s). 화면: %s" % (path, expect, how, seen))
        failed.append(path)

print("결과: %d개 중 %d개 통과" % (len(PAGES), len(PAGES) - len(failed)))
if failed:
    raise SystemExit(1)
