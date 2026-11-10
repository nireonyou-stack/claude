// v1.73.1 일괄 편집기 단추: 다시 누르면 닫기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>';
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const shown = () => p.evaluate(() => !!document.querySelector('.r20be-show'));
  await p.click('#r20-bebtn'); await p.waitForTimeout(150); const a = await shown();
  await p.click('#r20-bebtn'); await p.waitForTimeout(100); const c = await shown();
  await p.click('#r20-bebtn'); await p.waitForTimeout(100); const d = await shown();
  console.log('누름 → 열림', a, '| 다시 → 열림', c, '| 또 → 열림', d); console.log('errors:', errs); await b.close();
})();
