/* 第 2-4 章：資訊元素瀏覽器、Supported Rates 編碼器、IFS 尺規、二元指數退避、CSMA/CA＋ACK 時序、吞吐量計算器、Hidden node 與 RTS/CTS、Exposed node、五站退避模擬、分段 NAV 鏈 */
(function () {
  const { S, clear, svgRoot, arrowDefs, Timeline, lerp, prog } = WL;

  function makeSeg(fig, opts, cb) {
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = opts.map(([v, l], i) => `<button type="button" data-v="${v}"${i ? '' : ' class="on"'}>${l}</button>`).join('');
    fig.querySelector('.controls').prepend(seg);
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      cb(b.dataset.v);
    });
    return seg;
  }
  // 方塊＋置中文字
  function box(g, x, y, w, h, label, o) {
    o = o || {};
    S('rect', { x, y, width: w, height: h, rx: o.rx == null ? 4 : o.rx, fill: o.fill || 'var(--surface-2)', stroke: o.stroke || 'var(--border)', 'stroke-width': o.sw || 1.2, 'stroke-dasharray': o.dash }, g);
    if (label) S('text', { x: x + w / 2, y: y + h / 2 + (o.sub ? -3 : 4), 'text-anchor': 'middle', 'font-size': o.fs || 12, 'font-weight': o.fw || 600, fill: o.color || 'var(--fg)', text: label }, g);
    if (o.sub) S('text', { x: x + w / 2, y: y + h / 2 + 12, 'text-anchor': 'middle', 'font-size': 10.5, fill: o.subColor || 'var(--muted)', text: o.sub, cls: 't-mono' }, g);
  }
  // 時間軸上的方塊：只畫到目前時間 u
  function tblock(g, X, y, s, e, u, label, c, o) {
    o = o || {};
    if (u <= s) return;
    const x1 = X(s), x2 = X(Math.min(u, e)), h = o.h || 26;
    S('rect', { x: x1, y: y - h / 2, width: Math.max(1, x2 - x1), height: h, rx: 3, fill: c ? `var(--${c}-soft)` : 'var(--surface-2)', stroke: c ? `var(--${c})` : 'var(--border)', 'stroke-width': 1.3, 'stroke-dasharray': o.dash }, g);
    if (label && u >= s + (e - s) * 0.4) S('text', { x: (X(s) + X(e)) / 2, y: y + 4, 'text-anchor': 'middle', 'font-size': o.fs || 11, 'font-weight': 700, fill: c ? `var(--${c})` : 'var(--fg)', text: label }, g);
  }
  function span(g, X, y, s, e, label, color) {
    S('line', { x1: X(s), y1: y, x2: X(e), y2: y, stroke: color || 'var(--muted)', 'stroke-width': 1.2 }, g);
    [s, e].forEach(v => S('line', { x1: X(v), y1: y - 4, x2: X(v), y2: y + 4, stroke: color || 'var(--muted)', 'stroke-width': 1.2 }, g));
    if (label) S('text', { x: (X(s) + X(e)) / 2, y: y - 6, 'text-anchor': 'middle', 'font-size': 10.5, fill: color || 'var(--muted)', text: label }, g);
  }
  const phase = (list, u) => { let m = list[0][1]; for (const [a, t] of list) if (u >= a) m = t; return m; };

  /* ---------- 1. 資訊元素瀏覽器 ---------- */
  (function ieBrowser() {
    const fig = document.getElementById('fig-ie-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-ie'), 720, 150, '資訊元素欄位');
    const msg = document.getElementById('ie-msg');
    const E = {
      ssid: { id: '0', n: 'SSID', f: [['SSID', '0–32', 4]], t: 'SSID 表示 ESS 或 IBSS 的名稱，最長 32 octets；Length = 0 表示廣播 SSID（補充：Probe Request 用它詢問附近所有網路）。' },
      rates: { id: '1', n: 'Supported Rates', f: [['Supported Rates', '1–8', 4]], t: '每個速率 1 octet、單位 500 kbps；屬於 BSSBasicRateSet 的速率 msb = 1。最多 8 個，11g 的其餘速率放 Extended Supported Rates。' },
      fh: { id: '2', n: 'FH Parameter Set', f: [['Dwell time', '2', 1.6], ['Hop Set', '1'], ['Hop Pattern', '1', 1.2], ['Hop Index', '1']], t: 'FHSS 的跳頻參數：每個頻率停多久（Dwell time）、跳頻組、跳頻樣式、目前在樣式中的位置。' },
      ds: { id: '3', n: 'DS Parameter Set', f: [['Current channel', '1', 1.4]], t: 'DSSS 目前使用的頻道編號（1 octet）。' },
      cf: { id: '4', n: 'CF Parameter Set', f: [['CFP Count', '1'], ['CFP Period', '1'], ['CFP MaxDuration', '2', 1.7], ['CFP DurRemaining', '2', 1.7]], t: 'PCF 用：距離下一個 CFP 還有幾個 DTIM（Count）、CFP 的週期、CFP 最長多久、目前 CFP 還剩多久（補充：讓站台在 CFP 期間設 NAV）。' },
      tim: { id: '5', n: 'TIM', f: [['DTIM Count', '1'], ['DTIM Period', '1'], ['Bitmap Control', '1', 1.2], ['Partial Virtual Bitmap', '1–251', 3]], t: 'Beacon 裡告訴省電站台「AP 有你的資料」。Partial Virtual Bitmap 每個 bit 對應一個 AID（補充）。' },
      erp: { id: '8', n: 'ERP（NonERP Indication）', f: null, t: 'Length = 1；b0 NonERP_Present（BSS 內有 11b 站台）、b1 Use_Protection（用 OFDM 前要先用 CTS 保護），其餘保留。講義 Element ID 寫 Legacy Indication = 8（補充：正式 11g 標準為 42）。' },
      ext: { id: '8→50', n: 'Extended Supported Rates', f: [['Extended Supported rates', '1–255', 4]], t: '802.11g 新增，放 Supported Rates 放不下的速率（a/b/g 共 14 種，前 8 個以外的）。補充：正式 11g 標準 Element ID 為 50。' },
    };
    function render(k) {
      clear(svg);
      const e = E[k];
      const fields = [['Element ID', '1'], ['Length', '1'], ...(e.f || [['b0', '', 0.45], ['b1', '', 0.45], ...Array.from({ length: 6 }, () => ['r', '', 0.45])])];
      const tot = fields.reduce((a, f) => a + (f[2] || 1), 0), unit = 680 / tot;
      let x = 20;
      S('text', { x: 20, y: 22, 'font-size': 13, 'font-weight': 700, text: `${e.n}（Element ID = ${e.id}）` }, svg);
      fields.forEach((f, i) => {
        const w = (f[2] || 1) * unit;
        const hl = i >= 2 && !(e.f == null && f[0] === 'r');
        box(svg, x, 56, w, 46, f[0], { fill: i === 0 ? 'var(--accent-soft)' : hl ? 'var(--green-soft)' : 'var(--surface-2)', stroke: i === 0 ? 'var(--accent)' : hl ? 'var(--green)' : 'var(--border)', fs: w < 70 ? 10.5 : 12, sub: i === 0 ? `= ${e.id}` : undefined });
        if (f[1]) S('text', { x: x + w / 2, y: 48, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--red)', text: f[1] }, svg);
        x += w;
      });
      S('text', { x: 20, y: 128, 'font-size': 11.5, cls: 't-muted', text: e.f ? '紅字：octets　藍：Element ID　綠：Information（長度由 Length 決定）' : '綠色兩個 bit 有定義（b0、b1），r = 保留（講義 p.5）' }, svg);
      msg.textContent = e.t;
    }
    makeSeg(fig, [['ssid', 'SSID'], ['rates', 'Rates'], ['fh', 'FH'], ['ds', 'DS'], ['cf', 'CF'], ['tim', 'TIM'], ['erp', 'ERP'], ['ext', 'Ext Rates']], render);
    render('ssid');
  })();

  /* ---------- 2. Supported Rates 編碼器 ---------- */
  (function rateEnc() {
    const host = document.getElementById('fig-rate');
    if (!host) return;
    const svg = svgRoot(host, 720, 100, 'Supported Rates 位元');
    const r = document.getElementById('rate-r'), b = document.getElementById('rate-b'), out = document.getElementById('rate-out');
    function run() {
      const R = +r.value, B = +b.value, v = Math.round(R / 0.5), oct = B * 128 + v;
      clear(svg);
      for (let i = 0; i < 8; i++) {
        const bit = (oct >> (7 - i)) & 1, x = 140 + i * 56;
        box(svg, x, 26, 52, 40, String(bit), { fs: 18, fill: i === 0 ? (bit ? 'var(--orange-soft)' : 'var(--surface-2)') : bit ? 'var(--accent-soft)' : 'var(--surface-2)', stroke: i === 0 ? 'var(--orange)' : 'var(--border)' });
        S('text', { x: x + 26, y: 18, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-muted t-mono', text: 'b' + (7 - i) }, svg);
      }
      S('text', { x: 130, y: 52, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 700, text: '1 octet' }, svg);
      S('text', { x: 166, y: 86, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--orange)', text: 'basic?' }, svg);
      S('text', { x: 360, y: 86, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--accent)', text: '速率 ÷ 500 kbps（7 bits）' }, svg);
      out.textContent = `${R} Mbps ÷ 0.5 Mbps = ${v}（${v.toString(2).padStart(7, '0')}）\n` +
        `msb = ${B}（${B ? '屬於' : '不屬於'} BSSBasicRateSet）→ ${B} × 128 + ${v} = ${oct}\n` +
        `編碼 = X'${oct.toString(16).toUpperCase().padStart(2, '0')}'（${oct.toString(2).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1 $2')}）`;
    }
    r.addEventListener('change', run); b.addEventListener('change', run);
    run();
  })();

  /* ---------- 3. IFS 尺規 ---------- */
  (function ifsRuler() {
    const fig = document.getElementById('fig-ifs-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-ifs'), 720, 270, 'IFS 時間尺規');
    const msg = document.getElementById('ifs-msg');
    const P = {
      dsss: { n: 'DSSS（11b）', sifs: 10, slot: 20, eifs: 364, e: 'EIFS = 10 + 112（ACK 14 B @ 1 Mbps）+ 144 + 48（長前導 PLCP）+ 50 = 364 µs' },
      ofdm: { n: 'OFDM（11a）', sifs: 16, slot: 9, eifs: 94, e: '補充：OFDM 的 EIFS = SIFS + DIFS + 6 Mbps 的 ACK 時間 = 16 + 34 + 44 = 94 µs' },
      erp: { n: 'ERP（11g 短時槽）', sifs: 10, slot: 9, eifs: 342, e: 'EIFS = 10 + 112 + 144 + 48 + 28 = 342 µs（以 DSSS 1 Mbps 長前導的 ACK 計）' },
      fhss: { n: 'FHSS', sifs: 28, slot: 50, eifs: 396, e: 'EIFS = 28 + 112 + 96 + 32（FHSS PLCP）+ 128 = 396 µs' },
    };
    function render(k) {
      const p = P[k];
      clear(svg);
      const pifs = p.sifs + p.slot, difs = p.sifs + 2 * p.slot;
      const max = Math.max(p.eifs, difs + p.slot) * 1.04;
      const X = v => 180 + v / max * 420;
      box(svg, 60, 20, 120, 34, 'Medium Busy', { fill: 'var(--surface-2)', rx: 0 });
      S('line', { x1: X(0), y1: 14, x2: X(0), y2: 250, stroke: 'var(--fg)', 'stroke-width': 1.5 }, svg);
      for (let v = p.sifs; v < max; v += p.slot) S('line', { x1: X(v), y1: 60, x2: X(v), y2: 250, stroke: 'var(--border)', 'stroke-dasharray': '3 4' }, svg);
      const rows = [
        ['SIFS', p.sifs, 'green', 'ACK、CTS、輪詢回應'],
        ['PIFS', pifs, 'purple', 'PC（PCF）'],
        ['DIFS', difs, 'accent', 'DCF 一般資料'],
        ['EIFS', p.eifs, 'red', '上一個訊框收錯時'],
      ];
      rows.forEach(([n, v, c, who], i) => {
        const y = 82 + i * 42;
        S('text', { x: 20, y: y + 5, 'font-size': 12.5, 'font-weight': 700, fill: `var(--${c})`, text: n }, svg);
        S('text', { x: 64, y: y + 5, 'font-size': 11, cls: 't-muted', text: who }, svg);
        S('rect', { x: X(0), y: y - 11, width: X(v) - X(0), height: 22, rx: 3, fill: `var(--${c}-soft)`, stroke: `var(--${c})` }, svg);
        S('text', { x: X(v) + 6, y: y + 4, 'font-size': 11.5, 'font-weight': 700, fill: `var(--${c})`, text: `${v} µs → 可送` }, svg);
        if (n === 'DIFS') {
          S('rect', { x: X(difs), y: y - 11, width: X(difs + p.slot) - X(difs), height: 22, fill: 'none', stroke: 'var(--accent)', 'stroke-dasharray': '3 3' }, svg);
        }
      });
      S('text', { x: X(p.sifs + p.slot / 2), y: 70, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: `slot ${p.slot}` }, svg);
      S('text', { x: 20, y: 262, 'font-size': 11, cls: 't-muted', text: '虛線格 = Slot time；DIFS 後的虛線框 = First backoff slot' }, svg);
      msg.textContent = `${p.n}：SIFS ${p.sifs}、Slot ${p.slot} → PIFS = ${p.sifs} + ${p.slot} = ${pifs} µs，DIFS = ${p.sifs} + 2 × ${p.slot} = ${difs} µs。${p.e}`;
    }
    makeSeg(fig, [['dsss', 'DSSS'], ['ofdm', 'OFDM'], ['erp', 'ERP 短時槽'], ['fhss', 'FHSS']], render);
    render('dsss');
  })();

  /* ---------- 4. 二元指數退避 ---------- */
  (function beb() {
    const fig = document.getElementById('fig-beb-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-beb'), 720, 260, '競爭視窗成長');
    const out = document.getElementById('beb-out');
    const P = {
      ofdm: { n: 'OFDM／11n', min: 15, max: 1023, slot: 9 },
      dsss: { n: 'DSSS', min: 31, max: 1023, slot: 20 },
      ir: { n: 'IR', min: 63, max: 1023, slot: 8 },
      slide: { n: '講義圖（示意）', min: 7, max: 255, slot: 9 },
    };
    const LIMIT = 7; // 補充：dot11ShortRetryLimit
    let p = P.ofdm, picks = [], dropped = false;
    const cwAt = i => Math.min(Math.pow(2, i) * (p.min + 1) - 1, p.max);
    const pick = i => Math.floor(Math.random() * (cwAt(i) + 1));
    function render() {
      clear(svg);
      const H = 190, y0 = 220, Y = v => y0 - Math.log2(v + 1) / 10 * H;
      [1, 3, 7, 15, 31, 63, 127, 255, 511, 1023].forEach(v => {
        S('line', { x1: 60, y1: Y(v), x2: 700, y2: Y(v), stroke: 'var(--border)', 'stroke-dasharray': '2 4' }, svg);
        S('text', { x: 54, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted t-mono', text: v }, svg);
      });
      for (let i = 0; i <= LIMIT; i++) {
        const cw = cwAt(i), x = 76 + i * 78, cur = i === picks.length - 1 && !dropped;
        S('rect', { x, y: Y(cw), width: 56, height: y0 - Y(cw), rx: 3, fill: i < picks.length ? (cur ? 'var(--accent)' : 'var(--accent-soft)') : 'var(--surface-2)', stroke: i < picks.length ? 'var(--accent)' : 'var(--border)' }, svg);
        S('text', { x: x + 28, y: Y(cw) - 6, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: cur ? 'var(--accent)' : 'var(--fg)', text: cw }, svg);
        S('text', { x: x + 28, y: y0 + 16, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-muted', text: i === 0 ? '初次' : `第 ${i} 次重傳` }, svg);
        if (i < picks.length) {
          const cy = Math.max(Y(picks[i]), Y(cw) + 6);
          S('circle', { cx: x + 28, cy: Math.min(cy, y0 - 5), r: 5, fill: 'var(--orange)', stroke: 'var(--surface)', 'stroke-width': 1.5 }, svg);
        }
      }
      S('text', { x: 20, y: 18, 'font-size': 11, cls: 't-muted', text: `CW（對數刻度）　${p.n}：CWmin ${p.min}、CWmax ${p.max}、slot ${p.slot} µs` }, svg);
      out.textContent = picks.map((r, i) => `${i === 0 ? '初次  ' : `重傳 ${i}`}：CW = ${cwAt(i)}，Random[0, ${cwAt(i)}] 抽到 ${r} → 退避 ${r} × ${p.slot} = ${r * p.slot} µs`).join('\n') +
        (dropped ? `\n已重傳 ${LIMIT} 次仍失敗 → 超過 retry limit（補充：dot11ShortRetryLimit = 7），丟棄這個 MSDU，CW 回 ${p.min}。` : '');
    }
    function reset() { picks = [pick(0)]; dropped = false; render(); }
    fig.querySelector('[data-act="fail"]').addEventListener('click', () => {
      if (dropped) { reset(); return; }
      if (picks.length > LIMIT) { dropped = true; render(); return; }
      picks.push(pick(picks.length)); render();
    });
    fig.querySelector('[data-act="ok"]').addEventListener('click', reset);
    makeSeg(fig, [['ofdm', 'OFDM／11n'], ['dsss', 'DSSS'], ['ir', 'IR'], ['slide', '講義圖']], k => { p = P[k]; reset(); });
    reset();
  })();

  /* ---------- 5. CSMA/CA＋ACK 時序 ---------- */
  (function basic() {
    const fig = document.getElementById('fig-basic-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-basic'), 720, 250, 'CSMA/CA 加 ACK 時序');
    const msg = document.getElementById('basic-msg');
    const X = u => 90 + u * 43;
    const R = { Src: 60, Dest: 120, Other: 190 };
    const PH = [
      [0, 'Src 有資料要送，媒介已空閒：先等 DIFS。'],
      [1, 'DIFS 到了且不在退避中 → Src 直接送 Data（Free access）。Other 的 CCA 感測到媒介忙。'],
      [2, 'Other 這時也有資料要送，但媒介忙 → 延後（Defer Access）。'],
      [6, 'Data 收完、CRC 正確：Dest 只等 SIFS 就回 ACK（SIFS 最短，沒人插得進來）。Data 的 Duration 讓 Other 的 NAV 蓋住這段。'],
      [7.6, 'ACK 結束，媒介空閒。Other 要先等滿 DIFS。'],
      [8.6, 'Other 進入競爭視窗：抽到 4 個 slot，媒介空閒時才一格一格倒數（Backoff after Defer）。'],
      [10.6, '退避歸零 → Other 送出 Next MPDU。'],
    ];
    function render(u) {
      clear(svg);
      Object.entries(R).forEach(([n, y]) => {
        S('text', { x: 20, y: y + 4, 'font-size': 13, 'font-weight': 700, text: n }, svg);
        S('line', { x1: 80, y1: y + 14, x2: 700, y2: y + 14, stroke: 'var(--border)' }, svg);
      });
      if (u > 0) span(svg, X, R.Src - 22, 0, Math.min(u, 1), 'DIFS', 'var(--accent)');
      tblock(svg, X, R.Src, 1, 6, u, 'Data', 'accent');
      if (u > 6) span(svg, X, R.Dest - 22, 6, Math.min(u, 6.6), 'SIFS', 'var(--green)');
      tblock(svg, X, R.Dest, 6.6, 7.6, u, 'Ack', 'green');
      tblock(svg, X, R.Other - 8, 1, 6, u, 'CCA：媒介忙', null, { h: 16, fs: 10 });
      tblock(svg, X, R.Other - 8, 6, 7.6, u, 'NAV', 'orange', { h: 16, fs: 10 });
      if (u > 2) {
        S('path', { d: `M${X(2)} ${R.Other + 32} L${X(2)} ${R.Other + 14}`, stroke: 'var(--red)', 'stroke-width': 2, fill: 'none' }, svg);
        S('text', { x: X(2), y: R.Other + 44, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--red)', text: '有資料' }, svg);
      }
      if (u > 7.6) span(svg, X, R.Other - 26, 7.6, Math.min(u, 8.6), 'DIFS', 'var(--accent)');
      for (let k = 0; k < 4; k++) {
        const s = 8.6 + k * 0.5;
        if (u > s) {
          S('rect', { x: X(s), y: R.Other - 2, width: X(Math.min(u, s + 0.5)) - X(s), height: 22, fill: 'var(--purple-soft)', stroke: 'var(--purple)' }, svg);
          if (u > s + 0.25) S('text', { x: X(s + 0.25), y: R.Other + 13, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--purple)', text: 4 - k }, svg);
        }
      }
      tblock(svg, X, R.Other + 9, 10.6, 13.6, u, 'Next MPDU', 'accent');
      if (u > 1) span(svg, X, 238, 1, Math.min(u, 7.6), 'Defer Access');
      if (u > 7.6) span(svg, X, 238, 7.6, Math.min(u, 10.6), 'Backoff after Defer', 'var(--purple)');
      S('line', { x1: X(u), y1: 30, x2: X(u), y2: 228, stroke: 'var(--red)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
      msg.textContent = phase(PH, u);
    }
    Timeline(fig, { duration: 9.6, render: t => render(t / 0.7), format: t => `${(t / 0.7).toFixed(1)} 單位` });
  })();

  /* ---------- 6. 吞吐量計算器 ---------- */
  (function tput() {
    const host = document.getElementById('fig-tput');
    if (!host) return;
    const svg = svgRoot(host, 720, 330, '一筆傳送的時間分配與吞吐量曲線');
    const $ = id => document.getElementById(id);
    const DIFS = 34, SIFS = 16, SLOT = 9, BO = 7.5 * SLOT;
    const T = (L, R) => 20 + 4 * Math.ceil((16 + 8 * L + 6) / (4 * R));
    function calc(L, R, C, rts) {
      const d = T(L + 28, R), ack = T(14, C);
      const parts = [['DIFS', DIFS, 'green'], ['Backoff', BO, 'purple']];
      if (rts) parts.push(['RTS', T(20, C), 'orange'], ['SIFS', SIFS, 'green'], ['CTS', T(14, C), 'orange'], ['SIFS', SIFS, 'green']);
      const pay = 8 * L / R;
      parts.push(['PHY＋MAC 標頭', d - pay, 'muted'], ['Payload', pay, 'accent'], ['SIFS', SIFS, 'green'], ['ACK', ack, 'orange']);
      const tot = parts.reduce((a, p) => a + p[1], 0);
      return { parts, tot, S: 8 * L / tot, d, ack };
    }
    function run() {
      const L = +$('tp-len').value, R = +$('tp-rate').value, cv = $('tp-ctrl').value, C = cv === 'same' ? R : Math.min(R, +cv), rts = $('tp-rts').value === '1';
      $('tp-lenv').textContent = L;
      const r = calc(L, R, C, rts);
      clear(svg);
      // 堆疊長條
      let x = 20;
      S('text', { x: 20, y: 16, 'font-size': 12, 'font-weight': 700, text: `一筆傳送 ${r.tot.toFixed(1)} µs` }, svg);
      r.parts.forEach(([n, v, c], i) => {
        const w = v / r.tot * 680;
        S('rect', { x, y: 26, width: Math.max(0.5, w), height: 30, fill: c === 'muted' ? 'var(--surface-2)' : `var(--${c}-soft)`, stroke: c === 'muted' ? 'var(--muted)' : `var(--${c})` }, svg);
        if (w > 38) S('text', { x: x + w / 2, y: 45, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: c === 'muted' ? 'var(--muted)' : `var(--${c})`, text: w > 70 ? `${n} ${v.toFixed(0)}` : n }, svg);
        x += w;
      });
      // 曲線
      const gx = v => 70 + (v - 40) / (2304 - 40) * 620, top = 90, bot = 300;
      const curves = [false, true].map(m => { const pts = []; for (let l = 40; l <= 2304; l += 16) pts.push([l, calc(l, R, C, m).S]); return pts; });
      const ymax = Math.ceil(R / 5) * 5, gy = v => bot - v / ymax * (bot - top);
      for (let v = 0; v <= ymax; v += ymax / 5) {
        S('line', { x1: 70, y1: gy(v), x2: 690, y2: gy(v), stroke: 'var(--border)', 'stroke-dasharray': v ? '2 4' : '' }, svg);
        S('text', { x: 64, y: gy(v) + 4, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted t-mono', text: v.toFixed(0) }, svg);
      }
      [40, 500, 1000, 1500, 2000, 2304].forEach(v => S('text', { x: gx(v), y: bot + 16, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: v }, svg));
      S('line', { x1: 70, y1: gy(R), x2: 690, y2: gy(R), stroke: 'var(--red)', 'stroke-dasharray': '5 4' }, svg);
      if (gy(R) >= top) S('text', { x: 686, y: gy(R) - 5, 'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--red)', text: `PHY 速率 ${R} Mbps` }, svg);
      S('text', { x: 70, y: top - 8, 'font-size': 10.5, cls: 't-muted', text: '吞吐量（Mbps）對 Payload（bytes）' }, svg);
      curves.forEach((pts, m) => {
        S('path', { d: 'M' + pts.map(p => `${gx(p[0]).toFixed(1)} ${gy(p[1]).toFixed(1)}`).join(' L'), fill: 'none', stroke: m ? 'var(--orange)' : 'var(--accent)', 'stroke-width': 2 }, svg);
        const lp = pts[pts.length - 1];
        S('text', { x: gx(lp[0]) - 4, y: gy(lp[1]) + (m ? 16 : -8), 'text-anchor': 'end', 'font-size': 11, 'font-weight': 700, fill: m ? 'var(--orange)' : 'var(--accent)', text: m ? 'RTS/CTS' : 'Basic（DATA–ACK）' }, svg);
      });
      S('circle', { cx: gx(L), cy: gy(r.S), r: 5, fill: rts ? 'var(--orange)' : 'var(--accent)', stroke: 'var(--surface)', 'stroke-width': 2 }, svg);
      const b = calc(L, R, C, false), w = calc(L, R, C, true);
      $('tp-out').textContent =
        `T_DATA = 20 + 4 × ⌈(16 + 8 × ${L + 28} + 6) ÷ ${4 * R}⌉ = ${r.d} µs　T_ACK = ${r.ack} µs（控制訊框 ${C} Mbps）\n` +
        `總時間 = ${r.parts.map(p => p[1].toFixed(p[1] % 1 ? 1 : 0)).join(' + ')} = ${r.tot.toFixed(1)} µs\n` +
        `吞吐量 S = 8 × ${L} ÷ ${r.tot.toFixed(1)} = ${r.S.toFixed(2)} Mbps，效率 ${(r.S / R * 100).toFixed(1)}%\n` +
        `對照：Basic ${b.S.toFixed(2)} Mbps、RTS/CTS ${w.S.toFixed(2)} Mbps（少 ${((1 - w.S / b.S) * 100).toFixed(1)}%）`;
    }
    ['tp-len', 'tp-rate', 'tp-ctrl', 'tp-rts'].forEach(id => $(id).addEventListener('input', run));
    run();
  })();

  /* ---------- 7. Hidden node 與 RTS/CTS ---------- */
  (function hidden() {
    const fig = document.getElementById('fig-hidden-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-hidden'), 720, 352, 'Hidden node 與 RTS/CTS');
    const msg = document.getElementById('hidden-msg');
    const N = { A: [130, 92], AP: [360, 92], C: [590, 92] };
    const X = u => 90 + u * 50;
    const Rw = { A: 210, AP: 256, C: 302 };
    let mode = 'basic';
    const M = {
      basic: {
        bl: [['A', 0, 1, 'DIFS', null, 'span'], ['A', 1, 5, 'Data', 'accent'], ['C', 1.8, 5.8, 'Data', 'accent'], ['AP', 1.8, 5, '碰撞！', 'red']],
        pk: [['A', 'AP', 1, 1.8, 'Data', 'accent'], ['C', 'AP', 1.8, 2.6, 'Data', 'accent']],
        ph: [[0, 'A 有資料要送，媒介空閒，等 DIFS。'], [1, 'A 送出 Data。C 在 A 的範圍外，感測不到 → 以為媒介空閒。'], [1.8, 'C 也開始送 Data：兩個訊號在 AP 疊在一起 → 碰撞！A、C 自己都不知道（無法 CD）。'], [5.8, '兩邊都等不到 ACK → 各自 CW 加倍、退避後重傳，整段 Data 時間都浪費了。']],
        end: 8,
      },
      rts: {
        bl: [['A', 0, 1, 'DIFS', null, 'span'], ['A', 1, 2, 'RTS', 'orange'], ['AP', 2.3, 3.1, 'CTS', 'purple'], ['A', 3.4, 7.4, 'Data', 'accent'], ['AP', 7.7, 8.5, 'ACK', 'green'], ['C', 3.1, 8.5, 'NAV(CTS)', 'orange', 'nav'], ['C', 8.5, 9.5, 'DIFS', null, 'span'], ['C', 9.5, 10.5, 'Backoff', 'purple'], ['C', 10.5, 12, 'Data', 'accent']],
        pk: [['A', 'AP', 1, 2, 'RTS', 'orange'], ['AP', 'A', 2.3, 3.1, 'CTS', 'purple'], ['AP', 'C', 2.3, 3.1, 'CTS', 'purple'], ['A', 'AP', 3.4, 7.4, 'Data', 'accent'], ['AP', 'A', 7.7, 8.5, 'ACK', 'green'], ['C', 'AP', 10.5, 12, 'Data', 'accent']],
        ph: [[0, 'A 有資料要送，等 DIFS。'], [1, 'A 先送短短的 RTS（20 bytes），Duration 涵蓋 CTS＋Data＋ACK。C 聽不到 RTS。'], [2.3, 'AP 隔 SIFS 回 CTS——AP 的範圍涵蓋 A 和 C，所以 C 也聽到了。'], [3.1, 'C 從 CTS 的 Duration 設 NAV：雖然 C 的 CCA 覺得媒介空閒，NAV 說「忙」→ 延後。'], [3.4, 'A 安心送 Data，不會被 C 打擾。'], [7.7, 'AP 回 ACK，交換完成。'], [8.5, 'C 的 NAV 到期 → 等 DIFS、退避後才送自己的 Data。']],
        end: 12,
      },
    };
    function render(u) {
      clear(svg);
      const m = M[mode];
      // 範圍
      S('ellipse', { cx: N.A[0], cy: N.A[1], rx: 255, ry: 62, fill: 'var(--accent-soft)', opacity: 0.35, stroke: 'var(--accent)', 'stroke-dasharray': '5 4' }, svg);
      S('ellipse', { cx: N.C[0], cy: N.C[1], rx: 255, ry: 62, fill: 'var(--green-soft)', opacity: 0.35, stroke: 'var(--green)', 'stroke-dasharray': '5 4' }, svg);
      S('text', { x: 40, y: 22, 'font-size': 10.5, fill: 'var(--accent)', text: 'A 的範圍' }, svg);
      S('text', { x: 680, y: 22, 'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--green)', text: 'C 的範圍' }, svg);
      Object.entries(N).forEach(([k, [x, y]]) => {
        S('circle', { cx: x, cy: y, r: 22, fill: k === 'AP' ? 'var(--purple-soft)' : 'var(--surface)', stroke: k === 'AP' ? 'var(--purple)' : 'var(--fg)', 'stroke-width': 1.6 }, svg);
        S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: k }, svg);
      });
      S('text', { x: 360, y: 150, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-muted', text: 'A 與 C 互相聽不到，但都聽得到 AP' }, svg);
      m.pk.forEach(([f, t, s, e, l, c]) => {
        if (u < s || u > e + 0.2) return;
        const p = prog(u, s, Math.min(e, s + 0.8));
        const [x1, y1] = N[f], [x2, y2] = N[t];
        S('line', { x1, y1, x2: lerp(x1, x2, p), y2: lerp(y1, y2, p), stroke: `var(--${c})`, 'stroke-width': 3, opacity: 0.6 }, svg);
        const px = lerp(x1, x2, p), py = lerp(y1, y2, p);
        S('rect', { x: px - 24, y: py - 30, width: 48, height: 18, rx: 4, fill: `var(--${c})` }, svg);
        S('text', { x: px, y: py - 17, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: '#fff', text: l }, svg);
      });
      if (mode === 'basic' && u > 1.8) {
        S('path', { d: 'M344 60 L376 92 M376 60 L344 92', stroke: 'var(--red)', 'stroke-width': 4 }, svg);
      }
      if (mode === 'rts' && u > 1 && u < 2.2) S('text', { x: 590, y: 58, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--red)', text: '聽不到 RTS' }, svg);
      // 時間軸
      Object.entries(Rw).forEach(([n, y]) => {
        S('text', { x: 20, y: y + 4, 'font-size': 12, 'font-weight': 700, text: n }, svg);
        S('line', { x1: 80, y1: y + 14, x2: 700, y2: y + 14, stroke: 'var(--border)' }, svg);
      });
      m.bl.forEach(([r, s, e, l, c, kind]) => {
        if (kind === 'span') { if (u > s) span(svg, X, Rw[r] - 4, s, Math.min(u, e), l); return; }
        tblock(svg, X, Rw[r], s, e, u, l, c, kind === 'nav' ? { h: 18, dash: '4 3' } : {});
      });
      if (mode === 'rts' && u > 2.6) {
        S('path', { d: `M${X(2.6)} ${Rw.C + 30} L${X(2.6)} ${Rw.C + 14}`, stroke: 'var(--red)', 'stroke-width': 2 }, svg);
        S('text', { x: X(2.6), y: Rw.C + 40, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--red)', text: 'C 有資料' }, svg);
      }
      S('line', { x1: X(u), y1: 186, x2: X(u), y2: 320, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      msg.textContent = phase(m.ph, u);
    }
    const tl = Timeline(fig, { duration: 9, render: t => render(t / 9 * M[mode].end), format: t => `${(t / 9 * M[mode].end).toFixed(1)} 單位` });
    makeSeg(fig, [['basic', '沒有 RTS/CTS'], ['rts', '使用 RTS/CTS']], v => { mode = v; tl.pause(); tl.set(0); tl.play(); });
  })();

  /* ---------- 7b. Exposed node ---------- */
  (function exposed() {
    const host = document.getElementById('fig-exposed');
    if (!host) return;
    const svg = svgRoot(host, 720, 250, 'Exposed node 示意');
    const ar = arrowDefs(svg);
    const y = 100, P = { A: 90, B: 280, C: 440, D: 630 };
    S('ellipse', { cx: P.B, cy: y, rx: 210, ry: 74, fill: 'var(--orange-soft)', opacity: 0.35, stroke: 'var(--orange)', 'stroke-dasharray': '5 4' }, svg);
    S('ellipse', { cx: P.C, cy: y, rx: 210, ry: 74, fill: 'var(--green-soft)', opacity: 0.35, stroke: 'var(--green)', 'stroke-dasharray': '5 4' }, svg);
    S('text', { x: 80, y: 20, 'font-size': 10.5, fill: 'var(--orange)', text: 'B 的範圍' }, svg);
    S('text', { x: 650, y: 20, 'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--green)', text: 'C 的範圍' }, svg);
    S('path', { d: `M${P.B - 26} ${y} L${P.A + 26} ${y}`, stroke: 'var(--orange)', 'stroke-width': 3, 'marker-end': ar('orange') }, svg);
    S('text', { x: (P.A + P.B) / 2, y: y - 12, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--orange)', text: 'B → A 傳送中' }, svg);
    S('path', { d: `M${P.C + 26} ${y} L${P.D - 26} ${y}`, stroke: 'var(--muted)', 'stroke-width': 3, 'stroke-dasharray': '6 4', 'marker-end': ar('muted') }, svg);
    S('text', { x: (P.C + P.D) / 2, y: y - 12, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, cls: 't-muted', text: 'C → D 被迫延後' }, svg);
    S('text', { x: (P.C + P.D) / 2, y: y + 30, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--red)', text: '其實到不了 A，不會干擾' }, svg);
    Object.entries(P).forEach(([k, x]) => {
      S('circle', { cx: x, cy: y, r: 22, fill: 'var(--surface)', stroke: 'var(--fg)', 'stroke-width': 1.6 }, svg);
      S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: k }, svg);
    });
    S('text', { x: 360, y: 205, 'text-anchor': 'middle', 'font-size': 12.5, text: 'C 的 CCA 聽到 B（或從 B 的 RTS 設了 NAV）→ 判斷媒介忙 → 兩筆本來可以同時進行的傳送變成輪流' }, svg);
    S('text', { x: 360, y: 228, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: '即使讓 C 送：D 回的 CTS／ACK 會在 C 被 B 的 Data 蓋掉，所以 RTS/CTS 也救不了' }, svg);
  })();

  /* ---------- 8. 五站退避模擬 ---------- */
  (function boSim() {
    const fig = document.getElementById('fig-bo-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-bo'), 720, 320, '五個站台的退避');
    const msg = document.getElementById('bo-msg');
    const DIFS = 2, F = 8, CWMIN = 7, CWMAX = 63;
    const ST = [['A', 0, 2], ['B', 4, 1], ['C', 6, 1], ['D', 3, 1], ['E', 9, 1]];
    let seed = 7, sim = null;
    function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function simulate() {
      const rnd = rng(seed), draw = cw => Math.floor(rnd() * (cw + 1));
      const st = ST.map(([n, arr, fr]) => ({ n, arr, fr, cw: CWMIN, bo: null, seg: [], tx: null }));
      const snaps = [], ev = [], busyMark = [];
      let busyUntil = -1, idleStart = -10, txing = [], t = 0;
      const push = (s, type, a, b) => { const l = s.seg[s.seg.length - 1]; if (l && l.type === type && l.e === a) l.e = b; else s.seg.push({ type, s: a, e: b }); };
      for (; t < 200; t++) {
        if (t === busyUntil) {
          const coll = txing.length > 1;
          txing.forEach(s => {
            if (coll) { s.cw = Math.min(2 * s.cw + 1, CWMAX); s.bo = draw(s.cw); }
            else { s.fr--; s.cw = CWMIN; s.bo = s.fr > 0 ? draw(CWMIN) : null; }
          });
          ev.push([t, coll ? `t = ${t}：碰撞！${txing.map(s => s.n).join('、')} 收不到 ACK → CW 加倍重抽（${txing.map(s => `${s.n}: CW ${s.cw} 抽到 ${s.bo}`).join('，')}）。` : `t = ${t}：${txing[0].n} 傳送成功。${txing[0].bo != null ? `${txing[0].n} 佇列還有訊框，也必須退避（抽到 ${txing[0].bo}，公平性）。` : ''}其他人等 DIFS 後從剩餘值繼續倒數。`]);
          txing = []; idleStart = t;
        }
        const busy = t < busyUntil;
        st.forEach(s => {
          if (s.arr === t) {
            const free = !busy && t - idleStart >= DIFS;
            s.bo = free ? 0 : draw(s.cw);
            ev.push([t, free ? `t = ${t}：${s.n} 有資料，媒介已空閒 ≥ DIFS → 直接送（Free access）。` : `t = ${t}：${s.n} 有資料，但媒介${busy ? '忙' : '還沒空閒滿 DIFS'} → 抽退避值 Random[0, ${s.cw}] = ${s.bo}。`]);
          }
        });
        snaps[t] = st.map(s => s.bo);
        if (!busy && t - idleStart >= DIFS) {
          const go = st.filter(s => s.bo === 0 && s.arr <= t);
          if (go.length) {
            txing = go; busyUntil = t + F; busyMark.push([t, t + F, go.length > 1]);
            go.forEach(s => { s.bo = null; push(s, go.length > 1 ? 'coll' : 'frame', t, t + F); });
            st.forEach(s => { if (s.bo != null && s.arr <= t) push(s, 'frozen', t, t + 1); });
            ev.push([t, `t = ${t}：${go.map(s => s.n).join('、')} ${go.every(s => s.arr === t) ? '媒介空閒 ≥ DIFS，直接' : '的退避歸零 →'} 傳送${go.length > 1 ? '（同時！）' : ''}。其他站台凍結剩餘退避值。`]);
            continue;
          }
          st.forEach(s => { if (s.bo != null && s.arr <= t) { push(s, 'count', t, t + 1); s.bo--; } });
        } else {
          st.forEach(s => { if (s.bo != null && s.arr <= t) push(s, 'frozen', t, t + 1); });
        }
        if (t > busyUntil && st.every(s => s.fr === 0) && t > 30) break;
      }
      return { st, snaps, ev, busyMark, T: t + 1 };
    }
    let X;
    function render(u) {
      clear(svg);
      const { st, snaps, ev, busyMark, T } = sim;
      X = v => 60 + v / T * 640;
      // 媒介
      S('text', { x: 20, y: 24, 'font-size': 11, cls: 't-muted', text: '媒介' }, svg);
      S('line', { x1: 60, y1: 20, x2: 700, y2: 20, stroke: 'var(--border)' }, svg);
      busyMark.forEach(([a, b, c]) => { if (u > a) S('rect', { x: X(a), y: 14, width: X(Math.min(u, b)) - X(a), height: 12, fill: c ? 'var(--red-soft)' : 'var(--surface-2)', stroke: c ? 'var(--red)' : 'var(--muted)' }, svg); });
      busyMark.forEach(([, b]) => { if (u > b) span(svg, X, 38, b, Math.min(u, b + DIFS), 'DIFS', 'var(--muted)'); });
      st.forEach((s, i) => {
        const y = 72 + i * 50;
        S('text', { x: 20, y: y + 5, 'font-size': 14, 'font-weight': 700, text: s.n }, svg);
        S('line', { x1: 60, y1: y + 14, x2: 700, y2: y + 14, stroke: 'var(--border)' }, svg);
        s.seg.forEach(g => {
          if (u <= g.s) return;
          const x1 = X(g.s), x2 = X(Math.min(u, g.e));
          if (g.type === 'frame' || g.type === 'coll') {
            S('rect', { x: x1, y: y - 10, width: x2 - x1, height: 22, rx: 3, fill: g.type === 'coll' ? 'var(--red-soft)' : 'var(--accent-soft)', stroke: g.type === 'coll' ? 'var(--red)' : 'var(--accent)', 'stroke-width': g.type === 'coll' ? 2 : 1.2 }, svg);
            if (u > g.s + 3) S('text', { x: (X(g.s) + X(g.e)) / 2, y: y + 5, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: g.type === 'coll' ? 'var(--red)' : 'var(--accent)', text: g.type === 'coll' ? '碰撞' : 'Frame' }, svg);
          } else {
            S('rect', { x: x1, y: y + 2, width: x2 - x1, height: 10, fill: g.type === 'count' ? 'var(--accent)' : 'var(--red)', opacity: g.type === 'count' ? 0.85 : 0.55 }, svg);
          }
        });
        if (u >= s.arr) {
          S('path', { d: `M${X(s.arr)} ${y + 30} L${X(s.arr)} ${y + 16}`, stroke: 'var(--red)', 'stroke-width': 2 }, svg);
          S('path', { d: `M${X(s.arr) - 4} ${y + 21} L${X(s.arr)} ${y + 15} L${X(s.arr) + 4} ${y + 21}`, stroke: 'var(--red)', 'stroke-width': 2, fill: 'none' }, svg);
        }
        const k = Math.min(Math.floor(u), snaps.length - 1), bo = snaps[k] ? snaps[k][i] : null;
        if (bo != null && u >= s.arr && !s.seg.some(g => (g.type === 'frame' || g.type === 'coll') && u >= g.s && u < g.e)) {
          S('rect', { x: X(u) + 4, y: y - 26, width: 26, height: 17, rx: 4, fill: 'var(--surface)', stroke: 'var(--accent)' }, svg);
          S('text', { x: X(u) + 17, y: y - 13, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--accent)', cls: 't-mono', text: bo }, svg);
        }
      });
      S('line', { x1: X(u), y1: 10, x2: X(u), y2: 310, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      msg.textContent = phase([[0, ev.length ? ev[0][1] : ''], ...ev], u);
    }
    const SPD = 0.16;
    sim = simulate();
    const tl = Timeline(fig, { duration: sim.T * SPD, render: t => render(t / SPD), format: t => `t = ${Math.floor(t / SPD)} slot` });
    const btn = document.createElement('button');
    btn.className = 'btn'; btn.type = 'button'; btn.textContent = '🎲 換一組亂數';
    fig.querySelector('.controls').prepend(btn);
    btn.addEventListener('click', () => { seed = (seed * 48271 + 11) % 2147483647; sim = simulate(); tl.pause(); tl.set(0); tl.play(); });
  })();

  /* ---------- 9. RTS/CTS＋分段的 NAV 鏈 ---------- */
  (function fragNav() {
    const fig = document.getElementById('fig-frag-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-frag'), 720, 300, 'RTS/CTS 加分段的 NAV');
    const msg = document.getElementById('frag-msg');
    const X = u => 140 + u * 29.5;
    const Y = { Src: 46, Dst: 96, OS: 168, OD: 238 };
    const s = 0.35, rts = [1, 2], cts = [2.35, 3.15], f0 = [3.5, 5.7], a0 = [6.05, 6.85], f1 = [7.2, 9.4], a1 = [9.75, 10.55], f2 = [10.9, 13.1], a2 = [13.45, 14.25];
    let mode = 'ok';
    const PH = {
      ok: [[0, 'Src 搶到頻道（DIFS），先送 RTS。'], [1, 'RTS 的 Duration 只涵蓋到 Fragment 0 的 ACK 為止；聽得到 Src 的站台設 NAV(RTS)。'], [2.35, 'Dst 回 CTS：只聽得到 Dst 的站台設 NAV(CTS)。'], [3.5, 'Fragment 0 的 Duration 涵蓋「ACK 0＋Fragment 1＋ACK 1」：像一個虛擬的 RTS，把 NAV 往後延。'], [6.05, 'ACK 0 的 Duration 也涵蓋到 ACK 1：像虛擬的 CTS，讓只聽得到 Dst 的站台跟著延。'], [7.2, '每一對 Fragment／ACK 都把 NAV 再往後推一段，段與段之間只隔 SIFS，別人插不進來。'], [13.45, '最後一段送完、ACK 2 回來，整個 MSDU 完成。'], [14.25, 'NAV 全部到期，其他站台等 DIFS 後退避競爭。']],
      lost: [[0, 'Src 搶到頻道（DIFS），先送 RTS。'], [2.35, 'Dst 回 CTS。'], [3.5, 'Fragment 0、ACK 0 正常。'], [7.2, 'Src 送 Fragment 1，Duration 涵蓋到 ACK 2（聽得到 Src 的站台 NAV 延到那裡）。'], [9.75, 'ACK 1 沒回來（最壞情況）！Dst 沒送 ACK，所以只聽得到 Dst 的站台不會再更新 NAV。'], [10.55, '只聽得到 Dst 的站台：NAV(ACK 0) 到期 → 可以存取頻道。聽得到 Src 的站台還被 NAV(Fragment 1) 擋著。'], [14.25, 'NAV(Fragment 1) 到期：聽得到 Src 的站台可以存取了；Src 自己也必須等到這時，才能 DIFS＋退避，重新競爭。'], [16.25, 'Src 退避結束，重傳 Fragment 1（只重傳失敗的那一段）。']],
    };
    function nav(y, a, b, l, lane, u) {
      if (u <= a) return;
      const yy = y + (lane ? 11 : -11);
      S('rect', { x: X(a), y: yy - 9, width: X(Math.min(u, b)) - X(a), height: 18, rx: 2, fill: lane ? 'var(--yellow-soft)' : 'var(--orange-soft)', stroke: 'var(--orange)', 'stroke-width': 1 }, svg);
      if (u > (a + b) / 2) S('text', { x: (X(a) + X(b)) / 2, y: yy + 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: 'var(--orange)', text: l }, svg);
    }
    function render(u) {
      clear(svg);
      const L = { Src: 'Src', Dst: 'Dst', OS: 'Other（聽得到 Src）', OD: 'Other（只聽得到 Dst）' };
      Object.entries(Y).forEach(([k, y]) => {
        S('text', { x: 10, y: y + 4, 'font-size': k.length > 3 ? 10.5 : 13, 'font-weight': 700, text: L[k] }, svg);
        S('line', { x1: 130, y1: y + 14, x2: 712, y2: y + 14, stroke: 'var(--border)' }, svg);
      });
      if (u > 0) span(svg, X, Y.Src - 22, 0, Math.min(u, 1), 'DIFS', 'var(--accent)');
      tblock(svg, X, Y.Src, ...rts, u, 'RTS', 'orange');
      tblock(svg, X, Y.Dst, ...cts, u, 'CTS', 'purple');
      tblock(svg, X, Y.Src, ...f0, u, 'Frag 0', 'accent');
      tblock(svg, X, Y.Dst, ...a0, u, 'ACK 0', 'green');
      tblock(svg, X, Y.Src, ...f1, u, 'Frag 1', 'accent');
      nav(Y.OS, rts[1], a0[1], 'NAV(RTS)', 0, u);
      nav(Y.OS, f0[1], a1[1], 'NAV(Frag 0)', 1, u);
      nav(Y.OS, f1[1], a2[1], 'NAV(Frag 1)', 0, u);
      nav(Y.OD, cts[1], a0[1], 'NAV(CTS)', 0, u);
      nav(Y.OD, a0[1], a1[1], 'NAV(ACK 0)', 1, u);
      if (mode === 'ok') {
        tblock(svg, X, Y.Dst, ...a1, u, 'ACK 1', 'green');
        tblock(svg, X, Y.Src, ...f2, u, 'Frag 2', 'accent');
        tblock(svg, X, Y.Dst, ...a2, u, 'ACK 2', 'green');
        nav(Y.OD, a1[1], a2[1], 'NAV(ACK 1)', 0, u);
        if (u > a2[1]) {
          span(svg, X, Y.OS + 26, a2[1], Math.min(u, a2[1] + 1), 'DIFS');
          span(svg, X, Y.OD + 26, a2[1], Math.min(u, a2[1] + 1), 'DIFS');
          tblock(svg, X, Y.OS, a2[1] + 1, 17, u, 'Backoff', 'purple', { h: 16, fs: 10 });
          tblock(svg, X, Y.OD, a2[1] + 1, 17, u, 'Backoff', 'purple', { h: 16, fs: 10 });
        }
      } else {
        if (u > a1[0]) {
          box(svg, X(a1[0]), Y.Dst - 13, X(a1[1]) - X(a1[0]), 26, 'ACK 1', { fill: 'none', stroke: 'var(--red)', dash: '4 3', color: 'var(--red)', fs: 11 });
          S('path', { d: `M${X(a1[0])} ${Y.Dst - 13} L${X(a1[1])} ${Y.Dst + 13} M${X(a1[1])} ${Y.Dst - 13} L${X(a1[0])} ${Y.Dst + 13}`, stroke: 'var(--red)', 'stroke-width': 2 }, svg);
        }
        if (u > a1[1]) tblock(svg, X, Y.OD, a1[1], 19, u, '可以存取頻道', 'green', { h: 18, fs: 10.5 });
        if (u > a1[1]) span(svg, X, Y.Src - 22, a1[1], Math.min(u, a2[1]), '等 NAV(Frag 1) 到期', 'var(--red)');
        if (u > a2[1]) {
          tblock(svg, X, Y.OS, a2[1], 19, u, '可以存取頻道', 'green', { h: 16, fs: 10, });
          span(svg, X, Y.Src - 22, a2[1], Math.min(u, a2[1] + 1), 'DIFS', 'var(--accent)');
          tblock(svg, X, Y.Src, a2[1] + 1, a2[1] + 2, u, 'BO', 'purple', { fs: 10 });
          tblock(svg, X, Y.Src, a2[1] + 2, 18.6, u, '重傳 Frag 1', 'accent', { fs: 10.5 });
        }
      }
      S('line', { x1: X(u), y1: 18, x2: X(u), y2: 268, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      S('text', { x: 140, y: 292, 'font-size': 10.5, cls: 't-muted', text: '每個訊框之間都是 SIFS；橙／黃兩條是互相重疊的 NAV（上一個還沒到期，下一個就把它延長）' }, svg);
      msg.textContent = phase(PH[mode], u);
    }
    const END = 19;
    const tl = Timeline(fig, { duration: 10.5, render: t => render(t / 10.5 * END), format: t => `${(t / 10.5 * END).toFixed(1)} 單位` });
    makeSeg(fig, [['ok', '正常'], ['lost', 'ACK 1 遺失']], v => { mode = v; tl.pause(); tl.set(0); tl.play(); });
  })();
})();
