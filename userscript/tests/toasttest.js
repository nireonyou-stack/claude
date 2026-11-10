// v1.84 공용 알림(aioToast): 쌓기(최대 3) · 같은 id 바꿔 쓰기 · ok 자동 사라짐 · 마우스 올리면 멈춤 · err 남음 · 되돌리기 · 채팅 판 피하기 · 일괄 편집기 연결
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
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px;background:#eee"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const list = () => p.$$eval('#aio-toasts .aio-t', ts => ts.map(t => `${t.className.replace('aio-t ', '')}:${t.querySelector('.m').textContent}${[...t.querySelectorAll('button.a')].map(b => '[' + b.textContent + ']').join('')}`).join(' | '));
  // aioToast 는 스크립트 안 상수라 일괄 편집기 · 알림을 쓰는 길로 부른다 → 시험용으로 창에서 꺼낼 수 없으니, 바로 보이는 길(일괄 편집기 setStatus)과 이벤트로 확인
  await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  // 일괄 편집기에서 굴림표 탭(없으면 안내 알림) → info 알림
  await p.evaluate(() => { Campaign.rollabletables = null; });
  await p.click('#r20be .r20be-seg button:has-text("굴림표")'); await p.waitForTimeout(100);
  console.log('일괄 편집기 안내 →', await list(), '| 창 아래 줄:', await p.$eval('#r20be .r20be-foot', e => e.textContent.slice(0, 20) + '…'));
  const box = await p.$eval('#aio-toasts', e => { const r = e.getBoundingClientRect(), t = e.firstElementChild.getBoundingClientRect(); return { right: Math.round(innerWidth - r.right), center: Math.round((t.left + t.right) / 2), role: e.firstElementChild.getAttribute('role') }; });
  console.log('자리: 채팅 판 왼쪽까지', box.right, 'px 비움 · 가운데', box.center, '(맵 가운데', (1366 - 300) / 2, ') · role', box.role);
  // 부품 자체: 스크립트 글에서 aioToast 를 꺼내 페이지에서 따로 돌린다 (CSS 는 이미 올라감)
  const src = us.slice(us.indexOf('const aioToast = (() => {'), us.indexOf('})();', us.indexOf('const aioToast = (() => {')) + 5);
  await p.evaluate(src => { window.T = new Function('aioErr', src + '\nreturn aioToast;')(() => {}); }, src);
  await p.evaluate(() => document.querySelectorAll('#aio-toasts .aio-t').forEach(t => t.remove()));
  await p.evaluate(() => { window.T('저장 중…', { kind: 'busy', id: 's' }); });
  await p.evaluate(() => { window.T('2건 저장 실패 — 단서3', { kind: 'err', id: 's', act: [{ label: '자세히', fn() {} }] }); });
  console.log('같은 id 바꿔 쓰기:', await list());
  await p.evaluate(() => { ['하나', '둘', '셋'].forEach(m => window.T(m, { kind: 'ok', ms: 600 })); });
  console.log('넷 → 최대 3개:', await list());
  await p.hover('#aio-toasts .aio-t:last-child'); await p.waitForTimeout(900);
  console.log('0.9초 뒤 (마지막 것에 마우스):', await list());
  await p.mouse.move(5, 5); await p.waitForTimeout(2700);
  console.log('마우스 뗀 뒤 2.7초:', await list());
  let undone = 0; await p.exposeFunction('undone', () => { undone++; });
  await p.evaluate(() => window.T('변경 4건을 저장했어요', { kind: 'ok', undo: () => window.undone() }));
  if (SHOT) await p.screenshot({ path: SHOT + '/toast.png', clip: { x: 200, y: 600, width: 760, height: 168 } });
  await p.click('#aio-toasts .aio-t:last-child button.a'); await p.waitForTimeout(100);
  console.log('되돌리기 누름 → 불림', undone, '번 · 남은 알림:', await list());
  await p.evaluate(() => window.T('실패 하나', { kind: 'err' }));
  await p.click('#aio-toasts .aio-t button.x'); await p.waitForTimeout(50);
  console.log('✕ 닫기 →', JSON.stringify(await list()));
  console.log('errors:', errs); await b.close();
})();
