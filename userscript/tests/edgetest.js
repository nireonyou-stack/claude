// v1.74 덱 · 매크로를 오른쪽 판 왼쪽 끝에 (D1) · 휠 · 빈 곳 통과 · 설정에서 원래 자리
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 640 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/올인원/.test(m.text())) console.log('콘솔:', m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); window.__log = [];
    document.body.style.cssText = 'margin:0;height:100vh;background:#222;font:13px sans-serif';
    const names = ['🎬 진행:이미지', '진행:텍스트', '라운드이미지', '핸드아웃공개', '장면—열기', '장면—닫기', '😊 말풍선-드립', '마법전-스텝', '마법전-개시', '[마기로기]모든표', '[블러드문]모든표', '주사위', '이니셔티브', '휴식', '종료'];
    const card = '<svg xmlns="http://www.w3.org/2000/svg" width="70" height="95"><rect width="70" height="95" rx="6" fill="#ddd"/></svg>';
    const src = 'data:image/svg+xml,' + encodeURIComponent(card);
    document.body.innerHTML = `<div id="editor-wrapper" style="position:absolute;inset:0 300px 0 0" onclick="__log.push('MAP')">
        <div id="showndecks" style="position:absolute;right:40px;top:120px;width:80px"><div class="adeck"><div class="deckstack"><div class="allback"><img src="${src}"></div></div><div class="controls"><div class="control">플롯</div><div class="control"><a>뽑기</a></div></div></div><div class="adeck"><div class="deckstack"><div class="allback"><img src="${src}"></div></div><div class="controls"><div class="control">D6</div></div></div></div>
        <div id="macrobar" style="position:absolute;left:0;bottom:0;right:0;height:34px"><div id="macrobar_macros">${names.map((n, i) => `<div class="macrobox"><button class="btn" onclick="event.stopPropagation();__log.push('M${i}')">${n}</button></div>`).join('')}</div></div></div>
      <div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    $('#macrobar_macros').sortable({ items: '.macrobox' });
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const geo = () => p.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return '-'; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round).join(','); };
    const ws = [...document.querySelectorAll('#macrobar_macros .macrobox button')].map(b => Math.round(b.getBoundingClientRect().width));
    return `🔍 ${r('#r20-qfbtn')} · 덱 ${r('#showndecks')} · 매크로 칸 ${r('#macrobar')} · 단추 폭 ${[...new Set(ws)].join('/')} · 몸 ${document.body.className.match(/r20edge-\w+/g)}`;
  });
  console.log('처음:', await geo());
  if (SHOT) await p.screenshot({ path: SHOT + '/edge.png' });
  const mb = await (await p.$('#macrobar')).boundingBox();
  await p.mouse.move(mb.x + mb.width - 20, mb.y + 40); await p.mouse.wheel(0, 200); await p.waitForTimeout(100);
  console.log('휠 200 → 매크로 칸 scrollTop:', await p.$eval('#macrobar', e => e.scrollTop), '/', await p.$eval('#macrobar', e => e.scrollHeight - e.clientHeight));
  await p.$eval('#macrobar', e => { e.scrollTop = 0; });
  await p.click('#macrobar_macros .macrobox:nth-child(3) button'); await p.waitForTimeout(50);
  // 짧은 단추 왼쪽 빈 곳 → 맵
  const sb = await (await p.$('#macrobar_macros .macrobox:nth-child(12) button')).boundingBox();
  await p.mouse.click(mb.x + 4, sb.y + 10); await p.waitForTimeout(50);
  console.log('단추 · 빈 곳 누름 →', await p.evaluate(() => __log.join(',')));
  await p.hover('#macrobar_macros .macrobox:nth-child(10) button'); await p.waitForTimeout(50);
  if (SHOT) await p.screenshot({ path: SHOT + '/edge-hover.png', clip: { x: 860, y: 300, width: 220, height: 340 } });
  console.log('긴 이름에 마우스 → 폭:', await p.$eval('#macrobar_macros .macrobox:nth-child(10) button', b => Math.round(b.getBoundingClientRect().width) + ' (글 ' + b.scrollWidth + ')'));
  // 매크로가 적으면 아래에 붙는지
  await p.evaluate(() => { document.querySelectorAll('#macrobar_macros .macrobox').forEach((m, i) => { if (i > 3) m.remove(); }); }); await p.waitForTimeout(300);
  console.log('매크로 4개 →', await geo(), '| 창 높이', await p.evaluate(() => innerHeight));
  // 설정: 원래 자리
  await p.evaluate(() => localStorage.setItem('r20_edge_dm', 'map'));
  await p.evaluate(() => window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(200);
  console.log('원래 자리(설정 값) →', await geo());
  console.log('errors:', errs); await b.close();
})();
