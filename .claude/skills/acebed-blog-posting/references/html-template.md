# 에이스침대 정림동점 블로그 HTML 템플릿 (검증 완료)

장마철 매트리스 관리법 포스팅에서 검증된 D.I.A 최적화 HTML 구조.
이 CSS와 구조를 그대로 사용하고, 콘텐츠만 교체한다.

## 핵심 스타일 규칙

- 본문 폭: max-width 640px (모바일 최적)
- 폰트: Apple SD Gothic Neo / Malgun Gothic
- 배경: #FAFAF8 / 본문 텍스트: #2C2C2A
- 강조(strong): 골드 #C9A96E
- h2: 골드 밑줄 2px
- 후킹 인용: 좌측 골드 3px 보더 + 크림 배경(#FFFDF7) + 이탤릭
- 체크리스트: 흰 카드 + ☐ 골드 불릿 + 점선 구분
- 리노's Pick: 차콜(#2C2C2A) 다크 박스 + 골드 제목
- 매장 정보: 크림 카드(#F5F1E8)
- 이미지 자리: .img-placeholder 회색 박스 + "📸 사진 삽입: 설명"

## 전체 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>[포스팅 제목] | 에이스침대 정림동점</title>
<style>
  body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px 16px; line-height: 1.8; font-size: 16px; color: #2C2C2A; background: #FAFAF8; }
  h1 { font-size: 22px; font-weight: 700; line-height: 1.5; margin-bottom: 8px; }
  .intro-fixed { font-size: 16px; font-weight: 600; margin: 20px 0 4px 0; }
  .intro-fixed .curator { color: #C9A96E; font-weight: 700; }
  .hook-quote { background: #FFFDF7; border-left: 3px solid #C9A96E; padding: 16px 20px; margin: 20px 0; font-style: italic; color: #4a4a48; }
  .hook-quote p { margin: 6px 0; }
  h2 { font-size: 19px; font-weight: 700; margin-top: 36px; margin-bottom: 12px; border-bottom: 2px solid #C9A96E; padding-bottom: 6px; }
  h3 { font-size: 17px; font-weight: 700; margin-top: 24px; margin-bottom: 8px; }
  p { margin: 10px 0; }
  strong { color: #C9A96E; font-weight: 700; }
  .callout { background: #F5F1E8; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-size: 15px; }
  .checklist { background: #ffffff; border: 1px solid #e5e1d5; border-radius: 10px; padding: 18px 20px; margin: 16px 0; }
  .checklist ul { list-style: none; padding: 0; margin: 0; }
  .checklist li { padding: 8px 0 8px 28px; position: relative; border-bottom: 1px dashed #e5e1d5; }
  .checklist li:last-child { border-bottom: none; }
  .checklist li::before { content: "☐"; position: absolute; left: 0; color: #C9A96E; font-size: 18px; }
  .img-placeholder { width: 100%; background: #EFEAE0; border-radius: 10px; text-align: center; padding: 60px 10px; color: #999; font-size: 14px; margin: 16px 0; }
  .pick-box { background: #2C2C2A; color: #FAFAF8; border-radius: 10px; padding: 24px 22px; margin-top: 36px; }
  .pick-box h2 { color: #C9A96E; border-bottom: none; margin-top: 0; }
  .cta { font-weight: 700; color: #C9A96E; }
  .related-links { margin-top: 24px; font-size: 15px; }
  .related-links a { color: #2C2C2A; text-decoration: underline; }
  .store-info { margin-top: 28px; background: #F5F1E8; border-radius: 10px; padding: 18px 20px; font-size: 15px; }
  .store-info p { margin: 4px 0; }
</style>
</head>
<body>

<h1>[포스팅 제목]</h1>

<p class="intro-fixed">
  하루 8시간, 당신의 수면을 과학으로 처방합니다.<br>
  <span class="curator">에이스침대 정림동점 수면큐레이터 리노</span>입니다. 🛏️
</p>

<div class="hook-quote">
  <p>❝ <em>[1줄: 공감·문제 상황]</em></p>
  <p><em>[2줄: 상담 경험 신뢰]</em></p>
  <p><em>[3줄: 클릭 유도] ❞</em></p>
</div>

<div class="img-placeholder">📸 사진 삽입: [설명]</div>

<h2>[이모지] [소제목 1 — 문제 제기]</h2>
<p>[3~5줄 문단, 핵심 수치는 <strong>강조</strong>]</p>

<div class="callout">💡 [로컬 연결 or 팁 콜아웃]</div>

<h2>✅ [체크리스트 소제목]</h2>
<div class="checklist">
  <ul>
    <li>[항목 — 과거형 어미 통일]</li>
    <li>[항목]</li>
    <li>[항목]</li>
    <li>[항목]</li>
    <li>[항목]</li>
  </ul>
</div>
<p><strong>[N개 이상 해당되면 ___] 판단 기준 문장</strong></p>

<h2>[이모지] [본문 소제목 — 해결법/추천]</h2>
<h3>1. [세부 항목]</h3>
<p>[내용]</p>

<div class="pick-box">
  <h2>🛏️ 리노's Pick</h2>
  <p>[핵심 요약 — <span class="cta">"___ 세 가지로 정리됩니다"</span>]</p>
  <p>[매장 연결 문장]</p>
  <p>💬 [키워드 지정형 댓글 CTA — 댓글에 '키워드' 남겨주세요]</p>
</div>

<div class="related-links">
  <p>👇 함께 보면 좋은 글 👇</p>
  <p><a href="#">[내부 링크 1 — 앵커 텍스트 변형]</a></p>
  <p><a href="#">[내부 링크 2 — 앵커 텍스트 변형]</a></p>
</div>

<div class="store-info">
  <p>📍 대전 서구 정림동 495번지 (계백로 1262)</p>
  <p>📞 042-585-9963</p>
  <p>🕐 오전 10:00 ~ 오후 8:00</p>
</div>

</body>
</html>
```

## 사용 안내 (리노님 전달용)

1. 브라우저에서 열어 디자인 확인
2. 네이버 스마트에디터에는 텍스트 복사 후 소제목/굵게를 에디터 기능으로 별도 적용
3. 📸 자리에 실제 사진 삽입
