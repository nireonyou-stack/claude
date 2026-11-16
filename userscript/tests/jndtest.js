// v1.113.0 저널 서랍: 📒 탭 → 저널이 채팅 왼쪽에 (탭은 그대로) · 단추줄 밀림 · 주크박스 서랍과 하나씩 · 닫기 · 폭 · ½ · 📌 · 저널 항목 누르기 그대로
// 탭 li 에 id 가 없는 Roll20 화면도 (a[href="#journal"])
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
    const items = Array.from({ length: 40 }, (_, i) => `<li class="dd-item journalitem" data-itemid="h${i}"><div class="dd-content"><span class="name">핸드아웃 ${i}</span></div></li>`).join('');
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <ul class="tabmenu"><li><a href="#textchat">💬</a></li><li><a href="#journal">📒</a></li><li id="jukeboxtab"><a href="#jukebox">♪</a></li></ul>
        <div id="textchat"><div class="content"><div class="message general">안녕</div></div></div>
        <div id="journal"><div class="content searchbox"><input class="search" placeholder="Search"></div><div id="journalfolderroot"><ol class="dd-list">${items}</ol></div></div>
        <div id="jukebox"><h3>Jukebox</h3><ol id="jukeboxfolderroot"><li class="dd-item dd-folder"><ol class="dd-list"><li class="dd-item jukeboxitem" data-itemid="t1"><div class="dd-content">곡 1</div></li></ol></li></ol></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    $('#rightsidebar').tabs();
    $('#rightsidebar').on('click', '.journalitem .name', function () { window.__log.push('OPEN ' + $(this).closest('li').data('itemid')); });
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const jt = '#rightsidebar a[href="#journal"]';
  const state = () => p.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
    const r = id => { const e = document.getElementById(id); if (!e) return '-'; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round).join(','); };
    return `채팅 ${vis('textchat') ? '보임' : '숨김'} · 저널 ${vis('journal') ? r('journal') : '숨김'} · 주크박스 ${vis('jukebox') ? '보임' : '숨김'} · 활성 탭 ${document.querySelector('#rightsidebar .ui-tabs-active a')?.getAttribute('href')} · ≡ ${r('sidebarcontrol')} · 🔍 ${r('r20-qfbtn')}`;
  });
  console.log('처음:', await state());
  await p.click(jt); await p.waitForTimeout(150);
  console.log('📒 누름 →', await state(), '| 머리줄:', await p.$eval('#r20-jnd-hd .tt', e => e.textContent), '| 탭 표시:', await p.$eval(jt, a => a.parentElement.classList.contains('r20jnd-on')));
  if (SHOT) await p.screenshot({ path: SHOT + '/jnd.png' });
  await p.click('#journal li[data-itemid="h3"] .name'); console.log('항목 누름 →', await p.evaluate(() => window.__log.join(',')), '| 열린 채:', await p.evaluate(() => document.body.classList.contains('r20jnd-open')));
  const inset = (pane, item) => p.evaluate(([pane, item]) => { const d = document.getElementById(pane).getBoundingClientRect(), i = document.querySelector(item).getBoundingClientRect(); return '왼 ' + Math.round(i.left - d.left) + ' · 오른 ' + Math.round(d.right - i.right); }, [pane, item]);
  const jnIn = await inset('journal', '#journal li.journalitem');
  await p.click('#jukeboxtab a'); await p.waitForTimeout(120); console.log('♪ 누름 → 저널 닫히고 주크박스:', await state());
  console.log('좌우 여백 — 저널 줄', jnIn, '| 주크박스 줄', await inset('jukebox', '#jukebox li.jukeboxitem'));
  await p.click(jt); await p.waitForTimeout(120); console.log('📒 다시 → 주크박스 닫히고 저널:', await state());
  await p.click(jt); await p.waitForTimeout(80); console.log('📒 또 → 닫힘:', await state());
  await p.click(jt); await p.waitForTimeout(80);
  const g = await (await p.$('#r20-jnd-grip')).boundingBox();
  await p.mouse.move(g.x + 3, g.y + 200); await p.mouse.down(); await p.mouse.move(g.x - 97, g.y + 200, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  console.log('폭 끌기 →', await state(), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_jnd_w')), '| 주크박스 폭은 따로:', await p.evaluate(() => localStorage.getItem('r20_jbd_w')));
  await p.click('#r20-jnd-hd .aio-dock [data-v="half"]').catch(() => {}); await p.waitForTimeout(120);
  console.log('½ →', await state());
  await p.click('#r20-jnd-hd .aio-dock [data-v="dock"]').catch(() => {}); await p.waitForTimeout(80);
  await p.mouse.click(200, 500); await p.waitForTimeout(80); console.log('맵 누름 → 닫힘:', await state());
  await p.click(jt); await p.click('#r20-jnd-hd [data-a="pin"]'); await p.mouse.click(200, 500); await p.waitForTimeout(80); console.log('📌 + 맵 누름 → 그대로:', await state());
  await p.keyboard.press('Escape'); await p.waitForTimeout(80); console.log('Esc →', await state());
  await p.evaluate(() => $('#rightsidebar').tabs('option', 'active', 1)); await p.waitForTimeout(50);
  await p.click(jt); await p.waitForTimeout(80); console.log('저널 탭이 열린 채 📒 → Roll20 그대로:', await state());
  console.log('errors:', errs); await b.close();
})();
