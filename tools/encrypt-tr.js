#!/usr/bin/env node
/* 把本機的講義英中對照頁 tr-*.html 用 StatiCrypt（AES）加密成 lec-*.html，放上 GitHub Pages。
   用法（在 repo 根目錄執行）：
     node tools/build-tr.js                        # 先從 tr-src/ 產生明文的 tr-*.html
     node tools/encrypt-tr.js --save-password      # 第一次：輸入密碼並存在 ~/.wlan-staticrypt-password，然後加密
     node tools/encrypt-tr.js                      # 之後：自動讀取存好的密碼，加密成 lec-*.html
     node tools/encrypt-tr.js --forget-password    # 刪掉存好的密碼
   密碼檔放在使用者資料夾（repo 外面），避免被 commit；只 commit lec-*.html 與 .staticrypt.json。.staticrypt.json 只存 salt（不是秘密），commit 它讓每次加密的 salt 相同，
   這樣「記住我」在各章之間共用：輸入一次密碼，其他章就會自動解密。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const PW_FILE = path.join(os.homedir(), '.wlan-staticrypt-password');

// 隱藏輸入（不顯示打的字）
function askHidden(prompt) {
  return new Promise(resolve => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(prompt)) rl.output.write(s); };
    rl.question(prompt, a => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}

async function main() {
const flag = process.argv[2];
if (flag === '--forget-password') {
  fs.rmSync(PW_FILE, { force: true });
  console.log(`已刪除 ${PW_FILE}`);
  return;
}
if (flag === '--save-password') {
  const a = await askHidden('密碼：');
  const b = await askHidden('再輸入一次：');
  if (!a || a !== b) { console.error('兩次輸入不一樣，沒有儲存。'); process.exit(1); }
  fs.writeFileSync(PW_FILE, a, { mode: 0o600 });
  console.log(`已存到 ${PW_FILE}`);
}
const env = { ...process.env };
let saved = false;
if (fs.existsSync(PW_FILE)) { env.STATICRYPT_PASSWORD = fs.readFileSync(PW_FILE, 'utf8').trim(); saved = true; }
else console.log('沒有存好的密碼，StatiCrypt 會請你輸入（之後可用 --save-password 存起來）。');

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
// 用存好的密碼時沒有人可以回答「密碼太短要不要繼續」，直接略過這個提問（課程筆記不是機密資料）
if (saved) args.push('--short');
// Windows 的 npx 是 .cmd，要經過 shell 執行；參數含空白與括號，所以自己加引號
const win = process.platform === 'win32';
const r = spawnSync('npx', win ? args.map(a => `"${a.replace(/"/g, '\\"')}"`) : args,
  { cwd: ROOT, stdio: 'inherit', shell: win, env });
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
}

main();
