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
  await p.waitForFunction(() => document.querySelectorAll('#r20be .r20be-aw .aw-v').length >= 3, null, { timeout: 8000 });
  const vals = () => p.$$eval(AW + ' .aw-v', rs => rs.map(r => r.querySelector('.aw-name b').textContent + '=' + r.querySelector('.cur').textContent
    + [...r.querySelectorAll('.aw-tg')].map(b => b.getAttribute('aria-pressed') === 'true' ? b.textContent : '').join('')).join(' | '));
  console.log('칸:', await p.$eval(AW + ' .hd b', e => e.textContent), '| 받아 오기:', await p.evaluate(() => __fetch), '번 | 지켜보기:', await p.$eval(AW + ' .aw-top .aw-sw', e => e.getAttribute('aria-checked')));
  console.log('값:', await vals());
  console.log('설명 글 없음 (말풍선으로):', await p.$eval(AW, e => !e.querySelector('small, .aw-gh, .aw-cols') && !e.innerText.includes('*id*')), '| 말풍선:', await p.$eval(AW + ' .aw-v[data-a="mp"] .aw-name', e => e.title.slice(0, 20)));
  // 지켜보기만 켜면 기본값(마기카로기아 기본값 · 최대값 있는 값 · 줄마다 있는 값)은 다 알린다
  const tg = async (a, k = 0) => { await p.evaluate(([a, k]) => [...document.querySelectorAll('#r20be .r20be-aw .aw-v')].find(r => r.dataset.a === a).querySelectorAll('.aw-tg')[k].click(), [a, k]); await p.waitForTimeout(100); };
  await p.click(AW + ' .aw-top .aw-sw'); await p.waitForTimeout(200);
  console.log('지켜보기 켠 뒤:', await vals());
  await tg('atk');
  console.log('공격력만 끔:', (await vals()).split(' | ').filter(x => /공격력|방어력/.test(x)).join(' | '));
  console.log('왼쪽 줄 · 단추:', await p.$eval('#r20be .r20be-row[data-id="c1"]', e => /🔔/.test(e.textContent)), '·', await p.$eval('#r20be .r20be-awbtn', e => e.textContent), '|', await p.$eval(AW + ' .ft .r20be-note', e => e.textContent + ' ‹' + e.title + '›'));
  // 보일 이름 고치기: 이름을 누르면 칸으로
  await p.evaluate(() => [...document.querySelectorAll('#r20be .r20be-aw .aw-v')].find(r => r.dataset.a === 'hp').querySelector('.aw-name').click());
  await p.fill(AW + ' .aw-v input.aw-in', '체력'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  console.log('이름 고침:', (await vals()).split(' | ').find(x => x.startsWith('체력')));
  if (SHOT) await p.screenshot({ path: SHOT + '/aw.png', clip: await p.$eval(AW, e => { const r = e.getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 }; }) });
  const chat = async () => { await p.waitForTimeout(700); return p.evaluate(() => { const c = __chat.slice(); __chat.length = 0; return c.join(' ‖ ') || '(없음)'; }); };
  const set = (cid, name, o) => p.evaluate(([cid, name, o]) => window['__' + cid].attribs.byName(name).set(o), [cid, name, o]);
  await p.fill('#textchat-input textarea', '쓰던 글');
  await set('c1', 'hp', { current: 8 });
  console.log('hp 10→8:', await chat(), '| 입력칸:', await p.$eval('#textchat-input textarea', e => e.value));
  await set('c1', 'Magic_02_Charge', { current: 3 });
  console.log('장서 충전 (줄 이름으로 · 굴림 글자 풀기):', await chat());
  await set('c1', 'hp', { max: 14 });
  console.log('최대값:', await chat());
  await set('c1', 'san', { current: 49 }); await set('c2', 'hp', { current: 1 });
  console.log('안 고른 값 · 안 지켜보는 캐릭터:', await chat());
  await set('c1', 'hp', { current: 7 }); await set('c1', 'hp', { current: 6 }); await set('c1', 'Magic_01_Charge', { current: 5 });
  console.log('연달아 (한 줄로 · 처음→마지막):', await chat());
  // 아직 시트에 없는 값(마기카로기아 기본값)도 켜져 있다 → 처음 생길 때 알림
  await p.evaluate(() => __c1.attribs.add({ name: 'temp_mp', current: 2, max: '' }));
  console.log('새로 생긴 값:', await chat());
  await p.evaluate(() => { for (let i = 3; i <= 10; i++) __c1.attribs.add({ name: `Magic_0${i}_Charge`, current: 1, max: '' }); });
  console.log('한꺼번에 8개 생김:', await chat());
  // 찾기로 그 밖의 값 꺼내기
  await p.fill(AW + ' .aw-q', 'san'); await p.waitForTimeout(100);
  console.log('찾기 san:', await p.$$eval(AW + ' .aw-q ~ .aw-v', rs => rs.map(r => r.dataset.a).join(',')), '| 찾기 칸 포커스 유지:', await p.evaluate(() => document.activeElement?.classList.contains('aw-q')));
  await tg('san'); await set('c1', 'san', { current: 48 });
  console.log('찾아서 켠 값:', await chat());
  // 올리는 방식
  await p.selectOption(AW + ' select.aw-how', 'desc'); await set('c1', 'hp', { current: 5 });
  console.log('설명 줄:', await chat());
  await p.selectOption(AW + ' select.aw-how', 'gm'); await set('c1', 'hp', { current: 4 });
  console.log('GM 에게만:', await chat());
  console.log('저장:', await p.evaluate(() => localStorage.getItem('r20_aw_777')));
  // 전체 끄기 · 다시 켜기 · 지켜보기 끄기
  await p.click(AW + ' .ft .aw-sw'); await set('c1', 'hp', { current: 3 });
  console.log('전체 끔:', await chat(), '| 듣는 곳:', await p.evaluate(() => __c1.attribs.count('change:current')));
  await p.click(AW + ' .ft .aw-sw'); await p.waitForTimeout(100); await set('c1', 'hp', { current: 2 });
  console.log('다시 켬:', await chat());
  await p.click(AW + ' .aw-top .aw-sw'); await set('c1', 'hp', { current: 1 });
  console.log('지켜보기 끔:', await chat(), '| 듣는 곳:', await p.evaluate(() => __c1.attribs.count('change:current')), '| 단추:', await p.$eval('#r20be .r20be-awbtn', e => e.textContent));
  // 여러 명 한꺼번에: 왼쪽에서 체크 → [🔔 지켜보기 2명]
  await p.click('#r20be .r20be-row[data-id="c1"] [data-act="check"]'); await p.click('#r20be .r20be-row[data-id="c2"] [data-act="check"]'); await p.waitForTimeout(150);
  console.log('여럿 고름:', await p.$eval('#r20be .r20be-awmany', e => e.textContent));
  await p.click('#r20be .r20be-awmany'); await p.waitForTimeout(400);
  console.log('한꺼번에 켠 뒤:', await p.evaluate(() => JSON.parse(localStorage.getItem('r20_aw_777')).chars.join(',')), '·', await p.$eval('#r20be .r20be-awmany', e => e.textContent));
  await set('c2', 'hp', { current: 5 });
  console.log('렌 hp (최대값 있는 값 → 저절로 알림):', await chat());
  await p.click('#r20be .r20be-row[data-id="c1"] [data-act="check"]'); await p.click('#r20be .r20be-row[data-id="c2"] [data-act="check"]'); await p.waitForTimeout(150);
  // 다른 캐릭터로 열면 그 캐릭터의 값 · 같은 단추를 다시 누르면 닫힘
  await p.click('#r20be .r20be-row[data-id="c2"]'); await p.waitForTimeout(150); await p.click('#r20be .r20be-awbtn'); await p.waitForTimeout(200);
  console.log('렌으로:', await p.$eval(AW + ' .hd b', e => e.textContent), '|', await vals());
  await p.click(AW + ' .ft .aio-btn'); await p.waitForTimeout(80);
  console.log('[닫기] → 닫힘:', await p.$eval(AW, e => e.hidden));
  console.log('errors:', errs); await b.close();
})();
