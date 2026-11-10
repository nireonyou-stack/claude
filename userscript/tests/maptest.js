// 일괄 편집기 [맵] 탭: 표시(덮임 · 페이지 밖 · 아주 작음) · 거르기 · 지우기 · 앞뒤 · 가운데 · 맞추기 · 층 · 저장
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SVG = c => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="${c}"/></svg>`)}`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1250, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { console.log('dialog:', d.message().split('\n')[0]); d.accept(); });
  await p.goto('http://127.0.0.1:8766/blank.html'); await p.evaluate(() => localStorage.clear());
  await p.evaluate(([bg, fr, sm, cd, gm]) => {
    document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>';
    window.__log = [];
    const M = (id, a) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; },
      save: function (o) { if (o) { Object.assign(a, o); window.__log.push(['save', id, JSON.stringify(o)]); } }, destroy: () => window.__log.push(['destroy', id]) });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f) });
    // 페이지 20×10칸 = 1400×700, 격자 1칸
    const G = [
      M('bg', { name: '숲 배경', imgsrc: bg, layer: 'map', left: 700, top: 350, width: 1400, height: 700, rotation: 0 }),
      M('frame', { name: '장식 틀', imgsrc: fr, layer: 'objects', left: 700, top: 350, width: 600, height: 400, rotation: 0 }),
      M('letter', { name: '편지', imgsrc: sm, layer: 'objects', left: 650, top: 330, width: 70, height: 70, rotation: 0 }),
      M('key', { name: '', imgsrc: sm, layer: 'objects', left: 1200, top: 100, width: 70, height: 70, rotation: 0 }),
      M('dot', { name: '점', imgsrc: cd, layer: 'objects', left: 100, top: 600, width: 3, height: 3, rotation: 0 }),
      M('enemy', { name: '숨은 적', imgsrc: gm, layer: 'gmlayer', left: 2100, top: 280, width: 70, height: 70, rotation: 0 }),
      M('back2', { name: '뒤 배경 (예전 것)', imgsrc: bg, layer: 'map', left: 700, top: 350, width: 1000, height: 500, rotation: 0 }),
      M('newone', { name: '스크립트 그림', imgsrc: cd, layer: 'objects', left: 300, top: 300, width: 140, height: 70, rotation: 90 })
    ];
    let z = 'back2,bg,line1,letter,frame,key,dot,enemy';     // line1 = 선 (그림 아님) · newone 은 zorder 에 없음
    const pg = { id: 'p1', thegraphics: coll(G), get: k => ({ width: 20, height: 10, name: '1장 성문', snapping_increment: 1, zorder: z })[k],
      save: o => { if (o.zorder) { z = o.zorder; window.__log.push(['zorder', o.zorder]); } }, on() {}, off() {} };
    window.Campaign = { get: k => k === 'journalfolder' || k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {}, activePage: () => pg,
      handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([pg]) };
    window.Jukebox = { playlist: coll([]) }; window.is_gm = true;
  }, [SVG('#4f6b4a'), SVG('#ba965a'), SVG('#f1e7d0'), SVG('#ccc'), SVG('#900')]);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForSelector('#r20be.r20be-show');
  await p.click('#r20be .r20be-seg button:has-text("맵")'); await p.waitForTimeout(300);
  const rows = () => p.$$eval('#r20be .r20be-tree .r20be-row', rs => rs.map(r => r.querySelector('.r20be-nm span').textContent + [...r.querySelectorAll('.r20be-gfl')].map(x => '[' + x.textContent + ']').join('')).join(' | '));
  console.log('rows:', await rows());
  console.log('chips:', (await p.$$eval('#r20be .r20be-chips button', bs => bs.map(x => x.textContent))).join(' / '));
  await p.screenshot({ path: __dirname + '/map-open.png' });
  // 안 보이는 것만 → 모두 고르기
  await p.click('#r20be .r20be-pane button:has-text("모두 고르기")'); await p.waitForTimeout(200);
  console.log('hidden filter rows:', await rows(), '| head:', await p.$eval('#r20be .r20be-ph strong', e => e.textContent));
  await p.screenshot({ path: __dirname + '/map-hidden.png' });
  // 편지 하나만: 맨 앞 · 한가운데
  await p.click('#r20be .r20be-pane button:has-text("선택 해제")');
  await p.click('#r20be .r20be-chips button:has-text("전체")');
  await p.click('#r20be .r20be-tree .r20be-row:has-text("편지") .r20be-nm'); await p.waitForTimeout(150);
  await p.click('#r20be .r20be-pane button:has-text("맨 앞으로")'); await p.waitForTimeout(150);
  await p.click('#r20be .r20be-pane button:has-text("한가운데")'); await p.waitForTimeout(150);
  console.log('after front+center:', await rows());
  // 뒤 배경: 페이지 크기 그대로 · 숨은 적: 토큰 층으로 · 점: 지우기 · 스크립트 그림(90° 회전): 비율 그대로 맞추기
  await p.click('#r20be .r20be-tree .r20be-row:has-text("뒤 배경") .r20be-nm'); await p.click('#r20be .r20be-pane button:has-text("페이지 크기 그대로")');
  await p.click('#r20be .r20be-tree .r20be-row:has-text("숨은 적") .r20be-nm'); await p.click('#r20be .r20be-pane button:has-text("토큰 층")');
  await p.click('#r20be .r20be-tree .r20be-row:has-text("점") .r20be-nm'); await p.click('#r20be .r20be-pane button:has-text("지우기")');
  await p.click('#r20be .r20be-tree .r20be-row:has-text("스크립트 그림") .r20be-nm'); await p.click('#r20be .r20be-pane button:has-text("비율 그대로")');
  await p.waitForTimeout(150);
  console.log('badge:', await p.$eval('#r20be .r20be-badge', e => e.textContent), '| rows:', await rows());
  await p.keyboard.press('Control+s'); await p.waitForTimeout(1200);
  console.log('saved:'); (await p.evaluate(() => window.__log)).forEach(l => console.log('  ', l.join(' ')));
  console.log('after save rows:', await rows());
  console.log('errors:', errs); await b.close();
})();
