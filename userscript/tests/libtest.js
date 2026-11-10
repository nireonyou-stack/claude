// 내 라이브러리 그림 ⋯ 메뉴 → 지금 페이지에 맞춰 놓기 (맵 층) 등
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); window.__log = [];
    const pix = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#7a9"/><text x="10" y="50" font-size="20">숲</text></svg>');
    document.body.insertAdjacentHTML('beforeend', `<div id="imagedialog" style="position:fixed;right:0;top:0;width:300px;height:600px;overflow:auto;background:#fff">
      <ul style="list-style:none;padding:6px;margin:0">${[1, 2, 3, 4, 5, 6].map(i => `<li class="draggableresult library-item" data-fullsizeurl="https://files.d20.io/images/${i}/abc/max.png" style="float:left;width:80px;height:80px;margin:4px;background:#eee">
        <div class="token"><img src="${pix}" style="width:80px;height:60px"></div><div class="namecontainer">숲 배경 ${i}</div></li>`).join('')}</ul></div>`);
    $('#imagedialog .draggableresult').draggable({ helper: 'clone', appendTo: 'body' });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f) });
    const pg = { id: 'pg1', get: k => ({ width: 30, height: 20 })[k], thegraphics: { models: [], create: o => { window.__log.push(JSON.stringify(o)); return { id: 'g' }; } } };
    window.Campaign = { get: () => '[]', save() {}, on() {}, activePage: () => pg, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([pg]) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  console.log('⋯ 단추:', await p.$$eval('#imagedialog .r20ri-more', bs => bs.length), '| 평소 보임:', await p.$eval('#imagedialog .r20ri-more', b => getComputedStyle(b).opacity));
  await p.hover('#imagedialog li:nth-child(5)');
  console.log('올림:', await p.$eval('#imagedialog li:nth-child(5) .r20ri-more', b => getComputedStyle(b).opacity));
  await p.click('#imagedialog li:nth-child(5) .r20ri-more'); await p.waitForTimeout(100);
  console.log('메뉴:', await p.$eval('#imagedialog .r20ri-pop', m => m.querySelector('strong').textContent + ' / ' + m.querySelector('.r20ri-ph span').textContent + ' | ' + [...m.querySelectorAll('.r20ri-mi')].map(x => x.textContent).join(' · ')));
  const box = await p.$eval('#imagedialog .r20ri-pop', m => { const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','); });
  const li = await p.$eval('#imagedialog li:nth-child(5)', m => { const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.bottom)].join(','); });
  console.log('메뉴 자리:', box, '| 그림 왼쪽·아래:', li);
  if (SHOT) await p.screenshot({ path: SHOT + '/lib-menu.png', clip: { x: 680, y: 0, width: 320, height: 520 } });
  await p.click('#imagedialog .r20ri-pop [data-a="map"]'); await p.waitForTimeout(300);
  console.log('맵 층 놓기:', (await p.evaluate(() => window.__log.splice(0))).join(' | '));
  await p.mouse.click(100, 100); await p.waitForTimeout(50);
  console.log('바깥 누르면 닫힘:', !(await p.$('#imagedialog .r20ri-pop')));
  console.log('errors:', errs); await b.close();
})();
