/* 共用：主題切換、章節導覽、目錄、SVG 工具、動畫時間軸、Mermaid 圖 */
(function () {
  const CHAPTERS = [
    { href: 'index.html', label: '首頁' },
    { href: 'ch0-lan.html', label: '0. LAN 概論' },
    { href: 'ch1-csma-cd.html', label: '1. 802.3 CSMA/CD' },
    { href: 'ch2-1-80211-phy.html', label: '2-1. 802.11 架構與 PHY' },
    { href: 'ch2-2-80211-mac.html', label: '2-2. 802.11 MAC 服務' },
    { href: 'ch2-3-80211-frame.html', label: '2-3. WEP 與訊框格式' },
  ];

  /* ---------- theme ---------- */
  const root = document.documentElement;
  function storedTheme() { try { return localStorage.getItem('theme'); } catch (e) { return null; } }
  function saveTheme(v) { try { localStorage.setItem('theme', v); } catch (e) { /* ignore */ } }
  const st = storedTheme();
  if (st === 'light' || st === 'dark') root.setAttribute('data-theme', st);
  function isDark() {
    const a = root.getAttribute('data-theme');
    if (a) return a === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  window.isDark = isDark;

  /* ---------- header / footer ---------- */
  function buildChrome() {
    const here = location.pathname.split('/').pop() || 'index.html';
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<div class="inner">' +
      '<a class="brand" href="index.html"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true">' +
      '<circle cx="16" cy="22" r="3" style="fill:var(--accent)"/>' +
      '<path d="M9 16a10 10 0 0 1 14 0M5 12a15.5 15.5 0 0 1 22 0" style="stroke:var(--accent);fill:none" stroke-width="2.6" stroke-linecap="round"/></svg>' +
      '<span class="full">高速無線區域網路設計</span></a>' +
      '<nav class="chapters" aria-label="章節">' +
      CHAPTERS.map(c => `<a href="${c.href}"${c.href === here ? ' aria-current="page"' : ''}>${c.label}</a>`).join('') +
      '</nav>' +
      '<button class="theme-btn" type="button" aria-label="切換深淺色">◐</button></div>';
    document.body.prepend(header);
    header.querySelector('.theme-btn').addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      saveTheme(next);
      document.dispatchEvent(new CustomEvent('themechange'));
    });
    const cur = header.querySelector('[aria-current]');
    if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = '<div class="inner">中興大學資工系 碩專班｜高速無線區域網路設計（曾學文 老師）課程筆記。' +
      '標示 <span class="sup">補充</span> 的內容不在講義裡，是依公開標準資料補充；考試仍以講義與老師上課內容為準。</div>';
    document.body.append(footer);

    // pager
    const idx = CHAPTERS.findIndex(c => c.href === here);
    const main = document.querySelector('main');
    if (main && idx > 0) {
      const prev = CHAPTERS[idx - 1], next = CHAPTERS[idx + 1];
      const p = document.createElement('nav');
      p.className = 'pager';
      p.innerHTML = (prev ? `<a href="${prev.href}"><small>← 上一章</small>${prev.label}</a>` : '<span></span>') +
        (next ? `<a class="next" href="${next.href}"><small>下一章 →</small>${next.label}</a>` : '');
      main.append(p);
    }
  }

  /* ---------- TOC ---------- */
  function buildToc() {
    const toc = document.querySelector('.toc');
    if (!toc) return;
    const hs = [...document.querySelectorAll('main h2[id]')];
    toc.innerHTML = '<div class="label">本頁目錄</div>' + hs.map(h => `<a href="#${h.id}">${[...h.childNodes].filter(n => !n.classList || !n.classList.contains('en')).map(n => n.textContent).join('')}</a>`).join('');
    const links = [...toc.querySelectorAll('a')];
    let ticking = false;
    function update() {
      ticking = false;
      let cur = hs[0];
      for (const h of hs) { if (h.getBoundingClientRect().top < 120) cur = h; else break; }
      links.forEach(l => l.classList.toggle('active', cur && l.getAttribute('href') === '#' + cur.id));
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- SVG helper ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const STYLE_KEYS = new Set(['fill', 'stroke', 'opacity']);
  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === undefined || v === null) continue;
        if (k === 'text') e.textContent = v;
        else if (k === 'cls') e.setAttribute('class', v);
        else if (STYLE_KEYS.has(k)) e.style[k] = v;
        else e.setAttribute(k, v);
      }
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function svgRoot(host, w, h, label) {
    const svg = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label || '' });
    host.appendChild(svg);
    return svg;
  }
  // arrow marker defs (per svg)
  function arrowDefs(svg) {
    const defs = S('defs', null, svg);
    ['fg', 'accent', 'orange', 'green', 'red', 'purple', 'muted'].forEach(c => {
      const m = S('marker', { id: `ar-${c}-${svg.__id || (svg.__id = Math.random().toString(36).slice(2, 7))}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      S('path', { d: 'M0,0 L10,5 L0,10 z', fill: `var(--${c})` }, m);
    });
    return c => `url(#ar-${c}-${svg.__id})`;
  }

  /* ---------- Timeline player ---------- */
  // host: .figure 元素；opts: {duration(秒), render(t), format(t)}
  function Timeline(fig, opts) {
    const duration = opts.duration;
    let t = 0, playing = false, last = 0, speed = 1, raf = 0;
    const bar = document.createElement('div');
    bar.className = 'controls';
    bar.innerHTML =
      '<button class="btn primary" data-act="play" type="button">▶ 播放</button>' +
      '<button class="btn" data-act="reset" type="button">↺ 重來</button>' +
      '<input type="range" min="0" max="1000" value="0" aria-label="時間軸">' +
      '<select aria-label="速度"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>' +
      '<span class="time"></span>';
    (opts.controlsAfter || fig.querySelector('.fig-body') || fig).after(bar);
    const playBtn = bar.querySelector('[data-act="play"]');
    const range = bar.querySelector('input');
    const timeEl = bar.querySelector('.time');
    const sel = bar.querySelector('select');
    function draw() {
      opts.render(t);
      range.value = Math.round(t / duration * 1000);
      timeEl.textContent = opts.format ? opts.format(t) : '';
    }
    function frame(now) {
      if (!playing) return;
      // rAF 的時間戳記可能早於 play() 時的 performance.now()，dt 會是負的
      const dt = Math.max(0, (now - last) / 1000); last = Math.max(last, now);
      t = Math.min(duration, t + dt * speed);
      draw();
      if (t >= duration) { pause(); return; }
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (t >= duration) t = 0;
      playing = true; last = performance.now();
      playBtn.textContent = '❚❚ 暫停';
      raf = requestAnimationFrame(frame);
    }
    function pause() { playing = false; cancelAnimationFrame(raf); playBtn.textContent = '▶ 播放'; }
    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    bar.querySelector('[data-act="reset"]').addEventListener('click', () => { pause(); t = 0; draw(); });
    range.addEventListener('input', () => { pause(); t = range.value / 1000 * duration; draw(); });
    sel.addEventListener('change', () => { speed = +sel.value; });
    draw();
    return { set(v) { t = v; draw(); }, redraw: draw, play, pause, get t() { return t; } };
  }

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  // 0..1 progress of t within [a,b]
  const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mermaid ---------- */
  let mermaidMod = null, mCounter = 0;
  async function renderMermaid() {
    const hosts = [...document.querySelectorAll('.mermaid-host')];
    if (!hosts.length) return;
    try {
      if (!mermaidMod) {
        mermaidMod = (await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')).default;
      }
      const dark = isDark();
      mermaidMod.initialize({
        startOnLoad: false, securityLevel: 'loose', theme: dark ? 'dark' : 'default',
        fontFamily: getComputedStyle(document.body).fontFamily,
        themeVariables: dark ? { background: '#1d2024', primaryColor: '#25292e', lineColor: '#9aa1aa' } : { primaryColor: '#eef3fe', lineColor: '#5f656d' },
        flowchart: { htmlLabels: true, curve: 'basis' },
      });
      for (const h of hosts) {
        if (!h.dataset.src) h.dataset.src = h.textContent.trim();
        const { svg } = await mermaidMod.render('mmd' + (++mCounter), h.dataset.src);
        h.innerHTML = svg;
      }
    } catch (e) {
      hosts.forEach(h => { if (!h.querySelector('svg')) h.innerHTML = '<pre>' + (h.dataset.src || h.textContent) + '</pre>'; });
      console.warn('mermaid render failed', e);
    }
  }

  window.WL = { S, clear, svgRoot, arrowDefs, Timeline, clamp, lerp, prog, reducedMotion, isDark };

  document.addEventListener('DOMContentLoaded', () => {
    buildChrome();
    buildToc();
    renderMermaid();
  });
  document.addEventListener('themechange', renderMermaid);
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!root.getAttribute('data-theme')) document.dispatchEvent(new CustomEvent('themechange'));
    });
  }
})();
