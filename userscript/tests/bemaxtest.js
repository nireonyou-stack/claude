// v1.119.0 일괄 편집기 머리줄 ⛶ 최대화 / ❐ 이전 크기 (Aa 와 ✕ 사이) · 닫았다 열어도 최대화 · 옮기거나 크기를 바꾸면 풀림
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('r20be_rect', JSON.stringify({ left: '100px', top: '80px', width: '900px', height: '560px' }));
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>';
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const ok = (label, got, want) => console.log((JSON.stringify(got) === JSON.stringify(want) ? '✓ ' : '✗ ') + label, JSON.stringify(got));
  const rect = () => p.$eval('#r20be', e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); });
  const btn = () => p.$eval('#r20be .r20be-max', b => [b.textContent, b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]);
  await p.click('#r20-bebtn'); await p.waitForTimeout(200);
  const before = await rect();
  ok('보통 때 단추 ⛶ 최대화', await btn(), ['⛶', '최대화', 'false']);
  ok('Aa 와 ✕ 사이', await p.$eval('#r20be .r20be-max', b => [b.previousElementSibling?.classList.contains('r20be-aa'), b.nextElementSibling?.getAttribute('aria-label')]), [true, '닫기']);
  await p.click('#r20be .r20be-max'); await p.waitForTimeout(150);
  ok('최대화 → 여백 없이 꽉', await rect(), [0, 0, 1366, 768]);
  ok('최대화 때 단추 ❐ 이전 크기', await btn(), ['❐', '이전 크기', 'true']);
  // 닫았다 열어도 최대화
  await p.click('#r20be .r20be-head [aria-label="닫기"]'); await p.waitForTimeout(100); await p.click('#r20-bebtn'); await p.waitForTimeout(200);
  ok('닫았다 열어도 최대화', await rect(), [0, 0, 1366, 768]);
  await p.click('#r20be .r20be-max'); await p.waitForTimeout(150);
  ok('❐ → 최대화 전 자리 · 크기', await rect(), before);
  ok('단추 다시 ⛶', (await btn())[0], '⛶');
  // 최대화 중 머리줄을 끌면 풀림 (끈 자리 · 그때 크기가 새 보통)
  await p.click('#r20be .r20be-max'); await p.waitForTimeout(150);
  const h = await (await p.$('#r20be .r20be-head strong')).boundingBox();
  await p.mouse.move(h.x + 5, h.y + 5); await p.mouse.down(); await p.mouse.move(h.x + 60, h.y + 45, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(150);
  ok('최대화 중 끌기 → 풀림', [(await btn())[0], await p.evaluate(() => localStorage.getItem('r20be_max'))], ['⛶', '']);
  ok('창 크기 바꾸면 최대화 창도 따라감', await (async () => { await p.click('#r20be .r20be-max'); await p.setViewportSize({ width: 1200, height: 700 }); await p.waitForTimeout(200); return rect(); })(), [0, 0, 1200, 700]);
  // 페이지 스크롤 막대가 있어도 그 자리까지 (최대화 동안만 숨김)
  await p.evaluate(() => { document.body.style.cssText = 'margin:0;width:3000px;height:3000px'; window.dispatchEvent(new Event('resize')); }); await p.waitForTimeout(150);
  ok('스크롤 막대 숨기고 끝까지', [await rect(), await p.evaluate(() => getComputedStyle(document.documentElement).overflow)], [[0, 0, 1200, 700], 'hidden']);
  await p.click('#r20be .r20be-max'); await p.waitForTimeout(150);
  ok('이전 크기 → 스크롤 막대 되돌림', await p.evaluate(() => getComputedStyle(document.documentElement).overflow), 'visible');
  console.log('errors:', errs); await b.close();
})();
