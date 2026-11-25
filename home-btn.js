/* 번역기·일본어 회화·가격표·여행 숙소 지도 같은 따로 열리는 앱에 「← 홈」 버튼을 붙여요.
   이 기기에서 Linus Company 앱을 쓰는 사람에게만 보이고(앱 저장 데이터가 있을 때), 방문자 화면에는 나타나지 않아요. */
(function(){
  try{
    if(window.top!==window.self)return; // 다른 화면 안에 끼워져 있으면 달지 않아요
    var used=false;try{used=!!(localStorage.getItem("rino-ws")||localStorage.getItem("rino-cfg"))}catch(e){}
    if(!used)return;
    var src=document.currentScript&&document.currentScript.src;if(!src)return;
    var home=new URL("index.html",src).href;
    var st=document.createElement("style");
    st.textContent=".lc-home{position:fixed;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));z-index:2147483000;display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:999px;background:#000;color:#fff!important;font:700 15px/1 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard Variable',Pretendard,'Noto Sans KR',sans-serif;letter-spacing:-.02em;text-decoration:none!important;box-shadow:0 4px 16px rgba(0,0,0,.28);opacity:.92}.lc-home:active{opacity:.7}";
    var a=document.createElement("a");a.className="lc-home";a.href=home;a.setAttribute("aria-label","Linus Company 홈으로");a.textContent="← 홈";
    function add(){document.head.appendChild(st);document.body.appendChild(a)}
    if(document.body)add();else document.addEventListener("DOMContentLoaded",add);
  }catch(e){}
})();
