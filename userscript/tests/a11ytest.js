// v1.86 누구나 읽고 쓸 수 있게: 회색 글 대비 · 키보드 포커스 테두리 · 움직임 줄이기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const lum = c => { const v = c.match(/\d+/g).slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = c => (1.05 / (lum(c) + 0.05)).toFixed(2);
(async () => {
  const b = await chromium.launch();
  for (const motion of ['no-preference', 'reduce']) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: motion });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8766/blank.html');
    await p.evaluate(() => {
      document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
      const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f) });
      window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
      window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
    });
    await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
    await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
    if (motion === 'no-preference') {
      const c = await p.evaluate(() => { const s = getComputedStyle(document.documentElement); return [s.getPropertyValue('--aio-ink-4').trim(), s.getPropertyValue('--aio-ink-5').trim()]; });
      const ink5 = await p.$eval('#r20be .r20be-ver', e => getComputedStyle(e).color);
      console.log('회색 변수:', c.join(' · '), '| 판 번호 글자', ink5, '대비', ratio(ink5) + ':1');
      await p.focus('#r20be .r20be-search'); await p.keyboard.press('Tab');
      console.log('Tab 포커스:', await p.evaluate(() => { const a = document.activeElement, s = getComputedStyle(a); return a.tagName + '.' + a.className.split(' ')[0] + ' outline ' + s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor; }));
    }
    console.log(`움직임 ${motion}:`, await p.$eval('#r20be .r20be-tools button', e => 'transition ' + getComputedStyle(e).transitionDuration + ' · 알림 animation ' + (() => { const d = document.createElement('div'); d.className = 'aio-t'; document.body.appendChild(d); const v = getComputedStyle(d).animationName; d.remove(); return v; })()));
    console.log('errors:', errs); await ctx.close();
  }
  await b.close();
})();
