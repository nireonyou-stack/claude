// ⛶ 를 − 밑(같은 묶음)에 · Zoom to Fit 뒤 메뉴가 안 보이고 닫히는지 (닫는 방식이 다른 메뉴 3가지)
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  const setup = closeBy => p.evaluate(closeBy => {
    window.__log = []; window.__seen = [];
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:330px;height:100%;background:#fff"></div>
      <div id="sidebarcontrol" style="position:fixed;right:330px;top:6px;width:28px;height:28px"></div><div id="page-button" style="width:28px;height:28px;background:#333"></div>
      <div id="vm_zoom_buttons" style="background:#e9e9ee;border-radius:6px"><div class="wrapper"><div class="parentContainer"><button class="btnStyle">⌖</button>
        <div class="zoomButtonsInner"><button class="plus btnStyle" style="border:0;background:none">+</button><div class="level">100</div><div class="sliderSection"></div><button class="minus btnStyle" style="border:0;background:none">−</button></div>
        <button class="btnStyle">👁</button></div></div></div>`;
    const lv = document.querySelector('.level');
    let m = null;
    const close = why => { if (m) { m.remove(); m = null; window.__log.push('닫힘(' + why + ')'); } };
    const open = () => {
      if (m) return close('숫자');
      m = document.createElement('div'); m.className = 'zpop'; m.style.cssText = 'position:fixed;left:700px;top:40px;width:180px;background:#fff;border:1px solid #ccc';
      m.innerHTML = '<input value="' + lv.textContent + '"><ul>' + ['Zoom In', 'Zoom Out', 'Zoom to Fit', 'Zoom to 10%'].map(t => `<li class="it"><span>${t}</span></li>`).join('') + '</ul>';
      m.addEventListener('click', e => { const li = e.target.closest('li.it'); if (li) { window.__log.push('누름 ' + li.textContent); if (li.textContent === 'Zoom to Fit') lv.textContent = '42'; } });
      document.body.appendChild(m); window.__log.push('열림');
      const watch = () => { if (!m) return; if (getComputedStyle(m).visibility !== 'hidden') window.__seen.push(performance.now()); requestAnimationFrame(watch); }; requestAnimationFrame(watch);
    };
    lv.addEventListener('click', open);
    if (closeBy === 'esc') document.addEventListener('keydown', e => { if (e.key === 'Escape') close('Esc'); });
    if (closeBy === 'outside') document.addEventListener('mousedown', e => { if (m && !m.contains(e.target) && e.target !== lv) close('바깥'); });
    window.Campaign = { activePage: () => ({ get: () => 25 }), get: () => '[]', on() {}, handouts: { models: [] }, characters: { models: [] } };
    window.is_gm = true;
  }, closeBy);
  await setup('esc');
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  console.log('⛶ 자리:', await p.evaluate(() => { const f = document.querySelector('.r20-fitz'); return f ? `${f.parentElement.className} 안 · 바로 앞 ${f.previousElementSibling.className} · class "${f.className}"` : '없음'; }));
  if (SHOT) await p.screenshot({ path: SHOT + '/fitz.png', clip: { x: 830, y: 0, width: 50, height: 300 } });
  for (const how of ['esc', 'toggle', 'outside']) {
    if (how !== 'esc') { await setup(how); await p.waitForTimeout(400); }
    await p.click('.r20-fitz'); await p.waitForTimeout(100);
    await p.waitForFunction(() => !document.querySelector('.r20-fitz').disabled, null, { timeout: 5000 });
    const r = await p.evaluate(() => ({ log: window.__log.join(' → '), seen: window.__seen.length, left: !!document.querySelector('.zpop') }));
    console.log(`메뉴가 ${how} 로 닫힘: ${r.log} | 보인 프레임 ${r.seen} | 남은 메뉴 ${r.left} | 배율 ${await p.$eval('.level', e => e.textContent)}`);
  }
  console.log('errors:', errs); await b.close();
})();
