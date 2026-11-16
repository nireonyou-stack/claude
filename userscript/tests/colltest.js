// v1.110.8 모음 탭(매크로 · 덱 · 굴림표): 항목을 눌러 연 창이 맨 앞일 때 다시 누르면 닫힘 · 뒤에 깔려 있으면 앞으로(Roll20 그대로) · 창을 안 여는 단추는 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px;background:#fff">'
      + '<div id="existingmacros"><div class="macro" data-macroid="m1"><span class="name">공격</span></div></div>'
      + '<div id="deckstables"><table><tr class="deck" data-deckid="d1"><td>타로</td><td><button class="shuffle">섞기</button></td></tr>'
      + '<tr class="rollabletable" data-tableid="t1"><td>날씨</td></tr></table></div></div>'
      + '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    // Roll20(jQuery UI) 흉내: 항목을 누르면 그 항목의 창을 (없으면 만들어) 보이고 맨 위로 · 닫기는 숨김
    window.__calls = []; let z = 10500;
    const open = key => { __calls.push(key); let d = document.getElementById('dlg-' + key);
      if (!d) { d = document.createElement('div'); d.id = 'dlg-' + key; d.className = 'ui-dialog ui-front';
        d.style.cssText = 'position:fixed;left:300px;top:120px;width:260px;height:200px;background:#fff;border:1px solid #777';
        d.innerHTML = '<div class="ui-dialog-titlebar"><span class="ui-dialog-title">' + key + '</span><button class="ui-dialog-titlebar-close">x</button></div>';
        d.querySelector('.ui-dialog-titlebar-close').addEventListener('click', () => { d.style.display = 'none'; }); document.body.append(d); }
      d.style.display = ''; d.style.zIndex = String(++z); };
    document.getElementById('rightsidebar').addEventListener('click', e => {
      if (e.target.closest('.shuffle')) { __calls.push('shuffle'); return; }
      const r = e.target.closest('.macro, tr.deck, tr.rollabletable'); if (r) open(r.dataset.macroid || r.dataset.deckid || r.dataset.tableid);
    });
    const coll = arr => ({ models: arr, length: arr.length, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const st = () => p.evaluate(() => ['m1', 'd1', 't1'].map(k => { const d = document.getElementById('dlg-' + k); return k + ':' + (!d ? '없음' : d.style.display === 'none' ? '닫힘' : 'z' + d.style.zIndex); }).join(' ') + ' | Roll20 누름 ' + __calls.join(','));
  await p.click('#existingmacros .macro .name'); await p.waitForTimeout(1700);
  console.log('매크로 처음 누름 → 열림:', await st());
  await p.click('#existingmacros .macro .name'); await p.waitForTimeout(200);
  console.log('맨 앞일 때 다시 누름 → 닫힘:', await st());
  await p.click('#existingmacros .macro .name'); await p.waitForTimeout(1700);
  console.log('닫힌 것 누름 → 다시 열림:', await st());
  await p.click('#deckstables tr.rollabletable td'); await p.waitForTimeout(1700);
  console.log('굴림표 열기 (매크로 창 위로):', await st());
  await p.click('#existingmacros .macro .name'); await p.waitForTimeout(300);
  console.log('뒤에 깔린 매크로 누름 → 닫지 않고 앞으로:', await st());
  await p.click('#existingmacros .macro .name'); await p.waitForTimeout(200);
  console.log('이제 맨 앞이라 닫힘:', await st());
  await p.click('#deckstables tr.deck td'); await p.waitForTimeout(1700);
  await p.click('#deckstables tr.deck .shuffle'); await p.waitForTimeout(1700);
  console.log('덱 창 연 뒤 같은 줄의 [섞기](창 없음) → 덱 창 그대로:', await st());
  await p.click('#deckstables tr.deck td'); await p.waitForTimeout(200);
  console.log('덱 이름 다시 누름 → 닫힘:', await st());
  console.log('errors:', errs); await b.close();
})();
