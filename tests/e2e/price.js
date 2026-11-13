// 가격표(price.html): 불러오기 · 검색 · 분류 · 정렬 · 더 보기를 확인해요.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();

  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const num = s => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
  const rows = page.locator('#tb tr');
  const count = async () => num(await page.locator('#count').innerText());
  const settle = () => page.waitForTimeout(400); // 검색 입력은 0.15초 뒤에 반영돼요

  // 1) 불러오기
  await rows.first().waitFor();
  const total = await count();
  check(total > 1000, `제품 수가 너무 적어요: ${total}`);
  check((await rows.count()) === 100, `첫 화면은 100줄이어야 해요: ${await rows.count()}`);
  check(/기준일 \d{4}-\d{2}-\d{2}/.test(await page.locator('#meta').innerText()), '기준일이 표시되지 않아요');
  check(await page.locator('th.priv').first().isHidden(), '출고가·공급가 열이 기본으로 보이면 안 돼요');

  // 2) 더 보기
  await page.locator('#more').click();
  check((await rows.count()) === 200, `더 보기 뒤 200줄이어야 해요: ${await rows.count()}`);

  // 3) 검색: 첫 제품의 코드로 찾으면 그 제품이 나와야 해요
  const code = (await rows.first().locator('td.code').textContent()).trim();
  await page.locator('#q').fill(code);
  await settle();
  const found = await count();
  check(found >= 1 && found < total, `코드 검색 결과가 이상해요: ${found}`);
  check((await rows.first().locator('td.code').textContent()).trim() === code, '검색한 코드가 첫 줄에 없어요');

  // 4) 없는 검색어
  await page.locator('#q').fill('zzz없는상품zzz');
  await settle();
  check((await count()) === 0, '없는 검색어인데 결과가 나와요');
  check(await page.locator('#empty').isVisible(), '"검색 결과가 없어요" 안내가 안 보여요');
  await page.locator('#q').fill('');
  await settle();

  // 5) 분류 선택
  const cats = await page.locator('#cat option').count();
  check(cats > 1, '분류 목록이 비어 있어요');
  await page.locator('#cat').selectOption({ index: 1 });
  const catName = await page.locator('#cat option').nth(1).innerText();
  const inCat = await count();
  check(inCat > 0 && inCat < total, `분류 "${catName}" 결과가 이상해요: ${inCat}`);
  const tags = await rows.locator('.cat').allInnerTexts();
  check(tags.every(t => t === catName), `분류 "${catName}"에 다른 분류가 섞여 있어요`);
  await page.locator('#cat').selectOption({ index: 0 });

  // 6) 판매가 정렬: 처음 누르면 비싼 순, 다시 누르면 싼 순
  const prices = async () => (await rows.locator('td.n b').allInnerTexts()).map(num);
  const sorted = (a, dir) => a.every((v, i) => i === 0 || (v - a[i - 1]) * dir >= 0);
  await page.locator('th[data-k="3"]').click();
  check(sorted(await prices(), -1), '판매가 비싼 순 정렬이 틀려요');
  await page.locator('th[data-k="3"]').click();
  check(sorted(await prices(), 1), '판매가 싼 순 정렬이 틀려요');

  check(!errors.length, `스크립트 오류: ${errors.join(' / ')}`);
  return `제품 ${total.toLocaleString()}개 · 분류 ${cats - 1}개 확인`;
}
