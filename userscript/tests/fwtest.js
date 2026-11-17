// v1.115.0 블러드문 팔로워 종별 자동완성: 팔로워 줄 종별(kind)에 치면 특수능력(special)을 채움 · 상위특수능력은 LV 6 이상일 때만 아랫줄
// 아이템 줄의 분류(kind)는 그대로 아이템 자동완성 · 종별 칸엔 🎯 없음
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    window.NIRE_RULEDATA = {
      bloodmoon_follower: [{ name: '첩보원', desc: '몬스터를 조사하고 있는 비밀조직의 첩보원입니다', special: '사이클마다 한 번 수렵판정에 -2.', upper: '사이클마다 추가로 [레벨-5]회.' }, { name: '변신자', desc: '짐승으로 변신하는 파워', special: '변신하는 동물을 하나 설정.', upper: '공격판정 성공 시 변조.' }],
      bloodmoon_item: [{ name: '구급상자', kind: '아이템', effect: '회복' }] };
    const fw = id => `<div class="repitem" data-reprowid="${id}"><input name="attr_name"> <input name="attr_kind"> <input name="attr_lv" value="${id === 'f1' ? 3 : 7}"> <textarea name="attr_special"></textarea> <input name="attr_ab1_name"></div>`;
    document.body.innerHTML = `<div class="bm" id="sheet" style="position:absolute;left:20px;top:20px;width:600px">
      <div class="repcontainer" data-groupname="repeating_followers">${fw('f1')}${fw('f2')}</div>
      <div class="repcontainer" data-groupname="repeating_items"><div class="repitem"><input name="attr_name"> <input name="attr_kind"> <textarea name="attr_effect"></textarea></div></div></div>
      <div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%"></div>`;
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const row = id => `[data-reprowid="${id}"]`;
  const vals = id => p.$eval(row(id), r => ['kind', 'special'].map(k => k + '=' + (r.querySelector(`[name="attr_${k}"]`).value || '∅').replace(/\n/g, ' ⏎ ')).join(' | '));
  await p.click(row('f1') + ' [name="attr_kind"]'); await p.keyboard.type('첩보'); await p.waitForTimeout(100);
  console.log('후보:', await p.$eval('#r20-ac-box', e => e.classList.contains('show') ? [...e.querySelectorAll('.r20-ac-item')].map(i => i.textContent).join(' / ') : '(없음)'));
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  console.log('LV 3 →', await vals('f1'));
  await p.click(row('f2') + ' [name="attr_kind"]'); await p.keyboard.type('변신'); await p.waitForTimeout(100); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  console.log('LV 7 →', await vals('f2'));
  await p.click('[data-groupname="repeating_items"] [name="attr_kind"]'); await p.keyboard.type('첩보'); await p.waitForTimeout(100);
  console.log('아이템 분류 칸은 팔로워 후보 없음:', await p.$eval('#r20-ac-box', e => !e.classList.contains('show')));
  await p.hover(row('f1') + ' [name="attr_kind"]'); await p.waitForTimeout(150);
  console.log('종별 칸 🎯 없음:', !(await p.$('#r20-abt-chip')));
  console.log('errors:', errs); await b.close();
})();
