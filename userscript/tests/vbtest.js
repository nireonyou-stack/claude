// v1.100 캐릭터 값 판 + 설정 탭: 값 알림 창의 '판' 칸으로 보일 값 정하기 → 말하는 사람을 그 캐릭터로 바꾸면 맵 위에 · 값이 바뀌면 따라감 · 다른 사람이면 숨김
// ⚙ 단추 → 일괄 편집기 [⚙ 설정] 화면 (작은 설정 창 없음) · 다시 누르면 닫힘 · 다른 탭으로 가면 설정 줄이 빠짐
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.style.background = '#8a9a78';
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px;background:#fff"><div id="textchat"><div class="content"></div></div><div id="textchat-input"><textarea class="ui-autocomplete-input"></textarea><div><select id="speakingas"><option value="player|me">GM</option><option value="character|c1">하루카</option><option value="character|c2">렌</option></select></div><button id="chatSendBtn">보내기</button></div></div>'
      + '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    let n = 0;
    const M = a => { const m = { id: a.id || 'n' + (++n), cid: 'c' + (a.id || n), attributes: a, get: k => m.attributes[k], set() {}, save(o) { if (o) Object.assign(m.attributes, o); }, on() {}, off() {}, _getLatestBlob(f, cb) { cb(''); }, toJSON: () => ({ ...m.attributes }) }; return m; };
    const coll = arr => ({ models: arr, length: arr.length, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), create(o) { const m = M({ ...o }); arr.push(m); return m; } });
    const AC = () => { const hs = {}; const c = { models: [], on(e, f) { (hs[e] = hs[e] || []).push(f); }, off(e, f) { hs[e] = (hs[e] || []).filter(x => x !== f); }, fire(e, ...a) { (hs[e] || []).slice().forEach(f => f(...a)); },
      create(a) { const m = { id: 'a' + (++n), attributes: { ...a }, _prev: {}, get: k => m.attributes[k], previous: k => m._prev[k],
        save(o) { m._prev = { ...m.attributes }; Object.assign(m.attributes, o); Object.keys(o).forEach(k => c.fire('change:' + k, m, o[k])); c.fire('change', m); } }; m.set = m.save; c.models.push(m); c.fire('add', m, c); return m; },
      byName: k => c.models.find(m => m.get('name') === k) }; return c; };
    const mk = (id, name, list) => { const c = M({ id, name, controlledby: 'p2', avatar: '' }); c.attribs = AC(); c.abilities = coll([]); list.forEach(a => c.attribs.create(a)); return c; };
    window.__c1 = mk('c1', '하루카', [{ name: 'blood', current: 12, max: 12 }, { name: 'wound', current: 6, max: 6 }, { name: 'endurance', current: 37, max: 37 }, { name: 'memo', current: '메모', max: '' }]);
    const c2 = mk('c2', '렌', [{ name: 'hp', current: 7, max: 9 }]);
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([__c1, c2]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]), activePage: () => null };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true; window.campaign_id = 778;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const speak = async v => { await p.selectOption('#speakingas', v); await p.waitForTimeout(250); };
  const board = () => p.evaluate(() => { const b = document.getElementById('r20-vb'); return b ? [...b.querySelectorAll('.vs span')].map(s => s.querySelector('b').textContent + ' ' + s.querySelector('i').textContent).join(' | ') : '(없음)'; });
  await speak('character|c1');
  console.log('정하기 전:', await board());
  // 값 알림 창에서 '판' 칸
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.click('#r20be .r20be-row[data-id="c1"]'); await p.waitForTimeout(200);
  await p.click('#r20be .r20be-awbtn'); await p.waitForSelector('#r20be .r20be-aw .aw-v');
  // 📊 단추: 자주 쓰는 값(최대값 있는 것)은 바로 · 그 밖의 값은 찾기로
  const tick = async name => { await p.evaluate(nm => [...document.querySelectorAll('#r20be .r20be-aw .aw-v')].find(r => r.dataset.a === nm).querySelectorAll('.aw-tg')[1].click(), name); await p.waitForTimeout(100); };
  const rename = async (a, v) => { await p.evaluate(a => [...document.querySelectorAll('#r20be .r20be-aw .aw-v')].find(r => r.dataset.a === a).querySelector('.aw-name').click(), a); await p.fill('#r20be .r20be-aw .aw-v input.aw-in', v); await p.keyboard.press('Enter'); await p.waitForTimeout(150); };
  await tick('blood'); await tick('wound'); await tick('endurance');
  console.log('값 목록에 aio_board 안 보임:', await p.$$eval('#r20be .r20be-aw .aw-v', rs => !rs.some(x => x.dataset.a === 'aio_board')));
  await rename('blood', '혈'); await rename('wound', '상');
  console.log('판:', await board(), '| 저장:', await p.evaluate(() => __c1.attribs.byName('aio_board').get('current')));
  if (SHOT) { await p.$eval('#r20be', e => e.classList.remove('r20be-show')); await p.waitForTimeout(100); await p.screenshot({ path: SHOT + '/vb.png', clip: { x: 0, y: 0, width: 560, height: 150 } }); await p.$eval('#r20be', e => e.classList.add('r20be-show')); }
  await p.evaluate(() => __c1.attribs.byName('blood').save({ current: 9 })); await p.waitForTimeout(150);
  console.log('혈 12→9:', await board());
  await speak('character|c2'); console.log('렌으로 (정한 값 없음):', await board());
  await speak('player|me'); console.log('GM 으로:', await board());
  await speak('character|c1'); console.log('다시 하루카:', await board());
  await tick('wound'); console.log('상 뺌:', await board());
  // 자리: 내 포트레이트 옆 (세로로 늘어선 포트레이트면 오른쪽 위) · 끌어 옮기면 그 자리 · 두 번 누르면 다시 포트레이트 옆
  await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="avatarContainer"><div class="player" id="player_me" style="position:fixed;left:20px;top:50px;width:120px;height:120px;background:#667"></div></div>'); document.body.classList.add('r20pz-col'); });
  await p.waitForTimeout(400);
  const at = () => p.$eval('#r20-vb', e => { const r = e.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)}`; });
  console.log('포트레이트(20,50 · 120px · 가로로 늘어섬 · 위쪽) 바로 아래:', await at());
  await p.evaluate(() => { localStorage.setItem('r20_vb_pos', '[300,200]'); document.getElementById('sidebarcontrol').append(document.createElement('i')); }); await p.waitForTimeout(1500);
  console.log('끌어 옮긴 자리:', await at());
  await p.$eval('#r20-vb', e => e.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))); await p.waitForTimeout(100);
  console.log('두 번 누름 → 다시 옆:', await at());
  // 설정 탭
  await p.click('#r20be .r20be-segS'); await p.waitForTimeout(150);
  console.log('설정 화면:', await p.$eval('#r20be', e => e.classList.contains('r20be-setmode')), '| 줄이 창 안에:', await p.$eval('#custom-settings-popup', e => !!e.closest('#r20be .r20be-sethost') && e.getBoundingClientRect().height > 100),
    '| 갈래:', await p.$$eval('#r20be .r20be-setnav button', bs => bs.map(x => x.textContent).join(' · ')));
  console.log('값 판 스위치:', await p.$$eval('#custom-settings-popup .cs-row', rs => rs.some(r => /캐릭터 값 판/.test(r.textContent))));
  await p.$eval('#custom-settings-popup .cs-row:has(.cs-name) input[aria-label="캐릭터 값 판"]', i => i.click()); await p.waitForTimeout(200);
  console.log('끔:', await board());
  await p.$eval('#custom-settings-popup input[aria-label="캐릭터 값 판"]', i => i.click()); await p.waitForTimeout(200);
  console.log('켬:', await board());
  if (SHOT) await p.screenshot({ path: SHOT + '/set.png' });
  await p.click('#r20be .r20be-seg button:has-text("저널")'); await p.waitForTimeout(100);
  console.log('저널 탭으로:', await p.$eval('#r20be', e => !e.classList.contains('r20be-setmode')), '| 목록 보임:', await p.$eval('#r20be .r20be-body', e => e.getBoundingClientRect().height > 50));
  await p.$eval('#custom-settings-btn', x => x.click()); await p.waitForTimeout(150);
  console.log('⚙ 누름 → 설정:', await p.$eval('#r20be', e => e.classList.contains('r20be-show') && e.classList.contains('r20be-setmode')));
  await p.$eval('#custom-settings-btn', x => x.click()); await p.waitForTimeout(100);
  console.log('⚙ 다시 → 닫힘:', await p.$eval('#r20be', e => !e.classList.contains('r20be-show')));
  console.log('errors:', errs); await b.close();
})();
