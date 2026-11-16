// v1.112.4 시트 전부 토큰에 연결 (원본 오른쪽으로 나란히 · 6개마다 줄 바꿈 · 되돌리기) · 마지막 탭 · 복사 원본 기억
// (아래 준비는 abtest 와 같음) v1.101 시트 어빌리티 → 토큰 연결: 어빌리티 이름 칸에 마우스 → 🎯 → 지금 페이지 토큰 층 토큰 목록(이름 같은 것 미리 체크 · 다른 캐릭터 토큰은 못 고름)
// 연결 = 대표 캐릭터 + 이름 + 막대 1 ↔ 충전 · 토큰 액션 '📜 이름' · 되돌리기 · 풀기 · 새 토큰(캐릭터 그림) · 반복 줄 속성 이름 · 플레이어에게는 안 보임
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/files\.d20\.io/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#86a"/></svg>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    // Roll20 에 실린 Bootstrap 의 .row (가짜 칸 · 음수 여백) — 줄 배치가 밀리지 않는지 본다
    document.head.insertAdjacentHTML('beforeend', '<style>.row:before,.row:after{content:" ";display:table}.row:after{clear:both}.row{margin-left:-15px;margin-right:-15px}</style>');
    const row = (b, n, ch) => `<div class="mrow" style="display:flex;gap:4px;margin:3px 0"><input name="attr_${b}Name" value="${n}" style="width:150px"><input name="attr_${b}Types" value="소환" style="width:50px"><input name="attr_${b}Cost" value="2" style="width:30px"><input name="attr_${b}Charge" value="${ch}" style="width:30px"><input name="attr_${b}Effect" value="정령을 소환한다" style="width:200px"></div>`;
    document.body.innerHTML = '<div class="ui-dialog" style="position:fixed;left:40px;top:60px;width:560px;padding:10px;background:#fff;border:1px solid #999"><div class="characterdialog" data-characterid="c1"><b>장서</b>'
      + row('Magic_01_', '긴급소환', 3) + row('Magic_02_', '화염', 0)
      + '<div class="repcontainer" data-groupname="repeating_acitems"><div class="repitem" data-reprowid="-Mabc">' + row('Magic_', '치유', 1) + '</div></div></div></div>'
      + '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>';
    let n = 0; window.__w = [];
    const M = (a, coll) => { const m = { id: a.id || 'n' + (++n), attributes: a, get: k => m.attributes[k], set() {}, save(o) { if (o) { Object.assign(m.attributes, o); __w.push((m.attributes.name || m.id) + ':' + Object.keys(o).join(',')); } }, destroy() { coll && coll.models.splice(coll.models.indexOf(m), 1); __w.push('x:' + m.attributes.name); }, previous() {}, on() {}, off() {} }; return m; };
    const coll = arr => { const c = { models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), create(o) { const m = M({ ...o }, c); arr.push(m); __w.push('+' + (o.name || '?')); return m; } }; return c; };
    const c1 = M({ id: 'c1', name: 'Meabodra Vic', controlledby: 'p2', avatar: 'https://files.d20.io/images/9/vic/max.png?1' });
    c1.attribs = coll([]); c1.abilities = coll([]);
    [['Magic_01_Name', '긴급소환'], ['Magic_01_Charge', 3], ['Magic_01_Cost', 2], ['Magic_02_Name', '화염'], ['repeating_acitems_-Mabc_Magic_Name', '치유'], ['repeating_acitems_-Mabc_Magic_Charge', 1]].forEach(([name, current]) => c1.attribs.models.push(M({ id: 'at_' + name, name, current, max: '' }, c1.attribs)));
    const G = a => M({ layer: 'objects', represents: '', bar1_num_permission: 'editors', left: 175, top: 105, imgsrc: 'https://files.d20.io/images/1/t/thumb.png?1', width: 70, height: 70, ...a });
    const pg = M({ id: 'pg1', name: '전투 맵', width: 20, height: 10 });
    pg.thegraphics = coll([G({ id: 'g1', name: '긴급소환' }), G({ id: 'g2', name: '화염', imgsrc: 'https://files.d20.io/images/2/fire/thumb.png?1' }), G({ id: 'g3', name: '이름 없는' }), G({ id: 'g4', name: '적', represents: 'cX' }), G({ id: 'g5', name: '긴급소환', layer: 'map' })]);
    window.__pg = pg; window.__c1 = c1;
    const dk = M({ id: 'd1', name: '장서 토큰' }); dk.cards = coll([M({ name: '소환', avatar: 'https://files.d20.io/images/5/a/max.png?1' }), M({ name: '기사', avatar: 'https://files.d20.io/images/6/b/med.png?1' }), M({ name: '빈 카드', avatar: '' })]);
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([c1]), rollabletables: coll([]), decks: coll([dk]), pages: coll([pg]), players: coll([]), activePage: () => pg };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const hover = async sel => { await p.hover(sel); await p.waitForTimeout(120); };
  const toks = () => p.evaluate(() => __pg.thegraphics.models.filter(g => g.get('represents') === 'c1').map(g => g.get('name') + '@' + g.get('left') + ',' + g.get('top') + (g.get('bar1_link') ? '·막대' : '')).join(' | '));
  await hover('[name="attr_Magic_02_Name"]'); await p.click('#r20-abt-chip'); await p.waitForSelector('#r20-abt');
  console.log('고르기:', await p.$eval('#r20-abt .aio-seg', s => [...s.children].map(b => b.textContent + (b.getAttribute('aria-checked') === 'true' ? '✓' : '')).join(' / ')));
  await p.click('#r20-abt [data-bulk="1"]'); await p.waitForTimeout(100);
  console.log('시트 전부:', await p.$eval('#r20-abt .hd b', e => e.textContent), '| 탭 숨김:', !(await p.$('#r20-abt .tabs')), '| 줄:', await p.$$eval('#r20-abt .bl label', ls => ls.map(l => (l.querySelector('input').checked ? '☑' : '☐') + l.textContent).join(' ')), '| 단추:', await p.$eval('#r20-abt [data-mk="bulk"]', b => b.textContent + (b.disabled ? ' (꺼짐)' : '')));
  await p.click('#r20-abt .tile.cp >> nth=1'); await p.waitForTimeout(80);
  const src = await p.evaluate(() => { const g = __pg.thegraphics.models.find(x => x.get('imgsrc').includes('fire')); return g.get('left') + ',' + g.get('top'); });
  console.log('원본(화염 그림) 자리', src, '| 단추:', await p.$eval('#r20-abt [data-mk="bulk"]', b => b.textContent + (b.disabled ? ' (꺼짐)' : '')));
  await p.click('#r20-abt [data-mk="bulk"]'); await p.waitForTimeout(300);
  console.log('만든 뒤 연결된 토큰:', await toks());
  console.log('토큰 액션:', await p.evaluate(() => __c1.abilities.models.map(a => a.get('name')).join(', ')) || '(없음)');
  await p.click('#aio-toasts button:has-text("되돌리기")'); await p.waitForTimeout(200);
  console.log('되돌리기 →', await toks() || '(새 토큰 없음)', '| 토큰 액션:', await p.evaluate(() => __c1.abilities.models.map(a => a.get('name')).join(', ')) || '(없음)');
  // 하나씩: 마지막 탭 · 원본 기억 → 🎯 → [복사해서 연결]
  await hover('[name="attr_Magic_01_Name"]'); await p.click('#r20-abt-chip'); await p.waitForSelector('#r20-abt');
  await p.click('#r20-abt [data-tab="copy"]'); await p.click('#r20-abt .tile.cp >> nth=1'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  await hover('.repitem [name="attr_Magic_Name"]'); await p.click('#r20-abt-chip'); await p.waitForSelector('#r20-abt');
  console.log('다시 열면 → 탭:', await p.$eval('#r20-abt .tabs [aria-selected="true"]', b => b.textContent), '| 원본 고름:', await p.$eval('#r20-abt .tile.cp.sel span', s => s.textContent).catch(() => '(없음)'), '| 초점:', await p.evaluate(() => document.activeElement?.textContent));
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('Enter → 연결:', await toks());
  console.log('errors:', errs); await b.close();
})();
