// v1.82 굴림표 묶음: 일괄 편집기(＋구분선 · ＋묶음 · 묶음 칩 · 묶음으로 옮기기 · 저장 순서) + 토큰 면 고르기 창 묶음 칩
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route(/files\.d20\.io/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#468"/></svg>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    let seq = 0;
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f),
      create: o => { const m = M('n' + (++seq), { ...o }, arr); arr.push(m); return m; } });
    const M = (id, a, home) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; },
      save(o) { if (o) Object.assign(a, o); }, destroy() { home.splice(home.indexOf(this), 1); } });
    const img = k => `https://files.d20.io/images/${k}/abc/thumb.png?1`;
    const items = [];
    [['웃음', 1], ['화남', 2], ['――― 네온 ―――', 0, ''], ['네온-웃음', 3], ['네온-화남', 4], ['――― 윈도우 ―――', 0, ''], ['윈도우-기본', 5]]
      .forEach(([name, k, av], i) => items.push(M('i' + i, { name, weight: av === '' ? 0 : 1, avatar: av === '' ? '' : img(k) }, items)));
    const tables = [];
    const t1 = M('t1', { name: 'NPC표', showplayers: false }, tables); t1.tableitems = coll(items); tables.push(t1);
    window.__img = img;
    window.Campaign = { get: k => k === 'journalfolder' || k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll(tables), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) };
    window.currentPlayer = { id: 'p1', macros: coll([]) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.evaluate(() => [...document.querySelectorAll('#r20be button')].find(x => x.textContent.trim() === '굴림표')?.click()); await p.waitForTimeout(400);
  await p.click('#r20be .r20be-row[data-id="t1"] [data-act="pick"]'); await p.waitForTimeout(300);
  const grid = () => p.$$eval('#r20be .r20be-tgrid > *', cs => cs.map(c => c.classList.contains('r20be-hd') ? '【' + (c.querySelector('input').value || '—') + ' ' + c.querySelector('.r20be-note').textContent + '】' : (c.querySelector('input')?.value ?? c.textContent) + (c.classList.contains('chk') ? '☑' : '')).join(' '));
  const chips = () => p.$$eval('#r20be .aio-gd-op', os => os.map(o => (o.getAttribute('aria-selected') === 'true' ? '*' : '') + o.querySelector('span').textContent + o.querySelector('b').textContent + (o.querySelector('img') ? '🖼' : '')).join(' · '));
  const pickG = async (scope, name) => { await p.click(scope + ' .aio-gd-btn'); await p.click(`${scope} .aio-gd-op:has(span:text-is("${name}"))`); await p.waitForTimeout(80); };
  console.log('처음:', await grid(), '| 칩:', await chips());
  await pickG('#r20be', '네온');
  console.log('네온 칩 →', await grid());
  // 네온을 보는 중에 항목 추가 → 네온 끝으로
  await p.click('#r20be button:has-text("항목 추가")'); await p.fill('#r20be .r20be-add textarea', '네온-새 | https://files.d20.io/images/9/abc/thumb.png?1');
  await p.click('#r20be .r20be-add button:has-text("추가")'); await p.waitForTimeout(100);
  console.log('네온에서 항목 추가 →', await grid());
  await pickG('#r20be', '전체');
  // 웃음 고르고 → 윈도우로 옮기기
  await p.click('#r20be .r20be-card:not(.r20be-hd) .r20be-cb2'); await p.waitForTimeout(80);
  await p.selectOption('#r20be .r20be-tbar select', { label: '윈도우' });
  await p.click('#r20be .r20be-tbar button:has-text("옮기기")'); await p.waitForTimeout(100);
  console.log('웃음 → 윈도우:', await grid());
  // 화남 고르고 ＋묶음 → 화남 앞에 새 묶음, 이름 '보스'
  await p.click('#r20be .r20be-card:not(.r20be-hd) .r20be-cb2'); await p.waitForTimeout(80);
  await p.click('#r20be button:has-text("＋묶음")'); await p.waitForTimeout(100);
  const foc = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') + '=' + document.activeElement?.value);
  await p.keyboard.type('보스'); await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  console.log('＋묶음(포커스 ' + foc + ') →', await grid(), '| 칩:', await chips());
  await p.click('#r20be button:has-text("＋구분선")'); await p.waitForTimeout(100);
  console.log('＋구분선(끝) →', await grid());
  if (SHOT) { await p.click('#r20be .r20be-card:not(.r20be-hd) .r20be-cb2'); await p.$eval('#r20be .r20be-tbar', e => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(100);
    await p.screenshot({ path: SHOT + '/tbl.png', clip: await p.$eval('#r20be .r20be-tbar', e => { const r = e.getBoundingClientRect(); return { x: r.x - 4, y: r.y - 4, width: Math.min(r.width + 8, 1000), height: 430 }; }) });
    await p.click('#r20be .r20be-card:not(.r20be-hd) .r20be-cb2'); }
  // 묶음 제목 ✕ → 항목은 앞 묶음으로
  await p.click('#r20be .r20be-hd:last-of-type button[aria-label="묶음 제목 지우기"]'); await p.waitForTimeout(100);
  console.log('끝 구분선 ✕ →', await grid());
  await p.click('#r20be button:has-text("저장")'); await p.waitForTimeout(1500);
  const saved = await p.evaluate(() => Campaign.rollabletables.get('t1').tableitems.models.map(m => m.get('name') + (m.get('weight') ? '' : '⁰')));
  console.log('저장된 굴림표:', saved.join(' / '));

  // ── 토큰 면 고르기 창: 그림 있는 항목 차례 = 면 (Roll20 이 묶음 제목 자리를 빈 면으로 넣지 않는 경우) ──
  const openSide = async (withBlank) => {
    await p.evaluate(withBlank => {
      document.querySelectorAll('.ui-dialog.side').forEach(d => d.remove());
      const its = Campaign.rollabletables.get('t1').tableitems.models;
      const sides = withBlank ? its.map(m => m.get('avatar')) : its.filter(m => m.get('avatar')).map(m => m.get('avatar'));
      const d = document.createElement('div');
      d.className = 'ui-dialog side'; d.style.cssText = 'position:absolute;left:100px;top:50px;width:400px;background:#fff';
      d.innerHTML = `<div class="ui-dialog-titlebar"><span class="ui-dialog-title">Choose Side</span></div><div class="ui-dialog-content"><div class="sidechoices">${sides.map((s, i) => `<div class="sidechoice" data-selected="${i === 0}">${s ? `<img src="${s.replace('thumb', 'med')}">` : '<img src="">'}</div>`).join('')}</div><div class="sideslider"></div></div><div class="ui-dialog-buttonset"><button>Choose</button></div>`;
      document.body.appendChild(d);
    }, withBlank);
    await p.waitForTimeout(800);
  };
  const sv = () => p.$$eval('.ui-dialog.side .sidechoice', cs => cs.filter(c => getComputedStyle(c).display !== 'none').map(c => c.dataset.n).join(','));
  const schips = () => p.$$eval('.r20cs-grps .aio-gd-op', os => os.map(o => (o.getAttribute('aria-selected') === 'true' ? '*' : '') + o.querySelector('span').textContent + o.querySelector('b').textContent + (o.querySelector('img') ? '🖼' : '')).join(' · '));
  await p.evaluate(() => { document.querySelector('#r20be').style.setProperty('display', 'none', 'important'); });
  await openSide(false);
  console.log('면 창 칩:', await schips(), '| 보이는 면:', await sv());
  await pickG('.r20cs-grps', '네온');
  console.log('네온 →', await sv(), '| 번호 글:', await p.$eval('.ui-dialog.side .sidechoice:not([hidden])', c => getComputedStyle(c, '::after').content));
  if (SHOT) await p.screenshot({ path: SHOT + '/side.png', clip: await p.$eval('.ui-dialog.side', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 420) }; }) });
  await openSide(true);
  console.log('빈 면 섞인 토큰 · 다시 열기(기억) →', await schips(), '| 보이는 면:', await sv(), '| 숨긴 빈 면:', await p.$$eval('.r20cs-hdside', cs => cs.map(c => c.dataset.n).join(',')));
  console.log('errors:', errs); await b.close();
})();
