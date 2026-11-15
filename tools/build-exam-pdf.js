// 產生考古題與練習題的 PDF（只有英文題目、中文翻譯、作答重點、中文詳答、講義出處；不放英文 Model answer）
// 用法：node tools/build-exam-pdf.js   → pdf/past-exam.pdf、pdf/midterm-practice.pdf
// 題目資料直接從 past-exam.html 的 P、midterm-practice.html 的 Q 讀，改了題目就重跑。
// 需要本機的 Chrome（預設路徑見 CHROME，或設環境變數 CHROME）。
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'pdf');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function readData(file, name, endMark) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const i = s.indexOf(`const ${name} = `), j = s.indexOf(endMark, i) + endMark.length;
  const SRC = (x) => x; // 資料裡不會呼叫，保險起見
  return new Function('SRC', `return ${s.slice(i + `const ${name} = `.length, j - 1)};`)(SRC);
}
const P = readData('past-exam.html', 'P', '\n];');
const Q = readData('midterm-practice.html', 'Q', ']};');
const tipC = (() => {
  const s = fs.readFileSync(path.join(ROOT, 'midterm-practice.html'), 'utf8');
  const m = s.match(/<h2 id="part-c">[^<]*<\/h2>\s*(<div class="callout tip">[\s\S]*?<\/div>)/);
  return m ? m[1] : '';
})();

const CSS = `
@page { size: A4; margin: 14mm 13mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif; font-size: 10pt; line-height: 1.6; color: #1d2433; margin: 0; }
h1 { font-size: 16pt; margin: 0 0 2mm; }
.meta { color: #5b6475; font-size: 8.5pt; margin-bottom: 4mm; }
h2 { font-size: 12.5pt; margin: 6mm 0 2mm; padding-bottom: 1mm; border-bottom: 1.5px solid #2b5fd9; color: #2b5fd9; break-after: avoid; }
.mq { border: 1px solid #d6dbe4; border-radius: 6px; padding: 3mm 4mm; margin: 0 0 4mm; }
.mq-head { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; margin-bottom: 1.5mm; break-after: avoid; }
.mq-id { font-weight: 700; font-size: 11.5pt; }
.mq-pts { color: #5b6475; }
.chip { font-size: 7.5pt; padding: 0 6px; border-radius: 999px; background: #eef1f6; color: #5b6475; }
.q-en { font-weight: 600; break-after: avoid; }
.q-zh { color: #3d4657; margin: 1mm 0 2mm; break-after: avoid; }
.q-en p, .q-zh p { margin: .3em 0; }
.lbl { font-size: 8pt; font-weight: 700; color: #5b6475; letter-spacing: .04em; margin: 2.5mm 0 .5mm; break-after: avoid; }
.key { border-left: 3px solid #2b5fd9; padding: 0 3mm; color: #3d4657; }
.ans p { margin: .35em 0; }
.ans ul, .ans ol, .q-en ol, .q-zh ol { margin: .3em 0; padding-left: 1.4em; }
table { border-collapse: collapse; margin: 1.5mm 0; font-size: 9pt; break-inside: avoid; }
th, td { border: 1px solid #c9d0db; padding: 1mm 2mm; vertical-align: top; text-align: left; }
th { background: #eef1f6; }
.src { font-size: 8.5pt; color: #5b6475; margin-top: 2mm; }
.sup { font-size: .72em; font-weight: 600; color: #7a3fc4; background: #f1e9fb; border-radius: 3px; padding: 0 .35em; }
.callout { border: 1px solid #f0d9b5; background: #fff8ec; border-radius: 6px; padding: 2mm 3mm; font-size: 9pt; margin: 0 0 3mm; }
a { color: inherit; text-decoration: none; }
sup, sub { line-height: 0; }
`;

const chip = ([, t]) => `<span class="chip">${t}</span>`;
const card = (q) => `
<section class="mq">
  <div class="mq-head"><span class="mq-id">${q.id}</span><span class="mq-pts">(${q.pts})</span>${(q.chips || []).map(chip).join('')}</div>
  <div class="q-en" lang="en">${q.en}</div>
  <div class="q-zh">${q.zh}</div>
  <div class="lbl">作答重點</div><div class="ans key">${q.az}</div>
  <div class="lbl">中文詳答</div><div class="ans">${q.zd}</div>
  <div class="src">📖 出處：${q.src}</div>
</section>`;
const page = (title, meta, body) => `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head>
<body><h1>${title}</h1><div class="meta">${meta}</div>${body}</body></html>`;

const today = new Date().toISOString().slice(0, 10);
const NOTE = '參考答案不是老師提供的，是依講義整理的；講義上沒有的內容標 <span class="sup">補充</span>。';
const docs = {
  'past-exam': page('期中考古題（114-1）', `高速無線區域網路設計｜9 題｜英文題目、中文翻譯、作答重點、中文詳答、講義出處｜${NOTE}｜產生日期 ${today}`,
    P.map(card).join('')),
  'midterm-practice': page('期中練習題', `高速無線區域網路設計｜${Q.qa.length + Q.qb.length + Q.qc.length} 題（自編練習題，非老師題目）｜英文題目、中文翻譯、作答重點、中文詳答、講義出處｜${NOTE}｜產生日期 ${today}`,
    `<h2>A. 跨章觀念與比較</h2>${Q.qa.map(card).join('')}<h2>B. 機制與設計</h2>${Q.qb.map(card).join('')}<h2>C. 計算題</h2>${tipC}${Q.qc.map(card).join('')}`),
};

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-pdf-'));
for (const [name, html] of Object.entries(docs)) {
  const src = path.join(tmp, name + '.html'), dst = path.join(OUT, name + '.pdf');
  fs.writeFileSync(src, html);
  if (process.env.KEEP_HTML) fs.copyFileSync(src, path.join(process.env.KEEP_HTML, name + '.html')); // 除錯用：保留中間 HTML
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${path.join(tmp, 'chr')}`,
    `--print-to-pdf=${dst}`, 'file:///' + src.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log(path.relative(ROOT, dst), fs.statSync(dst).size, 'bytes');
}
fs.rmSync(tmp, { recursive: true, force: true });
