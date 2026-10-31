#!/usr/bin/env node
/* 把本機的講義英中對照頁 tr-*.html 用 StatiCrypt（AES）加密成 lec-*.html，放上 GitHub Pages。
   用法（在 repo 根目錄、自己的終端機執行，會提示輸入密碼）：
     node tools/build-tr.js      # 先從 tr-src/ 產生明文的 tr-*.html
     node tools/encrypt-tr.js    # 再加密成 lec-*.html，只 commit lec-*.html 與 .staticrypt.json
   密碼不要寫進任何檔案或指令。.staticrypt.json 只存 salt（不是秘密），commit 它讓每次加密的 salt 相同，
   這樣「記住我」在各章之間共用：輸入一次密碼，其他章就會自動解密。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

const inputs = fs.readdirSync(ROOT).filter(f => /^tr-.+\.html$/.test(f));
if (!inputs.length) {
  console.error('找不到 tr-*.html，請先執行 node tools/build-tr.js');
  process.exit(1);
}
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'staticrypt-'));
const args = ['-y', 'staticrypt@3', ...inputs, '-d', out,
  '--remember', '30',
  '--template-title', '講義英中對照（需要密碼）',
  '--template-instructions', '這一頁是個人複習用的講義英中對照，請輸入密碼。',
  '--template-placeholder', '密碼',
  '--template-button', '解鎖',
  '--template-remember', '記住我（30 天）',
  '--template-error', '密碼錯誤',
  '--template-toggle-show', '顯示密碼',
  '--template-toggle-hide', '隱藏密碼',
  '--template-color-primary', '#2563eb',
  '--template-color-secondary', '#f7f7f5'];
// Windows 的 npx 是 .cmd，要經過 shell 執行；參數含空白與括號，所以自己加引號
const win = process.platform === 'win32';
const r = spawnSync('npx', win ? args.map(a => `"${a.replace(/"/g, '\\"')}"`) : args,
  { cwd: ROOT, stdio: 'inherit', shell: win });
const missing = inputs.filter(f => !fs.existsSync(path.join(out, f)));
if (r.status !== 0 || missing.length) {
  fs.rmSync(out, { recursive: true, force: true });
  console.error('加密沒有完成，lec-*.html 沒有更新。');
  process.exit(r.status || 1);
}

for (const f of inputs) {
  const dest = f.replace(/^tr-/, 'lec-');
  fs.copyFileSync(path.join(out, f), path.join(ROOT, dest));
  console.log(`${f} → ${dest}`);
}
fs.rmSync(out, { recursive: true, force: true });
