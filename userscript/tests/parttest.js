// 파트 편집 + ㊙ 비밀 표시
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SVG = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='20'%3E%3Cline x1='0' y1='10' x2='200' y2='10' stroke='%2377717f' stroke-width='2'/%3E%3C/svg%3E";
const ATELIER = `<table style="width:100%;max-width:470px;margin:0 auto;border-collapse:collapse;background:#f8f8fb"><tbody>
<tr data-handout-part="header"><td style="text-align:center;padding:8px 0"><img alt="헤더" src="${SVG}"></td></tr>
<tr><td data-handout-part="title" style="text-align:center;font:800 30px Poppins,sans-serif;color:#3b3a46">Handout</td></tr>
<tr><td data-handout-part="subtitle" style="text-align:center;font-size:18px;color:#3b3a46">테스트</td></tr>
<tr><td data-handout-part="subtitle" style="text-align:center;font-size:15px;color:#9a96a5">테스트2</td></tr>
<tr><td data-handout-part="body" style="padding:12px 18px;text-align:center;font-size:14px;line-height:1.8;color:#333">테스트요<br><b>굵은 말</b></td></tr>
<tr data-handout-part="footer"><td style="text-align:center"><img alt="푸터" src="${SVG}"></td></tr></tbody></table><div style="text-align:center;font-size:10px;color:#888">'쥬나 아틀리에'로 편집한 핸드아웃입니다.</div>`;
const PLAIN = `<table border="1"><tr><th>이름</th><th>역할</th></tr><tr><td>미오</td><td><table><tr><td>마녀</td><td>조력자</td></tr></table></td></tr><tr><td><img src="${SVG}"></td><td>그림 옆</td></tr></table>`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8766' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html'); await p.evaluate(() => localStorage.clear());
  for (const f of ['jquery.min.js', 'bootstrap.min.js', 'summernote.min.js']) await p.addScriptTag({ url: '/sn/' + f });
  for (const f of ['bootstrap.min.css', 'summernote.css']) await p.addStyleTag({ url: '/sn/' + f });
  await p.evaluate(([A, P]) => {
    document.body.insertAdjacentHTML('beforeend', '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>');
    window.__blobs = {};
    const M = (id, a, notes) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; },
      save: function (o) { if (o) Object.assign(a, o); }, _getLatestBlob: (n, cb) => setTimeout(() => cb(n === 'notes' ? notes : ''), 10), updateBlobs: o => { window.__blobs[id] = o; } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, create: o => { const m = M('new' + arr.length, o, ''); arr.push(m); return m; }, forEach: f => arr.forEach(f) });
    const H = [M('h1', { name: 'HO1 · 에브리흐', inplayerjournals: '', archived: false }, A), M('h2', { name: 'HO2 · 표 (㊙️비밀)', inplayerjournals: '', archived: false }, P),
      M('h3', { name: 'HO3 · 그냥 글', inplayerjournals: '', archived: false }, '<p>그냥 글</p>')];
    const jf = JSON.stringify([{ n: 'PC 핸드아웃', i: ['h1', 'h2', 'h3'], id: 'f1' }]);
    window.Campaign = { get: k => k === 'journalfolder' ? jf : k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {}, handouts: coll(H), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.is_gm = true;
  }, [ATELIER, PLAIN]);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForSelector('#r20be.r20be-show');
  const st = () => p.evaluate(() => ({ badge: document.querySelector('#r20be .r20be-badge').hidden ? 0 : document.querySelector('#r20be .r20be-badge').textContent,
    mode: [...document.querySelectorAll('#r20be .r20be-mode button')].map(x => (x.getAttribute('aria-checked') === 'true' ? '[' : '') + x.textContent).join(' ') }));
  await p.click('#r20be .r20be-row:has-text("에브리흐") .r20be-nm'); await p.waitForSelector('#r20be .r20be-stage');
  console.log('h1 open:', await st(), '| parts:', (await p.$$eval('#r20be .r20be-plist button', bs => bs.map(x => x.textContent))).join(' / '));
  // 제목 바꾸기 (칸 안 전체 선택 → 입력)
  await p.click('#r20be .r20be-stage [data-r20be-lb="제목"]'); await p.keyboard.press('Control+a'); await p.keyboard.type('에브리흐 이스키');
  // 부제 1 끝에 Enter + 글자
  await p.click('#r20be .r20be-stage [data-r20be-lb="부제 1"]'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.keyboard.type('둘째 줄');
  // 본문: 여러 줄 글자 붙여넣기
  await p.evaluate(() => navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob(['<h1 style="color:red">큰 제목</h1>'], { type: 'text/html' }), 'text/plain': new Blob(['줄 하나\n줄 둘'], { type: 'text/plain' }) })]));
  await p.click('#r20be .r20be-stage [data-r20be-lb="본문"]'); await p.keyboard.press('Control+a'); await p.keyboard.press('Control+v');
  await p.waitForTimeout(100);
  console.log('after edits:', await st(), '| list:', (await p.$$eval('#r20be .r20be-plist button', bs => bs.map(x => x.textContent))).join(' / '));
  await p.screenshot({ path: __dirname + '/part-h1.png' });
  await p.click('#r20be button:has-text("⤢ 크게")'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/part-wide.png' });
  await p.click('#r20be button:has-text("⤡ 작게")'); await p.waitForTimeout(200);
  // ㊙ 비밀 켜기
  await p.click('#r20be .r20be-secret'); await p.waitForTimeout(150);
  console.log('secret on: name =', await p.$eval('#r20be .r20be-row.sel .r20be-nm span', e => e.textContent), '| btn pressed', await p.$eval('#r20be .r20be-secret', e => e.getAttribute('aria-pressed')));
  await p.keyboard.press('Control+s'); await p.waitForTimeout(1000);
  const html = await p.evaluate(() => unescape(window.__blobs.h1?.notes || ''));
  const chk = await p.evaluate(h => { const d = document.createElement('div'); d.innerHTML = h; const td = n => d.querySelector(`td[data-handout-part="${n}"]`);
    return { tds: d.querySelectorAll('td').length, title: td('title').textContent, titleStyle: td('title').getAttribute('style'), sub: td('subtitle').innerHTML, body: td('body').innerHTML,
      leftovers: /contenteditable|data-r20be/.test(h), imgOk: [...d.querySelectorAll('img')].every(i => i.getAttribute('src').includes("stroke='%2377717f'")), credit: h.includes('쥬나 아틀리에'), h1: !!d.querySelector('h1') }; }, html);
  console.log('saved:', JSON.stringify(chk));
  // 표만 있는 일반 핸드아웃: 칸 이름 · 안쪽 표 칸 · 그림 칸 제외 · 비밀 이름 알아봄
  await p.click('#r20be .r20be-row:has-text("HO2") .r20be-nm'); await p.waitForSelector('#r20be .r20be-stage');
  console.log('h2:', await st(), '| parts:', (await p.$$eval('#r20be .r20be-plist button', bs => bs.map(x => x.textContent))).join(' / '), '| secret btn', await p.$eval('#r20be .r20be-secret', e => e.getAttribute('aria-pressed')));
  await p.click('#r20be .r20be-secret'); await p.waitForTimeout(150);
  console.log('h2 secret off:', await p.$eval('#r20be .r20be-row.sel .r20be-nm span', e => e.textContent));
  // 표 없는 핸드아웃: 파트 없음
  await p.click('#r20be .r20be-row:has-text("HO3") .r20be-nm'); await p.waitForTimeout(300);
  console.log('h3:', await st());
  // 여러 개 → 비밀 넣기
  for (const x of ['HO1', 'HO2', 'HO3']) await p.click(`#r20be .r20be-row:has-text("${x}") .r20be-cb`);
  await p.click('#r20be .r20be-pane button:has-text("고른 것에 넣기")'); await p.waitForTimeout(150);
  console.log('bulk on:', (await p.$$eval('#r20be .r20be-row .r20be-nm span', xs => xs.map(x => x.textContent))).join(' | '));
  console.log('errors:', errs); await b.close();
})();
