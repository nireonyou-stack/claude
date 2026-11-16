// v1.112.3 토큰 왼클릭 메뉴: 토큰 그림을 누르면 뜨고, 막대 숫자를 눌러 Roll20 이 입력칸을 띄우면 안 뜬다
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="secondary-toolbar" style="position:fixed;top:0;left:0"><ul class="tokenactions"><li><button>⚔ 공격</button></li></ul></div>'
      + '<div id="editor-wrapper" style="position:fixed;left:0;top:40px;width:800px;height:600px"><canvas id="babylonCanvas" width="800" height="600"></canvas></div>';
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
    // Roll20 흉내: 토큰 위쪽(막대 동그라미 자리, y<160)을 누르면 그 자리에 숫자 입력칸을 띄워 초점을 준다
    document.getElementById('babylonCanvas').addEventListener('click', e => {
      if (e.clientY < 160) { const i = document.createElement('input'); i.value = '4'; i.style.cssText = `position:fixed;left:${e.clientX - 20}px;top:${e.clientY - 30}px;width:60px`; document.body.append(i); i.focus(); i.select(); }
    });
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const pop = () => p.evaluate(() => !!document.querySelector('.r20ta-pop'));
  await p.mouse.click(300, 300); await p.waitForTimeout(900);
  console.log('토큰 그림 누름 → 메뉴:', await pop());
  await p.keyboard.press('Escape'); await p.mouse.click(1000, 700); await p.waitForTimeout(300);
  await p.mouse.click(300, 120); await p.waitForTimeout(900);
  console.log('막대 숫자 누름(입력칸 뜸) → 메뉴 없음:', !(await pop()), '| 입력칸 초점:', await p.evaluate(() => document.activeElement?.value));
  console.log('errors:', errs); await b.close();
})();
