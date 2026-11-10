// v1.69 주크박스 서랍: jQuery UI 탭(Roll20 과 같은 구조)에서 ♪ → 서랍 · 채팅 그대로 · 단추줄 밀림 · 닫기 · 폭 · 📌 · 재생 단추 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); window.__log = [];
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a;font:13px sans-serif';
    const tracks = Array.from({ length: 40 }, (_, i) => `<li class="dd-item jukeboxitem" data-itemid="t${i}"><div class="dd-content"><span class="title">곡 ${i}</span><a class="play" data-isplaying="false">▶</a></div></li>`).join('');
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <ul class="tabmenu"><li id="chattab"><a href="#textchat">💬</a></li><li id="journaltab"><a href="#journal">📒</a></li><li id="jukeboxtab" class="tipme-delayed"><a href="#jukebox" class="Roll20Icon">♪</a></li></ul>
        <div id="textchat"><div class="content"><div class="message general" data-messageid="m1"><span class="by">미오:</span> 안녕</div></div></div>
        <div id="journal">저널</div>
        <div id="jukebox"><h3>Jukebox</h3><button class="btn">오디오 관리</button><ol id="jukeboxfolderroot"><li class="dd-item dd-folder"><ol class="dd-list">${tracks}</ol></li></ol></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    $('#rightsidebar').tabs();
    // Roll20 처럼 오른쪽 판에 위임한 재생 단추
    $('#rightsidebar').on('click', '.jukeboxitem a.play', function () { window.__log.push('PLAY ' + $(this).closest('li').data('itemid')); });
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const state = () => p.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    const r = id => { const e = document.getElementById(id); if (!e) return '-'; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round).join(','); };
    return `채팅 보임 ${vis('textchat')} · 주크박스 ${vis('jukebox') ? r('jukebox') : '숨김'} · 활성 탭 ${document.querySelector('#rightsidebar .ui-tabs-active')?.id} · 🔍 ${r('r20-qfbtn')}`;
  });
  console.log('처음:', await state());
  await p.click('#jukeboxtab a'); await p.waitForTimeout(150);
  console.log('♪ 누름 →', await state());
  if (SHOT) await p.screenshot({ path: SHOT + '/jbd.png' });
  await p.$eval('#jukebox li[data-itemid="t3"] a.play', a => a.click()); console.log('재생 단추 →', await p.evaluate(() => window.__log.join(',')));
  await p.click('#jukeboxtab a'); await p.waitForTimeout(80); console.log('♪ 다시 →', await state());
  // 폭 끌기 · ✕
  await p.click('#jukeboxtab a'); await p.waitForTimeout(80);
  const g = await (await p.$('#r20-jbd-grip')).boundingBox();
  await p.mouse.move(g.x + 3, g.y + 200); await p.mouse.down(); await p.mouse.move(g.x - 97, g.y + 200, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  console.log('폭 끌기 →', await state(), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_jbd_w')));
  await p.click('#r20-jbd-hd [data-a="x"]'); await p.waitForTimeout(80); console.log('✕ →', await state());
  // 다른 데 누르기 · 📌 · Esc
  await p.click('#jukeboxtab a'); await p.mouse.click(200, 500); await p.waitForTimeout(80); console.log('맵 누름 →', await state());
  await p.click('#jukeboxtab a'); await p.click('#r20-jbd-hd [data-a="pin"]'); await p.mouse.click(200, 500); await p.waitForTimeout(80); console.log('📌 + 맵 누름 →', await state());
  await p.keyboard.press('Escape'); await p.waitForTimeout(80); console.log('Esc →', await state());
  // 주크박스 탭이 원래 열려 있으면 Roll20 그대로 / 서랍 끄면 원래 탭 바꾸기
  await p.evaluate(() => $('#rightsidebar').tabs('option', 'active', 2)); await p.waitForTimeout(50);
  await p.click('#jukeboxtab a'); await p.waitForTimeout(80); console.log('주크박스 탭이 열린 채 ♪ →', await state());
  await p.evaluate(() => $('#rightsidebar').tabs('option', 'active', 0));
  await p.evaluate(() => { localStorage.setItem('r20_show_jbdrawer', 'false'); });
  console.log('(설정 끔은 다음 로드부터 · 지금은 그대로)');
  console.log('errors:', errs); await b.close();
})();
