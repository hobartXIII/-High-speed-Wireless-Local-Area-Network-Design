/* 第 4 章：ALOHA 模擬器、Poisson 與二項分佈、Vulnerable period、三種 persistence、S–G 曲線、CSMA/CD 狀態與能量、流量模型產生器 */
(function () {
  const { S, clear, svgRoot, Timeline, arrowDefs } = WL;

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
    S('rect', { x, y, width: w, height: h, rx: o.rx == null ? 4 : o.rx, fill: o.fill || 'var(--surface-2)', stroke: o.stroke || 'var(--border)', 'stroke-width': o.sw || 1.2, 'stroke-dasharray': o.dash, opacity: o.op }, g);
    if (label) S('text', { x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle', 'font-size': o.fs || 12, 'font-weight': o.fw || 600, fill: o.color || 'var(--fg)', text: label }, g);
  }
  // 時間軸上的方塊：只畫到目前時間 u
  function tblock(g, X, y, s, e, u, label, c, o) {
    o = o || {};
    if (u <= s) return;
    const x1 = X(s), x2 = X(Math.min(u, e)), h = o.h || 22;
    S('rect', { x: x1, y: y - h / 2, width: Math.max(1, x2 - x1), height: h, rx: 3, fill: c ? `var(--${c}-soft)` : 'var(--surface-2)', stroke: c ? `var(--${c})` : 'var(--border)', 'stroke-width': 1.3, 'stroke-dasharray': o.dash }, g);
    if (label && u >= s + (e - s) * 0.4) S('text', { x: (X(s) + X(e)) / 2, y: y + 4, 'text-anchor': 'middle', 'font-size': o.fs || 10.5, 'font-weight': 700, fill: c ? `var(--${c})` : 'var(--fg)', text: label }, g);
  }
  function span(g, X, y, s, e, label, color) {
    S('line', { x1: X(s), y1: y, x2: X(e), y2: y, stroke: color || 'var(--muted)', 'stroke-width': 1.2 }, g);
    [s, e].forEach(v => S('line', { x1: X(v), y1: y - 4, x2: X(v), y2: y + 4, stroke: color || 'var(--muted)', 'stroke-width': 1.2 }, g));
    if (label) S('text', { x: (X(s) + X(e)) / 2, y: y - 6, 'text-anchor': 'middle', 'font-size': 10, fill: color || 'var(--muted)', text: label }, g);
  }
  const phase = (list, u) => { let m = list[0][1]; for (const [a, t] of list) if (u >= a) m = t; return m; };
  const f3 = v => v.toFixed(3);
  // 指數分佈亂數（平均 m）；Poisson 過程在 [0, T) 的到達時間
  const expo = m => -Math.log(1 - Math.random()) * m;
  function poissonArrivals(rate, t0, t1) {
    const out = [];
    if (rate <= 0) return out;
    for (let t = t0 + expo(1 / rate); t < t1; t += expo(1 / rate)) out.push(t);
    return out;
  }
  // 講義的吞吐量公式；CSMA 為〔補充〕Kleinrock–Tobagi
  const TH = {
    aloha: G => G * Math.exp(-2 * G),
    slotted: G => G * Math.exp(-G),
    np: (G, a) => G * Math.exp(-a * G) / (G * (1 + 2 * a) + Math.exp(-a * G)),
    p1: (G, a) => G * (1 + G + a * G * (1 + G + a * G / 2)) * Math.exp(-G * (1 + 2 * a)) /
      (G * (1 + 2 * a) - (1 - Math.exp(-a * G)) + (1 + a * G) * Math.exp(-G * (1 + a))),
  };

  /* ---------- 1. ALOHA／Slotted ALOHA 模擬器（講義 p.4–5、p.16–18） ---------- */
  (function aloha() {
    const fig = document.getElementById('fig-aloha-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-aloha'), 720, 290, 'ALOHA 模擬器');
    const out = document.getElementById('aloha-out');
    const gIn = document.getElementById('aloha-g'), gv = document.getElementById('aloha-gv');
    const T = 12, USERS = 6;
    const X = t => 70 + t / T * 630;
    let mode = 'pure', arrivals = [], bulk = '';

    // 依模式決定每個封包的開始時間與是否碰撞（封包長度 = 1 個訊框時間）
    function resolve(arr, m) {
      const fr = arr.map(a => ({ a: a.t, u: a.u, s: m === 'slotted' ? Math.ceil(a.t) : a.t }));
      fr.sort((p, q) => p.s - q.s);
      fr.forEach((f, i) => {
        f.bad = false;
        for (let j = i - 1; j >= 0 && fr[j].s > f.s - 1; j--) if (m === 'pure' || fr[j].s === f.s) { f.bad = true; fr[j].bad = true; }
      });
      return fr;
    }
    function regen() {
      // 從 −1 開始產生，讓窗口左邊界的碰撞也算得對
      arrivals = poissonArrivals(+gIn.value, -1, T).map(t => ({ t, u: Math.floor(Math.random() * USERS) }));
      bulk = '';
      draw();
    }
    function draw() {
      const G = +gIn.value;
      gv.textContent = G.toFixed(1);
      clear(svg);
      const fr = resolve(arrivals, mode).filter(f => f.s < T);
      if (mode === 'slotted') for (let k = 0; k <= T; k++) S('line', { x1: X(k), y1: 12, x2: X(k), y2: 262, stroke: 'var(--border)', 'stroke-dasharray': '2 3' }, svg);
      for (let u = 0; u < USERS; u++) {
        const y = 22 + u * 30;
        S('text', { x: 10, y: y + 4, 'font-size': 11.5, 'font-weight': 600, text: '使用者 ' + 'ABCDEF'[u] }, svg);
        S('line', { x1: X(0), y1: y + 11, x2: X(T), y2: y + 11, stroke: 'var(--border)' }, svg);
      }
      const yc = 22 + USERS * 30 + 22;
      S('text', { x: 10, y: yc + 4, 'font-size': 11.5, 'font-weight': 700, text: '通道' }, svg);
      fr.forEach(f => {
        const x1 = X(Math.max(0, f.s)), x2 = X(Math.min(T, f.s + 1));
        if (x2 <= x1) return;
        const c = f.bad ? 'red' : 'green', y = 22 + f.u * 30;
        S('rect', { x: x1, y: y - 9, width: x2 - x1, height: 18, rx: 2, fill: `var(--${c}-soft)`, stroke: `var(--${c})`, 'stroke-width': 1.2 }, svg);
        if (mode === 'slotted' && f.a >= 0 && f.a < f.s) S('line', { x1: X(f.a), y1: y, x2: x1, y2: y, stroke: 'var(--muted)', 'stroke-dasharray': '2 2' }, svg);
        if (f.a >= 0) S('circle', { cx: X(f.a), cy: y, r: 2.5, fill: 'var(--fg)' }, svg);
        S('rect', { x: x1, y: yc - 10, width: x2 - x1, height: 20, fill: `var(--${c})`, opacity: f.bad ? 0.45 : 0.8 }, svg);
      });
      S('line', { x1: X(0), y1: yc + 16, x2: X(T), y2: yc + 16, stroke: 'var(--muted)' }, svg);
      for (let k = 0; k <= T; k += 2) S('text', { x: X(k), y: yc + 30, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: k }, svg);
      S('text', { x: X(T), y: yc + 44, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted', text: '時間（訊框時間）　● 封包產生的時刻' }, svg);
      const inWin = fr.filter(f => f.s >= 0);
      const ok = inWin.filter(f => !f.bad).length;
      const th = mode === 'pure' ? TH.aloha(G) : TH.slotted(G);
      out.textContent = `${mode === 'pure' ? 'Pure ALOHA' : 'Slotted ALOHA'}，G = ${G.toFixed(1)}：這 ${T} 個訊框時間內嘗試 ${inWin.length} 次、成功 ${ok} 次、碰撞 ${inWin.length - ok} 次\n` +
        `本次 S ≈ ${ok} ÷ ${T} = ${f3(ok / T)}　　公式 S = ${mode === 'pure' ? 'Ge^(−2G)' : 'Ge^(−G)'} = ${f3(th)}（樣本少，會有誤差）` + (bulk ? '\n' + bulk : '');
    }
    function run() {
      const G = +gIn.value, N = 20000;
      const arr = poissonArrivals(G, -1, N).map(t => ({ t, u: 0 }));
      const fr = resolve(arr, mode).filter(f => f.s >= 0 && f.s < N);
      const ok = fr.filter(f => !f.bad).length;
      const th = mode === 'pure' ? TH.aloha(G) : TH.slotted(G);
      bulk = `跑 ${N} 個訊框時間：嘗試 ${fr.length} 次（G ≈ ${f3(fr.length / N)}）、成功 ${ok} 次 → S ≈ ${f3(ok / N)}，公式 ${f3(th)}`;
      draw();
    }
    makeSeg(fig, [['pure', 'Pure ALOHA'], ['slotted', 'Slotted ALOHA']], v => { mode = v; bulk = ''; draw(); });
    gIn.addEventListener('input', regen);
    fig.querySelector('[data-act="regen"]').addEventListener('click', regen);
    fig.querySelector('[data-act="run"]').addEventListener('click', run);
    regen();
  })();

  /* ---------- 2. Poisson 與二項分佈（講義 p.10–11） ---------- */
  (function pois() {
    const fig = document.getElementById('fig-pois-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-pois'), 720, 260, 'Poisson 分佈');
    const out = document.getElementById('pois-out');
    const lIn = document.getElementById('pois-l'), lv = document.getElementById('pois-lv');
    const nIn = document.getElementById('pois-n'), nv = document.getElementById('pois-nv');
    const NS = [13, 16, 20, 30, 50, 100, 1000, 0]; // 0 = 不畫二項分佈
    const K = 25;
    const lnFact = n => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
    const poisson = (l, k) => Math.exp(k * Math.log(l) - l - lnFact(k));
    const binom = (n, p, k) => (k > n ? 0 : Math.exp(lnFact(n) - lnFact(k) - lnFact(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p)));
    function run() {
      const l = +lIn.value, N = NS[+nIn.value];
      lv.textContent = l.toFixed(1);
      nv.textContent = N ? String(N) : '不顯示';
      clear(svg);
      const P = Array.from({ length: K }, (_, k) => poisson(l, k));
      const B = N ? Array.from({ length: K }, (_, k) => binom(N, l / N, k)) : null;
      const ymax = Math.max(0.1, ...P, ...(B || [])) * 1.1;
      const X = k => 60 + k * 25.5, Y = v => 220 - v / ymax * 195;
      S('line', { x1: 50, y1: 220, x2: 705, y2: 220, stroke: 'var(--muted)' }, svg);
      S('line', { x1: 50, y1: 20, x2: 50, y2: 220, stroke: 'var(--muted)' }, svg);
      for (let i = 0; i <= 4; i++) {
        const v = ymax / 1.1 * i / 4;
        S('text', { x: 44, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted t-mono', text: v.toFixed(2) }, svg);
      }
      P.forEach((v, k) => {
        S('rect', { x: X(k) - 8, y: Y(v), width: 16, height: 220 - Y(v), fill: 'var(--accent)', opacity: 0.75 }, svg);
        if (B) S('rect', { x: X(k) - 10, y: Y(B[k]), width: 20, height: 220 - Y(B[k]), fill: 'none', stroke: 'var(--orange)', 'stroke-width': 1.6 }, svg);
        if (k % 2 === 0) S('text', { x: X(k), y: 236, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: k }, svg);
      });
      S('text', { x: 380, y: 254, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-muted', text: 'k（區間內發生的次數）' }, svg);
      box(svg, 520, 18, 14, 10, '', { fill: 'var(--accent)', stroke: 'var(--accent)', rx: 1 });
      S('text', { x: 540, y: 27, 'font-size': 10.5, text: `Poisson（λT = ${l}）` }, svg);
      if (B) {
        box(svg, 520, 36, 14, 10, '', { fill: 'none', stroke: 'var(--orange)', rx: 1 });
        S('text', { x: 540, y: 45, 'font-size': 10.5, text: `二項 N = ${N}、p = ${f3(l / N)}` }, svg);
      }
      const mode = P.indexOf(Math.max(...P));
      let txt = `λT = ${l}：P(0) = e^(−${l}) = ${P[0].toFixed(4)}；最高點 k = ${mode}，P = ${P[mode].toFixed(4)}；平均 = 變異數 = ${l}`;
      if (B) {
        const diff = Math.max(...P.map((v, k) => Math.abs(v - B[k])));
        txt += `\n二項分佈 N = ${N}（每段 Δt = T ÷ ${N}，發生機率 λΔt = ${f3(l / N)}）：和 Poisson 的最大差距 ${diff.toFixed(4)}，N 越大越小`;
      }
      out.textContent = txt;
    }
    lIn.addEventListener('input', run);
    nIn.addEventListener('input', run);
    run();
  })();

  /* ---------- 3. Vulnerable period（講義 p.15–18） ---------- */
  (function vuln() {
    const fig = document.getElementById('fig-vuln-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-vuln'), 720, 210, 'Vulnerable period');
    const msg = document.getElementById('vuln-msg');
    const xIn = document.getElementById('vuln-x'), xv = document.getElementById('vuln-xv');
    const X = t => 80 + (t + 0.8) / 4.6 * 600; // 時間 −0.8～3.8（單位 t）
    let mode = 'pure';
    function run() {
      const x = +xIn.value;
      xv.textContent = (x >= 0 ? '+' : '') + x.toFixed(2) + ' t';
      clear(svg);
      const ar = arrowDefs(svg);
      const arrive = 1 + x, start = mode === 'slotted' ? Math.ceil(arrive - 1e-9) : arrive;
      const hit = start > 0 && start < 2 && (mode === 'pure' || start === 1);
      if (mode === 'slotted') for (let k = -0; k <= 3; k++) {
        S('line', { x1: X(k), y1: 20, x2: X(k), y2: 160, stroke: 'var(--border)', 'stroke-dasharray': '2 3' }, svg);
      }
      // 易受干擾期
      const v0 = mode === 'pure' ? 0 : 0, v1 = mode === 'pure' ? 2 : 1;
      S('rect', { x: X(v0), y: 24, width: X(v1) - X(v0), height: 130, fill: 'var(--yellow-soft)', opacity: 0.7 }, svg);
      S('text', { x: (X(v0) + X(v1)) / 2, y: 38, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--orange)', text: mode === 'pure' ? 'Vulnerable period = 2t' : 'Vulnerable period = t（同一個 slot）' }, svg);
      // 灰色封包
      box(svg, X(1), 92, X(2) - X(1), 30, '灰色封包', { fill: 'var(--surface-2)', stroke: 'var(--muted)', fs: 11 });
      // 另一個封包
      const c = hit ? 'red' : 'green';
      box(svg, X(start), 52, X(start + 1) - X(start), 30, '另一個封包', { fill: `var(--${c}-soft)`, stroke: `var(--${c})`, color: `var(--${c})`, fs: 11 });
      if (mode === 'slotted' && Math.abs(arrive - start) > 1e-6) {
        S('circle', { cx: X(arrive), cy: 67, r: 3, fill: 'var(--fg)' }, svg);
        S('line', { x1: X(arrive), y1: 67, x2: X(start) - 2, y2: 67, stroke: 'var(--muted)', 'stroke-dasharray': '3 2', 'marker-end': ar('muted') }, svg);
      }
      S('line', { x1: X(-0.8), y1: 160, x2: X(3.8), y2: 160, stroke: 'var(--muted)', 'marker-end': ar('muted') }, svg);
      [[0, 't₀'], [1, 't₀ + t'], [2, 't₀ + 2t'], [3, 't₀ + 3t']].forEach(([t, l]) => {
        S('line', { x1: X(t), y1: 156, x2: X(t), y2: 164, stroke: 'var(--muted)' }, svg);
        S('text', { x: X(t), y: 178, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-mono', text: l }, svg);
      });
      S('text', { x: X(3.8), y: 196, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted', text: 'Time' }, svg);
      let why;
      if (!hit) why = start + 1 <= 1 ? '在灰色封包開始之前就送完' : '灰色封包送完之後才開始';
      else if (mode === 'slotted') why = '和灰色封包在同一個 slot 開始，完全重疊';
      else why = start < 1 ? '撞到灰色封包的開頭（Collides with the start）' : '撞到灰色封包的結尾（Collides with the end）';
      msg.className = 'status ' + (hit ? 'bad' : 'ok');
      msg.textContent = `另一個封包${mode === 'slotted' ? `在 t₀ + ${arrive.toFixed(2)}t 產生，延到 slot 開頭 t₀ + ${start}t 才送` : `在 t₀ + ${start.toFixed(2)}t 開始`}：${hit ? '碰撞' : '沒有碰撞'}，${why}。` +
        (mode === 'pure' ? '要讓灰色封包成功，2t 內不能有其他封包：P₀ = e^(−2G)。' : 'Slotted 只要同一個 slot 沒有別人：P₀ = e^(−G)。');
    }
    makeSeg(fig, [['pure', 'Pure ALOHA'], ['slotted', 'Slotted ALOHA']], v => { mode = v; run(); });
    xIn.addEventListener('input', run);
    run();
  })();

  /* ---------- 4. 三種 persistence（講義 p.21） ---------- */
  (function pers() {
    const fig = document.getElementById('fig-pers-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-pers'), 720, 420, '三種 persistence');
    const msg = document.getElementById('pers-msg');
    const TE = 10.5;
    const X = t => 110 + t / TE * 590;
    const cont = (a, b) => { const r = []; for (let t = a; t <= b + 1e-9; t += 0.25) r.push(t); return r; };
    // 每個面板：A、B 的感測時刻與傳送；ch：通道上別人的忙碌
    const P = [
      { name: 'a. 1-persistent', A: { arr: 1, sense: cont(1, 4), tx: [4, 6], bad: true }, B: { arr: 2.5, sense: cont(2.5, 4), tx: [4, 6], bad: true },
        note: [[4, 6, '碰撞', 'red']] },
      { name: 'b. Nonpersistent', A: { arr: 1, sense: [1, 2.8, 4.6], wait: [[1, 2.8], [2.8, 4.6]], tx: [4.6, 6.6] }, B: { arr: 2.5, sense: [2.5, 5.2, 7.4], wait: [[2.5, 5.2], [5.2, 7.4]], tx: [7.4, 9.4] },
        note: [[4, 4.6, '空著', 'muted'], [6.6, 7.4, '空著', 'muted']] },
      { name: 'c. p-persistent（p = 0.5）', A: { arr: 1, sense: cont(1, 4).concat([4.5]), coin: [[4, '0.7 > p', false]], wait: [[4.5, 6.5]], sense2: [6.5], coin2: [[6.5, '0.2 ≤ p', true]], tx: [6.5, 8.5] },
        B: { arr: 2.5, sense: cont(2.5, 4), coin: [[4, '0.3 ≤ p', true]], tx: [4, 6] }, note: [] },
    ];
    const MSG = [
      [0, '通道 0–4 被別的站台占用（Busy）。A 在 t = 1、B 在 t = 2.5 有訊框要送，先感測通道。'],
      [1, '1-persistent：A、B 持續感測（Continuously sense）；Nonpersistent：A 發現忙碌，隨機等一段時間再聽；p-persistent：同 1-persistent 持續感測。'],
      [4, 't = 4 通道變閒：1-persistent 的 A、B 以機率 1 同時送 → 碰撞！p-persistent 在這個 slot 擲硬幣：B 送、A 等下一個 slot。Nonpersistent 沒人在聽，通道空著。'],
      [4.5, 'p-persistent 的 A 在下一個 slot 聽到 B 正在送 → 「當作發生碰撞」進入退避。Nonpersistent 的 A 在 4.6 聽到閒置，立刻送。'],
      [6.5, 'p-persistent 的 A 退避結束，通道閒置，擲硬幣 0.2 ≤ p → 送出。Nonpersistent 的 B 在 5.2 聽到忙碌，又隨機等到 7.4 才送。'],
      [9.4, '結果：1-persistent 延遲最小但一閒就撞；Nonpersistent 不撞，但通道常空著、延遲最大；p-persistent 介於兩者。'],
    ];
    function lane(g, y, st, u, label) {
      S('text', { x: 100, y: y + 4, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 600, text: label }, g);
      S('line', { x1: X(0), y1: y + 12, x2: X(TE), y2: y + 12, stroke: 'var(--border)' }, g);
      if (u >= st.arr) S('circle', { cx: X(st.arr), cy: y, r: 3.5, fill: 'var(--fg)' }, g);
      (st.wait || []).forEach(([a, b]) => { if (u > a) span(g, X, y, a, Math.min(u, b), u >= b ? 'Wait' : '', 'var(--muted)'); });
      (st.sense || []).concat(st.sense2 || []).forEach(t => {
        if (u >= t) S('line', { x1: X(t), y1: y - 12, x2: X(t), y2: y - 2, stroke: 'var(--accent)', 'stroke-width': 1.4 }, g);
      });
      (st.coin || []).concat(st.coin2 || []).forEach(([t, l, ok]) => {
        if (u >= t) S('text', { x: X(t) + (ok ? 26 : 0), y: y - 14, 'text-anchor': ok ? 'start' : 'middle', 'font-size': 9.5, 'font-weight': 700, fill: ok ? 'var(--green)' : 'var(--orange)', text: '🎲 ' + l }, g);
      });
      tblock(g, X, y, st.tx[0], st.tx[1], u, st.bad ? '碰撞' : '傳送', st.bad ? 'red' : 'green');
    }
    function render(u) {
      clear(svg);
      P.forEach((p, i) => {
        const y0 = 14 + i * 136;
        S('text', { x: 10, y: y0 + 4, 'font-size': 12, 'font-weight': 700, fill: 'var(--accent)', text: p.name }, svg);
        lane(svg, y0 + 34, p.A, u, 'A');
        lane(svg, y0 + 70, p.B, u, 'B');
        const yc = y0 + 104;
        S('text', { x: 100, y: yc + 4, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 600, cls: 't-muted', text: '通道' }, svg);
        tblock(svg, X, yc, 0, 4, u, 'Busy', 'purple', { h: 16, fs: 9.5 });
        [p.A, p.B].forEach(st => tblock(svg, X, yc, st.tx[0], st.tx[1], u, '', st.bad ? 'red' : 'green', { h: 16 }));
        p.note.forEach(([a, b, l, c]) => { if (u >= b) S('text', { x: (X(a) + X(b)) / 2, y: yc + 4, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, fill: `var(--${c})`, text: l }, svg); });
        if (i === 2) for (let t = 4; t <= TE; t += 0.5) S('line', { x1: X(t), y1: yc + 9, x2: X(t), y2: yc + 13, stroke: 'var(--muted)' }, svg);
      });
      for (let k = 0; k <= 10; k += 2) S('text', { x: X(k), y: 414, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: k }, svg);
      msg.textContent = phase(MSG, u);
    }
    Timeline(fig, { duration: TE, render, format: t => `t = ${t.toFixed(1)}` });
  })();

  /* ---------- 5. S–G 曲線（講義 p.17、p.24） ---------- */
  (function sg() {
    const fig = document.getElementById('fig-sg-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-sg'), 720, 330, 'S–G 曲線');
    const out = document.getElementById('sg-out');
    const gIn = document.getElementById('sg-g'), gv = document.getElementById('sg-gv'), aIn = document.getElementById('sg-a');
    const GM = 9;
    const X = g => 60 + g / GM * 520, Y = s => 290 - s * 270;
    const C = [
      ['slotted', 'Slotted ALOHA：Ge^(−G)', 'orange', G => TH.slotted(G)],
      ['aloha', 'ALOHA：Ge^(−2G)', 'red', G => TH.aloha(G)],
      ['p1', '1-persistent CSMA', 'purple', (G, a) => TH.p1(G, a)],
      ['np', 'Nonpersistent CSMA', 'green', (G, a) => TH.np(G, a)],
    ];
    function run() {
      const G = +gIn.value, a = +aIn.value;
      gv.textContent = G.toFixed(2);
      clear(svg);
      S('line', { x1: X(0), y1: Y(0), x2: X(GM), y2: Y(0), stroke: 'var(--muted)' }, svg);
      S('line', { x1: X(0), y1: Y(0), x2: X(0), y2: Y(1), stroke: 'var(--muted)' }, svg);
      for (let s = 0; s <= 1.001; s += 0.2) {
        S('line', { x1: X(0), y1: Y(s), x2: X(GM), y2: Y(s), stroke: 'var(--border)', 'stroke-dasharray': s ? '2 3' : null }, svg);
        S('text', { x: X(0) - 6, y: Y(s) + 4, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted t-mono', text: s.toFixed(1) }, svg);
      }
      for (let g = 0; g <= GM; g++) S('text', { x: X(g), y: Y(0) + 16, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: g }, svg);
      S('text', { x: X(GM / 2), y: 324, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-muted', text: 'G（每個封包時間的嘗試次數）' }, svg);
      S('text', { x: 16, y: Y(0.5), 'font-size': 11, 'font-weight': 700, cls: 't-muted', text: 'S' }, svg);
      const vals = [];
      C.forEach(([k, name, c, f], i) => {
        let d = '';
        for (let g = 0.01; g <= GM; g += 0.03) d += (d ? 'L' : 'M') + X(g).toFixed(1) + ' ' + Y(f(g, a)).toFixed(1);
        S('path', { d, fill: 'none', stroke: `var(--${c})`, 'stroke-width': 2.2 }, svg);
        const s = f(G, a);
        vals.push(`${name.padEnd(22, ' ')} S = ${f3(s)}`);
        S('circle', { cx: X(G), cy: Y(s), r: 4, fill: `var(--${c})` }, svg);
        S('line', { x1: 596, y1: 30 + i * 20, x2: 616, y2: 30 + i * 20, stroke: `var(--${c})`, 'stroke-width': 2.5 }, svg);
        S('text', { x: 620, y: 34 + i * 20, 'font-size': 10, text: name.replace(/：.*/, '') }, svg);
      });
      // 講義 p.17 的峰值
      [[0.5, TH.aloha(0.5), 'red', '0.184'], [1, TH.slotted(1), 'orange', '0.368']].forEach(([g, s, c, l]) => {
        S('line', { x1: X(g), y1: Y(s), x2: X(g), y2: Y(0), stroke: `var(--${c})`, 'stroke-dasharray': '3 3' }, svg);
        S('text', { x: X(g) + 4, y: Y(s) - 6, 'font-size': 10, 'font-weight': 700, fill: `var(--${c})`, text: l }, svg);
      });
      S('line', { x1: X(G), y1: Y(1), x2: X(G), y2: Y(0), stroke: 'var(--accent)', 'stroke-width': 1.2 }, svg);
      S('text', { x: 596, y: 128, 'font-size': 10, cls: 't-muted', text: `a = ${a}（CSMA 用）` }, svg);
      out.textContent = `G = ${G.toFixed(2)}，a = ${a}\n` + vals.join('\n') +
        `\nALOHA 最大 0.184（G = 0.5）、Slotted 最大 0.368（G = 1）；1-persistent 在 a = 0 時最大約 0.538（G ≈ 1）〔補充〕`;
    }
    gIn.addEventListener('input', run);
    aIn.addEventListener('change', run);
    run();
  })();

  /* ---------- 6. CSMA/CD 的三種狀態與能量位準（講義 p.27–28） ---------- */
  (function cd() {
    const host = document.getElementById('fig-cd');
    if (!host) return;
    const svg = svgRoot(host, 720, 270, 'CSMA/CD 的狀態與能量');
    const ar = arrowDefs(svg);
    const X = t => 30 + t * 30;
    // 上：狀態（單位任意）
    const seq = [['f', 0, 3], ['c', 3.3, 3.8], ['c', 4.1, 4.6], ['c', 4.9, 5.4], ['f', 5.7, 8.7], ['c', 9, 9.5], ['c', 9.8, 10.3], ['c', 10.6, 11.1], ['c', 11.4, 11.9], ['f', 12.2, 15.2], ['c', 18.2, 18.7], ['f', 19, 22]];
    S('text', { x: 700, y: 16, 'text-anchor': 'end', 'font-size': 11, 'font-weight': 700, cls: 't-muted', text: 'CSMA/CD 的三種狀態' }, svg);
    seq.forEach(([k, a, b]) => box(svg, X(a), 46, X(b) - X(a), 26, k === 'f' ? 'Frame' : '', k === 'f' ? { fill: 'var(--accent-soft)', stroke: 'var(--accent)', fs: 11 } : { fill: 'var(--orange-soft)', stroke: 'var(--orange)', rx: 1 }));
    S('line', { x1: X(9.7), y1: 40, x2: X(9.7), y2: 30, stroke: 'var(--orange)' }, svg);
    S('text', { x: X(10.4), y: 30, 'font-size': 10, fill: 'var(--orange)', text: 'Contention slots' }, svg);
    S('line', { x1: X(3), y1: 24, x2: X(3), y2: 42, stroke: 'var(--fg)', 'marker-end': ar('fg') }, svg);
    S('text', { x: X(3), y: 20, 'text-anchor': 'middle', 'font-size': 10, cls: 't-mono', text: 't₀' }, svg);
    span(svg, X, 86, 0, 3, '', 'var(--accent)');
    span(svg, X, 86, 3.3, 5.4, '', 'var(--orange)');
    span(svg, X, 86, 15.2, 18.2, '', 'var(--muted)');
    S('text', { x: X(1.5), y: 102, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--accent)', text: 'Transmission period' }, svg);
    S('text', { x: X(4.4), y: 116, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--orange)', text: 'Contention period' }, svg);
    S('text', { x: X(16.7), y: 102, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, cls: 't-muted', text: 'Idle period' }, svg);
    // 下：能量位準
    const yb = 240;
    S('text', { x: 30, y: 140, 'font-size': 11, 'font-weight': 700, cls: 't-muted', text: 'Energy level' }, svg);
    S('line', { x1: X(0), y1: yb, x2: X(22.5), y2: yb, stroke: 'var(--muted)', 'marker-end': ar('muted') }, svg);
    S('line', { x1: X(0), y1: yb, x2: X(0), y2: 148, stroke: 'var(--muted)', 'marker-end': ar('muted') }, svg);
    S('rect', { x: X(0.3), y: yb - 30, width: X(7.5) - X(0.3), height: 30, fill: 'var(--accent-soft)', stroke: 'var(--accent)' }, svg);
    S('text', { x: X(3.9), y: yb - 11, 'text-anchor': 'middle', 'font-size': 10.5, text: 'Frame transmission' }, svg);
    [[9.5, 11], [12, 13.5]].forEach(([a, b]) => S('rect', { x: X(a), y: yb - 62, width: X(b) - X(a), height: 62, fill: 'var(--red-soft)', stroke: 'var(--red)', 'stroke-width': 1.4 }, svg));
    S('text', { x: X(11.5), y: yb - 70, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--red)', text: 'Collision（能量疊加）' }, svg);
    S('rect', { x: X(15), y: yb - 30, width: X(22) - X(15), height: 30, fill: 'var(--accent-soft)', stroke: 'var(--accent)' }, svg);
    S('text', { x: X(18.5), y: yb - 11, 'text-anchor': 'middle', 'font-size': 10.5, text: 'Frame transmission' }, svg);
    [[8.5, 'Idle'], [14.2, 'Idle']].forEach(([t, l]) => S('text', { x: X(t), y: yb + 16, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: l }, svg));
    S('text', { x: X(22.5), y: yb + 16, 'text-anchor': 'end', 'font-size': 10, cls: 't-muted', text: 'Time' }, svg);
  })();

  /* ---------- 7. 流量模型產生器（講義 p.36–42） ---------- */
  (function traffic() {
    const fig = document.getElementById('fig-tr-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-tr'), 720, 400, '流量模型');
    const out = document.getElementById('tr-out');
    const T = 60, X = t => 110 + t / T * 600;
    const R = 4, ON = 2, OFF = 3, LP = 2, LI = 4;
    const MM = [{ l: 1, m: 4, c: 'green' }, { l: 4, m: 2, c: 'orange' }, { l: 10, m: 1, c: 'red' }];
    // 兩狀態交替（ON 平均 ON、OFF 平均 OFF），隨機起始狀態
    function onoff() {
      const seg = [];
      let t = 0, on = Math.random() < ON / (ON + OFF);
      while (t < T) { const d = expo(on ? ON : OFF); seg.push([t, Math.min(T, t + d), on]); t += d; on = !on; }
      return seg;
    }
    function gen() {
      const M = {};
      M.cbr = { band: [[0, T, 'accent', 'ON']], arr: Array.from({ length: R * T }, (_, i) => (i + 0.5) / R) };
      const s1 = onoff();
      M.onoff = { band: s1.map(([a, b, on]) => [a, b, on ? 'accent' : null, on ? 'ON' : 'OFF']), arr: [] };
      s1.forEach(([a, b, on]) => { if (on) for (let t = a; t < b; t += 1 / R) M.onoff.arr.push(t); });
      M.pois = { band: [[0, T, 'accent', '']], arr: poissonArrivals(LP, 0, T) };
      const s2 = onoff();
      M.ipp = { band: s2.map(([a, b, on]) => [a, b, on ? 'purple' : null, on ? 'ON' : 'OFF']), arr: [] };
      s2.forEach(([a, b, on]) => { if (on) M.ipp.arr.push(...poissonArrivals(LI, a, b)); });
      M.mmpp = { band: [], arr: [] };
      let t = 0, st = Math.floor(Math.random() * 3);
      while (t < T) {
        const e = Math.min(T, t + expo(MM[st].m));
        M.mmpp.band.push([t, e, MM[st].c, String(st + 1)]);
        M.mmpp.arr.push(...poissonArrivals(MM[st].l, t, e));
        t = e;
        st = (st + 1 + Math.floor(Math.random() * 2)) % 3; // 等機率轉到另外兩個狀態
      }
      return M;
    }
    const ROWS = [
      ['cbr', 'CBR', `${R}`],
      ['onoff', 'On-Off', `R·(1/β)/(1/α+1/β) = ${R}×${ON}/${ON + OFF} = ${f3(R * ON / (ON + OFF))}`],
      ['pois', 'Poisson', `λ = ${LP}`],
      ['ipp', 'IPP', `λ·(1/β)/(1/α+1/β) = ${LI}×${ON}/${ON + OFF} = ${f3(LI * ON / (ON + OFF))}`],
      ['mmpp', 'MMPP', `Σλᵢ·停留比例 = (1×4 + 4×2 + 10×1)/7 = ${f3(22 / 7)}`],
    ];
    function run() {
      const M = gen();
      clear(svg);
      ROWS.forEach(([k, name], i) => {
        const y = 20 + i * 74, m = M[k];
        S('text', { x: 100, y: y + 26, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 700, text: name }, svg);
        m.band.forEach(([a, b, c, l]) => {
          S('rect', { x: X(a), y, width: Math.max(0.5, X(b) - X(a)), height: 12, fill: c ? `var(--${c}-soft)` : 'var(--surface-2)', stroke: c ? `var(--${c})` : 'var(--border)', 'stroke-width': 0.8 }, svg);
          if (l && X(b) - X(a) > 22) S('text', { x: (X(a) + X(b)) / 2, y: y + 10, 'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': 700, fill: c ? `var(--${c})` : 'var(--muted)', text: l }, svg);
        });
        let d = '';
        m.arr.forEach(t => { d += `M${X(t).toFixed(1)} ${y + 18}V${y + 44}`; });
        S('path', { d, stroke: 'var(--fg)', 'stroke-width': 0.9, opacity: 0.8 }, svg);
        S('line', { x1: X(0), y1: y + 44, x2: X(T), y2: y + 44, stroke: 'var(--muted)' }, svg);
      });
      for (let t = 0; t <= T; t += 10) S('text', { x: X(t), y: 392, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: t + ' s' }, svg);
      out.textContent = '模型       這 60 秒的平均速率      理論平均速率（封包／秒）\n' +
        ROWS.map(([k, name, th]) => `${name.padEnd(9, ' ')}  ${f3(M[k].arr.length / T).padStart(7, ' ')}              ${th}`).join('\n') +
        '\n同樣的平均速率，On-Off、IPP、MMPP 的封包會擠在一起（bursty），Poisson 則均勻隨機。';
    }
    fig.querySelector('[data-act="regen"]').addEventListener('click', run);
    run();
  })();
})();
