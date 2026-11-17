// 從各章 HTML 的 <h2 id="..."> 讀出小節編號與標題，寫進 assets/js/exam-refs.js 的 SECS 區塊。
// 用法：node tools/build-exam-refs.js（章節小節增刪或重新編號後重跑）
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CH = {
  'ch0-lan': 'CH0', 'ch1-csma-cd': 'CH1', 'ch2-1-80211-phy': 'CH2-1', 'ch2-2-80211-mac': 'CH2-2',
  'ch2-3-80211-frame': 'CH2-3', 'ch2-4-80211-dcf': 'CH2-4', 'ch2-5-80211-pcf-mgmt': 'CH2-5',
  'ch3-80211e-qos': 'CH3', 'ch4-random-access': 'CH4',
};
const secs = {};
for (const [file, label] of Object.entries(CH)) {
  const s = fs.readFileSync(path.join(ROOT, file + '.html'), 'utf8');
  const ids = {};
  for (const m of s.matchAll(/<h2 id="([^"]+)">\s*(\d+)\.\s*([^<]*)/g)) ids[m[1]] = [+m[2], m[3].trim()];
  secs[file] = { label, ids };
}
const target = path.join(ROOT, 'assets/js/exam-refs.js');
const js = fs.readFileSync(target, 'utf8');
const begin = '/* SECS:BEGIN */', end = '/* SECS:END */';
const out = js.slice(0, js.indexOf(begin) + begin.length) + '\n  const SECS = ' + JSON.stringify(secs) + ';\n  ' + js.slice(js.indexOf(end));
fs.writeFileSync(target, out);
console.log('updated', path.relative(ROOT, target));
