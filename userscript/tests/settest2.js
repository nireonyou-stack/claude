// v1.87 설정 쓰임새별 묶음 · 설정 찾기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear();
    document.body.insertAdjacentHTML('beforeend', `<div id="textchat-input"><div><select id="speakingas"><option>GM</option></select></div><textarea></textarea><button id="chatSendBtn">Send</button></div>`);
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.click('#custom-settings-btn'); await p.waitForTimeout(200);
  const view = () => p.$$eval('#custom-settings-popup > *', cs => cs.filter(c => !c.hidden && getComputedStyle(c).display !== 'none' || c.classList.contains('cs-blk') && !c.hidden)
    .map(c => c.classList.contains('cs-gh') ? '【' + c.querySelector('b').textContent + '】' : c.classList.contains('cs-blk') ? [...c.querySelectorAll('.cs-name')].map(n => n.textContent.slice(0, 12)).join('+') : c.classList.contains('cs-search') ? '🔍' : c.className || c.tagName).filter(Boolean).join(' / '));
  console.log('처음:', await view());
  if (SHOT) await p.screenshot({ path: SHOT + '/settings.png', clip: await p.$eval('#custom-settings-popup', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 860) }; }) });
  for (const q of ['가늘', '캡처', '말풍선', 'Ctrl+F', '없는말']) {
    await p.fill('#custom-settings-popup .cs-search input', q); await p.waitForTimeout(50);
    console.log(`찾기 '${q}' →`, await view());
  }
  console.log('없음 안내:', await p.$eval('#custom-settings-popup .cs-none', e => e.hidden ? '(숨김)' : e.textContent));
  await p.press('#custom-settings-popup .cs-search input', 'Escape'); await p.waitForTimeout(50);
  console.log('Esc → 찾기 지움:', JSON.stringify(await p.$eval('#custom-settings-popup .cs-search input', i => i.value)), '| 열려 있음:', await p.$eval('#custom-settings-popup', e => getComputedStyle(e).display !== 'none'));
  console.log('errors:', errs); await b.close();
})();
