/* 第 2-2 章：架構與分送動畫、BSS 空間關係、服務分類練習、漫遊動畫、Challenge/Response、狀態機 */
(function () {
  const { S, clear, svgRoot, arrowDefs, Timeline, lerp, prog } = WL;

  function along(pts, p) {
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let tg = p * total;
    for (let i = 0; i < seg.length; i++) {
      if (tg <= seg[i] || i === seg.length - 1) { const q = seg[i] ? Math.min(1, tg / seg[i]) : 0; return [lerp(pts[i][0], pts[i + 1][0], q), lerp(pts[i][1], pts[i + 1][1], q)]; }
      tg -= seg[i];
    }
    return pts[pts.length - 1];
  }
  function staDot(g, x, y, label, color) {
    S('circle', { cx: x, cy: y, r: 17, fill: 'var(--surface)', stroke: `var(--${color || 'accent'})`, 'stroke-width': 2.5 }, g);
    S('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: label }, g);
  }
  function apIcon(g, x, y, label, hl) {
    S('rect', { x: x - 24, y: y - 12, width: 48, height: 24, rx: 5, fill: hl ? 'var(--orange)' : 'var(--accent)' }, g);
    S('line', { x1: x - 12, y1: y - 12, x2: x - 17, y2: y - 26, stroke: hl ? 'var(--orange)' : 'var(--accent)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    S('line', { x1: x + 12, y1: y - 12, x2: x + 17, y2: y - 26, stroke: hl ? 'var(--orange)' : 'var(--accent)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: label, fill: '#fff' }, g);
  }
  function pkt(g, x, y, label, color) {
    const w = label.length * 7 + 18;
    S('rect', { x: x - w / 2, y: y - 11, width: w, height: 22, rx: 6, fill: `var(--${color || 'orange'})` }, g);
    S('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#fff', text: label }, g);
  }
  function segButtons(el, cb) {
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      cb(b.dataset.v);
    });
  }

  /* ---------- 1. 架構與分送 ---------- */
  (function arch() {
    const fig = document.getElementById('fig-arch-wrap');
    const msg = document.getElementById('arch-msg');
    const svg = svgRoot(document.getElementById('fig-arch'), 720, 380, 'ESS、DS、Portal 與資料分送動畫');
    const base = S('g', null, svg);
    const AP1 = [180, 150], AP2 = [540, 150];
    const ST = { 1: [100, 92], 2: [250, 78], 3: [470, 78], 4: [620, 92] };
    const DSY = 236, PORTAL = [360, 286], LANY = 340;
    S('rect', { x: 18, y: 14, width: 684, height: 238, rx: 16, fill: 'none', stroke: 'var(--purple)', 'stroke-dasharray': '8 5' }, base);
    S('text', { x: 34, y: 34, 'font-size': 13, 'font-weight': 700, fill: 'var(--purple)', text: 'ESS 延伸服務集' }, base);
    S('ellipse', { cx: 180, cy: 115, rx: 135, ry: 78, fill: 'var(--accent-soft)', opacity: 0.55, stroke: 'var(--accent)' }, base);
    S('ellipse', { cx: 540, cy: 115, rx: 135, ry: 78, fill: 'var(--green-soft)', opacity: 0.55, stroke: 'var(--green)' }, base);
    S('text', { x: 180, y: 54, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--accent)', text: 'BSS 1' }, base);
    S('text', { x: 540, y: 54, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--green)', text: 'BSS 2' }, base);
    [[1, AP1], [2, AP1], [3, AP2], [4, AP2]].forEach(([k, ap]) => S('line', { x1: ST[k][0], y1: ST[k][1], x2: ap[0], y2: ap[1], stroke: 'var(--muted)', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, base));
    S('line', { x1: AP1[0], y1: AP1[1], x2: AP1[0], y2: DSY, stroke: 'var(--fg)', 'stroke-width': 3 }, base);
    S('line', { x1: AP2[0], y1: AP2[1], x2: AP2[0], y2: DSY, stroke: 'var(--fg)', 'stroke-width': 3 }, base);
    S('line', { x1: 120, y1: DSY, x2: 600, y2: DSY, stroke: 'var(--fg)', 'stroke-width': 6, 'stroke-linecap': 'round' }, base);
    S('text', { x: 360, y: DSY - 10, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: 'DS 分散式系統（DSM）' }, base);
    S('line', { x1: PORTAL[0], y1: DSY, x2: PORTAL[0], y2: LANY, stroke: 'var(--fg)', 'stroke-width': 3 }, base);
    S('rect', { x: PORTAL[0] - 52, y: PORTAL[1] - 15, width: 104, height: 30, rx: 6, fill: 'var(--purple-soft)', stroke: 'var(--purple)', 'stroke-width': 2 }, base);
    S('text', { x: PORTAL[0], y: PORTAL[1] + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: 'Portal 埠接器' }, base);
    S('line', { x1: 220, y1: LANY, x2: 500, y2: LANY, stroke: 'var(--muted)', 'stroke-width': 5, 'stroke-linecap': 'round' }, base);
    S('text', { x: 510, y: LANY + 5, 'font-size': 12, 'font-weight': 600, text: 'IEEE 802.X 區域網路' }, base);
    Object.keys(ST).forEach(k => staDot(base, ST[k][0], ST[k][1], 'STA' + k));
    apIcon(base, AP1[0], AP1[1], 'AP'); apIcon(base, AP2[0], AP2[1], 'AP');
    const dyn = S('g', null, svg);

    const MODES = {
      dist: {
        legs: [
          { pts: [ST[1], AP1], d: 1.4, wl: true, m: '① STA1 透過無線媒介（WM）把資料送給自己所屬的 AP（input）。' },
          { pts: [AP1, [AP1[0], DSY]], d: 0.7, m: '② AP 把 MSDU 交給 DS。Distribution 服務依 Association 資訊查出 STA4 目前關聯在 BSS 2 的 AP。' },
          { pts: [[AP1[0], DSY], [AP2[0], DSY]], d: 1.8, m: '③ 在 DS 內傳送。DS 內部怎麼傳，不在 802.11 規範內。' },
          { pts: [[AP2[0], DSY], AP2], d: 0.7, m: '④ 到達 STA4 所屬的 AP（output）。' },
          { pts: [AP2, ST[4]], d: 1.4, wl: true, m: '⑤ AP 透過 WM 送給 STA4。這整段就是 Distribution 服務。' },
        ],
      },
      integ: {
        legs: [
          { pts: [ST[1], AP1], d: 1.4, wl: true, m: '① STA1 送出資料，目的地是有線 LAN 上的電腦。' },
          { pts: [AP1, [AP1[0], DSY]], d: 0.7, m: '② AP 交給 DS；Distribution 服務判斷目的地是整合的 LAN 成員 → 輸出點是 Portal，不是 AP。' },
          { pts: [[AP1[0], DSY], [PORTAL[0], DSY]], d: 1.2, m: '③ 在 DS 內送往 Portal。' },
          { pts: [[PORTAL[0], DSY], [PORTAL[0], LANY]], d: 1.4, m: '④ 送到 Portal 觸發 Integration 服務：把訊息從 DSM 送到有線 LAN 的媒介，必要時做媒介或位址轉換。' },
          { pts: [[PORTAL[0], LANY], [470, LANY]], d: 1.2, m: '⑤ 資料進入 IEEE 802.X 有線 LAN。所有非 802.11 LAN 的資料也都是經 Portal 進出。' },
        ],
      },
    };
    let mode = 'dist';
    const total = m => MODES[m].legs.reduce((a, l) => a + l.d, 0) + 0.8;
    function render(t) {
      clear(dyn);
      const legs = MODES[mode].legs;
      let acc = 0, done = false;
      for (const l of legs) {
        if (t <= acc + l.d) {
          const p = prog(t, acc, acc + l.d);
          const [x, y] = along(l.pts, p);
          S('line', { x1: l.pts[0][0], y1: l.pts[0][1], x2: l.pts[l.pts.length - 1][0], y2: l.pts[l.pts.length - 1][1], stroke: 'var(--orange)', 'stroke-width': 3, opacity: 0.6 }, dyn);
          if (l.wl) [0, 0.5].forEach(o => { const q = ((t - acc) / 0.8 + o) % 1; S('circle', { cx: l.pts[0][0], cy: l.pts[0][1], r: 18 + q * 40, fill: 'none', stroke: 'var(--orange)', 'stroke-width': 2, opacity: 1 - q }, dyn); });
          pkt(dyn, x, y, 'MSDU');
          msg.textContent = l.m;
          done = true; break;
        }
        acc += l.d;
      }
      if (!done) {
        const last = legs[legs.length - 1].pts.slice(-1)[0];
        pkt(dyn, last[0], last[1], 'MSDU', 'green');
        msg.textContent = mode === 'dist' ? '完成：STA1 → AP → DS → AP → STA4（Distribution）。' : '完成：STA1 → AP → DS → Portal → 有線 LAN（Integration）。';
      }
      msg.className = 'status ' + (done ? 'info' : 'ok');
    }
    const tl = Timeline(fig, { duration: 8, render: t => render(t * total(mode) / 8), format: () => '' });
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = '<button type="button" class="on" data-v="dist">Distribution（STA1 → STA4）</button><button type="button" data-v="integ">Integration（STA1 → 有線 LAN）</button>';
    fig.querySelector('.controls').prepend(seg);
    segButtons(seg, v => { mode = v; tl.pause(); tl.set(0); });
  })();

  /* ---------- 2. BSS 空間關係 ---------- */
  (function spatial() {
    const svg = svgRoot(document.getElementById('fig-spatial'), 720, 210, 'BSS 的三種空間關係');
    const panel = (cx, title, circles, note) => {
      S('text', { x: cx, y: 22, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: title }, svg);
      circles.forEach(([x, y, r, c, l]) => {
        S('circle', { cx: x, cy: y, r, fill: `var(--${c}-soft)`, opacity: 0.6, stroke: `var(--${c})`, 'stroke-width': 1.8 }, svg);
        apIcon(svg, x, y + 4, 'AP');
        if (l) S('text', { x, y: y + r + 16 > 196 ? y - r + 16 : y + 36, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: `var(--${c})`, text: l }, svg);
      });
      S('text', { x: cx, y: 202, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: note }, svg);
    };
    panel(120, '部分重疊', [[85, 105, 60, 'accent'], [155, 105, 60, 'green']], '用來達成連續覆蓋');
    panel(360, '實體分離', [[310, 105, 45, 'accent'], [410, 105, 45, 'green']], '彼此不相連');
    panel(600, '同地點共存', [[600, 105, 72, 'accent', 'ch 1'], [600, 105, 50, 'orange', 'ch 6']], '用不同頻道同時覆蓋');
  })();

  /* ---------- 3. 服務分類練習 ---------- */
  (function quiz() {
    const ITEMS = [['Authentication', 'SS'], ['Deauthentication', 'SS'], ['Privacy', 'SS'], ['MSDU delivery', 'SS'], ['Association', 'DSS'], ['Reassociation', 'DSS'], ['Disassociation', 'DSS'], ['Distribution', 'DSS'], ['Integration', 'DSS']];
    const WHY = { SS: '每個 STA（含 AP）都有的站台服務', DSS: '由 DS 提供、透過 AP 存取的分散式系統服務' };
    const card = document.getElementById('quiz-card'), msg = document.getElementById('quiz-msg'), board = document.getElementById('quiz-board');
    const btns = [...document.querySelectorAll('#fig-quiz-wrap [data-a]')];
    let deck, cur, score;
    function start() {
      deck = ITEMS.slice().sort(() => Math.random() - 0.5); score = 0; board.innerHTML = '';
      msg.className = 'status'; msg.textContent = '點選分類。共 9 題（第 10 項 QoS 不屬於這兩類）。';
      next();
    }
    function next() {
      cur = deck.shift();
      btns.forEach(b => (b.disabled = !cur));
      if (!cur) {
        card.textContent = `完成！答對 ${score} / 9`;
        msg.className = 'status ' + (score === 9 ? 'ok' : 'info');
        msg.innerHTML = 'SS：Authentication、Deauthentication、Privacy、MSDU delivery｜DSS：Association、Reassociation、Disassociation、Distribution、Integration <button class="btn" type="button" id="quiz-again">再來一次</button>';
        document.getElementById('quiz-again').addEventListener('click', start);
        return;
      }
      card.textContent = cur[0];
    }
    btns.forEach(b => b.addEventListener('click', () => {
      if (!cur) return;
      const ok = b.dataset.a === cur[1];
      if (ok) score++;
      msg.className = 'status ' + (ok ? 'ok' : 'bad');
      msg.textContent = `${ok ? '✔ 正確' : '✘ 錯了'}：${cur[0]} 屬於 ${cur[1]}（${WHY[cur[1]]}）。`;
      const chip = document.createElement('span');
      chip.className = 'pill';
      chip.style.margin = '6px 6px 0 0';
      chip.style.background = ok ? 'var(--green-soft)' : 'var(--red-soft)';
      chip.style.color = 'var(--fg)';
      chip.textContent = `${cur[0]} → ${cur[1]}`;
      board.append(chip);
      next();
    }));
    start();
  })();

  /* ---------- 4. 漫遊 ---------- */
  (function roam() {
    const fig = document.getElementById('fig-roam-wrap');
    const msg = document.getElementById('roam-msg');
    const svg = svgRoot(document.getElementById('fig-roam'), 720, 330, 'BSS-transition 漫遊動畫');
    const A = [180, 140], B = [460, 140], R = 125, DSY = 300;
    const base = S('g', null, svg);
    S('circle', { cx: A[0], cy: A[1], r: R, fill: 'var(--accent-soft)', opacity: 0.5, stroke: 'var(--accent)' }, base);
    S('circle', { cx: B[0], cy: B[1], r: R, fill: 'var(--green-soft)', opacity: 0.5, stroke: 'var(--green)' }, base);
    S('text', { x: A[0] - 70, y: 40, 'font-size': 12, 'font-weight': 700, fill: 'var(--accent)', text: 'BSS-A' }, base);
    S('text', { x: B[0] + 40, y: 40, 'font-size': 12, 'font-weight': 700, fill: 'var(--green)', text: 'BSS-B' }, base);
    S('line', { x1: A[0], y1: A[1], x2: A[0], y2: DSY, stroke: 'var(--fg)', 'stroke-width': 3 }, base);
    S('line', { x1: B[0], y1: B[1], x2: B[0], y2: DSY, stroke: 'var(--fg)', 'stroke-width': 3 }, base);
    S('line', { x1: 60, y1: DSY, x2: 700, y2: DSY, stroke: 'var(--fg)', 'stroke-width': 5, 'stroke-linecap': 'round' }, base);
    S('text', { x: 64, y: DSY - 8, 'font-size': 11, 'font-weight': 700, text: 'DS（同一個 ESS）' }, base);
    S('text', { x: 696, y: DSY - 8, 'text-anchor': 'end', 'font-size': 11, cls: 't-muted', text: '← 給 STA 的資料從這裡進來' }, base);
    const dyn = S('g', null, svg);
    const X = t => t < 4 ? 95 : t < 7 ? lerp(95, 300, prog(t, 4, 7)) : t < 8.6 ? 300 : t < 10.2 ? lerp(300, 380, prog(t, 8.6, 10.2)) : t < 12 ? 380 : lerp(380, 500, prog(t, 12, 14));
    const STEPS = [
      [0, 1.5, 'A', 'Authentication', '① STA 先和 AP-A 完成 Authentication（認證必須在關聯之前）。'],
      [1.5, 3, 'A', 'Association', '② STA 發起 Association，和 AP-A 建立關聯。DS 記下：STA → AP-A。'],
      [3, 4, null, null, '③ 給 STA 的資料：DS 查表 → 送到 AP-A → STA。'],
      [4, 7, null, null, '④ STA 往右移動，進入兩個 BSS 重疊的區域；AP-A 的訊號越來越弱。'],
      [7, 8.6, 'B', 'Pre-authentication', '⑤（可選）Pre-authentication：還連著 AP-A 時，先和 AP-B 認證，之後換 AP 會比較快。'],
      [8.6, 10.2, 'B', 'Reassociation', '⑥ STA 發起 Reassociation，把關聯從 AP-A 轉到 AP-B（BSS-transition 需要 Reassociation）。'],
      [10.2, 12, null, null, '⑦ DS 更新對應表：STA → AP-B。之後給 STA 的資料改由 AP-B 送出。'],
      [12, 14.5, null, null, '⑧ 換 AP 的過程對 LLC 是透明的；同一時間 STA 只會關聯一個 AP。'],
    ];
    function render(t) {
      clear(dyn);
      const sx = X(t), sy = 150;
      const assocB = t >= 10.2, assocA = t >= 3 && !assocB;
      apIcon(dyn, A[0], A[1], 'AP-A', assocA);
      apIcon(dyn, B[0], B[1], 'AP-B', assocB);
      // signal bars
      const sig = ap => Math.max(0, 1 - Math.hypot(sx - ap[0], sy - ap[1]) / (R + 30));
      [[A, 'accent'], [B, 'green']].forEach(([ap, c], i) => {
        const s = sig(ap);
        for (let k = 0; k < 4; k++) S('rect', { x: sx - 26 + i * 30 + k * 6, y: sy - 34 - k * 4, width: 4, height: 6 + k * 4, fill: k < Math.round(s * 4) ? `var(--${c})` : 'var(--border)' }, dyn);
      });
      if (assocA || assocB) S('line', { x1: sx, y1: sy, x2: (assocA ? A : B)[0], y2: (assocA ? A : B)[1], stroke: 'var(--orange)', 'stroke-width': 2.5 }, dyn);
      const st = STEPS.find(s => t >= s[0] && t < s[1]) || STEPS[STEPS.length - 1];
      if (st[2]) {
        const ap = st[2] === 'A' ? A : B;
        const p = prog(t, st[0], st[1]);
        const fwd = p < 0.5;
        const q = fwd ? p * 2 : (p - 0.5) * 2;
        const [x, y] = fwd ? [lerp(sx, ap[0], q), lerp(sy, ap[1], q)] : [lerp(ap[0], sx, q), lerp(ap[1], sy, q)];
        S('line', { x1: sx, y1: sy, x2: ap[0], y2: ap[1], stroke: 'var(--purple)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, dyn);
        S('circle', { cx: x, cy: y, r: 6, fill: 'var(--purple)' }, dyn);
        S('text', { x: (sx + ap[0]) / 2, y: Math.min(sy, ap[1]) - 26, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--purple)', text: st[3] + (fwd ? ' Request' : ' Response') }, dyn);
      }
      // data delivery
      const dataLeg = (t0, ap) => {
        const p = prog(t, t0, t0 + 1.4);
        if (p <= 0 || p >= 1) return;
        const [x, y] = along([[690, DSY], [ap[0], DSY], ap, [sx, sy]], p);
        pkt(dyn, x, y, 'DATA');
      };
      dataLeg(3, A); dataLeg(10.4, B); dataLeg(12.6, B);
      staDot(dyn, sx, sy, 'STA', 'orange');
      // table
      S('rect', { x: 560, y: 8, width: 152, height: 58, rx: 8, fill: 'var(--surface)', stroke: 'var(--border)' }, dyn);
      S('text', { x: 636, y: 26, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, cls: 't-muted', text: 'DS 的對應表' }, dyn);
      const flash = t >= 10.2 && t < 11.2;
      S('rect', { x: 570, y: 34, width: 132, height: 24, rx: 5, fill: flash ? 'var(--orange-soft)' : 'var(--surface-2)' }, dyn);
      S('text', { x: 636, y: 51, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, cls: 't-mono', text: t < 3 ? 'STA → （無）' : assocA ? 'STA → AP-A' : 'STA → AP-B' }, dyn);
      msg.textContent = st[4];
    }
    Timeline(fig, { duration: 14.5, render, format: t => `${t.toFixed(1)} s` });
  })();

  /* ---------- 5. Challenge / Response ---------- */
  (function cr() {
    const fig = document.getElementById('fig-cr-wrap');
    const svg = svgRoot(document.getElementById('fig-cr'), 720, 320, 'Challenge Response 認證');
    const ar = arrowDefs(svg);
    const EX = {
      open: { n: 'Open system', m: ['我是 station 4', 'Null', 'Null'], r: '直接成為 Authenticated', ok: true },
      pw: { n: '密碼式', m: ['我是 station 4', '證明你的身分', '這是我的密碼'], r: '密碼正確 → Authenticated', ok: true },
      crypto: { n: '密碼學式', m: ['我是 station 4', '這是用你的「公鑰」加密的資料 X，內容是什麼？', '內容是 X（只有 station 4 的私鑰解得開）'], r: 'OK，相信你是 station 4', ok: true },
    };
    let ex = 'open';
    const L = 150, Rx = 570;
    const stat = S('g', null, svg), dyn = S('g', null, svg);
    S('rect', { x: L - 70, y: 14, width: 140, height: 34, rx: 7, fill: 'var(--accent-soft)', stroke: 'var(--accent)' }, stat);
    S('text', { x: L, y: 36, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: 'Station 4' }, stat);
    S('rect', { x: Rx - 70, y: 14, width: 140, height: 34, rx: 7, fill: 'var(--green-soft)', stroke: 'var(--green)' }, stat);
    S('text', { x: Rx, y: 36, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: '驗證方（AP／STA）' }, stat);
    S('line', { x1: L, y1: 48, x2: L, y2: 300, stroke: 'var(--border)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, stat);
    S('line', { x1: Rx, y1: 48, x2: Rx, y2: 300, stroke: 'var(--border)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, stat);
    const steps = [['① Assertion', L, Rx, 'accent'], ['② Challenge', Rx, L, 'orange'], ['③ Response', L, Rx, 'accent']];
    function render(t) {
      clear(dyn);
      const e = EX[ex];
      steps.forEach(([name, x1, x2, c], i) => {
        const t0 = 0.4 + i * 1.8, p = prog(t, t0, t0 + 1.1);
        if (p <= 0) return;
        const y = 90 + i * 62;
        const xe = lerp(x1, x2, p);
        S('line', { x1, y1: y, x2: xe, y2: y, stroke: `var(--${c})`, 'stroke-width': 2.5, 'marker-end': p > 0.05 ? ar(c) : null }, dyn);
        S('text', { x: (x1 + x2) / 2, y: y - 22, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: `var(--${c})`, text: name, opacity: p }, dyn);
        S('text', { x: (x1 + x2) / 2, y: y - 6, 'text-anchor': 'middle', 'font-size': 13, text: `「${e.m[i]}」`, opacity: p }, dyn);
      });
      const pr = prog(t, 6, 6.6);
      if (pr > 0) {
        S('rect', { x: 210, y: 262, width: 300, height: 36, rx: 8, fill: 'var(--green-soft)', stroke: 'var(--green)', opacity: pr }, dyn);
        S('text', { x: 360, y: 285, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: '結果：' + e.r, opacity: pr }, dyn);
      }
    }
    const tl = Timeline(fig, { duration: 7, render, format: t => `${t.toFixed(1)} s` });
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = Object.keys(EX).map((k, i) => `<button type="button" data-v="${k}"${i ? '' : ' class="on"'}>${EX[k].n}</button>`).join('');
    fig.querySelector('.controls').prepend(seg);
    segButtons(seg, v => { ex = v; tl.pause(); tl.set(0); tl.play(); });
  })();

  /* ---------- 6. 狀態機 ---------- */
  (function fsm() {
    const svg = svgRoot(document.getElementById('fig-fsm'), 720, 280, '802.11 連線狀態機');
    const ar = arrowDefs(svg);
    const msg = document.getElementById('fsm-msg');
    const P = { 1: [120, 100], 2: [360, 100], 3: [600, 100] };
    const NAME = { 1: ['State 1', '未認證、未關聯'], 2: ['State 2', '已認證、未關聯'], 3: ['State 3', '已認證、已關聯'] };
    const CLASS = { 1: 'Class 1', 2: 'Class 1 + 2', 3: 'Class 1 + 2 + 3（可傳資料）' };
    const EDGES = [
      { id: '12', d: `M190 84 L290 84`, l: 'Authentication', lx: 240, ly: 74 },
      { id: '23', d: `M430 84 L530 84`, l: 'Reassociation', l0: 'Association／', lx: 480, ly: 74 },
      { id: '32', d: `M530 118 L430 118`, l: 'Disassociation', lx: 480, ly: 136 },
      { id: '21', d: `M290 118 L190 118`, l: 'Deauthentication', lx: 240, ly: 136 },
      { id: '31', d: `M600 140 C600 220 120 220 120 140`, l: 'Deauthentication', lx: 360, ly: 214 },
    ];
    let cur = 1, last = null;
    function draw() {
      clear(svg);
      // re-add markers (clear removed defs)
      const mk = arrowDefs(svg);
      EDGES.forEach(e => {
        const on = last === e.id;
        S('path', { d: e.d, fill: 'none', stroke: on ? 'var(--orange)' : 'var(--muted)', 'stroke-width': on ? 3 : 1.6, 'marker-end': mk(on ? 'orange' : 'muted') }, svg);
        S('text', { x: e.lx, y: e.ly, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': on ? 700 : 500, fill: on ? 'var(--orange)' : 'var(--muted)', text: e.l }, svg);
        if (e.l0) S('text', { x: e.lx, y: e.ly - 15, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': on ? 700 : 500, fill: on ? 'var(--orange)' : 'var(--muted)', text: e.l0 }, svg);
      });
      [1, 2, 3].forEach(k => {
        const [x, y] = P[k], on = cur === k;
        S('rect', { x: x - 70, y: y - 40, width: 140, height: 80, rx: 14, fill: on ? 'var(--accent)' : 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
        S('text', { x, y: y - 6, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 800, text: NAME[k][0], fill: on ? '#fff' : 'var(--fg)' }, svg);
        S('text', { x, y: y + 16, 'text-anchor': 'middle', 'font-size': 12, text: NAME[k][1], fill: on ? '#fff' : 'var(--muted)' }, svg);
      });
      S('text', { x: 360, y: 262, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: `目前可傳：${CLASS[cur]}` }, svg);
    }
    void ar;
    const go = (to, edge, text) => { cur = to; last = edge; msg.className = 'status ok'; msg.textContent = text; draw(); };
    const no = text => { last = null; msg.className = 'status bad'; msg.textContent = text; draw(); };
    const same = text => { last = null; msg.className = 'status info'; msg.textContent = text; draw(); };
    const H = {
      auth: () => cur === 1 ? go(2, '12', 'Authentication 成功 → State 2（已認證、未關聯）。') : same('已經認證過了，狀態不變（一個 STA 可以同時和多個 STA／AP 完成認證）。'),
      assoc: () => cur === 1 ? no('不行：必須先 Authentication，才能 Association。') : cur === 2 ? go(3, '23', 'Association 成功 → State 3，可以開始傳資料。') : same('已經關聯了；要換到同一 ESS 的另一個 AP 請用 Reassociation。'),
      reassoc: () => cur === 1 ? no('不行：還沒認證，不能 Reassociation。') : cur === 2 ? go(3, '23', 'Reassociation 成功 → State 3。') : same('Reassociation：把關聯轉到新的 AP（同一 ESS），仍在 State 3；DS 更新對應。'),
      disassoc: () => cur === 3 ? go(2, '32', 'Disassociation（通知，不能拒絕）→ 回到 State 2，仍保有認證。') : same('目前沒有關聯可以解除。'),
      deauth: () => cur === 1 ? same('目前沒有認證可以解除。') : go(1, cur === 2 ? '21' : '31', `Deauthentication → 直接回到 State 1${cur === 3 ? '（關聯也一併解除）' : ''}。`),
      data: () => cur === 3 ? same('✔ 在 State 3 可以傳 Class 3 的資料訊框。') : no(`✘ 在 State ${cur} 不能傳資料：Class 3 frame 只能在 State 3（已認證且已關聯）傳。`),
    };
    document.querySelectorAll('#fig-fsm-wrap [data-ev]').forEach(b => b.addEventListener('click', () => H[b.dataset.ev]()));
    draw();
  })();
})();
