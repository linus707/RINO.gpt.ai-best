// 오프라인 안내(offline.html): 인터넷이 끊겼을 때 보이는 화면이 제대로 뜨는지 확인해요.
async page => {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  await page.getByRole('heading', { name: '인터넷에 연결되어 있지 않아요' }).waitFor();
  check(await page.getByRole('button', { name: '다시 시도' }).isVisible(), '다시 시도 버튼이 안 보여요');
  return '안내 문구·다시 시도 버튼 확인';
}
