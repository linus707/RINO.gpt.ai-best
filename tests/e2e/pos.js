// 매장 POS(pos.html): 상품 담기 · 수량 · 합계 · 비우기 · 검색 · 새로고침 뒤 유지를 확인해요.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();

  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const num = s => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
  const tiles = page.locator('#grid .tile');
  const lines = page.locator('#lines li.line');
  const pay = page.locator('#btnPay');
  const settle = () => page.waitForTimeout(400);

  // 1) 첫 화면
  await tiles.first().waitFor();
  check((await lines.count()) === 0, '처음부터 장바구니에 상품이 있어요');
  check(/^0개/.test(await pay.innerText()), `빈 장바구니 결제 버튼이 이상해요: ${await pay.innerText()}`);

  // 2) 상품 담기: 첫 상품을 누르면 장바구니에 같은 이름·가격으로 들어가야 해요
  const name = (await tiles.first().locator('.nm').innerText()).trim();
  const price = num((await tiles.first().locator('.mt').innerText()).split('·').pop());
  check(price > 0, `첫 상품 가격을 읽지 못했어요: ${name}`);
  await tiles.first().click();
  await lines.first().waitFor();
  check((await lines.first().locator('.n').innerText()).trim() === name, '장바구니 상품명이 달라요');
  check(num(await lines.first().locator('.p').innerText()) === price, '장바구니 가격이 달라요');
  check((await pay.innerText()) === `1개 결제 ${price.toLocaleString('ko-KR')}원`, `결제 버튼 금액이 달라요: ${await pay.innerText()}`);

  // 3) 수량 늘리기·줄이기
  await lines.first().getByRole('button', { name: '수량 늘리기' }).click();
  check(num(await pay.innerText().then(t => t.split('결제')[1])) === price * 2, `2개 합계가 틀려요: ${await pay.innerText()}`);
  check(/^2개/.test(await pay.innerText()), '수량이 2개로 표시되지 않아요');
  await lines.first().getByRole('button', { name: '수량 줄이기' }).click();
  check((await pay.innerText()) === `1개 결제 ${price.toLocaleString('ko-KR')}원`, '수량을 줄인 뒤 합계가 틀려요');

  // 4) 새로고침해도 장바구니가 남아 있어야 해요
  await page.reload();
  await lines.first().waitFor();
  check((await lines.first().locator('.n').innerText()).trim() === name, '새로고침 뒤 장바구니가 사라졌어요');

  // 5) 장바구니 비우기: 확인 창에서 취소하면 그대로, 확인하면 비워져야 해요
  const ask = page.getByRole('dialog');
  await page.getByRole('button', { name: '장바구니 비우기' }).click();
  check(/비울까요/.test(await ask.innerText()), '비우기 확인 창이 안 떠요');
  await ask.getByRole('button', { name: '취소' }).click();
  check((await lines.count()) === 1, '취소했는데 장바구니가 비워졌어요');
  await page.getByRole('button', { name: '장바구니 비우기' }).click();
  await ask.getByRole('button', { name: '확인' }).click();
  await settle();
  check((await lines.count()) === 0, '장바구니가 비워지지 않았어요');
  check(/^0개/.test(await pay.innerText()), '비운 뒤 결제 버튼이 0개가 아니에요');

  // 6) 검색: 상품명으로 찾으면 결과 첫 칸에 그 상품이 나와야 해요
  await page.locator('#q').fill(name);
  await settle();
  check((await tiles.count()) > 0, `"${name}" 검색 결과가 없어요`);
  check((await tiles.locator('.nm').allInnerTexts()).some(t => t.trim() === name), `"${name}" 검색 결과에 그 상품이 없어요`);
  await page.locator('#q').fill('zzz없는상품zzz');
  await settle();
  check((await tiles.count()) === 0, '없는 검색어인데 상품이 나와요');

  check(!errors.length, `스크립트 오류: ${errors.join(' / ')}`);
  return `"${name}" ${price.toLocaleString('ko-KR')}원으로 담기·수량·비우기·검색 확인`;
}
