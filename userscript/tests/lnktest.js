// v1.83 일괄 편집기 · 링크 점검: 모으기(매크로 · 굴림표 · 덱 · 핸드아웃 글 · 캐릭터 · 기본 토큰 · 맵 면) → 열어 보기 → 원인 분류 → 새 주소 → 저장 → 되돌리기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const svg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#468"/></svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
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
      _getLatestBlob(n, cb) { setTimeout(() => cb(blobs[n] || ''), 5); }, updateBlobs(o) { Object.assign(blobs, o); __w.push(id + ':blob:' + Object.keys(o).join(',')); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f), create: o => { const m = M('n' + arr.length, o); arr.push(m); return m; } });
    const L = k => `https://files.d20.io/images/${k}/abc/thumb.png?1`;
    const items = [M('ti1', { name: '웃음', weight: 1, avatar: L(1) }), M('ti2', { name: '화남', weight: 1, avatar: 'https://files.d20.io/images/DEAD/abc/thumb.png?1' })];
    const t1 = M('t1', { name: 'NPC표' }); t1.tableitems = coll(items);
    const cards = [M('cd1', { name: '카드A', avatar: L(3), card_back: '' })];
    const d1 = M('d1', { name: '타로', avatar: L(4) }); d1.cards = coll(cards);
    const h1 = M('h1', { name: '단서3', avatar: '' }, { notes: '<p>사진</p><img src="https://cdn.discordapp.com/attachments/1/2/clue.jpg">', gmnotes: '' });
    const c1 = M('c1', { name: '하루카', avatar: L(5) }, { bio: '', gmnotes: '', defaulttoken: JSON.stringify({ imgsrc: L(5), sides: [L(5), 'https://cdn.discordapp.com/attachments/1/9/face.png'].map(escape).join('|') }) });
    const g1 = M('g1', { name: '하루카 토큰', imgsrc: L(5), sides: [L(5), 'https://cdn.discordapp.com/attachments/1/9/face.png'].map(escape).join('|') });
    const pg = M('pg1', { name: '폐공장' }); pg.thegraphics = coll([g1]);
    const mac = M('m1', { name: '장면선택', action: '/desc ?{장면|시크—————,x|도입,https://i.imgur.com/OKAAA11.png|8비트-도입,https://cdn.discordapp.com/attachments/1/2/1.png|8비트-메인, [메인](https://cdn.discordapp.com/attachments/1/3/2.png)|지워진,https://i.imgur.com/GONE123.png|잘못,https://imgur.comLON2gNv.png|큰움짤,https://i.imgur.com/BIGgif1.gif}', visibleto: '', istokenaction: false });
    window.Campaign = { get: k => k === 'journalfolder' || k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {}, handouts: coll([h1]), characters: coll([c1]), rollabletables: coll([t1]), decks: coll([d1]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([mac]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.click('#r20be .r20be-seg button:has-text("링크 점검")'); await p.waitForTimeout(200);
  console.log('처음:', await p.$eval('#r20be .r20be-lk', e => e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
  await p.click('#r20be .r20be-lk-top button'); await p.waitForFunction(() => /그림 주소 \d+개 ·/.test(document.querySelector('#r20be .r20be-lk-top')?.innerText || ''), null, { timeout: 30000 });
  const tree = () => p.$$eval('#r20be .r20be-tree .r20be-row', rs => rs.map(r => (r.classList.contains('sel') ? '*' : '') + r.innerText.replace(/\s+/g, ' ').trim()).join(' | '));
  const rows = () => p.$$eval('#r20be .r20be-lk-r', rs => rs.map(r => r.querySelector('.r20be-lk-nm b').textContent + ' ⟨' + r.querySelector('.r20be-lk-th').innerText.replace(/\s+/g, '') + '⟩ ' + [...r.querySelectorAll('.r20be-lk-use > div')].map(d => d.textContent).join(' / ')));
  console.log('요약:', await p.$eval('#r20be .r20be-lk-top', e => e.innerText.replace(/\s+/g, ' ').replace(/\d+초 · \d+:\d+/, 'N초 · 시각')));
  console.log('왼쪽:', await tree());
  console.log('안 열림 줄:\n  ' + (await rows()).join('\n  '));
  console.log('원인 설명:', await p.$eval('#r20be .r20be-lk-why', e => e.innerText).catch(() => '(없음)'));
  await p.click('#r20be .r20be-tree .r20be-row[data-g="big"]'); await p.waitForTimeout(100);
  console.log('너무 큼:', (await rows()).join(' ; '), '|', await p.$eval('#r20be .r20be-lk-nm small', e => e.textContent));
  await p.click('#r20be .r20be-tree .r20be-row[data-g="discord"]'); await p.waitForTimeout(100);
  console.log('Discord:', (await rows()).length, '줄');
  if (SHOT) await p.screenshot({ path: SHOT + '/lnk.png', clip: await p.$eval('#r20be', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 760) }; }) });
  // 한 줄 고치기 (라이브러리 칸에 바깥 주소 → 경고) · 여러 줄 한꺼번에
  const faceRow = '#r20be .r20be-lk-r:has(a[title*="face.png"])';
  await p.fill(faceRow + ' input', 'https://i.imgur.com/NEWface.png'); await p.press(faceRow + ' input', 'Enter'); await p.waitForTimeout(300);
  console.log('face 새 주소 표시:', await p.$eval(faceRow + ' .r20be-lk-mk', e => e.textContent + ' (' + e.title + ')'));
  await p.fill('#r20be .r20be-lk-bulk textarea', 'https://i.imgur.com/NEW1.png\nhttps://i.imgur.com/NEW2.png\n\nhttps://i.imgur.com/NEWclue.jpg');
  await p.click('#r20be .r20be-lk-bulk button'); await p.waitForTimeout(200);
  console.log('한꺼번에 →', await p.$$eval('#r20be .r20be-lk-r', rs => rs.map(r => r.querySelector('.r20be-lk-nm b').textContent + '=' + (r.querySelector('input').value.split('/').pop() || '-')).join(' ; ')), '| 저장 안 한 변경:', await p.$eval('#r20be .r20be-badge, #r20be [class*="badge"]', e => e.textContent).catch(() => '?'));
  await p.click('#r20be button:has-text("저장")'); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => ({ mac: currentPlayer.macros.models[0].get('action'), notes: Campaign.handouts.models[0].blobs.notes, dt: Campaign.characters.models[0].blobs.defaulttoken, sides: unescape(Campaign.pages.models[0].thegraphics.models[0].get('sides')), w: __w }));
  console.log('저장 → 매크로:', st.mac.match(/NEW\w+|discordapp[^|,)]+/g).join(' '));
  console.log('저장 → 핸드아웃 글:', st.notes, '| 기본 토큰 면:', unescape(JSON.parse(st.dt).sides).match(/NEW\w+|face/g).join(','), '| 맵 면:', st.sides.match(/NEW\w+|face/g).join(','));
  console.log('쓴 곳:', st.w.join(' '));
  console.log('저장 뒤 화면:', await p.$eval('#r20be .r20be-lk-done', e => e.innerText.replace(/\s+/g, ' ')).catch(() => '(알림 없음)'), '| 왼쪽:', await tree());
  await p.click('#r20be .r20be-lk-done button'); await p.waitForTimeout(1500);
  console.log('되돌리기 → 매크로:', (await p.evaluate(() => currentPlayer.macros.models[0].get('action'))).match(/NEW\w+|discordapp[^|,)]+/g).join(' '));
  console.log('errors:', errs); await b.close();
})();
