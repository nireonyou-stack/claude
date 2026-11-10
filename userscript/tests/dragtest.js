// v1.89 공용 창 틀: 작은 창(맵 맞추기 등) 머리줄 끌기 · 단추 위에서는 안 끔 · ⠿ 표시
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.is_gm = true;
    document.body.insertAdjacentHTML('beforeend', '<div id="r20-fit" style="position:fixed;right:20px;bottom:20px;width:260px;height:120px;background:#fff;display:flex;flex-direction:column"><div class="hd"><b>맵 맞추기</b><button type="button" class="x" aria-label="닫기">✕</button></div></div>');
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const R = () => p.$eval('#r20-fit', e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(','); });
  console.log('처음:', await R(), '| ⠿:', await p.$eval('#r20-fit > .hd', h => getComputedStyle(h, '::before').content), '| 제목 x:', await p.$eval('#r20-fit .hd b', e => Math.round(e.getBoundingClientRect().left)));
  const h = await (await p.$('#r20-fit .hd b')).boundingBox();
  await p.mouse.move(h.x + 5, h.y + 5); await p.mouse.down(); await p.mouse.move(h.x - 295, h.y - 195, { steps: 5 }); await p.mouse.up();
  console.log('머리줄 끌기 -300,-200 →', await R());
  const x = await (await p.$('#r20-fit .x')).boundingBox();
  await p.mouse.move(x.x + 5, x.y + 5); await p.mouse.down(); await p.mouse.move(x.x + 100, x.y + 100, { steps: 5 }); await p.mouse.up();
  console.log('✕ 위에서 끌기 → 그대로:', await R());
  console.log('errors:', errs); await b.close();
})();
