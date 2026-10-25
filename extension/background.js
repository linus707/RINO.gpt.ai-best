// Linus Company 확장 프로그램 — 백그라운드
// · 앱 창 열기(첫 번째 창이므로 일반 탭과 같은 저장 공간을 써요)
// · AMS에서 담아 둔 제품 표를 앱 단가표로 전달
const APP = "https://linuscompany.co.kr/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getStage() {
  const { ams } = await chrome.storage.local.get("ams");
  return ams && typeof ams === "object" ? { rows: ams.rows || {}, raw: ams.raw || [] } : { rows: {}, raw: [] };
}

function toTsv(stage) {
  const head = ["코드", "모델 명", "규격", "색상", "등급", "소비자가"].join("\t");
  const rows = Object.values(stage.rows).map((r) => [r.code, r.model, r.spec, r.color, r.grade, r.price].map((v) => String(v == null ? "" : v).replace(/[\t\r\n]+/g, " ")).join("\t"));
  const parts = [];
  if (rows.length) parts.push([head, ...rows].join("\n"));
  stage.raw.forEach((t) => parts.push(String(t)));
  return parts.join("\n");
}

async function findAppTab() {
  const tabs = await chrome.tabs.query({ url: APP + "*" });
  return tabs[0] || null;
}

async function deliver(tabId, text) {
  for (let i = 0; i < 12; i++) {
    try {
      const r = await chrome.tabs.sendMessage(tabId, { type: "prices", text });
      if (r && r.ok) return true;
    } catch (e) { /* 아직 앱이 준비되지 않았어요 */ }
    await sleep(600);
  }
  return false;
}

async function sendPrices() {
  const text = toTsv(await getStage());
  if (!text.trim()) return { ok: false, error: "담아 둔 제품이 없어요" };
  let tab = await findAppTab();
  if (tab) {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    tab = await chrome.tabs.create({ url: APP });
    await new Promise((res) => {
      const f = (id, info) => { if (id === tab.id && info.status === "complete") { chrome.tabs.onUpdated.removeListener(f); res(); } };
      chrome.tabs.onUpdated.addListener(f);
      setTimeout(res, 15000);
    });
  }
  const ok = await deliver(tab.id, text);
  return ok ? { ok: true } : { ok: false, error: "앱이 응답하지 않아요. 앱 탭을 새로 고친 뒤 다시 시도해 주세요" };
}

chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (!m || typeof m.type !== "string") return;
  if (m.type === "send-prices") { sendPrices().then(send); return true; }
  if (m.type === "open-window") {
    chrome.windows.create({ url: APP, type: "popup", width: 460, height: 860 }).then(() => send({ ok: true }));
    return true;
  }
  if (m.type === "open-tab") { chrome.tabs.create({ url: APP }).then(() => send({ ok: true })); return true; }
});
