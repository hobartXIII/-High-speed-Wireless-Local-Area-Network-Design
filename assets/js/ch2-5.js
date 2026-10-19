/* 第 2-5 章：Frame Control 解碼器、CFP 時序、TBTT、IBSS Beacon、PCF 輪詢、省電 TIM／DTIM、TIM bitmap、ATIM、主動掃描、漫遊 */
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
  const hex = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');
  // 清醒／睡眠的波形：segs = [[開始, 結束], ...] 醒著的區間
  function wave(g, X, y, segs, u, x0, x1, color) {
    const hi = y - 10, lo = y + 8;
    let d = `M${x0} ${lo}`;
    for (const [a, b] of segs) {
      if (u <= a) break;
      d += ` L${X(a)} ${lo} L${X(a)} ${hi} L${X(Math.min(u, b))} ${hi}`;
      if (u > b) d += ` L${X(b)} ${lo}`;
    }
    const last = segs.find(([a, b]) => u > a && u <= b);
    if (!last) d += ` L${Math.min(X(u), x1)} ${lo}`;
    S('path', { d, fill: 'none', stroke: color || 'var(--green)', 'stroke-width': 2 }, g);
  }

  /* ---------- 1. Frame Control 解碼器 ---------- */
  (function typeDec() {
    const host = document.getElementById('fig-type');
    if (!host) return;
    const svg = svgRoot(host, 720, 120, 'Frame Control 第一個 octet');
    const sel = document.getElementById('ty-sel'), out = document.getElementById('ty-out');
    const TN = ['管理（Management）', '控制（Control）', '資料（Data）'];
    const F = [
      [0, 0, 'Association request'], [0, 1, 'Association response'], [0, 2, 'Reassociation request'], [0, 3, 'Reassociation response'],
      [0, 4, 'Probe request'], [0, 5, 'Probe response'], [0, 8, 'Beacon'], [0, 9, 'ATIM'], [0, 10, 'Disassociation'], [0, 11, 'Authentication'], [0, 12, 'Deauthentication'],
      [1, 10, 'PS-Poll'], [1, 11, 'RTS'], [1, 12, 'CTS'], [1, 13, 'ACK'], [1, 14, 'CF-End'], [1, 15, 'CF-End + CF-Ack'],
      [2, 0, 'Data'], [2, 1, 'Data + CF-Ack'], [2, 2, 'Data + CF-Poll'], [2, 3, 'Data + CF-Ack + CF-Poll'],
      [2, 4, 'Null function（no data）'], [2, 5, 'CF-Ack（no data）'], [2, 6, 'CF-Poll（no data）'], [2, 7, 'CF-Ack + CF-Poll（no data）'],
    ];
    sel.innerHTML = [0, 1, 2].map(t => `<optgroup label="${TN[t]}">` + F.map((f, i) => f[0] === t ? `<option value="${i}"${f[2] === 'Beacon' ? ' selected' : ''}>${f[2]}</option>` : '').join('') + '</optgroup>').join('');
    function run() {
      const [type, sub, name] = F[+sel.value];
      const oct = sub * 16 + type * 4;
      clear(svg);
      const groups = [['Subtype', 4, 'orange'], ['Type', 2, 'accent'], ['Version', 2, 'muted']];
      let bit = 7;
      groups.forEach(([n, len, c], gi) => {
        const x0 = 110 + (7 - bit) * 62;
        for (let k = 0; k < len; k++, bit--) {
          const v = (oct >> bit) & 1, x = 110 + (7 - bit) * 62;
          box(svg, x, 30, 56, 40, String(v), { fs: 18, fill: v ? (c === 'muted' ? 'var(--surface-2)' : `var(--${c}-soft)`) : 'var(--surface)', stroke: c === 'muted' ? 'var(--border)' : `var(--${c})` });
          S('text', { x: x + 28, y: 22, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-muted t-mono', text: 'b' + bit }, svg);
        }
        S('text', { x: x0 + len * 31 - 3, y: 92, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: c === 'muted' ? 'var(--muted)' : `var(--${c})`, text: n }, svg);
      });
      S('text', { x: 100, y: 56, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 700, text: '第 1 octet' }, svg);
      S('text', { x: 110, y: 112, 'font-size': 10.5, cls: 't-muted', text: '由高到低：Subtype（b7–b4）、Type（b3 b2）、Protocol Version（b1 b0，目前為 0）' }, svg);
      let extra = '';
      if (type === 2) {
        const f = [];
        if (sub & 1) f.push('b4 = 1 → CF-Ack（確認上一個訊框）');
        if (sub & 2) f.push('b5 = 1 → CF-Poll（點名）');
        if (sub & 4) f.push('b6 = 1 → 沒有資料（no data）');
        extra = '\n' + (f.length ? f.join('；') : '沒有任何 CF 旗標：一般的資料訊框');
      }
      out.textContent = `${name}：Type ${type.toString(2).padStart(2, '0')}（${TN[type]}）、Subtype ${sub.toString(2).padStart(4, '0')}\n` +
        `第 1 octet = Subtype × 16 + Type × 4 + Version = ${sub} × 16 + ${type} × 4 + 0 = ${oct} = ${hex(oct)}（${oct.toString(2).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1 $2')}）` + extra;
    }
    sel.addEventListener('change', run);
    run();
  })();

  /* ---------- 2. CFP 時序 ---------- */
  (function cfpTiming() {
    const host = document.getElementById('fig-cfp');
    if (!host) return;
    const svg = svgRoot(host, 720, 210, 'CFP 時序');
    const dt = document.getElementById('cfp-dtim'), pe = document.getElementById('cfp-period');
    const mx = document.getElementById('cfp-max'), dl = document.getElementById('cfp-delay');
    const mxv = document.getElementById('cfp-maxv'), dlv = document.getElementById('cfp-delayv'), out = document.getElementById('cfp-out');
    const BI = 100; // TU
    function run() {
      const dtim = +dt.value, per = +pe.value, rep = dtim * per;
      let max = +mx.value, d = +dl.value;
      const maxCap = Math.max(0.2, rep - 0.2);
      const capped = max > maxCap;
      if (capped) max = maxCap;
      if (d > max - 0.05) d = Math.max(0, max - 0.05);
      mxv.textContent = `${Math.round(max * BI)} TU`;
      dlv.textContent = `${Math.round(d * BI)} TU`;
      const N = rep * 2 + Math.min(2, rep);
      const X = v => 64 + v / N * 640;
      clear(svg);
      const yB = 50, yC = 110, yN = 150;
      S('text', { x: 6, y: yB + 4, 'font-size': 11, 'font-weight': 700, text: 'Beacon' }, svg);
      S('text', { x: 6, y: yC + 4, 'font-size': 11, 'font-weight': 700, text: '媒介' }, svg);
      S('text', { x: 6, y: yN + 4, 'font-size': 11, 'font-weight': 700, text: 'NAV' }, svg);
      // CFP／CP 區塊
      for (let r = 0; r * rep < N; r++) {
        const k = r * rep, delay = r === 1 ? d : 0, s = k + delay, e = k + max;
        if (r === 1 && d > 0) {
          S('rect', { x: X(k), y: yC - 13, width: X(k + d) - X(k), height: 26, fill: 'var(--red-soft)', stroke: 'var(--red)' }, svg);
          if (X(k + d) - X(k) > 30) S('text', { x: (X(k) + X(k + d)) / 2, y: yC + 4, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--red)', 'font-weight': 700, text: 'Busy' }, svg);
        }
        S('rect', { x: X(s), y: yC - 13, width: X(Math.min(e, N)) - X(s), height: 26, fill: 'var(--accent-soft)', stroke: 'var(--accent)' }, svg);
        if (X(Math.min(e, N)) - X(s) > 40) S('text', { x: (X(s) + X(Math.min(e, N))) / 2, y: yC + 4, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--accent)', text: r === 1 && d > 0 ? 'CFP（縮短）' : 'CFP' }, svg);
        const nx = Math.min((r + 1) * rep, N);
        if (e < nx) {
          S('rect', { x: X(e), y: yC - 13, width: X(nx) - X(e), height: 26, fill: 'var(--surface-2)', stroke: 'var(--border)' }, svg);
          if (X(nx) - X(e) > 26) S('text', { x: (X(e) + X(nx)) / 2, y: yC + 4, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--muted)', 'font-weight': 700, text: 'CP' }, svg);
        }
        S('rect', { x: X(s), y: yN - 8, width: X(Math.min(e, N)) - X(s), height: 16, fill: 'var(--yellow-soft)', stroke: 'var(--orange)' }, svg);
        if (r === 1 && d > 0) {
          span(svg, X, yC + 30, k, k + max, 'TBTT + CFPMaxDuration', 'var(--purple)');
        }
      }
      // TBTT 與 Beacon
      for (let k = 0; k < N; k++) {
        S('line', { x1: X(k), y1: yB - 22, x2: X(k), y2: yC + 14, stroke: 'var(--red)', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
        const isD = k % dtim === 0, startCfp = k % rep === 0;
        const bx = X(k + (startCfp && k === rep ? d : 0));
        box(svg, bx, yB - 10, 16, 20, isD ? 'D' : 'B', { fill: isD ? 'var(--purple-soft)' : 'var(--surface)', stroke: isD ? 'var(--purple)' : 'var(--border)', fs: 10.5, rx: 2 });
        // CFP 內的 Beacon 標 CFPDurRemaining
        const r = Math.floor(k / rep), base = r * rep, end = base + max;
        if (k < end) {
          const t0 = k === base && r === 1 ? k + d : k;
          const rem = Math.round((end - t0) * BI);
          S('text', { x: bx + 8, y: yB - 16, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--accent)', text: rem }, svg);
        }
      }
      S('text', { x: 64, y: 196, 'font-size': 10.5, cls: 't-muted', text: '紅框 = 媒介忙（Busy）；Beacon 上方藍字 = CFPDurRemaining（TU）；紅色虛線 = TBTT；黃色 = 其他站台的 NAV（CF-End 重設）' }, svg);
      const ms = v => (v * 1.024).toFixed(1);
      out.textContent = `CFP repetition interval = CFP Period × DTIM Period × Beacon Interval = ${per} × ${dtim} × ${BI} TU = ${rep * BI} TU（${ms(rep * BI)} ms）\n` +
        `CFPMaxDuration = ${Math.round(max * BI)} TU${capped ? `（已限制在 ${Math.round(maxCap * BI)} TU，要留時間給 CP）` : ''}\n` +
        `第 2 個 CFP：Beacon 延後 ${Math.round(d * BI)} TU → CFP 從 TBTT + ${Math.round(d * BI)} 到 TBTT + ${Math.round(max * BI)} TU，只剩 ${Math.round((max - d) * BI)} TU` + (d > 0 ? '（foreshortened）' : '');
    }
    [dt, pe].forEach(e => e.addEventListener('change', run));
    [mx, dl].forEach(e => e.addEventListener('input', run));
    run();
  })();

  /* ---------- 3. TBTT ---------- */
  (function tbtt() {
    const fig = document.getElementById('fig-tbtt-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-tbtt'), 720, 200, 'Beacon 與 TBTT');
    const msg = document.getElementById('tbtt-msg');
    const N = 6, X = v => 120 + v * 95;
    let delays = [0, 0.25, 0, 0.15, 0.3, 0];
    function render() {
      clear(svg);
      const rows = [['照 TBTT（標準）', 60], ['從上一個起算（錯誤）', 140]];
      rows.forEach(([n, y]) => {
        S('text', { x: 8, y: y + 4, 'font-size': 11, 'font-weight': 700, text: n }, svg);
        S('line', { x1: 112, y1: y + 12, x2: 712, y2: y + 12, stroke: 'var(--border)' }, svg);
      });
      for (let k = 0; k <= N; k++) {
        S('text', { x: X(k), y: 22, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--red)', text: '×' }, svg);
        S('line', { x1: X(k), y1: 28, x2: X(k), y2: 166, stroke: 'var(--red)', 'stroke-dasharray': '2 3' }, svg);
      }
      S('text', { x: 112, y: 22, 'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--red)', text: 'TBTT' }, svg);
      let wrong = 0, drift = 0;
      for (let k = 0; k < N; k++) {
        const dd = delays[k];
        // 標準
        if (dd > 0) S('rect', { x: X(k), y: 48, width: X(k + dd) - X(k), height: 24, fill: 'var(--red-soft)', stroke: 'var(--red)' }, svg);
        box(svg, X(k + dd), 48, 18, 24, 'B', { fill: 'var(--accent-soft)', stroke: 'var(--accent)', fs: 11, rx: 2 });
        // 錯誤：從上一個實際時間起算
        const t = k === 0 ? dd : wrong + 1 + dd;
        if (dd > 0) S('rect', { x: X(t - dd), y: 128, width: X(t) - X(t - dd), height: 24, fill: 'var(--red-soft)', stroke: 'var(--red)' }, svg);
        if (t < N + 0.2) box(svg, X(t), 128, 18, 24, 'B', { fill: 'var(--orange-soft)', stroke: 'var(--orange)', fs: 11, rx: 2 });
        wrong = t; drift = t - k;
      }
      S('text', { x: 120, y: 192, 'font-size': 10.5, cls: 't-muted', text: '紅色 = 媒介忙（CSMA 延後）；B = Beacon 實際送出時間' }, svg);
      const tot = delays.reduce((a, b) => a + b, 0);
      msg.textContent = `標準做法：每個 Beacon 只被自己那次的媒介忙碌延後，下一個仍回到 TBTT；Timestamp 記錄實際送出時間，對時不受影響。` +
        `錯誤做法：延遲一路累積，第 ${N} 個 Beacon 已經比 TBTT 晚 ${drift.toFixed(2)} 個 Beacon Interval（= 所有延遲的總和 ${tot.toFixed(2)}），省電站台會在錯的時間醒來。`;
    }
    fig.querySelector('[data-act="busy"]').addEventListener('click', () => {
      delays = Array.from({ length: N }, () => (Math.random() < 0.55 ? Math.round((0.08 + Math.random() * 0.3) * 100) / 100 : 0));
      render();
    });
    render();
  })();

  /* ---------- 4. IBSS Beacon 競爭 ---------- */
  (function ibss() {
    const fig = document.getElementById('fig-ibss-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-ibss'), 720, 200, 'IBSS Beacon 隨機延遲');
    const out = document.getElementById('ibss-out'), busyIn = document.getElementById('ibss-busy');
    const ST = ['STA 22', 'STA 31', 'STA 15', 'STA 7'];
    const CW = 31, SLOT = 20, MAXR = 2 * CW;
    let picks = [5, 21, 38, 47], busy = 0, history = [], round = 1;
    function render() {
      clear(svg);
      const X = v => 110 + v / (MAXR + 14) * 590;
      const min = Math.min(...picks), winners = picks.map((p, i) => (p === min ? i : -1)).filter(i => i >= 0);
      const tx = busy + min;
      S('line', { x1: X(0), y1: 14, x2: X(0), y2: 176, stroke: 'var(--red)', 'stroke-dasharray': '2 3' }, svg);
      S('text', { x: X(0), y: 12, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--red)', text: 'TBTT' }, svg);
      if (busy) {
        S('rect', { x: X(0), y: 20, width: X(busy) - X(0), height: 150, fill: 'var(--red-soft)', opacity: 0.6 }, svg);
        S('text', { x: (X(0) + X(busy)) / 2, y: 186, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--red)', text: 'Busy Medium' }, svg);
      }
      ST.forEach((n, i) => {
        const y = 40 + i * 36, p = picks[i], win = winners.includes(i);
        S('text', { x: 10, y: y + 4, 'font-size': 12, 'font-weight': 700, text: n }, svg);
        S('rect', { x: X(busy), y: y - 8, width: X(busy + p) - X(busy), height: 16, rx: 2, fill: win ? 'var(--green-soft)' : 'var(--surface-2)', stroke: win ? 'var(--green)' : 'var(--border)' }, svg);
        if (win) box(svg, X(tx), y - 11, 46, 22, winners.length > 1 ? '碰撞' : 'Beacon', { fill: winners.length > 1 ? 'var(--red-soft)' : 'var(--accent-soft)', stroke: winners.length > 1 ? 'var(--red)' : 'var(--accent)', fs: 10.5, color: winners.length > 1 ? 'var(--red)' : 'var(--accent)' });
        else {
          S('line', { x1: X(tx), y1: y - 9, x2: X(tx), y2: y + 9, stroke: 'var(--red)', 'stroke-width': 2 }, svg);
          S('text', { x: X(tx) + 6, y: y + 4, 'font-size': 10, fill: 'var(--muted)', text: `放棄（剩 ${p - min}）` }, svg);
        }
        S('text', { x: 104, y: y + 4, 'text-anchor': 'end', 'font-size': 10, cls: 't-mono', fill: 'var(--muted)', text: p }, svg);
      });
      const w = winners.length > 1 ? `${winners.map(i => ST[i]).join('、')} 抽到同一個值 ${min} → 同時送出，Beacon 碰撞（沒有 ACK、不重送）` : `${ST[winners[0]]} 抽到最小的 ${min}，先數完 → 送 Beacon；其他站台聽到 Beacon 就放棄這一輪`;
      if (round > 1) history = history.slice(-5);
      out.textContent = `第 ${round} 個 TBTT（DSSS：CWmin ${CW}、slot ${SLOT} µs → 延遲 Random[0, ${MAXR}] × ${SLOT} µs）\n` +
        ST.map((n, i) => `${n}：${picks[i]} slots = ${picks[i] * SLOT} µs`).join('　') + `\n${w}` +
        (busy ? `\nTBTT 時媒介忙 ${busy} slots：大家都等媒介空閒後才開始倒數，Beacon 跟著延後。` : '') +
        (history.length ? `\n前幾輪送 Beacon 的：${history.join(' → ')}` : '');
    }
    fig.querySelector('[data-act="next"]').addEventListener('click', () => {
      const min = Math.min(...picks), ws = picks.map((p, i) => (p === min ? ST[i] : null)).filter(Boolean);
      history.push(ws.length > 1 ? '（碰撞）' : ws[0]);
      picks = ST.map(() => Math.floor(Math.random() * (MAXR + 1)));
      busy = busyIn.checked ? 6 + Math.floor(Math.random() * 8) : 0;
      round++;
      render();
    });
    busyIn.addEventListener('change', () => { busy = busyIn.checked ? 10 : 0; render(); });
    render();
  })();

  /* ---------- 5. PCF 超級訊框 ---------- */
  (function pcf() {
    const fig = document.getElementById('fig-pcf-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-pcf'), 720, 360, 'PCF 輪詢時序');
    const msg = document.getElementById('pcf-msg');
    const L = { AP: 46, S1: 96, S2: 136, S3: 176, S4: 216, DCF: 268 };
    const SIFS = 0.3, PIFS = 0.45;
    let mode = 'slide', ev, gaps, PH, END, cfEnd, maxDur;
    function build() {
      ev = []; gaps = []; PH = [];
      let t = 0;
      ev.push(['AP', 0, 1, 'Busy', null]);
      PH.push([0, '媒介正被一筆 DCF 交換佔用（Busy）。CFP 該開始了，PC 要等媒介空閒。']);
      t = 1; gaps.push([t, t + PIFS, 'PIFS']); t += PIFS;
      PH.push([1, '媒介空閒後 PC 只等 PIFS（比 DIFS 短），DCF 站台還在等 DIFS，PC 先搶到媒介。']);
      ev.push(['AP', t, t + 0.7, 'B', 'purple']); PH.push([t, 'PC 送 Beacon，CFP 開始。所有站台把 NAV 設成 CF_Max_Duration（下方黃色），DCF 站台整段都不會送。']); t += 0.7;
      const D = [['D1+Poll', '送資料給 STA1，順便點名 STA1。'], ['D2+Ack+Poll', '確認 U1、送資料給 STA2、點名 STA2：一個訊框做三件事（捎帶）。'], ['Ack+Poll', '確認 U2、點名 STA3（沒有下行資料）。'], ['D4+Poll', '送資料給 STA4、點名 STA4。']];
      for (let i = 0; i < 4; i++) {
        gaps.push([t, t + SIFS, 'SIFS']); t += SIFS;
        const len = i === 2 ? 0.55 : 0.85;
        ev.push(['AP', t, t + len, D[i][0], 'accent']); PH.push([t, `CF-D${i + 1}「${D[i][0]}」：${D[i][1]}`]); t += len;
        const answer = !(i === 2 && mode === 'slide');
        if (answer) {
          gaps.push([t, t + SIFS, 'SIFS']); t += SIFS;
          ev.push(['S' + (i + 1), t, t + 0.8, `U${i + 1}+Ack`, 'green']);
          PH.push([t, `STA${i + 1} 收到 CF-Poll，隔 SIFS 立即回「U${i + 1}+Ack」：上行資料，順便確認剛才的下行訊框（CF-Ack）。`]);
          t += 0.8;
        } else {
          gaps.push([t, t + PIFS, 'PIFS']);
          PH.push([t, 'STA3 被點名但沒有資料、沒有回應（講義 p.4 的 No Up）。PC 等 PIFS 確定沒人送，就繼續點名下一個；PIFS 仍比 DIFS 短。']);
          t += PIFS;
        }
      }
      gaps.push([t, t + SIFS, 'SIFS']); t += SIFS;
      ev.push(['AP', t, t + 0.6, 'CF-End+Ack', 'orange']);
      PH.push([t, '「CF-End + Ack」：確認 U4，並結束 CFP。所有站台的 NAV 被重設（Reset NAV），比 CF_Max_Duration 早結束。']);
      t += 0.6; cfEnd = t; maxDur = t + 1.4;
      PH.push([t, 'CP 開始：DCF 站台照 2-4 的規則等 DIFS、退避後才能送。']);
      ev.push(['DCF', t + 0.6, t + 1.2, 'BO', 'purple']);
      ev.push(['DCF', t + 1.2, t + 2.4, 'Data', 'accent']);
      gaps.push([t, t + 0.6, 'DIFS', 'DCF']);
      END = t + 2.6;
    }
    function render(u) {
      clear(svg);
      const X = v => 92 + v / END * 612;
      const name = { AP: 'AP（PC）', S1: 'STA1', S2: 'STA2', S3: 'STA3', S4: 'STA4', DCF: 'DCF 站台' };
      Object.entries(L).forEach(([k, y]) => {
        S('text', { x: 8, y: y + 4, 'font-size': 12, 'font-weight': 700, text: name[k] }, svg);
        S('line', { x1: 86, y1: y + 13, x2: 712, y2: y + 13, stroke: 'var(--border)' }, svg);
      });
      ev.forEach(([lane, s, e, l, c]) => tblock(svg, X, L[lane], s, e, u, l, c, { fs: 10 }));
      gaps.forEach(([s, e, l, lane]) => { if (u > s) span(svg, X, lane === 'DCF' ? L.DCF - 20 : L.AP - 22, s, Math.min(u, e), l, l === 'PIFS' ? 'var(--purple)' : l === 'DIFS' ? 'var(--accent)' : 'var(--green)'); });
      // NAV
      const ny = L.DCF + 26;
      if (u > 1 + PIFS) {
        S('rect', { x: X(1 + PIFS), y: ny - 7, width: X(Math.min(u, cfEnd)) - X(1 + PIFS), height: 14, fill: 'var(--yellow-soft)', stroke: 'var(--orange)' }, svg);
        S('text', { x: X(1 + PIFS) + 4, y: ny + 4, 'font-size': 10, 'font-weight': 700, fill: 'var(--orange)', text: 'NAV' }, svg);
      }
      if (u > cfEnd) {
        S('rect', { x: X(cfEnd), y: ny - 7, width: X(maxDur) - X(cfEnd), height: 14, fill: 'none', stroke: 'var(--orange)', 'stroke-dasharray': '3 3' }, svg);
        S('text', { x: X(cfEnd) - 4, y: ny + 22, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--red)', 'font-weight': 700, text: 'Reset NAV' }, svg);
        S('text', { x: (X(cfEnd) + X(maxDur)) / 2, y: ny + 34, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--muted)', text: '↑ CF_Max_Duration' }, svg);
      }
      // CFP／CP 標示
      if (u > 1 + PIFS) span(svg, X, 352, 1 + PIFS, Math.min(u, cfEnd), 'CFP（Super Frame 的無競爭期）', 'var(--accent)');
      if (u > cfEnd) span(svg, X, 352, cfEnd, Math.min(u, END), 'CP', 'var(--muted)');
      S('line', { x1: X(u), y1: 20, x2: X(u), y2: 306, stroke: 'var(--red)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
      msg.textContent = phase(PH, u);
    }
    build();
    const tl = Timeline(fig, { duration: 12, render: t => render(t / 12 * END), format: t => `${(t / 12 * END).toFixed(1)} 單位` });
    makeSeg(fig, [['slide', '講義 p.12（STA3 沒回應）'], ['all', 'STA3 也有資料']], v => { mode = v; build(); tl.pause(); tl.set(0); tl.play(); });
  })();

  /* ---------- 6. Infrastructure 省電 ---------- */
  (function ps() {
    const fig = document.getElementById('fig-ps-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-ps'), 720, 230, 'TIM DTIM PS-Poll');
    const msg = document.getElementById('ps-msg');
    const X = u => 90 + u * 96, yA = 70, yS = 160, END = 6.4;
    const bt = k => k + (k === 1 ? 0.15 : 0); // 第 2 個 Beacon 被媒介忙延後
    const isD = k => k % 3 === 0;
    // 省電站台醒著的區間：每個 (D)TIM 前醒來；DTIM 後收廣播、第 5 個 TIM 後 PS-Poll 取件才多醒一下
    const segs = [[-0.12, 0.3], [0.88, 1.27], [1.88, 2.12], [2.88, 3.42], [3.88, 4.84], [4.88, 5.12], [5.88, 6.4]];
    const PH = [
      [0, '每個 Beacon 都帶 TIM；第 0 個是 DTIM（每 3 個 TIM 一個）。省電站台在預期的 (D)TIM 之前醒來聽。'],
      [0.3, 'TIM 沒有它的資料 → 回去睡。'],
      [0.9, '這個 Beacon 碰到媒介忙，晚了一點才送；站台醒著等到 Beacon 才睡。下一個 Beacon 仍照 TBTT。'],
      [2.9, 'DTIM：AP 先送 Beacon，接著送緩衝的廣播／群播；站台保持清醒收完廣播。'],
      [3.45, '收完廣播，回去睡。'],
      [3.9, '這個 TIM 顯示 AP 有它的資料（它的 AID 那個 bit = 1）。'],
      [4.2, '站台送 PS-Poll（Duration/ID 欄位放自己的 AID），並保持清醒。'],
      [4.4, 'AP 送出緩衝的資料，站台回 ACK，之後回去睡。'],
      [5.9, '下一個 DTIM：又是廣播時間。'],
    ];
    function render(u) {
      clear(svg);
      S('text', { x: 8, y: yA + 4, 'font-size': 12, 'font-weight': 700, text: 'AP activity' }, svg);
      S('text', { x: 8, y: yS + 4, 'font-size': 12, 'font-weight': 700, fill: 'var(--green)', text: 'PS Station' }, svg);
      S('line', { x1: 86, y1: yA + 14, x2: 712, y2: yA + 14, stroke: 'var(--border)' }, svg);
      span(svg, X, 22, 0, 1, 'TIM-Interval', 'var(--muted)');
      span(svg, X, 22, 3, 6, 'DTIM interval', 'var(--purple)');
      for (let k = 0; k <= 6; k++) {
        const t = bt(k);
        S('line', { x1: X(k), y1: 30, x2: X(k), y2: yS + 24, stroke: 'var(--border)', 'stroke-dasharray': '2 3' }, svg);
        if (k === 1) tblock(svg, X, yA, 0.95, 1.15, u, '', null, { h: 18 });
        tblock(svg, X, yA, t, t + 0.12, u, '', isD(k) ? 'purple' : 'red', { h: 26 });
        if (u > t) S('text', { x: X(t + 0.06), y: yA - 18, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: isD(k) ? 'var(--purple)' : 'var(--red)', text: isD(k) ? 'DTIM' : 'TIM' }, svg);
        if (isD(k) && k > 0) tblock(svg, X, yA, t + 0.15, t + 0.45, u, '廣播', 'accent', { h: 22, fs: 9.5 });
      }
      if (u > 1) S('text', { x: X(1.05), y: yA + 28, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--muted)', text: 'Busy' }, svg);
      // PS-Poll 與資料
      tblock(svg, X, yS - 30, 4.2, 4.32, u, '', 'green', { h: 16 });
      if (u > 4.2) S('text', { x: X(4.26), y: yS - 42, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: 'var(--green)', text: 'PS-Poll' }, svg);
      tblock(svg, X, yA, 4.4, 4.7, u, 'Data', 'accent', { h: 22, fs: 9.5 });
      tblock(svg, X, yS - 30, 4.74, 4.8, u, '', 'green', { h: 16 });
      if (u > 4.74) S('text', { x: X(4.77) + 14, y: yS - 42, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--green)', text: 'ACK' }, svg);
      wave(svg, X, yS, segs, u, 86, 712);
      S('text', { x: 90, y: yS + 40, 'font-size': 10.5, cls: 't-muted', text: '綠線高 = 醒著（Awake）、低 = 睡覺（Doze）' }, svg);
      S('line', { x1: X(u), y1: 30, x2: X(u), y2: yS + 24, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      msg.textContent = phase(PH, u);
    }
    Timeline(fig, { duration: 11, render: t => render(t / 11 * END), format: t => `${(t / 11 * END).toFixed(1)} 個 TIM 間隔` });
  })();

  /* ---------- 7. TIM bitmap ---------- */
  (function tim() {
    const fig = document.getElementById('fig-tim-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-tim'), 720, 190, 'TIM Partial Virtual Bitmap');
    const out = document.getElementById('tim-out');
    let on = new Set([3, 13]);
    function render() {
      clear(svg);
      for (let o = 0; o < 4; o++) {
        const y = 22 + o * 40;
        S('text', { x: 10, y: y + 20, 'font-size': 11.5, 'font-weight': 700, text: `octet ${o}` }, svg);
        for (let b = 7; b >= 0; b--) {
          const aid = o * 8 + b, x = 80 + (7 - b) * 64, v = on.has(aid);
          const g = S('g', { style: 'cursor:pointer' }, svg);
          box(g, x, y, 58, 32, `AID ${aid}`, { fill: v ? (aid ? 'var(--green-soft)' : 'var(--purple-soft)') : 'var(--surface)', stroke: v ? (aid ? 'var(--green)' : 'var(--purple)') : 'var(--border)', fs: 10.5, sub: `b${b} = ${v ? 1 : 0}` });
          g.addEventListener('click', () => { if (on.has(aid)) on.delete(aid); else on.add(aid); render(); });
        }
        const val = [...on].filter(a => a >> 3 === o).reduce((s, a) => s | (1 << (a & 7)), 0);
        S('text', { x: 600, y: y + 20, 'font-size': 12, 'font-weight': 700, cls: 't-mono', fill: val ? 'var(--accent)' : 'var(--muted)', text: hex(val) }, svg);
      }
      const list = [...on].sort((a, b) => a - b);
      out.textContent = (list.length ? list.map(a => (a === 0 ? 'AID 0（廣播／群播）' : `AID ${a} → octet ${a >> 3}（${a} ÷ 8 = ${a >> 3} 餘 ${a & 7}）的 bit ${a & 7}`)).join('\n') : '沒有任何緩衝資料：所有省電站台看到 TIM 後都可以回去睡。') +
        '\n' + [0, 1, 2, 3].map(o => `octet ${o} = ${hex([...on].filter(a => a >> 3 === o).reduce((s, a) => s | (1 << (a & 7)), 0))}`).join('、');
    }
    fig.querySelector('[data-act="clear"]').addEventListener('click', () => { on = new Set(); render(); });
    render();
  })();

  /* ---------- 8. IBSS ATIM ---------- */
  (function atim() {
    const fig = document.getElementById('fig-atim-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-atim'), 720, 300, 'IBSS ATIM');
    const msg = document.getElementById('atim-msg');
    const BI = 5, W = 1.3, END = 11.6;
    const X = u => 96 + (u + 0.4) / (END + 0.4) * 610;
    const Y = { B: 66, A: 124, Bs: 182, C: 240 };
    const awake = {
      A: [[-0.2, W], [BI - 0.2, 2 * BI + W]],
      Bs: [[-0.2, W], [BI - 0.2, 2 * BI + W]],
      C: [[-0.2, W], [BI - 0.2, BI + W], [2 * BI - 0.2, 2 * BI + W]],
    };
    const PH = [
      [-0.4, '所有站台在 TBTT 前醒來，一起進入 ATIM window。'],
      [0.1, '第 1 個 Beacon Interval：這次沒有人有資料要送，沒有 ATIM。'],
      [W, 'ATIM window 結束，沒收到也沒送 ATIM 的站台都回去睡（Power-Saving State）。'],
      [BI - 0.2, '第 2 個 TBTT：大家又醒來。'],
      [BI + 0.35, 'A 有資料給 B：在 ATIM window 內送 ATIM（Xmit ATIM）。'],
      [BI + 0.7, 'B 收到 ATIM，回 ACK；A、B 都要保持清醒到下一個 ATIM window 結束。'],
      [BI + W, 'ATIM window 結束。C 沒有收到 ATIM → 回去睡。'],
      [BI + W + 0.4, 'window 之後 A 用 DCF（退避）送資料（Xmit Frame），B 回 ACK。'],
      [2 * BI - 0.2, '下一個 TBTT，C 再醒來；A、B 一直醒著，直到這個 ATIM window 結束。'],
    ];
    function render(u) {
      clear(svg);
      const nm = { B: 'Beacon', A: 'Station A', Bs: 'Station B', C: 'Station C' };
      Object.entries(Y).forEach(([k, y]) => {
        S('text', { x: 8, y: y + 4, 'font-size': 12, 'font-weight': 700, text: nm[k] }, svg);
        if (k === 'B') S('line', { x1: 90, y1: y + 12, x2: 712, y2: y + 12, stroke: 'var(--border)' }, svg);
      });
      for (let k = 0; k <= 2; k++) {
        const t = k * BI;
        S('line', { x1: X(t), y1: 30, x2: X(t), y2: 262, stroke: 'var(--border)', 'stroke-dasharray': '2 3' }, svg);
        S('rect', { x: X(t), y: 34, width: X(t + W) - X(t), height: 250, fill: 'var(--accent-soft)', opacity: 0.35 }, svg);
        S('text', { x: (X(t) + X(t + W)) / 2, y: 46, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--accent)', 'font-weight': 700, text: 'ATIM Window' }, svg);
        tblock(svg, X, Y.B, t, t + 0.12, u, '', 'purple', { h: 22 });
      }
      span(svg, X, 22, 0, BI, 'Beacon Interval', 'var(--muted)');
      span(svg, X, 22, BI, 2 * BI, 'Beacon Interval', 'var(--muted)');
      // 訊框
      const fr = (lane, s, e, l, c) => { tblock(svg, X, Y[lane] - 26, s, e, u, '', c, { h: 12 }); if (u > s) S('text', { x: X(s), y: Y[lane] - 36, 'font-size': 9.5, fill: `var(--${c})`, 'font-weight': 700, text: l }, svg); };
      fr('A', BI + 0.35, BI + 0.5, 'ATIM', 'orange');
      fr('Bs', BI + 0.7, BI + 0.82, 'ACK', 'green');
      fr('A', BI + W + 0.6, BI + W + 1.4, 'Frame', 'accent');
      fr('Bs', BI + W + 1.6, BI + W + 1.72, 'ACK', 'green');
      ['A', 'Bs', 'C'].forEach(k => wave(svg, X, Y[k], awake[k], u, 90, 712));
      S('rect', { x: X(BI - 0.3), y: 96, width: X(2 * BI - 0.05) - X(BI - 0.3), height: 174, fill: 'none', stroke: 'var(--accent)', 'stroke-dasharray': '3 3' }, svg);
      S('text', { x: (X(BI - 0.3) + X(2 * BI)) / 2, y: 292, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--muted)', text: '綠線高 = Awake、低 = Power-Saving State' }, svg);
      S('line', { x1: X(u), y1: 30, x2: X(u), y2: 262, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      msg.textContent = phase(PH, u);
    }
    Timeline(fig, { duration: 12, render: t => render(t / 12 * (END + 0.4) - 0.4), format: t => `${(t / 12 * (END + 0.4) - 0.4).toFixed(1)} 單位` });
  })();

  /* ---------- 9. 主動掃描 ---------- */
  (function scan() {
    const fig = document.getElementById('fig-scan-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-scan'), 720, 250, '主動掃描');
    const msg = document.getElementById('scan-msg');
    const Y = { STA: 80, R1: 140, R2: 196 };
    const MIN = 3.3, MAX = 9.3, END = 10.6;
    const X = u => 110 + u / END * 595;
    let mode = 'ap';
    const PH = {
      ap: [[0, '切到要掃描的頻道，等媒介空閒（DIFS）。'], [0.5, '送 Probe Request：目的位址廣播、帶 SSID 與廣播 BSSID；同時啟動 ProbeTimer。'], [1.3, '收到 Probe 的 AP（Responder）也要照 DCF：等 DIFS、退避後才能回。'], [2.4, 'Responder 2 先回 Probe Response（單播管理訊框）。'], [3.6, '掃描站台隔 SIFS 回 ACK。Min_Probe_Response_Time 之前已經有回應 → 要等到 Max_Probe_Response_Time。'], [4.2, 'Responder 1 等 DIFS＋退避後也回 Probe Response，同樣得到 ACK。'], [MAX, 'ProbeTimer 到 Max_Probe_Response_Time：處理所有收到的 Probe Response，然後掃描下一個頻道。']],
      none: [[0, '切到要掃描的頻道，等媒介空閒（DIFS）。'], [0.5, '送 Probe Request，啟動 ProbeTimer。'], [1.3, '這個頻道沒有 AP，等待回應中……'], [MIN, '到了 Min_Probe_Response_Time 都沒有任何回應 → 清除 NAV，馬上換下一個頻道，不必等到 Max。']],
    };
    function render(u) {
      clear(svg);
      const nm = { STA: 'Scanning STA', R1: 'Responder 1', R2: 'Responder 2' };
      Object.entries(Y).forEach(([k, y]) => {
        S('text', { x: 8, y: y + 4, 'font-size': 12, 'font-weight': 700, text: nm[k], fill: mode === 'none' && k !== 'STA' ? 'var(--muted)' : 'var(--fg)' }, svg);
        S('line', { x1: 104, y1: y + 13, x2: 712, y2: y + 13, stroke: 'var(--border)' }, svg);
      });
      if (u > 0) span(svg, X, Y.STA - 22, 0, Math.min(u, 0.5), 'DIFS', 'var(--accent)');
      tblock(svg, X, Y.STA, 0.5, 1.3, u, 'PROBE', 'orange');
      if (u > 1.3) {
        span(svg, X, 30, 1.3, Math.min(u, MIN), 'Min_Probe_Response_Time', 'var(--red)');
        if (mode === 'ap' && u > MIN) span(svg, X, 30, MIN, Math.min(u, MAX), 'Max_Probe_Response_Time', 'var(--purple)');
      }
      if (mode === 'ap') {
        if (u > 1.3) span(svg, X, Y.R2 - 22, 1.3, Math.min(u, 1.9), 'DIFS', 'var(--accent)');
        tblock(svg, X, Y.R2, 1.9, 2.4, u, 'BO', 'purple', { fs: 9.5 });
        tblock(svg, X, Y.R2, 2.4, 3.6, u, 'P RESPONSE', 'green');
        if (u > 3.6) span(svg, X, Y.STA - 22, 3.6, Math.min(u, 3.8), 'SIFS', 'var(--green)');
        tblock(svg, X, Y.STA, 3.8, 4.2, u, 'ACK', 'accent');
        tblock(svg, X, Y.R1, 1.3, 4.2, u, '凍結（媒介忙）', null, { h: 14, fs: 9.5, dash: '3 3' });
        if (u > 4.2) span(svg, X, Y.R1 - 22, 4.2, Math.min(u, 4.8), 'DIFS', 'var(--accent)');
        tblock(svg, X, Y.R1, 4.8, 5.6, u, 'BO', 'purple', { fs: 9.5 });
        tblock(svg, X, Y.R1, 5.6, 6.8, u, 'P RESPONSE', 'green');
        if (u > 6.8) span(svg, X, Y.STA - 22, 6.8, Math.min(u, 7.0), 'SIFS', 'var(--green)');
        tblock(svg, X, Y.STA, 7.0, 7.4, u, 'ACK', 'accent');
        tblock(svg, X, Y.STA, MAX, END, u, '下一頻道', 'orange', { fs: 9.5 });
      } else {
        tblock(svg, X, Y.STA, MIN, MIN + 2.5, u, '清 NAV → 下一頻道', 'orange', { fs: 9.5 });
      }
      S('line', { x1: X(u), y1: 36, x2: X(u), y2: 226, stroke: 'var(--red)', 'stroke-dasharray': '3 3' }, svg);
      S('text', { x: 110, y: 244, 'font-size': 10.5, cls: 't-muted', text: 'BO = 退避（Backoff）；Probe Response 是單播的管理訊框，要照 DCF 競爭，也要回 ACK' }, svg);
      msg.textContent = phase(PH[mode], u);
    }
    const tl = Timeline(fig, { duration: 10, render: t => render(t / 10 * END), format: t => `${(t / 10 * END).toFixed(1)} 單位` });
    makeSeg(fig, [['ap', '有兩台 AP 回應'], ['none', '這個頻道沒有 AP']], v => { mode = v; tl.pause(); tl.set(0); tl.play(); });
  })();

  /* ---------- 10. 漫遊 ---------- */
  (function roam() {
    const host = document.getElementById('fig-roam');
    if (!host) return;
    const svg = svgRoot(host, 720, 240, '漫遊與 Reassociation');
    const xIn = document.getElementById('roam-x'), thIn = document.getElementById('roam-th');
    const xv = document.getElementById('roam-xv'), thv = document.getElementById('roam-thv'), out = document.getElementById('roam-out');
    const AP = [['A', 130], ['B', 360], ['C', 590]];
    const px = v => 60 + v / 100 * 600;
    const sig = (x, ax) => Math.max(0, Math.round(100 - Math.abs(x - ax) * 0.35));
    let cur = 0, log = [], lastX = null;
    function step(x, th) {
      const s = AP.map(a => sig(x, a[1]));
      if (s[cur] < th) {
        let best = cur;
        s.forEach((v, i) => { if (v > s[best]) best = i; });
        if (best !== cur && s[best] >= th) {
          log.push(`位置 ${Math.round((x - 60) / 6)}：AP ${AP[cur][0]} 只剩 ${s[cur]}（＜ 門檻 ${th}）→ 掃描 → 向 AP ${AP[best][0]}（${s[best]}）送 Reassociation Request → 成功 → AP ${AP[best][0]} 通知 DS，DS 通知 AP ${AP[cur][0]}`);
          cur = best;
        }
      }
      return s;
    }
    function run() {
      const x = px(+xIn.value), th = +thIn.value;
      // 從上次的位置一路走過來，才能正確模擬遲滯
      const from = lastX == null ? px(0) : lastX, n = Math.max(1, Math.ceil(Math.abs(x - from) / 4));
      let s;
      for (let i = 1; i <= n; i++) s = step(from + (x - from) * i / n, th);
      lastX = x;
      log = log.slice(-4);
      xv.textContent = +xIn.value; thv.textContent = th;
      clear(svg);
      S('line', { x1: 80, y1: 30, x2: 640, y2: 30, stroke: 'var(--muted)', 'stroke-width': 3 }, svg);
      S('text', { x: 650, y: 34, 'font-size': 11, fill: 'var(--muted)', text: 'DS' }, svg);
      const rTh = (100 - th) / 0.35;
      AP.forEach(([n, ax], i) => {
        S('circle', { cx: ax, cy: 120, r: rTh, fill: i === cur ? 'var(--accent-soft)' : 'none', stroke: i === cur ? 'var(--accent)' : 'var(--border)', 'stroke-dasharray': '4 4', opacity: 0.8 }, svg);
        S('line', { x1: ax, y1: 30, x2: ax, y2: 100, stroke: 'var(--muted)', 'stroke-width': 1.5 }, svg);
        box(svg, ax - 34, 100, 68, 28, `AP ${n}`, { fill: i === cur ? 'var(--accent)' : 'var(--surface)', stroke: 'var(--accent)', color: i === cur ? '#fff' : 'var(--accent)' });
        S('text', { x: ax, y: 146, 'text-anchor': 'middle', 'font-size': 11, cls: 't-mono', fill: s[i] >= th ? 'var(--green)' : 'var(--red)', text: `訊號 ${s[i]}` }, svg);
      });
      S('line', { x1: x, y1: 200, x2: AP[cur][1], y2: 128, stroke: 'var(--accent)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }, svg);
      S('circle', { cx: x, cy: 206, r: 9, fill: 'var(--orange)', stroke: 'var(--surface)', 'stroke-width': 2 }, svg);
      S('text', { x, y: 230, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: '行動站台' }, svg);
      out.textContent = `目前 Association：AP ${AP[cur][0]}（訊號 ${s[cur]}）\n虛線圈 = 訊號 ≥ 門檻 ${th} 的範圍` +
        (log.length ? '\n' + log.join('\n') : '\n往右拖動站台，看它什麼時候 Reassociation。');
    }
    xIn.addEventListener('input', run);
    thIn.addEventListener('input', run);
    run();
  })();
})();
