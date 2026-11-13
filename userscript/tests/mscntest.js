// v1.93 맵 장면: 맵 도구 서랍 → 저장(층 · 플레이어 말 빼기 · 페이지 크기) → 다른 배치로 → 장면 누르기(지우고 다시 만들기 · PC 말 그대로) → 되돌리기 → 카드 메뉴 → 떠날 때 저장
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let answer = null; p.on('dialog', d => (d.type() === 'prompt' ? d.accept(answer ?? '') : d.accept()));
  await p.route(/files\.d20\.io/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:0;width:28px;height:28px"></div>';
    let n = 0; window.__w = [];
    const M = (a, coll) => { const m = { id: a.id || 'n' + (++n), attributes: a, get: k => m.attributes[k], save(o) { if (o) Object.assign(m.attributes, o); }, destroy() { __w.push('x:' + (m.attributes.name || m.id)); coll && coll.rm(m); } }; m.attributes.id = m.id; return m; };
    const coll = (arr, pg) => { const c = { models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f),
      create(o) { const m = M({ ...o }, c); arr.push(m); if (pg) pg.attributes.zorder = (pg.attributes.zorder ? pg.attributes.zorder + ',' : '') + m.id; __w.push('+:' + (o.name || o.layer)); return m; },
      rm(m) { arr.splice(arr.indexOf(m), 1); if (pg) pg.attributes.zorder = pg.attributes.zorder.split(',').filter(x => x !== m.id).join(','); } };
      arr.forEach(m => { m.destroy = () => { __w.push('x:' + (m.attributes.name || m.id)); c.rm(m); }; }); return c; };
    const L = k => `https://files.d20.io/images/${k}/abc/thumb.png?1`;
    const pg = M({ id: 'pg1', name: '폐공장', width: 20, height: 15, snapping_increment: 1, showgrid: true, zorder: '' });
    const G = a => M({ layer: 'objects', controlledby: '', represents: '', width: 70, height: 70, left: 35, top: 35, ...a });
    const gs = [G({ id: 'bgA', name: '입구 맵', layer: 'map', imgsrc: L('A'), width: 1400, height: 1050, left: 700, top: 525 }),
      G({ id: 'pc1', name: '하루카', imgsrc: L('P1'), controlledby: 'p2' }), G({ id: 'pc2', name: '렌', imgsrc: L('P2'), represents: 'c2' }),
      G({ id: 'npc1', name: '경비원', imgsrc: L('N1'), left: 400, top: 200, bar1_value: '7' }), G({ id: 'pan1', name: '패널', imgsrc: L('PN'), controlledby: 'all' }), G({ id: 'gm1', name: 'GM 메모', imgsrc: L('G1'), layer: 'gmlayer' })];
    pg.attributes.zorder = gs.map(g => g.id).join(',');
    pg.thegraphics = coll(gs, pg); pg.thepaths = coll([M({ id: 'w1', layer: 'walls', path: '[]' })], pg); pg.thetexts = coll([], pg);
    const hs = []; const handouts = coll(hs); const hc = handouts.create;
    handouts.create = o => { const h = hc(o); h.blobs = {}; h.updateBlobs = x => { Object.assign(h.blobs, x); h.attributes.gmnotes = 'v' + (++n); }; h._getLatestBlob = (f, cb) => setTimeout(() => cb(h.blobs[f] || ''), 5); return h; };
    window.Campaign = { get: k => k === 'playerpageid' ? 'pg1' : '[]', save() {}, on() {}, handouts, characters: coll([M({ id: 'c2', name: '렌', controlledby: 'p3' })]),
      rollabletables: coll([]), decks: coll([]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const state = () => p.evaluate(() => { const pg = Campaign.activePage(); return pg.thegraphics.models.map(g => `${g.get('name')}${/^n\d/.test(g.id) ? '*' : ''}@${g.get('layer')[0]}`).join(' ') + ` | ${pg.get('width')}×${pg.get('height')}`; });
  const cards = () => p.$$eval('#r20-mscn .card', cs => cs.map(c => (c.classList.contains('now') ? '▶' : '') + c.querySelector('b').textContent + '(' + c.querySelector('small').textContent + ')').join(' / '));
  await p.click('#r20-mapshot .main'); await p.waitForTimeout(250);
  console.log('서랍 단추:', await p.$$eval('#r20-maptray button', bs => bs.map(b => b.className).join(' ')));
  await p.click('#r20-maptray .scn'); await p.waitForTimeout(300);
  console.log('판:', await p.$eval('#r20-mscn', e => e.innerText.replace(/\s+/g, ' ')));
  await p.click('#r20-mscn .add'); await p.waitForTimeout(100);
  console.log('저장 칸:', await p.$eval('#r20-mscn .fm', e => [...e.querySelectorAll('label')].map(l => (l.querySelector('input').checked ? '☑' : '☐') + l.innerText.replace(/\s+/g, ' ').trim()).join(' | ')));
  await p.fill('#r20-mscn .fm .nm', '입구'); await p.click('#r20-mscn .fm [type=submit]'); await p.waitForTimeout(200);
  console.log('저장 뒤 카드:', await cards(), '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent));
  // 지하실 배치로 꾸미기: 맵 바꾸고 · 경비원 지우고 · 좀비 2 · 페이지 30×20
  await p.evaluate(() => { const pg = Campaign.activePage(), L = k => `https://files.d20.io/images/${k}/abc/thumb.png?1`;
    pg.thegraphics.get('bgA').destroy(); pg.thegraphics.get('npc1').destroy();
    pg.thegraphics.create({ name: '지하실 맵', layer: 'map', imgsrc: L('B'), width: 2100, height: 1400, left: 1050, top: 700, controlledby: '' });
    ['좀비 1', '좀비 2'].forEach((nm, i) => pg.thegraphics.create({ name: nm, layer: 'objects', imgsrc: L('Z'), controlledby: '', width: 70, height: 70, left: 300 + i * 70, top: 300 }));
    pg.save({ width: 30, height: 20 }); });
  await p.click('#r20-mscn .add'); await p.fill('#r20-mscn .fm .nm', '지하실'); await p.click('#r20-mscn .fm [type=submit]'); await p.waitForTimeout(200);
  console.log('지하실 저장:', await cards(), '\n  지금 맵:', await state());
  await p.evaluate(() => { __w.length = 0; });
  await p.click('#r20-mscn .card:nth-child(1) .go'); await p.waitForTimeout(300);
  console.log('입구 누름 →', await state(), '| 쓴 것:', await p.evaluate(() => __w.join(' ')));
  console.log('  카드:', await cards(), '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent));
  console.log('  경비원 막대:', await p.evaluate(() => Campaign.activePage().thegraphics.models.find(g => g.get('name') === '경비원')?.get('bar1_value')), '| 벽 그대로:', await p.evaluate(() => Campaign.activePage().thepaths.models.length));
  if (SHOT) await p.screenshot({ path: SHOT + '/mscn.png', clip: await p.$eval('#r20-mscn', e => { const r = e.getBoundingClientRect(); return { x: r.x - 4, y: r.y - 4, width: r.width + 40, height: r.height + 8 }; }) });
  await p.click('#aio-toasts .aio-t:last-child button.a'); await p.waitForTimeout(300);
  console.log('되돌리기 →', await state(), '| 카드:', await cards());
  // 카드 메뉴: 이름 · 복제 · 아래로 · 지우기
  await p.click('#r20-mscn .card:nth-child(2) .more'); await p.waitForTimeout(100);
  console.log('메뉴:', await p.$eval('#r20-mscn .acts', e => e.innerText.replace(/\s+/g, ' ')), '| 펼침:', await p.$eval('#r20-mscn .card:nth-child(2) .more', e => e.getAttribute('aria-expanded')));
  answer = '지하 1층'; await p.click('#r20-mscn .acts [data-a=ren]'); await p.waitForTimeout(100);
  await p.click('#r20-mscn .acts [data-a=dup]'); await p.waitForTimeout(100);
  await p.click('#r20-mscn .acts [data-a=up]'); await p.waitForTimeout(100);
  console.log('이름 · 복제 · 위로 →', await cards());
  await p.click('#r20-mscn .acts [data-a=del]'); await p.waitForTimeout(100);
  console.log('지우기 →', await cards());
  // 떠날 때 저장: 켜고 → 입구로 → 경비원 옮김 → 지하 1층 → 다시 입구 → 옮긴 자리
  await p.check('#r20-mscn .leave');
  await p.click('#r20-mscn .card:nth-child(1) .go'); await p.waitForTimeout(200);
  await p.evaluate(() => Campaign.activePage().thegraphics.models.find(g => g.get('name') === '경비원').save({ left: 999 }));
  await p.click('#r20-mscn .card:nth-child(2) .go'); await p.waitForTimeout(200);
  await p.click('#r20-mscn .card:nth-child(1) .go'); await p.waitForTimeout(200);
  console.log('떠날 때 저장 → 경비원 left:', await p.evaluate(() => Campaign.activePage().thegraphics.models.find(g => g.get('name') === '경비원').get('left')), '| 켜짐 기억:', await p.evaluate(() => localStorage.getItem('r20_mscn_leave')));
  await p.waitForTimeout(300);
  await p.evaluate(() => { window.gunzip = async t => new TextDecoder().decode(await new Response(new Blob([Uint8Array.from(atob(t.slice(4)), c => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); });
  const ho = await p.evaluate(async () => { const h = Campaign.handouts.models.find(m => m.get('name') === '맵 장면'); const raw = h.blobs.gmnotes, json = await gunzip(raw), d = JSON.parse(json);
    return { pl: h.get('inplayerjournals'), list: d.pages.pg1.list.map(s => s.name + ':' + s.objs.length + ':' + s.layers.join('+')), 머리: raw.slice(0, 4), 크기: `예전 방식 ${escape(json).length} → 지금 ${raw.length}자`,
      지금표시: JSON.parse(localStorage.getItem('r20_mscn_cur') || '{}').pg1 === d.pages.pg1.list[0].id, notes: unescape(h.blobs.notes).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') }; });
  console.log('핸드아웃:', JSON.stringify(ho));
  // 장면만 바꿀 땐(떠날 때 저장 끔) 핸드아웃에 쓰지 않는다
  await p.uncheck('#r20-mscn .leave');
  const v0 = await p.evaluate(() => Campaign.handouts.models.find(m => m.get('name') === '맵 장면').get('gmnotes'));
  await p.click('#r20-mscn .card:nth-child(2) .go'); await p.waitForTimeout(300);
  console.log('장면만 바꿈 → 핸드아웃 다시 씀:', await p.evaluate(v => Campaign.handouts.models.find(m => m.get('name') === '맵 장면').get('gmnotes') !== v, v0), '| 카드:', await cards());
  // 예전 판(escape) 글도 읽고, 한 번 줄여 다시 저장
  await p.evaluate(async () => { const h = Campaign.handouts.models.find(m => m.get('name') === '맵 장면'); const json = await gunzip(h.blobs.gmnotes); h.updateBlobs({ gmnotes: escape(json) }); });
  await p.click('#r20-mscn .x'); await p.click('#r20-mapshot .main').catch(() => {}); await p.waitForTimeout(200);
  if (!(await p.$eval('#r20-mapshot', e => e.classList.contains('open')))) { await p.click('#r20-mapshot .main'); await p.waitForTimeout(200); }
  await p.click('#r20-maptray .scn'); await p.waitForTimeout(500);
  console.log('예전 글 읽기:', await cards(), '| 다시 저장한 머리:', await p.evaluate(() => Campaign.handouts.models.find(m => m.get('name') === '맵 장면').blobs.gmnotes.slice(0, 4)));
  // 많은 토큰: 120개 장면도 나눠서 놓는다
  await p.evaluate(() => { const pg = Campaign.activePage(); for (let i = 0; i < 120; i++) pg.thegraphics.create({ name: 'm' + i, layer: 'objects', imgsrc: 'https://files.d20.io/images/9/a/thumb.png?1', controlledby: '', width: 70, height: 70, left: i * 10, top: 10 }); });
  await p.click('#r20-mscn .add'); await p.fill('#r20-mscn .fm .nm', '많은 토큰'); await p.click('#r20-mscn .fm [type=submit]'); await p.waitForTimeout(300);
  await p.click('#r20-mscn .card:nth-child(1) .go'); await p.waitForTimeout(600);
  const t0 = Date.now(); await p.click('#r20-mscn .card:nth-child(3) .go');
  await p.waitForFunction(() => /장면으로 바꿨어요/.test(document.querySelector('#aio-toasts .aio-t:last-child .m')?.textContent || ''), null, { timeout: 15000 });
  console.log('120개 장면 →', await p.evaluate(() => Campaign.activePage().thegraphics.models.filter(g => /^m\d/.test(g.get('name'))).length), '개 놓임 ·', Date.now() - t0 < 5000 ? '5초 안' : '느림', '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent));
  console.log('errors:', errs); await b.close();
})();
