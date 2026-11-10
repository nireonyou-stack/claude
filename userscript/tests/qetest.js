// v1.80 일괄 편집기 · 매크로 선택지 편집: 표 · 묶음 · 앞뒤 붙이기 · 빼기 · 찾아 바꾸기 · 주소 확인 · 고치기 · 순서 · 되돌리기 · 글 ↔ 표 · 미리보기 · 저장
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const ACTION = `/desc ?{장면 선택|사픽-시크|
도입 페이즈,https://i.imgur.com/mLdgImK.png|
메인 페이즈,https://i.imgur.com/8ll6baD.png|
――――――――――――――――――-|
글리치-인트로, [도입](https://i.imgur.com/m4FfGp4.gif)|
메인, [메인](https://i.imgur.com/8mttSQv.gif)|
――――――――――――――――――-|
윈도우즈-도입,https://imgur.comLON2gNv.png|
마스터 장면,https://imgur.comtSc75cU.png)
1사이클,https://imgur.comlR1uZIT.png|
――――――――――――――――――-|
SF HUD 테마 - 10사이클,https://imgur.com/cVKV4sp.png
――――――――――――――――――-|
아지트 페이즈,https://i.imgur.com/PykbD8b|
더블크로스-전투-이니셔,blob:https://imgur.com/8595e672-3fb4-462c-bab9-c135a3366bc4|
글리치—————————————————|
글리치-도입,https://imgur.com/m4FfGp4.gif|
글리치-메인 페이즈,https://imgur.com/8mttSQv.gif|
글리치-★장면 열기,https://imgur.com/OireDHh.gif}`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route(/imgur\.com/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#345"/></svg>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(ACTION => {
    localStorage.clear();
    document.body.innerHTML = '<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    const M = (id, a) => ({ id, attributes: a, get: k => a[k], set: (k, v) => { if (typeof k === 'object') Object.assign(a, k); else a[k] = v; }, save: function (o) { if (o) Object.assign(a, o); window.__saved = { ...a }; } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, create: o => { const m = M('new' + arr.length, o); arr.push(m); return m; }, forEach: f => arr.forEach(f) });
    window.Campaign = { get: k => k === 'journalfolder' || k === 'jukeboxfolder' ? '[]' : null, save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) };
    window.currentPlayer = { id: 'p1', macros: coll([M('m1', { name: '장면선택', action: ACTION, visibleto: '', istokenaction: false }), M('m2', { name: '그냥', action: '/r 1d6', visibleto: '', istokenaction: false })]) };
    window.is_gm = true;
  }, ACTION);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.waitForSelector('#r20-bebtn'); await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.evaluate(() => [...document.querySelectorAll('#r20be button')].find(x => x.textContent.trim() === '매크로')?.click()); await p.waitForTimeout(400);
  await p.click('#r20be .r20be-row[data-id="m1"] [data-act="pick"]'); await p.waitForTimeout(300);
  const rows = () => p.$$eval('#r20be .qe-r[data-id]', rs => rs.map(r => { const k = r.className.match(/k-(\w+)/)[1], l = r.querySelector('.qe-l').value, v = r.querySelector('.qe-v')?.value; return (k === 'opt' ? '' : k === 'grp' ? '▣' : '—') + l.trim().slice(0, 14) + (v != null ? '=' + v.trim().slice(0, 30) : '') + (r.querySelector('.qe-w') ? '⚠' : '') + (r.classList.contains('sel') ? '☑' : ''); }));
  console.log('내용 보기:', await p.$$eval('#r20be .qe-mode button', bs => bs.map(x => x.textContent + (x.classList.contains('on') ? '✓' : '')).join(' ')), '| 머리:', await p.$eval('#r20be .qe-info', e => [...e.querySelectorAll('input')].map(i => JSON.stringify(i.value)).join(' ') + ' ' + e.querySelector('.qe-cnt').textContent));
  console.log('표:', (await rows()).join(' | '));
  console.log('경고:', await p.$$eval('#r20be .qe-w', ws => ws.map(w => w.closest('.qe-r').querySelector('.qe-l').value.trim().slice(0, 8) + ': ' + w.textContent.replace('⚠', '').trim()).join(' / ')));
  console.log('그림:', await p.$$eval('#r20be .qe-th', ts => ts.map(t => t.querySelector('img') ? (t.classList.contains('bad') ? '✗' : 'o') : '·').join('')));
  // 그냥 매크로는 글만
  await p.click('#r20be .r20be-row[data-id="m2"] [data-act="pick"]'); await p.waitForTimeout(150);
  console.log('그냥 매크로 → 표 없음:', !(await p.$('#r20be .qe-mode')), '| 글 칸:', !!(await p.$('#r20be .r20be-ta')));
  await p.click('#r20be .r20be-row[data-id="m1"] [data-act="pick"]'); await p.waitForTimeout(200);
  // 묶음(글리치—) 고르기 → 안의 줄 모두 · 앞뒤 붙이기 미리보기 · 적용
  await p.click('#r20be .qe-r.k-grp:has(.qe-l[value^="글리치—"]) .qe-cb'); await p.waitForTimeout(80);
  await p.fill('#r20be .qe-b[data-k="pre"]', '[{이름}]('); await p.fill('#r20be .qe-b[data-k="suf"]', ')'); await p.waitForTimeout(250);
  console.log('글리치 묶음 고름 →', await p.$eval('#r20be .qe-sum', e => e.textContent), '| 미리보기 줄:', await p.$$eval('#r20be .qe-new span', s => s.map(x => x.textContent).join(' / ')), '| 단추:', await p.$eval('#r20be .qe-go', e => e.textContent));
  if (SHOT) await p.screenshot({ path: SHOT + '/qe-bulk.png', clip: { x: 0, y: 0, width: 1366, height: 860 } });
  await p.click('#r20be .qe-go'); await p.waitForTimeout(150);
  console.log('적용 →', (await rows()).slice(-3).join(' | '), '| 칸 비움:', await p.$eval('#r20be .qe-b[data-k="pre"]', e => JSON.stringify(e.value)), '| 목록 점:', !!(await p.$('#r20be .r20be-row[data-id="m1"] .r20be-dot')));
  await p.click('#r20be .qe-bulk button:has-text("되돌리기")'); await p.waitForTimeout(100);
  console.log('되돌리기 →', (await rows()).slice(-1).join(''));
  // 이름 앞에 묶음 이름 (자주 쓰는 것) — 고른 줄 그대로
  await p.click('#r20be .qe-chip:has-text("이름 앞에 묶음 이름")'); await p.waitForTimeout(250);
  console.log('묶음 이름 붙이기 미리보기:', await p.$$eval('#r20be .qe-new span', s => s.map(x => x.textContent).join(' / ')));
  await p.fill('#r20be .qe-b[data-k="pre"]', ''); await p.waitForTimeout(200);
  // 고른 것 풀고 찾아 바꾸기 (모든 줄): imgur.com/ → i.imgur.com/
  await p.click('#r20be .qe-r.k-grp:has(.qe-l[value^="글리치—"]) .qe-cb'); await p.waitForTimeout(80);
  await p.click('#r20be .qe-seg button:has-text("값")');
  await p.fill('#r20be .qe-b[data-k="find"]', 'https://imgur.com/'); await p.fill('#r20be .qe-b[data-k="rep"]', 'https://i.imgur.com/'); await p.waitForTimeout(250);
  console.log('찾아 바꾸기 →', await p.$eval('#r20be .qe-sum', e => e.textContent), '|', await p.$eval('#r20be .qe-go', e => e.textContent));
  await p.click('#r20be .qe-go'); await p.waitForTimeout(150);
  // 주소 고치기: / 넣기 · ) 빼기 · 두 줄로 나누기 · .png 붙이기
  for (const fx of ['slash', 'paren', 'split', 'ext']) { const b2 = await p.$(`#r20be .qe-fx[data-fix="${fx}"]`); if (b2) { await b2.click(); await p.waitForTimeout(80); } }
  for (let k = 0; k < 4; k++) { const b2 = await p.$('#r20be .qe-fx'); if (!b2) break; await b2.click(); await p.waitForTimeout(60); }
  console.log('고친 뒤 표:', (await rows()).join(' | '));
  console.log('남은 경고:', await p.$$eval('#r20be .qe-w', ws => ws.map(w => w.textContent.replace('⚠', '').trim().slice(0, 30)).join(' / ')));
  // 이름 칸에 , 넣기 → &#44;
  const lab = await p.$('#r20be .qe-r.k-opt .qe-l'); await lab.fill('도입, 시작'); await lab.press('Tab'); await p.waitForTimeout(100);
  console.log('이름에 쉼표 →', await p.$eval('#r20be .qe-r.k-opt .qe-l', e => e.value));
  // 끌어서 순서: 첫 선택지를 둘째 선택지 아래로
  await p.$eval('#r20be .qe-tbl', e => { e.scrollIntoView({ block: 'start' }); e.scrollTop = 0; }); await p.waitForTimeout(100);
  const h1 = await p.$eval('#r20be .qe-r.k-opt .qe-dr', e => e.getBoundingClientRect().toJSON()), r2 = await p.$eval('#r20be .qe-r.k-opt:nth-of-type(4)', e => e.getBoundingClientRect().toJSON());
  await p.mouse.move(h1.x + 4, h1.y + 6); await p.mouse.down(); await p.mouse.move(h1.x + 4, r2.y + r2.height - 4, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(120);
  console.log('끌어 순서 →', (await rows()).slice(0, 4).join(' | '));
  // 줄 더하기 · 지우기
  await p.click('#r20be .qe-ft button:has-text("＋ 구분선")'); await p.waitForTimeout(80);
  console.log('＋ 구분선 → 마지막:', (await rows()).slice(-1).join(''));
  await p.click('#r20be .qe-r[data-id]:last-of-type .qe-x'); await p.waitForTimeout(80);
  // 미리보기
  await p.click('#r20be .qe-pvb'); await p.waitForTimeout(200);
  await p.click('#r20be .qe-r.k-opt:nth-of-type(3) .qe-th'); await p.waitForTimeout(200);
  console.log('미리보기: 선택창', await p.$$eval('#r20be .qe-ql .o', os => os.length + '줄 · 고른 것 ' + (os.find(o => o.classList.contains('on'))?.textContent || '-')), '| 채팅:', await p.$eval('#r20be .qe-chat', e => (e.querySelector('img') ? '[그림] ' : '') + e.querySelector('code').textContent.slice(0, 40)), '| 글:', await p.$eval('#r20be .qe-code', e => e.querySelectorAll('.a').length + '줄 초록 · ' + e.querySelectorAll('.w').length + '줄 주황'));
  if (SHOT) await p.screenshot({ path: SHOT + '/qe-pv.png', fullPage: false });
  // 글로 바꿔 고치고 다시 표
  await p.click('#r20be .qe-mode button:has-text("글")'); await p.waitForTimeout(150);
  const ta = await p.$('#r20be .r20be-ta'); const tv = await ta.inputValue();
  console.log('글 → 끝:', JSON.stringify(tv.slice(-60)));
  await ta.fill(tv.replace(/\}$/, '|새로 넣은 줄,https://i.imgur.com/abc.png}')); await p.waitForTimeout(100);
  await p.click('#r20be .qe-mode button:has-text("선택지 표")'); await p.waitForTimeout(150);
  console.log('다시 표 → 마지막:', (await rows()).slice(-1).join(''));
  // 저장
  await p.click('#r20be button:has-text("저장")'); await p.waitForTimeout(1500);
  const sv = await p.evaluate(() => window.__saved?.action || '');
  console.log('저장된 글:', sv.length, '자 · 처음', JSON.stringify(sv.slice(0, 40)), '· 끝', JSON.stringify(sv.slice(-50)), '· 중괄호', (sv.match(/\{/g) || []).length + '/' + (sv.match(/\}/g) || []).length);
  console.log('errors:', errs); await b.close();
})();
