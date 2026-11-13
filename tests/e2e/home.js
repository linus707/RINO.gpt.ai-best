// 홈(index.html): 로그인하지 않은 새 기기에서 로그인 화면이 제대로 뜨는지 확인해요.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();

  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  await page.getByRole('heading', { name: 'Linus Company 로그인' }).waitFor();
  check(await page.getByRole('textbox', { name: /이메일/ }).isVisible(), '이메일 입력칸이 안 보여요');
  check(await page.getByRole('textbox', { name: /비밀번호/ }).isVisible(), '비밀번호 입력칸이 안 보여요');
  check(await page.getByRole('button', { name: '로그인', exact: true }).isVisible(), '로그인 버튼이 안 보여요');
  check((await page.getByRole('textbox', { name: /비밀번호/ }).getAttribute('type')) === 'password', '비밀번호 칸이 가려지지 않아요');
  check(/Linus Company/.test(await page.title()), `페이지 제목이 이상해요: ${await page.title()}`);
  check(!errors.length, `스크립트 오류: ${errors.join(' / ')}`);
  return '로그인 화면 표시 확인';
}
