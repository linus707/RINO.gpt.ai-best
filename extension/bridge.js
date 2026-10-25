// 앱(linuscompany.co.kr) 페이지에서 동작: 확장 프로그램이 보낸 표를 앱에 전달해요.
// 앱은 받은 내용을 바로 저장하지 않고 '가져오기' 창에 미리 채워서 보여 줘요(확인 후 저장).
chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (m && m.type === "prices" && typeof m.text === "string") {
    window.postMessage({ source: "linus-ext", type: "price-import", text: m.text.slice(0, 2000000) }, location.origin);
    send({ ok: true });
  }
});
