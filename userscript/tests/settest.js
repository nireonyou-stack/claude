// 설정 창 새 줄 · 종류별 하나 모드
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear();
    document.body.insertAdjacentHTML('beforeend', `<div id="textchat-input"><div><select id="speakingas"><option>GM</option></select></div><textarea></textarea><button id="chatSendBtn">Send</button></div>`);
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.evaluate(() => { const r = document.querySelector('#r20be'); if (!r || !r.classList.contains('r20be-show') || !r.classList.contains('r20be-setmode')) document.querySelector('#custom-settings-btn').click(); }); await p.waitForTimeout(200);
  console.log('rows:', await p.$$eval('#custom-settings-popup .cs-row', rs => rs.map(r => r.textContent.trim().replace(/\s+/g, ' ')).filter(t => /찾기|창 자리|기억 방식/.test(t)).join(' / ')));
  await p.$eval('#custom-settings-popup [role=radio][data-v="kind"]', b => b.click());
  console.log('mode:', await p.evaluate(() => localStorage.getItem('r20_win_mode')), await p.$eval('#custom-settings-popup [data-v="kind"]', b => b.getAttribute('aria-checked')));
  await p.$eval('#custom-settings-popup .r20qf-open', b => b.click()); await p.waitForTimeout(100);
  console.log('열기 단추 → 빠른 찾기:', await p.$eval('#r20-qf', e => e.classList.contains('show')));
  await p.keyboard.press('Escape');
  // 종류별 하나: c1 자리를 기억하면 c2 도 같은 자리
  const mk = (id, at) => p.evaluate(([id, at]) => { $(`<div class="dialog characterdialog" data-characterid="${id}">x</div>`).dialog({ title: id, width: 400, height: 300, position: { my: 'left top', at, of: window } }); }, [id, at]);
  await mk('c1', 'left+40 top+60'); await p.waitForTimeout(300);
  await p.click('.ui-dialog:has([data-characterid="c1"]) .r20wm-pin');
  await mk('c2', 'left+600 top+300'); await p.waitForTimeout(500);
  console.log('c2 자리 (c1 = 40,60):', await p.$eval('.ui-dialog:has([data-characterid="c2"])', d => d.offsetLeft + ',' + d.offsetTop), '| c2 📌:', await p.$eval('.ui-dialog:has([data-characterid="c2"]) .r20wm-pin', b => b.getAttribute('aria-pressed')));
  console.log('errors:', errs); await b.close();
})();
