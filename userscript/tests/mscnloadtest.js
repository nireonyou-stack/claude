// v1.109.1 맵 장면 읽기 실패: 방에 막 들어와 핸드아웃 내용이 아직 비어 있으면 빈 목록을 기억하지 않고(저장도 막음) 다시 읽는다
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<canvas id="babylonCanvas" width="400" height="300"></canvas><div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:0;width:28px;height:28px"></div>';
    window.__w = []; window.__ready = false;
    const M = a => ({ id: a.id, attributes: a, get: k => a[k], set() {}, save(o) { Object.assign(a, o || {}); }, on() {}, off() {}, destroy() {} });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), create(o) { const m = M({ id: 'n' + arr.length, ...o }); arr.push(m); return m; } });
    const pg = M({ id: 'pg1', name: '폐공장', width: 20, height: 15, zorder: '' }); pg.thegraphics = coll([]); pg.thepaths = coll([]); pg.thetexts = coll([]);
    const data = escape(JSON.stringify({ v: 1, pages: { pg1: { cur: null, list: [{ id: 's1', name: '입구', layers: ['map'], keepPC: true, withPage: false, objs: [], n: { map: 0 } }, { id: 's2', name: '지하실', layers: ['map'], keepPC: true, withPage: false, objs: [], n: { map: 0 } }] } } }));
    const h = M({ id: 'h1', name: '맵 장면', gmnotes: '1700000000' });
    h._getLatestBlob = (f, cb) => setTimeout(() => cb(__ready ? data : ''), 5);       // Roll20 이 아직 안 줬을 때는 빈 글
    h.updateBlobs = x => { __w.push('저장:' + x.gmnotes.slice(0, 20)); };
    window.Campaign = { get: k => k === 'playerpageid' ? 'pg1' : '[]', save() {}, on() {}, handouts: coll([h]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(800);
  console.log('막 들어왔을 때 단추줄 장면 단추:', await p.$('#r20-mscnbtn') ? '있음' : '없음');
  await p.click('#r20-mapshot .main'); await p.waitForTimeout(200); await p.click('#r20-maptray .scn'); await p.waitForTimeout(300);
  console.log('창 (아직 못 읽음):', await p.$eval('#r20-mscn .ls', e => e.textContent));
  await p.click('#r20-mscn .add'); await p.waitForTimeout(100);
  console.log('저장 칸 열기 막힘:', await p.$eval('#r20-mscn .fm', e => e.hidden), '| 알림:', await p.$eval('#aio-toasts', e => e.innerText.replace(/\s+/g, ' ').trim()), '| 핸드아웃에 쓴 것:', await p.evaluate(() => __w.length));
  await p.evaluate(() => { window.__ready = true; }); await p.waitForTimeout(1800);
  console.log('Roll20 이 준 뒤 (창이 열린 채 다시 읽음):', await p.$$eval('#r20-mscn .card b', bs => bs.map(x => x.textContent).join(' / ')));
  await p.click('#r20-mscn .x'); await p.waitForTimeout(100);
  const btn = await p.$('#r20-mscnbtn');
  console.log('단추줄 장면 단추:', btn ? await btn.evaluate(e => e.hidden ? '숨김' : '보임') : '없음');
  console.log('errors:', errs); await b.close();
})();
