// 일괄 편집기 서식 편집: Summernote 0.8.9 로 열기 · 손대지 않으면 그대로 · 붙여넣기(서식째) · 저장 · 방식 바꾸기 · 이전/다음 · 크게
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const OUT = __dirname + '/note-';
const ATELIER_HTML = `<table data-handout-part="frame" style="width:100%;max-width:520px;margin:0 auto;border-collapse:collapse;font-family:'Noto Serif KR',serif">
<tbody><tr><td style="text-align:center"><img alt="헤더" src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='20'%3E%3Cline x1='0' y1='10' x2='200' y2='10' stroke='%2377717f' stroke-width='2'/%3E%3C/svg%3E"></td></tr><tr><td data-handout-part="head" style="height:86px;background:linear-gradient(135deg,#3a1f2e,#8a3b5e);color:#fff;text-align:center;font-size:22px;letter-spacing:4px">마녀의 편지</td></tr>
<tr><td data-handout-part="sub" style="padding:8px 0;text-align:center;color:#8a3b5e;font-size:13px;border-bottom:1px solid #e3c2d2">HO2 · 사명</td></tr>
<tr><td data-handout-part="body" style="padding:16px 18px;font-size:14px;line-height:1.8;color:#333;background:#fdf8fa">당신은 숲의 마녀에게서 편지를 받았다.<br><br><b>사명:</b> 편지의 주인을 찾을 것.</td></tr></tbody></table>`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8766' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { console.log('dialog:', d.message().slice(0, 50)); d.accept(); });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => localStorage.clear());
  for (const f of ['jquery.min.js', 'bootstrap.min.js', 'summernote.min.js']) await p.addScriptTag({ url: '/sn/' + f });
  for (const f of ['bootstrap.min.css', 'summernote.css']) await p.addStyleTag({ url: '/sn/' + f });
  await p.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>');
    window.__blobs = {};
    const M = (id, a, notes) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; },
      save: function (o) { if (o) Object.assign(a, o); }, _getLatestBlob: (n, cb) => setTimeout(() => cb(n === 'notes' ? notes : ''), 10),
      updateBlobs: o => { window.__blobs[id] = o; } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, create: o => { const m = M('new' + arr.length, o, ''); arr.push(m); return m; }, forEach: f => arr.forEach(f) });
    const H = [M('h1', { name: 'HO1 · 기사단장', inplayerjournals: '', archived: false }, '<p>성문을 지켜라.</p>'),
      M('h2', { name: 'HO2 · 마녀의 편지', inplayerjournals: '', archived: false }, '<p><b>굵은 글</b> 과 <span style="color:#e10085">색 글자</span></p><ul><li>하나</li><li>둘</li></ul>'),
      M('h3', { name: 'HO3 · 도망친 시종', inplayerjournals: '', archived: false }, Array.from({ length: 60 }, (_, i) => `<p>${i + 1}번째 줄</p>`).join(''))];
    const jf = JSON.stringify([{ n: '1장 · 성문', i: ['h1', 'h2', 'h3'], id: 'f1' }]);
    window.Campaign = { get: k => k === 'journalfolder' ? jf : k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {},
      handouts: coll(H), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForSelector('#r20be.r20be-show');
  await p.click('#r20be .r20be-row:has-text("마녀")'); await p.waitForSelector('#r20be .note-editable', { timeout: 5000 });
  const st = () => p.evaluate(() => ({ badge: document.querySelector('#r20be .r20be-badge').hidden ? 0 : document.querySelector('#r20be .r20be-badge').textContent,
    mode: [...document.querySelectorAll('#r20be .r20be-mode button')].map(x => (x.getAttribute('aria-checked') === 'true' ? '[' : '') + x.textContent).join(' ') }));
  console.log('opened:', await st(), '| editable:', (await p.$eval('#r20be .note-editable', e => e.innerHTML)).slice(0, 80));
  console.log('tooltip titles:', await p.$$eval('#r20be .note-toolbar button[title]', bs => bs.length), '| head:', (await p.$$eval('#r20be .r20be-ph > *', xs => xs.map(x => x.textContent.trim()).filter(Boolean))).join(' / '));
  await p.screenshot({ path: OUT + 'open.png' });
  // 손대지 않고 다른 항목 → 돌아와도 변경 없음
  await p.click('#r20be .r20be-row:has-text("기사단장")'); await p.waitForTimeout(300);
  await p.click('#r20be .r20be-row:has-text("마녀")'); await p.waitForTimeout(300);
  console.log('untouched:', await st());
  // 진짜 붙여넣기 (클립보드 text/html)
  await p.evaluate(h => navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([h], { type: 'text/html' }), 'text/plain': new Blob(['마녀의 편지'], { type: 'text/plain' }) })]), ATELIER_HTML);
  await p.click('#r20be .note-editable'); await p.keyboard.press('Control+End'); await p.keyboard.press('Enter');
  await p.keyboard.press('Control+V'); await p.waitForTimeout(50);
  // 0.1초 알림 전에 바로 저장 (flush 확인)
  await p.keyboard.press('Control+s'); await p.waitForTimeout(800);
  const saved = await p.evaluate(() => window.__blobs.h2?.notes || ''); const shown = unescape(saved);
  console.log('saved escaped:', !/[<>]/.test(saved), '| roundtrip img ok:', /stroke='%2377717f'/.test(unescape(saved)));
  console.log('saved has table:', /<table/.test(shown), '| data-handout-part:', /data-handout-part/.test(shown), '| gradient:', /linear-gradient/.test(shown), '| len', saved.length);
  console.log('after save:', await st());
  await p.screenshot({ path: OUT + 'pasted.png' });
  // 글자로 바꾸기 (손대지 않은 상태 → 확인 없이)
  await p.click('#r20be .r20be-mode button:has-text("글자")'); await p.waitForTimeout(200);
  console.log('text mode:', await st(), '| textarea:', (await p.$eval('#r20be .r20be-ta', e => e.value)).slice(0, 40).replace(/\n/g, '⏎'));
  await p.click('#r20be .r20be-mode button:has-text("서식")'); await p.waitForTimeout(300);
  // 다음 ▶ (Alt+↓) · 크게
  await p.click('#r20be .note-editable'); await p.keyboard.press('Alt+ArrowDown'); await p.waitForTimeout(300);
  console.log('alt+down →', await p.$eval('#r20be .r20be-row.sel', e => e.textContent.trim()), await st());
  await p.waitForTimeout(300);
  console.log('sticky:', await p.evaluate(() => { const pane = document.querySelector('#r20be .r20be-pane'); pane.scrollTop = 500;
    const tb = document.querySelector('#r20be .note-toolbar').getBoundingClientRect(), pr = pane.getBoundingClientRect(); const anc = []; for (let e = document.querySelector('#r20be .note-toolbar'); e && e !== pane; e = e.parentElement) { const c = getComputedStyle(e); anc.push(e.className.split(' ').slice(0,2).join('.') + ':' + c.position + '/' + c.display + '/' + Math.round(e.getBoundingClientRect().height)); } return anc.join(', ') + ` | pane top ${Math.round(pr.top)} · toolbar top ${Math.round(tb.top)} · scrolled ${pane.scrollTop}`; }));
  await p.click('#r20be button:has-text("⤢ 크게")'); await p.waitForTimeout(200);
  console.log('wide: tree hidden', await p.$eval('#r20be .r20be-col.tree', e => getComputedStyle(e).display));
  await p.click('#r20be button:has-text("◀ 이전")'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'wide.png' });
  // 150% + 드롭다운
  await p.evaluate(() => { localStorage.setItem('r20_aio_zoom', '1.5'); document.documentElement.style.setProperty('--aio-z', 1.5); });
  await p.click('#r20be .note-toolbar .note-color .dropdown-toggle'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + 'zoom-color.png' });
  console.log('errors:', errs); await b.close();
})();
