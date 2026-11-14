/* 名詞浮動解釋
 * 頁面先定義 window.TERMS = { '名詞': '解釋', ... }，再載入本檔。
 * 內文中每次出現的名詞都包成 <span class="term">，滑鼠移上去（觸控裝置點一下）浮出解釋。
 * 只包 span、不增刪文字，所以螢光筆的「可標記全文」位置不變。解釋放在 body 下的單一提示框，不在 main 裡。
 */
(function () {
  'use strict';
  const TERMS = window.TERMS || {};
  const keys = Object.keys(TERMS).sort((a, b) => b.length - a.length);
  if (!keys.length) return;

  // 不處理的區塊：互動圖、Mermaid、操作區、標題、程式碼、連結、按鈕
  const SKIP = '.fig-body, .controls, .readout, .status, .log, .mermaid-host, svg, .pager, h1, h2, a, button, code, pre, script, style, .term, .sup, .hl-tool';
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const W = /[A-Za-z0-9_]/;
  // 英數開頭／結尾的名詞要對齊字界，避免 TS 配到 TSPEC、AC 配到 AC_BK
  const pat = keys.map((k) => (W.test(k[0]) ? '(?<![A-Za-z0-9_])' : '') + esc(k) + (W.test(k[k.length - 1]) ? '(?![A-Za-z0-9_])' : '')).join('|');
  const RE = new RegExp(pat, 'g');

  function wrapAll() {
    const main = document.querySelector('main');
    if (!main) return;
    const nodes = [];
    const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (!n.nodeValue.trim() || n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach((n) => {
      const t = n.nodeValue;
      RE.lastIndex = 0;
      if (!RE.test(t)) return;
      RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = RE.exec(t))) {
        if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
        const s = document.createElement('span');
        s.className = 'term';
        s.tabIndex = 0;
        s.dataset.term = m[0];
        s.textContent = m[0];
        frag.appendChild(s);
        last = m.index + m[0].length;
      }
      if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }

  let tip, cur = null, touch = false;
  function show(el) {
    const k = el.dataset.term;
    if (!TERMS[k]) return;
    cur = el;
    tip.textContent = '';
    const b = document.createElement('b');
    b.textContent = k;
    tip.append(b, '：' + TERMS[k]);
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(8, Math.min(x, document.documentElement.clientWidth - w - 8));
    let y = r.bottom + 6;
    if (y + h > window.innerHeight - 8 && r.top - h - 6 > 8) y = r.top - h - 6;
    tip.style.left = x + window.scrollX + 'px';
    tip.style.top = y + window.scrollY + 'px';
  }
  function hide() { cur = null; if (tip) tip.hidden = true; }

  function setup() {
    wrapAll();
    tip = document.createElement('div');
    tip.className = 'term-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);

    document.addEventListener('pointerdown', (e) => { touch = e.pointerType !== 'mouse'; }, true);
    document.addEventListener('mouseover', (e) => {
      if (touch) return;
      const el = e.target.closest && e.target.closest('.term');
      if (el) show(el);
    });
    document.addEventListener('mouseout', (e) => {
      if (touch) return;
      const el = e.target.closest && e.target.closest('.term');
      if (el && !el.contains(e.relatedTarget)) hide();
    });
    document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('term')) show(e.target); });
    document.addEventListener('focusout', (e) => { if (e.target.classList && e.target.classList.contains('term')) hide(); });
    // 觸控：點名詞切換顯示，點其他地方關閉
    document.addEventListener('click', (e) => {
      if (!touch) return;
      const el = e.target.closest && e.target.closest('.term');
      if (el && el !== cur) show(el);
      else hide();
    });
    window.addEventListener('scroll', () => { if (touch) hide(); }, { passive: true });
    window.addEventListener('resize', hide);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  }

  // 在 common.js 建好目錄之後、螢光筆（load 時）還原標記之前包好名詞
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
