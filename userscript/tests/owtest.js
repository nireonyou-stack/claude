// v1.114.0 시트 · 핸드아웃은 단추줄 바로 밑(빠른 찾기 붙이는 자리)에서 열림 — 여는 자리만, 열린 뒤엔 자유롭게 · 여럿은 같은 자리에 겹침
// 제목줄 ◨ 붙임 / ❐ 떠 있기 (기억) · 크기를 바꾸면 폭 기억 · 📌 기억한 자리가 먼저 · 서랍이 열려 있으면 서랍 왼쪽 끝 · 그 밖의 Roll20 창은 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.addStyleTag({ content: '.ui-dialog .ui-dialog-title{width:auto}' });       // Roll20 은 제목 폭을 정하지 않는다 (jQuery UI 기본 90% 를 지움)
  await p.evaluate(() => {
    localStorage.clear();
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <ul class="tabmenu"><li><a href="#textchat">💬</a></li><li><a href="#journal">📒</a></li><li id="jukeboxtab"><a href="#jukebox">♪</a></li></ul>
        <div id="textchat"><div class="content"></div></div><div id="journal"></div><div id="jukebox"></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    $('#rightsidebar').tabs();
    const mk = (id, a) => ({ id, attributes: a, get: k => a[k] });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([mk('h1', { name: '마녀의 편지' })]), characters: coll([mk('c1', { name: '리버트' }), mk('c2', { name: '키어런' })]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
    // Roll20 흉내: 창을 열 때마다 새 jQuery UI 창 (기본 자리 왼쪽 위)
    window.__open = (kind, id, title) => { const $c = $(kind === 'char' ? `<div class="dialog characterdialog" data-characterid="${id}"><div style="height:900px">시트</div></div>` : `<div class="dialog" data-handoutid="${id}"><div style="height:900px">핸드아웃</div></div>`);
      $c.dialog({ title, width: 420, height: 320, position: { my: 'left top', at: 'left+40 top+40', of: window }, close() { $c.dialog('destroy').remove(); } }); };
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const dlg = t => `.ui-dialog:has(.ui-dialog-title:text-is("${t}"))`;
  const g = t => p.$eval(dlg(t), d => { const r = d.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round).join(','); });
  const spot = () => p.evaluate(() => { const s = document.getElementById('rightsidebar').getBoundingClientRect(), q = document.getElementById('r20-qfbtn').getBoundingClientRect(); return '채팅 왼쪽 ' + Math.round(s.left) + ' · 🔍 밑 ' + Math.round(q.bottom); });
  // 같은 자리에 겹치므로 누르기 전에 그 창을 맨 앞으로 (Roll20 에선 저널에서 그 항목을 다시 누르면 앞으로 옴)
  const front = t => p.evaluate(t => { const d = [...document.querySelectorAll('.ui-dialog')].find(x => x.querySelector('.ui-dialog-title')?.textContent === t); $(d).find('.ui-dialog-content').dialog('moveToTop'); }, t);
  const close = async t => { await front(t); await p.click(dlg(t) + ' .ui-dialog-titlebar-close'); };
  console.log('붙는 자리:', await spot());
  await p.evaluate(() => __open('char', 'c1', '리버트')); await p.waitForTimeout(500);
  console.log('시트 열기 →', await g('리버트'), '| 제목줄:', await p.$eval(dlg('리버트'), d => [...d.querySelectorAll('.r20wm-pin, .r20wm-dock button')].map(x => x.textContent + (x.getAttribute('aria-pressed') === 'true' ? '✓' : '')).join(' ')));
  await p.evaluate(() => __open('handout', 'h1', '마녀의 편지')); await p.waitForTimeout(500);
  console.log('핸드아웃도 같은 자리(겹침) →', await g('마녀의 편지'));
  await front('리버트'); const t = await (await p.$(dlg('리버트') + ' .ui-dialog-titlebar')).boundingBox();
  await p.mouse.move(t.x + 200, t.y + 10); await p.mouse.down(); await p.mouse.move(t.x - 300, t.y + 110, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
  console.log('끌어 옮김 → 자유롭게:', await g('리버트'));
  // 크기 바꾸기 → 폭 기억 → 다시 열면 그 폭
  await p.evaluate(() => { const $c = $('.characterdialog[data-characterid="c1"]'); $c.dialog('option', 'width', 560); $c.closest('.ui-dialog').trigger('dialogresizestop'); $c.trigger('dialogresizestop'); }); await p.waitForTimeout(100);
  console.log('폭 기억:', await p.evaluate(() => localStorage.getItem('r20_win_open')));
  await close('리버트'); await p.evaluate(() => __open('char', 'c2', '키어런')); await p.waitForTimeout(500);
  console.log('다른 시트 열기 → 그 폭으로:', await g('키어런'));
  // ❐ 떠 있기 → 다음엔 Roll20 자리 · ◨ 붙임 → 바로 그 자리로
  await front('마녀의 편지'); await p.click(dlg('마녀의 편지') + ' .r20wm-dock [data-v="float"]'); await close('마녀의 편지');
  await p.evaluate(() => __open('handout', 'h1', '마녀의 편지')); await p.waitForTimeout(500);
  console.log('❐ 고른 핸드아웃 다시 열기 → Roll20 자리:', await g('마녀의 편지'), '| 표시:', await p.$eval(dlg('마녀의 편지') + ' .r20wm-dock [aria-pressed="true"]', x => x.textContent));
  await front('마녀의 편지'); await p.click(dlg('마녀의 편지') + ' .r20wm-dock [data-v="dock"]'); await p.waitForTimeout(100);
  console.log('◨ 누름 → 붙는 자리로:', await g('마녀의 편지'));
  // 📌 기억이 먼저
  await front('키어런'); await p.click(dlg('키어런') + ' .r20wm-pin'); await p.evaluate(() => { const d = [...document.querySelectorAll('.ui-dialog')].find(x => x.textContent.includes('키어런')); d.style.left = '100px'; d.style.top = '120px'; $(d).find('.ui-dialog-content').trigger('dialogdragstop'); }); await p.waitForTimeout(100);
  await close('키어런'); await p.evaluate(() => __open('char', 'c2', '키어런')); await p.waitForTimeout(500);
  console.log('📌 켠 시트 → 기억한 자리:', await g('키어런'));
  // 주크박스 서랍이 열려 있으면 서랍 왼쪽 끝
  await close('마녀의 편지'); await p.click('#jukeboxtab a'); await p.waitForTimeout(200);
  await p.evaluate(() => __open('handout', 'h1', '마녀의 편지')); await p.waitForTimeout(500);
  console.log('서랍 열림 → 서랍 왼쪽 끝:', await g('마녀의 편지'), '| 서랍 왼쪽', await p.$eval('#jukebox', e => Math.round(e.getBoundingClientRect().left)));
  // 그 밖의 Roll20 창은 그대로
  await p.evaluate(() => $('<div>설정</div>').dialog({ title: '토큰 설정', width: 300, position: { my: 'left top', at: 'left+40 top+40', of: window } })); await p.waitForTimeout(400);
  console.log('토큰 설정 창 → 그대로:', await g('토큰 설정'), '| ◨ 없음:', !(await p.$(dlg('토큰 설정') + ' .r20wm-dock')));
  console.log('errors:', errs); await b.close();
})();
