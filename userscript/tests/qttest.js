// v1.112.2 매크로 글 선택지 칩: 한 번 누르면 바로 보냄 · 구분선 · 묶음 제목 · 찾기(9개 이상) · 그림 창은 격자 그대로
// 📌 창 기억은 Macro Options 를 그림 · 글 · 칸 종류별로 따로 (작은 입력칸 크기가 그림 창에 씌워지던 것)
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/imgur\.com/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#345"/></svg>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' }); await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('r20_win_mem', JSON.stringify({ 'dlg:Macro Options': { g: { l: 500, t: 300, w: 385, h: 200 } } }));
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
    window.__sent = [];
    // Roll20 흉내: 질문 창 하나 · Submit 은 드롭다운(없으면 입력칸) 값을 보내고 닫힘
    window.__ask = (html) => { const $c = jQuery(`<div><p>질문: ${html}</p></div>`); $c.dialog({ title: 'Macro Options', width: 300, buttons: { Submit() { const s = $c.find('select')[0], i = $c.find('input:not([type=search])')[0]; __sent.push(s ? s.value : i.value); $c.dialog('destroy').remove(); }, Cancel() { $c.dialog('destroy').remove(); } } }); };
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const o = a => '<select>' + a.map(x => `<option value="${x}">${x}</option>`).join('') + '</select>';
  const geo = () => p.evaluate(() => { const d = [...document.querySelectorAll('.ui-dialog')].pop(); if (!d) return '창 없음'; const r = d.getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height) + ' 내용 스크롤 ' + d.querySelector('.ui-dialog-content').scrollTop; });
  const chips = () => p.$$eval('.r20qt-sec', ss => ss.filter(s => !s.hidden).map(s => [...s.children].filter(c => !c.hidden).map(c => c.classList.contains('r20qp-cap') ? '«' + c.textContent + '»' : c.textContent + (c.getAttribute('aria-pressed') === 'true' ? '✓' : '')).join(' ')).join(' || '));
  // 1) 짧은 글 선택지
  await p.evaluate(o => __ask(o), o(['근력', '민첩', '건강', '――――――', '전투—————', '회피', '반격'])); await p.waitForTimeout(400);
  console.log('글 칩:', await chips(), '| 찾기 칸:', !!(await p.$('.r20qt-box input')), '| 드롭다운 그대로:', await p.$eval('.r20qt select', s => getComputedStyle(s).display !== 'none'), '| 창', await geo());
  await p.click('.r20qt-c:has-text("반격")'); await p.waitForTimeout(200);
  console.log('반격 한 번 누름 → 보냄:', await p.evaluate(() => __sent.join(',')), '| 창 남음:', await p.$$eval('.ui-dialog', d => d.length));
  // 2) 많은 선택지 → 찾기 · Enter
  await p.evaluate(o => __ask(o), o(['장면 열기', '장면 닫기', '라운드 시작', '라운드 끝', '마법전 시작', '마법전 개시', '마법전 종료', '턴 종료', '사담 회색', '핸드아웃 공개'])); await p.waitForTimeout(400);
  await p.fill('.r20qt-box input', '마법'); await p.waitForTimeout(80);
  console.log('찾기 마법 →', await chips());
  await p.fill('.r20qt-box input', '종료'); await p.press('.r20qt-box input', 'Enter'); await p.waitForTimeout(200);
  console.log('종료 Enter → 첫 칩 보냄:', await p.evaluate(() => __sent.join(',')));
  // 3) 그림 선택지는 격자 그대로 · 예전 기억(작은 크기)이 안 씌워짐
  await p.evaluate(o => __ask(o), '<select>' + [0, 1, 2, 3].map(i => `<option value="https://i.imgur.com/abcdE1${i}.png">장면 ${i}</option>`).join('') + '</select>'); await p.waitForTimeout(800);
  console.log('그림 창:', await p.$$eval('.r20qp-tile', t => t.length) + '칸 · 칩 ' + (await p.$$eval('.r20qt-c', t => t.length)) + '개 | 창', await geo());
  console.log('창 기억 키:', await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('r20_win_mem'))).join(', ')));
  await p.click('.ui-dialog-buttonset button:has-text("Cancel")'); await p.waitForTimeout(150);
  // 4) 입력칸 질문은 그대로 (예전 기억이 여기로)
  await p.evaluate(() => __ask('<input type="text" value="3">')); await p.waitForTimeout(600);
  console.log('입력칸 창:', await geo(), '| 칩 없음:', !(await p.$('.r20qt-c')));
  console.log('errors:', errs); await b.close();
})();
