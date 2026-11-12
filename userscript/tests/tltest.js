// v1.95 굴림표 → 토큰 연결: 굴림표 탭 [🎯 토큰에 연결] → 공용 캐릭터 '🎲 굴림표' + 토큰 액션 둘(/roll · /gmroll 1t[@{selected|bar3}])
// 토큰마다 연결 · 막대 3 = 표 이름 · 플레이어도(조종 all) · 왼쪽 배지 · 풀기 · 되돌리기 · 두 번째는 능력을 다시 만들지 않음 · 띄어쓰기 경고 · 다른 캐릭터 말은 못 바꿈
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route(/files\.d20\.io/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#a83"/></svg>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    let n = 0; window.__w = [];
    const M = (a, coll) => { const m = { id: a.id || 'n' + (++n), cid: 'c' + (a.id || n), attributes: a, get: k => m.attributes[k], set() {}, save(o) { if (o) { Object.assign(m.attributes, o); __w.push((m.attributes.name || m.id) + ':' + Object.keys(o).join(',')); } }, on() {}, off() {}, _getLatestBlob(f, cb) { cb(''); }, toJSON: () => ({ ...m.attributes }) }; m.attributes.id = m.id; return m; };
    const coll = arr => { const c = { models: arr, length: arr.length, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f),
      create(o) { const m = M({ ...o }); arr.push(m); __w.push('+' + (o.name || '?')); if ('controlledby' in o && !m.abilities) { m.abilities = coll([]); m.abilities.fetch = () => __w.push('fetch'); } return m; } }; return c; };
    const L = k => `https://files.d20.io/images/${k}/abc/thumb.png?1`;
    const items = [M({ name: '찢어진 일기장', weight: 1, avatar: L(1) }), M({ name: '피 묻은 열쇠', weight: 1, avatar: L(2) })];
    const t1 = M({ id: 't1', name: '단서표' }); t1.tableitems = coll(items);
    const t2 = M({ id: 't2', name: '보물 상자' }); t2.tableitems = coll([M({ name: '금화', weight: 1, avatar: '' })]);
    const G = a => M({ layer: 'objects', represents: '', imgsrc: L('T'), width: 70, height: 70, ...a });
    const pg = M({ id: 'pg1', name: '폐공장' });
    pg.thegraphics = coll([G({ id: 'g1', name: '수상한 상자' }), G({ id: 'g2', name: '책상 서랍', bar3_value: '5' }), G({ id: 'g3', name: '하루카', represents: 'c1' }), G({ id: 'g4', name: '바닥 맵', layer: 'map' })]);
    const chars = coll([M({ id: 'c1', name: '하루카', controlledby: 'p2' })]);
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: chars, rollabletables: coll([t1, t2]), decks: coll([]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([M({ id: 'm1', name: '장면1', action: '/desc 장면 1이 시작된다', visibleto: '', istokenaction: false })]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.evaluate(() => [...document.querySelectorAll('#r20be .r20be-seg button')].find(b => b.textContent.trim() === '굴림표')?.click()); await p.waitForTimeout(200);
  await p.click('#r20be .r20be-row[data-id="t1"] [data-act="pick"]').catch(() => p.click('#r20be .r20be-row[data-id="t1"]')); await p.waitForTimeout(200);
  const tlBtn = '#r20be .r20be-ph button:has-text("토큰에 연결")';
  await p.click(tlBtn); await p.waitForTimeout(150);
  const rows = () => p.$$eval('#r20be .r20be-tlink .row', rs => rs.map(r => (r.querySelector('input').checked ? '☑' : r.querySelector('input').disabled ? '⊘' : '☐') + r.querySelector('span').textContent + '(' + r.querySelector('small').textContent + ')').join(' | '));
  console.log('칸:', await p.$eval('#r20be .r20be-tlink', e => e.querySelector('.hd').innerText.trim() + ' · ' + e.querySelector('p').textContent.slice(0, 40) + '…'));
  console.log('토큰:', await rows(), '| 플레이어:', await p.$eval('#r20be .r20be-tlink .pl input', e => e.checked));
  await p.check('#r20be .r20be-tlink .row:nth-child(1) input'); await p.check('#r20be .r20be-tlink .row:nth-child(2) input');
  console.log('합계:', await p.$eval('#r20be .r20be-tlink .ft .r20be-note', e => e.textContent));
  if (SHOT) await p.screenshot({ path: SHOT + '/tl.png', clip: await p.$eval('#r20be', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 560) }; }) });
  await p.click('#r20be .r20be-tlink .ft .pri'); await p.waitForTimeout(900);
  const st = () => p.evaluate(() => { const c = Campaign.characters.models.find(m => m.get('name') === '🎲 굴림표');
    return { char: c ? `${c.get('name')} 조종=${c.get('controlledby')} 저널=${JSON.stringify(c.get('inplayerjournals'))} 능력=` + c.abilities.models.map(a => `${a.get('name')}[${a.get('istokenaction') ? '토큰' : ''}]${a.get('action')}`).join(' ; ') : '(없음)',
      toks: Campaign.activePage().thegraphics.models.map(g => `${g.get('name')}→${g.get('represents') === c?.id ? '굴림표' : g.get('represents') || '-'}/${g.get('bar3_value') ?? ''}${g.get('showplayers_bar3') === false ? '(숨김)' : ''}`).join(' | ') }; });
  console.log('연결 →', JSON.stringify(await st(), null, 0));
  console.log('왼쪽 배지:', await p.$$eval('#r20be .r20be-row', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').trim()).join(' / ')), '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent));
  // 다시 열기: 이 표 ✓ · 서랍은 풀기 · 플레이어 끔
  await p.click(tlBtn); await p.waitForTimeout(150);
  console.log('다시 열면:', await rows());
  await p.uncheck('#r20be .r20be-tlink .row:nth-child(2) input'); await p.uncheck('#r20be .r20be-tlink .pl input');
  await p.evaluate(() => { __w.length = 0; });
  await p.click('#r20be .r20be-tlink .ft .pri'); await p.waitForTimeout(900);
  console.log('풀기 · 플레이어 끔 →', JSON.stringify(await st()), '| 쓴 것:', await p.evaluate(() => __w.join(' ')));
  await p.click('#aio-toasts .aio-t:last-child button.a'); await p.waitForTimeout(200);
  console.log('되돌리기 →', (await st()).toks, '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent));
  // 띄어쓰기 있는 표
  await p.click('#r20be .r20be-row[data-id="t2"] [data-act="pick"]').catch(() => p.click('#r20be .r20be-row[data-id="t2"]')); await p.waitForTimeout(200);
  await p.click(tlBtn); await p.waitForTimeout(150);
  console.log('보물 상자 경고:', await p.$eval('#r20be .r20be-tlink p.warn', e => e.textContent).catch(() => '(없음)'));
  // 매크로: 매크로 탭 → 🎯 → 부르기(#)로 서랍 토큰(굴림표에 연결돼 있던 것)을 바꿔 연결 → 복사로 바꾸면 '내용이 달라요' → [연결]로 맞춤
  await p.click('#r20be .r20be-tl-x, #r20be .r20be-tlink .x').catch(() => {});
  await p.evaluate(() => [...document.querySelectorAll('#r20be .r20be-seg button')].find(b => b.textContent.trim() === '매크로')?.click()); await p.waitForTimeout(200);
  await p.click('#r20be .r20be-row[data-id="m1"] [data-act="pick"]').catch(() => p.click('#r20be .r20be-row[data-id="m1"]')); await p.waitForTimeout(200);
  await p.click(tlBtn); await p.waitForTimeout(150);
  console.log('매크로 칸:', await p.$eval('#r20be .r20be-tlink .mode', e => [...e.querySelectorAll('label')].map(l => (l.querySelector('input').checked ? '◉' : '○') + l.querySelector('b').textContent).join(' ')));
  console.log('토큰:', await rows());
  await p.check('#r20be .r20be-tlink .row:nth-child(2) input');
  await p.click('#r20be .r20be-tlink .ft .pri'); await p.waitForTimeout(900);
  const mst = () => p.evaluate(() => { const c = Campaign.characters.models.find(m => m.get('name') === '🎬 장면1');
    return (c ? `${c.get('name')} 조종=${c.get('controlledby')} 능력=` + c.abilities.models.map(a => `${a.get('name')}[${a.get('istokenaction') ? '토큰' : ''}]${a.get('action')}`).join(' ; ') : '(없음)')
      + ` | 매크로 공유=${currentPlayer.macros.models[0].get('visibleto')} | 서랍→${Campaign.characters.get(Campaign.activePage().thegraphics.get('g2').get('represents'))?.get('name') || '-'}/${Campaign.activePage().thegraphics.get('g2').get('bar3_value')}`; });
  console.log('부르기 연결 →', await mst(), '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent));
  console.log('매크로 목록:', await p.$$eval('#r20be .r20be-row', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').trim()).join(' / ')));
  await p.click(tlBtn); await p.waitForTimeout(150);
  await p.check('#r20be .r20be-tlink .mode input[value=copy]'); await p.waitForTimeout(50);
  if (SHOT) await p.screenshot({ path: SHOT + '/tlmac.png', clip: await p.$eval('#r20be .r20be-tlink', e => { const r = e.getBoundingClientRect(); return { x: r.x - 6, y: r.y - 6, width: r.width + 12, height: r.height + 12 }; }) });
  console.log('복사로 바꿈 →', await p.$eval('#r20be .r20be-tlink p.warn:not([hidden])', e => e.textContent).catch(() => '(경고 없음)'));
  await p.click('#r20be .r20be-tlink .ft .pri'); await p.waitForTimeout(900);
  console.log('복사 연결 →', await mst(), '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent));
  console.log('errors:', errs); await b.close();
})();
