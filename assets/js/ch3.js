/* 第 3 章：QoS Control 欄位解碼、EDCA 參數尺規、EDCA 競爭模擬、PCF vs. HCF 超級訊框、TXOP 裝箱、Block Ack、VoIP 省電比較 */
(function () {
  const { S, clear, svgRoot, Timeline } = WL;

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
    const x1 = X(s), x2 = X(Math.min(u, e)), h = o.h || 24;
    S('rect', { x: x1, y: y - h / 2, width: Math.max(1, x2 - x1), height: h, rx: 3, fill: c ? `var(--${c}-soft)` : 'var(--surface-2)', stroke: c ? `var(--${c})` : 'var(--border)', 'stroke-width': 1.3, 'stroke-dasharray': o.dash }, g);
    if (label && u >= s + (e - s) * 0.4) S('text', { x: (X(s) + X(e)) / 2, y: y + 4, 'text-anchor': 'middle', 'font-size': o.fs || 10.5, 'font-weight': 700, fill: c ? `var(--${c})` : 'var(--fg)', text: label }, g);
  }
  function span(g, X, y, s, e, label, color) {
    S('line', { x1: X(s), y1: y, x2: X(e), y2: y, stroke: color || 'var(--muted)', 'stroke-width': 1.2 }, g);
    [s, e].forEach(v => S('line', { x1: X(v), y1: y - 4, x2: X(v), y2: y + 4, stroke: color || 'var(--muted)', 'stroke-width': 1.2 }, g));
    if (label) S('text', { x: (X(s) + X(e)) / 2, y: y - 6, 'text-anchor': 'middle', 'font-size': 10, fill: color || 'var(--muted)', text: label }, g);
  }
  const phase = (list, u) => { let m = list[0][1]; for (const [a, t] of list) if (u >= a) m = t; return m; };
  const hex = (v, n) => '0x' + v.toString(16).toUpperCase().padStart(n || 2, '0');

  // 講義 p.14 的 UP → AC 對應；AC 由低到高
  const UP_AC = [1, 0, 0, 1, 2, 2, 3, 3]; // UP 0..7 → AC index（0 BK、1 BE、2 VI、3 VO）
  const AC = [
    { n: 'AC_BK', c: 'muted', aifsn: 7, cw: a => [a.min, a.max], tx: [0, 0] },
    { n: 'AC_BE', c: 'accent', aifsn: 3, cw: a => [a.min, a.max], tx: [0, 0] },
    { n: 'AC_VI', c: 'orange', aifsn: 2, cw: a => [(a.min + 1) / 2 - 1, a.min], tx: [6.016, 3.008] },
    { n: 'AC_VO', c: 'red', aifsn: 2, cw: a => [(a.min + 1) / 4 - 1, (a.min + 1) / 2 - 1], tx: [3.264, 1.504] },
  ];
  // 〔補充〕PHY 常數：slot、SIFS、aCWmin、aCWmax
  const PHY = {
    ofdm: { name: 'OFDM（11a/g）', slot: 9, sifs: 16, min: 15, max: 1023, txi: 1 },
    dsss: { name: 'DSSS／CCK（11b）', slot: 20, sifs: 10, min: 31, max: 1023, txi: 0 },
  };

  /* ---------- 1. QoS Control 欄位 ---------- */
  (function qosCtl() {
    const fig = document.getElementById('fig-qc-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-qc'), 720, 150, 'QoS Control 欄位');
    const out = document.getElementById('qc-out');
    const kind = document.getElementById('qc-kind'), tid = document.getElementById('qc-tid');
    const ack = document.getElementById('qc-ack'), hi = document.getElementById('qc-hi'), hiv = document.getElementById('qc-hiv');
    const K = [
      ['poll', 'HC 送的 QoS (+)CF-Poll（下行）', 'TXOP limit'],
      ['data', 'HC 送的 QoS Data／Null（下行）', 'QAP PS Buffer State'],
      ['req', '非 AP QSTA 的 QoS Data，bit 4 = 0（上行）', 'TXOP duration requested'],
      ['q', '非 AP QSTA 的 QoS Data，bit 4 = 1（上行）', 'Queue size'],
    ];
    const ACK = ['Normal Ack', 'No Ack', 'No Explicit Ack', 'Block Ack']; // 依 (bit5, bit6) = 00、10、01、11
    kind.innerHTML = K.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    tid.innerHTML = Array.from({ length: 16 }, (_, i) => `<option value="${i}"${i === 6 ? ' selected' : ''}>${i}</option>`).join('');
    ack.innerHTML = ACK.map((l, i) => `<option value="${i}">${l}</option>`).join('');
    function run() {
      const k = K.find(x => x[0] === kind.value), t = +tid.value, a = +ack.value, h = +hi.value;
      const eosp = k[0] === 'q' ? 1 : 0;
      const b5 = a & 1, b6 = a >> 1 & 1;
      const bits = [];
      for (let i = 0; i < 4; i++) bits.push([i, t >> i & 1, 'TID', 'accent']);
      bits.push([4, eosp, k[0] === 'req' || k[0] === 'q' ? 'bit 4' : 'EOSP', 'purple']);
      bits.push([5, b5, 'Ack Policy', 'green'], [6, b6, 'Ack Policy', 'green'], [7, 0, 'Rsv', 'muted']);
      hiv.textContent = h;
      clear(svg);
      const W = 40, x0 = 30;
      bits.forEach(([i, v, , c]) => {
        const x = x0 + i * W;
        box(svg, x, 34, W - 4, 36, String(v), { fs: 15, fill: c === 'muted' ? 'var(--surface-2)' : `var(--${c}-soft)`, stroke: c === 'muted' ? 'var(--border)' : `var(--${c})` });
        S('text', { x: x + (W - 4) / 2, y: 26, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: 'b' + i }, svg);
      });
      [['TID（bits 0–3）', 0, 4, 'accent'], [bits[4][2], 4, 1, 'purple'], ['Ack Policy', 5, 2, 'green'], ['Rsv', 7, 1, 'muted']].forEach(([n, s, l, c]) =>
        S('text', { x: x0 + (s + l / 2) * W - 2, y: 88, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: c === 'muted' ? 'var(--muted)' : `var(--${c})`, text: n }, svg));
      box(svg, x0 + 8 * W, 34, 8 * W - 4, 36, `${hex(h)}（${h}）`, { fs: 14, fill: 'var(--orange-soft)', stroke: 'var(--orange)', color: 'var(--orange)' });
      S('text', { x: x0 + 12 * W - 2, y: 26, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: 'b8 – b15' }, svg);
      S('text', { x: x0 + 12 * W - 2, y: 88, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--orange)', text: k[2] }, svg);
      S('text', { x: x0, y: 122, 'font-size': 10.5, cls: 't-muted', text: 'QoS Control 是 QoS Data 訊框 MAC 標頭的最後 2 octets（Address 4 之後）。圖中 bit 0 在最左邊。' }, svg);
      S('text', { x: x0, y: 140, 'font-size': 10.5, cls: 't-muted', text: 'bit 4：HC 送的是 EOSP（目前的 SP 是否結束）；QSTA 送的用來區分 bits 8–15 是哪一種。' }, svg);
      let mean;
      if (k[0] === 'poll') mean = h ? `TXOP limit = ${h} × 32 µs = ${h * 32} µs：被輪詢的 QSTA 隔 SIFS 開始 polled TXOP，最長這麼久` : 'TXOP limit = 0';
      else if (k[0] === 'data') mean = `QAP PS Buffer State（依講義 p.25：2 + 6 bits）：Highest-Priority Buffered AC = ${h & 3}（〔補充〕ACI 編碼 → ${['AC_BE', 'AC_BK', 'AC_VI', 'AC_VO'][h & 3]}）、QAP Buffered Load = ${h >> 2} × 4096 = ${(h >> 2) * 4096} octets`;
      else if (k[0] === 'req') mean = h ? `TXOP duration requested = ${h} × 32 µs = ${h * 32} µs（範圍 32～8160 µs，含 PHY overhead，數值不累加）` : 'TXOP duration requested = 0：不要求 TXOP';
      else mean = `Queue size = ${h}：〔補充〕這個 TID 在 QSTA 佇列中還有多少資料，單位 256 octets → 約 ${h * 256} octets`;
      const tidTxt = t < 8 ? `TID ${t} = UP ${t} → ${AC[UP_AC[t]].n}（EDCA，講義 p.14）` : `TID ${t} = TSID ${t}（用 TSPEC 註冊的 TS，HCCA／HEMM，講義 p.20）`;
      out.textContent = `${k[1]}\n${tidTxt}\nAck Policy（bit 5 = ${b5}、bit 6 = ${b6}）= ${ACK[a]}\n${mean}\n第 1 octet = ${hex(bits.reduce((s, [i, v]) => s | v << i, 0))}、第 2 octet = ${hex(h)}`;
    }
    [kind, tid, ack].forEach(e => e.addEventListener('change', run));
    hi.addEventListener('input', run);
    run();
  })();

  /* ---------- 2. EDCA 參數尺規（講義 p.42–44） ---------- */
  (function aifs() {
    const fig = document.getElementById('fig-aifs-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-aifs'), 720, 250, 'EDCA 參數');
    const out = document.getElementById('aifs-out');
    let phy = 'ofdm';
    function run() {
      const p = PHY[phy];
      clear(svg);
      const maxSlots = 7 + p.min; // BK 的 AIFSN + CWmin
      const X = s => 120 + s / (maxSlots + 7) * 580;  // s：從 SIFS 結束起算的 slot 數
      S('text', { x: 120, y: 18, 'font-size': 10.5, cls: 't-muted', text: `單位：slot（${p.slot} µs）；SIFS ${p.sifs} µs 畫在最左邊。黃色 = AIFS 的固定等待，綠色 = 第一次嘗試的隨機退避範圍 0～CWmin` }, svg);
      const rows = [...AC].reverse();
      rows.forEach((a, i) => {
        const y = 44 + i * 46, [cmin, cmax] = a.cw(p);
        S('text', { x: 8, y: y + 16, 'font-size': 12, 'font-weight': 700, fill: a.c === 'muted' ? 'var(--fg)' : `var(--${a.c})`, text: a.n }, svg);
        box(svg, 98, y, 20, 24, 'S', { fs: 9.5, fill: 'var(--surface-2)', rx: 2 });
        box(svg, X(0), y, X(a.aifsn) - X(0), 24, `AIFSN ${a.aifsn}`, { fs: 10.5, fill: 'var(--yellow-soft)', stroke: 'var(--orange)', rx: 2 });
        box(svg, X(a.aifsn), y, X(a.aifsn + cmin) - X(a.aifsn), 24, `0～${cmin}`, { fs: 10.5, fill: 'var(--green-soft)', stroke: 'var(--green)', rx: 2 });
        S('text', { x: X(a.aifsn + cmin) + 6, y: y + 16, 'font-size': 10.5, cls: 't-mono', fill: 'var(--muted)', text: `AIFS ${a.aifsn * p.slot + p.sifs} µs` }, svg);
      });
      // DIFS 參考線
      S('line', { x1: X(2), y1: 34, x2: X(2), y2: 226, stroke: 'var(--purple)', 'stroke-dasharray': '3 3' }, svg);
      S('text', { x: X(2), y: 242, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--purple)', 'font-weight': 700, text: 'DIFS（= AIFSN 2）' }, svg);
      out.textContent = `${p.name}：slot ${p.slot} µs、SIFS ${p.sifs} µs、aCWmin ${p.min}、aCWmax ${p.max}；DIFS = 2 × ${p.slot} + ${p.sifs} = ${2 * p.slot + p.sifs} µs\n` +
        rows.map(a => { const [cmin, cmax] = a.cw(p), tx = a.tx[p.txi]; const avg = a.aifsn * p.slot + p.sifs + cmin / 2 * p.slot;
          return `${a.n}：AIFS = ${a.aifsn} × ${p.slot} + ${p.sifs} = ${a.aifsn * p.slot + p.sifs} µs｜CW ${cmin}～${cmax}｜TXOP limit ${tx ? tx + ' ms' : '0（一次一個 MSDU）'}｜平均等待 ≈ ${avg} µs`; }).join('\n') +
        `\n平均等待 = AIFS + CWmin ÷ 2 × slot（媒介閒置、第一次嘗試）〔補充〕`;
    }
    makeSeg(fig, [['ofdm', 'OFDM（11a/g）'], ['dsss', 'DSSS／CCK（11b）']], v => { phy = v; run(); });
    run();
  })();

  /* ---------- 3. EDCA 競爭模擬 ---------- */
  (function edca() {
    const fig = document.getElementById('fig-edca-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-edca'), 720, 230, 'EDCA 競爭');
    const out = document.getElementById('edca-out'), same = document.getElementById('edca-same');
    const p = PHY.ofdm;
    let cw, pick, wins, cols, rounds, last;
    function reset() {
      cw = AC.map(a => a.cw(p)[0]);
      wins = [0, 0, 0, 0]; cols = 0; rounds = 0; last = null;
      draw();
    }
    function draw() { pick = cw.map(c => Math.floor(Math.random() * (c + 1))); }
    function round() {
      const t = AC.map((a, i) => a.aifsn + pick[i]);
      const m = Math.min(...t), tied = t.map((v, i) => (v === m ? i : -1)).filter(i => i >= 0);
      let winner = null, note;
      if (tied.length === 1) {
        winner = tied[0]; note = `${AC[winner].n} 最早數完（AIFSN ${AC[winner].aifsn} + 退避 ${pick[winner]} = ${m} slots）→ 得到 TXOP`;
      } else if (same.checked) {
        winner = Math.max(...tied);
        note = `${tied.map(i => AC[i].n).join('、')} 同時數完 → 同一個 QSTA 的內部碰撞（virtual collision）：優先權高的 ${AC[winner].n} 得到 TXOP，其他 AC 當作碰撞，CW 加倍`;
      } else {
        note = `${tied.map(i => AC[i].n).join('、')} 同時數完 → 不同站台同時送，真正的碰撞：大家都沒收到 ACK，CW 加倍重來`;
        cols++;
      }
      last = { t, pick: pick.slice(), cw: cw.slice(), m, tied, winner, note };
      tied.forEach(i => { if (i !== winner) cw[i] = Math.min(2 * cw[i] + 1, AC[i].cw(p)[1]); });
      if (winner != null) { wins[winner]++; cw[winner] = AC[winner].cw(p)[0]; }
      rounds++;
      draw();
    }
    function render() {
      clear(svg);
      const X = s => 110 + s * 12.5;
      S('text', { x: 110, y: 16, 'font-size': 10.5, cls: 't-muted', text: '每格 = 1 slot（9 µs），從 SIFS 結束起算；黃 = AIFS、綠 = 這一輪抽到的退避' }, svg);
      for (let s = 0; s <= 48; s += 4) {
        S('line', { x1: X(s), y1: 24, x2: X(s), y2: 196, stroke: 'var(--border)', 'stroke-dasharray': s ? '1 3' : '' }, svg);
        S('text', { x: X(s), y: 210, 'text-anchor': 'middle', 'font-size': 9.5, cls: 't-muted t-mono', text: s }, svg);
      }
      const L = last;
      [...AC.keys()].reverse().forEach((i, r) => {
        const a = AC[i], y = 40 + r * 42;
        S('text', { x: 8, y: y + 16, 'font-size': 12, 'font-weight': 700, fill: a.c === 'muted' ? 'var(--fg)' : `var(--${a.c})`, text: a.n }, svg);
        if (!L) return;
        const bo = L.pick[i], end = a.aifsn + bo;
        S('rect', { x: X(0), y, width: X(a.aifsn) - X(0), height: 24, rx: 2, fill: 'var(--yellow-soft)', stroke: 'var(--orange)' }, svg);
        if (bo) S('rect', { x: X(a.aifsn), y, width: X(Math.min(end, 48)) - X(a.aifsn), height: 24, rx: 2, fill: 'var(--green-soft)', stroke: 'var(--green)' }, svg);
        const win = L.winner === i, tie = L.tied.includes(i);
        if (end <= 48) {
          if (win) box(svg, X(end), y - 1, 58, 26, 'TXOP', { fill: 'var(--accent-soft)', stroke: 'var(--accent)', color: 'var(--accent)', fs: 11 });
          else if (tie) box(svg, X(end), y - 1, 58, 26, '碰撞', { fill: 'var(--red-soft)', stroke: 'var(--red)', color: 'var(--red)', fs: 11 });
          else S('text', { x: X(Math.min(end, 48)) + 6, y: y + 16, 'font-size': 10, fill: 'var(--muted)', text: `凍結，剩 ${end - L.m}` }, svg);
        } else S('text', { x: X(48) - 4, y: y + 16, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--muted)', text: `${end} →` }, svg);
        S('text', { x: 104, y: y + 16, 'text-anchor': 'end', 'font-size': 10, cls: 't-mono', fill: 'var(--muted)', text: `CW ${L.cw[i]}` }, svg);
      });
      if (L) S('line', { x1: X(L.m), y1: 26, x2: X(L.m), y2: 196, stroke: 'var(--red)', 'stroke-width': 1.5 }, svg);
      const tot = wins.reduce((a, b) => a + b, 0);
      out.textContent = (L ? `第 ${rounds} 輪：${L.note}\n` : '按「下一輪」開始。四個 AC 都有資料要送，各自等 AIFS、再從 [0, CW] 抽退避值。\n') +
        `累計 ${rounds} 輪：` + AC.map((a, i) => `${a.n} ${wins[i]}（${tot ? Math.round(wins[i] / Math.max(1, rounds) * 100) : 0}%）`).join('、') + (cols ? `、真正碰撞 ${cols}` : '') +
        `\n目前 CW：` + AC.map((a, i) => `${a.n} ${cw[i]}`).join('、') + '\n〔補充〕被凍結的 AC 下一輪照理只數剩下的值；這裡為了看清楚機率，每輪重新抽。';
    }
    fig.querySelector('[data-act="next"]').addEventListener('click', () => { round(); render(); });
    fig.querySelector('[data-act="run"]').addEventListener('click', () => { for (let k = 0; k < 1000; k++) round(); render(); });
    fig.querySelector('[data-act="reset"]').addEventListener('click', () => { reset(); render(); });
    same.addEventListener('change', () => { reset(); render(); });
    reset(); render();
  })();

  /* ---------- 4. PCF vs. HCF 超級訊框（講義 p.49） ---------- */
  (function sf() {
    const fig = document.getElementById('fig-sf-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-sf'), 720, 230, 'PCF 與 HCF 超級訊框');
    const msg = document.getElementById('sf-msg');
    let mode = 'hcf', ev, PH, END = 20, CFE;
    function build() {
      ev = []; PH = [];
      ev.push(['ap', 0, 0.8, 'Beacon', 'red']);
      PH.push([0, 'Beacon：超級訊框開始，CFP 開始，所有站台設 NAV。']);
      if (mode === 'pcf') {
        let t = 1;
        for (let i = 0; i < 3; i++) {
          ev.push(['ap', t, t + 0.4, 'Poll', 'purple']); t += 0.5;
          ev.push(['sta', t, t + 1.6, 'DATA', 'accent']);
          PH.push([t - 0.5, `PC 送 CF-Poll 點名 STA${i + 1}：每次點名只能送 1 個 DATA（講義 p.7）。`]);
          t += 2.0;
        }
        ev.push(['ap', t, t + 0.4, 'CF-End', 'orange']); CFE = t + 0.4;
        PH.push([t, 'CF-End：CFP 結束，NAV 重設。']);
        t = CFE + 0.6;
        [[2.4, 'DATA'], [1.6, 'DATA'], [2.2, 'DATA']].forEach(([l, n], i) => {
          ev.push(['sta', t + 0.8, t + 0.8 + l, n, null]);
          if (!i) PH.push([t, 'CP：只有 DCF。所有站台、所有流量用同一組 DIFS 與 CW 競爭，沒有優先權。']);
          t += 0.8 + l + 0.4;
        });
      } else {
        let t = 1;
        for (let i = 0; i < 3; i++) {
          ev.push(['ap', t, t + 0.4, 'QoS Poll', 'purple']); t += 0.5;
          const n = i === 1 ? 1 : 2;
          const s = t;
          for (let k = 0; k < n; k++) { ev.push(['sta', t, t + 1.1, 'DATA', 'accent']); t += 1.25; }
          ev.push(['txop', s, t - 0.15, 'polled TXOP', 'accent']);
          PH.push([s - 0.5, `HC 送 QoS CF-Poll（帶 TXOP limit），STA${i + 1} 得到一段 polled TXOP，可以隔 SIFS 連送 ${n} 個 DATA；輪詢排程依 TSPEC 計算。`]);
          t += 0.3;
        }
        ev.push(['ap', t, t + 0.4, 'CF-End', 'orange']); CFE = t + 0.4;
        PH.push([t, 'CF-End：CFP 結束。'] );
        t = CFE + 0.6;
        const seq = [['edca', 1.2], ['poll', 1.2], ['poll', 2.4], ['edca', 1.1]];
        seq.forEach(([k, l], i) => {
          if (k === 'edca') {
            ev.push(['sta', t + 0.7, t + 0.7 + l, 'DATA', 'green']);
            ev.push(['txop', t + 0.7, t + 0.7 + l, 'EDCA TXOP', 'green']);
            PH.push([t, 'CP：QSTA 用 EDCA 依 AC 競爭，贏了得到 EDCA TXOP（TXOP limit 在 Beacon 的 EDCA Parameter Set）。']);
            t += 0.7 + l + 0.3;
          } else {
            ev.push(['ap', t + 0.25, t + 0.65, 'QoS Poll', 'purple']);
            ev.push(['sta', t + 0.8, t + 0.8 + l, 'DATA', 'accent']);
            ev.push(['txop', t + 0.8, t + 0.8 + l, 'Polled TXOP', 'accent']);
            PH.push([t, 'CP 中 HC 也能送 QoS CF-Poll：HC 只要等 PIFS 就能搶到媒介，給出 polled TXOP。EDCA TXOP 與 polled TXOP 交錯（講義 p.49）。']);
            t += 0.8 + l + 0.3;
          }
        });
      }
      END = Math.max(20, ev.reduce((m, e) => Math.max(m, e[2]), 0) + 0.5);
    }
    function render(u) {
      clear(svg);
      const X = v => 80 + v / END * 630;
      const L = { ap: 60, sta: 116, txop: 156 };
      S('text', { x: 8, y: L.ap + 4, 'font-size': 12, 'font-weight': 700, text: mode === 'pcf' ? 'PC' : 'HC' }, svg);
      S('text', { x: 8, y: L.sta + 4, 'font-size': 12, 'font-weight': 700, text: 'STAs' }, svg);
      S('text', { x: 8, y: L.txop + 4, 'font-size': 11, fill: 'var(--muted)', text: 'TXOP' }, svg);
      [L.ap, L.sta].forEach(y => S('line', { x1: 76, y1: y + 13, x2: 712, y2: y + 13, stroke: 'var(--border)' }, svg));
      ev.forEach(([lane, s, e, l, c]) => tblock(svg, X, L[lane], s, e, u, l, c, { fs: 9.5, h: lane === 'txop' ? 14 : 24, dash: lane === 'txop' ? '3 2' : null }));
      if (u > 0.8) span(svg, X, 24, 0.8, Math.min(u, CFE), mode === 'pcf' ? 'CFP' : 'CFP（Polling through HCF）', 'var(--accent)');
      if (u > CFE) span(svg, X, 24, CFE, Math.min(u, END), 'CP', 'var(--muted)');
      S('line', { x1: X(u), y1: 30, x2: X(u), y2: 180, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      S('text', { x: 80, y: 208, 'font-size': 10.5, cls: 't-muted', text: mode === 'pcf' ? '依講義 p.49 上半重繪：802.11 periodic Superframe' : '依講義 p.49 下半重繪：802.11e periodic Superframe（虛線框 = TXOP）' }, svg);
      msg.textContent = phase(PH, u);
    }
    build();
    const tl = Timeline(fig, { duration: 12, render: t => render(t / 12 * END), format: t => `${Math.round(t / 12 * 100)}%` });
    makeSeg(fig, [['hcf', '802.11e（HCF）'], ['pcf', '802.11（PCF）']], v => { mode = v; build(); tl.pause(); tl.set(0); tl.play(); });
  })();

  /* ---------- 5. TXOP limit 內能送幾個訊框 ---------- */
  (function txop() {
    const fig = document.getElementById('fig-txop-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-txop'), 720, 150, 'TXOP 裝箱');
    const out = document.getElementById('txop-out'), sz = document.getElementById('txop-size'), szv = document.getElementById('txop-sizev');
    let ac = 3;
    const SIFS = 16, ACK = 24, RATE = 54;
    // 〔補充〕802.11a 的 DATA 時間：preamble 20 µs + ceil((16 + 8 × (MAC 34 + 本文) + 6) ÷ 216) × 4 µs（與 2-4 的 1500 bytes = 248 µs 一致）
    const tData = n => 20 + Math.ceil((16 + 8 * (34 + n) + 6) / (RATE * 4)) * 4;
    function run() {
      const n = +sz.value, d = tData(n), lim = AC[ac].tx[1] * 1000;
      szv.textContent = `${n} bytes`;
      const per = d + SIFS + ACK;
      const k = lim ? Math.max(1, Math.floor((lim + SIFS) / (per + SIFS))) : 1;
      const used = k * per + (k - 1) * SIFS;
      clear(svg);
      const span0 = Math.max(lim, used) * 1.05 || 1, X = v => 20 + v / span0 * 680;
      let t = 0;
      for (let i = 0; i < k; i++) {
        box(svg, X(t), 50, X(t + d) - X(t), 30, X(t + d) - X(t) > 40 ? 'QoS Data' : '', { fill: 'var(--accent-soft)', stroke: 'var(--accent)', fs: 10, rx: 2 });
        t += d + SIFS;
        box(svg, X(t), 50, X(t + ACK) - X(t), 30, '', { fill: 'var(--green-soft)', stroke: 'var(--green)', rx: 2 });
        t += ACK + SIFS;
      }
      if (lim) {
        S('line', { x1: X(lim), y1: 34, x2: X(lim), y2: 96, stroke: 'var(--red)', 'stroke-width': 2 }, svg);
        S('text', { x: X(lim), y: 28, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--red)', text: `TXOP limit ${lim} µs` }, svg);
      }
      span(svg, X, 112, 0, used, `${k} 個交換 = ${used} µs`, 'var(--accent)');
      S('text', { x: 20, y: 140, 'font-size': 10.5, cls: 't-muted', text: '藍 = QoS Data、綠 = ACK，中間都隔 SIFS（講義 p.51）；只算 TXOP 內部，不含 AIFS 與退避' }, svg);
      out.textContent = `${AC[ac].n}（OFDM）TXOP limit = ${lim ? lim + ' µs' : '0 → 一次只送一個 MSDU'}\n` +
        `〔補充〕54 Mbps、${n} bytes：DATA ≈ ${d} µs、ACK ${ACK} µs、SIFS ${SIFS} µs → 每個交換 ${per} µs，之後每多一個再加 SIFS\n` +
        `k × ${per} + (k − 1) × ${SIFS} ≤ ${lim || '—'} → k = ${k}，共 ${used} µs` + (lim ? `，剩 ${lim - used} µs` : '') +
        `\n同樣 ${k} 個訊框若每個都要重新競爭，每次還要多等 AIFS + 退避（${AC[ac].n} 平均約 ${AC[ac].aifsn * 9 + 16 + AC[ac].cw(PHY.ofdm)[0] / 2 * 9} µs）`;
    }
    makeSeg(fig, [['3', 'AC_VO 1.504 ms'], ['2', 'AC_VI 3.008 ms'], ['1', 'AC_BE 0']], v => { ac = +v; run(); });
    sz.addEventListener('input', run);
    run();
  })();

  /* ---------- 6. Block Ack（講義 p.63–64） ---------- */
  (function ba() {
    const fig = document.getElementById('fig-ba-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-ba'), 720, 250, 'Block Ack');
    const msg = document.getElementById('ba-msg');
    let mode = 'imm', ev, PH, END;
    function build() {
      ev = []; PH = [];
      let t = 0;
      ev.push(['o', t, t + 0.7, 'RTS', 'purple']); ev.push(['r', t + 0.9, t + 1.4, 'CTS', 'purple']);
      PH.push([0, 'Originator 先做一次 frame exchange（例如 RTS／CTS）設 NAV，保護接下來的 Data Block（講義圖左「Frame-exchange for NAV Protection」）。']);
      t = 1.6;
      for (let i = 0; i < 4; i++) {
        ev.push(['o', t, t + 1, `Data ${i + 1}`, i === 2 ? 'red' : 'accent']);
        t += 1.2;
      }
      PH.push([1.6, 'Data Block：連送 4 個 QoS Data，Ack Policy = Block Ack，收方先不回 ACK，只記錄。Data 3 在空中出錯（紅色）。']);
      ev.push(['o', t, t + 0.7, 'BAR', 'orange']);
      PH.push([t, 'BlockAckReq（BAR）：帶 TID 與 Starting Sequence Number，請收方回報這一段的接收狀態。']);
      t += 0.9;
      if (mode === 'imm') {
        ev.push(['r', t, t + 1.1, 'BlockAck', 'green']);
        PH.push([t, 'Immediate：收方隔 SIFS 立刻回 BlockAck，Bitmap = 1101（Data 3 沒收到）。適合高頻寬、低延遲的流量。']);
        t += 1.3;
      } else {
        ev.push(['r', t, t + 0.5, 'ACK', null]);
        PH.push([t, 'Delayed：收方先只回一般 ACK，表示收到 BAR；BlockAck 之後再送。']);
        t += 1.9;
        ev.push(['r', t, t + 1.1, 'BlockAck', 'green']);
        PH.push([t, '收方準備好之後，自己競爭媒介送 BlockAck（Bitmap = 1101）。']);
        t += 1.3;
        ev.push(['o', t, t + 0.5, 'ACK', null]);
        PH.push([t, 'Originator 回 ACK 確認收到 BlockAck。適合可以容忍中等延遲的應用。']);
        t += 0.7;
      }
      ev.push(['o', t + 0.3, t + 1.3, 'Data 3', 'accent']);
      PH.push([t + 0.3, '依 Bitmap 只重送沒收到的 Data 3（可以放進下一個 Data Block）。']);
      END = t + 1.6;
    }
    function render(u) {
      clear(svg);
      const X = v => 110 + v / END * 600, L = { o: 70, r: 150 };
      S('text', { x: 8, y: L.o + 4, 'font-size': 12, 'font-weight': 700, text: 'Originator' }, svg);
      S('text', { x: 8, y: L.r + 4, 'font-size': 12, 'font-weight': 700, text: 'Recipient' }, svg);
      [L.o, L.r].forEach(y => S('line', { x1: 104, y1: y + 14, x2: 712, y2: y + 14, stroke: 'var(--border)' }, svg));
      ev.forEach(([lane, s, e, l, c]) => tblock(svg, X, L[lane], s, e, u, l, c, { fs: 9.5, h: 26 }));
      // Bitmap
      const baEv = ev.find(e => e[3] === 'BlockAck');
      if (u > baEv[1] + 0.5) {
        S('text', { x: X(baEv[1]), y: 196, 'font-size': 10.5, 'font-weight': 700, text: 'Bitmap：' }, svg);
        [1, 1, 0, 1].forEach((b, i) => box(svg, X(baEv[1]) + 56 + i * 26, 182, 22, 22, String(b), { fs: 12, fill: b ? 'var(--green-soft)' : 'var(--red-soft)', stroke: b ? 'var(--green)' : 'var(--red)' }));
      }
      if (u > 1.6) span(svg, X, 34, 1.6, Math.min(u, 1.6 + 4.6), 'Data Block（Ack Policy = Block Ack）', 'var(--accent)');
      S('text', { x: 110, y: 236, 'font-size': 10.5, cls: 't-muted', text: '〔補充〕Bitmap 實際是 128 octets：每個 MSDU 16 bits（對應 fragment），最多 64 個 MSDU；這裡只畫 4 個' }, svg);
      S('line', { x1: X(u), y1: 40, x2: X(u), y2: 170, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      msg.textContent = phase(PH, u);
    }
    build();
    const tl = Timeline(fig, { duration: 11, render: t => render(t / 11 * END), format: t => `${Math.round(t / 11 * 100)}%` });
    makeSeg(fig, [['imm', 'Immediate Block Ack'], ['del', 'Delayed Block Ack']], v => { mode = v; build(); tl.pause(); tl.set(0); tl.play(); });
  })();

  /* ---------- 7. VoIP：舊省電 vs. WMM Power Save（講義 p.75–80） ---------- */
  (function voip() {
    const fig = document.getElementById('fig-voip-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-voip'), 720, 240, 'VoIP 省電比較');
    const out = document.getElementById('voip-out'), li = document.getElementById('voip-li');
    let mode = 'wmm';
    const T = 320; // 畫 320 ms
    function run() {
      const listen = +li.value, BI = 100;
      clear(svg);
      const X = ms => 100 + ms / T * 600;
      const yA = 70, yC = 150;
      S('text', { x: 8, y: yA + 4, 'font-size': 12, 'font-weight': 700, text: 'AP' }, svg);
      S('text', { x: 8, y: yC + 4, 'font-size': 12, 'font-weight': 700, fill: 'var(--green)', text: 'Client' }, svg);
      [yA, yC].forEach(y => S('line', { x1: 96, y1: y + 12, x2: 712, y2: y + 12, stroke: 'var(--border)' }, svg));
      for (let ms = 0; ms <= T; ms += 20) S('text', { x: X(ms), y: 214, 'text-anchor': 'middle', 'font-size': 9, cls: 't-muted t-mono', text: ms }, svg);
      S('text', { x: 712, y: 228, 'text-anchor': 'end', 'font-size': 9.5, cls: 't-muted', text: 'ms' }, svg);
      // 語音封包每 20 ms 到達 AP（下行）
      const arr = []; for (let ms = 8; ms < T; ms += 20) arr.push(ms);
      arr.forEach(ms => S('path', { d: `M${X(ms)} ${yA - 30} L${X(ms)} ${yA - 16}`, stroke: 'var(--orange)', 'stroke-width': 2 }, svg));
      S('text', { x: X(8), y: yA - 34, 'font-size': 9.5, fill: 'var(--orange)', text: '下行語音到 AP（每 20 ms）' }, svg);
      const awake = [];
      const delays = [];
      if (mode === 'legacy') {
        for (let b = 0; b <= T; b += BI) S('rect', { x: X(b), y: yA - 10, width: 6, height: 22, fill: 'var(--red-soft)', stroke: 'var(--red)' }, svg);
        S('text', { x: X(0) + 8, y: yA - 14, 'font-size': 9.5, fill: 'var(--red)', text: 'Beacon（TIM）每 100 ms' }, svg);
        // 每 listen 個 Beacon 醒一次，醒來後 PS-Poll 逐一取件
        for (let b = 0; b <= T; b += BI * listen) {
          const pend = arr.filter(ms => ms < b && ms >= b - BI * listen);
          let t = b + 2;
          pend.forEach(ms => {
            S('rect', { x: X(t), y: yC - 8, width: 3, height: 16, fill: 'var(--green)' }, svg);
            t += 1.2;
            S('rect', { x: X(t), y: yA - 8, width: 3, height: 16, fill: 'var(--accent)' }, svg);
            delays.push(t - ms); t += 1.2;
          });
          awake.push([b - 1, t + 1]);
        }
      } else {
        // 每 20 ms 送 trigger（夾帶上行語音），AP 立刻在 SP 內送出緩衝的語音
        for (let tr = 10; tr < T; tr += 20) {
          S('rect', { x: X(tr), y: yC - 8, width: 5, height: 16, fill: 'var(--green)' }, svg);
          const pend = arr.filter(ms => ms <= tr && ms > tr - 20);
          let t = tr + 1.2;
          S('rect', { x: X(t), y: yA - 6, width: 2, height: 12, fill: 'var(--muted)' }, svg);
          t += 0.8;
          pend.forEach(ms => { S('rect', { x: X(t), y: yA - 8, width: 4, height: 16, fill: 'var(--accent)' }, svg); delays.push(t - ms); t += 1.2; });
          awake.push([tr - 0.5, t + 1]);
        }
        S('text', { x: X(10) + 8, y: yC - 14, 'font-size': 9.5, fill: 'var(--green)', text: 'Trigger + voice（每 20 ms）' }, svg);
      }
      // 清醒波形
      let d = `M${X(0)} ${yC + 30}`;
      awake.forEach(([a, b]) => { d += ` L${X(Math.max(0, a))} ${yC + 30} L${X(Math.max(0, a))} ${yC + 18} L${X(Math.min(T, b))} ${yC + 18} L${X(Math.min(T, b))} ${yC + 30}`; });
      d += ` L${X(T)} ${yC + 30}`;
      S('path', { d, fill: 'none', stroke: 'var(--green)', 'stroke-width': 2 }, svg);
      S('text', { x: 8, y: yC + 30, 'font-size': 9.5, fill: 'var(--muted)', text: 'Awake／Doze' }, svg);
      const awakeMs = awake.reduce((s, [a, b]) => s + Math.min(T, b) - Math.max(0, a), 0);
      const avg = delays.reduce((a, b) => a + b, 0) / Math.max(1, delays.length), max = Math.max(...delays);
      out.textContent = (mode === 'legacy'
        ? `舊省電（Listen Interval ${listen}）：Client 每 ${listen * BI} ms 醒來看 TIM，再一個一個 PS-Poll 取件（每個都要經過 DCF 存取延遲，講義 p.75）`
        : 'WMM Power Save（U-APSD）：Client 每 20 ms 送一次 trigger（夾帶上行語音），AP 回 ACK 後在 SP 內用 TXOP burst 送出緩衝的語音（講義 p.77、p.80）') +
        `\n下行語音延遲：平均 ${avg.toFixed(1)} ms、最大 ${max.toFixed(1)} ms → ${max < 20 ? '符合' : '不符合'} VoIP 小於 20 ms 的要求（講義 p.78）` +
        `\n〔補充〕示意圖的清醒時間約 ${(awakeMs / T * 100).toFixed(1)}%（訊框長度放大畫，實際比例更小）`;
    }
    makeSeg(fig, [['wmm', 'WMM Power Save'], ['legacy', '舊省電（TIM + PS-Poll）']], v => { mode = v; li.disabled = v !== 'legacy'; run(); });
    li.addEventListener('change', run);
    li.disabled = true;
    run();
  })();
})();
