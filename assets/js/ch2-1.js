/* 第 2-1 章：Hidden/Exposed node、OFDMA、PDU 動畫、三種配置、速率與距離、OFDM、頻段、DSSS、Barker、dB、頻道、PLCP、調變、DPSK、天線場型 */
(function () {
  const { S, clear, svgRoot, arrowDefs, Timeline, lerp, prog } = WL;

  function sta(g, x, y, label, color, r) {
    S('circle', { cx: x, cy: y, r: r || 20, fill: 'var(--surface)', stroke: `var(--${color || 'accent'})`, 'stroke-width': 3 }, g);
    S('text', { x, y: y + 6, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, text: label }, g);
  }
  function apIcon(g, x, y, label) {
    S('rect', { x: x - 20, y: y - 11, width: 40, height: 22, rx: 5, fill: 'var(--accent)' }, g);
    S('line', { x1: x - 10, y1: y - 11, x2: x - 15, y2: y - 26, stroke: 'var(--accent)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    S('line', { x1: x + 10, y1: y - 11, x2: x + 15, y2: y - 26, stroke: 'var(--accent)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: label || 'AP', fill: '#fff' }, g);
  }
  function segButtons(el, cb) {
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      cb(b.dataset.v);
    });
  }

  /* ---------- 1. Hidden node + RTS/CTS ---------- */
  (function hidden() {
    const fig = document.getElementById('fig-hidden-wrap');
    const msg = document.getElementById('hidden-msg');
    const svg = svgRoot(document.getElementById('fig-hidden'), 720, 440, 'Hidden node 與 RTS/CTS 動畫');
    const P = { A: [170, 115], B: [360, 115], C: [550, 115] };
    const R = 205;
    const COL = { A: 'accent', B: 'orange', C: 'green' };
    const defs = S('defs', null, svg);
    const cpTop = S('clipPath', { id: 'hn-top' }, defs);
    S('rect', { x: 0, y: 0, width: 720, height: 212 }, cpTop);
    const top = S('g', { 'clip-path': 'url(#hn-top)' }, svg);
    S('circle', { cx: P.A[0], cy: P.A[1], r: R, fill: 'var(--accent)', opacity: 0.05, stroke: 'var(--accent)', 'stroke-dasharray': '6 5' }, top);
    S('circle', { cx: P.C[0], cy: P.C[1], r: R, fill: 'var(--green)', opacity: 0.05, stroke: 'var(--green)', 'stroke-dasharray': '6 5' }, top);
    S('text', { x: 20, y: 24, 'font-size': 12, fill: 'var(--accent)', text: 'A 的範圍（聽不到 C）' }, top);
    S('text', { x: 700, y: 24, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--green)', text: 'C 的範圍（聽不到 A）' }, top);
    const waves = S('g', null, top);
    Object.keys(P).forEach(k => sta(top, P[k][0], P[k][1], k, COL[k], 22));
    const bang = S('text', { x: P.B[0], y: P.B[1] - 36, 'text-anchor': 'middle', 'font-size': 26, text: '💥' }, top);
    const navTag = S('text', { x: P.C[0], y: P.C[1] + 50, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--muted)' }, top);
    S('line', { x1: 0, y1: 214, x2: 720, y2: 214, stroke: 'var(--border)' }, svg);

    // timing chart
    const X0 = 110, X1 = 700, rowY = { A: 250, B: 305, C: 360 };
    const chart = S('g', null, svg);
    const cp = S('clipPath', { id: 'hn-chart' }, defs);
    const cpRect = S('rect', { x: 0, y: 220, width: X0, height: 220 }, cp);
    const reveal = S('g', { 'clip-path': 'url(#hn-chart)' }, svg);
    const cursor = S('line', { y1: 228, y2: 400, stroke: 'var(--red)', 'stroke-dasharray': '4 3' }, svg);

    let mode = 'basic', frames, T, xs;
    const SCN = {
      basic: {
        T: 6.5,
        frames: [
          { w: 'A', s: 0.4, e: 3.4, l: 'DATA → B' },
          { w: 'C', s: 1.2, e: 4.2, l: 'DATA → B' },
        ],
        extra: g => {
          S('rect', { x: xs(1.2), y: rowY.B - 14, width: xs(3.4) - xs(1.2), height: 28, rx: 4, fill: 'var(--red-soft)', stroke: 'var(--red)' }, g);
          S('text', { x: (xs(1.2) + xs(3.4)) / 2, y: rowY.B + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--red)', text: 'B 收到兩個訊號疊在一起＝碰撞' }, g);
          S('text', { x: xs(5.2), y: rowY.A + 5, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--red)', text: '等不到 ACK' }, g);
          S('text', { x: xs(5.6), y: rowY.C + 5, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--red)', text: '等不到 ACK' }, g);
        },
        msg: t => t < 0.4 ? 'A 有資料要給 B；先聽通道：空閒。' :
          t < 1.2 ? 'A 開始傳 DATA。C 在 A 的範圍外，聽不到 A。' :
            t < 3.4 ? 'C 也有資料要給 B；C 聽通道是「空的」，於是也開始傳 → 兩個訊號在 B 疊在一起。' :
              t < 4.2 ? 'A 傳完了，但 B 收到的是壞掉的訊框，不會回 ACK。' :
                'A、C 都等不到 ACK，才知道失敗，只能退避後重傳。這就是 hidden node 問題。',
        bad: t => t >= 1.2,
      },
      rts: {
        T: 7.4,
        frames: [
          { w: 'A', s: 0.4, e: 0.9, l: 'RTS' },
          { w: 'B', s: 1.1, e: 1.6, l: 'CTS' },
          { w: 'A', s: 1.8, e: 4.8, l: 'DATA → B' },
          { w: 'B', s: 5.0, e: 5.4, l: 'ACK' },
          { w: 'C', s: 6.0, e: 6.5, l: 'RTS' },
        ],
        nav: [1.6, 5.4],
        extra: g => {
          S('rect', { x: xs(1.6), y: rowY.C - 10, width: xs(5.4) - xs(1.6), height: 20, rx: 4, fill: 'var(--surface-2)', stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, g);
          S('text', { x: (xs(1.6) + xs(5.4)) / 2, y: rowY.C + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, cls: 't-muted', text: 'NAV：依 CTS 的 Duration 不傳送' }, g);
          S('path', { d: `M${xs(2.6)} ${rowY.C - 24} l0 12`, stroke: 'var(--green)', 'stroke-width': 2 }, g);
          S('text', { x: xs(2.6), y: rowY.C - 28, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--green)', text: 'C 有資料，但先等' }, g);
        },
        msg: t => t < 0.4 ? 'A 有資料要給 B；先送一個很短的 RTS（含 Duration）。' :
          t < 1.1 ? 'RTS 只有 B 聽得到（C 在 A 的範圍外，聽不到 RTS）。' :
            t < 1.8 ? 'B 回 CTS（含 Duration）。B 在中間，A 和 C 都聽得到 CTS。' :
              t < 4.8 ? 'C 依 CTS 的 Duration 設定 NAV，這段時間不傳送（virtual carrier sense）；A 安心傳 DATA。' :
                t < 5.4 ? 'B 收到正確的 DATA，回 ACK。' :
                  t < 6.0 ? 'NAV 到期，通道空閒。' : '輪到 C 送自己的 RTS。整個過程沒有碰撞。',
        bad: () => false,
      },
    };
    function build() {
      const sc = SCN[mode];
      T = sc.T; frames = sc.frames;
      xs = t => X0 + t / T * (X1 - X0);
      clear(chart); clear(reveal);
      Object.keys(rowY).forEach(k => {
        S('text', { x: 20, y: rowY[k] + 6, 'font-size': 15, 'font-weight': 700, text: '站台 ' + k, fill: `var(--${COL[k]})` }, chart);
        S('line', { x1: X0, y1: rowY[k] + 16, x2: X1, y2: rowY[k] + 16, stroke: 'var(--border)' }, chart);
      });
      S('text', { x: X1, y: 420, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: '時間 →' }, chart);
      if (sc.extra) sc.extra(reveal);
      frames.forEach(f => {
        S('rect', { x: xs(f.s), y: rowY[f.w] - 12, width: xs(f.e) - xs(f.s), height: 24, rx: 4, fill: `var(--${COL[f.w]})`, opacity: 0.9 }, reveal);
        S('text', { x: (xs(f.s) + xs(f.e)) / 2, y: rowY[f.w] + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fff', text: f.l }, reveal);
      });
    }
    function render(t) {
      const sc = SCN[mode];
      cpRect.setAttribute('width', xs(t));
      cursor.setAttribute('x1', xs(t)); cursor.setAttribute('x2', xs(t));
      clear(waves);
      frames.forEach(f => {
        if (t >= f.s && t <= f.e + 0.3) {
          const p = prog(t, f.s, f.s + 0.45);
          const fade = t > f.e ? 1 - prog(t, f.e, f.e + 0.3) : 1;
          [0, 0.33, 0.66].forEach(off => {
            const q = ((t - f.s) / 0.9 + off) % 1;
            S('circle', { cx: P[f.w][0], cy: P[f.w][1], r: 22 + q * (R - 22) * p, fill: 'none', stroke: `var(--${COL[f.w]})`, 'stroke-width': 2.5, opacity: (1 - q) * 0.8 * fade }, waves);
          });
          S('text', { x: P[f.w][0], y: P[f.w][1] - 32, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: `var(--${COL[f.w]})`, text: f.l, opacity: fade }, waves);
        }
      });
      bang.style.opacity = mode === 'basic' && t >= 1.2 && t <= 3.6 ? 1 : 0;
      if (sc.nav && t >= sc.nav[0] && t < sc.nav[1]) navTag.textContent = `NAV 倒數 ${(sc.nav[1] - t).toFixed(1)}`;
      else navTag.textContent = '';
      msg.textContent = sc.msg(t);
      msg.className = 'status ' + (sc.bad(t) ? 'bad' : t > T - 0.9 ? 'ok' : 'info');
    }
    build();
    const tl = Timeline(fig, { duration: 7.4, render: t => render(Math.min(t, T)), format: t => `${Math.min(t, T).toFixed(1)} s` });
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = '<button type="button" class="on" data-v="basic">不用 RTS/CTS</button><button type="button" data-v="rts">使用 RTS/CTS</button>';
    fig.querySelector('.controls').prepend(seg);
    segButtons(seg, v => { mode = v; build(); tl.pause(); tl.set(0); });
  })();

  /* ---------- 2. Exposed node ---------- */
  (function exposed() {
    const svg = svgRoot(document.getElementById('fig-exposed'), 720, 220, 'Exposed node 示意');
    const ar = arrowDefs(svg);
    const P = { A: 90, B: 270, C: 450, D: 630 }, y = 110;
    S('circle', { cx: P.B, cy: y, r: 200, fill: 'var(--orange)', opacity: 0.06, stroke: 'var(--orange)', 'stroke-dasharray': '6 5' }, svg);
    S('path', { d: `M${P.B - 26} ${y - 6} L${P.A + 26} ${y - 6}`, stroke: 'var(--orange)', 'stroke-width': 3, 'marker-end': ar('orange') }, svg);
    S('text', { x: (P.A + P.B) / 2, y: y - 16, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: 'var(--orange)', text: 'B 正在傳給 A' }, svg);
    S('path', { d: `M${P.C + 26} ${y - 6} L${P.D - 26} ${y - 6}`, stroke: 'var(--muted)', 'stroke-width': 3, 'stroke-dasharray': '6 4', 'marker-end': ar('muted') }, svg);
    S('text', { x: (P.C + P.D) / 2, y: y - 16, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, cls: 't-muted', text: 'C → D 其實不會干擾 A' }, svg);
    S('text', { x: (P.C + P.D) / 2, y: y + 6, 'text-anchor': 'middle', 'font-size': 22, fill: 'var(--red)', text: '✕' }, svg);
    sta(svg, P.A, y, 'A', 'accent'); sta(svg, P.B, y, 'B', 'orange'); sta(svg, P.C, y, 'C', 'green'); sta(svg, P.D, y, 'D', 'purple');
    S('text', { x: 360, y: 200, 'text-anchor': 'middle', 'font-size': 13, text: 'C 在 B 的範圍內，聽到 B 在傳就判斷通道忙碌而不敢傳 → 頻寬白白浪費' }, svg);
  })();

  /* ---------- 3. TDMA / OFDM / OFDMA ---------- */
  (function ofdma() {
    const svg = svgRoot(document.getElementById('fig-ofdma'), 720, 262, 'TDMA、OFDM、OFDMA 比較');
    const users = ['accent', 'orange', 'green', 'purple'];
    const cols = 8, rows = 6, cw = 24, rh = 22, y0 = 32;
    // 每格填使用者編號，'.' 為沒用到的資源（空白）；列由上到下
    const tdma = [0, 1, '.', 3, 0, '.', 2, 3];
    const ofdmDemand = [6, 2, 4, 1, 5, 3, 2, 6]; // 每個時槽只給一個使用者，資料少時其餘子載波空著
    const ofdmaGrid = ['00112233', '00112233', '11223300', '11223300', '223300..', '330011..'];
    const panels = [
      { x: 20, n: 'TDMA', cell: (c, r) => (r === 0 ? tdma[c] : null), full: true },
      { x: 260, n: 'OFDM', cell: (c, r) => (rows - r <= ofdmDemand[c] ? c % 4 : '.') },
      { x: 500, n: 'OFDMA', cell: (c, r) => { const v = ofdmaGrid[r][c]; return v === '.' ? '.' : +v; } },
    ];
    const box = (x, y, h, v) => S('rect', v === '.'
      ? { x, y, width: cw - 2, height: h, rx: 2, fill: '#ffffff', stroke: 'var(--muted)', 'stroke-width': 1 }
      : { x, y, width: cw - 2, height: h, rx: 2, fill: `var(--${users[v]})`, opacity: 0.8 }, svg);
    panels.forEach(p => {
      S('text', { x: p.x + cols * cw / 2, y: 20, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: p.n }, svg);
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const v = p.cell(c, r);
        if (v === null) continue;
        box(p.x + c * cw, y0 + r * rh, p.full ? rows * rh - 2 : rh - 2, v);
      }
      S('text', { x: p.x + cols * cw / 2, y: y0 + rows * rh + 18, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: '時間 →' }, svg);
      S('text', { x: p.x - 6, y: y0 + rows * rh / 2, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: '頻率', transform: `rotate(-90 ${p.x - 6} ${y0 + rows * rh / 2})` }, svg);
    });
    // 圖例
    const ly = 200;
    const items = users.map((u, i) => [u, `使用者 ${i + 1}`]).concat([['.', '白色：沒用到的資源（空白）']]);
    let lx = 110;
    items.forEach(([u, t]) => {
      S('rect', u === '.'
        ? { x: lx, y: ly, width: 16, height: 14, rx: 2, fill: '#ffffff', stroke: 'var(--muted)', 'stroke-width': 1 }
        : { x: lx, y: ly, width: 16, height: 14, rx: 2, fill: `var(--${u})`, opacity: 0.8 }, svg);
      S('text', { x: lx + 22, y: ly + 12, 'font-size': 12, text: t }, svg);
      lx += u === '.' ? 0 : 92;
    });
    S('text', { x: 360, y: 248, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: 'TDMA：一次一個使用者用整個頻道　OFDM：一次一個使用者，資料分到多個子載波　OFDMA：子載波同時分給多個使用者' }, svg);
  })();

  /* ---------- 3b. 協定實體（依講義四格圖） ---------- */
  (function entities() {
    const host = document.getElementById('fig-entities');
    if (!host) return;
    const svg = svgRoot(host, 720, 370, '802.11 協定實體');
    const ar = arrowDefs(svg);
    function box(x, y, w, h, col, title, sub) {
      S('rect', { x, y, width: w, height: h, rx: 6, fill: `var(--${col}-soft)`, stroke: `var(--${col})`, 'stroke-width': 2 }, svg);
      const cy = y + h / 2 + (sub ? -4 : 5);
      S('text', { x: x + w / 2, y: cy, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, text: title }, svg);
      if (sub) S('text', { x: x + w / 2, y: cy + 19, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: sub }, svg);
    }
    const X1 = 90, W1 = 240, X2 = 350, W2 = 200, X3 = 570, W3 = 130;
    const Y = { llc: 14, mac: 92, plcp: 196, pmd: 262, end: 322 };
    // 左側層別括號
    [['MAC', Y.mac, Y.mac + 60], ['PHY', Y.plcp, Y.end]].forEach(([n, a, b]) => {
      S('path', { d: `M64 ${a} L56 ${a} L56 ${b} L64 ${b}`, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
      S('text', { x: 40, y: (a + b) / 2 + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, text: n }, svg);
    });
    box(X1, Y.llc, W1, 46, 'purple', 'LLC', '邏輯鏈結控制');
    box(X1, Y.mac, W1, 60, 'accent', 'MAC Sublayer', '存取機制、分段、加解密');
    box(X1, Y.plcp, W1, 60, 'green', 'PLCP Sublayer', '統一 PHY 介面、CCA、Multiple Rate');
    box(X1, Y.pmd, W1, 60, 'green', 'PMD Sublayer', 'Baseband（modulation）');
    box(X2, Y.mac, W2, 60, 'orange', 'MAC Layer', 'Management');
    box(X2, Y.plcp, W2, Y.end - Y.plcp, 'orange', 'PHY Layer', 'Management');
    box(X3, Y.mac, W3, Y.end - Y.mac, 'red', 'Station', 'Management');
    // SAP：資料往下送的介面點
    [['MAC SAP', Y.llc + 46, Y.mac, 'MSDU'], ['PHY SAP', Y.mac + 60, Y.plcp, 'MPDU ＝ PSDU']].forEach(([n, a, b, pdu]) => {
      const cx = X1 + W1 / 2, my = (a + b) / 2;
      S('line', { x1: cx, y1: a, x2: cx, y2: b - 2, stroke: 'var(--fg)', 'stroke-width': 2, 'marker-end': ar('fg') }, svg);
      S('ellipse', { cx, cy: my, rx: 30, ry: 10, fill: 'var(--surface)', stroke: 'var(--fg)', 'stroke-width': 1.5 }, svg);
      S('text', { x: cx + 40, y: my + 5, 'font-size': 13, 'font-weight': 700, text: n }, svg);
      S('text', { x: cx - 40, y: my + 5, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--accent)', 'font-weight': 700, text: pdu }, svg);
    });
    // 實體與管理實體之間的連結
    [[Y.mac + 30], [Y.plcp + 30], [Y.pmd + 30]].forEach(([y]) => S('line', { x1: X1 + W1, y1: y, x2: X2, y2: y, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, svg));
    [[Y.mac + 30], [(Y.plcp + Y.end) / 2]].forEach(([y]) => S('line', { x1: X2 + W2, y1: y, x2: X3, y2: y, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, svg));
    // 送上無線媒介
    const cx = X1 + W1 / 2;
    S('line', { x1: cx, y1: Y.end, x2: cx, y2: 356, stroke: 'var(--fg)', 'stroke-width': 2, 'marker-end': ar('fg') }, svg);
    S('text', { x: cx - 12, y: 352, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--accent)', 'font-weight': 700, text: 'PPDU' }, svg);
    S('text', { x: cx + 12, y: 352, 'font-size': 12, cls: 't-muted', text: '送上無線媒介' }, svg);
  })();

  /* ---------- 4. MSDU → PPDU ---------- */
  (function pdu() {
    const fig = document.getElementById('fig-pdu-wrap');
    const svg = svgRoot(document.getElementById('fig-pdu'), 720, 280, 'MSDU 到 PPDU 的轉換動畫');
    const rows = [['LLC', 40], ['MAC', 100], ['PLCP', 160], ['PMD／空中', 230]];
    rows.forEach(([n, y]) => {
      S('rect', { x: 10, y: y - 20, width: 100, height: 40, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--border)' }, svg);
      S('text', { x: 60, y: y + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, text: n }, svg);
      S('line', { x1: 112, y1: y, x2: 700, y2: y, stroke: 'var(--border)', 'stroke-dasharray': '3 4' }, svg);
    });
    const g = S('g', null, svg);
    const DX = 330;
    function block(y, parts, name, nameColor) {
      clear(g);
      const total = parts.reduce((a, p) => a + p.w, 0);
      let x = DX - total / 2;
      parts.forEach(p => {
        if (p.w < 1) return;
        S('rect', { x, y: y - 16, width: p.w - 2, height: 32, rx: 4, fill: `var(--${p.c}-soft)`, stroke: `var(--${p.c})`, 'stroke-width': 1.5 }, g);
        if (p.w > 30) S('text', { x: x + p.w / 2 - 1, y: y + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, text: p.t }, g);
        x += p.w;
      });
      S('text', { x: DX + total / 2 + 12, y: y + 5, 'font-size': 14, 'font-weight': 700, fill: `var(--${nameColor})`, text: name }, g);
    }
    function render(t) {
      const data = { t: '資料', w: 110, c: 'green' };
      const grow = prog(t, 2, 2.8);
      const mac = [{ t: 'MAC header', w: 84 * grow, c: 'accent' }, data, { t: 'FCS', w: 40 * grow, c: 'accent' }];
      const grow2 = prog(t, 4.6, 5.4);
      const phy = [{ t: 'Preamble', w: 70 * grow2, c: 'orange' }, { t: 'PLCP hdr', w: 64 * grow2, c: 'orange' }, ...mac];
      if (t < 1) block(40, [data], 'MSDU', 'green');
      else if (t < 2) block(lerp(40, 100, prog(t, 1, 1.8)), [data], 'MSDU', 'green');
      else if (t < 3.2) block(100, mac, grow < 1 ? 'MSDU' : 'MPDU', grow < 1 ? 'green' : 'accent');
      else if (t < 4.2) block(lerp(100, 160, prog(t, 3.2, 4)), mac, t < 4 ? 'MPDU' : 'PSDU', t < 4 ? 'accent' : 'purple');
      else if (t < 4.6) block(160, mac, 'PSDU（= MPDU）', 'purple');
      else if (t < 6) block(160, phy, grow2 < 1 ? 'PSDU' : 'PPDU', grow2 < 1 ? 'purple' : 'orange');
      else {
        block(lerp(160, 230, prog(t, 6, 6.8)), phy, 'PPDU', 'orange');
        if (t > 6.8) {
          // 天線與電波：放在 PPDU 名稱右側，不與方塊重疊
          const ax = 630;
          S('line', { x1: ax, y1: 244, x2: ax, y2: 222, stroke: 'var(--muted)', 'stroke-width': 1.5 }, g);
          S('circle', { cx: ax, cy: 220, r: 2.5, fill: 'var(--muted)' }, g);
          [0, 0.5].forEach(o => {
            const q = ((t - 6.8) / 1.2 + o) % 1;
            S('path', { d: `M${ax + 8 + q * 30} ${206 - q * 10} Q${ax + 16 + q * 36} 220 ${ax + 8 + q * 30} ${234 + q * 10}`, fill: 'none', stroke: 'var(--orange)', 'stroke-width': 1.5, opacity: (1 - q) * 0.8 }, g);
          });
          S('text', { x: ax, y: 264, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '送上空中' }, g);
        }
      }
    }
    Timeline(fig, { duration: 8.5, render, format: t => `${t.toFixed(1)} s` });
  })();

  /* ---------- 5. 三種配置 ---------- */
  (function configs() {
    const svg = svgRoot(document.getElementById('fig-configs'), 720, 270, '三種 802.11 配置');
    const wl = (x1, y1, x2, y2) => S('line', { x1, y1, x2, y2, stroke: 'var(--accent)', 'stroke-width': 1.8, 'stroke-dasharray': '5 4' }, svg);
    const wire = (x1, y1, x2, y2) => S('line', { x1, y1, x2, y2, stroke: 'var(--fg)', 'stroke-width': 3 }, svg);
    const small = (x, y, l) => { S('circle', { cx: x, cy: y, r: 13, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2 }, svg); S('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, text: l }, svg); };
    const title = (x, t, s) => { S('text', { x, y: 22, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: t }, svg); S('text', { x, y: 258, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: s }, svg); };
    // IBSS
    title(120, 'Independent（IBSS）', '站台直接通訊，沒有 AP');
    S('ellipse', { cx: 120, cy: 140, rx: 95, ry: 85, fill: 'var(--accent-soft)', opacity: 0.5, stroke: 'var(--accent)', 'stroke-dasharray': '6 4' }, svg);
    const ib = [[70, 100], [170, 95], [75, 185], [165, 180]];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) wl(ib[i][0], ib[i][1], ib[j][0], ib[j][1]);
    ib.forEach((p, i) => small(p[0], p[1], 'STA' + (i + 1)));
    // Infrastructure
    title(360, 'Infrastructure（ESS）', 'BSS-A + BSS-B + DS = ESS');
    S('ellipse', { cx: 305, cy: 125, rx: 58, ry: 70, fill: 'var(--orange-soft)', opacity: 0.5, stroke: 'var(--orange)', 'stroke-dasharray': '6 4' }, svg);
    S('ellipse', { cx: 415, cy: 125, rx: 58, ry: 70, fill: 'var(--green-soft)', opacity: 0.5, stroke: 'var(--green)', 'stroke-dasharray': '6 4' }, svg);
    S('text', { x: 280, y: 68, 'font-size': 11, 'font-weight': 600, fill: 'var(--orange)', text: 'BSS-A' }, svg);
    S('text', { x: 415, y: 68, 'font-size': 11, 'font-weight': 600, fill: 'var(--green)', text: 'BSS-B' }, svg);
    wire(305, 140, 305, 215); wire(415, 140, 415, 215); wire(280, 215, 440, 215);
    S('text', { x: 360, y: 236, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: 'DS（Ethernet）' }, svg);
    wl(280, 100, 305, 128); wl(330, 98, 305, 128); wl(395, 98, 415, 128); wl(440, 100, 415, 128);
    small(278, 92, 'A1'); small(332, 90, 'A2'); small(393, 90, 'B1'); small(442, 92, 'B2');
    apIcon(svg, 305, 140, 'AP'); apIcon(svg, 415, 140, 'AP');
    // Mesh
    title(600, 'Mesh（802.11s）', 'AP 之間以無線互連');
    const mp = [[545, 85], [655, 85], [545, 180], [655, 180]];
    [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3]].forEach(([i, j]) => S('line', { x1: mp[i][0], y1: mp[i][1], x2: mp[j][0], y2: mp[j][1], stroke: 'var(--purple)', 'stroke-width': 2.2, 'stroke-dasharray': '7 4' }, svg));
    wire(545, 85, 545, 50); S('text', { x: 553, y: 52, 'font-size': 11, 'font-weight': 600, text: '有線（Portal）' }, svg);
    wl(655, 180, 690, 215); wl(545, 180, 510, 215);
    small(690, 222, 'STA'); small(510, 222, 'STA');
    mp.forEach(p => apIcon(svg, p[0], p[1], 'MP'));
  })();

  /* ---------- 5b. 無線橋接（Wireless Bridging） ---------- */
  (function bridge() {
    const host = document.getElementById('fig-bridge');
    if (!host) return;
    const svg = svgRoot(host, 720, 340, '兩棟大樓間的無線橋接');
    function building(x, name, ap, st) {
      S('rect', { x, y: 50, width: 230, height: 230, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--border)', 'stroke-width': 2 }, svg);
      S('text', { x: x + 115, y: 40, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, text: name }, svg);
      // Ethernet 匯流排
      S('line', { x1: x + 20, y1: 200, x2: x + 210, y2: 200, stroke: 'var(--green)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      S('text', { x: x + 20, y: 192, 'font-size': 12, fill: 'var(--green)', 'font-weight': 700, text: 'Ethernet' }, svg);
      st.forEach((n, i) => {
        const sx = x + 45 + i * 70;
        S('line', { x1: sx, y1: 200, x2: sx, y2: 232, stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
        S('rect', { x: sx - 28, y: 232, width: 56, height: 28, rx: 5, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
        S('text', { x: sx, y: 251, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, text: n }, svg);
      });
      const axp = ap.x;
      S('line', { x1: axp, y1: 116, x2: axp, y2: 200, stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
      apIcon(svg, axp, 105, ap.n);
      return axp;
    }
    const a = building(20, '大樓 A（Building A）', { x: 205, n: 'AP A' }, ['A1', 'A2', 'A3']);
    const b = building(470, '大樓 B（Building B）', { x: 515, n: 'AP B' }, ['B1', 'B2', 'B3']);
    // 802.11s 無線連結
    S('line', { x1: a + 26, y1: 100, x2: b - 26, y2: 100, stroke: 'var(--orange)', 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }, svg);
    [a + 40, b - 40].forEach((cx, i) => [10, 18].forEach(r => S('path', {
      d: i === 0 ? `M${cx + r * 0.5} ${100 - r} A${r} ${r} 0 0 1 ${cx + r * 0.5} ${100 + r}` : `M${cx - r * 0.5} ${100 - r} A${r} ${r} 0 0 0 ${cx - r * 0.5} ${100 + r}`,
      fill: 'none', stroke: 'var(--orange)', 'stroke-width': 1.5, opacity: 0.7 }, svg)));
    S('text', { x: 360, y: 88, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--orange)', text: 'IEEE 802.11s（無線）' }, svg);
    // 考量
    ['安全 Security ?', '速率 Data Rate ?', '距離 Range ?', '法規 Legal ?', '成本 Cost ?'].forEach((q, i) => {
      const y = 124 + i * 26;
      S('rect', { x: 290, y, width: 140, height: 20, rx: 10, fill: 'var(--red-soft)', stroke: 'var(--red)' }, svg);
      S('text', { x: 360, y: y + 14, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, text: q }, svg);
    });
    // 有線替代：租用專線
    S('path', { d: 'M230 200 H262 V305 H458 V200 H490', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
    S('text', { x: 360, y: 298, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, text: 'private lease line' }, svg);
    S('text', { x: 360, y: 326, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '有線替代：租用專線（802.1G remote bridge）' }, svg);
  })();

  /* ---------- 5c. 戶外應用：指向性天線 ---------- */
  (function outdoor() {
    const host = document.getElementById('fig-outdoor');
    if (!host) return;
    const svg = svgRoot(host, 720, 300, '戶外應用與指向性天線');
    const G = 268;
    S('line', { x1: 10, y1: G, x2: 710, y2: G, stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
    function bld(x, w, top, name) {
      S('rect', { x, y: top, width: w, height: G - top, fill: 'var(--surface-2)', stroke: 'var(--border)', 'stroke-width': 2 }, svg);
      for (let r = top + 16; r < G - 20; r += 26) for (let c = x + 14; c < x + w - 14; c += 28)
        S('rect', { x: c, y: r, width: 14, height: 12, fill: 'var(--accent-soft)' }, svg);
      S('text', { x: x + w / 2, y: G + 20, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: name }, svg);
    }
    function dish(x, y, dir) {
      S('line', { x1: x, y1: y + 6, x2: x, y2: y + 46, stroke: 'var(--fg)', 'stroke-width': 3 }, svg);
      S('path', { d: `M${x} ${y - 16} Q${x + dir * 16} ${y} ${x} ${y + 16}`, fill: 'var(--orange-soft)', stroke: 'var(--orange)', 'stroke-width': 3 }, svg);
      S('line', { x1: x, y1: y, x2: x + dir * 18, y2: y, stroke: 'var(--orange)', 'stroke-width': 2 }, svg);
    }
    bld(30, 120, 150, '大樓 A');
    bld(570, 120, 150, '大樓 B');
    dish(110, 104, 1);
    dish(610, 104, -1);
    // 窄波束
    S('path', { d: 'M128 104 Q360 74 592 104 Q360 134 128 104 Z', fill: 'var(--orange)', opacity: 0.18, stroke: 'var(--orange)', 'stroke-dasharray': '5 4' }, svg);
    S('text', { x: 360, y: 70, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--orange)', text: '指向性天線對準：窄波束，點對點數百 m～數 km' }, svg);
    S('text', { x: 110, y: 66, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '指向性天線' }, svg);
    S('text', { x: 610, y: 66, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '指向性天線' }, svg);
    // 障礙物：樹
    S('rect', { x: 246, y: 220, width: 8, height: 48, fill: 'var(--muted)' }, svg);
    S('circle', { cx: 250, cy: 200, r: 30, fill: 'var(--green-soft)', stroke: 'var(--green)', 'stroke-width': 2 }, svg);
    S('text', { x: 250, y: 160, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: '視線需無遮蔽（LOS）' }, svg);
    // 戶外全向 AP
    const px = 455;
    S('line', { x1: px, y1: 176, x2: px, y2: G, stroke: 'var(--fg)', 'stroke-width': 3 }, svg);
    S('path', { d: `M${px - 80} ${G} A80 80 0 0 1 ${px + 80} ${G}`, fill: 'var(--accent)', opacity: 0.12, stroke: 'var(--accent)', 'stroke-dasharray': '4 4' }, svg);
    apIcon(svg, px, 176, 'AP');
    [[px - 52, '📱'], [px + 50, '💻']].forEach(([x, e]) => S('text', { x, y: G - 8, 'text-anchor': 'middle', 'font-size': 16, text: e }, svg));
    S('text', { x: px, y: G + 20, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '戶外 AP（全向）覆蓋廣場' }, svg);
  })();

  /* ---------- 5d. BSS／ESS、同地點覆蓋、完整架構 ---------- */
  function miniSta(svg, x, y, label) {
    S('circle', { cx: x, cy: y, r: 12, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
    S('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, text: label }, svg);
  }
  function cell(svg, cx, cy, r, col) {
    S('circle', { cx, cy, r, fill: `var(--${col})`, opacity: 0.1, stroke: `var(--${col})`, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, svg);
  }
  function dsBar(svg, x1, x2, y, label) {
    S('rect', { x: x1, y: y - 14, width: x2 - x1, height: 28, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--fg)', 'stroke-width': 2 }, svg);
    S('text', { x: (x1 + x2) / 2, y: y + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: label }, svg);
  }
  function wireTo(svg, x, y1, y2) { S('line', { x1: x, y1, x2: x, y2, stroke: 'var(--fg)', 'stroke-width': 2.5 }, svg); }
  function pill(svg, x, y, text, col) {
    const w = text.length * 8 + 14;
    S('rect', { x: x - w / 2, y: y - 10, width: w, height: 20, rx: 10, fill: `var(--${col}-soft)`, stroke: `var(--${col})` }, svg);
    S('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text }, svg);
  }

  (function bssEss() {
    const host = document.getElementById('fig-bss-ess');
    if (!host) return;
    const svg = svgRoot(host, 720, 290, 'BSS 與 ESS');
    // 左：單一 BSS
    S('text', { x: 150, y: 22, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, text: 'BSS' }, svg);
    cell(svg, 150, 130, 95, 'accent');
    apIcon(svg, 150, 110, 'AP');
    [[95, 160], [205, 160], [150, 195]].forEach(([x, y]) => miniSta(svg, x, y, 'STA'));
    S('text', { x: 150, y: 250, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '覆蓋範圍 = BSA；BSSID = AP 的 MAC' }, svg);
    S('line', { x1: 300, y1: 30, x2: 300, y2: 270, stroke: 'var(--border)' }, svg);
    // 右：ESS
    S('rect', { x: 325, y: 30, width: 385, height: 245, rx: 14, fill: 'none', stroke: 'var(--purple)', 'stroke-width': 2, 'stroke-dasharray': '8 5' }, svg);
    S('text', { x: 517, y: 22, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--purple)', text: 'ESS（同一個 SSID）' }, svg);
    cell(svg, 440, 120, 80, 'accent');
    cell(svg, 595, 120, 80, 'green');
    S('text', { x: 400, y: 56, 'font-size': 12, 'font-weight': 700, fill: 'var(--accent)', text: 'BSS 1' }, svg);
    S('text', { x: 600, y: 56, 'font-size': 12, 'font-weight': 700, fill: 'var(--green)', text: 'BSS 2' }, svg);
    wireTo(svg, 440, 121, 231); wireTo(svg, 595, 121, 231);
    apIcon(svg, 440, 110, 'AP1'); apIcon(svg, 595, 110, 'AP2');
    [[395, 150], [470, 165], [565, 160], [640, 150]].forEach(([x, y]) => miniSta(svg, x, y, 'STA'));
    dsBar(svg, 380, 655, 245, 'DS（Distribution System）');
  })();

  (function colloc() {
    const host = document.getElementById('fig-colloc');
    if (!host) return;
    const svg = svgRoot(host, 720, 270, '同地點不同頻道的 BSS');
    const aps = [[230, 'accent', 'ch 1'], [290, 'orange', 'ch 6'], [350, 'green', 'ch 11']];
    aps.forEach(([x, col]) => cell(svg, x, 115, 100, col));
    aps.forEach(([x]) => wireTo(svg, x, 126, 226));
    aps.forEach(([x, col, ch]) => {
      apIcon(svg, x, 115, 'AP');
      S('text', { x, y: 150, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: `var(--${col})`, text: ch }, svg);
    });
    [[180, 70], [380, 80], [200, 180], [380, 175], [290, 50]].forEach(([x, y]) => miniSta(svg, x, y, 'STA'));
    dsBar(svg, 150, 430, 240, 'DS（Distribution System）');
    const notes = ['同一區域、不同頻道', '→ 彼此不干擾', '→ 容量相加、可備援', '', '2.4 GHz：最多 3 層', '（頻道 1、6、11）', '5／6 GHz：頻道多，可疊更多'];
    notes.forEach((n, i) => {
      const strong = i === 0 || i === 4;
      S('text', { x: 480, y: 70 + i * 24, 'font-size': 13, 'font-weight': strong ? 700 : 400, cls: strong ? null : 't-muted', text: n }, svg);
    });
  })();

  (function complete() {
    const host = document.getElementById('fig-complete');
    if (!host) return;
    const svg = svgRoot(host, 720, 320, '802.11 完整架構');
    S('rect', { x: 10, y: 10, width: 560, height: 270, rx: 14, fill: 'none', stroke: 'var(--purple)', 'stroke-width': 2, 'stroke-dasharray': '8 5' }, svg);
    S('text', { x: 24, y: 30, 'font-size': 13, 'font-weight': 700, fill: 'var(--purple)', text: 'ESS' }, svg);
    S('ellipse', { cx: 150, cy: 105, rx: 120, ry: 66, fill: 'var(--accent)', opacity: 0.1, stroke: 'var(--accent)', 'stroke-dasharray': '6 4' }, svg);
    S('ellipse', { cx: 430, cy: 105, rx: 120, ry: 66, fill: 'var(--green)', opacity: 0.1, stroke: 'var(--green)', 'stroke-dasharray': '6 4' }, svg);
    S('text', { x: 70, y: 58, 'font-size': 12, 'font-weight': 700, fill: 'var(--accent)', text: 'BSS 1' }, svg);
    S('text', { x: 470, y: 58, 'font-size': 12, 'font-weight': 700, fill: 'var(--green)', text: 'BSS 2' }, svg);
    wireTo(svg, 220, 128, 221); wireTo(svg, 360, 128, 221);
    apIcon(svg, 220, 117, 'AP1'); apIcon(svg, 360, 117, 'AP2');
    [[80, 100, 'STA1'], [140, 135, 'STA2'], [430, 140, 'STA3'], [490, 100, 'STA4']].forEach(([x, y, l]) => miniSta(svg, x, y, l));
    // SS：所有站台（含 AP）提供
    pill(svg, 110, 172, 'SS', 'accent');
    pill(svg, 460, 172, 'SS', 'green');
    // DSS：DS 經 AP 提供
    pill(svg, 290, 190, 'DSS', 'orange');
    S('line', { x1: 268, y1: 190, x2: 226, y2: 190, stroke: 'var(--orange)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, svg);
    S('line', { x1: 312, y1: 190, x2: 354, y2: 190, stroke: 'var(--orange)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, svg);
    dsBar(svg, 60, 520, 235, 'DS（Distribution System）');
    S('text', { x: 290, y: 268, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: 'AP = STA ＋ 進入 DS 的入口（Service Entry）' }, svg);
    // Portal 與 802.x LAN
    S('line', { x1: 520, y1: 235, x2: 600, y2: 235, stroke: 'var(--fg)', 'stroke-width': 2.5 }, svg);
    S('rect', { x: 600, y: 215, width: 80, height: 40, rx: 6, fill: 'var(--purple-soft)', stroke: 'var(--purple)', 'stroke-width': 2 }, svg);
    S('text', { x: 640, y: 240, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: 'Portal' }, svg);
    S('line', { x1: 640, y1: 255, x2: 640, y2: 290, stroke: 'var(--fg)', 'stroke-width': 2.5 }, svg);
    S('line', { x1: 590, y1: 290, x2: 710, y2: 290, stroke: 'var(--green)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    S('text', { x: 650, y: 310, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: '802.x LAN' }, svg);
    S('text', { x: 640, y: 205, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: 'Integration' }, svg);
  })();

  /* ---------- 5e. 802.11 定義的是空中介面 ---------- */
  (function airIf() {
    const host = document.getElementById('fig-airif');
    if (!host) return;
    const svg = svgRoot(host, 720, 250, '802.11 標準化的範圍');
    function layer(x, y, w, n, col) {
      S('rect', { x, y, width: w, height: 36, rx: 5, fill: `var(--${col}-soft)`, stroke: `var(--${col})`, 'stroke-width': 2 }, svg);
      S('text', { x: x + w / 2, y: y + 23, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: n }, svg);
    }
    function mark(x, y, ok, text, anchor) {
      S('circle', { cx: x, cy: y, r: 10, fill: ok ? 'var(--green)' : 'var(--red)' }, svg);
      S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#fff', text: ok ? '✓' : '✕' }, svg);
      if (text) S('text', { x: anchor === 'end' ? x - 16 : x + 16, y: y + 5, 'text-anchor': anchor || 'start', 'font-size': 12, 'font-weight': 600, fill: ok ? 'var(--green)' : 'var(--red)', text }, svg);
    }
    // STA
    S('text', { x: 90, y: 40, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: 'STA' }, svg);
    layer(40, 52, 100, 'MAC', 'accent');
    layer(40, 96, 100, 'PHY', 'accent');
    mark(40, 92, false);
    S('text', { x: 90, y: 152, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--red)', text: 'MAC／PHY 內部介面' }, svg);
    S('text', { x: 90, y: 167, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--red)', text: '不公開、不標準化' }, svg);
    // 空中介面
    let d = 'M142 114';
    for (let i = 0; i < 9; i++) d += ` q8.5 ${i % 2 ? 10 : -10} 17 0`;
    S('path', { d, fill: 'none', stroke: 'var(--green)', 'stroke-width': 3 }, svg);
    S('text', { x: 220, y: 72, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--green)', text: '空中介面 Airwaves IF' }, svg);
    S('text', { x: 220, y: 90, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--green)', text: 'PHY＋MAC：標準化' }, svg);
    mark(220, 142, true);
    // AP
    S('text', { x: 350, y: 40, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: 'AP' }, svg);
    layer(300, 52, 100, 'MAC', 'accent');
    layer(300, 96, 100, 'PHY', 'accent');
    S('rect', { x: 300, y: 150, width: 100, height: 32, rx: 5, fill: 'var(--red-soft)', stroke: 'var(--red)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
    S('text', { x: 350, y: 171, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: '對 DS 的介面' }, svg);
    mark(300, 92, false);
    // DS
    S('line', { x1: 400, y1: 166, x2: 480, y2: 166, stroke: 'var(--fg)', 'stroke-width': 2.5 }, svg);
    mark(440, 166, false);
    S('text', { x: 440, y: 194, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--red)', text: '沒有公開介面' }, svg);
    S('rect', { x: 480, y: 50, width: 225, height: 170, rx: 16, fill: 'var(--surface-2)', stroke: 'var(--red)', 'stroke-width': 2, 'stroke-dasharray': '7 5' }, svg);
    S('text', { x: 592, y: 82, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, text: 'Distribution System' }, svg);
    mark(505, 115, false, 'DS 內部運作不定義', 'start');
    S('text', { x: 592, y: 150, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '可以是 Ethernet、交換器、Mesh…' }, svg);
    mark(505, 185, true, '只定義 DS 服務（DSS）', 'start');
    // 圖例
    mark(250, 232, true, '標準化', 'start');
    mark(370, 232, false, '未標準化（廠商自訂）', 'start');
  })();

  /* ---------- 6. 速率與距離 ---------- */
  (function range() {
    const svg = svgRoot(document.getElementById('fig-range'), 720, 260, '速率與距離示意');
    const cx = 250, cy = 130;
    const rings = [[125, '1 Mbps', 'DBPSK'], [100, '2 Mbps', 'DQPSK'], [72, '5.5 Mbps', 'CCK'], [44, '11 Mbps', 'CCK']];
    rings.forEach(([r], i) => S('circle', { cx, cy, r, fill: 'var(--accent)', opacity: 0.1 + i * 0.12, stroke: 'var(--accent)' }, svg));
    apIcon(svg, cx, cy + 6, 'AP');
    rings.forEach(([r, n, m], i) => {
      const y = 40 + i * 50;
      S('line', { x1: cx + r * 0.72, y1: cy - r * 0.69, x2: 440, y2: y, stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, svg);
      S('text', { x: 450, y: y + 5, 'font-size': 15, 'font-weight': 700, text: n }, svg);
      S('text', { x: 550, y: y + 5, 'font-size': 13, cls: 't-muted', text: m }, svg);
    });
    S('text', { x: 450, y: 228, 'font-size': 12, cls: 't-muted', text: '以 802.11b 為例：越外圈速率越低' }, svg);
    S('text', { x: 450, y: 248, 'font-size': 12, fill: 'var(--orange)', 'font-weight': 600, text: 'Beacon、PLCP 標頭用最外圈 1 Mbps 送' }, svg);
  })();

  /* ---------- 7. OFDM 計算器 ---------- */
  (function ofdm() {
    const svg = svgRoot(document.getElementById('fig-ofdm'), 720, 240, 'OFDM 速率計算');
    const modSel = document.getElementById('ofdm-mod');
    const rateSel = document.getElementById('ofdm-rate');
    const out = document.getElementById('ofdm-out');
    const STD = { '1|1/2': 6, '1|3/4': 9, '2|1/2': 12, '2|3/4': 18, '4|1/2': 24, '4|3/4': 36, '6|2/3': 48, '6|3/4': 54 };
    const NAME = { 1: 'BPSK', 2: 'QPSK', 4: '16-QAM', 6: '64-QAM' };
    function draw() {
      clear(svg);
      const b = +modSel.value, rs = rateSel.value;
      const [rn, rd] = rs.split('/').map(Number);
      // constellation
      const cx = 115, cy = 120, half = 95;
      S('rect', { x: cx - half, y: cy - half, width: half * 2, height: half * 2, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--border)' }, svg);
      S('line', { x1: cx - half, y1: cy, x2: cx + half, y2: cy, stroke: 'var(--muted)' }, svg);
      S('line', { x1: cx, y1: cy - half, x2: cx, y2: cy + half, stroke: 'var(--muted)' }, svg);
      S('text', { x: cx + half - 4, y: cy - 4, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted', text: 'I' }, svg);
      S('text', { x: cx + 4, y: cy - half + 12, 'font-size': 10, cls: 't-muted', text: 'Q' }, svg);
      let pts = [];
      if (b === 1) pts = [[-1, 0], [1, 0]];
      else {
        const m = b === 2 ? 2 : b === 4 ? 4 : 8;
        for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) pts.push([(2 * i - (m - 1)) / (m - 1), (2 * j - (m - 1)) / (m - 1)]);
      }
      pts.forEach(p => S('circle', { cx: cx + p[0] * (half - 14), cy: cy - p[1] * (half - 14), r: b === 6 ? 3.5 : 6, fill: 'var(--accent)' }, svg));
      S('text', { x: cx, y: cy + half + 20, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, text: `${NAME[b]}：${2 ** b} 個點 = ${b} bit／子載波` }, svg);
      // subcarriers
      const x0 = 250, w = 450;
      S('text', { x: x0, y: 30, 'font-size': 13, 'font-weight': 700, text: '一個 OFDM symbol（4 μs）裡的 52 個子載波' }, svg);
      const sw = w / 52;
      const pilots = new Set([5, 19, 32, 46]);
      for (let i = 0; i < 52; i++) {
        const pil = pilots.has(i);
        S('rect', { x: x0 + i * sw, y: 46, width: sw - 1.5, height: 60, rx: 1.5, fill: pil ? 'var(--muted)' : 'var(--accent)', opacity: pil ? 0.6 : 0.85 }, svg);
      }
      S('text', { x: x0, y: 124, 'font-size': 11, cls: 't-muted', text: '藍：48 個資料子載波　灰：4 個 pilot' }, svg);
      const raw = 48 * b, eff = raw * rn / rd, rate = eff / 4;
      const lines = [
        `48 × ${b} bits = ${raw} bits（編碼後）`,
        `× 碼率 ${rs} = ${eff} bits 有效資料`,
        `÷ 4 μs = ${rate} Mbps`,
      ];
      lines.forEach((l, i) => S('text', { x: x0, y: 156 + i * 24, 'font-size': 15, 'font-weight': i === 2 ? 800 : 500, cls: 't-mono', text: l, fill: i === 2 ? 'var(--accent)' : 'var(--fg)' }, svg));
      const std = STD[b + '|' + rs];
      out.textContent = std ? `✔ ${NAME[b]} + 碼率 ${rs} = ${std} Mbps，是 802.11a 的標準速率${[6, 12, 24].includes(std) ? '（必要速率）' : ''}。` : `這個組合算得出 ${rate} Mbps，但 802.11a 沒有定義它（11a 的組合：BPSK 1/2、3/4；QPSK 1/2、3/4；16-QAM 1/2、3/4；64-QAM 2/3、3/4）。`;
    }
    modSel.addEventListener('change', draw); rateSel.addEventListener('change', draw);
    draw();
  })();

  /* ---------- 8. 頻段 ---------- */
  (function bands() {
    const svg = svgRoot(document.getElementById('fig-bands'), 720, 190, '免執照頻段頻寬比較');
    const d = [['902MHz', 26, '902–928'], ['2.4GHz', 83.5, '2400–2483.5'], ['5GHz', 300, 'UNII 三段'], ['6GHz', 1200, '補充：Wi-Fi 6E / 7']];
    const x0 = 90, W = 560;
    d.forEach(([n, mhz, s], i) => {
      const y = 18 + i * 42;
      S('text', { x: x0 - 10, y: y + 18, 'text-anchor': 'end', 'font-size': 14, 'font-weight': 700, text: n }, svg);
      const w = Math.max(3, mhz / 1200 * W);
      S('rect', { x: x0, y: y + 3, width: w, height: 22, rx: 4, fill: 'var(--accent)' }, svg);
      S('text', { x: x0 + w + 8, y: y + 19, 'font-size': 13, 'font-weight': 600, text: `${mhz} MHz` }, svg);
      S('text', { x: x0 + w + 90, y: y + 19, 'font-size': 12, cls: 't-muted', text: s }, svg);
    });
  })();

  /* ---------- 8b. 5 GHz UNII 與 6 GHz ---------- */
  (function unii() {
    const host = document.getElementById('fig-unii');
    if (!host) return;
    const svg = svgRoot(host, 720, 230, '5 GHz UNII 頻段');
    const f0 = 5140, f1 = 5860, X0 = 30, X1 = 700;
    const fx = f => X0 + (f - f0) / (f1 - f0) * (X1 - X0);
    const defs = S('defs', null, svg);
    const pat = S('pattern', { id: 'dfs-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    S('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--orange)', 'stroke-width': 2, opacity: 0.6 }, pat);
    // 講義：三段各 100 MHz
    [[5150, 5250], [5250, 5350], [5725, 5825]].forEach(([a, b], i) => {
      S('rect', { x: fx(a) + 1, y: 20, width: fx(b) - fx(a) - 2, height: 22, rx: 4, fill: 'var(--purple-soft)', stroke: 'var(--purple)' }, svg);
      S('text', { x: (fx(a) + fx(b)) / 2, y: 35, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: `講義第 ${i + 1} 段` }, svg);
    });
    // UNII 子頻段
    const bands = [[5150, 5250, 'UNII-1', false], [5250, 5350, 'UNII-2A', true], [5470, 5725, 'UNII-2C（2003 加開）', true], [5725, 5850, 'UNII-3', false]];
    bands.forEach(([a, b, n, dfs]) => {
      S('rect', { x: fx(a) + 1, y: 56, width: fx(b) - fx(a) - 2, height: 30, rx: 4, fill: dfs ? 'var(--orange-soft)' : 'var(--accent-soft)', stroke: dfs ? 'var(--orange)' : 'var(--accent)', 'stroke-width': 1.5 }, svg);
      S('text', { x: (fx(a) + fx(b)) / 2, y: 76, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: n }, svg);
    });
    S('text', { x: (fx(5350) + fx(5470)) / 2, y: 76, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: '不可用' }, svg);
    // 20 MHz 頻道
    const chs = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
    chs.forEach(c => {
      const fc = 5000 + 5 * c, dfs = c >= 52 && c <= 144;
      S('rect', { x: fx(fc - 10) + 1, y: 100, width: fx(fc + 10) - fx(fc - 10) - 2, height: 40, rx: 2, fill: dfs ? 'url(#dfs-hatch)' : 'var(--accent-soft)', stroke: dfs ? 'var(--orange)' : 'var(--accent)' }, svg);
      S('text', { x: fx(fc), y: 154, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 600, text: c }, svg);
    });
    // 頻率軸
    S('line', { x1: X0, y1: 168, x2: X1, y2: 168, stroke: 'var(--muted)' }, svg);
    [5150, 5250, 5350, 5470, 5725, 5850].forEach(f => {
      S('line', { x1: fx(f), y1: 164, x2: fx(f), y2: 172, stroke: 'var(--muted)' }, svg);
      S('text', { x: fx(f), y: 186, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: f }, svg);
    });
    S('text', { x: X1, y: 186, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted', text: 'MHz' }, svg);
    // 圖例
    S('rect', { x: 200, y: 202, width: 16, height: 14, fill: 'var(--accent-soft)', stroke: 'var(--accent)' }, svg);
    S('text', { x: 222, y: 214, 'font-size': 12, text: '不需 DFS' }, svg);
    S('rect', { x: 320, y: 202, width: 16, height: 14, fill: 'url(#dfs-hatch)', stroke: 'var(--orange)' }, svg);
    S('text', { x: 342, y: 214, 'font-size': 12, text: '需要 DFS（偵測到雷達要換頻道）' }, svg);
  })();

  (function sixG() {
    const host = document.getElementById('fig-6g');
    if (!host) return;
    const svg = svgRoot(host, 720, 260, '6 GHz 頻段');
    const f0 = 5925, f1 = 7125, X0 = 110, X1 = 700;
    const fx = f => X0 + (f - f0) / (f1 - f0) * (X1 - X0);
    [[5925, 6425, 'UNII-5'], [6425, 6525, 'U-6'], [6525, 6875, 'UNII-7'], [6875, 7125, 'UNII-8']].forEach(([a, b, n], i) => {
      S('rect', { x: fx(a) + 1, y: 20, width: fx(b) - fx(a) - 2, height: 28, rx: 4, fill: i % 2 ? 'var(--green-soft)' : 'var(--accent-soft)', stroke: i % 2 ? 'var(--green)' : 'var(--accent)', 'stroke-width': 1.5 }, svg);
      S('text', { x: (fx(a) + fx(b)) / 2, y: 39, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: n }, svg);
    });
    // 各頻寬的頻道數（6 GHz 頻道從 5955 MHz 起，20 MHz 一格）
    const rows = [[20, 59], [40, 29], [80, 14], [160, 7], [320, 3]];
    rows.forEach(([bw, n], r) => {
      const y = 64 + r * 28;
      S('text', { x: X0 - 10, y: y + 13, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 600, text: `${bw} MHz × ${n}` }, svg);
      for (let k = 0; k < n; k++) {
        const a = 5945 + k * bw;
        S('rect', { x: fx(a) + 0.5, y, width: Math.max(1, fx(a + bw) - fx(a) - 1), height: 18, rx: 2, fill: 'var(--orange)', opacity: 0.35 + (k % 2) * 0.25 }, svg);
      }
    });
    // 歐洲範圍
    const ye = 212;
    S('rect', { x: fx(5945), y: ye, width: fx(6425) - fx(5945), height: 16, rx: 3, fill: 'var(--purple-soft)', stroke: 'var(--purple)' }, svg);
    S('text', { x: fx(6425) + 8, y: ye + 12, 'font-size': 11, text: '歐洲只開放 5945–6425 MHz（約 480 MHz）' }, svg);
    S('text', { x: X0 - 10, y: ye + 12, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 600, text: '歐洲' }, svg);
    [5925, 6425, 6525, 6875, 7125].forEach(f => S('text', { x: fx(f), y: 250, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: f }, svg));
  })();

  /* ---------- 8c. DSSS 頻譜、回波、CRC 電路 ---------- */
  (function spectrum() {
    const host = document.getElementById('fig-spectrum');
    if (!host) return;
    const svg = svgRoot(host, 720, 240, '展頻前後的功率頻譜');
    function panel(x0, title, bw, peak, col) {
      const W = 300, base = 190, cx = x0 + W / 2;
      S('text', { x: cx, y: 22, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: title }, svg);
      S('line', { x1: x0, y1: base, x2: x0 + W, y2: base, stroke: 'var(--muted)', 'stroke-width': 1.5 }, svg);
      S('line', { x1: x0, y1: base, x2: x0, y2: 36, stroke: 'var(--muted)', 'stroke-width': 1.5 }, svg);
      S('text', { x: x0 + W, y: base + 18, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: '頻率 Frequency' }, svg);
      S('text', { x: x0 + 6, y: 46, 'font-size': 11, cls: 't-muted', text: '功率 Power' }, svg);
      let d = `M${cx - bw} ${base}`;
      for (let i = 0; i <= 60; i++) {
        const u = -1 + i / 30, y = base - peak * Math.pow(Math.cos(u * Math.PI / 2), 2);
        d += ` L${(cx + u * bw).toFixed(1)} ${y.toFixed(1)}`;
      }
      S('path', { d: d + 'Z', fill: `var(--${col})`, opacity: 0.3, stroke: `var(--${col})`, 'stroke-width': 2 }, svg);
      return { cx, base };
    }
    const a = panel(30, '展頻前', 22, 140, 'accent');
    const b = panel(390, '展頻後（× 11-chip 碼）', 130, 24, 'orange');
    S('text', { x: a.cx, y: 228, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '窄頻寬、高功率密度' }, svg);
    S('text', { x: b.cx, y: 228, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '寬頻寬、低功率密度（Wider Bandwidth, Less power density）' }, svg);
    S('path', { d: 'M338 110 L380 110', stroke: 'var(--fg)', 'stroke-width': 2, 'marker-end': arrowDefs(svg)('fg') }, svg);
  })();

  (function echo() {
    const host = document.getElementById('fig-echo');
    if (!host) return;
    const svg = svgRoot(host, 720, 230, '相關器輸出的主峰與回波');
    const X0 = 50, X1 = 690, base = 180;
    S('line', { x1: X0, y1: base, x2: X1, y2: base, stroke: 'var(--muted)', 'stroke-width': 1.5 }, svg);
    S('text', { x: X1, y: base + 20, 'text-anchor': 'end', 'font-size': 12, cls: 't-muted', text: '時間 time' }, svg);
    const peaks = [[200, 130, '主峰 peak（直達路徑）', 'accent'], [290, 60, '回波 echo', 'orange'], [370, 35, '回波 echo', 'orange']];
    // 基底雜訊
    let d = `M${X0} ${base}`;
    for (let x = X0; x <= X1; x += 8) d += ` L${x} ${base - 4 - 4 * Math.abs(Math.sin(x * 0.7))}`;
    S('path', { d, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1 }, svg);
    peaks.forEach(([x, h, n, col]) => {
      S('path', { d: `M${x - 10} ${base} L${x} ${base - h} L${x + 10} ${base} Z`, fill: `var(--${col})`, opacity: 0.8 }, svg);
      S('text', { x, y: base - h - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: `var(--${col})`, text: n }, svg);
    });
    S('path', { d: `M200 ${base + 14} L290 ${base + 14}`, stroke: 'var(--fg)', 'stroke-width': 1.5 }, svg);
    S('text', { x: 245, y: base + 30, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: '延遲 > 1 chip 就分得開' }, svg);
    S('text', { x: 470, y: 70, 'font-size': 12, text: '相關運算後：' }, svg);
    S('text', { x: 470, y: 92, 'font-size': 12, cls: 't-muted', text: '• 直達路徑 → 最大的主峰' }, svg);
    S('text', { x: 470, y: 112, 'font-size': 12, cls: 't-muted', text: '• 反射路徑 → 較晚、較小的回波峰' }, svg);
    S('text', { x: 470, y: 132, 'font-size': 12, cls: 't-muted', text: '• 接收端鎖定主峰，不被回波混淆' }, svg);
  })();

  (function crc() {
    const host = document.getElementById('fig-crc');
    if (!host) return;
    const svg = svgRoot(host, 720, 190, 'CRC-16 移位暫存器');
    const ar = arrowDefs(svg);
    const cw = 32, X0 = 92, Y = 70, taps = [0, 5, 12];
    // 輸入
    S('text', { x: 10, y: Y + 22, 'font-size': 12, 'font-weight': 600, text: '輸入位元' }, svg);
    // 暫存器 0..15，XOR 放在第 0、5、12 格前面
    let x = X0;
    const pos = [];
    for (let i = 0; i < 16; i++) {
      if (taps.includes(i)) {
        S('circle', { cx: x + 10, cy: Y + 17, r: 9, fill: 'var(--surface)', stroke: 'var(--orange)', 'stroke-width': 2 }, svg);
        S('text', { x: x + 10, y: Y + 22, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--orange)', text: '⊕' }, svg);
        pos.push([i, x + 10]);
        x += 24;
      }
      S('rect', { x, y: Y, width: cw - 4, height: 34, rx: 3, fill: 'var(--accent-soft)', stroke: 'var(--accent)', 'stroke-width': 1.5 }, svg);
      S('text', { x: x + (cw - 4) / 2, y: Y + 22, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, text: i }, svg);
      x += cw;
    }
    const xEnd = x - 4;
    // 輸入接到第 0 個 XOR
    S('line', { x1: 66, y1: Y + 17, x2: pos[0][1] - 10, y2: Y + 17, stroke: 'var(--fg)', 'stroke-width': 1.5, 'marker-end': ar('fg') }, svg);
    // 回授：最後一格輸出與輸入在第一個 XOR 相加，結果同時送進第 0 格，並回授到第 5、12 格前的 XOR
    S('path', { d: `M${xEnd} ${Y + 17} H${xEnd + 12} V${Y + 54} H${pos[0][1]} V${Y + 28}`, fill: 'none', stroke: 'var(--orange)', 'stroke-width': 1.8, 'marker-end': ar('orange') }, svg);
    const fx = pos[0][1] + 12;
    S('circle', { cx: fx, cy: Y + 17, r: 3, fill: 'var(--orange)' }, svg);
    S('path', { d: `M${fx} ${Y + 17} V${Y - 26} H${pos[2][1]}`, fill: 'none', stroke: 'var(--orange)', 'stroke-width': 1.8 }, svg);
    pos.slice(1).forEach(([, px]) => S('line', { x1: px, y1: Y - 26, x2: px, y2: Y + 6, stroke: 'var(--orange)', 'stroke-width': 1.8, 'marker-end': ar('orange') }, svg));
    S('text', { x: (fx + pos[2][1]) / 2, y: Y - 34, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--orange)', text: '回授 =（輸入 ⊕ 第 15 格）' }, svg);
    S('text', { x: 360, y: Y + 84, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: 'G(x) = x¹⁶ + x¹² + x⁵ + 1' }, svg);
    S('text', { x: 360, y: Y + 106, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '預設全 1 → 送入 SIGNAL、SERVICE、LENGTH 共 32 bits → 取 1 的補數當 CRC' }, svg);
  })();

  /* ---------- 9. Barker 展頻 ---------- */
  const BARKER = [1, -1, 1, 1, -1, 1, 1, 1, -1, -1, -1];
  (function spread() {
    const svg = svgRoot(document.getElementById('fig-spread'), 720, 430, 'Barker 碼展頻');
    const input = document.getElementById('spread-bits');
    function wave(y, vals, color, label, sub, x0, cw) {
      S('text', { x: 10, y: y - 26, 'font-size': 13, 'font-weight': 700, text: label }, svg);
      if (sub) S('text', { x: 10, y: y - 10, 'font-size': 11, cls: 't-muted', text: sub }, svg);
      S('line', { x1: x0, y1: y + 16, x2: x0 + cw * vals.length, y2: y + 16, stroke: 'var(--border)' }, svg);
      vals.forEach((v, i) => S('rect', { x: x0 + i * cw + 0.5, y: v > 0 ? y : y + 16, width: cw - 1, height: 16, fill: `var(--${color})`, opacity: v > 0 ? 0.9 : 0.55 }, svg));
    }
    function draw() {
      clear(svg);
      const bits = (input.value.replace(/[^01]/g, '') || '1').slice(0, 4).split('').map(Number);
      const n = bits.length, chips = n * 11, x0 = 120, cw = Math.min(26, 580 / chips);
      const data = [], code = [], prod = [];
      bits.forEach(b => { for (let k = 0; k < 11; k++) { const d = b ? 1 : -1; data.push(d); code.push(BARKER[k]); prod.push(d * BARKER[k]); } });
      wave(60, data, 'green', '原始資料', '1 bit = 11 chips 寬', x0, cw);
      bits.forEach((b, i) => S('text', { x: x0 + (i * 11 + 5.5) * cw, y: 32, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, cls: 't-mono', text: b }, svg));
      wave(140, code, 'orange', '× Barker 碼', '+1 −1 +1 +1 −1 +1 +1 +1 −1 −1 −1', x0, cw);
      wave(220, prod, 'accent', '= 送出的 chips', '11 Mchip/s', x0, cw);
      for (let i = 1; i < n; i++) S('line', { x1: x0 + i * 11 * cw, y1: 40, x2: x0 + i * 11 * cw, y2: 260, stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, svg);
      // spectrum
      const sy = 410, sx = 120, sw = 560;
      S('text', { x: 10, y: 300, 'font-size': 13, 'font-weight': 700, text: '頻譜（示意）' }, svg);
      S('line', { x1: sx, y1: sy, x2: sx + sw, y2: sy, stroke: 'var(--muted)' }, svg);
      const curve = (bw, h) => {
        let d = '';
        for (let i = 0; i <= 200; i++) {
          const f = (i / 200 - 0.5) * 2;
          const u = f / bw * Math.PI;
          const s = Math.abs(u) < 1e-6 ? 1 : Math.sin(u) / u;
          d += (i ? ' L' : 'M') + (sx + i / 200 * sw).toFixed(1) + ' ' + (sy - h * s * s).toFixed(1);
        }
        return d;
      };
      S('path', { d: curve(0.09, 100), fill: 'none', stroke: 'var(--green)', 'stroke-width': 2.5 }, svg);
      S('path', { d: curve(0.9, 100 / 11 * 1.8), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }, svg);
      S('text', { x: sx + sw / 2 + 30, y: sy - 90, 'font-size': 12, fill: 'var(--green)', 'font-weight': 600, text: '原始：頻寬窄、功率密度高' }, svg);
      S('text', { x: sx + sw - 4, y: sy - 26, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--accent)', 'font-weight': 600, text: '展頻後：頻寬變寬 11 倍、功率密度變低' }, svg);
      S('text', { x: sx + sw, y: sy + 16, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: '頻率 →' }, svg);
    }
    input.addEventListener('input', draw);
    draw();
  })();

  /* ---------- 10. 自相關 ---------- */
  (function corr() {
    const svg = svgRoot(document.getElementById('fig-corr'), 720, 330, 'Barker 自相關');
    const slider = document.getElementById('corr-shift');
    const val = document.getElementById('corr-val');
    const ac = s => { let sum = 0; for (let i = 0; i < 11; i++) { const j = i - s; if (j >= 0 && j < 11) sum += BARKER[i] * BARKER[j]; } return sum; };
    function draw() {
      clear(svg);
      const s = +slider.value, cw = 22, x0 = 250;
      const row = (y, label, off, color) => {
        S('text', { x: 20, y: y + 16, 'font-size': 13, 'font-weight': 700, text: label }, svg);
        BARKER.forEach((v, i) => {
          const x = x0 + (i + off) * cw;
          S('rect', { x, y, width: cw - 2, height: 24, rx: 3, fill: `var(--${color})`, opacity: v > 0 ? 0.9 : 0.4 }, svg);
          S('text', { x: x + cw / 2 - 1, y: y + 17, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fff', text: v > 0 ? '+' : '−' }, svg);
        });
      };
      S('text', { x: 360, y: 18, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '把收到的 chips 和 Barker 逐位相乘再加總' }, svg);
      row(30, '本地 Barker', 0, 'orange');
      row(64, `收到（位移 ${s}）`, s, 'accent');
      let prods = [];
      for (let i = 0; i < 11; i++) { const j = i - s; if (j >= 0 && j < 11) prods.push([i, BARKER[i] * BARKER[j]]); }
      prods.forEach(([i, p]) => S('text', { x: x0 + i * cw + cw / 2 - 1, y: 112, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: p > 0 ? 'var(--green)' : 'var(--red)', text: p > 0 ? '+1' : '−1' }, svg));
      const v = ac(s);
      S('text', { x: 20, y: 112, 'font-size': 13, 'font-weight': 700, text: `乘積總和 = ${v}` }, svg);
      // chart
      const cy0 = 290, scale = 11, bx0 = 60, bw = 28;
      S('line', { x1: bx0 - 10, y1: cy0, x2: bx0 + 21 * bw, y2: cy0, stroke: 'var(--muted)' }, svg);
      for (let k = -10; k <= 10; k++) {
        const c = ac(k), x = bx0 + (k + 10) * bw, h = c / 11 * 140;
        S('rect', { x, y: h >= 0 ? cy0 - h : cy0, width: bw - 6, height: Math.max(2, Math.abs(h)), rx: 2, fill: k === s ? 'var(--orange)' : 'var(--accent)', opacity: k === s ? 1 : 0.55 }, svg);
        if (k % 5 === 0) S('text', { x: x + (bw - 6) / 2, y: cy0 + 16, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: k }, svg);
      }
      S('text', { x: bx0 + 10 * bw + (bw - 6) / 2, y: cy0 - 146, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: '+11' }, svg);
      S('text', { x: bx0 + 21 * bw + 4, y: cy0 + 4, 'font-size': 10, cls: 't-muted', text: '位移' }, svg);
      void scale;
      val.textContent = `相關值 ${v}`;
    }
    slider.addEventListener('input', draw);
    draw();
  })();

  /* ---------- 10b. chip 錯誤與多數決 ---------- */
  (function noise() {
    const host = document.getElementById('fig-noise');
    if (!host) return;
    const svg = svgRoot(host, 720, 250, 'chip 錯誤與相關值');
    const out = document.getElementById('noise-out');
    const range = document.getElementById('noise-k');
    const ORDER = [1, 5, 9, 3, 7, 0, 10, 2, 6, 4, 8]; // 依序被翻掉的 chip
    let bit = 1;
    const X0 = 130, CW = 48;
    function row(y, label, vals, colorOf) {
      S('text', { x: X0 - 14, y: y + 24, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 700, text: label }, svg);
      vals.forEach((v, i) => {
        const col = colorOf(i, v);
        S('rect', { x: X0 + i * CW, y, width: CW - 6, height: 36, rx: 5, fill: `var(--${col}-soft)`, stroke: `var(--${col})`, 'stroke-width': 1.5 }, svg);
        S('text', { x: X0 + i * CW + (CW - 6) / 2, y: y + 24, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: v > 0 ? '+1' : '−1' }, svg);
      });
    }
    function draw() {
      clear(svg);
      const k = +range.value, sign = bit ? 1 : -1;
      const flipped = new Set(ORDER.slice(0, k));
      const sent = BARKER.map(c => c * sign);
      const recv = sent.map((c, i) => (flipped.has(i) ? -c : c));
      const prod = recv.map((c, i) => c * BARKER[i]);
      const sum = prod.reduce((a, b) => a + b, 0);
      const dec = sum > 0 ? 1 : sum < 0 ? 0 : null;
      for (let i = 0; i < 11; i++) S('text', { x: X0 + i * CW + (CW - 6) / 2, y: 22, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: `chip ${i + 1}` }, svg);
      row(32, `送出（資料 ${bit}）`, sent, () => 'accent');
      row(84, '收到', recv, i => (flipped.has(i) ? 'red' : 'accent'));
      row(136, '× Barker', prod, (i, v) => (v > 0 ? 'green' : 'red'));
      const ok = dec === bit;
      S('text', { x: X0, y: 205, 'font-size': 15, 'font-weight': 700, text: `相關值 = ${bit ? '' : '−'}(11 − 2 × ${k}) = ${sum > 0 ? '+' : ''}${sum}` }, svg);
      S('text', { x: X0, y: 232, 'font-size': 15, 'font-weight': 700, fill: ok ? 'var(--green)' : 'var(--red)',
        text: dec === null ? '→ 無法判斷' : `→ 判定為資料 ${dec}　${ok ? '✓ 正確還原' : '✗ 判錯（錯超過 5 個 chip）'}` }, svg);
      out.textContent = `紅色 chip：被雜訊翻掉（和應有的 Barker 碼不同），共 ${k} 個\n` +
        `相關值的正負決定 bit：資料 1 → 正、資料 0 → 負；錯 ≤ 5 個都能還原`;
    }
    range.addEventListener('input', draw);
    segButtons(document.getElementById('noise-bit'), v => { bit = +v; draw(); });
    draw();
  })();

  /* ---------- 11. dB ---------- */
  (function db() {
    const p1 = document.getElementById('db-p1'), p2 = document.getElementById('db-p2'), mw = document.getElementById('db-mw');
    const out = document.getElementById('db-out');
    function upd() {
      const a = +p1.value, b = +p2.value, m = +mw.value;
      const r = a > 0 && b > 0 ? 10 * Math.log10(a / b) : NaN;
      const dbm = m > 0 ? 10 * Math.log10(m) : NaN;
      out.textContent =
        `功率比：10 log10(${a} / ${b}) = ${isNaN(r) ? '—' : r.toFixed(2)} dB\n` +
        `${m} mW = 10 log10(${m} / 1 mW) = ${isNaN(dbm) ? '—' : dbm.toFixed(2)} dBm\n` +
        `Barker 處理增益：10 log10(11) = ${(10 * Math.log10(11)).toFixed(2)} dB`;
    }
    [p1, p2, mw].forEach(e => e.addEventListener('input', upd));
    upd();
  })();

  /* ---------- 12. 頻道 ---------- */
  (function channels() {
    const svg = svgRoot(document.getElementById('fig-ch'), 720, 250, '2.4GHz DSSS 頻道');
    const msg = document.getElementById('ch-msg');
    const REG = { fcc: [1, 11, 'FCC（美國）、IC（加拿大）：頻道 1–11'], etsi: [1, 13, 'ETSI（歐洲）：頻道 1–13'], mkk: [14, 14, '日本 MKK：只有頻道 14（2484MHz）'], newmkk: [1, 14, '日本新 MKK：頻道 1–14'], fr: [10, 13, '法國：頻道 10–13'], es: [10, 11, '西班牙：頻道 10–11'] };
    let region = 'fcc', nonOver = false, sel = null;
    const fx = f => 40 + (f - 2395) / (2500 - 2395) * 650;
    const fc = n => n === 14 ? 2484 : 2407 + 5 * n;
    function draw() {
      clear(svg);
      const [lo, hi, label] = REG[region];
      const base = 190;
      S('line', { x1: fx(2395), y1: base, x2: fx(2500), y2: base, stroke: 'var(--muted)', 'stroke-width': 1.5 }, svg);
      [2400, 2420, 2440, 2460, 2480, 2500].forEach(f => {
        S('line', { x1: fx(f), y1: base, x2: fx(f), y2: base + 6, stroke: 'var(--muted)' }, svg);
        S('text', { x: fx(f), y: base + 20, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: f }, svg);
      });
      S('text', { x: fx(2500), y: base + 36, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: 'MHz' }, svg);
      S('rect', { x: fx(2400), y: base + 26, width: fx(2483.5) - fx(2400), height: 6, rx: 3, fill: 'var(--border)' }, svg);
      for (let n = 1; n <= 14; n++) {
        const f = fc(n), ok = n >= lo && n <= hi;
        const hl = nonOver && [1, 6, 11].includes(n);
        const h = hl ? 120 : 90 + (n % 2) * 14;
        const x1 = fx(f - 11), x2 = fx(f + 11), xm = fx(f);
        const g = S('g', { cls: 'hit' }, svg);
        S('path', { d: `M${x1} ${base} C${x1 + 10} ${base - h} ${x2 - 10} ${base - h} ${x2} ${base} Z`, fill: hl ? 'var(--orange)' : ok ? 'var(--accent)' : 'var(--muted)', opacity: hl ? 0.45 : ok ? (nonOver ? 0.08 : 0.16) : 0.05, stroke: hl ? 'var(--orange)' : ok ? 'var(--accent)' : 'var(--border)', 'stroke-width': sel === n ? 3 : 1.4 }, g);
        S('text', { x: xm, y: base - h * 0.75 - 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: n, fill: ok ? 'var(--fg)' : 'var(--muted)' }, g);
        g.addEventListener('click', () => {
          sel = n; draw();
          const ov = [];
          for (let m = 1; m <= 14; m++) if (m !== n && Math.abs(fc(m) - f) < 22) ov.push(m);
          msg.textContent = `頻道 ${n}：中心 ${f} MHz${n === 14 ? '（特例，與 13 相隔 12MHz）' : ''}。與它頻譜重疊（相距 < 22MHz）的頻道：${ov.join('、') || '無'}。${ok ? '' : '這個地區不能用。'}`;
        });
      }
      S('text', { x: 40, y: 22, 'font-size': 13, 'font-weight': 600, text: label }, svg);
      if (nonOver) S('text', { x: 40, y: 42, 'font-size': 12, fill: 'var(--orange)', 'font-weight': 600, text: '1、6、11：中心相隔 25MHz，互不重疊 → 同地點最多 3 個 BSS' }, svg);
    }
    segButtons(document.getElementById('ch-region'), v => { region = v; sel = null; draw(); msg.textContent = REG[v][2] + '。點選頻道看重疊情形。'; });
    const btn = document.getElementById('ch-nonover');
    btn.addEventListener('click', () => { nonOver = !nonOver; btn.classList.toggle('on', nonOver); draw(); });
    msg.textContent = REG[region][2] + '。點選頻道看重疊情形。';
    draw();
  })();

  /* ---------- 13. PLCP ---------- */
  (function plcp() {
    const svg = svgRoot(document.getElementById('fig-plcp'), 720, 190, '802.11b PLCP 訊框');
    const msg = document.getElementById('plcp-msg');
    const DESC = {
      SYNC: '同步欄位：Long 為 128 個 1（Short 為 56 bits，補充），經過 scrambler 擾亂；讓接收端鎖定時脈並與 PN code 相關。',
      SFD: '16 bits，固定值 hF3A0（Short PLCP 為反轉的 h05CF，補充）；用於位元同步。',
      SIGNAL: '8 bits，速率代碼（單位 100 kbps）：h0A = 1M、h14 = 2M、h37 = 5.5M、h6E = 11M。',
      SERVICE: '8 bits，h00 表示符合 802.11；bit 2 locked clock、bit 3 調變選擇（0 CCK / 1 PBCC）、bit 7 長度延伸。',
      LENGTH: '16 bits，傳送 PSDU 所需的微秒數；用於訊框結束偵測、低速站台的 virtual carrier sense、MPDU CRC 同步。',
      CRC: '16 bits，CCITT CRC-16，保護 SIGNAL、SERVICE、LENGTH。',
      PSDU: 'PSDU／MPDU：Long 可用 1、2、5.5、11 Mbps；Short 可用 2、5.5、11 Mbps。',
    };
    let mode = 'long';
    function draw() {
      clear(svg);
      const k = 2.3; // px per μs
      const L = mode === 'long';
      const F = L ? [['SYNC', 128, 'orange'], ['SFD', 16, 'orange'], ['SIGNAL', 8, 'accent'], ['SERVICE', 8, 'accent'], ['LENGTH', 16, 'accent'], ['CRC', 16, 'accent']]
        : [['SYNC', 56, 'orange'], ['SFD', 16, 'orange'], ['SIGNAL', 4, 'accent'], ['SERVICE', 4, 'accent'], ['LENGTH', 8, 'accent'], ['CRC', 8, 'accent']];
      const bits = L ? [128, 16, 8, 8, 16, 16] : [56, 16, 8, 8, 16, 16];
      let x = 20; const y = 60;
      F.forEach(([n, us, c], i) => {
        const w = us * k;
        const g = S('g', { cls: 'hit' }, svg);
        S('rect', { x, y, width: w - 2, height: 40, rx: 3, fill: `var(--${c}-soft)`, stroke: `var(--${c})` }, g);
        if (w > 34) S('text', { x: x + w / 2 - 1, y: y + 25, 'text-anchor': 'middle', 'font-size': w > 60 ? 13 : 9.5, 'font-weight': 700, text: n }, g);
        S('text', { x: x + w / 2 - 1, y: y + 56, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: w > 24 ? bits[i] + 'b' : '' }, g);
        g.addEventListener('click', () => { msg.innerHTML = `<b>${n}</b>：${DESC[n]}`; });
        x += w;
      });
      const pre = (L ? 144 : 72) * k, hdr = (L ? 48 : 24) * k;
      const brace = (x1, x2, t, c) => {
        S('path', { d: `M${x1} ${y - 6} L${x1} ${y - 14} L${x2 - 2} ${y - 14} L${x2 - 2} ${y - 6}`, fill: 'none', stroke: `var(--${c})`, 'stroke-width': 1.5 }, svg);
        S('text', { x: (x1 + x2) / 2, y: y - 20, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: `var(--${c})`, text: t }, svg);
      };
      brace(20, 20 + pre, `Preamble ${L ? 144 : 72} bits @1 Mbps = ${L ? 144 : 72} μs`, 'orange');
      brace(20 + pre, 20 + pre + hdr, `Header 48 bits @${L ? 1 : 2} Mbps = ${L ? 48 : 24} μs`, 'accent');
      const g = S('g', { cls: 'hit' }, svg);
      S('rect', { x, y, width: 690 - x, height: 40, rx: 3, fill: 'var(--green-soft)', stroke: 'var(--green)' }, g);
      S('text', { x: (x + 690) / 2, y: y + 25, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: 'PSDU / MPDU' }, g);
      g.addEventListener('click', () => { msg.innerHTML = `<b>PSDU</b>：${DESC.PSDU}`; });
      S('line', { x1: 20, y1: 140, x2: 20 + pre + hdr, y2: 140, stroke: 'var(--purple)', 'stroke-width': 3 }, svg);
      S('text', { x: 20 + (pre + hdr) / 2, y: 160, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: 'var(--purple)', text: `PLCP overhead = ${L ? 192 : 96} μs` }, svg);
      S('text', { x: 690, y: 160, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: '寬度依實際傳送時間（μs）等比例' }, svg);
    }
    segButtons(document.getElementById('plcp-mode'), v => { mode = v; draw(); });
    draw();
  })();

  /* ---------- 14. ASK / FSK / PSK ---------- */
  (function keying() {
    const svg = svgRoot(document.getElementById('fig-keying'), 720, 320, 'ASK、FSK、PSK 波形');
    const bits = [1, 0, 1, 1, 0], x0 = 90, bw = 120;
    bits.forEach((b, i) => {
      S('text', { x: x0 + i * bw + bw / 2, y: 20, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, cls: 't-mono', text: b }, svg);
      S('line', { x1: x0 + i * bw, y1: 28, x2: x0 + i * bw, y2: 310, stroke: 'var(--border)', 'stroke-dasharray': '3 3' }, svg);
    });
    S('line', { x1: x0 + 5 * bw, y1: 28, x2: x0 + 5 * bw, y2: 310, stroke: 'var(--border)', 'stroke-dasharray': '3 3' }, svg);
    const rows = [
      ['ASK', 'accent', (b, u) => (b ? 1 : 0.25) * Math.sin(2 * Math.PI * 2 * u)],
      ['FSK', 'orange', (b, u) => Math.sin(2 * Math.PI * (b ? 3 : 1) * u)],
      ['PSK', 'green', (b, u) => Math.sin(2 * Math.PI * 2 * u + (b ? 0 : Math.PI))],
    ];
    rows.forEach(([n, c, f], r) => {
      const cy = 75 + r * 90, A = 30;
      S('text', { x: 20, y: cy + 5, 'font-size': 15, 'font-weight': 700, text: n, fill: `var(--${c})` }, svg);
      S('line', { x1: x0, y1: cy, x2: x0 + 5 * bw, y2: cy, stroke: 'var(--border)' }, svg);
      let d = '';
      bits.forEach((b, i) => {
        for (let s = 0; s <= 60; s++) {
          const u = s / 60;
          d += (d ? ' L' : 'M') + (x0 + i * bw + u * bw).toFixed(1) + ' ' + (cy - A * f(b, u)).toFixed(1);
        }
      });
      S('path', { d, fill: 'none', stroke: `var(--${c})`, 'stroke-width': 2.2 }, svg);
    });
  })();

  /* ---------- 15. DBPSK / DQPSK ---------- */
  (function dpsk() {
    const fig = document.getElementById('fig-dpsk-wrap');
    const svg = svgRoot(document.getElementById('fig-dpsk'), 720, 300, 'DBPSK 與 DQPSK 相位旋轉');
    const input = document.getElementById('dpsk-bits');
    let mode = 'q', syms = [];
    const MAPQ = { '00': 0, '01': 90, '11': 180, '10': 270 };
    const MAPB = { 0: 0, 1: 180 };
    const cx = 140, cy = 150, R = 105;
    const stat = S('g', null, svg), dyn = S('g', null, svg);
    function build() {
      let bits = input.value.replace(/[^01]/g, '') || '0';
      if (mode === 'q' && bits.length % 2) bits += '0';
      syms = [];
      let ph = 0;
      const step = mode === 'q' ? 2 : 1;
      for (let i = 0; i < bits.length && syms.length < 8; i += step) {
        const s = bits.substr(i, step);
        const d = mode === 'q' ? MAPQ[s] : MAPB[s];
        syms.push({ s, d, from: ph, to: (ph + d) % 360 });
        ph = (ph + d) % 360;
      }
      clear(stat);
      S('circle', { cx, cy, r: R, fill: 'none', stroke: 'var(--border)' }, stat);
      S('line', { x1: cx - R - 14, y1: cy, x2: cx + R + 14, y2: cy, stroke: 'var(--muted)' }, stat);
      S('line', { x1: cx, y1: cy - R - 14, x2: cx, y2: cy + R + 14, stroke: 'var(--muted)' }, stat);
      S('text', { x: cx + R + 16, y: cy + 4, 'font-size': 11, cls: 't-muted', text: 'I' }, stat);
      S('text', { x: cx + 5, y: cy - R - 6, 'font-size': 11, cls: 't-muted', text: 'Q' }, stat);
      (mode === 'q' ? [0, 90, 180, 270] : [0, 180]).forEach(a => {
        const r = a * Math.PI / 180;
        S('circle', { cx: cx + R * Math.cos(r), cy: cy - R * Math.sin(r), r: 7, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2 }, stat);
      });
      // table header
      S('text', { x: 300, y: 30, 'font-size': 13, 'font-weight': 700, text: mode === 'q' ? '雙位元 (d0 d1)' : '位元' }, stat);
      S('text', { x: 440, y: 30, 'font-size': 13, 'font-weight': 700, text: '相位變化 Δφ' }, stat);
      S('text', { x: 570, y: 30, 'font-size': 13, 'font-weight': 700, text: '目前相位 φ' }, stat);
    }
    const fmt = a => ({ 0: '0', 90: 'π/2', 180: 'π', 270: '3π/2' }[a]);
    function render(t) {
      clear(dyn);
      const n = syms.length, slot = 10 / n;
      const idx = Math.min(n - 1, Math.floor(t / slot));
      const local = (t - idx * slot) / slot;
      const sy = syms[idx];
      const p = prog(local, 0.1, 0.6);
      const ang = (sy.from + sy.d * p) * Math.PI / 180;
      // arc showing Δφ
      if (sy.d > 0) {
        const r0 = 38, a0 = sy.from * Math.PI / 180, a1 = ang;
        const large = sy.d * p > 180 ? 1 : 0;
        S('path', { d: `M${cx + r0 * Math.cos(a0)} ${cy - r0 * Math.sin(a0)} A${r0} ${r0} 0 ${large} 0 ${cx + r0 * Math.cos(a1)} ${cy - r0 * Math.sin(a1)}`, fill: 'none', stroke: 'var(--orange)', 'stroke-width': 3 }, dyn);
      }
      S('line', { x1: cx, y1: cy, x2: cx + R * Math.cos(ang), y2: cy - R * Math.sin(ang), stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round' }, dyn);
      S('circle', { cx: cx + R * Math.cos(ang), cy: cy - R * Math.sin(ang), r: 8, fill: 'var(--accent)' }, dyn);
      S('text', { x: cx, y: cy + R + 36, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: `輸入 ${sy.s} → 轉 ${fmt(sy.d)}` }, dyn);
      syms.forEach((s, i) => {
        const y = 56 + i * 28;
        const cur = i === idx, done = i < idx;
        if (cur) S('rect', { x: 290, y: y - 18, width: 410, height: 26, rx: 5, fill: 'var(--accent-soft)' }, dyn);
        const op = cur || done ? 1 : 0.35;
        S('text', { x: 300, y, 'font-size': 14, 'font-weight': 700, cls: 't-mono', text: s.s, opacity: op }, dyn);
        S('text', { x: 440, y, 'font-size': 14, cls: 't-mono', text: fmt(s.d), fill: 'var(--orange)', opacity: op }, dyn);
        S('text', { x: 570, y, 'font-size': 14, cls: 't-mono', text: done || (cur && p >= 1) ? fmt(s.to) : '…', opacity: op }, dyn);
      });
    }
    build();
    const tl = Timeline(fig, { duration: 10, render, format: t => `符號 ${Math.min(syms.length, Math.floor(t / (10 / syms.length)) + 1)} / ${syms.length}`, controlsAfter: fig.querySelector('.fig-body') });
    input.addEventListener('input', () => { build(); tl.redraw(); });
    segButtons(document.getElementById('dpsk-mode'), v => { mode = v; build(); tl.pause(); tl.set(0); });
  })();

  /* ---------- 17. 天線增益與輻射場型 ---------- */
  (function antenna() {
    const host = document.getElementById('fig-ant');
    if (!host) return;
    const svg = svgRoot(host, 720, 340, '天線增益與輻射場型');
    const out = document.getElementById('ant-out');
    const K = 28, L = { x: 185, y: 180 }, R = { x: 540, y: 180 };
    // 全向：P(ψ) = D·|cos ψ|^n（ψ 為仰角），D 由 n 積分求得；指向：P = D·cos^a ψ（前半球），背瓣 −20 dB
    const TYPES = {
      o2: { omni: true, n: 2.5, name: '全向（偶極）2 dBi' },
      o5: { omni: true, n: 14, name: '全向 5 dBi' },
      o9: { omni: true, n: 100, name: '全向 9 dBi' },
      d14: { omni: false, a: 12, D: Math.pow(10, 1.4), name: '指向（平板）14 dBi' },
    };
    function directivity(n) {
      let sum = 0; const N = 2000;
      for (let i = 0; i < N; i++) { const p = -Math.PI / 2 + (i + 0.5) * Math.PI / N; sum += Math.pow(Math.cos(p), n + 1) * Math.PI / N; }
      return 2 / sum;
    }
    Object.values(TYPES).forEach(t => { if (t.omni) t.D = directivity(t.n); });
    const FLOOR = 0.03; // 約 −15 dBi 的旁瓣下限
    function gain(t, psi) {
      const c = Math.cos(psi);
      if (t.omni) return Math.max(t.D * Math.pow(Math.abs(c), t.n), FLOOR);
      return c > 0 ? Math.max(t.D * Math.pow(c, t.a), t.D * 0.01) : t.D * 0.01;
    }
    function shape(cx, cy, f) {
      let d = '';
      for (let deg = 0; deg <= 360; deg += 1) {
        const psi = deg * Math.PI / 180, r = K * Math.sqrt(f(psi));
        d += (deg ? 'L' : 'M') + (cx + r * Math.cos(psi)).toFixed(1) + ' ' + (cy - r * Math.sin(psi)).toFixed(1);
      }
      return d + 'Z';
    }
    let cur = 'o2';
    function draw() {
      clear(svg);
      const t = TYPES[cur], col = t.omni ? 'accent' : 'orange';
      [[L, '側視（垂直切面）'], [R, '俯視（水平切面）']].forEach(([c, title]) => {
        S('text', { x: c.x, y: 24, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, text: title }, svg);
        S('circle', { cx: c.x, cy: c.y, r: K, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, svg);
      });
      S('line', { x1: 362, y1: 40, x2: 362, y2: 330, stroke: 'var(--border)' }, svg);
      // 側視：樓板
      [[L.y - 80, '樓上'], [L.y + 80, '樓下']].forEach(([y, s]) => {
        S('line', { x1: 30, y1: y, x2: 340, y2: y, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '10 5', opacity: 0.6 }, svg);
        S('text', { x: 34, y: y - 6, 'font-size': 12, cls: 't-muted', text: s }, svg);
      });
      S('path', { d: shape(L.x, L.y, p => gain(t, p)), fill: `var(--${col})`, opacity: 0.25, stroke: `var(--${col})`, 'stroke-width': 2 }, svg);
      S('path', { d: shape(R.x, R.y, p => (t.omni ? t.D : gain(t, p))), fill: `var(--${col})`, opacity: 0.25, stroke: `var(--${col})`, 'stroke-width': 2 }, svg);
      if (t.omni) {
        S('line', { x1: L.x, y1: L.y - 16, x2: L.x, y2: L.y + 16, stroke: 'var(--fg)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
        S('circle', { cx: R.x, cy: R.y, r: 5, fill: 'var(--fg)' }, svg);
      } else {
        S('rect', { x: L.x - 6, y: L.y - 14, width: 6, height: 28, fill: 'var(--fg)' }, svg);
        S('rect', { x: R.x - 6, y: R.y - 14, width: 6, height: 28, fill: 'var(--fg)' }, svg);
      }
      S('text', { x: L.x + K + 4, y: L.y + K + 14, 'font-size': 11, cls: 't-muted', text: '0 dBi' }, svg);
      const hp = t.omni ? Math.acos(Math.pow(0.5, 1 / t.n)) : Math.acos(Math.pow(0.5, 1 / t.a));
      const bw = (2 * hp * 180 / Math.PI).toFixed(0);
      out.textContent =
        `${t.name}　峰值增益 ${(10 * Math.log10(t.D)).toFixed(1)} dBi\n` +
        `水平涵蓋：${t.omni ? '360°' : bw + '°（半功率波束寬）'}　垂直半功率波束寬：約 ${bw}°\n` +
        `主方向相對距離（自由空間）：0 dBi 的 ${Math.sqrt(t.D).toFixed(2)} 倍` +
        (t.omni ? (cur === 'o2' ? '\n場型最「圓」：上下樓也收得到，但水平距離最短' : '\n場型被壓扁：同層更遠，但樓上、樓下明顯變弱') : '\n能量集中在一個方向：適合點對點，背面幾乎收不到');
    }
    segButtons(document.getElementById('ant-type'), v => { cur = v; draw(); });
    draw();
    document.addEventListener('themechange', draw);
  })();
})();
