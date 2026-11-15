// 合併各章名詞字典，給跨章頁面（期中小抄）用：node tools/build-terms-all.js
// 依 CH0 → CH3 順序合併，同一名詞以後面章節的解釋為準。
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'assets', 'js');
const ORDER = ['ch0', 'ch1', 'ch2-1', 'ch2-2', 'ch2-3', 'ch2-4', 'ch2-5', 'ch3'];
const all = {};
for (const tag of ORDER) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(JS, `terms-${tag}.js`), 'utf8'), ctx);
  Object.assign(all, ctx.window.TERMS);
}
const body = Object.entries(all).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
fs.writeFileSync(path.join(JS, 'terms-all.js'),
  `/* 全章名詞字典（由 tools/build-terms-all.js 合併 terms-ch0～ch3.js 產生，不要手改；同名詞以後面章節為準） */\nwindow.TERMS = {\n${body}\n};\n`);
console.log('terms-all.js', Object.keys(all).length);
