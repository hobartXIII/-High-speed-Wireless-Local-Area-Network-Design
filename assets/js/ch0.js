/* 第 0 章：涵蓋範圍、拓樸動畫、OSI、封裝動畫、SDU/PDU、速率演進 */
(function () {
  const { S, clear, svgRoot, arrowDefs, Timeline, lerp, prog, reducedMotion } = WL;

  /* ---------- 共用：沿折線取點 ---------- */
  function along(pts, p) {
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(d); total += d;
    }
    let target = p * total;
    for (let i = 0; i < seg.length; i++) {
      if (target <= seg[i] || i === seg.length - 1) {
        const q = seg[i] ? Math.min(1, target / seg[i]) : 0;
        return [lerp(pts[i][0], pts[i + 1][0], q), lerp(pts[i][1], pts[i + 1][1], q)];
      }
      target -= seg[i];
    }
    return pts[pts.length - 1];
  }

  /* ---------- 1. 涵蓋範圍 ---------- */
  (function scale() {
    const svg = svgRoot(document.getElementById('fig-scale'), 720, 260, 'PAN、LAN、MAN、WAN 的涵蓋範圍');
    const cx = 170, cy = 130;
    const rings = [
      { r: 120, n: 'WAN 廣域', d: '跨城市、跨國', c: 'purple' },
      { r: 86, n: 'MAN 都會', d: '802.16、802.6', c: 'orange' },
      { r: 54, n: 'LAN 區域', d: '802.3、802.11（1–5 km）', c: 'accent' },
      { r: 24, n: 'PAN', d: '802.15（數公尺）', c: 'green' },
    ];
    rings.forEach(o => S('circle', { cx, cy, r: o.r, fill: `var(--${o.c}-soft)`, stroke: `var(--${o.c})`, 'stroke-width': 1.5 }, svg));
    rings.forEach((o, i) => {
      const y = 40 + i * 56;
      S('line', { x1: cx + o.r * 0.7, y1: cy - o.r * 0.7 + (i === 3 ? 6 : 0), x2: 330, y2: y, stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, svg);
      S('circle', { cx: 336, cy: y, r: 5, fill: `var(--${o.c})` }, svg);
      S('text', { x: 350, y: y + 5, 'font-size': 15, 'font-weight': 700, text: o.n }, svg);
      S('text', { x: 470, y: y + 5, 'font-size': 13, cls: 't-muted', text: o.d }, svg);
    });
  })();

  /* ---------- 2. 拓樸動畫 ---------- */
  (function topologies() {
    const host = document.getElementById('fig-topo');
    const info = document.getElementById('topo-info');
    const W = 200, H = 160;
    const svg = svgRoot(host, W * 3, H * 3, '九種網路拓樸');
    const ring = (n, r, cx = 100, cy = 78, off = -Math.PI / 2) =>
      Array.from({ length: n }, (_, i) => [cx + r * Math.cos(off + i * 2 * Math.PI / n), cy + r * Math.sin(off + i * 2 * Math.PI / n)]);

    const T = [];
    // Star
    (function () {
      const hub = [100, 78], ns = ring(5, 52);
      T.push({
        name: 'Star 星狀', std: 'Single Star：802.12 100VG-AnyLAN、ATM、802.16 WMAN。所有站台接到中心（hub／switch），由中心轉送。',
        nodes: ns, hub: [hub], edges: ns.map(n => [n, hub]),
        dots: p => [along([ns[0], hub, ns[2]], p)],
      });
    })();
    // Bus
    (function () {
      const xs = [30, 70, 110, 150, 170];
      const ns = xs.map((x, i) => [x, i % 2 ? 110 : 46]);
      const edges = ns.map(n => [n, [n[0], 78]]);
      edges.push([[14, 78], [186, 78]]);
      T.push({
        name: 'Bus 匯流排', std: 'Single Bus：802.3 CSMA/CD、802.4 Token-Bus。共用一條線，一個站台送出的訊號會傳到整條線（廣播）。',
        nodes: ns, edges, terms: [[14, 78], [186, 78]],
        dots: p => [[lerp(70, 14, p), 78], [lerp(70, 186, p), 78], [70, lerp(110, 78, Math.min(1, p * 5))]].slice(0, p < .2 ? 3 : 2),
      });
    })();
    // Ring
    (function () {
      const ns = ring(6, 52);
      T.push({
        name: 'Ring 環狀', std: 'Single Ring：802.5 Token Ring。首尾相連，訊框（或權杖）沿單一方向繞行。',
        nodes: ns, circle: [[100, 78, 52]],
        dots: p => [[100 + 52 * Math.cos(-Math.PI / 2 + p * 2 * Math.PI), 78 + 52 * Math.sin(-Math.PI / 2 + p * 2 * Math.PI)]],
      });
    })();
    // Dual ring
    (function () {
      const ns = ring(5, 52);
      T.push({
        name: 'Dual Ring 雙環', std: 'Dual Ring：FDDI、FDDI-II（ANSI 標準）。兩個方向相反的環，一個環斷了還能用另一個。',
        nodes: ns, circle: [[100, 78, 52], [100, 78, 40]],
        dots: p => [
          [100 + 52 * Math.cos(-Math.PI / 2 + p * 2 * Math.PI), 78 + 52 * Math.sin(-Math.PI / 2 + p * 2 * Math.PI)],
          [100 + 40 * Math.cos(-Math.PI / 2 - p * 2 * Math.PI), 78 + 40 * Math.sin(-Math.PI / 2 - p * 2 * Math.PI)],
        ],
      });
    })();
    // Tree
    (function () {
      const r = [100, 26], a = [55, 78], b = [145, 78];
      const l = [[30, 128], [80, 128], [120, 128], [170, 128]];
      T.push({
        name: 'Tree 樹狀', std: 'Tree：多個 bus／star 以階層方式串接。',
        nodes: [r, a, b, ...l], edges: [[r, a], [r, b], [a, l[0]], [a, l[1]], [b, l[2]], [b, l[3]]],
        dots: p => [along([l[0], a, r, b, l[3]], p)],
      });
    })();
    // Dual bus
    (function () {
      const xs = [40, 80, 120, 160];
      const ns = xs.map(x => [x, 128]);
      const edges = [[[16, 52], [184, 52]], [[16, 92], [184, 92]]];
      ns.forEach(n => { edges.push([[n[0] - 6, 52], [n[0] - 6, 118]]); edges.push([[n[0] + 6, 92], [n[0] + 6, 118]]); });
      T.push({
        name: 'Dual Bus 雙匯流排', std: 'Dual Bus：802.6 DQDB（都會網路）。兩條方向相反的匯流排。',
        nodes: ns, edges,
        dots: p => [[lerp(16, 184, p), 52], [lerp(184, 16, p), 92]],
      });
    })();
    // Mesh
    (function () {
      const ns = [[40, 40], [100, 24], [160, 44], [56, 120], [144, 124], [100, 82]];
      const e = [[0, 1], [1, 2], [0, 3], [2, 4], [3, 4], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5]];
      T.push({
        name: 'Mesh 網狀', std: 'Mesh：ATM、802.15.1、802.15.4、802.15.6 WBAN；802.11s 也是 mesh。多條路徑，可多跳轉送。<br><span class="sup">補充</span>ATM 的主機以星狀接到交換器，交換器之間才是網狀互連。',
        nodes: ns, edges: e.map(([i, j]) => [ns[i], ns[j]]),
        dots: p => [along([ns[3], ns[5], ns[1], ns[2]], p)],
      });
    })();
    // Snowflake
    (function () {
      const c = [100, 80], subs = ring(3, 40, 100, 80);
      const leaves = [];
      const edges = subs.map(s => [c, s]);
      subs.forEach((s, i) => {
        const ang = -Math.PI / 2 + i * 2 * Math.PI / 3;
        [-0.5, 0.5].forEach(d => {
          const l = [s[0] + 30 * Math.cos(ang + d), s[1] + 30 * Math.sin(ang + d)];
          leaves.push(l); edges.push([s, l]);
        });
      });
      T.push({
        name: 'Snowflake 雪花（多重星狀）', std: 'Multiple Star：ATM、802.15.1 WPAN（piconet）、802.15.4 LR-WPAN。多個星狀網路再串起來。',
        nodes: leaves, hub: [c, ...subs], edges,
        dots: p => [along([leaves[0], subs[0], c, subs[2], leaves[5]], p)],
      });
    })();
    // Random
    (function () {
      const ns = [[40, 40], [150, 30], [96, 80], [36, 126], [160, 118], [110, 140]];
      T.push({
        name: 'Random（802.11）', std: 'Random：802.11 CSMA/CA。無線站台位置任意、還會移動，誰聽得到誰取決於距離與環境。',
        nodes: ns, radio: true,
        dots: () => [],
        wave: p => ({ c: ns[2], r: p * 90 }),
      });
    })();

    const cells = [];
    T.forEach((t, i) => {
      const gx = (i % 3) * W, gy = Math.floor(i / 3) * H;
      const g = S('g', { transform: `translate(${gx} ${gy})`, cls: 'hit', tabindex: 0, role: 'button', 'aria-label': t.name }, svg);
      S('rect', { x: 4, y: 4, width: W - 8, height: H - 8, rx: 10, fill: 'var(--surface-2)', stroke: 'var(--border)' }, g);
      const dyn = S('g');
      (t.circle || []).forEach(c => S('circle', { cx: c[0], cy: c[1], r: c[2], fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g));
      (t.edges || []).forEach(e => S('line', { x1: e[0][0], y1: e[0][1], x2: e[1][0], y2: e[1][1], stroke: 'var(--muted)', 'stroke-width': 2 }, g));
      (t.terms || []).forEach(p => S('rect', { x: p[0] - 3, y: p[1] - 7, width: 6, height: 14, fill: 'var(--fg)' }, g));
      g.appendChild(dyn);
      (t.hub || []).forEach(p => S('rect', { x: p[0] - 9, y: p[1] - 9, width: 18, height: 18, rx: 4, fill: 'var(--accent)' }, g));
      t.nodes.forEach(p => S('circle', { cx: p[0], cy: p[1], r: 8, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2.5 }, g));
      S('text', { x: W / 2, y: H - 12, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, text: t.name }, g);
      const select = () => {
        cells.forEach(c => c.g.classList.remove('sel'));
        g.classList.add('sel');
        info.innerHTML = `<b>${t.name}</b>：${t.std}`;
      };
      g.addEventListener('click', select);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
      cells.push({ g, dyn, t });
    });

    function draw(phase) {
      cells.forEach(({ dyn, t }) => {
        clear(dyn);
        if (t.wave) {
          [0, 0.5].forEach(off => {
            const w = t.wave((phase + off) % 1);
            S('circle', { cx: w.c[0], cy: w.c[1], r: w.r, fill: 'none', stroke: 'var(--orange)', 'stroke-width': 2, opacity: 1 - w.r / 90 }, dyn);
          });
        }
        t.dots(phase).forEach(d => S('circle', { cx: d[0], cy: d[1], r: 5.5, fill: 'var(--orange)' }, dyn));
      });
    }
    let raf = 0, visible = false, start = performance.now();
    const loop = now => { draw(((now - start) / 2600) % 1); if (visible) raf = requestAnimationFrame(loop); };
    if (reducedMotion()) { draw(0.35); return; }
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    }).observe(svg);
    draw(0);
  })();

  /* ---------- 3. OSI 與 IEEE 802 ---------- */
  (function osi() {
    const svg = svgRoot(document.getElementById('fig-osi'), 720, 360, 'OSI 七層與 IEEE 802 對應');
    const ar = arrowDefs(svg);
    const L = ['7 應用層 Application', '6 表達層 Presentation', '5 會議層 Session', '4 傳輸層 Transport', '3 網路層 Network', '2 鏈結層 Data Link', '1 實體層 Physical'];
    const y0 = 20, h = 44;
    L.forEach((n, i) => {
      const ieee = i >= 5;
      S('rect', { x: 20, y: y0 + i * h, width: 250, height: h - 6, rx: 6, fill: ieee ? 'var(--accent-soft)' : 'var(--surface-2)', stroke: ieee ? 'var(--accent)' : 'var(--border)' }, svg);
      S('text', { x: 36, y: y0 + i * h + 25, 'font-size': 14, 'font-weight': ieee ? 700 : 400, text: n }, svg);
    });
    // IEEE 802 detail
    const x = 400;
    const llcY = y0 + 5 * h, phyY = y0 + 6 * h;
    S('rect', { x, y: llcY - 46, width: 300, height: 40, rx: 6, fill: 'var(--accent-soft)', stroke: 'var(--accent)' }, svg);
    S('text', { x: x + 150, y: llcY - 21, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: 'LLC  802.2（共用）' }, svg);
    const macs = ['802.3', '802.4', '802.5', '802.11', '802.15', '802.16'];
    const mw = 300 / macs.length;
    macs.forEach((m, i) => {
      S('rect', { x: x + i * mw, y: llcY, width: mw - 3, height: 38, rx: 5, fill: m === '802.11' || m === '802.3' ? 'var(--orange-soft)' : 'var(--surface)', stroke: 'var(--accent)' }, svg);
      S('text', { x: x + i * mw + mw / 2 - 1, y: llcY + 24, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, text: m }, svg);
      S('rect', { x: x + i * mw, y: phyY, width: mw - 3, height: 38, rx: 5, fill: 'var(--surface)', stroke: 'var(--accent)' }, svg);
      S('text', { x: x + i * mw + mw / 2 - 1, y: phyY + 24, 'text-anchor': 'middle', 'font-size': 12, text: 'PHY' }, svg);
    });
    S('text', { x: x + 150, y: llcY - 60, 'text-anchor': 'middle', 'font-size': 13, cls: 't-muted', text: 'IEEE 802 的切法' }, svg);
    S('text', { x: x - 8, y: llcY + 24, 'text-anchor': 'end', 'font-size': 12, cls: 't-muted', text: 'MAC' }, svg);
    S('text', { x: x - 8, y: phyY + 24, 'text-anchor': 'end', 'font-size': 12, cls: 't-muted', text: 'PHY' }, svg);
    S('path', { d: `M275 ${llcY + 18} C330 ${llcY + 18} 330 ${llcY - 26} ${x - 4} ${llcY - 26}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5, 'marker-end': ar('accent') }, svg);
    S('path', { d: `M275 ${llcY + 18} C330 ${llcY + 18} 340 ${llcY + 19} ${x - 40} ${llcY + 19}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5, 'marker-end': ar('accent') }, svg);
    S('path', { d: `M275 ${phyY + 18} L${x - 40} ${phyY + 18}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5, 'marker-end': ar('accent') }, svg);
    S('text', { x: x + 150, y: phyY + 64, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '橘色：本課的兩個主角（有線 802.3、無線 802.11）' }, svg);
  })();

  /* ---------- 4. 封裝／解封裝動畫 ---------- */
  (function encap() {
    const fig = document.getElementById('fig-encap-wrap');
    const svg = svgRoot(document.getElementById('fig-encap'), 720, 420, '封裝與解封裝動畫');
    const layers = ['應用層', '表達層', '會議層', '傳輸層', '網路層', '鏈結層', '實體層'];
    const H = ['AH', 'PH', 'SH', 'TH', 'NH'];
    const y0 = 44, rh = 40, colW = 104, ax = 10, bx = 720 - 10 - colW;
    const medY = y0 + 7 * rh + 34;
    const msg = S('text', { x: 360, y: 22, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600 }, svg);
    S('text', { x: ax + colW / 2, y: y0 - 8, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '系統 A' }, svg);
    S('text', { x: bx + colW / 2, y: y0 - 8, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '系統 B' }, svg);
    const rowsA = [], rowsB = [];
    layers.forEach((n, i) => {
      const y = y0 + i * rh;
      [[ax, rowsA], [bx, rowsB]].forEach(([x, arr]) => {
        const r = S('rect', { x, y, width: colW, height: rh - 6, rx: 5, fill: 'var(--surface-2)', stroke: 'var(--border)' }, svg);
        S('text', { x: x + colW / 2, y: y + 22, 'text-anchor': 'middle', 'font-size': 13, text: n }, svg);
        arr.push(r);
      });
      S('line', { x1: ax + colW + 4, y1: y + 17, x2: bx - 4, y2: y + 17, stroke: 'var(--border)', 'stroke-dasharray': '5 4' }, svg);
    });
    S('line', { x1: ax + colW / 2, y1: y0 + 7 * rh - 6, x2: ax + colW / 2, y2: medY, stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
    S('line', { x1: bx + colW / 2, y1: y0 + 7 * rh - 6, x2: bx + colW / 2, y2: medY, stroke: 'var(--muted)', 'stroke-width': 2 }, svg);
    S('line', { x1: ax + colW / 2, y1: medY, x2: bx + colW / 2, y2: medY, stroke: 'var(--muted)', 'stroke-width': 3 }, svg);
    S('text', { x: 360, y: medY + 22, 'text-anchor': 'middle', 'font-size': 12, cls: 't-muted', text: '傳輸媒介（通訊路徑）' }, svg);
    const pkt = S('g', null, svg);

    function segments(k) { // k = 已經處理的層數（1..7）
      if (k >= 7) return [{ t: '位元串 0110 1010 0011 …', w: 210, c: 'purple' }];
      let s = [{ t: '資料', w: 50, c: 'green' }];
      for (let j = 0; j < k; j++) {
        if (j < 5) s.unshift({ t: H[j], w: 34, c: 'accent' });
        else { s = [{ t: 'F', w: 20, c: 'orange' }, { t: 'A', w: 20, c: 'orange' }, { t: 'C', w: 20, c: 'orange' }, ...s, { t: 'FCS', w: 36, c: 'orange' }, { t: 'F', w: 20, c: 'orange' }]; }
      }
      return s;
    }
    function drawPkt(segs, x, y, alignRight) {
      clear(pkt);
      const total = segs.reduce((a, s) => a + s.w, 0);
      let cx = alignRight ? x - total : x;
      segs.forEach(s => {
        S('rect', { x: cx, y, width: s.w - 2, height: 26, rx: 4, fill: `var(--${s.c}-soft)`, stroke: `var(--${s.c})`, 'stroke-width': 1.5 }, pkt);
        S('text', { x: cx + s.w / 2 - 1, y: y + 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: s.t, cls: 't-mono' }, pkt);
        cx += s.w;
      });
    }
    const STEP = 1.1, MED = 1.8;
    const dur = 7 * STEP + MED + 7 * STEP;
    const xL = ax + colW + 12, xR = bx - 12;
    function render(t) {
      rowsA.forEach(r => { r.style.fill = 'var(--surface-2)'; r.style.stroke = 'var(--border)'; });
      rowsB.forEach(r => { r.style.fill = 'var(--surface-2)'; r.style.stroke = 'var(--border)'; });
      if (t < 7 * STEP) {
        const i = Math.max(0, Math.min(6, Math.floor(t / STEP)));
        const p = prog(t - i * STEP, 0.55, 1);
        const y = y0 + (i + p) * rh + 4;
        const yy = i === 6 ? y0 + 6 * rh + 4 : y;
        drawPkt(segments(i + 1), xL, i === 6 ? lerp(y0 + 6 * rh + 4, medY - 13, p) : yy, false);
        rowsA[i].style.fill = 'var(--accent-soft)'; rowsA[i].style.stroke = 'var(--accent)';
        msg.textContent = i < 5 ? `系統 A ${layers[i]}：加上 ${H[i]}（往下封裝）` : i === 5 ? '系統 A 鏈結層：加上 F（flag）、A（位址）、C（控制），尾端加 FCS 與 F' : '系統 A 實體層：轉成位元串送上媒介';
      } else if (t < 7 * STEP + MED) {
        const p = prog(t, 7 * STEP, 7 * STEP + MED);
        const segs = segments(7);
        drawPkt(segs, lerp(xL, xR - 210, p), medY - 13, false);
        msg.textContent = '位元串在傳輸媒介上傳送';
      } else {
        const tt = t - 7 * STEP - MED;
        const j = Math.min(6, Math.floor(tt / STEP)); // 0 = 實體層
        const i = 6 - j;
        const local = tt - j * STEP;
        const p = prog(local, 0.55, 1);
        let y;
        if (i === 0) y = y0 + 4;
        else if (i === 6 && p <= 0) y = lerp(medY - 13, y0 + 6 * rh + 4, prog(local, 0, 0.45));
        else y = y0 + (i - p) * rh + 4;
        drawPkt(segments(p > 0 ? i : i + 1), xR, y, true);
        rowsB[i].style.fill = 'var(--green-soft)'; rowsB[i].style.stroke = 'var(--green)';
        msg.textContent = i === 6 ? '系統 B 實體層：收到位元串，還原成訊框' : i === 5 ? '系統 B 鏈結層：檢查 FCS，拆掉 F / A / C / FCS / F' : `系統 B ${layers[i]}：拆掉 ${H[i]}（往上解封裝）`;
        if (i === 0 && p >= 1) msg.textContent = '應用軟體 Y 收到原始資料';
      }
    }
    Timeline(fig, { duration: dur, render, format: t => `${t.toFixed(1)} / ${dur.toFixed(1)} s` });
  })();

  /* ---------- 5. SDU / PDU ---------- */
  (function sdu() {
    const svg = svgRoot(document.getElementById('fig-sdu'), 720, 230, 'SDU 與 PDU 的關係');
    const ar = arrowDefs(svg);
    const rows = [
      { y: 20, label: '第 N+1 層', parts: [{ t: '(N+1)-PDU', w: 220, c: 'green', x: 330 }] },
      { y: 95, label: '第 N 層', parts: [{ t: 'N-PCI（header）', w: 130, c: 'accent', x: 200 }, { t: 'N-SDU', w: 220, c: 'green', x: 330 }] },
      { y: 170, label: '第 N−1 層', parts: [{ t: '(N−1)-PCI', w: 100, c: 'orange', x: 100 }, { t: '(N−1)-SDU', w: 350, c: 'accent', x: 200 }] },
    ];
    rows.forEach(r => {
      S('text', { x: 16, y: r.y + 24, 'font-size': 13, 'font-weight': 600, text: r.label }, svg);
      r.parts.forEach(p => {
        S('rect', { x: p.x, y: r.y, width: p.w - 2, height: 36, rx: 5, fill: `var(--${p.c}-soft)`, stroke: `var(--${p.c})`, 'stroke-width': 1.5 }, svg);
        S('text', { x: p.x + p.w / 2, y: r.y + 23, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, text: p.t }, svg);
      });
    });
    S('path', { d: 'M440 58 L440 93', stroke: 'var(--muted)', 'stroke-width': 1.5, fill: 'none', 'marker-end': ar('muted') }, svg);
    S('text', { x: 450, y: 80, 'font-size': 12, cls: 't-muted', text: '原封不動交下來 = 本層 SDU' }, svg);
    // bracket N-PDU
    S('path', { d: 'M200 136 L200 142 L548 142 L548 136', stroke: 'var(--accent)', fill: 'none', 'stroke-width': 1.5 }, svg);
    S('text', { x: 560, y: 146, 'font-size': 12, 'font-weight': 600, text: '= N-PDU', fill: 'var(--accent)' }, svg);
    S('path', { d: 'M374 146 L374 168', stroke: 'var(--muted)', 'stroke-width': 1.5, fill: 'none', 'marker-end': ar('muted') }, svg);
  })();

  /* ---------- 6. 速率演進 ---------- */
  (function rates() {
    const data = [
      ['802.11', '1997', 2], ['11b', '1999', 11], ['11a', '1999', 54], ['11g', '2003', 54],
      ['11n', '2009', 600], ['11ac', '2013', 6933], ['11ax', '2021', 9608], ['11be', '2024', 40000],
    ];
    const svg = svgRoot(document.getElementById('fig-rates'), 720, 330, '802.11 各版本最高速率');
    const x0 = 120, x1 = 650, rowH = 34, y0 = 20;
    const xs = v => x0 + (Math.log10(v) / 5) * (x1 - x0);
    [1, 10, 100, 1000, 10000, 100000].forEach(v => {
      S('line', { x1: xs(v), y1: y0 - 6, x2: xs(v), y2: y0 + data.length * rowH, stroke: 'var(--border)' }, svg);
      S('text', { x: xs(v), y: y0 + data.length * rowH + 18, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: v >= 1000 ? (v / 1000) + ' Gbps' : v + ' Mbps' }, svg);
    });
    data.forEach((d, i) => {
      const y = y0 + i * rowH;
      S('text', { x: x0 - 12, y: y + 17, 'text-anchor': 'end', 'font-size': 13, 'font-weight': 700, text: d[0] }, svg);
      S('text', { x: x0 - 12, y: y + 30, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted', text: d[1] }, svg);
      S('rect', { x: x0, y: y + 6, width: Math.max(2, xs(d[2]) - x0), height: 20, rx: 4, fill: 'var(--accent)' }, svg);
      S('text', { x: xs(d[2]) + 6, y: y + 21, 'font-size': 12, 'font-weight': 600, text: d[2] >= 1000 ? (d[2] / 1000).toFixed(d[2] % 1000 ? 2 : 0) + ' Gbps' : d[2] + ' Mbps' }, svg);
    });
  })();
})();
