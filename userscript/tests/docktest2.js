// 빠른 찾기 ▶ 붙이기 · ◀ 떼기 · 📌 / 주크박스 '빈 재생목록 추가' → '오디오 관리' 옆
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); window.__log = [];
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a;font:13px sans-serif';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:330px;height:100%;background:#fff;overflow:auto">
        <div id="journal" style="display:none"><div class="content"></div></div>
        <div id="jukebox" style="padding:8px"><div class="content">
          <div style="overflow:hidden"><h2 style="float:left;margin:0;font-size:18px">주크박스</h2><button class="btn" style="float:right;height:26px;padding:0 10px;border:1px solid #ccc;border-radius:4px;background:#fff">오디오 관리</button></div>
          <div style="margin:10px 0;padding:8px;border:1px solid #ccc">지금 재생 중</div>
          <div class="secondarycontrols"><button class="btn" style="height:26px;padding:0 10px;border:1px solid #ccc;border-radius:4px;background:#fff">빈 재생목록 추가</button></div>
          <ol id="jukeboxfolderroot"></ol></div></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:330px;top:6px;width:28px;height:28px;background:#eee"></div>
      <div id="page-button" style="width:28px;height:28px;background:#333"></div><div id="vm_zoom_buttons" style="width:28px;height:120px;background:#f5f5f7"></div>`;
    const mk = (id, a) => ({ id, attributes: a, get: k => a[k], save: o => Object.assign(a, o), view: { showDialog: () => window.__log.push('OPEN ' + a.name) } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([mk('h1', { name: '마녀의 편지', inplayerjournals: '' }), mk('h2', { name: '마을 지도', inplayerjournals: '' })]),
      characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const geo = sel => p.$eval(sel, x => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round).join(','); });
  const isOpen = () => p.$eval('#r20-qf', e => e.classList.contains('show'));
  // 주크박스
  console.log('빈 재생목록 추가 자리:', await p.evaluate(() => { const a = [...document.querySelectorAll('#jukebox .btn')].find(x => x.textContent === '빈 재생목록 추가'); return a.parentElement.className || a.parentElement.tagName; }),
    '| 오디오 관리 왼쪽에:', await p.evaluate(() => { const [a, o] = ['빈 재생목록 추가', '오디오 관리'].map(t => [...document.querySelectorAll('#jukebox .btn')].find(x => x.textContent === t).getBoundingClientRect()); return a.right <= o.left && Math.abs(a.top - o.top) < 3; }));
  if (SHOT) await p.screenshot({ path: SHOT + '/jb-head.png', clip: { x: 870, y: 0, width: 330, height: 130 } });
  // 빠른 찾기: 처음은 따로 (오른쪽 판 왼쪽)
  await p.click('#r20-qfbtn'); await p.waitForTimeout(100);
  console.log('따로 띄움:', await geo('#r20-qf .qf-box'), '| 🔍 단추:', await geo('#r20-qfbtn'));
  await p.click('#r20-qf .qf-dock'); await p.waitForTimeout(150);
  console.log('▶ 붙임:', await geo('#r20-qf .qf-box'), '| 단추 글자:', await p.$eval('#r20-qf .qf-dock', b => b.textContent), '| 📌 보임:', await p.$eval('#r20-qf .qf-pin', b => getComputedStyle(b).display));
  await p.fill('#r20-qf .qf-in', '마'); await p.waitForTimeout(80); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  console.log('Enter →', (await p.evaluate(() => window.__log.splice(0))).join(','), '| 열려 있음:', await isOpen());
  await p.mouse.click(100, 600); await p.waitForTimeout(50); console.log('창 밖 눌러도 열려 있음:', await isOpen());
  if (SHOT) await p.screenshot({ path: SHOT + '/qf-dock.png', clip: { x: 500, y: 0, width: 400, height: 420 } });
  // 오른쪽 판 넓히면 따라감
  await p.evaluate(() => { document.getElementById('rightsidebar').style.width = '400px'; document.getElementById('sidebarcontrol').style.right = '400px'; }); await p.waitForTimeout(400);
  console.log('판 넓힘 → 따라감:', await geo('#r20-qf .qf-box'), '| 🔍:', await geo('#r20-qfbtn'));
  // 닫았다 열면 붙은 채로
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(100);
  console.log('다시 열기(붙은 채):', await geo('#r20-qf .qf-box'));
  // ◀ 떼기 → 따로 · 📌 → 그 자리
  await p.click('#r20-qf .qf-dock'); await p.waitForTimeout(100);
  console.log('◀ 뗌:', await geo('#r20-qf .qf-box'), '| 단추:', await p.$eval('#r20-qf .qf-dock', b => b.textContent));
  await p.click('#r20-qf .qf-pin'); await p.waitForTimeout(100);
  const g = await (await p.$('#r20-qf .qf-grip')).boundingBox();
  await p.mouse.move(g.x + 5, g.y + 8); await p.mouse.down(); await p.mouse.move(g.x - 300, g.y + 150, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  const moved = await geo('#r20-qf .qf-box');
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(100);
  console.log('📌 옮긴 자리', moved, '→ 다시 열기', await geo('#r20-qf .qf-box'));
  console.log('errors:', errs); await b.close();
})();
