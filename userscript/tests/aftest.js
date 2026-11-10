// v1.74.1 자동완성: 채운 칸이 시트 밖을 눌러도 남는지 (Roll20 처럼 글칸은 blur 에 저장 · 밖을 누르면 모델로 다시 그림)
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addScriptTag({ url: '/sn/jquery.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); window.__model = {};
    window.NIRE_RULEDATA = { shinobigami: [{ name: '접근전 공격', group: '하스바', type: '공격', skill: '체술', range: '1', cost: '없음', effect: '근접 공격. 명중하면 접근전 대미지 1점.' }] };
    document.body.innerHTML = `<div id="sheet" style="position:absolute;left:20px;top:20px;width:600px"><div class="repitem">
      <input type="text" name="attr_Ninpo_Name"> <input type="text" name="attr_Ninpo_Clan"> <select name="attr_Ninpo_Types"><option value="">-</option><option value="공격">공격</option><option value="서포트">서포트</option></select>
      <input type="text" name="attr_Ninpo_Assigned_Skill"> <input type="text" name="attr_Ninpo_Range"> <input type="text" name="attr_Ninpo_Cost"><textarea name="attr_Ninpo_Effect"></textarea></div></div>
      <div id="outside" style="position:absolute;left:20px;top:400px;width:300px;height:100px;background:#eee">밖</div>
      <div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%"></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>`;
    // Roll20 흉내: 글칸은 blur 에, 드롭다운은 change 에 저장 · 시트 밖을 누르면 모델 값으로 다시 그림
    $('#sheet').on('blur', 'input[type=text], textarea', e => { __model[e.target.name] = e.target.value; });
    $('#sheet').on('change', 'select', e => { __model[e.target.name] = e.target.value; });
    document.getElementById('outside').addEventListener('mousedown', () => document.querySelectorAll('#sheet [name]').forEach(el => { el.value = __model[el.name] ?? ''; }));
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.click('[name="attr_Ninpo_Name"]'); await p.keyboard.type('접근'); await p.waitForTimeout(100);
  console.log('후보:', await p.$eval('#r20-ac-box', e => e.classList.contains('show') ? e.textContent : '(없음)'));
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  const vals = () => p.$$eval('#sheet [name]', es => es.map(e => e.name.replace('attr_Ninpo_', '') + '=' + (e.value || '∅').slice(0, 8)).join(' '));
  console.log('Enter →', await vals(), '| 포커스:', await p.evaluate(() => document.activeElement.name));
  await p.click('#outside'); await p.waitForTimeout(50);
  console.log('시트 밖 누름 →', await vals());
  console.log('errors:', errs); await b.close();
})();
