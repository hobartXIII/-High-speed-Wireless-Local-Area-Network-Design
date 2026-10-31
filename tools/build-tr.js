#!/usr/bin/env node
/* 產生本機用的講義英中對照頁 tr-*.html（不 commit）。
   用法：node tools/build-tr.js [tr-src/ch1.txt ...]，不給參數就建全部 tr-src/*.txt。

   來源檔格式（一行一列）：
     @file tr-ch1-csma-cd.html      輸出檔名
     @notes ch1-csma-cd.html        圖從哪個筆記頁複製
     @script assets/js/ch1.js       筆記頁的畫圖程式
     @eyebrow / @title / @source / @practice
     # p.6                          開始新的一頁（h2 = 頁碼 + 第一個 t 列的英文）
     t|b|s|ss|g|-  英文 || 中文     標題、條列、子條列、第三層、分組小標、一般列
     z / zb / zs / zt / zg  中文     講義原本就是中文：照原文保留，橫跨兩欄
     fig 圖標題的開頭               插入筆記頁的同名圖（每張圖只用一次）
     note 文字                      灰色小註
   文字可以直接寫 HTML（<sup> 等）；「<」要寫成 &lt;。
   筆記頁沒用到的圖會放進隱藏區塊，讓 chX.js 找得到所有元素。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function figures(notesFile) {
  const lines = fs.readFileSync(path.join(ROOT, notesFile), 'utf8').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*<div class="figure"/.test(lines[i])) continue;
    let depth = 0, j = i;
    for (; j < lines.length; j++) {
      depth += (lines[j].match(/<div\b/g) || []).length - (lines[j].match(/<\/div>/g) || []).length;
      if (depth <= 0) break;
    }
    const html = lines.slice(i, j + 1).join('\n');
    const title = ((html.match(/fig-title">([^<]*)/) || [])[1] || '').trim();
    out.push({ title, html, used: false });
    i = j;
  }
  return out;
}

const KIND = { t: 't', b: 'b', s: 's', ss: 'ss', g: 'g', '-': '' };

function build(srcFile) {
  const meta = {}, pages = [];
  let page = null, figs = null;
  const lines = fs.readFileSync(srcFile, 'utf8').split(/\r?\n/);
  lines.forEach((raw, n) => {
    const line = raw.trimEnd();
    if (!line.trim() || line.startsWith('//')) return;
    const at = `${path.basename(srcFile)}:${n + 1}`;
    let m;
    if ((m = line.match(/^@(\w+)\s+(.*)$/))) { meta[m[1]] = m[2]; return; }
    if ((m = line.match(/^#\s+(.*)$/))) { page = { label: m[1], rows: [], title: '' }; pages.push(page); return; }
    if (!page) throw new Error(`${at}：內容出現在第一個 # 之前`);
    if ((m = line.match(/^fig\s+(.*)$/))) {
      figs = figs || figures(meta.notes);
      const f = figs.find(x => !x.used && x.title.startsWith(m[1].trim()));
      if (!f) throw new Error(`${at}：找不到圖「${m[1]}」`);
      f.used = true;
      page.rows.push(`<div class="r f">\n${f.html}\n</div>`);
      return;
    }
    if ((m = line.match(/^note\s+(.*)$/))) { page.rows.push(`<div class="r n"><p>${m[1]}</p></div>`); return; }
    if ((m = line.match(/^z(t|b|s|ss|g)?\s+(.*)$/))) {
      page.rows.push(`<div class="r z ${m[1] || ''}"><p>${m[2]}</p></div>`);
      if (m[1] === 't' && !page.title) page.title = m[2];
      return;
    }
    if ((m = line.match(/^(t|b|s|ss|g|-)\s+(.*?)\s*\|\|\s*(.*)$/))) {
      page.rows.push(`<div class="r ${KIND[m[1]]}"><p>${m[2]}</p><p>${m[3]}</p></div>`);
      if (m[1] === 't' && !page.title) page.title = m[2];
      return;
    }
    throw new Error(`${at}：看不懂這行：${line}`);
  });
  for (const k of ['file', 'notes', 'script', 'eyebrow', 'title', 'source']) {
    if (!meta[k]) throw new Error(`${srcFile}：缺 @${k}`);
  }
  figs = figs || figures(meta.notes);
  const strip = s => s.replace(/<[^>]+>/g, '');
  const body = pages.map((p, i) => {
    const id = 'p' + (i + 1);
    const h = p.title ? `${p.label}　${strip(p.title)}` : p.label;
    return `  <h2 id="${id}">${h}</h2>\n  <div class="pg">\n    <div class="r hd"><p>英文</p><p>中文</p></div>\n` +
      p.rows.map(r => '    ' + r).join('\n') + '\n  </div>';
  }).join('\n\n');
  const unused = figs.filter(f => !f.used).map(f => f.html).join('\n');

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.eyebrow} 講義英中對照</title>
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/highlighter.css">
<link rel="stylesheet" href="assets/css/en-practice.css?v=4">
<script src="assets/js/highlighter.js"></script>
<script src="assets/js/common.js"></script>
</head>
<body>
<div class="layout">
<main>
  <div class="page-head">
    <div class="eyebrow">${meta.eyebrow}・講義英中對照</div>
    <h1>${meta.title}</h1>
    <div class="meta"><span>來源：${meta.source}</span><span>需要密碼</span></div>
  </div>

  <div class="callout warn">
    <p><b>個人複習用。</b>網站上的版本（<code>lec-*.html</code>）以 StatiCrypt 密碼加密；明文的 <code>tr-*.html</code> 與來源 <code>tr-src/</code> 只在本機，不 commit。</p>
    <p>依 PDF 頁碼，每頁一個區塊：左欄英文、右欄中文，照字面翻譯。講義原本就寫中文的地方照原文保留、橫跨兩欄（標 <span class="zh-tag">中文原文</span>）。講義上的圖改用網頁筆記<a href="${meta.notes}">${meta.notes}</a>重繪的圖。PDF 抽出的文字順序會亂，已依投影片版面排回；若與講義原圖不同，以講義為準。</p>${meta.practice ? `\n    <p>英文練習題：<a href="${meta.practice}">${meta.practice}</a></p>` : ''}${meta.extra ? `\n    <p>${meta.extra}</p>` : ''}
  </div>

${body}
${unused ? `\n  <!-- 沒用到的筆記圖：${meta.script} 需要這些元素，否則會中斷 -->\n  <div hidden aria-hidden="true">\n${unused}\n  </div>` : ''}
</main>
<aside class="toc"></aside>
</div>
<script src="${meta.script}"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, meta.file), html);
  console.log(`${meta.file}：${pages.length} 頁，用了 ${figs.filter(f => f.used).length}／${figs.length} 張圖`);
}

const args = process.argv.slice(2);
const files = args.length ? args : fs.readdirSync(path.join(ROOT, 'tr-src')).filter(f => f.endsWith('.txt')).map(f => path.join(ROOT, 'tr-src', f));
files.forEach(build);
