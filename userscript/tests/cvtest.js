// v1.110.10 채팅 가볍게: 켜면 채팅 메시지에 content-visibility:auto (화면 밖은 그리지 않음) · 설정에서 끄면 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const run = async off => {
    const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8766/blank.html');
    await p.evaluate(off => {
      localStorage.clear(); if (off) localStorage.setItem('r20_show_chatlite', 'false');
      const msg = i => `<div class="message general" data-messageid="m${i}"><span class="by">P${i % 3}:</span> 메시지 ${i}</div>`;
      document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"><div id="textchat" class="textchatcontainer" style="height:700px;overflow:auto"><div class="content">'
        + Array.from({ length: 300 }, (_, i) => msg(i)).join('') + '</div></div></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div>';
      const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f) });
      window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
      window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
    }, off);
    await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ body: document.body.classList.contains('r20cv-on'), cv: getComputedStyle(document.querySelector('#textchat .content > .message')).contentVisibility,
      bottom: (() => { const c = document.getElementById('textchat'); c.scrollTop = 1e9; return c.scrollTop + c.clientHeight >= c.scrollHeight - 1; })() }));
    await p.close(); return r;
  };
  console.log('기본(켬):', JSON.stringify(await run(false)));
  console.log('설정에서 끔:', JSON.stringify(await run(true)));
  console.log('errors:', errs); await b.close();
})();
