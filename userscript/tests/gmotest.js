// v1.105 GM 레이어 · GM 어둠 불투명도 스위치 (숫자 칸 자리 · 0% ↔ 50%) + 포트레이트 위쪽 자리는 도구 줄 오른쪽 끝에
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('r20_pz', JSON.stringify({ pos: 'tl' }));
    const row = (id, label, v) => `<div class="blk"><div class="lbl">${label}</div><div class="ctl" style="display:flex"><input type="range" id="${id}" min="0" max="100" value="${v}"><div class="nb"><input type="number" id="${id}n" value="${v}"><span>%</span></div></div></div>`;
    document.body.innerHTML = '<div class="master-toolbar-outer" style="position:fixed;left:0;top:0;width:24px;height:400px;background:#ddd"></div><div id="playerzone" style="position:fixed;left:0;top:0"><div id="avatarContainer"></div></div>'
      + '<div id="pop" style="position:fixed;left:300px;top:100px;width:340px;background:#fff">' + row('gl', '👑 GM 레이어 불투명도', 55) + row('gd', '☀ GM 어둠 불투명도', 0) + row('etc', '음량', 30) + '</div>'
      + '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>';
    window.__ev = []; ['gl', 'gln', 'gd'].forEach(id => document.getElementById(id).addEventListener('input', e => __ev.push(id + '=' + e.target.value)));
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]), activePage: () => null };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const st = () => p.$$eval('.r20-gmo', ss => ss.map(s => s.getAttribute('aria-checked') + ' ' + s.textContent).join(' | '));
  console.log('스위치:', await st(), '| 숫자 칸 숨김:', await p.$$eval('.nb', ns => ns.map(n => n.style.display || '보임').join(',')));
  await p.click('.r20-gmo >> nth=0'); console.log('GM 레이어 끔:', await st(), '| 슬라이더:', await p.$eval('#gl', e => e.value), '| 알림:', await p.evaluate(() => __ev.join(' ')));
  await p.click('.r20-gmo >> nth=0'); await p.click('.r20-gmo >> nth=1'); console.log('둘 다 켬:', await st(), '| 슬라이더:', await p.$eval('#gl', e => e.value), await p.$eval('#gd', e => e.value));
  await p.$eval('#gl', e => { e.value = 80; e.dispatchEvent(new Event('input', { bubbles: true })); }); console.log('슬라이더를 끌면 따라감:', await st());
  console.log('포트레이트 묶음 왼쪽 (도구 줄 24px 옆):', await p.$eval('#playerzone', e => e.style.left + ' ' + e.style.getPropertyPriority('left')));
  console.log('errors:', errs); await b.close();
})();
