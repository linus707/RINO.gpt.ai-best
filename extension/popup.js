const $ = (s) => document.querySelector(s);
const say = (t) => { $("#msg").textContent = t; };
async function refresh() {
  const { ams } = await chrome.storage.local.get("ams");
  const n = ams ? Object.keys(ams.rows || {}).length + (ams.raw || []).length : 0;
  $("#n").textContent = n + "개";
  $("#send").disabled = !n; $("#clear").disabled = !n;
}
$("#win").onclick = async () => { await chrome.runtime.sendMessage({ type: "open-window" }); window.close(); };
$("#tab").onclick = async () => { await chrome.runtime.sendMessage({ type: "open-tab" }); window.close(); };
$("#send").onclick = async () => {
  $("#send").disabled = true; say("앱으로 보내는 중…");
  const r = await chrome.runtime.sendMessage({ type: "send-prices" });
  if (r && r.ok) { say("앱으로 보냈어요. 앱에서 미리보기를 확인하고 가져오기를 눌러 주세요."); setTimeout(() => window.close(), 1200); }
  else { say((r && r.error) || "보내지 못했어요"); refresh(); }
};
$("#clear").onclick = async () => { await chrome.storage.local.remove("ams"); say("비웠어요"); refresh(); };
refresh();
