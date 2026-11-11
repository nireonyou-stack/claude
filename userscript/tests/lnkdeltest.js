// v1.92 링크 점검 지우기: 🗑 · 한꺼번에 지우기 → 저장(통째로 지울 것은 확인 창) → 쓰는 곳마다 빼기 → 되돌리기 (통째로 지운 것은 그대로)
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const svg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#468"/></svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const asked = []; p.on('dialog', d => { asked.push(d.message()); d.accept(); });
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => {
    const u = r.request().url(), h = new URL(u).hostname;
    if (/discordapp/.test(h)) return r.fulfill({ status: 404, body: 'This content is no longer available.' });
    if (h === 'i.imgur.com' && /GONE/.test(u)) return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(161, 81) });
    if (h === 'i.imgur.com' && /BIG/.test(u) && r.request().method() === 'HEAD') return r.fulfill({ status: 200, headers: { 'content-length': '9437184', 'access-control-allow-origin': '*', 'content-type': 'image/gif' }, body: '' });
    if (h === 'i.imgur.com' || h === 'files.d20.io') return /DEAD/.test(u) ? r.fulfill({ status: 404, body: 'no' }) : r.fulfill({ status: 200, contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: svg(160, 90) });
    return r.abort('namenotresolved');
  });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    window.__w = [];
    const M = (id, a, blobs = {}) => ({ id, cid: 'c' + id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; },
      save(o) { if (o) { Object.assign(a, o); __w.push(id + ':' + Object.keys(o).join(',')); } }, blobs,
      destroy() { __w.push(id + ':destroy'); const c = this._c; if (c) c.splice(c.indexOf(this), 1); }, _getLatestBlob(n, cb) { setTimeout(() => cb(blobs[n] || ''), 5); }, updateBlobs(o) { Object.assign(blobs, o); __w.push(id + ':blob:' + Object.keys(o).join(',')); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f), create: o => { const m = M('n' + arr.length, o); arr.push(m); return m; }, _: arr.forEach(m => { m._c = arr; }) });
    const L = k => `https://files.d20.io/images/${k}/abc/thumb.png?1`;
    const items = [M('ti1', { name: '웃음', weight: 1, avatar: L(1) }), M('ti2', { name: '화남', weight: 1, avatar: 'https://files.d20.io/images/DEAD/abc/thumb.png?1' })];
    const t1 = M('t1', { name: 'NPC표' }); t1.tableitems = coll(items);
    const cards = [M('cd1', { name: '카드A', avatar: L(3), card_back: '' }), M('cd2', { name: '카드B', avatar: 'https://files.d20.io/images/DEAD3/abc/thumb.png?1', card_back: '' })];
    const d1 = M('d1', { name: '타로', avatar: L(4) }); d1.cards = coll(cards);
    const h1 = M('h1', { name: '단서3', avatar: '' }, { notes: '<p>사진</p><img src="https://cdn.discordapp.com/attachments/1/2/clue.jpg">', gmnotes: '' });
    const c1 = M('c1', { name: '하루카', avatar: L(5) }, { bio: '', gmnotes: '', defaulttoken: JSON.stringify({ imgsrc: L(5), sides: [L(5), 'https://cdn.discordapp.com/attachments/1/9/face.png'].map(escape).join('|') }) });
    const g1 = M('g1', { name: '하루카 토큰', imgsrc: L(5), sides: [L(5), 'https://cdn.discordapp.com/attachments/1/9/face.png'].map(escape).join('|') });
    const g2 = M('g2', { name: '깨진 지도', imgsrc: 'https://files.d20.io/images/DEADMAP/abc/thumb.png?1', sides: '' });
    const g3 = M('g3', { name: '두 얼굴', imgsrc: 'https://files.d20.io/images/DEADFACE/abc/thumb.png?1', currentSide: 0, sides: ['https://files.d20.io/images/DEADFACE/abc/thumb.png?1', L(7)].map(escape).join('|') });
    const pg = M('pg1', { name: '폐공장' }); pg.thegraphics = coll([g1, g2, g3]);
    const mac = M('m1', { name: '장면선택', action: '/desc ?{장면|시크—————,x|도입,https://i.imgur.com/OKAAA11.png|8비트-도입,https://cdn.discordapp.com/attachments/1/2/1.png|8비트-메인, [메인](https://cdn.discordapp.com/attachments/1/3/2.png)|지워진,https://i.imgur.com/GONE123.png|잘못,https://imgur.comLON2gNv.png|큰움짤,https://i.imgur.com/BIGgif1.gif}', visibleto: '', istokenaction: false });
    window.Campaign = { get: k => k === 'journalfolder' || k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {}, handouts: coll([h1]), characters: coll([c1]), rollabletables: coll([t1]), decks: coll([d1]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([mac]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.click('#r20be .r20be-seg button:has-text("링크 점검")'); await p.waitForTimeout(200);
  await p.click('#r20be .r20be-lk-top button'); await p.waitForFunction(() => /그림 주소 \d+개 ·/.test(document.querySelector('#r20be .r20be-lk-top')?.innerText || ''), null, { timeout: 30000 });
  const rows = () => p.$$eval('#r20be .r20be-lk-r', rs => rs.map(r => r.querySelector('.r20be-lk-nm b').textContent + (r.classList.contains('gone') ? ' [지움 ' + (r.querySelector('.r20be-lk-after')?.textContent || '') + ']' : '')));
  console.log('🗑 단추 (안 열림 줄):', await p.$$eval('#r20be .r20be-lk-r .r20be-lk-del', bs => bs.length), '/', (await rows()).length);
  // 한 줄 🗑 → 되살리기
  const clueRow = '#r20be .r20be-lk-r:has(a[title*="clue.jpg"])';
  await p.click(clueRow + ' .r20be-lk-del'); await p.waitForTimeout(100);
  console.log('한 줄 🗑:', await p.$eval(clueRow, r => r.className + ' | ' + r.querySelector('.r20be-lk-fix').innerText.replace(/\s+/g, ' ')), '| 변경:', await p.$eval('#r20be .r20be-badge, #r20be [class*="badge"]', e => e.textContent).catch(() => '?'));
  await p.click(clueRow + ' button:has-text("되살리기")'); await p.waitForTimeout(100);
  console.log('되살리기 →', await p.$eval(clueRow, r => r.className));
  // 한꺼번에: face 줄은 새 주소, 나머지 지움
  const faceRow = '#r20be .r20be-lk-r:has(a[title*="face.png"])';
  await p.click('#r20be .r20be-lk-bulk button.r20be-lk-del'); await p.waitForTimeout(100);
  await p.fill(faceRow + ' button:has-text("되살리기")', '').catch(() => {});
  await p.click(faceRow + ' button:has-text("되살리기")'); await p.waitForTimeout(100);
  await p.fill(faceRow + ' input', 'https://i.imgur.com/NEWface.png'); await p.press(faceRow + ' input', 'Enter'); await p.waitForTimeout(200);
  console.log('표시:\n  ' + (await rows()).join('\n  '));
  if (SHOT) await p.screenshot({ path: SHOT + '/lnkdel.png', clip: await p.$eval('#r20be', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 760) }; }) });
  console.log('한꺼번에 단추 글:', await p.$eval('#r20be .r20be-lk-bulk button.r20be-lk-del', b => b.textContent));
  await p.click('#r20be button:has-text("저장")'); await p.waitForTimeout(1500);
  console.log('확인 창:', asked.map(s => s.replace(/\n+/g, ' / ')).join(' ‖ '));
  const st = await p.evaluate(() => ({ mac: currentPlayer.macros.models[0].get('action'), notes: Campaign.handouts.models[0].blobs.notes,
    items: Campaign.rollabletables.models[0].tableitems.models.map(m => m.get('name')).join(','), cards: Campaign.decks.models[0].cards.models.map(m => m.get('name') + '=' + (m.get('avatar') ? 'O' : '빈칸')).join(','),
    gfx: Campaign.pages.models[0].thegraphics.models.map(g => g.get('name') + '(' + (g.get('imgsrc').match(/images\/(\w+)/) || [, g.get('imgsrc')])[1] + ' · 면 ' + unescape(g.get('sides') || '').split('|').filter(Boolean).map(s => (s.match(/images\/(\w+)|NEW\w+|face/) || [])[1] || s.match(/NEW\w+|face/)?.[0]).join('/') + ' · cur ' + (g.get('currentSide') ?? '-') + ')').join(' ; '),
    dt: unescape(JSON.parse(Campaign.characters.models[0].blobs.defaulttoken).sides).match(/NEW\w+|face/g).join(','), w: __w }));
  console.log('매크로:', st.mac.replace(/https:\/\/[^|,)}\s]+\/([^/|,)}\s]+)/g, '$1'));
  console.log('핸드아웃 글:', st.notes, '| 굴림표 항목:', st.items, '| 카드:', st.cards);
  console.log('맵:', st.gfx, '| 기본 토큰 면:', st.dt);
  console.log('쓴 곳:', st.w.join(' '));
  console.log('저장 뒤 줄:', await p.$eval('#r20be .r20be-lk-done', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '(없음)'));
  console.log('남은 안 열림:', (await rows()).join(' ; ') || '(없음)');
  await p.click('#r20be .r20be-lk-done button'); await p.waitForTimeout(1500);
  const un = await p.evaluate(() => ({ mac: currentPlayer.macros.models[0].get('action'), notes: Campaign.handouts.models[0].blobs.notes, items: Campaign.rollabletables.models[0].tableitems.models.length,
    cards: Campaign.decks.models[0].cards.models.map(m => m.get('name') + '=' + (m.get('avatar') ? 'O' : '빈칸')).join(','), g3: (g => g && (g.get('imgsrc').match(/images\/(\w+)/) || [])[1] + ' 면' + unescape(g.get('sides')).split('|').length + ' cur ' + g.get('currentSide'))(Campaign.pages.models[0].thegraphics.models.find(g => g.id === 'g3')) }));
  console.log('되돌리기 → 매크로 선택지 수:', un.mac.split('|').length - 1, '| 글:', un.notes.includes('clue.jpg') ? 'img 되살림' : '없음', '| 항목 수:', un.items, '| 카드:', un.cards, '| 두 얼굴:', un.g3);
  console.log('알림:', await p.$$eval('#aio-toasts .aio-t .m', ts => ts.map(t => t.textContent).join(' | ')));
  console.log('errors:', errs); await b.close();
})();
