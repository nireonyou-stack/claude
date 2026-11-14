// v1.101 시트 어빌리티 → 토큰 연결: 어빌리티 이름 칸에 마우스 → 🎯 → 지금 페이지 토큰 층 토큰 목록(이름 같은 것 미리 체크 · 다른 캐릭터 토큰은 못 고름)
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
  await hover('[name="attr_Magic_01_Effect"]');
  console.log('효과 칸 위: 🎯', await p.$('#r20-abt-chip') ? '있음' : '없음');
  await hover('[name="attr_Magic_01_Name"]');
  console.log('이름 칸 위:', await p.$eval('#r20-abt-chip', e => e.title + (e.classList.contains('on') ? ' [분홍]' : '')));
  await p.click('#r20-abt-chip'); await p.waitForSelector('#r20-abt');
  const rows = () => p.$$eval('#r20-abt .row', rs => rs.map(r => (r.querySelector('input').checked ? '☑' : r.querySelector('input').disabled ? '⊘' : '☐') + r.querySelector('span').firstChild.textContent + '(' + r.querySelector('small').textContent + ')').join(' | '));
  console.log('창:', await p.$eval('#r20-abt .hd b', e => e.textContent + ' ‹' + e.title + '›'), '| 설명 글 없음:', !(await p.$('#r20-abt > p')), '| 옵션 숨김:', await p.$eval('#r20-abt .opts', e => e.hidden));
  await p.click('#r20-abt .gear'); console.log('⚙ 누름 → 옵션:', await p.$$eval('#r20-abt .opts .opt', os => os.map(o => o.textContent.trim().slice(0, 14)).join(' / '))); await p.click('#r20-abt .gear');
  console.log('토큰:', await rows());
  console.log('창이 시트 창보다 위:', await p.$eval('#r20-abt', e => +getComputedStyle(e).zIndex > 50000), '| 자리:', await p.$eval('#r20-abt .row i', e => e.textContent));
  console.log('줄 한 줄에:', await p.$eval('#r20-abt .row', r => { const a = r.querySelector('input').getBoundingClientRect(), z = r.querySelector('.im').getBoundingClientRect(), b = r.getBoundingClientRect(); return Math.abs((a.top + a.bottom) / 2 - (z.top + z.bottom) / 2) < 6 && b.height < 60 && a.left - b.left < 12; }));
  console.log('막대:', await p.$eval('#r20-abt .bar', e => [...e.options].map(o => (o.selected ? '▶' : '') + o.textContent).join(' / ')), '| 단추:', await p.$eval('#r20-abt .go', e => e.textContent));
  if (SHOT) await p.screenshot({ path: SHOT + '/abt.png', clip: { x: 0, y: 0, width: 1060, height: 420 } });
  await p.click('#r20-abt .go'); await p.waitForTimeout(150);
  const tok = id => p.evaluate(id => { const g = __pg.thegraphics.get(id).attributes; return `${g.name} rep=${g.represents || '-'} bar1=${g.bar1_value ?? '-'}/${g.bar1_max ?? '-'} link=${g.bar1_link || '-'} pl=${g.showplayers_bar1 ?? '-'} 이름표=${g.showname ?? '-'} 숫자=${g.bar1_num_permission ?? '-'}`; }, id);
  console.log('연결 뒤:', await tok('g1'), '| 알림:', await p.$eval('#aio-toasts', e => e.innerText.replace(/\s+/g, ' ').trim()));
  console.log('토큰 액션:', await p.evaluate(() => __c1.abilities.models.map(a => a.get('name') + (a.get('istokenaction') ? '(토큰)' : '') + ' = ' + a.get('action')).join(' ‖ ')));
  await hover('[name="attr_Magic_01_Name"]');
  console.log('다시 올림:', await p.$eval('#r20-abt-chip', e => e.title + (e.classList.contains('on') ? ' [분홍]' : '')));
  // 되돌리기
  await p.click('#aio-toasts button:has-text("되돌리기")'); await p.waitForTimeout(150);
  console.log('되돌린 뒤:', await tok('g1'));
  // 반복 줄 + 다른 토큰에: 치유 → 이름 없는 토큰 (이름도 맞춤)
  await hover('.repitem [name="attr_Magic_Name"]'); await p.click('#r20-abt-chip'); await p.waitForSelector('#r20-abt');
  console.log('치유 창 토큰:', await rows());
  // 이름이 같은 토큰이 없으면 맨 위(가장 나중에 올린) 토큰이 미리 체크돼 있다 → 그대로 [연결]
  await p.click('#r20-abt .go'); await p.waitForTimeout(150);
  console.log('반복 줄 연결:', await tok('g3'), '| 액션:', await p.evaluate(() => __c1.abilities.models.find(a => a.get('name') === '📜 치유')?.get('action').slice(0, 90)));
  // 풀기: 체크를 빼고 누름 → 연결 풀고 토큰 액션도 지움
  await hover('.repitem [name="attr_Magic_Name"]'); await p.click('#r20-abt-chip'); await p.waitForSelector('#r20-abt');
  await p.click('#r20-abt .row:nth-child(1) input');
  console.log('체크 뺌 → 단추:', await p.$eval('#r20-abt .go', e => e.textContent));
  await p.click('#r20-abt .go'); await p.waitForTimeout(150);
  console.log('푼 뒤:', await tok('g3'), '| 치유 액션:', await p.evaluate(() => !!__c1.abilities.models.find(a => a.get('name') === '📜 치유')));
  // 탭: 복사해서 새로 · 덱에서 꺼내기 · 그림 파일(캐릭터 그림)
  const last = () => p.evaluate(() => { const g = __pg.thegraphics.models[__pg.thegraphics.models.length - 1].attributes; return `${g.name} ${g.layer} ${g.imgsrc.replace(/^.*images/, '')} @${g.left},${g.top} ${g.width}×${g.height} rep=${g.represents || '-'} link=${g.bar1_link || '-'}`; });
  const openFor = async sel => { await hover(sel); await p.click('#r20-abt-chip'); await p.waitForSelector('#r20-abt'); };
  await openFor('[name="attr_Magic_02_Name"]');
  console.log('탭:', await p.$$eval('#r20-abt .tabs button', bs => bs.map(b => (b.getAttribute('aria-selected') === 'true' ? '▶' : '') + b.textContent).join(' · ')));
  await p.click('#r20-abt [data-tab=copy]');
  console.log('복사 탭:', await p.$$eval('#r20-abt .tile', ts => ts.map(x => x.textContent).join(',')), '| 단추:', await p.$eval('#r20-abt .mk', e => e.textContent + (e.disabled ? '(꺼짐)' : '')));
  await p.click('#r20-abt .tile:nth-child(2)'); await p.click('#r20-abt .mk'); await p.waitForTimeout(200);
  console.log('복사해서 연결 (한 번에 이름 · 막대까지):', await last(), '| 이름표:', await p.evaluate(() => { const g = __pg.thegraphics.models[__pg.thegraphics.models.length - 1].attributes; return `${g.showname} 막대=${g.bar1_value}/${g.bar1_max} 숫자=${g.bar1_num_permission} 저장 횟수=${__w.filter(x => x.startsWith('화염:')).length}`; }), '| 원래 화염 토큰:', await tok('g2'), '| 알림:', await p.$eval('#aio-toasts', e => e.innerText.replace(/\s+/g, ' ').trim()));
  await p.evaluate(() => { __w.length = 0; }); await p.click('#aio-toasts button:has-text("되돌리기")'); await p.waitForTimeout(150);
  console.log('되돌리면 새 토큰도 없어짐:', await p.evaluate(() => __pg.thegraphics.models.length));
  await openFor('[name="attr_Magic_02_Name"]'); await p.click('#r20-abt [data-tab=deck]');
  console.log('덱 탭:', await p.$eval('#r20-abt .deck', e => [...e.options].map(o => o.textContent).join('/')), '|', await p.$$eval('#r20-abt .tile', ts => ts.map(x => x.textContent).join(',')));
  await p.click('#r20-abt .tile:nth-child(2)'); await p.click('#r20-abt .mk'); await p.waitForTimeout(300);
  console.log('덱에서 꺼내 연결:', await last(), '| 덱 카드 수 그대로:', await p.evaluate(() => Campaign.decks.models[0].cards.models.length));
  await openFor('[name="attr_Magic_01_Name"]'); await p.click('#r20-abt [data-tab=file]'); await p.click('#r20-abt [data-mk=avatar]'); await p.waitForTimeout(300);
  console.log('캐릭터 그림으로:', await last());
  await openFor('[name="attr_Magic_01_Name"]');
  console.log('목록 (다른 것에 연결된 토큰은 빠짐):', await rows());
  await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  console.log('Esc → 닫힘:', !(await p.$('#r20-abt')));
  // 플레이어에게는 안 보임
  await p.evaluate(() => { window.is_gm = false; }); await hover('[name="attr_Magic_01_Effect"]'); await p.waitForTimeout(450); await hover('[name="attr_Magic_01_Name"]');
  console.log('플레이어: 🎯', await p.$('#r20-abt-chip') ? '있음' : '없음');
  console.log('errors:', errs); await b.close();
})();
