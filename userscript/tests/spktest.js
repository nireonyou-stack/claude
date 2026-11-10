// v1.79 말하는 사람 고르기 (▼ + 빠른 저널 합침): 채팅 판 왼쪽에 붙음 · 최근 · 목록 ↔ 크게 · 찾기(초성) · ↑↓ Enter · 📌 · 순서 바꾸기 · Esc · 밖 누르기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/올인원\] .*오류/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('r20_aio_zoom', '1.1');
    document.body.style.cssText = 'margin:0;height:100vh;background:#26262b;font:13px sans-serif';
    const svg = c => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="${c}"/></svg>`);
    const chars = [['c1', '리버트 · 마검사', '#3b7bd6'], ['c2', '키어런', '#2d9b5a'], ['c3', '캄파넬라 — 「눈꽃의 십자가」', ''], ['c4', '시라토리 루나', '#8a4fb8'], ['c5', '카바라 타케루', '#c0395a']];
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <div id="textchat" style="height:600px;overflow:auto"><div class="content"><div class="message general"><span class="by">니레:</span> 안녕</div></div></div>
        <div id="journal" style="display:none"><ol>${chars.map(([id, n, c]) => `<li class="journalitem character" data-itemid="${id}"><img src="${c ? svg(c) : '/images/character.png'}"><div class="name">${n}</div></li>`).join('')}</ol></div>
        <div id="textchat-input" style="position:absolute;bottom:0;left:0;right:0"><div><select id="speakingas"><option value="player|p1">니레</option>${chars.map(([id, n]) => `<option value="character|${id}">${n}</option>`).join('')}</select></div><textarea style="width:100%;height:60px"></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
    window.__chg = []; document.getElementById('speakingas').addEventListener('change', e => window.__chg.push(e.target.value));
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const R = sel => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round).join(','); });
  const rows = () => p.$$eval('#custom-journal-popup .cj-list .cj-item', is => is.map(i => (i.querySelector('img') ? '🖼' : '·') + i.textContent + (i.classList.contains('cj-selected') ? '✓' : '') + (i.classList.contains('hl') ? '◀' : '')).join(' | '));
  const shown = () => p.$eval('#custom-journal-popup', e => e.classList.contains('show')).catch(() => false);
  console.log('말하는 사람 줄:', await p.$eval('#custom-speaker-wrap', w => [...w.children].map(c => c.id || c.tagName).join(' | ')), '| 📘 없음:', !(await p.$('#custom-journal-toggle')), '| ▼ 역할:', await p.$eval('#custom-select-visual', v => v.getAttribute('role') + ' / select 누르기 ' + getComputedStyle(document.getElementById('speakingas')).pointerEvents));
  await p.click('#custom-select-visual'); await p.waitForTimeout(150);
  console.log('▼ → 열림:', await shown(), '| 자리(채팅 판 왼쪽 1066 · 아래 768):', await R('#custom-journal-popup'), '| 찾기 포커스:', await p.evaluate(() => document.activeElement?.className));
  console.log('목록:', await rows(), '| 최근 칸 보임:', await p.$eval('#custom-journal-popup .cj-recw', e => !e.hidden));
  await p.keyboard.type('ㅋ'); await p.waitForTimeout(80);
  console.log('ㅋ →', await rows());
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  console.log('↓ Enter → 고름:', await p.evaluate(() => window.__chg.join(',')), '| 창 닫힘:', !(await shown()), '| 포커스:', await p.evaluate(() => document.activeElement?.tagName), '| 입력칸 이름:', await p.$eval('#custom-speaker-name', e => e.value), '| 아이콘:', await p.$eval('#custom-icon-box', e => e.querySelector('img') ? 'img' : e.textContent));
  await p.click('#custom-select-visual'); await p.waitForTimeout(150);
  console.log('다시 → 최근:', await p.$$eval('#custom-journal-popup .cj-ri', bs => bs.map(x => x.title + (x.classList.contains('on') ? '✓' : '')).join(', ')), '| 목록:', await rows());
  // 크게 보기
  await p.click('#custom-journal-popup [data-a="view"]'); await p.waitForTimeout(80);
  const gi = () => p.$eval('#custom-journal-popup .cj-list .cj-item .cj-av', e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
  console.log('▦ → 격자:', await p.$eval('#custom-journal-popup .cj-list', e => e.classList.contains('grid')), '| 포트레이트:', await gi(), '| 이름 글자:', await p.$eval('#custom-journal-popup .cj-list .cj-nm', e => getComputedStyle(e).fontSize), '| 아이콘 줄:', await p.$eval('#custom-journal-popup .cj-ft', e => !e.hidden));
  await p.click('#custom-journal-popup [data-a="sz"][data-d="10"]'); await p.waitForTimeout(50);
  console.log('  + →', await gi(), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_cj_size') + ' / ' + localStorage.getItem('r20_cj_view')));
  if (SHOT) await p.screenshot({ path: SHOT + '/spk-grid.png', clip: { x: 760, y: 300, width: 606, height: 468 } });
  // 📌 → 골라도 열려 있음
  await p.click('#custom-journal-popup [data-a="pin"]');
  await p.click('#custom-journal-popup .cj-item[data-char-value="character|c4"]'); await p.waitForTimeout(100);
  console.log('📌 + 시라토리 → 고름:', await p.evaluate(() => window.__chg.at(-1)), '| 열림:', await shown());
  await p.mouse.click(400, 300); await p.waitForTimeout(80);
  console.log('📌 + 맵 누름 → 열림:', await shown());
  await p.click('#custom-journal-popup [data-a="pin"]');
  // 목록으로 돌아가 순서 바꾸기 (첫 줄을 셋째 줄 아래로)
  await p.click('#custom-journal-popup [data-a="view"]'); await p.waitForTimeout(80);
  const a = await p.$eval('#custom-journal-popup .cj-list .cj-item:nth-child(1)', e => e.getBoundingClientRect().toJSON()), c = await p.$eval('#custom-journal-popup .cj-list .cj-item:nth-child(3)', e => e.getBoundingClientRect().toJSON());
  await p.mouse.move(a.x + 60, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(c.x + 60, c.y + c.height - 4, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(100);
  console.log('끌어 순서 →', await rows(), '| 고름 안 바뀜:', await p.evaluate(() => window.__chg.at(-1)), '| 기억:', await p.evaluate(() => JSON.parse(localStorage.getItem('r20_char_order') || '[]').length));
  if (SHOT) await p.screenshot({ path: SHOT + '/spk-list.png', clip: { x: 760, y: 300, width: 606, height: 468 } });
  await p.keyboard.press('Escape'); await p.waitForTimeout(60);
  console.log('Esc → 닫힘:', !(await shown()));
  await p.click('#custom-select-visual'); await p.waitForTimeout(100); await p.mouse.click(400, 300); await p.waitForTimeout(80);
  console.log('열고 맵 누름 → 닫힘:', !(await shown()));
  await p.focus('#custom-select-visual'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  console.log('▼ 에서 Enter → 열림:', await shown()); await p.keyboard.press('Escape');
  // 붙인 창 너비 · 높이 끌기
  await p.click('#custom-select-visual'); await p.waitForTimeout(120);
  let g = await p.$eval('#custom-journal-popup .cj-gw', e => e.getBoundingClientRect().toJSON());
  await p.mouse.move(g.x + 3, g.y + 100); await p.mouse.down(); await p.mouse.move(g.x - 77, g.y + 100, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(80);
  g = await p.$eval('#custom-journal-popup .cj-gh', e => e.getBoundingClientRect().toJSON());
  await p.mouse.move(g.x + 100, g.y + 2); await p.mouse.down(); await p.mouse.move(g.x + 100, g.y - 120, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(80);
  console.log('붙인 채 너비 +80 · 높이 +120 →', await R('#custom-journal-popup'), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_cj_w') + ' / ' + localStorage.getItem('r20_cj_h')));
  // 띄우기 (독립 창)
  await p.click('#custom-journal-popup [data-a="dock"]'); await p.waitForTimeout(80);
  console.log('⇥ → 띄움:', await p.$eval('#custom-journal-popup', e => e.classList.contains('float') + ' · resize ' + getComputedStyle(e).resize), '| 자리 그대로:', await R('#custom-journal-popup'));
  const hdr = await p.$eval('#custom-journal-popup .cj-hd', e => e.getBoundingClientRect().toJSON());
  const mvh = await p.$eval('#custom-journal-popup .cj-mv', e => e.getBoundingClientRect().toJSON()); await p.mouse.move(mvh.x + 5, mvh.y + 8); await p.mouse.down(); await p.mouse.move(mvh.x - 295, mvh.y - 142, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  console.log('머리줄 끌기 →', await R('#custom-journal-popup'), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_cj_geo')));
  await p.$eval('#custom-journal-popup', e => { e.style.width = '330px'; e.style.height = '300px'; }); await p.waitForTimeout(450);
  console.log('크기 바꿈 → 기억:', await p.evaluate(() => { const g = JSON.parse(localStorage.getItem('r20_cj_geo')); return Math.round(g.w) + 'x' + Math.round(g.h); }));
  await p.keyboard.press('Escape'); await p.click('#custom-select-visual'); await p.waitForTimeout(100);
  console.log('닫고 다시 → 띄운 자리:', await R('#custom-journal-popup'));
  await p.click('#custom-journal-popup [data-a="dock"]'); await p.waitForTimeout(80);
  console.log('⇥ 다시 → 붙임:', await R('#custom-journal-popup'), '| float:', await p.$eval('#custom-journal-popup', e => e.classList.contains('float')));
  await p.keyboard.press('Escape');
  await p.fill('#custom-speaker-name', '수상한 사람'); await p.focus('#custom-speaker-name'); await p.keyboard.press('Escape');
  console.log('이름 칸:', await p.$eval('#custom-speaker-name', e => [e.type, e.autocomplete, e.name, JSON.stringify(e.value), getComputedStyle(e).appearance].join(' · ')));
  // 묶음 끄면 Roll20 기본 목록
  await p.evaluate(() => { localStorage.setItem('r20_show_journal', 'false'); });
  console.log('errors:', errs); await b.close();
})();
