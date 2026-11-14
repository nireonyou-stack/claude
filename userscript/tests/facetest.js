// v1.106 롤러블 토큰 면 → 맵 장면 바로가기: 일괄 편집기 맵 탭 → [면을 장면 바로가기로…] → 면 고르기(전체 · 해제 · 반전 · Shift 범위) → 바로가기 만들기
// 맵 장면 단추는 저장한 장면 · 바로가기가 있을 때만 단추줄(시나리오 내비게이터 아래)에 · 누르면 그 토큰의 면만 바뀜 · 되돌리기 · 창 크기 조절
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route(/files\.d20\.io/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#7a9"/></svg>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:0;width:28px;height:28px"></div>';
    let n = 0; window.__w = [];
    const M = (a, coll) => { const m = { id: a.id || 'n' + (++n), attributes: a, get: k => m.attributes[k], set() {}, save(o) { if (o) { Object.assign(m.attributes, o); __w.push((m.attributes.name || m.id) + ':' + Object.keys(o).join(',')); } }, on() {}, off() {}, destroy() { coll && coll.models.splice(coll.models.indexOf(m), 1); }, toJSON: () => ({ ...m.attributes }) }; m.attributes.id = m.id; return m; };
    const coll = arr => { const c = { models: arr, length: arr.length, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), create(o) { const m = M({ ...o }, c); arr.push(m); return m; } }; return c; };
    const L = k => `https://files.d20.io/images/${k}/bg/max.png?1`;
    window.__sides = Array.from({ length: 12 }, (_, i) => L(100 + i));
    const pg = M({ id: 'pg1', name: '저택', width: 20, height: 15, snapping_increment: 1, zorder: 'bg,pc' });
    const bg = M({ id: 'bg', name: '배경', layer: 'map', imgsrc: __sides[0], sides: __sides.map(encodeURIComponent).join('|'), currentSide: 0, width: 1400, height: 1050, left: 700, top: 525, rotation: 0 });
    const pc = M({ id: 'pc', name: '하루카', layer: 'objects', imgsrc: L(9), width: 70, height: 70, left: 35, top: 35, rotation: 0, controlledby: 'p2' });
    pg.thegraphics = coll([bg, pc]); pg.thepaths = coll([]); pg.thetexts = coll([]);
    const handouts = coll([]), hc = handouts.create;
    handouts.create = o => { const h = hc(o); h.blobs = {}; h.updateBlobs = x => { Object.assign(h.blobs, x); h.attributes.gmnotes = 'v' + (++n); }; h._getLatestBlob = (f, cb) => setTimeout(() => cb(h.blobs[f] || ''), 5); return h; };
    window.Campaign = { get: k => k === 'playerpageid' ? 'pg1' : '[]', save() {}, on() {}, handouts, characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(700);
  console.log('장면 없을 때 꺼낸 단추:', await p.$('#r20-mscnbtn') ? await p.$eval('#r20-mscnbtn', e => e.hidden ? '숨김' : '보임') : '없음');
  // 일괄 편집기 → 맵 탭 → 배경 토큰
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.evaluate(() => [...document.querySelectorAll('#r20be .r20be-seg button')].find(b => b.textContent.trim() === '맵')?.click()); await p.waitForTimeout(250);
  await p.click('#r20be .r20be-row[data-id="bg"] [data-act="pick"]'); await p.waitForTimeout(200);
  const fb = '#r20be .r20be-pane button:has-text("면을 장면 바로가기로")';
  console.log('맵 탭 단추:', await p.$(fb) ? '있음' : '없음');
  await p.click(fb); await p.waitForSelector('.r20so-dlg');
  const D = '.r20so-dlg';
  console.log('창:', await p.$eval(D + ' #r20so-t', e => e.textContent + ' ‹' + e.title + '›'), '| 설명 글 없음:', !(await p.$(D + ' .r20so-hint, ' + D + ' .r20so-h small')),
    '| 크기 조절:', await p.$eval(D, e => getComputedStyle(e).resize), '| 면:', await p.$$eval(D + ' .r20so-t', ts => ts.length));
  const st = () => p.evaluate(() => [document.querySelectorAll('.r20so-t.mk').length, document.querySelector('[data-m="save"]').textContent, document.querySelector('[data-m="drop"]').textContent].join(' · '));
  await p.click(D + ' [data-m="all"]'); console.log('전체:', await st());
  await p.click(D + ' [data-m="none"]'); console.log('해제:', await st());
  await p.click(D + ' .r20so-t >> nth=1'); await p.click(D + ' .r20so-t >> nth=3', { modifiers: ['Shift'] }); console.log('2~4 범위:', await st());
  await p.click(D + ' [data-m="inv"]'); console.log('반전:', await st());
  await p.click(D + ' [data-m="inv"]'); await p.click(D + ' .r20so-t >> nth=2'); console.log('3번만 풀기:', await st());
  if (SHOT) await p.screenshot({ path: SHOT + '/faces.png', clip: await p.$eval(D, e => { const r = e.getBoundingClientRect(); return { x: r.x - 6, y: r.y - 6, width: r.width + 12, height: r.height + 12 }; }) });
  await p.click(D + ' [data-m="save"]'); await p.waitForTimeout(400);
  console.log('알림:', await p.$eval('#aio-toasts', e => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 80)));
  console.log('꺼낸 단추:', await p.$eval('#r20-mscnbtn', e => (e.hidden ? '숨김' : '보임') + ' top=' + e.style.top), '| 시나리오 단추 top:', await p.$eval('#r20-snbtn', e => e.style.top).catch(() => '없음'));
  await p.$eval('#r20be .r20be-ib[aria-label="닫기"]', x => x.click());
  await p.click('#r20-mscnbtn'); await p.waitForSelector('#r20-mscn:not([hidden]) .card');
  const cards = () => p.$$eval('#r20-mscn .card', cs => cs.map(c => (c.classList.contains('now') ? '▶' : '') + c.querySelector('b').textContent + '(' + c.querySelector('small').textContent + ')').join(' / '));
  console.log('장면 카드:', await cards());
  await p.click('#r20-mscn .card:nth-child(2) .go'); await p.waitForTimeout(200);
  const bgNow = () => p.evaluate(() => { const g = Campaign.activePage().thegraphics.get('bg'); return `면 ${g.get('currentSide') + 1} · ${g.get('imgsrc').match(/images\/(\d+)/)[1]} · 그림 ${Campaign.activePage().thegraphics.models.length}개`; });
  console.log('둘째 카드 → 배경:', await bgNow(), '|', await cards());
  await p.click('#aio-toasts button:has-text("되돌리기")'); await p.waitForTimeout(150);
  console.log('되돌리기:', await bgNow());
  // 이름 고치기 · 지우기 (덮어쓰기 · 복제는 면 바로가기에 없음)
  await p.click('#r20-mscn .card:nth-child(1) .more');
  console.log('카드 메뉴:', await p.$$eval('#r20-mscn .acts button', bs => bs.map(b => b.textContent).join(',')));
  // 같은 면은 두 번 안 만든다
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForTimeout(200);
  await p.click('#r20be .r20be-row[data-id="bg"] [data-act="pick"]'); await p.waitForTimeout(150); await p.click(fb); await p.waitForSelector('.r20so-dlg');
  await p.click(D + ' [data-m="save"]'); await p.waitForTimeout(400);
  console.log('전부로 다시 (있는 것은 건너뜀):', await p.$eval('#aio-toasts', e => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)));
  // 토큰 메뉴의 '면 순서 바꾸기'(pick 없음)는 예전처럼 [저장]
  await p.evaluate(() => { window.__saved = null; });
  console.log('errors:', errs); await b.close();
})();
