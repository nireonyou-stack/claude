// v1.119.0 시트 · 핸드아웃 창 제목줄 ↺ 원래 크기 (× 바로 왼쪽): Roll20 이 처음 연 크기로 · 기억한 여는 폭 지움 · 되돌리기 · Roll20 단추와 겹치면 그 무리를 왼쪽으로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.addStyleTag({ content: '.ui-dialog .ui-dialog-title{width:auto}' });
  await p.evaluate(() => {
    localStorage.clear();
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <ul class="tabmenu"><li><a href="#textchat">💬</a></li><li><a href="#journal">📒</a></li></ul><div id="textchat"><div class="content"></div></div><div id="journal"></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    $('#rightsidebar').tabs();
    const mk = (id, a) => ({ id, attributes: a, get: k => a[k] });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([mk('h1', { name: '마녀의 편지' })]), characters: coll([mk('c1', { name: '리버트' }), mk('c2', { name: '키어런' })]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
    // Roll20 흉내: 창을 열 때마다 새 jQuery UI 창 (폭 420)
    window.__open = (kind, id, title) => { const $c = $(kind === 'char' ? `<div class="dialog characterdialog" data-characterid="${id}"><div style="height:900px">시트</div></div>` : `<div class="dialog" data-handoutid="${id}"><div style="height:300px">글</div></div>`);
      $c.dialog({ title, width: 420, height: 320, position: { my: 'left top', at: 'left+40 top+40', of: window }, close() { $c.dialog('destroy').remove(); } }); };
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const ok = (label, got, want) => console.log((JSON.stringify(got) === JSON.stringify(want) ? '✓ ' : '✗ ') + label, JSON.stringify(got));
  const dlg = t => `.ui-dialog:has(.ui-dialog-title:text-is("${t}"))`;
  const w = t => p.$eval(dlg(t), d => d.offsetWidth);
  const right = t => p.$eval(dlg(t), d => Math.round(d.getBoundingClientRect().right));
  const front = t => p.evaluate(t => { const d = [...document.querySelectorAll('.ui-dialog')].find(x => x.querySelector('.ui-dialog-title')?.textContent === t); $(d).find('.ui-dialog-content').dialog('moveToTop'); }, t);
  const opened = () => p.evaluate(() => JSON.parse(localStorage.getItem('r20_win_open') || '{}'));

  await p.evaluate(() => __open('char', 'c1', '리버트')); await p.waitForTimeout(500);
  const base = await w('리버트');
  ok('처음 연 크기를 Roll20 기본으로 적음', (await opened()).b?.char?.w, base);
  // ↺ 는 × 바로 왼쪽
  const pos = await p.$eval(dlg('리버트'), d => { const r = d.querySelector('.r20wm-rs').getBoundingClientRect(), x = d.querySelector('.ui-dialog-titlebar-close').getBoundingClientRect(), gap = x.left - r.right; return [gap >= 0 && gap <= 4, Math.abs(Math.round((r.top + r.bottom) / 2 - (x.top + x.bottom) / 2)) <= 2]; });
  ok('↺ 는 × 바로 왼쪽 (틈 0~4px · 높이 가운데)', pos, [true, true]);
  ok('↺ 이름 · 툴팁', await p.$eval(dlg('리버트') + ' .r20wm-rs', b => [b.getAttribute('aria-label'), b.title.startsWith('원래 크기')]), ['원래 크기', true]);
  // 크기를 바꾸면 폭 기억 → 다른 시트도 그 폭 → ↺ 로 원래대로 · 기억 지움
  const edge = await right('리버트');
  await p.evaluate(() => { const $c = $('.characterdialog[data-characterid="c1"]'); $c.dialog('option', 'width', 700); $c.trigger('dialogresizestop'); }); await p.waitForTimeout(150);
  const big = await w('리버트');
  ok('크기 바꿈 → 여는 폭 기억', (await opened()).w?.char, big);
  await p.click(dlg('리버트') + ' .ui-dialog-titlebar-close'); await p.evaluate(() => __open('char', 'c2', '키어런')); await p.waitForTimeout(500);
  ok('다른 시트도 그 폭으로', await w('키어런'), big);
  const edge2 = await right('키어런');
  await p.click(dlg('키어런') + ' .r20wm-rs'); await p.waitForTimeout(200);
  ok('↺ → 원래 폭', await w('키어런'), base);
  ok('↺ → 붙임 창은 오른쪽 끝 그대로', await right('키어런'), edge2);
  ok('↺ → 기억한 여는 폭 지움', (await opened()).w?.char ?? '없음', '없음');
  ok('알림 + 되돌리기', await p.$eval('#aio-toasts', t => [t.textContent.includes('원래 크기'), !!t.querySelector('button')]), [true, true]);
  await p.click('#aio-toasts button:text-is("되돌리기")'); await p.waitForTimeout(150);
  ok('되돌리기 → 그 전 폭 · 기억도', [await w('키어런'), (await opened()).w?.char], [big, big]);
  await p.click(dlg('키어런') + ' .r20wm-rs'); await p.waitForTimeout(150);
  await p.click(dlg('키어런') + ' .ui-dialog-titlebar-close'); await p.evaluate(() => __open('char', 'c1', '리버트')); await p.waitForTimeout(500);
  ok('다음에 여는 시트도 원래 크기', [await w('리버트'), await right('리버트')], [base, edge]);
  // 📌 켠 창: 기억한 크기도 원래 크기로
  await p.click(dlg('리버트') + ' .r20wm-pin'); await p.evaluate(() => { const $c = $('.characterdialog[data-characterid="c1"]'); $c.dialog('option', 'width', 650); $c.trigger('dialogresizestop'); }); await p.waitForTimeout(150);
  await p.click(dlg('리버트') + ' .r20wm-rs'); await p.waitForTimeout(150);
  ok('📌 켠 창 → 기억한 크기도 원래대로', await p.evaluate(() => JSON.parse(localStorage.getItem('r20_win_mem'))['char:c1'].g.w), base);
  // Roll20 단추가 × 옆 자리에 있으면 그 무리를 왼쪽으로 민다
  await p.evaluate(() => __open('handout', 'h1', '마녀의 편지')); await p.waitForTimeout(100);
  await p.evaluate(() => { const bar = [...document.querySelectorAll('.ui-dialog')].find(x => x.textContent.includes('마녀의 편지')).querySelector('.ui-dialog-titlebar');
    bar.insertAdjacentHTML('beforeend', '<button class="btn r20edit" style="position:absolute;right:30px;top:6px;width:40px;height:24px">Edit</button><button class="btn r20show" style="position:absolute;right:74px;top:6px;width:110px;height:24px">Show to Players</button>'); });
  await p.waitForTimeout(900);
  const lay = await p.$eval(dlg('마녀의 편지'), d => { const r = d.querySelector('.r20wm-rs').getBoundingClientRect(), e = d.querySelector('.r20edit').getBoundingClientRect(), s = d.querySelector('.r20show').getBoundingClientRect(); return [e.right <= r.left, s.right <= e.left]; });
  ok('겹치던 Roll20 단추 무리를 왼쪽으로 (차례 그대로)', lay, [true, true]);
  // 좁은 창: 왼쪽 📌 · 자리 단추와 겹치면 그 뒤에 나란히 (📌 를 누를 수 있게)
  await front('리버트'); await p.evaluate(() => { const $c = $('.characterdialog[data-characterid="c1"]'); $c.dialog('option', 'width', 150); $c.trigger('dialogresizestop'); }); await p.waitForTimeout(150);
  ok('좁은 창 → ↺ 가 📌 · 자리 단추를 가리지 않음', await p.$eval(dlg('리버트'), d => { const r = d.querySelector('.r20wm-rs').getBoundingClientRect(); return [...d.querySelectorAll('.r20wm-pin, .r20wm-dock')].some(e => { const q = e.getBoundingClientRect(); return q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; }); }), false);
  await p.click(dlg('리버트') + ' .r20wm-pin', { timeout: 3000 }); ok('좁은 창에서도 📌 눌림', true, true);
  // 그 밖의 Roll20 창에는 ↺ 없음
  await p.evaluate(() => $('<div>설정</div>').dialog({ title: '토큰 설정', width: 300 })); await p.waitForTimeout(400);
  ok('토큰 설정 창 → ↺ 없음', !(await p.$(dlg('토큰 설정') + ' .r20wm-rs')), true);
  console.log('errors:', errs); await b.close();
})();
