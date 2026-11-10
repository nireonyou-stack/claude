// 폴더 안 보기: 카드 끌어서 하위 폴더로 → 저장 구조 / 하위 폴더 만들기 / 곡 목록 끌어서 순서 · 미리듣기 · 누르면 편집
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1250, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html'); await p.evaluate(() => localStorage.clear());
  await p.evaluate(() => {
    document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>';
    const M = (id, a) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; }, save: function (o) { if (o) Object.assign(a, o); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, create: o => { const m = M('new' + arr.length, o); arr.push(m); return m; }, forEach: f => arr.forEach(f) });
    const H = [['h1', 'HO1 · 기사단장'], ['h2', 'HO2 · 마녀의 편지'], ['h3', 'HO3 · 도망친 시종'], ['h4', '성문 지도']].map(([id, name]) => M(id, { name, inplayerjournals: '', archived: false }));
    const C = [['c1', '성문지기'], ['c2', '미오']].map(([id, name]) => M(id, { name, inplayerjournals: 'all', archived: false }));
    let jf = JSON.stringify([{ n: '1장 · 성문', i: ['h1', 'h2', 'h3', { n: 'NPC', i: ['c1', 'c2'], id: 'f2' }, { n: '지도', i: ['h4'], id: 'f3' }], id: 'f1' }]);
    const tr = [['t1', 'Kokia - Remember The Kiss'], ['t2', 'ASCA - KOE'], ['t3', '바다의 유령']].map(([id, title]) => M(id, { title, volume: 30, loop: true, source: 'My Audio', track_id: id, tags: '회상 잔잔' }));
    let jb = JSON.stringify([{ n: '이별', i: ['t1', 't2', 't3'], id: 'pl1', s: 's' }]);
    window.Jukebox = { playlist: coll(tr) };
    window.Campaign = { get: k => k === 'journalfolder' ? jf : k === 'jukeboxfolder' ? jb : null,
      save: o => { if (o.journalfolder) { jf = o.journalfolder; window.__jf = jf; } if (o.jukeboxfolder) { jb = o.jukeboxfolder; window.__jb = jb; } }, on() {},
      handouts: coll(H), characters: coll(C), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForSelector('#r20be.r20be-show'); await p.waitForTimeout(300);
  await p.click('#r20be .r20be-tree .r20be-row:has-text("1장 · 성문") .r20be-nm'); await p.waitForTimeout(300);
  const secs = () => p.$$eval('#r20be .r20be-fsec', ss => ss.map(s => s.querySelector('header b').textContent + '[' + [...s.querySelectorAll('.r20be-tn')].map(x => x.textContent).join(',') + ']').join(' '));
  console.log('sections:', await secs());
  console.log('head:', (await p.$$eval('#r20be .r20be-ph button', bs => bs.map(x => x.textContent))).join(' / '));
  await p.screenshot({ path: __dirname + '/fv-journal.png' });
  // 카드 HO2 → NPC 묶음으로 끌기
  await p.dragAndDrop('#r20be .r20be-fv .r20be-tile:has-text("HO2") .r20be-tl', '#r20be .r20be-fsec:has(header b:text-is("NPC")) header');
  await p.waitForTimeout(300);
  console.log('after drag:', await secs(), '| status:', await p.$eval('#r20be .r20be-foot', e => e.textContent));
  // 카드 누르면 편집
  await p.click('#r20be .r20be-fv .r20be-tile:has-text("미오") .r20be-tl'); await p.waitForTimeout(300);
  console.log('picked:', await p.$eval('#r20be .r20be-ph strong', e => e.textContent), await p.$eval('#r20be .r20be-tree .r20be-row.sel', e => e.textContent.trim()));
  // 하위 폴더 만들기
  await p.click('#r20be .r20be-tree .r20be-row:has-text("1장 · 성문") .r20be-nm'); await p.waitForTimeout(200);
  await p.click('#r20be .r20be-ph button:has-text("하위 폴더")'); await p.waitForTimeout(300);
  await p.keyboard.type('회상 장면'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  await p.keyboard.press('Control+s'); await p.waitForTimeout(1200);
  console.log('saved jf:', await p.evaluate(() => window.__jf));
  // 주크박스
  await p.click('#r20be .r20be-seg button:has-text("배경음악")'); await p.waitForTimeout(400);
  await p.click('#r20be .r20be-tree .r20be-row:has-text("이별") .r20be-nm'); await p.waitForTimeout(300);
  const rows = () => p.$$eval('#r20be .r20be-tkrow[data-id] .r20be-tkn', xs => xs.map(x => x.textContent).join(' | '));
  console.log('tracks:', await rows(), '| play btns:', await p.$$eval('#r20be .r20be-tplay', bs => bs.length));
  await p.screenshot({ path: __dirname + '/fv-bgm.png' });
  await p.dragAndDrop('#r20be .r20be-tkrow:has-text("바다의 유령") .r20be-tkn', '#r20be .r20be-tkrow:has-text("Kokia") .r20be-tkn');
  await p.waitForTimeout(300);
  console.log('after reorder:', await rows());
  await p.keyboard.press('Control+s'); await p.waitForTimeout(1200);
  console.log('saved jb:', await p.evaluate(() => window.__jb));
  await p.click('#r20be .r20be-tkrow:has-text("ASCA") .r20be-tkn'); await p.waitForTimeout(300);
  console.log('picked track pane:', await p.$eval('#r20be .r20be-ph strong', e => e.textContent));
  console.log('errors:', errs); await b.close();
})();
