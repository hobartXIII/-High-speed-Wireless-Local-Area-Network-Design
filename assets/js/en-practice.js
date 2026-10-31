/* 英文練習區（en-*.html）的出題與計分。
   每頁在載入本檔之前定義 window.EN_PRACTICE = [{ id, title, intro, passage?, items: [...] }]，
   items 的格式：{ en: 題幹英文, zh: 題幹中文, options: [{ en, zh }], answer: 正確選項索引, why: 中文解析,
   full?: { en, zh } }。克漏字題幹用 ____ 標空格，作答後把正確選項填回去當完整答案；沒有空格的題目要給 full */
(function () {
  const KEYS = 'ABCD';
  const sets = window.EN_PRACTICE || [];
  let total = 0, done = 0, right = 0;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  // 題幹中的 ____ 表示克漏字空格；其餘文字都經過跳脫
  function stem(s) { return esc(s).replace(/_{3,}/g, '<u>　　　　</u>'); }

  function updateScore() {
    const el = document.querySelector('.quiz-bar .score');
    if (el) el.textContent = `已作答 ${done} / ${total}・答對 ${right}`;
  }

  function renderItem(item, no) {
    const box = document.createElement('div');
    box.className = 'q';
    box.innerHTML =
      `<p class="stem"><span class="no">${no}.</span>${stem(item.en)}</p>` +
      `<p class="stem-zh" hidden>${stem(item.zh)}</p>` +
      '<ul class="opts">' + item.options.map((o, i) =>
        `<li><button class="opt" type="button" data-i="${i}"><span class="key">(${KEYS[i]})</span>${esc(o.en)}<span class="zh" hidden>${esc(o.zh)}</span></button></li>`
      ).join('') + '</ul>';

    box.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
      const pick = +btn.dataset.i, ok = pick === item.answer;
      const opts = box.querySelectorAll('.opt');
      opts.forEach((b, i) => {
        b.disabled = true;
        b.querySelector('.zh').hidden = false;
        if (i === item.answer) b.classList.add('right');
        else if (i === pick) b.classList.add('wrong');
      });
      box.querySelector('.stem-zh').hidden = false;
      const a = item.options[item.answer];
      const ans = document.createElement('div');
      ans.className = 'ans';
      ans.innerHTML =
        `<p class="verdict ${ok ? 'ok' : 'ng'}">${ok ? '✓ 答對' : `✗ 答錯（你選 ${KEYS[pick]}）`}・正確答案 (${KEYS[item.answer]})</p>` +
        `<p class="full-en">${item.full ? esc(item.full.en) : stem(item.en.replace(/_{3,}/g, a.en))}</p>` +
        `<p>${item.full ? esc(item.full.zh) : stem(item.zh.replace(/_{3,}/g, a.zh))}</p>` +
        (item.why ? `<p class="why">解析：${esc(item.why)}</p>` : '');
      box.append(ans);
      done++; if (ok) right++;
      updateScore();
    }));
    return box;
  }

  function render() {
    const host = document.getElementById('practice');
    if (!host) return;
    let no = 0;
    sets.forEach(set => {
      const h = document.createElement('h2');
      h.id = set.id;
      h.textContent = set.title;
      host.append(h);
      if (set.intro) {
        const p = document.createElement('p');
        p.textContent = set.intro;
        host.append(p);
      }
      if (set.passage) {
        const ps = document.createElement('div');
        ps.className = 'passage';
        ps.innerHTML = set.passage.map(par => `<p>${esc(par.en)}</p><p class="zh" hidden>${esc(par.zh)}</p>`).join('') +
          '<button class="btn" type="button">顯示中文翻譯</button>';
        const btn = ps.querySelector('button');
        btn.addEventListener('click', () => {
          const zh = ps.querySelectorAll('.zh');
          const show = zh[0].hidden;
          zh.forEach(z => { z.hidden = !show; });
          btn.textContent = show ? '隱藏中文翻譯' : '顯示中文翻譯';
        });
        host.append(ps);
      }
      set.items.forEach(item => host.append(renderItem(item, ++no)));
      total += set.items.length;
    });

    const bar = document.createElement('div');
    bar.className = 'quiz-bar';
    bar.innerHTML = '<span class="score"></span>' +
      '<button class="btn" type="button" data-act="zh">顯示全部中文題目</button>' +
      '<button class="btn" type="button" data-act="reset">↺ 重新作答</button>';
    bar.querySelector('[data-act="zh"]').addEventListener('click', e => {
      const zh = host.querySelectorAll('.stem-zh');
      const show = [...zh].some(z => z.hidden);
      zh.forEach(z => { z.hidden = !show; });
      e.target.textContent = show ? '隱藏全部中文題目' : '顯示全部中文題目';
    });
    bar.querySelector('[data-act="reset"]').addEventListener('click', () => location.reload());
    host.before(bar);
    updateScore();
  }

  document.addEventListener('DOMContentLoaded', render);
})();
