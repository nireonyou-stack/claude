// v1.94 코코포리아 장면 → 맵 장면: 룸 ZIP(장면 2 · 패널 2)을 열고 [장면 2개 → 맵 장면으로] → 그림은 한 번씩 올리고(떨어뜨린 그림은 지움)
// 패널은 토큰 층에 한 번만 · 맵 층이 비어 있었으면 첫 장면을 바로 놓음 · 둘째 장면을 누르면 맵 층만 바뀌고 패널은 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const SHOT = process.env.SHOT;
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route(/files\.d20\.io/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<canvas id="babylonCanvas" width="600" height="400" style="position:fixed;left:40px;top:40px"></canvas><div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:0;width:28px;height:28px"></div>';
    let n = 0; window.__w = [];
    const M = (a, coll) => { const m = { id: a.id || 'n' + (++n), attributes: a, get: k => m.attributes[k], save(o) { if (o) Object.assign(m.attributes, o); }, destroy() { __w.push('x:' + (m.attributes.name || m.attributes.layer)); coll && coll.rm(m); } }; m.attributes.id = m.id; return m; };
    const coll = (arr, pg) => { const hs = []; const c = { models: arr, get: id => arr.find(x => x.id === id), on: (e, f) => hs.push(f), off: (e, f) => hs.splice(hs.indexOf(f), 1), forEach: f => arr.forEach(f),
      create(o) { const m = M({ ...o }, c); arr.push(m); if (pg) pg.attributes.zorder = (pg.attributes.zorder ? pg.attributes.zorder + ',' : '') + m.id; hs.slice().forEach(f => f(m)); return m; },
      rm(m) { arr.splice(arr.indexOf(m), 1); if (pg) pg.attributes.zorder = pg.attributes.zorder.split(',').filter(x => x !== m.id).join(','); } }; return c; };
    const pg = M({ id: 'pg1', name: '코코 방', width: 25, height: 25, zorder: '' });
    pg.thegraphics = coll([], pg); pg.thepaths = coll([], pg); pg.thetexts = coll([], pg);
    // Roll20 처럼: 맵에 파일을 떨어뜨리면 라이브러리 주소를 단 그림이 생긴다
    let up = 0;
    document.getElementById('babylonCanvas').addEventListener('drop', e => { const f = e.dataTransfer.files[0]; e.preventDefault(); __w.push('up:' + f.name);
      setTimeout(() => pg.thegraphics.create({ name: '', layer: 'objects', imgsrc: `https://files.d20.io/images/${++up}/${f.name.replace(/\W/g, '')}/thumb.png?1`, width: 70, height: 70, left: 300, top: 200 }), 30); });
    const hs = [], handouts = coll(hs), hc = handouts.create;
    handouts.create = o => { const h = hc(o); h.blobs = {}; h.updateBlobs = x => { Object.assign(h.blobs, x); h.attributes.gmnotes = 'v' + (++n); }; h._getLatestBlob = (f, cb) => setTimeout(() => cb(h.blobs[f] || ''), 5); return h; };
    window.Campaign = { get: k => k === 'playerpageid' ? 'pg1' : '[]', save() {}, on() {}, handouts, characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  // 룸 ZIP 만들기 (무압축): 그림은 두 색 무늬 PNG
  await p.evaluate(async () => {
    const png = async (w, h, c1, c2) => { const cv = new OffscreenCanvas(w, h), x = cv.getContext('2d'); x.fillStyle = c1; x.fillRect(0, 0, w, h); x.fillStyle = c2; x.fillRect(0, 0, w / 2, h / 2); return new Uint8Array(await (await cv.convertToBlob({ type: 'image/png' })).arrayBuffer()); };
    const T = new Uint32Array(256).map((_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = d => { let c = ~0; for (const v of d) c = T[(c ^ v) & 255] ^ (c >>> 8); return ~c >>> 0; };
    const zip = files => { const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
      for (const [name, data] of files) { const nm = enc.encode(name), cr = crc(data), h = new DataView(new ArrayBuffer(30));
        [[0, 0x04034b50, 4], [4, 20, 2], [14, cr, 4], [18, data.length, 4], [22, data.length, 4], [26, nm.length, 2]].forEach(([o, v, s]) => s === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
        const c = new DataView(new ArrayBuffer(46));
        [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [16, cr, 4], [20, data.length, 4], [24, data.length, 4], [28, nm.length, 2], [42, off, 4]].forEach(([o, v, s]) => s === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true));
        parts.push(new Uint8Array(h.buffer), nm, data); cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length; }
      const size = cen.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
      [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, off, 4]].forEach(([o, v, s]) => s === 4 ? e.setUint32(o, v, true) : e.setUint16(o, v, true));
      return new File([...parts, ...cen, new Uint8Array(e.buffer)], 'room.zip', { type: 'application/zip' }); };
    const items = { i1: { imageUrl: 'panel.png', x: 2, y: 2, width: 2, height: 2, z: 1, active: true, visible: true, locked: false }, i2: { imageUrl: 'secret.png', x: -4, y: 3, width: 1, height: 1, z: 2, active: true, visible: false } };
    const scenes = { s1: { name: '입구', order: 0, backgroundUrl: 'bgA.png', foregroundUrl: 'fgA.png', fieldWidth: 10, fieldHeight: 8, markers: { m1: { imageUrl: 'mark.png', x: -2, y: -1, width: 1, height: 1, z: 0 } } },
      s2: { name: '지하실', order: 1, backgroundUrl: 'bgB.png', foregroundUrl: 'fgB.png', fieldWidth: 12, fieldHeight: 10, markers: {} } };
    const data = { entities: { room: { name: '방', backgroundUrl: 'bgA.png', foregroundUrl: 'fgA.png', fieldWidth: 10, fieldHeight: 8, markers: {} }, scenes, items, characters: {} } };
    const f = zip([['__data.json', new TextEncoder().encode(JSON.stringify(data))], ['bgA.png', await png(40, 30, '#345', '#567')], ['fgA.png', await png(40, 32, '#a85', '#753')],
      ['bgB.png', await png(40, 30, '#123', '#456')], ['fgB.png', await png(48, 40, '#555', '#888')], ['mark.png', await png(8, 8, '#f00', '#0f0')], ['panel.png', await png(8, 8, '#00f', '#ff0')], ['secret.png', await png(8, 8, '#0ff', '#f0f')]]);
    window.__zip = f;
  });
  await p.click('#r20-mapshot .main'); await p.waitForTimeout(250); await p.click('#r20-maptray .imp'); await p.waitForTimeout(200);
  await p.evaluate(() => { const inp = document.querySelector('#r20-ccf input[type=file]'), dt = new DataTransfer(); dt.items.add(window.__zip); inp.files = dt.files; inp.dispatchEvent(new Event('change')); });
  await p.waitForFunction(() => !document.querySelector('#r20-ccf .scs')?.hidden, null, { timeout: 10000 });
  console.log('장면 줄:', await p.$eval('#r20-ccf .scs', e => e.innerText.replace(/\s+/g, ' ')), '| 패널 스위치:', await p.$eval('#r20-ccf .pan', e => e.getAttribute('aria-checked')));
  if (SHOT) await p.screenshot({ path: SHOT + '/ccfscn.png', clip: await p.$eval('#r20-ccf', e => { const r = e.getBoundingClientRect(); return { x: r.x - 4, y: r.y - 4, width: r.width + 40, height: r.height + 8 }; }) });
  await p.click('#r20-ccf .all');
  await p.waitForFunction(() => document.querySelector('#r20-mscn') && !document.querySelector('#r20-mscn').hidden && document.querySelectorAll('#r20-mscn .card').length, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(400);
  console.log('가져오기 알림:', await p.$eval('#r20-ccf .prog', e => e.textContent));
  const st = () => p.evaluate(() => { const pg = Campaign.activePage(); return pg.thegraphics.models.map(g => `${g.get('layer')}:${(g.get('imgsrc').match(/\/images\/\d+\/(\w+)\//) || [])[1]}@${Math.round(g.get('left'))},${Math.round(g.get('top'))} ${Math.round(g.get('width'))}×${Math.round(g.get('height'))}${g.get('controlledby') ? ' ctl=' + g.get('controlledby') : ''}`).join(' | ') + ` ‖ 페이지 ${pg.get('width')}×${pg.get('height')} 배경 ${pg.get('background_color')}`; });
  console.log('올림 · 지움:', await p.evaluate(() => __w.join(' ')));
  console.log('맵 장면 카드:', await p.$$eval('#r20-mscn .card', cs => cs.map(c => (c.classList.contains('now') ? '▶' : '') + c.querySelector('b').textContent + '(' + c.querySelector('small').textContent + ')').join(' / ')));
  console.log('첫 장면 놓임:\n  ' + await st());
  await p.click('#r20-mscn .card:nth-child(2) .go'); await p.waitForTimeout(300);
  console.log('지하실 누름:\n  ' + await st());
  // 예전 길(장면 하나를 지금 페이지에 놓기)도 그대로: 올려 둔 주소를 다시 쓴다
  await p.evaluate(() => { __w.length = 0; });
  await p.click('#r20-mapshot .main').catch(() => {}); await p.waitForTimeout(200);
  if (!(await p.$eval('#r20-mapshot', e => e.classList.contains('open')))) { await p.click('#r20-mapshot .main'); await p.waitForTimeout(200); }
  await p.click('#r20-maptray .imp'); await p.waitForTimeout(300);
  await p.click('#r20-ccf .pri'); await p.waitForFunction(() => /다 놓았어요/.test(document.querySelector('#r20-ccf .prog')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  console.log('장면 하나 가져오기:', await p.$eval('#r20-ccf .prog', e => e.textContent), '| 새로 올림:', await p.evaluate(() => __w.filter(x => x.startsWith('up:')).length));
  console.log('errors:', errs); await b.close();
})();
