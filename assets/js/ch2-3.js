/* 第 2-3 章：WEP 訊框結構、WEP 實驗室（RC4＋CRC-32）、訊框類別、訊框欄位瀏覽器、Frame Control 組裝器、Duration/ID 解碼器、位址動畫、分段動畫、訊框交換時間軸、Shared Key 認證、Capability 解讀器、跳頻頻道組 */
(function () {
  const { S, clear, svgRoot, arrowDefs, Timeline, lerp, prog } = WL;

  function segButtons(el, cb) {
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      cb(b.dataset.v);
    });
  }
  function makeSeg(fig, opts, cb) {
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = opts.map(([v, l], i) => `<button type="button" data-v="${v}"${i ? '' : ' class="on"'}>${l}</button>`).join('');
    fig.querySelector('.controls').prepend(seg);
    segButtons(seg, cb);
    return seg;
  }
  // 方塊＋置中文字
  function box(g, x, y, w, h, label, o) {
    o = o || {};
    S('rect', { x, y, width: w, height: h, rx: o.rx == null ? 4 : o.rx, fill: o.fill || 'var(--surface-2)', stroke: o.stroke || 'var(--border)', 'stroke-width': o.sw || 1.2 }, g);
    if (label) S('text', { x: x + w / 2, y: y + h / 2 + (o.sub ? -3 : 4), 'text-anchor': 'middle', 'font-size': o.fs || 12, 'font-weight': o.fw || 600, fill: o.color || 'var(--fg)', text: label }, g);
    if (o.sub) S('text', { x: x + w / 2, y: y + h / 2 + 12, 'text-anchor': 'middle', 'font-size': 10.5, fill: o.subColor || 'var(--muted)', text: o.sub, cls: 't-mono' }, g);
  }
  const hex = (arr, max) => {
    const a = Array.from(arr.slice(0, max || arr.length), b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    return max && arr.length > max ? a + ' …' : a;
  };

  /* ---------- RC4 / CRC-32 ---------- */
  function rc4(key, n) {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    for (let i = 0, j = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) & 255; [s[i], s[j]] = [s[j], s[i]]; }
    const out = new Uint8Array(n);
    for (let k = 0, i = 0, j = 0; k < n; k++) {
      i = (i + 1) & 255; j = (j + s[i]) & 255; [s[i], s[j]] = [s[j], s[i]];
      out[k] = s[(s[i] + s[j]) & 255];
    }
    return out;
  }
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes) { let c = 0xFFFFFFFF; for (const b of bytes) c = CRC_T[(c ^ b) & 255] ^ (c >>> 8); c = (c ^ 0xFFFFFFFF) >>> 0; return new Uint8Array([c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24]); }
  const xor = (a, b) => a.map((v, i) => v ^ b[i]);
  const cat = (a, b) => { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; };
  const enc = new TextEncoder(), dec = new TextDecoder();
  function wepEncrypt(iv, key, pt) {
    const seed = cat(iv, key);
    const icv = crc32(pt);
    const ks = rc4(seed, pt.length + 4);
    return { seed, icv, ks, ct: xor(cat(pt, icv), ks) };
  }

  /* ---------- 1. WEP 訊框結構 ---------- */
  (function wepFrame() {
    const host = document.getElementById('fig-wepframe');
    if (!host) return;
    const svg = svgRoot(host, 720, 250, 'WEP 訊框結構');
    const r1 = [[20, 90, 'Preamble'], [110, 110, 'PLCP Header'], [220, 110, 'MAC Header'], [330, 290, 'Payload'], [620, 80, 'CRC']];
    r1.forEach(([x, w, l]) => box(svg, x, 20, w, 40, l, l === 'Payload' ? { fill: 'var(--accent-soft)', stroke: 'var(--accent)' } : {}));
    const r2 = [[150, 130, 'IV', '4 bytes・明文'], [280, 260, 'Ciphertext', '加密的 payload'], [540, 130, 'ICV', '4 bytes・加密']];
    r2.forEach(([x, w, l, s], i) => box(svg, x, 105, w, 44, l, i ? { fill: 'var(--orange-soft)', stroke: 'var(--orange)', sub: s } : { sub: s }));
    S('path', { d: 'M330 60 L150 105 M620 60 L670 105', stroke: 'var(--muted)', fill: 'none', 'stroke-dasharray': '4 4' }, svg);
    S('text', { x: 405, y: 96, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--orange)', 'font-weight': 700, text: 'Encrypted' }, svg);
    S('path', { d: 'M280 98 L670 98', stroke: 'var(--orange)', 'stroke-width': 1.5, fill: 'none' }, svg);
    const r3 = [[40, 200, 'Init. Vector', '3 bytes = 24 bits'], [240, 90, 'Pad', '6 bits'], [330, 100, 'Key ID', '2 bits → 4 keys']];
    r3.forEach(([x, w, l, s], i) => box(svg, x, 190, w, 44, l, i === 2 ? { fill: 'var(--accent-soft)', stroke: 'var(--accent)', sub: s } : { sub: s }));
    S('path', { d: 'M150 149 L40 190 M280 149 L430 190', stroke: 'var(--muted)', fill: 'none', 'stroke-dasharray': '4 4' }, svg);
  })();

  /* ---------- 2. WEP 實驗室 ---------- */
  (function wepLab() {
    const fig = document.getElementById('fig-weplab-wrap');
    if (!fig) return;
    const $ = id => document.getElementById(id);
    const out = $('wep-out'), msg = $('wep-msg');
    let mode = null;
    function run() {
      const keyStr = $('wep-key').value, ivStr = $('wep-iv').value.trim();
      const kid = +$('wep-kid').value;
      const key = new Uint8Array(5);
      for (let i = 0; i < 5; i++) key[i] = i < keyStr.length ? keyStr.charCodeAt(i) & 255 : 0;
      if (!/^[0-9a-f]{6}$/i.test(ivStr)) { out.textContent = 'IV 需要剛好 6 位十六進位（24 bits），例如 0A1B2C。'; msg.className = 'status bad'; msg.textContent = ''; return; }
      const iv = new Uint8Array([0, 2, 4].map(i => parseInt(ivStr.slice(i, i + 2), 16)));
      const pt = enc.encode($('wep-pt').value || ' ');
      const r = wepEncrypt(iv, key, pt);
      const lines = [
        `秘密金鑰（40 bits）: ${hex(key)}${keyStr.length !== 5 ? '　← 不足 5 個字元，以 00 補齊' : ''}`,
        `IV 欄位（4 bytes）  : ${hex(iv)} | ${(kid << 6).toString(16).toUpperCase().padStart(2, '0')}   ← IV 3 bytes ＋ Pad 6 bits ＋ Key ID ${kid}（2 bits）`,
        `seed（64 bits）     : ${hex(r.seed)}   ← IV ‖ Secret Key`,
        `明文（${String(pt.length).padStart(2)} bytes）    : ${hex(pt, 16)}`,
        `ICV = CRC-32(明文)  : ${hex(r.icv)}`,
        `RC4 金鑰序列        : ${hex(r.ks, 16)}`,
        `密文 = (明文‖ICV)⊕KS: ${hex(r.ct, 16)}`,
        `送出的 Frame Body   : IV 欄位 4 ＋ 密文 ${r.ct.length} = ${4 + r.ct.length} bytes（比明文多 8 bytes）`,
      ];
      if (mode === 'ok' || mode === 'flip') {
        const rx = r.ct.slice();
        if (mode === 'flip') rx[0] ^= 0x80;
        const plain = xor(rx, rc4(r.seed, rx.length));
        const p2 = plain.slice(0, -4), icvRx = plain.slice(-4), icv2 = crc32(p2);
        const same = icv2.every((v, i) => v === icvRx[i]);
        lines.push('', '── 接收端 ──',
          `收到的密文          : ${hex(rx, 16)}${mode === 'flip' ? '   ← 第 1 個 bit 被改了' : ''}`,
          `解出的明文          : ${hex(p2, 16)}（「${dec.decode(p2)}」）`,
          `收到的 ICV          : ${hex(icvRx)}`,
          `重算 ICV'           : ${hex(icv2)}`);
        msg.className = same ? 'status ok' : 'status bad';
        msg.textContent = same ? '✔ ICV\' = ICV：交給上層，並回 ACK。' : '✘ ICV\' ≠ ICV：完整性檢查失敗 → 仍然回 ACK，但把訊框丟棄（ACKed but discarded）。';
      } else if (mode === 'reuse') {
        const pt2 = enc.encode('Attack at 9');
        const r2 = wepEncrypt(iv, key, pt2);
        const n = Math.min(pt.length, pt2.length);
        const cx = xor(r.ct.slice(0, n), r2.ct.slice(0, n)), px = xor(pt.slice(0, n), pt2.slice(0, n));
        lines.push('', '── 同一個 IV 再加密一次 ──',
          `第二份明文          : ${hex(pt2, 16)}（「Attack at 9」）`,
          `第二份密文          : ${hex(r2.ct, 16)}`,
          `C1 ⊕ C2（前 ${n} bytes）: ${hex(cx, 16)}`,
          `P1 ⊕ P2（前 ${n} bytes）: ${hex(px, 16)}`);
        msg.className = 'status bad';
        msg.textContent = '⚠ C1 ⊕ C2 = P1 ⊕ P2：同 IV ＋ 同金鑰 → 同一段金鑰序列，竊聽者只要猜中其中一份明文，就能解出另一份。24-bit IV 很快就會重複。';
      } else {
        msg.className = 'status info';
        msg.textContent = '改改金鑰、IV 或明文，再按下方按鈕看接收端怎麼處理。';
      }
      out.textContent = lines.join('\n');
    }
    ['wep-key', 'wep-iv', 'wep-pt'].forEach(id => $(id).addEventListener('input', () => { mode = null; run(); }));
    $('wep-kid').addEventListener('change', run);
    fig.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.act; run(); }));
    run();
  })();

  /* ---------- 3. 訊框類別 ---------- */
  (function classes() {
    const board = document.getElementById('class-board');
    if (!board) return;
    const msg = document.getElementById('class-msg');
    const F = [
      ['RTS', 1, '控制'], ['CTS', 1, '控制'], ['ACK', 1, '控制'], ['CF-End', 1, '控制'], ['CF-End+ACK', 1, '控制'],
      ['Probe Request/Response', 1, '管理'], ['Beacon', 1, '管理'], ['Authentication', 1, '管理'], ['Deauthentication', 1, '管理'], ['ATIM', 1, '管理'],
      ['Data（IBSS 直接傳，To/From DS = 0）', 1, '資料'],
      ['Association Request/Response', 2, '管理'], ['Reassociation Request/Response', 2, '管理'], ['Disassociation', 2, '管理'],
      ['Data（經 DS，To/From DS 可為 1）', 3, '資料'], ['PS-Poll', 3, '控制'],
    ];
    let st = 1;
    function draw() {
      board.innerHTML = '';
      F.forEach(([n, c, t]) => {
        const ok = c <= st;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn';
        b.style.cssText = `background:var(--${ok ? 'green' : 'red'}-soft);border-color:transparent;${ok ? '' : 'opacity:.75'}`;
        b.innerHTML = `${ok ? '✔' : '✘'} ${n} <span class="pill">Class ${c}</span>`;
        b.addEventListener('click', () => {
          msg.className = ok ? 'status ok' : 'status bad';
          msg.textContent = ok
            ? `${n}（${t}訊框，Class ${c}）：State ${st} 可以送。`
            : `${n}（${t}訊框，Class ${c}）：State ${st} 不能送，要先${c === 2 ? '完成 Authentication（到 State 2）' : st === 1 ? '完成 Authentication 與 Association（到 State 3）' : '完成 Association（到 State 3）'}。若對方仍收到，會回 Deauthentication（講義 p.8 PS）。`;
        });
        board.append(b);
      });
    }
    segButtons(document.getElementById('class-seg'), v => { st = +v; draw(); msg.className = 'status info'; msg.textContent = `State ${st}：可送 ${['', 'Class 1', 'Class 1、2', 'Class 1、2、3（全部）'][st]}。`; });
    draw();
  })();

  /* ---------- 4. 訊框欄位瀏覽器 ---------- */
  (function explorer() {
    const fig = document.getElementById('fig-fx-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-fx'), 720, 150, 'MAC 訊框欄位');
    const msg = document.getElementById('fx-msg'), out = document.getElementById('fx-out');
    const typeSel = document.getElementById('fx-type'), bodyIn = document.getElementById('fx-body'), rateSel = document.getElementById('fx-rate');
    const D = {
      FC: ['Frame Control', 2, '16 bits：Protocol Version、Type、Subtype 與 8 個旗標（第 7 節）。'],
      Dur: ['Duration/ID', 2, '一般是 µs，讓聽到的站台更新 NAV；PS-Poll 放 AID；CFP 內固定 32768（第 8 節）。'],
      AID: ['AID', 2, 'PS-Poll 在 Duration/ID 的位置放 AID：AP 在 Association Response 給的值，bit 15、14 一律為 1。'],
      SC: ['Sequence Control', 2, 'Sequence Number 12 bits ＋ Fragment Number 4 bits，用來過濾重複訊框與重組分段（第 10 節）。'],
      QoS: ['QoS Control', 2, '補充：802.11e 加入，只有 QoS 資料訊框才有（講義 p.23：0 或 2 bytes）。'],
      HT: ['HT Control', 4, '補充：802.11n 加入（High Throughput），11ac／ax 沿用並延伸（講義 p.23：0 或 4 bytes）。'],
      Body: ['Frame Body', 'body', '可變長度 0–2312 bytes；管理訊框放資訊元素，資料訊框放 MSDU（用 WEP 時含 IV 欄位與 ICV）。'],
      FCS: ['FCS', 4, 'IEEE 32-bit CRC，涵蓋 MAC Header 與 Frame Body（講義圖上標 CRC）。'],
    };
    const A = (n, role, d) => ({ k: 'A', n, len: 6, role, d });
    const T = {
      data4: { f: ['FC', 'Dur', A('Addr 1', 'RA', '這一跳的接收端（下一個 AP）。所有站台都用 Addr 1 過濾收件。'), A('Addr 2', 'TA', '這一跳的傳送端（目前在送的 AP），ACK 回給它。'), A('Addr 3', 'DA', 'MSDU 的最終目的地。'), 'SC', A('Addr 4', 'SA', '只有 WDS（To DS = From DS = 1）才需要，標出原始來源。'), 'Body', 'FCS'], d: '資料訊框，To DS = From DS = 1（Wireless Bridge）才有 4 個位址。' },
      data3: { f: ['FC', 'Dur', A('Addr 1', '依 To/From DS', '這一跳的接收端：DA 或 BSSID（見第 9 節）。'), A('Addr 2', '依 To/From DS', '這一跳的傳送端：SA 或 BSSID。'), A('Addr 3', '依 To/From DS', 'BSSID、SA 或 DA。'), 'SC', 'Body', 'FCS'], d: '最常見的資料訊框：Addr 4 不存在，標頭 24 bytes。' },
      dataax: { f: ['FC', 'Dur', A('Addr 1', '', '依 To/From DS。'), A('Addr 2', '', '依 To/From DS。'), A('Addr 3', '', '依 To/From DS。'), 'SC', A('Addr 4', 'WDS 才有', '只有 To DS = From DS = 1 時存在。'), 'QoS', 'HT', 'Body', 'FCS'], d: '講義 p.23「Data Frames (IEEE 802.11 ax)」：多了 QoS 與 HT 欄位（這裡全部畫出，等於最長的情況）。' },
      mgmt: { f: ['FC', 'Dur', A('DA', '', '目的位址。'), A('SA', '', '來源位址。'), A('BSSID', '', 'AP 位址；ad hoc 時為該 IBSS 的 BSS ID。'), 'SC', 'Body', 'FCS'], d: '管理訊框只有 3 個位址；Frame Body 是資訊元素（Beacon、Probe、Association…）。' },
      rts: { f: ['FC', 'Dur', A('RA', '', 'Infrastructure：所關聯的 AP；Ad hoc：後續資料或管理訊框的目的地。'), A('TA', '', '送出 RTS 的站台。'), 'FCS'], d: 'RTS（Subtype 1011）：預約媒介，Duration 涵蓋 CTS＋Data＋ACK。' },
      cts: { f: ['FC', 'Dur', A('RA', '', '取自所回應之 RTS 的來源位址（TA）。'), 'FCS'], d: 'CTS（Subtype 1100）：沒有 TA，接收端本來就知道在回誰。' },
      ack: { f: ['FC', 'Dur', A('RA', '', '取自緊接在前之資料或管理訊框的 Address 2。'), 'FCS'], d: 'ACK（Subtype 1101）：在 SIFS 之後回覆。' },
      pspoll: { f: ['FC', 'AID', A('BSSID', '', 'AP 的位址。'), A('TA', '', '送出 PS-Poll 的省電站台。'), 'FCS'], d: 'PS-Poll（Subtype 1010）：省電站台醒來向 AP 取緩衝資料。' },
      cfend: { f: ['FC', 'Dur', A('RA', '', '廣播群組位址。'), A('BSSID', '', 'AP 的位址。'), 'FCS'], d: 'CF-End（1110）／CF-End+CF-Ack（1111）：宣告 CFP 結束，Duration 設 0。' },
    };
    let sel = -1;
    function fields() {
      return T[typeSel.value].f.map(f => typeof f === 'string' ? { k: f, n: D[f][0], len: D[f][1], d: D[f][2] } : f);
    }
    const isCtrl = () => ['rts', 'cts', 'ack', 'pspoll', 'cfend'].includes(typeSel.value);
    function bodyLen() { return isCtrl() ? 0 : Math.max(0, Math.min(2312, Math.round(+bodyIn.value || 0))); }
    function draw() {
      clear(svg);
      const fs = fields(), body = bodyLen();
      const ws = fs.map(f => f.len === 'body' ? 120 : 30 + f.len * 6.5);
      const sc = Math.min(1, 690 / ws.reduce((a, b) => a + b, 0));
      let x = 15;
      const y = 44, h = 50;
      const hdrEnd = fs.findIndex(f => f.len === 'body' || f.k === 'FCS');
      let hx1 = 0;
      fs.forEach((f, i) => {
        const w = ws[i] * sc;
        const g = S('g', { cls: 'hit' }, svg);
        const on = i === sel;
        const fill = f.len === 'body' ? 'var(--surface)' : f.k === 'A' ? 'var(--accent-soft)' : f.k === 'QoS' || f.k === 'HT' ? 'var(--purple-soft)' : 'var(--surface-2)';
        S('rect', { x, y, width: w, height: h, fill, stroke: on ? 'var(--orange)' : 'var(--border)', 'stroke-width': on ? 2.5 : 1.2 }, g);
        S('text', { x: x + w / 2, y: y + 22, 'text-anchor': 'middle', 'font-size': w < 50 ? 10.5 : 12, 'font-weight': 700, text: f.k === 'A' ? f.n : f.k === 'Body' ? 'Frame Body' : f.k === 'Dur' ? 'Dur/ID' : f.k === 'SC' ? 'Seq Ctrl' : f.k === 'FC' ? 'FC' : f.n.replace(' Control', '') }, g);
        S('text', { x: x + w / 2, y: y + 39, 'text-anchor': 'middle', 'font-size': 10.5, cls: 't-muted t-mono', text: f.len === 'body' ? (isCtrl() ? '—' : body) : f.len }, g);
        if (f.role) S('text', { x: x + w / 2, y: y + h + 16, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--accent)', text: f.role }, svg);
        g.addEventListener('click', () => { sel = i; msg.className = 'status info'; msg.textContent = `${f.n}（${f.len === 'body' ? '0–2312' : f.len} bytes）：${f.d}`; draw(); });
        if (i === hdrEnd - 1) hx1 = x + w;
        x += w;
      });
      S('path', { d: `M15 ${y - 8} L15 ${y - 14} L${hx1} ${y - 14} L${hx1} ${y - 8}`, stroke: 'var(--muted)', fill: 'none' }, svg);
      S('text', { x: (15 + hx1) / 2, y: y - 20, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, cls: 't-muted', text: 'MAC Header' }, svg);
      S('text', { x: 15, y: 140, 'font-size': 11, cls: 't-muted', text: '單位：octets（bytes）。藍色是位址欄位，下方標它在這種訊框裡代表誰。' }, svg);
      const hdr = fs.filter(f => f.len !== 'body' && f.k !== 'FCS').reduce((a, f) => a + f.len, 0);
      const total = hdr + body + 4, rate = +rateSel.value;
      out.textContent = `${T[typeSel.value].d}\nMAC Header ${hdr} + Frame Body ${body} + FCS 4 = ${total} bytes = ${total * 8} bits\n傳輸時間 T = 8 × ${total} ÷ ${rate} ≈ ${(total * 8 / rate).toFixed(2)} µs（不含 PLCP）`;
      bodyIn.disabled = isCtrl();
    }
    typeSel.addEventListener('change', () => { sel = -1; msg.className = 'status info'; msg.textContent = '點任一欄位看說明。'; draw(); });
    bodyIn.addEventListener('input', draw);
    rateSel.addEventListener('change', draw);
    draw();
  })();

  /* ---------- 5. Frame Control 組裝器 ---------- */
  (function fcBuilder() {
    const fig = document.getElementById('fig-fcb-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-fcb'), 720, 130, 'Frame Control 16 bits');
    const out = document.getElementById('fcb-out'), subSel = document.getElementById('fcb-sub'), flagsEl = document.getElementById('fcb-flags');
    const TYPES = ['管理', '控制', '資料'];
    const SUBS = [
      [0, 0, 'Association Request'], [0, 1, 'Association Response'], [0, 2, 'Reassociation Request'], [0, 3, 'Reassociation Response'],
      [0, 4, 'Probe Request'], [0, 5, 'Probe Response'], [0, 8, 'Beacon'], [0, 9, 'ATIM'], [0, 10, 'Disassociation'], [0, 11, 'Authentication'], [0, 12, 'Deauthentication'],
      [1, 10, 'PS-Poll'], [1, 11, 'RTS'], [1, 12, 'CTS'], [1, 13, 'ACK'], [1, 14, 'CF-End'], [1, 15, 'CF-End+CF-Ack'],
      [2, 0, 'Data'], [2, 4, 'Null function（no data）'], [2, 8, 'QoS Data（11e）'],
    ];
    const FLAGS = ['To DS', 'From DS', 'More Frag', 'Retry', 'Pwr Mgt', 'More Data', 'WEP', 'Order'];
    subSel.innerHTML = SUBS.map(([t, s, n], i) => `<option value="${i}"${n === 'Data' ? ' selected' : ''}>${TYPES[t]}：${n}</option>`).join('');
    const flags = [1, 0, 0, 0, 0, 0, 1, 0];
    flagsEl.innerHTML = FLAGS.map((f, i) => `<button class="btn" type="button" data-i="${i}">${f}</button>`).join('');
    flagsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; flags[b.dataset.i] ^= 1; draw(); });
    subSel.addEventListener('change', draw);
    function draw() {
      const [type, sub, name] = SUBS[+subSel.value];
      const bits = [0, 0, type & 1, type >> 1 & 1, sub & 1, sub >> 1 & 1, sub >> 2 & 1, sub >> 3 & 1, ...flags];
      clear(svg);
      const cw = 42, x0 = 24;
      const groups = [[0, 2, 'Protocol Version', 'var(--surface-2)'], [2, 2, 'Type', 'var(--green-soft)'], [4, 4, 'Subtype', 'var(--accent-soft)']];
      groups.forEach(([s, n, l]) => {
        S('text', { x: x0 + (s + n / 2) * cw, y: 18, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, text: l }, svg);
      });
      FLAGS.forEach((f, i) => S('text', { x: x0 + (8 + i) * cw + cw / 2, y: 18, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, text: f.replace('More ', 'M.').replace('Pwr Mgt', 'PwrM') }, svg));
      bits.forEach((b, i) => {
        const fill = i < 2 ? 'var(--surface-2)' : i < 4 ? 'var(--green-soft)' : i < 8 ? 'var(--accent-soft)' : b ? 'var(--orange)' : 'var(--surface)';
        const g = S('g', i >= 8 ? { cls: 'hit' } : null, svg);
        S('rect', { x: x0 + i * cw, y: 28, width: cw - 3, height: 40, rx: 4, fill, stroke: 'var(--border)' }, g);
        S('text', { x: x0 + i * cw + cw / 2 - 1.5, y: 54, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 800, fill: i >= 8 && b ? '#fff' : 'var(--fg)', text: b, cls: 't-mono' }, g);
        S('text', { x: x0 + i * cw + cw / 2 - 1.5, y: 86, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: 'b' + i }, svg);
        if (i >= 8) g.addEventListener('click', () => { flags[i - 8] ^= 1; draw(); });
      });
      S('text', { x: x0, y: 112, 'font-size': 11, cls: 't-muted', text: '← 先送 b0（Protocol Version）……最後送 b15（Order）。上排標籤 M. = More，PwrM = Power Management' }, svg);
      flagsEl.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', !!flags[i]));
      const o1 = bits.slice(0, 8).reduce((a, b, i) => a | b << i, 0), o2 = flags.reduce((a, b, i) => a | b << i, 0);
      const h2 = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');
      const subBits = sub.toString(2).padStart(4, '0'), typeBits = type.toString(2).padStart(2, '0');
      const lines = [
        `Type（b3 b2）= ${typeBits}（${TYPES[type]}訊框）　Subtype（b7 b6 b5 b4）= ${subBits}（${name}）`,
        `第 1 個 octet（b7…b0）= ${h2(o1)}　第 2 個 octet（b15…b8）= ${h2(o2)}`,
      ];
      const on = FLAGS.filter((f, i) => flags[i]);
      lines.push('有設的旗標：' + (on.length ? on.join('、') : '（無）'));
      const warn = [];
      const td = flags[0], fd = flags[1];
      if (type === 2) warn.push(`To DS = ${td}、From DS = ${fd} → ${['Ad hoc（IBSS）：DA、SA、BSSID', 'From AP：DA、BSSID、SA', 'To DS：BSSID、SA、DA', 'WDS：RA、TA、DA、SA（才有 Addr 4）'][td * 2 + fd]}`);
      else if (td || fd) warn.push('⚠ 講義：To DS／From DS 是給「資料訊框」用的；控制與管理訊框這兩個 bit 應為 0。');
      if (flags[6] && type !== 2) warn.push('⚠ 講義：WEP 只加密資料訊框的 payload。（補充：Shared Key 認證第 3 步的 Authentication 訊框是例外，會設 WEP = 1。）');
      if (flags[2] && type === 1) warn.push('⚠ 控制訊框不分段，More Frag 應為 0。');
      lines.push(...warn);
      out.textContent = lines.join('\n');
    }
    draw();
  })();

  /* ---------- 6. Duration/ID 解碼器 ---------- */
  (function duration() {
    const fig = document.getElementById('fig-dur-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-dur'), 720, 100, 'Duration/ID 16 bits');
    const inp = document.getElementById('dur-in'), msg = document.getElementById('dur-msg');
    let v = 0;
    function parse() {
      const s = inp.value.trim();
      const n = /^0x[0-9a-f]+$/i.test(s) ? parseInt(s, 16) : /^\d+$/.test(s) ? parseInt(s, 10) : NaN;
      if (isNaN(n) || n < 0 || n > 65535) { msg.className = 'status bad'; msg.textContent = '請輸入 0–65535 的整數，或 0x0000–0xFFFF。'; return; }
      v = n; draw();
    }
    function draw() {
      clear(svg);
      const cw = 42, x0 = 24;
      for (let i = 15; i >= 0; i--) {
        const k = 15 - i, b = v >> i & 1;
        const g = S('g', { cls: 'hit' }, svg);
        const top = i >= 14;
        S('rect', { x: x0 + k * cw, y: 22, width: cw - 3, height: 40, rx: 4, fill: b ? (top ? 'var(--orange)' : 'var(--accent)') : 'var(--surface-2)', stroke: top ? 'var(--orange)' : 'var(--border)' }, g);
        S('text', { x: x0 + k * cw + cw / 2 - 1.5, y: 48, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 800, fill: b ? '#fff' : 'var(--fg)', text: b, cls: 't-mono' }, g);
        S('text', { x: x0 + k * cw + cw / 2 - 1.5, y: 80, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: 'b' + i }, svg);
        g.addEventListener('click', () => { v ^= 1 << i; inp.value = v; draw(); });
      }
      S('text', { x: x0 + cw, y: 14, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--orange)', text: 'bit 15、14' }, svg);
      S('text', { x: x0 + 9 * cw, y: 14, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, cls: 't-muted', text: 'bits 13–0' }, svg);
      const b15 = v >> 15 & 1, b14 = v >> 14 & 1, low = v & 0x3FFF;
      const hx = '0x' + v.toString(16).toUpperCase().padStart(4, '0');
      let t, cls = 'status info';
      if (!b15) { t = `bit 15 = 0 → Duration = ${v} µs，收到的站台用它更新 NAV。`; cls = 'status ok'; }
      else if (!b14) t = low === 0 ? 'bit 15 = 1、其餘為 0 → CFP 期間送出訊框的固定值 32768。' : `bit 15 = 1、bit 14 = 0、bits 13–0 = ${low} → 保留值。`;
      else if (low === 0) t = 'bit 15、14 = 1、bits 13–0 = 0 → 保留值。';
      else if (low <= 2007) { t = `bit 15、14 = 1 → PS-Poll 的 AID = ${low}（49152 + ${low} = ${v}）。這不是時間，不能拿來更新 NAV。`; cls = 'status ok'; }
      else { t = `bit 15、14 = 1、bits 13–0 = ${low} → 超過 2007，保留值。`; cls = 'status bad'; }
      msg.className = cls;
      msg.textContent = `${v} = ${hx}　${t}`;
    }
    inp.addEventListener('input', parse);
    fig.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.v; parse(); }));
    parse();
  })();

  /* ---------- 7. 位址欄位動畫 ---------- */
  (function addr() {
    const fig = document.getElementById('fig-addr-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-addr'), 720, 330, 'To DS／From DS 與位址欄位動畫');
    const ar = arrowDefs(svg);
    const msg = document.getElementById('addr-msg');
    const N = { A: [90, 180, 'STA A'], AP1: [270, 110, 'AP1'], AP2: [450, 110, 'AP2'], B: [630, 180, 'STA B'] };
    const M = {
      '00': { from: 'A', to: 'B', a: ['DA（STA B）', 'SA（STA A）', 'BSSID（IBSS）', '—'], t: 'Ad hoc（IBSS）：STA A 直接送給 STA B，沒有 AP、沒有 DS；BSSID 是這個 IBSS 的隨機 ID。' },
      '10': { from: 'A', to: 'AP1', a: ['BSSID（AP1）', 'SA（STA A）', 'DA（STA B）', '—'], t: 'To DS：STA A → AP1。這一跳的接收者是 AP1，所以 Addr 1 = BSSID；最終目的 STA B 放在 Addr 3，讓 AP 經 DS 轉送。' },
      '11': { from: 'AP1', to: 'AP2', a: ['RA（AP2）', 'TA（AP1）', 'DA（STA B）', 'SA（STA A）'], t: 'WDS（Wireless Bridge）：AP1 用無線把訊框交給 AP2。這一跳的收送方（RA、TA）和端點（DA、SA）都不同，所以要 4 個位址。' },
      '01': { from: 'AP2', to: 'B', a: ['DA（STA B）', 'BSSID（AP2）', 'SA（STA A）', '—'], t: 'From AP：AP2 → STA B。Addr 2 = BSSID（AP2）是這一跳的傳送端，ACK 回給它；原始來源 STA A 放在 Addr 3。' },
    };
    let mode = '10';
    function node(k, role, hl) {
      const [x, y, l] = N[k], isAP = k.startsWith('AP');
      if (isAP) {
        S('rect', { x: x - 26, y: y - 14, width: 52, height: 28, rx: 6, fill: hl ? 'var(--orange)' : 'var(--accent)' }, svg);
        S('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fff', text: l }, svg);
      } else {
        S('circle', { cx: x, cy: y, r: 24, fill: 'var(--surface)', stroke: hl ? 'var(--orange)' : 'var(--accent)', 'stroke-width': 2.5 }, svg);
        S('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, text: l }, svg);
      }
      if (role) S('text', { x, y: y - (isAP ? 24 : 32), 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: 'var(--orange)', text: role }, svg);
    }
    function render(t) {
      clear(svg);
      const mk = arrowDefs(svg);
      const m = M[mode], ibss = mode === '00';
      // 背景連線
      if (ibss) {
        S('ellipse', { cx: 360, cy: 180, rx: 330, ry: 60, fill: 'var(--accent-soft)', opacity: 0.4, stroke: 'var(--accent)', 'stroke-dasharray': '6 4' }, svg);
        S('text', { x: 360, y: 236, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--accent)', text: 'IBSS（沒有 AP、沒有 DS）' }, svg);
      } else {
        S('line', { x1: 90, y1: 180, x2: 270, y2: 110, stroke: 'var(--muted)', 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, svg);
        S('line', { x1: 450, y1: 110, x2: 630, y2: 180, stroke: 'var(--muted)', 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, svg);
        if (mode === '11') {
          S('line', { x1: 296, y1: 110, x2: 424, y2: 110, stroke: 'var(--purple)', 'stroke-dasharray': '6 4', 'stroke-width': 2 }, svg);
          S('text', { x: 360, y: 96, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: 'var(--purple)', text: 'WDS（無線）' }, svg);
        } else {
          S('path', { d: 'M270 124 L270 160 L450 160 L450 124', stroke: 'var(--fg)', 'stroke-width': 4, fill: 'none' }, svg);
          S('text', { x: 360, y: 152, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, text: 'DS（有線）' }, svg);
        }
      }
      const roles = { A: 'SA', B: 'DA' };
      roles[m.from] = (roles[m.from] ? roles[m.from] + '・' : '') + 'TA';
      roles[m.to] = (roles[m.to] ? roles[m.to] + '・' : '') + 'RA';
      // 這一跳（畫在節點下面，端點停在節點邊緣）
      const [ax, ay] = N[m.from], [bx, by2] = N[m.to];
      const len = Math.hypot(bx - ax, by2 - ay), ux = (bx - ax) / len, uy = (by2 - ay) / len;
      const x1 = ax + ux * 30, y1 = ay + uy * 30, x2 = bx - ux * 32, y2 = by2 - uy * 32;
      const p = prog(t, 0.3, 2.2);
      S('line', { x1, y1, x2: lerp(x1, x2, Math.max(p, 0.02)), y2: lerp(y1, y2, Math.max(p, 0.02)), stroke: 'var(--orange)', 'stroke-width': 3, 'marker-end': mk('orange') }, svg);
      ['A', 'AP1', 'AP2', 'B'].forEach(k => { if (!ibss || !k.startsWith('AP')) node(k, roles[k], k === m.from || k === m.to); });
      if (p > 0 && p < 1) {
        const px = lerp(x1, x2, p), py = lerp(y1, y2, p);
        S('rect', { x: px - 22, y: py - 11, width: 44, height: 22, rx: 5, fill: 'var(--orange)' }, svg);
        S('text', { x: px, y: py + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#fff', text: 'Data' }, svg);
      }
      // 位址欄
      const by = 262;
      ['To DS', 'From DS'].forEach((l, i) => box(svg, 20 + i * 62, by, 58, 46, mode[i], { sub: l, fs: 16, fill: 'var(--surface-2)' }));
      m.a.forEach((a, i) => {
        const q = prog(t, 2.2 + i * 0.35, 2.6 + i * 0.35);
        const x = 152 + i * 140;
        S('rect', { x, y: by, width: 134, height: 46, rx: 5, fill: a === '—' ? 'var(--surface-2)' : 'var(--accent-soft)', stroke: 'var(--border)' }, svg);
        S('text', { x: x + 67, y: by + 17, 'text-anchor': 'middle', 'font-size': 11, cls: 't-muted', text: 'Addr ' + (i + 1) }, svg);
        S('text', { x: x + 67, y: by + 36, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: a === '—' ? 'N/A' : a, opacity: a === '—' ? 1 : q }, svg);
      });
      S('text', { x: 20, y: 24, 'font-size': 12, cls: 't-muted', text: 'STA A 要把 MSDU 交給 STA B。橙色是這一跳。' }, svg);
    }
    const tl = Timeline(fig, { duration: 4, render, format: t => `${t.toFixed(1)} s` });
    makeSeg(fig, [['00', '00 Ad hoc'], ['10', '10 To DS'], ['11', '11 WDS'], ['01', '01 From AP']], v => { mode = v; msg.textContent = M[v].t; tl.pause(); tl.set(0); tl.play(); });
    fig.querySelector('.seg [data-v="10"]').click();
    tl.pause(); tl.set(4);
  })();

  /* ---------- 8. 分段動畫 ---------- */
  (function frag() {
    const fig = document.getElementById('fig-frag-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-frag'), 720, 230, 'MSDU 分段動畫');
    const out = document.getElementById('fg-out');
    const $ = id => document.getElementById(id);
    let F = null;
    function calc() {
      const msdu = Math.max(1, Math.round(+$('fg-msdu').value || 1)), th = Math.max(1, Math.min(2312, Math.round(+$('fg-th').value || 1)));
      const seq = Math.max(0, Math.min(4095, Math.round(+$('fg-seq').value || 0)));
      const n = Math.ceil(msdu / th);
      const sizes = Array.from({ length: n }, (_, i) => i < n - 1 ? th : msdu - th * (n - 1));
      F = { msdu, th, seq, n, sizes };
      const total = msdu + n * 28;
      out.textContent = n > 16
        ? `需要 ${n} 段 > 16：Fragment Number 只有 4 bits（0–15），一個 MSDU 最多 16 段 → 這個設定不合法，請把每段上限調大。`
        : `段數 = ⌈${msdu} ÷ ${th}⌉ = ${n}（${sizes.join('、')} bytes）\n每段加 MAC Header 24 + CRC 4 = 28 bytes → 總長 ${msdu} + ${n}×28 = ${total} bytes\n不分段只要 ${msdu + 28} bytes，多出 ${total - msdu - 28} bytes（${((total - msdu - 28) / (msdu + 28) * 100).toFixed(1)}%）\n所有分段的 Sequence Number 都是 ${seq}；Fragment Number 0–${n - 1}；最後一段 More Frag = 0`;
    }
    function render(t) {
      clear(svg);
      if (!F) return;
      const { msdu, seq, n, sizes } = F;
      box(svg, 20, 16, 680, 32, `MSDU ${msdu} bytes`, { fill: 'var(--green-soft)', stroke: 'var(--green)' });
      if (n > 16) {
        S('text', { x: 360, y: 130, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--red)', text: `需要 ${n} 段，超過 16 段的上限（Fragment Number 只有 4 bits）` }, svg);
        return;
      }
      const cut = prog(t, 0.2, 0.8);
      let cx = 20;
      sizes.slice(0, -1).forEach(s => { cx += s / msdu * 680; S('line', { x1: cx, y1: 12, x2: cx, y2: 12 + 40 * cut, stroke: 'var(--red)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, svg); });
      const gap = 6, avail = 680 - gap * (n - 1), tot = sizes.reduce((a, s) => a + s + 28, 0);
      let x = 20, sx = 20;
      const step = 6 / n;
      sizes.forEach((s, i) => {
        const w = (s + 28) / tot * avail, sw = s / msdu * 680;
        const p = prog(t, 1 + i * step, 1 + i * step + Math.min(0.8, step));
        if (p > 0) {
          const bx = lerp(sx, x, p), by = lerp(16, 110, p), bw = lerp(sw, w, p);
          const hw = Math.max(3, bw * 24 / (s + 28)), cw = Math.max(2, bw * 4 / (s + 28));
          S('rect', { x: bx, y: by, width: hw, height: 34, fill: 'var(--accent)' }, svg);
          S('rect', { x: bx + hw, y: by, width: Math.max(1, bw - hw - cw), height: 34, fill: 'var(--green-soft)', stroke: 'var(--green)' }, svg);
          S('rect', { x: bx + bw - cw, y: by, width: cw, height: 34, fill: 'var(--orange)' }, svg);
          if (p >= 1) {
            const fs = n > 8 ? 9 : 11;
            S('text', { x: x + w / 2, y: 164, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 700, text: `Frag ${i}` }, svg);
            S('text', { x: x + w / 2, y: 180, 'text-anchor': 'middle', 'font-size': fs - 1, cls: 't-muted t-mono', text: `MF ${i < n - 1 ? 1 : 0}` }, svg);
            if (n <= 8) S('text', { x: x + w / 2, y: 196, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: `Seq ${seq}` }, svg);
          }
        }
        x += w + gap; sx += sw;
      });
      S('rect', { x: 20, y: 210, width: 12, height: 12, fill: 'var(--accent)' }, svg);
      S('text', { x: 36, y: 220, 'font-size': 11, cls: 't-muted', text: 'MAC HDR' }, svg);
      S('rect', { x: 100, y: 210, width: 12, height: 12, fill: 'var(--green-soft)', stroke: 'var(--green)' }, svg);
      S('text', { x: 116, y: 220, 'font-size': 11, cls: 't-muted', text: 'Frame Body' }, svg);
      S('rect', { x: 196, y: 210, width: 12, height: 12, fill: 'var(--orange)' }, svg);
      S('text', { x: 212, y: 220, 'font-size': 11, cls: 't-muted', text: 'CRC　（MF = More Fragment）' }, svg);
    }
    calc();
    const tl = Timeline(fig, { duration: 7.5, render, format: t => `${t.toFixed(1)} s` });
    ['fg-msdu', 'fg-th', 'fg-seq'].forEach(id => $(id).addEventListener('input', () => { calc(); tl.pause(); tl.set(7.5); }));
    tl.set(7.5);
  })();

  /* ---------- 9. 訊框交換時間軸 ---------- */
  (function exchange() {
    const fig = document.getElementById('fig-seq-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-seq'), 720, 230, '訊框交換時間軸');
    const msg = document.getElementById('seq-msg');
    const Q = {
      dataack: { n: 'Data – ACK', L: ['STA A', 'STA B'], it: [[0, 'Data', 6, 'accent'], [1, 'ACK', 1.5, 'green']], nav: true, t: '最基本的交換：收到 Data 後隔一個 SIFS 回 ACK。Data 的 Duration 涵蓋 SIFS＋ACK，旁人設 NAV。' },
      rts: { n: 'RTS – CTS – Data – ACK', L: ['STA A', 'STA B'], it: [[0, 'RTS', 2, 'orange'], [1, 'CTS', 1.5, 'purple'], [0, 'Data', 6, 'accent'], [1, 'ACK', 1.5, 'green']], nav: true, t: 'RTS／CTS 先預約媒介：RTS 的 Duration 涵蓋 CTS＋Data＋ACK，聽到的站台都設 NAV（解決 hidden node）。' },
      frag: { n: 'Data – ACK – Data – ACK', L: ['STA A', 'STA B'], it: [[0, 'Frag 0', 3, 'accent'], [1, 'ACK', 1.5, 'green'], [0, 'Frag 1', 3, 'accent'], [1, 'ACK', 1.5, 'green']], nav: true, t: '分段的 MSDU：每段各自回 ACK，段與段之間只隔 SIFS，中途不會被別人搶走媒介。' },
      bcast: { n: 'Data（廣播）', L: ['STA A', '所有站台'], it: [[0, 'Data（群播／廣播）', 6, 'accent']], nav: false, t: '補充：廣播／群播的 Data 不回 ACK，所以只有一個訊框，也不保證送達。' },
      poll: { n: 'Poll – Data – ACK', L: ['AP（PC）', 'STA'], it: [[0, 'CF-Poll', 2, 'orange'], [1, 'Data', 5, 'accent'], [0, 'ACK', 1.5, 'green']], nav: false, t: 'PCF 輪詢（STA to AP）：AP 在 CFP 內點名，STA 回 Data，AP 回 ACK。沒資料時就是 Poll – ACK。' },
      atim: { n: 'ATIM – ACK', L: ['STA A', 'STA B'], it: [[0, 'ATIM', 2, 'purple'], [1, 'ACK', 1.5, 'green']], nav: true, t: 'Ad hoc 省電：在 ATIM window 先送 ATIM 告訴對方「有資料要給你，別睡」，對方回 ACK。' },
      cts: { n: 'CTS – Data – ACK（11g）', L: ['11g STA', 'STA B'], it: [[0, 'CTS（給自己）', 2, 'purple'], [0, 'Data（OFDM）', 3, 'accent'], [1, 'ACK', 1.5, 'green']], nav: true, t: '補充：CTS-to-self。11g 站台先用 11b 聽得懂的 DSSS 速率送 CTS 給自己，讓 11b 站台設 NAV，再用 OFDM 高速送資料。' },
    };
    let key = 'rts';
    const X0 = 110, W = 590, LY = [70, 120, 175];
    function layout() {
      const q = Q[key]; let u = 0; const pos = [];
      q.it.forEach((it, i) => { if (i) u += 1; pos.push([u, u + it[2]]); u += it[2]; });
      return { q, pos, total: u };
    }
    function render(t) {
      clear(svg);
      const { q, pos, total } = layout();
      const sc = W / Math.max(total, 10), cur = t / 5 * Math.max(total, 10);
      const lanes = [...q.L, '其他站台 NAV'];
      lanes.forEach((l, i) => {
        S('text', { x: 12, y: LY[i] + 4, 'font-size': 12, 'font-weight': 700, text: l, fill: i === 2 ? 'var(--muted)' : 'var(--fg)' }, svg);
        S('line', { x1: X0, y1: LY[i] + 16, x2: X0 + W, y2: LY[i] + 16, stroke: 'var(--border)' }, svg);
      });
      q.it.forEach(([w, l, d, c], i) => {
        const [a, b] = pos[i];
        if (cur <= a) return;
        const e = Math.min(b, cur);
        const y = LY[w] - 16;
        S('rect', { x: X0 + a * sc, y, width: (e - a) * sc, height: 32, rx: 4, fill: `var(--${c})` }, svg);
        if (cur >= b) S('text', { x: X0 + (a + b) / 2 * sc, y: y + 21, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: '#fff', text: l }, svg);
        if (i && cur > a) {
          const pa = pos[i - 1][1];
          S('text', { x: X0 + (pa + a) / 2 * sc, y: 214, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted', text: 'SIFS' }, svg);
          S('line', { x1: X0 + pa * sc, y1: 200, x2: X0 + a * sc, y2: 200, stroke: 'var(--muted)' }, svg);
        }
      });
      if (q.nav && cur > pos[0][1]) {
        const a = pos[0][1], b = Math.min(total, cur);
        S('rect', { x: X0 + a * sc, y: LY[2] - 10, width: (b - a) * sc, height: 20, rx: 4, fill: 'var(--muted)', opacity: 0.45 }, svg);
        S('text', { x: X0 + a * sc + 6, y: LY[2] + 4, 'font-size': 11, 'font-weight': 700, text: 'NAV：媒介忙碌，別傳' }, svg);
      }
      S('line', { x1: X0 + Math.min(cur, total) * sc, y1: 40, x2: X0 + Math.min(cur, total) * sc, y2: 196, stroke: 'var(--red)', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, svg);
      S('text', { x: X0, y: 24, 'font-size': 12, cls: 't-muted', text: q.n + '　→ 時間' }, svg);
    }
    const tl = Timeline(fig, { duration: 5, render, format: t => `${t.toFixed(1)} s` });
    makeSeg(fig, Object.keys(Q).map(k => [k, Q[k].n.replace(' – Data – ACK（11g）', '…（11g）').replace('RTS – CTS – Data – ACK', 'RTS/CTS').replace('Data – ACK – Data – ACK', '分段')]), v => { key = v; msg.textContent = Q[v].t; tl.pause(); tl.set(0); tl.play(); });
    fig.querySelector('.seg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === key));
    msg.textContent = Q[key].t;
    tl.set(5);
  })();

  /* ---------- 10. Shared Key 認證 ---------- */
  (function sharedKey() {
    const fig = document.getElementById('fig-sk-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-sk'), 720, 360, 'Shared Key 認證四步驟動畫');
    const L = 110, R = 610;
    const iv = new Uint8Array([0x3C, 0x5A, 0x01]), key = enc.encode('NCHU!');
    const ch = new Uint8Array([0x9F, 0x21, 0x7B, 0xC4, 0x0E, 0x58, 0xD3, 0x66]);
    const ks = rc4(cat(iv, key), ch.length), ct = xor(ch, ks);
    const steps = [
      [L, R, 'accent', '① Authentication：Shared Key，序號 1', '（無 challenge text）'],
      [R, L, 'orange', '② 序號 2：Status ＋ Challenge text（明文）', hex(ch)],
      [L, R, 'accent', '③ 序號 3：WEP 加密的 challenge（WEP = 1，IV ' + hex(iv) + '）', hex(ct)],
      [R, L, 'green', '④ 序號 4：Status = 成功', 'AP 解密比對 challenge 一致 → 認證成功 → State 2'],
    ];
    function render(t) {
      clear(svg);
      const mk = arrowDefs(svg);
      [[L, 'STA'], [R, 'AP']].forEach(([x, l]) => {
        S('rect', { x: x - 50, y: 10, width: 100, height: 32, rx: 7, fill: 'var(--accent-soft)', stroke: 'var(--accent)' }, svg);
        S('text', { x, y: 31, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: l }, svg);
        S('line', { x1: x, y1: 42, x2: x, y2: 262, stroke: 'var(--border)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg);
      });
      steps.forEach(([x1, x2, c, l, s], i) => {
        const t0 = 0.3 + i * 1.6, p = prog(t, t0, t0 + 1);
        if (p <= 0) return;
        const y = 84 + i * 52;
        S('line', { x1, y1: y, x2: lerp(x1, x2, p), y2: y, stroke: `var(--${c})`, 'stroke-width': 2.5, 'marker-end': p > 0.05 ? mk(c) : null }, svg);
        S('text', { x: 360, y: y - 22, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: `var(--${c})`, text: l, opacity: p }, svg);
        S('text', { x: 360, y: y - 7, 'text-anchor': 'middle', 'font-size': 11, cls: 't-mono', text: s, opacity: p }, svg);
      });
      const pe = prog(t, 7, 7.8);
      if (pe > 0) {
        S('rect', { x: 110, y: 276, width: 500, height: 76, rx: 9, fill: 'var(--red-soft)', stroke: 'var(--red)', opacity: pe }, svg);
        S('text', { x: 360, y: 297, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: '竊聽者：② 明文 ⊕ ③ 密文 = 這個 IV 的金鑰序列', opacity: pe }, svg);
        S('text', { x: 360, y: 317, 'text-anchor': 'middle', 'font-size': 11.5, cls: 't-mono', text: `${hex(ch)} ⊕ ${hex(ct)}`, opacity: pe }, svg);
        S('text', { x: 360, y: 338, 'text-anchor': 'middle', 'font-size': 11.5, cls: 't-mono', text: `= ${hex(ks)}（之後可用同一 IV 偽造回應）`, opacity: pe }, svg);
      }
    }
    const tl = Timeline(fig, { duration: 8.5, render, format: t => `${t.toFixed(1)} s` });
    tl.set(8.5);
  })();

  /* ---------- 11. Capability Information ---------- */
  (function capability() {
    const fig = document.getElementById('fig-cap-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-cap'), 720, 120, 'Capability Information 16 bits');
    const out = document.getElementById('cap-out');
    const NAMES = ['ESS', 'IBSS', 'CF Pollable', 'CF-Poll Req', 'Privacy', 'Short Preamble', 'PBCC', 'Channel Agility', '', '', 'Short Slot', '', '', 'DSSS-OFDM', '', ''];
    const SHORT = ['ESS', 'IBSS', 'CF-P', 'CF-PR', 'Priv', 'ShPre', 'PBCC', 'ChAg', '', '', 'ShSlot', '', '', 'D-OFDM', '', ''];
    const STD = { 5: '11b', 6: '11b', 7: '11b', 10: '11g', 13: '11g' };
    const MEAN = {
      0: '屬於 ESS（由 AP 送出）', 1: '屬於 IBSS', 4: 'Privacy：要求使用 WEP 加密', 5: '支援短前導（11b）', 6: '支援 PBCC 編碼（11b）', 7: '支援 Channel Agility 跳頻（11b）', 10: '使用 9 µs 短時槽（11g）', 13: '使用 DSSS-OFDM 新選項（11g）',
    };
    const DEF = { ap: [0, 4, 5, 10], sta: [0, 2, 4, 5, 10], ibss: [1, 5] };
    let role = 'ap', bits = new Array(16).fill(0);
    const setRole = r => { role = r; bits = new Array(16).fill(0); DEF[r].forEach(i => { bits[i] = 1; }); draw(); };
    function draw() {
      clear(svg);
      const cw = 42, x0 = 24;
      bits.forEach((b, i) => {
        const res = !NAMES[i];
        const g = S('g', res ? null : { cls: 'hit' }, svg);
        S('rect', { x: x0 + i * cw, y: 30, width: cw - 3, height: 40, rx: 4, fill: res ? 'var(--surface-2)' : b ? 'var(--accent)' : 'var(--surface)', stroke: 'var(--border)', opacity: res ? 0.6 : 1 }, g);
        S('text', { x: x0 + i * cw + cw / 2 - 1.5, y: 56, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800, fill: b ? '#fff' : res ? 'var(--muted)' : 'var(--fg)', text: res ? '·' : b, cls: 't-mono' }, g);
        S('text', { x: x0 + i * cw + cw / 2 - 1.5, y: 22, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, text: SHORT[i] }, svg);
        S('text', { x: x0 + i * cw + cw / 2 - 1.5, y: 86, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: 'B' + i }, svg);
        if (STD[i]) S('text', { x: x0 + i * cw + cw / 2 - 1.5, y: 102, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--purple)', 'font-weight': 700, text: STD[i] }, svg);
        if (!res) g.addEventListener('click', () => { bits[i] ^= 1; draw(); });
      });
      const v = bits.reduce((a, b, i) => a | b << i, 0);
      const lines = [`Capability = 0x${v.toString(16).toUpperCase().padStart(4, '0')}（B0 為最低位元）`];
      const on = bits.map((b, i) => b && MEAN[i]).filter(Boolean);
      if (on.length) lines.push('・' + on.join('\n・'));
      if (role === 'ap' && !(bits[0] && !bits[1])) lines.push('⚠ AP 在 Beacon／Probe Response 應設 ESS = 1、IBSS = 0。');
      if (role === 'ibss' && !(!bits[0] && bits[1])) lines.push('⚠ IBSS 內的站台在 Beacon／Probe Response 應設 ESS = 0、IBSS = 1。');
      if (role === 'sta') lines.push('（講義的 ESS／IBSS 規則是針對 Beacon 與 Probe Response；這裡重點看 CF 兩個 bit。）');
      const cf = bits[2] * 2 + bits[3];
      const CF = {
        sta: ['STA 不可被輪詢', 'STA 可被輪詢，不要求放入輪詢名單', 'STA 可被輪詢，要求放入輪詢名單', 'STA 可被輪詢，要求永遠不要被輪詢'],
        ap: ['AP 沒有點協調器（PC）', 'AP 的 PC 只做遞送（只有下行）', 'AP 的 PC 做遞送與輪詢（下行＋上行）', '保留'],
      };
      lines.push(`CF-Pollable = ${bits[2]}、CF-Poll Request = ${bits[3]} → ${role === 'ibss' ? '（IBSS 沒有 PC，不使用輪詢）' : CF[role][cf]}`);
      out.textContent = lines.join('\n');
    }
    segButtons(document.getElementById('cap-seg'), setRole);
    setRole('ap');
  })();

  /* ---------- 12. 跳頻頻道組 ---------- */
  (function agility() {
    const fig = document.getElementById('fig-ch-wrap');
    if (!fig) return;
    const svg = svgRoot(document.getElementById('fig-ch'), 720, 200, '2.4 GHz 跳頻頻道組');
    const msg = document.getElementById('ch-msg');
    const SETS = {
      na1: { n: '北美 Set 1', ch: [1, 6, 11], gap: '25 MHz，不重疊' }, na2: { n: '北美 Set 2', ch: [1, 3, 5, 7, 9, 11], gap: '10 MHz，半重疊' },
      eu1: { n: '歐洲 Set 1', ch: [1, 7, 13], gap: '30 MHz，不重疊' }, eu2: { n: '歐洲 Set 2', ch: [1, 3, 5, 7, 9, 11, 13], gap: '10 MHz，半重疊' },
    };
    const JAM = 2437;
    let key = 'na1';
    const f0 = 2400, f1 = 2483.5, x0 = 40, x1 = 690, yb = 140;
    const X = f => x0 + (f - f0) / (f1 - f0) * (x1 - x0);
    function render(t) {
      clear(svg);
      const s = SETS[key], hop = t > 0 ? Math.floor(t / 0.8) % s.ch.length : -1;
      S('line', { x1: x0, y1: yb, x2: x1, y2: yb, stroke: 'var(--muted)', 'stroke-width': 1.2 }, svg);
      [2400, 2483.5].forEach(f => S('text', { x: X(f), y: yb + 36, 'text-anchor': 'middle', 'font-size': 10, cls: 't-muted t-mono', text: f + ' MHz' }, svg));
      S('line', { x1: X(JAM), y1: yb, x2: X(JAM), y2: 30, stroke: 'var(--red)', 'stroke-width': 3 }, svg);
      S('text', { x: X(JAM) + 6, y: 40, 'font-size': 11, 'font-weight': 700, fill: 'var(--red)', text: 'Tone jammer' }, svg);
      s.ch.forEach((n, i) => {
        const fc = 2407 + 5 * n, xl = X(fc - 11), xr = X(fc + 11), xc = X(fc), on = i === hop;
        S('path', { d: `M${xl} ${yb} Q${xc} ${yb - 150} ${xr} ${yb}`, fill: on ? 'var(--orange)' : 'var(--accent)', opacity: on ? 0.5 : 0.13 }, svg);
        S('path', { d: `M${xl} ${yb} Q${xc} ${yb - 150} ${xr} ${yb}`, fill: 'none', stroke: on ? 'var(--orange)' : 'var(--accent)', 'stroke-width': on ? 2.5 : 1.5 }, svg);
        S('text', { x: xc, y: yb - 80, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, text: 'CH ' + n }, svg);
        S('text', { x: xc, y: yb + 18, 'text-anchor': 'middle', 'font-size': 10, cls: 't-mono', text: fc }, svg);
      });
      let t2 = `${s.n}：頻道 ${s.ch.join('、')}，間距 ${s.gap}。`;
      if (hop >= 0) {
        const n = s.ch[hop], fc = 2407 + 5 * n, hit = Math.abs(fc - JAM) < 11;
        t2 += `　第 ${hop + 1} 跳 → CH ${n}（${fc} MHz）${hit ? '：被干擾器打中，但只影響這一跳' : '：避開干擾'}`;
      }
      msg.textContent = t2;
    }
    const tl = Timeline(fig, { duration: 8, render, format: t => `${t.toFixed(1)} s` });
    makeSeg(fig, Object.keys(SETS).map(k => [k, SETS[k].n]), v => { key = v; tl.pause(); tl.set(0); tl.play(); });
  })();

})();
