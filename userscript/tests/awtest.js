// v1.99 값 변화 알림: 일괄 편집기 캐릭터 → [🔔 값 알림] → 지켜볼 캐릭터 · 알릴 값(고르기 · ＊ 전부 · 직접 쓰기 · 예시)
// 값이 바뀌면 채팅에 (캐릭터 이름 · 설명 줄 · GM 귓속말) · 최대값 · 새로 생긴 값 · 한꺼번에 생긴 값은 안 알림 · 쓰던 글 그대로 · 굴림 글자 풀기 · 끄기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"><div id="textchat-input"><textarea></textarea><button id="chatSendBtn">보내기</button></div></div>'
      + '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    window.__chat = [];
    document.getElementById('chatSendBtn').addEventListener('click', () => { const ta = document.querySelector('#textchat-input textarea'); __chat.push(ta.value); ta.value = ''; });
    let n = 0;
    const M = a => { const m = { id: a.id || 'n' + (++n), cid: 'c' + (a.id || n), attributes: a, get: k => m.attributes[k], set() {}, save(o) { if (o) Object.assign(m.attributes, o); }, on() {}, off() {}, _getLatestBlob(f, cb) { cb(''); }, toJSON: () => ({ ...m.attributes }) }; return m; };
    const coll = arr => ({ models: arr, length: arr.length, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), create(o) { const m = M({ ...o }); arr.push(m); return m; } });
    // Backbone 처럼: 값을 바꾸면 change:current · change:max, 새로 생기면 add
    const AC = () => { const hs = {}; const c = { models: [], on(e, f) { (hs[e] = hs[e] || []).push(f); }, off(e, f) { hs[e] = (hs[e] || []).filter(x => x !== f); }, fire(e, ...a) { (hs[e] || []).slice().forEach(f => f(...a)); }, count: e => (hs[e] || []).length,
      add(a) { const m = { id: 'a' + (++n), attributes: { ...a }, _prev: {}, get: k => m.attributes[k], previous: k => m._prev[k],
        set(o) { m._prev = { ...m.attributes }; Object.assign(m.attributes, o); Object.keys(o).forEach(k => c.fire('change:' + k, m, o[k])); } }; c.models.push(m); c.fire('add', m, c); return m; },
      byName: k => c.models.find(m => m.get('name') === k) }; return c; };
    const c1 = M({ id: 'c1', name: '하루카', controlledby: 'p2' }); c1.attribs = AC(); c1.abilities = coll([]);
    // 시트를 연 적 없는 캐릭터: 받아 오라고 해야 온다
    c1.attribs.fetch = () => { window.__fetch = (window.__fetch || 0) + 1; setTimeout(() => [{ name: 'hp', current: 10, max: 12 }, { name: 'mp', current: 3, max: 5 }, { name: 'san', current: 50, max: '' },
      { name: 'Magic_01_Name', current: '긴급소환', max: '' }, { name: 'Magic_01_Charge', current: 2, max: '' }, { name: 'Magic_02_Name', current: '화염 [[1d6]]', max: '' }, { name: 'Magic_02_Charge', current: 0, max: '' }].forEach(a => c1.attribs.add(a)), 100); };
    const c2 = M({ id: 'c2', name: '렌', controlledby: 'p3' }); c2.attribs = AC(); c2.abilities = coll([]); c2.attribs.add({ name: 'hp', current: 7, max: 9 });
    window.__c1 = c1; window.__c2 = c2;
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([c1, c2]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]), activePage: () => null };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true; window.campaign_id = 777;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.click('#r20be .r20be-row[data-id="c1"]'); await p.waitForTimeout(200);
  await p.click('#r20be .r20be-ph .r20be-awbtn');
  const AW = '#r20be .r20be-aw';
  await p.waitForFunction(() => document.querySelectorAll('#r20be .r20be-aw .aw-pick').length >= 7, null, { timeout: 8000 });
  console.log('칸:', await p.$eval(AW, e => e.querySelector('.hd').innerText.replace(/\s+/g, ' ').trim()), '| 받아 오기:', await p.evaluate(() => __fetch), '번');
  console.log('값 목록:', await p.$$eval(AW + ' .aw-pick', rs => rs.map(r => r.querySelector('span').textContent + '=' + r.querySelector('small').textContent).join(' | ')));
  // 지켜보기 + 값 고르기
  await p.click(AW + ' .aw-sec .pri');
  const pick = async name => { await p.evaluate(nm => [...document.querySelectorAll('#r20be .r20be-aw .aw-pick')].find(r => r.querySelector('span').textContent === nm).querySelector('input').click(), name); await p.waitForTimeout(80); };
  await pick('hp'); await pick('Magic_01_Charge');
  const rows = () => p.$$eval(AW + ' .aw-row', rs => rs.map(r => [...r.querySelectorAll('input')].map(i => i.value).join(' → ') + (r.querySelector('.aio-btn') ? ' [＊]' : '')).join(' | '));
  console.log('고름:', await rows(), '| 캐릭터:', await p.$$eval(AW + ' .aw-chips .aio-chip', cs => cs.map(c => c.textContent).join(',')));
  await p.click(AW + ' .aw-row:nth-child(2) .aio-btn'); await p.waitForTimeout(80);
  console.log('＊ 전부:', await rows());
  console.log('목록 표시:', await p.$$eval(AW + ' .aw-pick', rs => rs.filter(r => r.querySelector('input').checked).map(r => r.querySelector('span').textContent + (r.querySelector('input').disabled ? '(＊)' : '')).join(' ')));
  console.log('왼쪽 줄 · 단추:', await p.$eval('#r20be .r20be-row[data-id="c1"]', e => /🔔/.test(e.textContent)), '·', await p.$eval('#r20be .r20be-awbtn', e => e.textContent));
  if (SHOT) await p.screenshot({ path: SHOT + '/aw.png', clip: await p.$eval(AW, e => { const r = e.getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 }; }) });
  const chat = async () => { await p.waitForTimeout(700); return p.evaluate(() => { const c = __chat.slice(); __chat.length = 0; return c.join(' ‖ ') || '(없음)'; }); };
  const set = (cid, name, o) => p.evaluate(([cid, name, o]) => window['__' + cid].attribs.byName(name).set(o), [cid, name, o]);
  await p.fill('#textchat-input textarea', '쓰던 글');
  await set('c1', 'hp', { current: 8 });
  console.log('hp 10→8:', await chat(), '| 입력칸:', await p.$eval('#textchat-input textarea', e => e.value));
  await set('c1', 'Magic_02_Charge', { current: 3 });
  console.log('장서 충전 (이름으로 · 굴림 글자 풀기):', await chat());
  await set('c1', 'hp', { max: 14 });
  console.log('최대값:', await chat());
  await set('c1', 'san', { current: 49 }); await set('c2', 'hp', { current: 1 });
  console.log('안 고른 값 · 안 지켜보는 캐릭터:', await chat());
  await set('c1', 'hp', { current: 7 }); await set('c1', 'hp', { current: 6 }); await set('c1', 'mp', { current: 9 }); await set('c1', 'Magic_01_Charge', { current: 5 });
  console.log('연달아 (한 줄로 · 처음→마지막):', await chat());
  // 직접 쓰기 + 새로 생긴 값
  await p.click(AW + ' .aw-sec button:has-text("줄 추가")');
  await p.fill(AW + ' .aw-row:last-child input:nth-child(1)', 'temp_mp'); await p.fill(AW + ' .aw-row:last-child input:nth-child(2)', '일시적 마력'); await p.keyboard.press('Tab');
  await p.evaluate(() => __c1.attribs.add({ name: 'temp_mp', current: 2, max: '' }));
  console.log('새로 생긴 값:', await chat());
  await p.evaluate(() => { for (let i = 3; i <= 10; i++) __c1.attribs.add({ name: `Magic_0${i}_Charge`, current: 1, max: '' }); });
  console.log('한꺼번에 8개 생김:', await chat());
  // 보이기 방식
  await p.click(AW + ' .mode label:nth-child(2) input'); await set('c1', 'hp', { current: 5 });
  console.log('설명 줄:', await chat());
  await p.click(AW + ' .mode label:nth-child(3) input'); await set('c1', 'hp', { current: 4 });
  console.log('GM 에게만:', await chat());
  console.log('저장:', await p.evaluate(() => localStorage.getItem('r20_aw_777')));
  // 끄기 · 다시 켜기 · 캐릭터 빼기
  await p.click(AW + ' .aw-sw'); await set('c1', 'hp', { current: 3 });
  console.log('끔:', await chat(), '| 듣는 곳:', await p.evaluate(() => __c1.attribs.count('change:current')));
  await p.click(AW + ' .aw-sw'); await p.waitForTimeout(100); await set('c1', 'hp', { current: 2 });
  console.log('다시 켬:', await chat());
  await p.click(AW + ' .aw-chips .aio-chip'); await set('c1', 'hp', { current: 1 });
  console.log('캐릭터 뺌:', await chat(), '| 듣는 곳:', await p.evaluate(() => __c1.attribs.count('change:current')), '| 단추:', await p.$eval('#r20be .r20be-awbtn', e => e.textContent));
  await p.click(AW + ' .aw-sec button:has-text("마기카로기아")'); await p.waitForTimeout(80);
  console.log('예시 넣은 뒤 줄 수:', await p.$$eval(AW + ' .aw-row', rs => rs.length));
  // 다른 캐릭터로 열면 그 캐릭터의 값 · 같은 단추를 다시 누르면 닫힘
  await p.click('#r20be .r20be-row[data-id="c2"]'); await p.waitForTimeout(150); await p.click('#r20be .r20be-awbtn'); await p.waitForTimeout(150);
  console.log('렌으로:', await p.$eval(AW + ' .aw-sec .pri', e => e.textContent), '|', await p.$$eval(AW + ' .aw-pick', rs => rs.map(r => r.querySelector('span').textContent + '=' + r.querySelector('small').textContent).join(' ')));
  await p.click('#r20be .r20be-awbtn'); await p.waitForTimeout(80);
  console.log('다시 누름 → 닫힘:', await p.$eval(AW, e => e.hidden));
  console.log('errors:', errs); await b.close();
})();
