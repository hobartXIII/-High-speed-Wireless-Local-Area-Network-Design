/* 第 1 章：CSMA/CD 網路、2a 動畫、BEBA 模擬器、訊框計算器、位址、5 區段、Manchester */
(function () {
  const { S, clear, svgRoot, arrowDefs, Timeline, lerp, prog, reducedMotion } = WL;

  function station(g, x, y, label, color) {
    S('rect', { x: x - 22, y: y - 15, width: 44, height: 30, rx: 5, fill: 'var(--surface)', stroke: `var(--${color || 'accent'})`, 'stroke-width': 2 }, g);
    S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: label }, g);
  }
  function terminator(g, x, y) {
    S('rect', { x: x - 5, y: y - 10, width: 10, height: 20, rx: 2, fill: 'var(--fg)' }, g);
  }

  /* ---------- 1. 典型網路 ---------- */
  (function net() {
    const svg = svgRoot(document.getElementById('fig-net'), 720, 250, '典型 CSMA/CD 網路');
    const y = 125;
    S('line', { x1: 40, y1: y, x2: 680, y2: y, stroke: 'var(--fg)', 'stroke-width': 5 }, svg);
    terminator(svg, 40, y); terminator(svg, 680, y);
    const st = [['A', 120, -1], ['B', 220, 1], ['C', 320, -1], ['D', 420, 1], ['E', 520, -1], ['F', 610, 1]];
    st.forEach(([n, x, d]) => {
      const sy = y + d * 78;
      S('line', { x1: x, y1: y, x2: x, y2: sy - d * 15, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
      S('rect', { x: x - 8, y: y - 8, width: 16, height: 16, rx: 3, fill: 'var(--orange)' }, svg);
      station(svg, x, sy, n);
    });
    S('text', { x: 40, y: y - 20, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '終端器' }, svg);
    S('text', { x: 680, y: y - 20, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '終端器' }, svg);
    // legend
    S('rect', { x: 552, y: 8, width: 12, height: 12, rx: 2, fill: 'var(--orange)' }, svg);
    S('text', { x: 570, y: 19, 'font-size': 12, text: '收發器（MAU）' }, svg);
    S('line', { x1: 552, y1: 34, x2: 566, y2: 34, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
    S('text', { x: 570, y: 38, 'font-size': 12, text: '收發器電纜（AUI）≤ 50 m' }, svg);
    S('path', { d: `M40 ${y + 100} L40 ${y + 110} L680 ${y + 110} L680 ${y + 100}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }, svg);
    S('text', { x: 360, y: y + 106, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: 'var(--accent)', text: '同軸電纜區段 ≤ 500 m，每區段最多 100 個收發器' }, svg);
  })();

  /* ---------- 2. 2a 動畫 ---------- */
  (function window2a() {
    const fig = document.getElementById('fig-2a-wrap');
    const host = document.getElementById('fig-2a');
    const msg = document.getElementById('win-msg');
    const svg = svgRoot(host, 720, 430, '碰撞偵測視窗 2a 的動畫');
    const XA = 130, XB = 610, a = 0.5, eps = 0.06, jam = 0.04, TMAX = 1.55;
    const v = (XB - XA) / a;
    const Ty = t => 120 + t / TMAX * 290;
    let frameLen = 1;

    // bus
    const busY = 52;
    S('line', { x1: XA - 30, y1: busY, x2: XB + 30, y2: busY, stroke: 'var(--border)', 'stroke-width': 16, 'stroke-linecap': 'round' }, svg);
    const dynBus = S('g', null, svg);
    station(svg, XA, busY - 32, 'A'); station(svg, XB, busY - 32, 'B', 'orange');
    S('line', { x1: XA, y1: busY - 17, x2: XA, y2: busY - 8, stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
    S('line', { x1: XB, y1: busY - 17, x2: XB, y2: busY - 8, stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
    // space-time axes
    S('line', { x1: XA, y1: Ty(0) - 8, x2: XA, y2: Ty(TMAX), stroke: 'var(--muted)', 'stroke-width': 1.5 }, svg);
    S('line', { x1: XB, y1: Ty(0) - 8, x2: XB, y2: Ty(TMAX), stroke: 'var(--muted)', 'stroke-width': 1.5 }, svg);
    S('text', { x: XA - 10, y: Ty(0) - 12, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: '時間 ↓' }, svg);
    S('text', { x: 360, y: Ty(0) - 12, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: '← 位置 →' }, svg);
    const stat = S('g', null, svg);
    const clipId = 'clip2a';
    const defs = S('defs', null, svg);
    const cp = S('clipPath', { id: clipId }, defs);
    const clipRect = S('rect', { x: 0, y: 0, width: 720, height: 0 }, cp);
    const reveal = S('g', { 'clip-path': `url(#${clipId})` }, svg);
    const cursor = S('line', { x1: XA - 40, x2: XB + 40, stroke: 'var(--red)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, svg);
    const cursorLbl = S('text', { x: XB + 44, 'font-size': 11, fill: 'var(--red)', cls: 't-mono' }, svg);

    let ev;
    function build() {
      clear(stat); clear(reveal);
      const tbStart = a - eps, tbDetect = a, tbStop = a + jam;
      const taDetect = 2 * a - eps;
      const aDetects = frameLen >= taDetect; // A 還在傳才偵測得到
      const taStop = aDetects ? taDetect + jam : frameLen;
      ev = { tbStart, tbDetect, tbStop, taDetect, taStop, aDetects };
      // A region
      S('polygon', { points: `${XA},${Ty(0)} ${XB},${Ty(a)} ${XB},${Ty(a + taStop)} ${XA},${Ty(taStop)}`, fill: 'var(--accent)', opacity: 0.22 }, reveal);
      S('line', { x1: XA, y1: Ty(0), x2: XB, y2: Ty(a), stroke: 'var(--accent)', 'stroke-width': 2.5 }, reveal);
      // B region
      S('polygon', { points: `${XB},${Ty(tbStart)} ${XA},${Ty(tbStart + a)} ${XA},${Ty(tbStop + a)} ${XB},${Ty(tbStop)}`, fill: 'var(--orange)', opacity: 0.35 }, reveal);
      S('line', { x1: XB, y1: Ty(tbStart), x2: XA, y2: Ty(tbStart + a), stroke: 'var(--orange)', 'stroke-width': 2.5 }, reveal);
      const events = [
        [0, XA, 't₀：A 開始傳送', 'accent', 'start'],
        [tbStart, XB, 't₀+a−ε：B 開始傳送', 'orange', 'end', -8],
        [tbDetect, XB, 't₀+a：B 偵測到碰撞', 'red', 'end', 12],
      ];
      if (aDetects) events.push([taDetect, XA, 't₀+2a−ε：A 偵測到碰撞', 'red', 'start']);
      else events.push([frameLen, XA, 'A 已送完，沒聽到碰撞！', 'red', 'start']);
      events.forEach(([t, x, label, c, anchor, dy = 0]) => {
        S('circle', { cx: x, cy: Ty(t), r: 5, fill: `var(--${c})` }, reveal);
        S('text', { x: x + (anchor === 'end' ? -10 : 10), y: Ty(t) + 4 + dy, 'text-anchor': anchor, 'font-size': 12, 'font-weight': 600, text: label, fill: `var(--${c})` }, reveal);
      });
      // 2a bracket
      if (aDetects) {
        const bx = XA - 14;
        S('path', { d: `M${bx + 6} ${Ty(0)} L${bx} ${Ty(0)} L${bx} ${Ty(taDetect)} L${bx + 6} ${Ty(taDetect)}`, fill: 'none', stroke: 'var(--purple)', 'stroke-width': 1.5 }, reveal);
        S('text', { x: bx - 6, y: (Ty(0) + Ty(taDetect)) / 2, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 700, fill: 'var(--purple)', text: '≈ 2a' }, reveal);
      }
      // frame end marker
      S('line', { x1: XA - 30, y1: Ty(frameLen), x2: XA, y2: Ty(frameLen), stroke: 'var(--muted)', 'stroke-dasharray': '2 2' }, stat);
      S('text', { x: XA - 34, y: Ty(frameLen) + 16, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: `訊框送完 t=${frameLen}` }, stat);
    }

    function band(from, to, y, h, c, op) {
      const x1 = Math.max(XA - 20, Math.min(from, to)), x2 = Math.min(XB + 20, Math.max(from, to));
      if (x2 - x1 > 0.5) S('rect', { x: x1, y, width: x2 - x1, height: h, fill: `var(--${c})`, opacity: op }, dynBus);
    }
    function render(t) {
      clipRect.setAttribute('height', Ty(t));
      cursor.setAttribute('y1', Ty(t)); cursor.setAttribute('y2', Ty(t));
      cursorLbl.setAttribute('y', Ty(t) + 4); cursorLbl.textContent = 't = ' + t.toFixed(2);
      clear(dynBus);
      // A: emitted during [0, taStop]
      let aF = null, aT = null, bF = null, bT = null;
      if (t > 0) { aF = Math.min(XB + 20, XA + v * t); aT = t > ev.taStop ? XA + v * (t - ev.taStop) : XA; if (aT < aF) band(aT, aF, busY - 8, 16, 'accent', 0.75); else aF = null; }
      if (t > ev.tbStart) { bF = Math.max(XA - 20, XB - v * (t - ev.tbStart)); bT = t > ev.tbStop ? XB - v * (t - ev.tbStop) : XB; if (bF < bT) band(bF, bT, busY - 8, 16, 'orange', 0.75); else bF = null; }
      if (aF !== null && bF !== null) {
        const lo = Math.max(aT, bF), hi = Math.min(aF, bT);
        if (hi > lo) { band(lo, hi, busY - 8, 16, 'purple', 1); S('text', { x: (lo + hi) / 2, y: busY + 26, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--purple)', text: '碰撞' }, dynBus); }
      }
      let m;
      if (t < 0.02) m = 'A 聽到通道空閒，開始傳送。';
      else if (t < ev.tbStart) m = 'A 的訊號正沿著匯流排傳向 B（需要時間 a）。';
      else if (t < ev.tbDetect) m = 'B 還沒聽到 A 的訊號，以為通道空閒，也開始傳送。';
      else if (t < ev.tbStop) m = 'A 的訊號抵達 B：B 立刻偵測到碰撞，送出 32 bits jam。';
      else if (ev.aDetects && t < ev.taDetect) m = '碰撞後的訊號正傳回 A…A 這時還不知道出事了。';
      else if (ev.aDetects) m = 'A 在 t₀+2a−ε 才偵測到碰撞，送 jam 後進入 BEBA 退避。結論：訊框傳輸時間至少要 2a。';
      else if (t < frameLen) m = '碰撞後的訊號正傳回 A…';
      else m = '訊框太短（< 2a）：A 在碰撞訊號回來之前就送完了，以為傳送成功，碰撞沒被偵測到！';
      msg.textContent = m;
      msg.className = 'status ' + (t >= ev.tbDetect ? 'bad' : 'info');
    }
    build();
    const tl = Timeline(fig, { duration: TMAX, render, format: t => `t = ${t.toFixed(2)}（訊框時間）` });
    // 調慢：實際 9 秒播完
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = '<button type="button" class="on" data-v="1">訊框 = 1（≥ 2a）</button><button type="button" data-v="0.6">訊框 = 0.6（< 2a）</button>';
    fig.querySelector('.controls').append(seg);
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      frameLen = +b.dataset.v; build(); tl.redraw();
    });
    fig.querySelector('.controls select').innerHTML = '<option value="0.1">慢</option><option value="0.17" selected>正常</option><option value="0.35">快</option>';
    fig.querySelector('.controls select').dispatchEvent(new Event('change'));
  })();

  /* ---------- 3. BEBA 模擬器 ---------- */
  (function beba() {
    const svg = svgRoot(document.getElementById('fig-beba'), 720, 200, 'BEBA 每個站台的退避範圍');
    const msg = document.getElementById('beba-msg');
    const log = document.getElementById('beba-log');
    const cBox = document.getElementById('beba-c');
    const btnStep = document.getElementById('beba-step');
    let st;
    const rnd = k => Math.floor(Math.random() * 2 ** k);
    function reset() {
      st = { n: 0, nC: 0, done: false, picks: null };
      log.textContent = '';
      msg.className = 'status';
      msg.textContent = '按「碰撞一次」讓 A、B 各自抽一個 r；抽到一樣就會再撞。';
      btnStep.disabled = false;
      draw();
    }
    function draw() {
      clear(svg);
      const rows = [{ id: 'A', n: st.n, c: 'accent' }, { id: 'B', n: st.n, c: 'orange' }];
      if (cBox.checked) rows.push({ id: 'C', n: st.nC, c: 'green' });
      const maxR = Math.max(2, ...rows.map(r => 2 ** Math.min(Math.max(r.n, 1), 10)));
      const x0 = 70, x1 = 690, w = x1 - x0;
      rows.forEach((r, i) => {
        const y = 24 + i * 56;
        S('text', { x: 20, y: y + 18, 'font-size': 15, 'font-weight': 700, text: r.id, fill: `var(--${r.c})` }, svg);
        if (r.n === 0) {
          S('text', { x: x0, y: y + 18, 'font-size': 12, cls: 't-muted', text: r.id === 'C' ? '尚未加入（A、B 第 3 次碰撞時才出現）' : '尚未碰撞' }, svg);
          return;
        }
        const k = Math.min(r.n, 10), size = 2 ** k;
        const bw = w * size / maxR;
        S('rect', { x: x0, y: y + 4, width: Math.max(bw, 3), height: 20, rx: 4, fill: `var(--${r.c}-soft)`, stroke: `var(--${r.c})` }, svg);
        if (size <= 64 && bw / size > 6) for (let s = 1; s < size; s++) S('line', { x1: x0 + bw * s / size, y1: y + 4, x2: x0 + bw * s / size, y2: y + 24, stroke: `var(--${r.c})`, opacity: 0.35 }, svg);
        S('text', { x: x0, y: y + 42, 'font-size': 11, cls: 't-muted', text: `n=${r.n}  k=${k}  r ∈ 0 … ${size - 1}` }, svg);
        const pick = st.picks && st.picks[r.id];
        if (pick !== undefined) {
          const px = x0 + bw * (pick + 0.5) / size;
          S('path', { d: `M${px} ${y + 2} l-6 -9 h12 z`, fill: `var(--${r.c})` }, svg);
          S('text', { x: Math.min(px + 8, x1 - 40), y: y - 2, 'font-size': 12, 'font-weight': 700, text: `r=${pick}`, fill: `var(--${r.c})` }, svg);
        }
      });
    }
    function step(quiet) {
      if (st.done) return;
      st.n++;
      if (cBox.checked) { if (st.nC > 0) st.nC++; else if (st.n >= 3) st.nC = 1; }
      if (st.n > 16) {
        st.done = true; st.picks = null; btnStep.disabled = true;
        msg.className = 'status bad'; msg.textContent = '第 16 次之後仍失敗：放棄，回報上層「傳送失敗」。';
        log.textContent += `n=${st.n}：超過 16 次，放棄\n`; draw(); return;
      }
      const picks = { A: rnd(Math.min(st.n, 10)), B: rnd(Math.min(st.n, 10)) };
      if (st.nC > 0) picks.C = rnd(Math.min(st.nC, 10));
      st.picks = picks;
      const min = Math.min(...Object.values(picks));
      const who = Object.keys(picks).filter(k => picks[k] === min);
      const line = Object.keys(picks).map(k => `${k}: r=${picks[k]}`).join('  ');
      if (who.length === 1) {
        st.done = true; btnStep.disabled = true;
        msg.className = 'status ok';
        msg.textContent = `${who[0]} 抽到最小的 r=${min}，等 ${(min * 51.2).toFixed(1)} μs 後先傳，成功！` + (who[0] === 'C' && st.n >= 3 ? '（C 才撞 ' + st.nC + ' 次就贏過撞了 ' + st.n + ' 次的 A、B：這就是 LIFO 效應）' : '');
        log.textContent += `第 ${st.n} 次碰撞後  ${line}  → ${who[0]} 成功\n`;
      } else {
        msg.className = 'status bad';
        msg.textContent = `${who.join('、')} 都抽到 r=${min}，又撞了。碰撞次數 n 加 1，範圍加倍。`;
        log.textContent += `第 ${st.n} 次碰撞後  ${line}  → 再撞\n`;
      }
      log.scrollTop = log.scrollHeight;
      if (!quiet) draw();
    }
    document.getElementById('beba-step').addEventListener('click', () => step());
    document.getElementById('beba-run').addEventListener('click', () => { if (st.done) reset(); while (!st.done) step(true); draw(); });
    document.getElementById('beba-reset').addEventListener('click', reset);
    cBox.addEventListener('change', reset);
    reset();
  })();

  /* ---------- 4. 訊框格式 ---------- */
  (function frame() {
    const svg = svgRoot(document.getElementById('fig-frame'), 720, 140, '802.3 訊框格式');
    const info = document.getElementById('frame-info');
    const calc = document.getElementById('frame-calc');
    const inLen = document.getElementById('llc-len');
    const inAddr = document.getElementById('addr-len');
    const F = [
      { k: 'Preamble', w: 82, b: '7', c: 'muted', d: '10101010… 共 7 bytes，讓接收端同步時脈。不算在 MAC frame size 內。' },
      { k: 'SFD', w: 52, b: '1', c: 'muted', d: 'Start Frame Delimiter：10101011，最後的 11 表示訊框內容從下一個 bit 開始。' },
      { k: 'DA', w: 62, b: '2/6', c: 'accent', d: '目的位址（Destination Address），2 或 6 bytes；第 1 個 bit 是 I/G。' },
      { k: 'SA', w: 62, b: '2/6', c: 'accent', d: '來源位址（Source Address），2 或 6 bytes。' },
      { k: 'LEN', w: 56, b: '2', c: 'accent', d: 'LLC 訊框長度。補充：Ethernet II 這裡放的是 Type。' },
      { k: 'LLC Data', w: 180, b: '≤1500', c: 'green', d: '上層（LLC）資料，最多 1500 bytes。' },
      { k: 'PAD', w: 76, b: '0–46', c: 'orange', d: 'LLC 資料不足 46 bytes 時補齊，讓 MAC frame 至少 64 bytes。' },
      { k: 'FCS', w: 64, b: '4', c: 'accent', d: 'Frame Check Sequence：CRC-32，涵蓋 DA 到 PAD。' },
    ];
    const x0 = 34, y = 46, h = 40;
    let x = x0;
    const groups = [];
    F.forEach(f => {
      const g = S('g', { cls: 'hit', tabindex: 0, role: 'button', 'aria-label': f.k }, svg);
      S('rect', { x, y, width: f.w - 2, height: h, rx: 4, fill: f.c === 'muted' ? 'var(--surface-2)' : `var(--${f.c}-soft)`, stroke: f.c === 'muted' ? 'var(--border)' : `var(--${f.c})` }, g);
      S('text', { x: x + f.w / 2 - 1, y: y + 25, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: f.k }, g);
      f.lbl = S('text', { x: x + f.w / 2 - 1, y: y + h + 18, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted t-mono', text: f.b }, g);
      f.x = x;
      const sel = () => { groups.forEach(q => q.classList.remove('sel')); g.classList.add('sel'); info.innerHTML = `<b>${f.k}</b>（${f.b} bytes）：${f.d}`; };
      g.addEventListener('click', sel);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } });
      groups.push(g);
      x += f.w;
    });
    const mx1 = F[2].x, mx2 = x - 2;
    S('path', { d: `M${mx1} ${y - 6} L${mx1} ${y - 14} L${mx2} ${y - 14} L${mx2} ${y - 6}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }, svg);
    S('text', { x: (mx1 + mx2) / 2, y: y - 20, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--accent)', text: 'MAC frame size：最小 64、最大 1518 bytes' }, svg);
    S('text', { x: x0 - 6, y: y + h + 18, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: 'bytes' }, svg);

    function update() {
      let L = Math.round(+inLen.value);
      const A = +inAddr.value;
      const hdr = 2 * A + 2 + 4;
      const minData = 64 - hdr;
      if (!(L >= 0)) L = 0;
      if (L > 1500) {
        calc.textContent = `LLC 資料最多 1500 bytes（輸入 ${L}）：超過就要由上層切成多個訊框。`;
        return;
      }
      const pad = Math.max(0, minData - L);
      const mac = hdr + L + pad;
      const wire = mac + 8;
      const us = wire * 8 / 10;
      F[5].lbl.textContent = String(L);
      F[6].lbl.textContent = String(pad);
      F[2].lbl.textContent = F[3].lbl.textContent = String(A);
      calc.textContent =
        `header + FCS = ${A} + ${A} + 2 + 4 = ${hdr} bytes\n` +
        `PAD          = max(0, ${minData} − ${L}) = ${pad} bytes\n` +
        `MAC frame    = ${hdr} + ${L} + ${pad} = ${mac} bytes  ${mac === 64 ? '（剛好最小值 64）' : mac === 1518 ? '（剛好最大值 1518）' : ''}\n` +
        `線上總長     = ${mac} + 8（Preamble+SFD）= ${wire} bytes = ${wire * 8} bits\n` +
        `10 Mbps 傳輸 = ${us.toFixed(1)} μs；MAC frame 本身 ${(mac * 8 / 10).toFixed(1)} μs ${mac * 8 / 10 >= 51.2 ? '≥' : '<'} slot time 51.2 μs`;
    }
    inLen.addEventListener('input', update);
    inAddr.addEventListener('change', update);
    update();
  })();

  /* ---------- 5. 位址欄位 ---------- */
  (function addr() {
    const svg = svgRoot(document.getElementById('fig-addr'), 720, 170, '16-bit 與 48-bit 位址格式');
    const rows = [
      { y: 30, name: '16-bit', parts: [['I/G', 60, 'orange'], ['15-bit 位址', 300, 'accent']] },
      { y: 100, name: '48-bit', parts: [['I/G', 60, 'orange'], ['U/L', 60, 'purple'], ['46-bit 位址', 480, 'accent']] },
    ];
    rows.forEach(r => {
      S('text', { x: 14, y: r.y + 24, 'font-size': 14, 'font-weight': 700, text: r.name }, svg);
      let x = 80;
      r.parts.forEach(([t, w, c]) => {
        S('rect', { x, y: r.y, width: w - 3, height: 36, rx: 4, fill: `var(--${c}-soft)`, stroke: `var(--${c})` }, svg);
        S('text', { x: x + w / 2, y: r.y + 23, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, text: t }, svg);
        x += w;
      });
    });
    S('text', { x: 80, y: 160, 'font-size': 12, cls: 't-muted', text: 'I/G：0 個別、1 群體　｜　U/L：0 全球統一管理、1 區域自行管理' }, svg);
  })();

  /* ---------- 6. 五個區段 ---------- */
  (function twoSeg() {
    const host = document.getElementById('fig-2seg');
    if (!host) return;
    const svg = svgRoot(host, 720, 300, '10BASE5 兩個區段');
    const y1 = 80, y2 = 220, xr = 360;
    [[y1, '第一段同軸電纜（≤ 500 m）', [['A', 110, -1], ['B', 200, -1], ['C', 470, -1], ['D', 580, -1]]],
     [y2, '第二段同軸電纜（≤ 500 m）', [['E', 110, 1], ['F', 200, 1], ['G', 470, 1], ['H', 560, 1], ['I', 640, 1]]]]
      .forEach(([y, label, st]) => {
        S('line', { x1: 40, y1: y, x2: 680, y2: y, stroke: 'var(--fg)', 'stroke-width': 5 }, svg);
        terminator(svg, 40, y); terminator(svg, 680, y);
        st.forEach(([n, x, d]) => {
          const sy = y + d * 48;
          S('line', { x1: x, y1: y, x2: x, y2: sy - d * 15, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
          S('rect', { x: x - 7, y: y - 7, width: 14, height: 14, rx: 3, fill: 'var(--orange)' }, svg);
          station(svg, x, sy, n);
        });
        S('text', { x: 200, y: y + (y === y1 ? 24 : -14), 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: label }, svg);
      });
    // repeater between the two segments, attached by transceiver cables
    [y1, y2].forEach(y => {
      S('line', { x1: xr, y1: y, x2: xr, y2: (y1 + y2) / 2 + (y === y1 ? -16 : 16), stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
      S('rect', { x: xr - 7, y: y - 7, width: 14, height: 14, rx: 3, fill: 'var(--orange)' }, svg);
    });
    S('rect', { x: xr - 46, y: (y1 + y2) / 2 - 16, width: 92, height: 32, rx: 6, fill: 'var(--orange-soft)', stroke: 'var(--orange)', 'stroke-width': 2 }, svg);
    S('text', { x: xr, y: (y1 + y2) / 2 + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: '訊號增益器' }, svg);
    S('text', { x: xr + 56, y: (y1 + y2) / 2 + 5, 'font-size': 12, cls: 't-muted', text: '經收發器電纜（≤ 50 m）接到兩段電纜' }, svg);
    S('rect', { x: 40, y: 284, width: 12, height: 12, rx: 2, fill: 'var(--orange)' }, svg);
    S('text', { x: 58, y: 294, 'font-size': 12, text: '收發器（MAU）　虛線＝收發器電纜（AUI）' }, svg);
  })();

  (function fiveSeg() {
    const svg = svgRoot(document.getElementById('fig-5seg'), 720, 400, '10BASE5 最大配置');
    function seg(x1, x2, y, label, stations) {
      S('line', { x1, y1: y, x2, y2: y, stroke: 'var(--fg)', 'stroke-width': 4 }, svg);
      terminator(svg, x1, y); terminator(svg, x2, y);
      S('text', { x: (x1 + x2) / 2, y: y + 30, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, text: label }, svg);
      for (let i = 0; i < stations; i++) {
        const x = x1 + (x2 - x1) * (i + 1) / (stations + 1);
        S('line', { x1: x, y1: y, x2: x, y2: y - 22, stroke: 'var(--muted)', 'stroke-dasharray': '3 2', 'stroke-width': 1.5 }, svg);
        S('circle', { cx: x, cy: y - 28, r: 6, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
      }
    }
    // 訊號增益器：橘色方框「R」；半訊號增益器：紫色切角框「½R」
    function rep(x, y, label, half, side) {
      if (half) {
        S('path', { d: `M${x - 18} ${y - 13} L${x + 12} ${y - 13} L${x + 18} ${y - 7} L${x + 18} ${y + 13} L${x - 12} ${y + 13} L${x - 18} ${y + 7} Z`, fill: 'var(--purple-soft)', stroke: 'var(--purple)', 'stroke-width': 2 }, svg);
      } else {
        S('rect', { x: x - 18, y: y - 13, width: 36, height: 26, rx: 5, fill: 'var(--orange-soft)', stroke: 'var(--orange)', 'stroke-width': 2 }, svg);
      }
      S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: half ? '½R' : 'R' }, svg);
      if (!label) return;
      if (side === 'below') S('text', { x, y: y + 28, 'text-anchor': 'middle', 'font-size': 11, fill: half ? 'var(--purple)' : 'var(--muted)', text: label }, svg);
      else if (side === 'right') S('text', { x: x + 26, y: y + 4, 'font-size': 11, fill: half ? 'var(--purple)' : 'var(--muted)', text: label }, svg);
      else S('text', { x, y: y - 20, 'text-anchor': 'middle', 'font-size': 11, fill: half ? 'var(--purple)' : 'var(--muted)', text: label }, svg);
    }
    const y1 = 70;
    seg(20, 210, y1, '區段 1（≤ 500 m）', 3);
    S('line', { x1: 200, y1: y1, x2: 222, y2: y1, stroke: 'var(--muted)', 'stroke-dasharray': '3 2' }, svg);
    rep(240, y1, '訊號增益器');
    seg(262, 460, y1, '區段 2', 3);
    rep(482, y1, '訊號增益器');
    seg(504, 700, y1, '區段 3', 3);
    // half repeater link
    const yh = 160;
    S('line', { x1: 640, y1: y1, x2: 640, y2: yh - 13, stroke: 'var(--muted)', 'stroke-dasharray': '3 2', 'stroke-width': 1.5 }, svg);
    rep(640, yh, '半訊號增益器', true, 'below');
    S('path', { d: `M622 ${yh} L60 ${yh} L60 ${yh + 70}`, fill: 'none', stroke: 'var(--purple)', 'stroke-width': 4, 'stroke-dasharray': '10 5' }, svg);
    S('text', { x: 380, y: yh - 10, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: 'var(--purple)', text: '區段 4：半訊號增益器間電纜（最長 1000 m，不接工作站）' }, svg);
    rep(60, yh + 83, '半訊號增益器', true, 'right');
    const y5 = 290;
    S('line', { x1: 60, y1: yh + 96, x2: 60, y2: y5, stroke: 'var(--muted)', 'stroke-dasharray': '3 2', 'stroke-width': 1.5 }, svg);
    seg(30, 450, y5, '區段 5', 4);
    // 圖例：兩種增益器分開標示
    const ly = 352;
    S('line', { x1: 20, y1: ly - 22, x2: 700, y2: ly - 22, stroke: 'var(--border)' }, svg);
    rep(42, ly, '', false);
    S('text', { x: 68, y: ly - 2, 'font-size': 12, 'font-weight': 700, text: 'R：訊號增益器（repeater）' }, svg);
    S('text', { x: 68, y: ly + 14, 'font-size': 11, cls: 't-muted', text: '直接把兩段同軸電纜接起來' }, svg);
    rep(382, ly, '', true);
    S('text', { x: 408, y: ly - 2, 'font-size': 12, 'font-weight': 700, fill: 'var(--purple)', text: '½R：半訊號增益器（half repeater）' }, svg);
    S('text', { x: 408, y: ly + 14, 'font-size': 11, cls: 't-muted', text: '成對使用，兩個之間以 ≤ 1000 m 電纜相連' }, svg);
    S('text', { x: 700, y: ly + 40, 'text-anchor': 'end', 'font-size': 12, cls: 't-muted', text: 'Slot Time = 51.2 μs' }, svg);
  })();

  /* ---------- 7. Manchester ---------- */
  (function manchester() {
    const svg = svgRoot(document.getElementById('fig-man'), 720, 230, 'Manchester 編碼波形');
    const input = document.getElementById('man-bits');
    const segBtns = document.getElementById('man-std');
    let std = 'ieee';
    function draw() {
      clear(svg);
      const bits = (input.value.replace(/[^01]/g, '') || '0').slice(0, 16).split('').map(Number);
      const n = bits.length, x0 = 50, W = 650, bw = W / n, hi = 70, lo = 150;
      S('text', { x: 10, y: hi + 4, 'font-size': 12, cls: 't-muted', text: '高' }, svg);
      S('text', { x: 10, y: lo + 4, 'font-size': 12, cls: 't-muted', text: '低' }, svg);
      const pts = [];
      bits.forEach((b, i) => {
        const x = x0 + i * bw;
        S('line', { x1: x, y1: 32, x2: x, y2: 180, stroke: 'var(--border)' }, svg);
        S('line', { x1: x + bw / 2, y1: 50, x2: x + bw / 2, y2: 170, stroke: 'var(--border)', 'stroke-dasharray': '2 3' }, svg);
        S('text', { x: x + bw / 2, y: 26, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, text: b, cls: 't-mono' }, svg);
        // IEEE: 1 = 低→高；Thomas: 1 = 高→低
        const lowFirst = std === 'ieee' ? b === 1 : b === 0;
        const first = lowFirst ? lo : hi, second = lowFirst ? hi : lo;
        if (i > 0) {
          const prevY = pts[pts.length - 1][1];
          if (prevY !== first) {
            pts.push([x, first]);
            S('line', { x1: x, y1: hi, x2: x, y2: lo, stroke: 'var(--muted)', 'stroke-width': 6, opacity: 0.25 }, svg);
          }
        } else pts.push([x, first]);
        pts.push([x + bw / 2, first], [x + bw / 2, second], [x + bw, second]);
        const up = second < first;
        S('text', { x: x + bw / 2, y: 200, 'text-anchor': 'middle', 'font-size': 18, fill: up ? 'var(--green)' : 'var(--red)', text: up ? '↑' : '↓' }, svg);
      });
      S('line', { x1: x0 + W, y1: 32, x2: x0 + W, y2: 180, stroke: 'var(--border)' }, svg);
      const path = S('path', { d: 'M' + pts.map(p => p.join(' ')).join(' L'), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3, 'stroke-linejoin': 'round', pathLength: 1 }, svg);
      if (!reducedMotion()) {
        path.style.strokeDasharray = '1';
        path.style.strokeDashoffset = '1';
        path.getBoundingClientRect();
        path.style.transition = 'stroke-dashoffset 1.6s ease-in-out';
        requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
      }
      S('text', { x: x0, y: 224, 'font-size': 12, cls: 't-muted', text: std === 'ieee' ? 'IEEE 802.3：中間 ↑（低→高）= 1，↓（高→低）= 0。灰色粗線是位元邊界的額外跳變，不代表資料。' : 'G.E. Thomas：中間 ↓（高→低）= 1，↑（低→高）= 0。灰色粗線是位元邊界的額外跳變。' }, svg);
    }
    input.addEventListener('input', draw);
    segBtns.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      std = b.dataset.v;
      segBtns.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      draw();
    });
    draw();
  })();
})();
