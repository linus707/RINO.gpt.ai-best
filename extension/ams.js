// AMS(ams.acebed.co.kr) 페이지에서 동작: 내가 로그인해서 화면에 띄운 제품 표만 읽어요.
// 아이디·비밀번호는 읽거나 저장하지 않고, 자동으로 로그인·검색하지도 않아요. 버튼을 눌렀을 때만 담아요.
(() => {
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();
  const num = (v) => { const n = parseInt(String(v || "").replace(/[^\d]/g, ""), 10); return isFinite(n) ? n : 0; };

  function tableRows(doc) {
    const out = [];
    doc.querySelectorAll("table").forEach((tb) => {
      const trs = [...tb.rows].filter((r) => r.closest("table") === tb);
      let hi = -1, cols = [];
      for (let i = 0; i < trs.length; i++) {
        const c = [...trs[i].cells].map((x) => norm(x.innerText || x.textContent));
        if (c.some((x) => x === "코드") && c.some((x) => /소비자가|판매가/.test(x))) { hi = i; cols = c; break; }
      }
      if (hi < 0) return;
      const ix = (re) => cols.findIndex((x) => re.test(x));
      const I = { code: ix(/^코드$/), model: ix(/모델|제품|품명/), spec: ix(/규격|사이즈/), color: ix(/색상|컬러/), grade: ix(/등급/), price: ix(/소비자가|판매가/) };
      for (let i = hi + 1; i < trs.length; i++) {
        const c = [...trs[i].cells].map((x) => norm(x.innerText || x.textContent));
        if (c.length < cols.length - 1) continue;
        const price = num(c[I.price]);
        const model = I.model >= 0 ? c[I.model] : "";
        if (!model || price <= 0) continue;
        out.push({ code: I.code >= 0 ? c[I.code] : "", model, spec: I.spec >= 0 ? c[I.spec] : "", color: I.color >= 0 ? c[I.color] : "", grade: I.grade >= 0 ? c[I.grade] : "", price });
      }
    });
    return out;
  }

  // '엑셀 변환' 화면의 글상자(CSV·TAB)는 글 그대로 담아요.
  function rawTexts(doc) {
    const out = [];
    doc.querySelectorAll("textarea").forEach((t) => { const v = t.value || ""; if (/소비자가|판매가/.test(v) && v.split("\n").length > 1) out.push(v); });
    return out;
  }

  const hasData = () => tableRows(document).length > 0 || rawTexts(document).length > 0;
  const keyOf = (r) => r.code || [r.model, r.spec, r.color].join("|");

  async function collect() {
    const { ams } = await chrome.storage.local.get("ams");
    const st = { rows: (ams && ams.rows) || {}, raw: (ams && ams.raw) || [] };
    let added = 0;
    tableRows(document).forEach((r) => { const k = keyOf(r); if (!st.rows[k]) added++; st.rows[k] = r; });
    rawTexts(document).forEach((t) => { if (!st.raw.includes(t)) { st.raw.push(t); added++; } });
    st.raw = st.raw.slice(-5);
    await chrome.storage.local.set({ ams: st });
    return { added, total: Object.keys(st.rows).length + st.raw.length };
  }

  let btn = null, toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;right:16px;bottom:64px;z-index:2147483647;background:#1c1c1e;color:#fff;padding:10px 14px;border-radius:12px;font:14px/1.4 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3)";
      document.documentElement.appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.style.display = "block";
    clearTimeout(toast.t); toast.t = setTimeout(() => { toastEl.style.display = "none"; }, 3500);
  }
  function ensureBtn() {
    const show = hasData();
    if (show && !btn) {
      btn = document.createElement("button");
      btn.id = "linus-ams-btn"; btn.type = "button"; btn.textContent = "📋 단가표에 담기";
      btn.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#c8553d;color:#fff;border:0;border-radius:99px;padding:12px 18px;font:600 15px sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);cursor:pointer";
      btn.onclick = async () => {
        const r = await collect();
        toast(r.added ? `${r.added}개를 담았어요 · 누적 ${r.total}개. 확장 프로그램 아이콘에서 앱으로 보내세요` : `새로 담을 제품이 없어요 · 누적 ${r.total}개`);
      };
      document.documentElement.appendChild(btn);
    }
    if (btn) btn.style.display = show ? "block" : "none";
  }
  ensureBtn();
  setInterval(ensureBtn, 1500);
})();
