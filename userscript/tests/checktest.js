// v1.67 자가 점검 · 진단 복사: 다 정상 / Roll20 이 바뀐 경우(배율 숫자 · 채팅 칸 없음) / 기능 오류 기록
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const run = async (b, label, broken) => {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: SHOT ? 2 : 1, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(broken => {
    localStorage.clear();
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a';
    document.body.insertAdjacentHTML('beforeend', `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <div id="journal"></div><div id="jukebox"><ol id="jukeboxfolderroot"></ol></div>
        ${broken ? '' : '<div id="textchat"><div class="content"></div></div>'}
        <div id="textchat-input" style="position:absolute;bottom:0;left:0;right:0"><div><select id="speakingas"><option>GM</option></select></div><textarea></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>
      <div id="vm_zoom_buttons"><div class="wrapper"><div class="parentContainer"><div class="zoomButtonsInner"><button class="plus"></button>${broken ? '' : '<button class="level"><span>100</span></button>'}<button class="minus"></button></div></div></div></div>`);
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const h = { id: 'h1', attributes: { name: '비밀 핸드아웃' }, get(k) { return this.attributes[k]; }, _getLatestBlob(f, cb) { cb(''); } };
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll(broken ? [{ id: 'h1', get: () => 'x' }] : [h]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true; window.campaign_id = 5;
  }, broken);
  await p.addScriptTag({ content: us });
  await p.waitForTimeout(6800);          // 기다렸다가 점검 (2초 + 4초)
  const badge = await p.$eval('#custom-settings-btn', b => b.classList.contains('aio-warn'));
  await p.evaluate(() => { const r = document.querySelector('#r20be'); if (!r || !r.classList.contains('r20be-show') || !r.classList.contains('r20be-setmode')) document.querySelector('#custom-settings-btn').click(); }); await p.waitForTimeout(100);
  console.log(`[${label}] ⚙ ! :`, badge, '| 맨 위 줄:', await p.$eval('#custom-settings-popup .cs-check', e => e.className + ' — ' + e.innerText.replace(/\n+/g, ' / ')));
  if (SHOT) await p.screenshot({ path: `${SHOT}/check-${label}.png`, clip: { x: 860, y: 60, width: 340, height: 560 } });
  if (broken) {
    // 기다리는 중이면 [다시 점검] 으로 바로
    await p.click('#custom-settings-popup .cs-check [data-a="re"]'); await p.waitForTimeout(100);
    console.log(`[${label}] 다시 점검 →`, await p.$eval('#custom-settings-popup .cs-check', e => e.className + ' — ' + e.innerText.replace(/\n+/g, ' / ')));
    // 기능 하나가 오류를 내게 만들고 (빠른 찾기 단추 넣기) 화면을 바꿔 다시 붙이게
    await p.evaluate(() => { const g = document.getElementById.bind(document); document.getElementById = id => { if (id === 'r20-scnbtn') throw new Error('테스트 오류'); return g(id); }; document.body.append(document.createElement('div')); });
    await p.waitForTimeout(700);
    await p.evaluate(() => { delete document.getElementById; });
    console.log(`[${label}] 오류 뒤 ⚙ ! :`, await p.$eval('#custom-settings-btn', b => b.classList.contains('aio-warn')), '| 맨 위 줄:', await p.$eval('#custom-settings-popup .cs-check', e => e.innerText.replace(/\n+/g, ' / ')));
    if (SHOT) await p.screenshot({ path: `${SHOT}/check-${label}.png`, clip: { x: 860, y: 60, width: 340, height: 560 } });
  }
  await p.click('#custom-settings-popup .cs-check [data-a="copy"]'); await p.waitForTimeout(150);
  console.log(`[${label}] 진단 복사:\n` + (await p.evaluate(() => navigator.clipboard.readText())).replace(/^/gm, '      '));
  console.log(`[${label}] 방 이름이 들어갔나:`, (await p.evaluate(() => navigator.clipboard.readText())).includes('비밀'), '| errors:', errs);
  await ctx.close();
};
(async () => {
  const b = await chromium.launch();
  await run(b, '정상', false);
  await run(b, '바뀜', true);
  await b.close();
})();
