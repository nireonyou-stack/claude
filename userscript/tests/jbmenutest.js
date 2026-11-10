// v1.72 주크박스 ☰ 설정 메뉴 · Roll20 단추 숨김 · 정렬 단추 숨김 · 위쪽 여백 · 서랍이 가짜 Esc/누르기에 안 닫힘
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
    const tr = n => Array.from({ length: n }, (_, i) => `<li class="dd-item jukeboxitem" data-itemid="t${i}"><div class="dd-content"><span class="title">곡 ${i}</span><a class="play" data-isplaying="false">▶</a></div></li>`).join('');
    const fold = (n, k) => `<li class="dd-item dd-folder"><button data-action="collapse" type="button">-</button><button data-action="expand" type="button" style="display:none">+</button><div class="dd-content"><span class="folder-title">${n}</span></div><ol class="dd-list">${tr(k)}</ol></li>`;
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <ul class="tabmenu"><li id="chattab"><a href="#textchat">💬</a></li><li id="jukeboxtab"><a href="#jukebox">♪</a></li></ul>
        <div id="textchat"><div class="content"></div></div>
        <div id="jukebox"><button class="btn" style="float:right" onclick="__log.push('AUD')">오디오 관리</button><h3 style="margin:10px 0;line-height:40px">주크박스</h3>
          <div id="jukeboxwhatsplaying" style="border:1px solid #d1d1d1;margin:10px 0;padding:3px;min-height:49px"><h4>지금 재생 중</h4></div>
          <div class="secondarycontrols"><button class="btn" onclick="__log.push('ADD')">빈 재생목록 추가</button></div>
          <ol id="jukeboxfolderroot">${fold('대기', 3)}${fold('전투', 4)}</ol>
          <button class="btn" onclick="__log.push('SORT')">알파벳순 음원 정렬</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    $('#rightsidebar').tabs();
    $('#jukebox').on('click', 'button[data-action]', function () { const li = this.parentElement, c = this.dataset.action === 'collapse'; li.querySelector('ol').style.display = c ? 'none' : ''; li.querySelector('[data-action=collapse]').style.display = c ? 'none' : ''; li.querySelector('[data-action=expand]').style.display = c ? '' : 'none'; __log.push('FOLD'); });
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.click('#jukeboxtab a'); await p.waitForTimeout(150);
  const vis = sel => p.$$eval(sel, es => es.map(e => getComputedStyle(e).display !== 'none'));
  console.log('☰ 있음:', !!(await p.$('#jukebox .r20jb-mbtn')), '| 오디오 관리 · 빈 재생목록 · 정렬 보임:', [...await vis('#jukebox > .btn:not(.r20jb-mbtn)'), ...await vis('.secondarycontrols .btn')].join(','), '| 아래 줄 칸 보임:', (await vis('.secondarycontrols'))[0]);
  console.log('위쪽 자리 — 제목 · 지금 재생 중 · 목록 top:', await p.evaluate(() => ['#jukebox h3', '#jukeboxwhatsplaying', '#jukeboxfolderroot'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)).join(' / ')));
  if (SHOT) await p.screenshot({ path: SHOT + '/jbmenu-0.png', clip: { x: 740, y: 0, width: 330, height: 300 } });
  await p.click('#jukebox .r20jb-mbtn'); await p.waitForTimeout(80);
  console.log('☰ 누름 → 메뉴:', await p.$$eval('.r20jb-menu > *', es => es.map(e => e.textContent.trim() + (e.disabled ? '(꺼짐)' : '')).filter(Boolean).join(' | ')), '| 서랍 열림:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  if (SHOT) await p.screenshot({ path: SHOT + '/jbmenu-1.png', clip: { x: 740, y: 0, width: 330, height: 300 } });
  await p.fill('.r20jb-menu [data-k="step"]', '10'); await p.fill('.r20jb-menu [data-k="fade"]', '5');
  console.log('단위 · 페이드 기억:', await p.evaluate(() => [localStorage.getItem('r20jb_step'), localStorage.getItem('r20jb_fade')].join(',')));
  await p.click('.r20jb-menu [data-a="aud"]'); await p.waitForTimeout(50);
  console.log('오디오 관리 →', await p.evaluate(() => __log.join(',')), '| 메뉴 닫힘:', !(await p.$('.r20jb-menu')));
  await p.click('#jukebox .r20jb-mbtn'); await p.click('.r20jb-menu [data-a="add"]'); await p.waitForTimeout(50);
  await p.click('#jukebox .r20jb-mbtn'); await p.click('.r20jb-menu [data-a="fold"]'); await p.waitForTimeout(50);
  console.log('빈 재생목록 · 폴더 닫기 →', await p.evaluate(() => __log.join(',')), '| 열린 폴더:', await p.$$eval('#jukeboxfolderroot .dd-list', os => os.filter(o => o.style.display !== 'none').length));
  await p.click('#jukebox .r20jb-mbtn'); await p.mouse.click(1300, 500); await p.waitForTimeout(50);
  console.log('메뉴 밖 누름 → 메뉴:', !!(await p.$('.r20jb-menu')), '| 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  // 📌 + 화면 맞춤이 보내는 가짜 Esc · 가짜 누르기
  await p.click('#jukeboxtab a'); await p.waitForTimeout(50);
  console.log('♪ →', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  await p.click('#r20-jbd-hd [data-a="pin"]');
  await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t => document.body.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, { bubbles: true }))); });
  await p.waitForTimeout(50);
  console.log('📌 + 가짜 Esc · 누르기 → 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  await p.click('#r20-jbd-hd [data-a="pin"]');
  await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await p.waitForTimeout(50);
  console.log('📌 끔 + 가짜 Esc · 누르기 → 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(50);
  console.log('진짜 Esc → 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  console.log('errors:', errs); await b.close();
})();
