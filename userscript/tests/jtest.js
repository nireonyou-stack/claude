// 일괄 편집기 · 저널: 폴더 '이름순 정렬' (하위 폴더 먼저) → 저장 시 journalfolder 순서 확인
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1250, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>';
    const M = (id, a) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; }, save: function (o) { if (o) Object.assign(a, o); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, create: o => { const m = M('new' + arr.length, o); arr.push(m); return m; }, forEach: f => arr.forEach(f) });
    const H = [['h1', '편지'], ['h2', 'Map 2'], ['h3', 'Map 10'], ['h4', '고서']].map(([id, name]) => M(id, { name, inplayerjournals: '', archived: false }));
    const C = [['c1', '미오'], ['c2', 'Azoibi']].map(([id, name]) => M(id, { name, inplayerjournals: '', archived: false }));
    let jf = JSON.stringify([{ n: '1장', i: ['h1', { n: '지도', i: ['h3', 'h2'], id: 'f2' }, 'c1', 'h4', 'c2'], id: 'f1' }]);
    window.Campaign = { get: k => k === 'journalfolder' ? jf : k === 'jukeboxfolder' ? '[]' : null, save: o => { if (o.journalfolder) { jf = o.journalfolder; window.__saved = jf; } }, on() {},
      handouts: coll(H), characters: coll(C), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForSelector('#r20be'); await p.waitForTimeout(500);
  await p.click('#r20be .r20be-row:has-text("1장")'); await p.waitForTimeout(300);
  console.log('buttons:', (await p.$$eval('#r20be .r20be-btns button', bs => bs.map(x => x.textContent))).join(' / '));
  await p.click('#r20be .r20be-btns button:has-text("이름순 정렬")'); await p.waitForTimeout(300);
  await p.keyboard.press('Control+s'); await p.waitForTimeout(1500);
  console.log('saved:', await p.evaluate(() => window.__saved));
  console.log('errors:', errs); await b.close();
})();
