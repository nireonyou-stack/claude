// 일괄 편집기 · 배경음악: 플레이리스트 '곡 이름순 정렬' → 저장 시 jukeboxfolder 순서 확인
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1250, height: 800 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>';
    const M = (id, a) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; }, save: function (o) { if (o) Object.assign(a, o); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, create: o => { const m = M('new' + arr.length, o); arr.push(m); return m; }, forEach: f => arr.forEach(f) });
    const tr = [['t1', 'Kokia - Remember The Kiss'], ['t2', 'ASCA - KOE'], ['t3', '바다의 유령'], ['t4', 'Kokia - 10 Years'], ['t5', 'kokia - 2 Days'], ['t6', '🏮 Untold Scandal OST'], ['t7', 'Bill Charlap']]
      .map(([id, title]) => M(id, { title, volume: 30, loop: true, source: 'My Audio', track_id: id, tags: '' }));
    window.Jukebox = { playlist: coll(tr) };
    let folder = JSON.stringify([{ n: '이별, 카타르시스', i: ['t6', 't1', 't3', 't2', 't4', 't5', 't7'], id: 'pl1', s: 's' }]);
    window.Campaign = { get: k => k === 'jukeboxfolder' ? folder : k === 'journalfolder' ? '[]' : null, save: o => { if (o.jukeboxfolder) { folder = o.jukeboxfolder; window.__saved = o.jukeboxfolder; } }, on() {},
      handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForSelector('#r20be'); await p.evaluate(() => [...document.querySelectorAll('#r20be button')].find(b => b.textContent === '배경음악')?.click()); await p.waitForSelector('#r20be'); await p.waitForTimeout(500);
  const tabs = await p.$$eval('#r20be [role=tab], #r20be .r20be-tabs button', bs => bs.map(x => x.textContent.trim()));
  console.log('tabs:', tabs.join(' / '));
  const names = () => p.$$eval('#r20be .r20be-row', rs => rs.map(r => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)));
  console.log('before:', (await names()).join(' | '));
  const pl = await p.$('#r20be .r20be-row:has-text("이별")'); await pl.click(); await p.waitForTimeout(300);
  console.log('buttons:', (await p.$$eval('#r20be .r20be-btns button', bs => bs.map(x => x.textContent))).join(' / '));
  await p.click('#r20be .r20be-btns button:has-text("곡 이름순 정렬")'); await p.waitForTimeout(300);
  console.log('after :', (await names()).join(' | '));
  console.log('badge:', await p.$eval('#r20be .r20be-badge', e => e.hidden ? '(숨김)' : e.textContent).catch(() => '?'));
  await p.screenshot({ path: __dirname + '/sort-after.png' });
  await p.click('#r20be .r20be-btns button:has-text("곡 이름순 정렬")'); await p.waitForTimeout(200);
  console.log('again:', await p.$eval('#r20be .r20be-btns button:nth-child(2)', e => e.textContent));
  const save = await p.$('#r20be button:has-text("저장")'); await save.click(); await p.waitForTimeout(1500);
  console.log('saved:', await p.evaluate(() => window.__saved));
  console.log('errors:', errs);
  await b.close();
})();
