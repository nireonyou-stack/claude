// v1.77 홈페이지로 보내기: 시트 창 🏠 · 설정 주소 · 열쇠 · 연결 확인 · 보낸 내용 · 결과 알림
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const got = [];
  let n = 0;
  await p.route('https://home.test/**', async r => {
    const body = JSON.parse(r.request().postData()); got.push(body);
    if (process.env.REAL) {         // 진짜 PHP 받는 곳(가짜 그누보드)으로
      const res = await r.fetch({ url: 'http://127.0.0.1:8777/skin/board/character/sheet/import.roll20.php', headers: { ...r.request().headers(), origin: 'https://app.roll20.net' } });
      return r.fulfill({ status: res.status(), contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await res.text() });
    }
    const res = body.op === 'ping' ? { ok: true, rules: ['bloodmoon'], tpls: ['bloodmoon', 'shinobigami'] }
      : body.key !== 'test-key-1234567890' ? { ok: false, error: '열쇠가 맞지 않습니다.' }
      : ++n === 1 ? { ok: true, mode: 'new', wr_id: 2, pc: 1, label: 'Roll20 2026-11-08 20:00', url: 'https://home.test/bbs/board.php?bo_table=character&wr_id=2' }
      : { ok: true, mode: 'ver', wr_id: 2, label: 'Roll20 2026-11-08 20:05', url: 'https://home.test/bbs/board.php?bo_table=character&wr_id=2' };
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(res) });
  });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div><div id="textchat-input"><div><select id="speakingas"><option>GM</option></select></div><textarea></textarea><button id="chatSendBtn">Send</button></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>
      <div class="ui-dialog" style="position:absolute;left:40px;top:40px;width:500px;height:300px;background:#fff"><div class="ui-dialog-titlebar" style="height:40px"><span class="ui-dialog-title">검은 고양이</span></div><div class="dialog characterdialog" data-characterid="c1"><iframe style="width:480px;height:200px"></iframe></div></div>`;
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const at = (n, v, m) => ({ get: k => ({ name: n, current: v, max: m || '' })[k] });
    const ch = { id: 'c1', attributes: { name: '검은 고양이', avatar: 'https://files.d20.io/images/1/a/med.png' }, get(k) { return this.attributes[k]; },
      attribs: coll([at('sheet_type', 'hunter'), at('level', '3'), at('repeating_abilities_-r1_name', '참격'), at('_reporder_repeating_abilities', '-r1,-r2')]),
      _getLatestBlob(f, cb) { setTimeout(() => cb(f === 'bio' ? '<p>바이오</p>' : 'GM 메모'), 10); } };
    window.Campaign = { get: k => k === 'charactersheetname' ? 'Blood Moon (Korean)' : '[]', save() {}, on() {}, handouts: coll([]), characters: coll([ch]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  console.log('🏠 단추:', await p.$eval('.ui-dialog-titlebar', t => [...t.children].map(c => c.className || c.tagName).join(' | ')), '| 흐림(설정 전):', await p.$eval('.r20home', x => x.classList.contains('off')));
  await p.click('.r20home'); await p.waitForTimeout(100);
  console.log('설정 전 누름 →', await p.$eval('#r20-home-toast', e => e.textContent));
  await p.click('#custom-settings-btn'); await p.waitForTimeout(200);
  const rows = await p.$$('#custom-settings-popup .r20home-row input');
  console.log('설정 줄 칸 수:', rows.length);
  await rows[0].fill('https://home.test/skin/board/character/sheet/import.roll20.php'); await rows[0].dispatchEvent('change');
  await rows[1].fill('test-key-1234567890'); await rows[1].dispatchEvent('change');
  await p.$eval('#custom-settings-popup .r20home-row .r20pz-open', x => x.click()); await p.waitForTimeout(300);
  console.log('연결 확인 →', await p.$eval('#custom-settings-popup .r20home-st', e => e.textContent), '| 🏠 흐림:', await p.$eval('.r20home', x => x.classList.contains('off')));
  await p.keyboard.press('Escape'); await p.mouse.click(700, 600);
  await p.click('.r20home'); await p.waitForTimeout(400);
  console.log('보냄 1 →', await p.$eval('#r20-home-toast', e => e.textContent));
  const c = got.find(x => x.op === 'import').char;
  console.log('보낸 내용:', JSON.stringify({ id: c.id, name: c.name, hint: c.hint, bio: c.bio, gm: c.gmnotes, attrs: c.attrs.length, order: c.order }));
  if (SHOT) await p.screenshot({ path: SHOT + '/home.png', clip: { x: 0, y: 0, width: 900, height: 768 } });
  await p.click('.r20home'); await p.waitForTimeout(400);
  console.log('보냄 2 →', await p.$eval('#r20-home-toast', e => e.textContent));
  console.log('errors:', errs); await b.close();
})();
