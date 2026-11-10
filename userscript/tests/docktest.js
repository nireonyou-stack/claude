// 햄버거 밑 단추줄: 맵 단추 밑에 일괄 편집기 · 빠른 찾기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  const setup = gm => p.evaluate(gm => {
    localStorage.clear();
    document.body.style.cssText = 'margin:0;height:100vh;background:#cfcfcf';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee;border-radius:4px 0 0 4px">≡</div>
      <div id="page-button" style="width:28px;height:28px;background:#333"></div>
      <div id="vm_zoom_buttons" style="width:28px;height:150px;background:#f5f5f7;border-radius:4px"></div>`;
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) };
    window.is_gm = gm;
  }, gm);
  await setup(true);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const col = () => p.evaluate(() => ['sidebarcontrol', 'page-button', 'vm_zoom_buttons', 'r20-mapshot', 'r20-bebtn', 'r20-qfbtn'].map(id => {
    const e = document.getElementById(id); if (!e) return id + ' 없음'; const r = e.getBoundingClientRect(); return `${id} ${Math.round(r.top)}~${Math.round(r.bottom)} 오른쪽${Math.round(innerWidth - r.right)}`; }).join(' | '));
  console.log('GM:', await col());
  if (SHOT) await p.screenshot({ path: SHOT + '/dock.png', clip: { x: 740, y: 0, width: 70, height: 320 } });
  await p.click('#r20-bebtn'); await p.waitForTimeout(200);
  console.log('일괄 편집기 단추 → 열림:', await p.$eval('#r20be', e => getComputedStyle(e).display));
  await p.evaluate(() => document.querySelector('#r20be .r20be-x, #r20be [aria-label="닫기"]')?.click());
  await p.click('#r20-qfbtn'); await p.waitForTimeout(100);
  console.log('빠른 찾기 단추 → 열림:', await p.$eval('#r20-qf', e => e.classList.contains('show')), '| 입력칸 포커스:', await p.evaluate(() => document.activeElement?.matches('#r20-qf input')));
  await p.keyboard.press('Escape');
  console.log('닫으면 단추로 포커스:', await p.evaluate(() => document.activeElement?.id));
  // 맵 단추 펼침 판이 아래 단추들 위로 오는지
  await p.click('#r20-mapshot .main'); await p.waitForTimeout(300);
  const top = await p.evaluate(() => { const r = document.getElementById('r20-bebtn').getBoundingClientRect(); return document.elementFromPoint(r.left + 14, r.top + 14)?.closest('#r20-mapshot, #r20-bebtn')?.id; });
  console.log('맵 펼침이 위:', top);
  if (SHOT) await p.screenshot({ path: SHOT + '/dock-open.png', clip: { x: 740, y: 0, width: 70, height: 320 } });
  console.log('errors:', errs); await b.close();
})();
