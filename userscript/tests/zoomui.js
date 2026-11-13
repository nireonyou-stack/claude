// 글자 크기: 설정 줄 · 일괄 편집기 머리줄 단추 · 창 자리 유지 · 채팅 같이 · 다시 열 때 화면 안
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const OUT = __dirname + '/zoom-';
const mock = () => {
  document.body.innerHTML = `<div id="rightsidebar" style="position:absolute;right:0;top:0;width:330px;height:100%;border-left:1px solid #000">
    <div id="textchat" style="position:absolute;top:30px;bottom:170px;left:0;right:0;overflow:auto"><div class="content">
      <div class="message general"><span class="by">미오:</span> 성문 앞에서 기다릴게. 해가 지기 전에 와.</div>
      <div class="message general"><span class="by">GM:</span> 바람이 차갑게 분다.</div></div></div>
    <div id="textchat-input" style="position:absolute;bottom:0;right:4px;width:305px;display:flex;flex-direction:column"><div><select id="speakingas"><option>미오</option></select></div>
      <textarea style="font-size:13px"></textarea><button id="chatSendBtn">Send</button></div></div>
    <div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol"></div>`;
  const M = (id, a) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; }, save: function (o) { if (o) Object.assign(a, o); } });
  const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, create: o => { const m = M('new' + arr.length, o); arr.push(m); return m; }, forEach: f => arr.forEach(f) });
  const H = [['h1', 'HO1 · 기사단장'], ['h2', 'HO2 · 마녀의 편지']].map(([id, name]) => M(id, { name, inplayerjournals: '', archived: false }));
  const jf = JSON.stringify([{ n: '1장 · 성문', i: ['h1', 'h2'], id: 'f1' }]);
  window.Campaign = { get: k => k === 'journalfolder' ? jf : k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {},
    handouts: coll(H), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
  window.Jukebox = { playlist: coll([]) }; window.is_gm = true;
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => localStorage.clear());
  await p.evaluate(mock); await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const rect = sel => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round).join(','); });
  // 설정 창
  await p.evaluate(() => { const r = document.querySelector('#r20be'); if (!r || !r.classList.contains('r20be-show') || !r.classList.contains('r20be-setmode')) document.querySelector('#custom-settings-btn').click(); }); await p.waitForTimeout(200);
  console.log('settings rows:', (await p.$$eval('#custom-settings-popup .cs-row', rs => rs.slice(0, 2).map(r => r.textContent.trim()))).join(' / '));
  console.log('settings @100%:', await rect('#custom-settings-popup'), 'btn', await rect('#custom-settings-btn'));
  for (let i = 0; i < 5; i++) await p.click('#custom-settings-popup .aio-zm [data-d="1"]');
  await p.waitForTimeout(200);
  console.log('zoom label:', await p.$eval('#custom-settings-popup .aio-zv', e => e.textContent), '| settings @150%:', await rect('#custom-settings-popup'));
  await p.screenshot({ path: OUT + 'settings.png' });
  // 채팅 같이
  await p.click('#custom-settings-popup .cs-row:has-text("Roll20 채팅 글자도 같이") .cs-switch'); await p.waitForTimeout(150);
  console.log('chat zoom:', await p.$eval('#textchat .content', e => getComputedStyle(e).zoom), 'textarea fs:', await p.$eval('#textchat-input textarea', e => getComputedStyle(e).fontSize));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);      // 설정 화면(일괄 편집기 안) 닫기
  // 일괄 편집기
  await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForSelector('#r20be.r20be-show'); await p.waitForTimeout(400);
  console.log('editor @150%:', await rect('#r20be'), '| header label:', await p.$eval('#r20be .aio-zv', e => e.textContent));
  await p.click('#r20be .r20be-row:has-text("마녀")'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'editor150.png' });
  // 머리줄에서 100% 로: 왼쪽 위 자리 유지
  const before = await rect('#r20be');
  await p.$eval('#r20be .r20be-aa', e => e.classList.contains('open') || e.querySelector('.r20be-aab').click()); await p.click('#r20be .aio-zv'); await p.waitForTimeout(200);
  console.log('editor 150→100:', before, '→', await rect('#r20be'), '| settings label:', await p.$eval('#custom-settings-popup .aio-zv', e => e.textContent));
  // 끌기: 화면에서 끈 만큼만 움직이는지 (200%)
  await p.$eval('#r20be .r20be-aa', e => e.classList.contains('open') || e.querySelector('.r20be-aab').click()); await p.click('#r20be .aio-zv'); for (let i = 0; i < 10; i++) await p.click('#r20be .aio-zm [data-d="1"]');
  await p.waitForTimeout(200);
  const r0 = await p.$eval('#r20be .r20be-head strong', e => { const r = e.getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; });
  const a = await rect('#r20be');
  await p.mouse.move(r0.x + 40, r0.y); await p.mouse.down(); await p.mouse.move(r0.x + 140, r0.y + 30, { steps: 5 }); await p.mouse.up();
  console.log('drag +100,+30 @200%:', a, '→', await rect('#r20be'), 'viewport 1280x800');
  // 다시 열기: 저장된 자리가 화면 밖이면 안으로
  await p.evaluate(() => { const e = document.getElementById('r20be'); e.style.left = '900px'; });
  await p.$eval('#r20be .r20be-ib[aria-label="닫기"]', e => e.click()); await p.evaluate(() => { if (!document.getElementById('sidebarcontrol')) document.body.insertAdjacentHTML('beforeend', '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'); }); await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', b => b.click()); await p.waitForTimeout(300);
  console.log('reopen fit @200%:', await rect('#r20be'));
  await p.screenshot({ path: OUT + 'editor200.png' });
  console.log('errors:', errs); await b.close();
})();
