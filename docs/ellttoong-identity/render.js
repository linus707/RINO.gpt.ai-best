// 사용법: node render.js carousel-01-kyoto/slides.html
// → 같은 폴더 out/ 에 섹션 크기 그대로 PNG 저장 (캐러셀 1080x1350)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const file = path.resolve(process.argv[2]);
  const out = path.join(path.dirname(file), 'out');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 2000 }, deviceScaleFactor: 1 });
  await page.goto('file://' + file);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const els = await page.$$('section.s');
  for (const [i, el] of els.entries()) {
    const id = (await el.getAttribute('id')) || 's' + (i + 1);
    await el.screenshot({ path: path.join(out, id + '.png') });
  }
  await browser.close();
  console.log('saved', els.length, '->', out);
})();
