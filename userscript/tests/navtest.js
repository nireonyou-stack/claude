// v1.70 시나리오 내비게이터: ★(시나리오·장면표) 먼저 · 따로/이어서 · 서식 그대로(위험한 것만 뺌) · 찾기 · 입력칸에 넣기 · 읽던 자리 · 플레이어
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const filler = n => Array.from({ length: n }, (_, i) => `<p>이야기가 이어진다 ${i}. 바람이 분다.</p>`).join('');
const NOTES = {
  h1: `<h2>도입</h2><p>마을에 도착한다.</p>${filler(12)}<p><b>마을 광장</b></p><p>분수대가 있다.</p>${filler(12)}<p>■ 꽃집</p><p>문에 달린 종이 울린다.</p><p>“어서 오세요.” 앞치마에 흙이 묻은 여자가 웃는다.</p><p><img src="https://files.d20.io/images/1/a/med.png" onerror="window.__x=1"></p><p>【단서】 계산대 밑의 시든 백합 — 편지와 관련.</p><script>window.__x=2</script><p onclick="window.__x=3" style="color:red;font-size:40px">클릭해도 아무 일 없음</p>${filler(12)}<p>■ 뒷문</p><p>창고로 이어지는 좁은 문.</p>${filler(20)}`,
  h2: `<p><b>하루카</b></p><p>꽃집 주인. 편지를 받은 적 있다.</p>`,
  h3: `<p>지도 그림</p>`, h4: `<p>마녀의 밤 본문</p>`, h5: `<p>폴더 밖</p>`,
  h6: `<table border="1" style="width:100%;background-color:#fde"><tr><td style="font-size:18px">1</td><td><span style="color:#c00;font-weight:bold">수상한 꽃 냄새</span> — <a href="http://journal.roll20.net/handout/h2">하루카</a></td></tr></table><div style="position:fixed;top:0;left:0;z-index:99999;background:url(javascript:alert(1))">덮기</div>`,
  h7: `<center><font size="5" color="#06c">토끼가 되어랏!</font></center><p style="text-align:center;font-family:serif">— 시나리오 개요 —</p>`
};
const GM = { h1: escape('<p>하루카는 PC가 편지를 꺼내기 전까지 모르는 척한다.</p>') };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', async d => { console.log('알림창:', d.message().replace(/\n/g, ' / ')); await d.accept(); });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(([NOTES, GM]) => {
    localStorage.clear();
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a;font:13px sans-serif';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div>
      <div id="textchat-input" style="position:absolute;bottom:0;left:0;right:0"><textarea style="width:100%;height:60px"></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    const mk = (id, name, share) => ({ id, attributes: { name, inplayerjournals: share }, get(k) { return this.attributes[k]; }, _getLatestBlob(f, cb) { setTimeout(() => cb(f === 'notes' ? NOTES[id] : GM[id] || ''), 15); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const hs = [mk('h1', '본편', ''), mk('h2', 'NPC', 'all'), mk('h3', '단서 · 지도', ''), mk('h4', '마녀의 밤 본문', ''), mk('h5', '폴더 밖', ''), mk('h6', '▶장면표', ''), mk('h7', '▶[본문] 토끼 시나리오 개요', ''), mk('h8', '시나리오 앵커 A', '')];
    const tree = [{ n: '시나리오', i: [{ n: '마기카로기아', i: [{ n: '토끼가 되어랏!', i: ['h1', 'h2', { n: '자료', i: ['h3', 'h6'] }, 'h7', 'h8'] }, { n: '마녀의 밤', i: ['h4'] }] }] }, 'h5'];
    window.Campaign = { get: k => k === 'journalfolder' ? JSON.stringify(tree) : '[]', save() {}, on() {}, handouts: coll(hs), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  }, [NOTES, GM]);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  console.log('단추줄:', await p.evaluate(() => ['r20-scnbtn', 'r20-snbtn', 'r20-qfbtn'].map(id => id.replace('r20-', '') + '@' + Math.round(document.getElementById(id)?.getBoundingClientRect().top)).join(' ')));
  await p.click('#r20-snbtn'); await p.waitForTimeout(150);
  const geo = () => p.$eval('#r20-sn', w => [w.offsetLeft, w.offsetTop, w.offsetWidth, w.offsetHeight].join(','));
  console.log('처음 → 고르기:', await p.$eval('#r20-sn .pl', e => e.innerText.replace(/\n+/g, ' / ')), '| 창:', await geo());
  await p.fill('#r20-sn .pq', 'ㅌㄲ'); await p.waitForTimeout(60);
  console.log('ㅌㄲ →', await p.$eval('#r20-sn .pl', e => e.innerText.replace(/\n+/g, ' / ')));
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('목차:', await p.$$eval('#r20-sn .toc .tr', ts => ts.map(t => (t.classList.contains('ch') ? '[' : '') + t.textContent + (t.classList.contains('ch') ? ']' : '')).join(' | ')));
  console.log('머리줄:', await p.$eval('#r20-sn .hd', h => h.querySelector('.nm').textContent + ' · ' + h.querySelector('.mt').textContent), '| ⚠ 보임:', await p.$eval('#r20-sn .warn', b => !b.hidden));
  console.log('따로(기본) 보이는 장:', await p.$$eval('#r20-sn .bd section', ss => ss.filter(x => getComputedStyle(x).display !== 'none').map(x => x.querySelector('.cht')?.textContent || x.textContent).join(' | ')), '| 보기:', await p.$eval('#r20-sn .md [aria-checked="true"]', b => b.textContent));
  console.log('서식 그대로 (★ 개요):', await p.evaluate(() => { const f = document.querySelector('#r20-sn .bd font'); const c = document.querySelector('#r20-sn .bd center'); const q = document.querySelector('#r20-sn .bd p[style*="text-align"]'); return { center: !!c, font: f && [f.getAttribute('size'), f.getAttribute('color'), getComputedStyle(f).color].join(','), p: q?.getAttribute('style') }; }));
  // 장면표로 (목차) → 표 · 색 · 고리 · 위험한 위치는 빠짐
  await p.click('#r20-sn .toc .tr.ch:has-text("장면표")'); await p.waitForTimeout(100);
  console.log('장면표 →', await p.evaluate(() => { const bd = document.querySelector('#r20-sn .bd'), sec = [...bd.querySelectorAll('section.ch')].find(x => getComputedStyle(x).display !== 'none'); const t = sec.querySelector('table'), dv = [...sec.querySelectorAll('div')].find(x => x.textContent === '덮기'); return { 보이는장: sec.querySelector('.cht').textContent, table: t && [t.getAttribute('border'), t.getAttribute('style')].join(' / '), td: sec.querySelector('td')?.getAttribute('style'), span: sec.querySelector('span[style]')?.getAttribute('style'), link: sec.querySelector('a')?.dataset.hid, 덮기: dv?.getAttribute('style') ?? '(style 없음)', 덮기위치: dv && getComputedStyle(dv).position }; }));
  await p.click('#r20-sn .bd a[data-hid]'); await p.waitForTimeout(100);
  console.log('하루카 고리 → 보이는 장:', await p.$$eval('#r20-sn .bd section.ch', ss => ss.filter(x => getComputedStyle(x).display !== 'none').map(x => x.querySelector('.cht').textContent).join(',')));
  await p.click('#r20-sn .toc .tr.ch:has-text("본편")'); await p.waitForTimeout(100);
  console.log('안전: script·onclick 빠짐 · 글씨 크기 남음 —', await p.evaluate(() => { const bd = document.querySelector('#r20-sn .bd'); return { script: !!bd.querySelector('script'), onclick: [...bd.querySelectorAll('*')].some(e => [...e.attributes].some(a => a.name.startsWith('on'))), fontsize: [...bd.querySelectorAll('[style]')].map(e => e.getAttribute('style')).join(';'), x: window.__x ?? null, img: bd.querySelector('img')?.getAttribute('src'), gm: bd.querySelector('.gm')?.textContent }; }));
  // 목차 누르기 → 그 자리 · 머리줄
  await p.click('#r20-sn .toc .tr:has-text("꽃집")'); await p.waitForTimeout(200);
  console.log('꽃집 누름 →', await p.$eval('#r20-sn .mt', e => e.textContent), '| 목차 표시:', await p.$eval('#r20-sn .toc .tr.on', e => e.textContent));
  if (SHOT) await p.screenshot({ path: SHOT + '/nav.png' });
  // 찾기
  await p.fill('#r20-sn .q', '편지'); await p.waitForTimeout(60); await p.press('#r20-sn .q', 'Enter'); await p.press('#r20-sn .q', 'Enter');
  console.log('찾기 편지 →', await p.$eval('#r20-sn .qn', e => e.textContent), '| 칠하기 API:', await p.evaluate(() => !!(window.CSS?.highlights?.get('r20sn-hit'))));
  // 글 고르기 → 입력칸에 넣기
  await p.evaluate(() => { const el = [...document.querySelectorAll('#r20-sn .bd p')].find(x => x.textContent.startsWith('“어서')); const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
  await p.waitForTimeout(60);
  console.log('고르면 뜸:', await p.$eval('#r20-sn .fl', e => !e.hidden));
  await p.fill('#textchat-input textarea', '쓰던 글');
  await p.click('#r20-sn .fl [data-a="put"]'); await p.waitForTimeout(60);
  console.log('입력칸 →', JSON.stringify(await p.$eval('#textchat-input textarea', t => t.value)), '| 보냄 안 함 · 포커스:', await p.evaluate(() => document.activeElement.tagName));
  // ☰ 접기 · 가리기 단추 없음
  await p.click('#r20-sn [data-a="toc"]'); console.log('☰ 접기 →', await geo());
  await p.click('#r20-sn [data-a="toc"]'); console.log('☰ 펴기 →', await geo(), '| 가리기 단추:', !!(await p.$('#r20-sn [data-a="veil"]')));
  await p.click('#r20-sn [data-a="warn"]');
  // 이어서 보기: 모든 장 · 스크롤하면 목차가 따라감 · 찾기는 장을 넘어
  await p.click('#r20-sn .md [data-m="cont"]'); await p.waitForTimeout(100);
  console.log('이어서 → 보이는 장 수:', await p.$$eval('#r20-sn .bd section.ch', ss => ss.filter(x => getComputedStyle(x).display !== 'none').length), '| 목차 줄 수:', await p.$$eval('#r20-sn .toc .tr', ts => ts.filter(t => getComputedStyle(t).display !== 'none').length), '| 머리줄:', await p.$eval('#r20-sn .mt', e => e.textContent));
  await p.$eval('#r20-sn .bd', e => { e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll')); }); await p.waitForTimeout(150);
  console.log('끝까지 스크롤 → 목차 표시:', await p.$eval('#r20-sn .toc .tr.on', e => e.textContent), '| 머리줄:', await p.$eval('#r20-sn .mt', e => e.textContent));
  await p.click('#r20-sn .md [data-m="sep"]'); await p.waitForTimeout(100);
  console.log('다시 따로 → 보이는 장:', await p.$$eval('#r20-sn .bd section.ch', ss => ss.filter(x => getComputedStyle(x).display !== 'none').map(x => x.querySelector('.cht').textContent).join(',')), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_sn_mode')));
  await p.fill('#r20-sn .q', '수상한'); await p.waitForTimeout(60); await p.press('#r20-sn .q', 'Enter'); await p.waitForTimeout(80);
  console.log('따로 + 찾기 "수상한" → 보이는 장:', await p.$$eval('#r20-sn .bd section.ch', ss => ss.filter(x => getComputedStyle(x).display !== 'none').map(x => x.querySelector('.cht').textContent).join(',')), '|', await p.$eval('#r20-sn .qn', e => e.textContent));
  await p.click('#r20-sn .toc .tr.ch:has-text("본편")'); await p.waitForTimeout(100);
  await p.$eval('#r20-sn .bd', e => { e.scrollTop = 500; e.dispatchEvent(new Event('scroll')); }); await p.waitForTimeout(100);
  // 닫았다 열면 같은 시나리오 · 같은 자리
  const st0 = await p.$eval('#r20-sn .bd', e => e.scrollTop); await p.waitForTimeout(700);
  await p.click('#r20-snbtn'); await p.click('#r20-snbtn'); await p.waitForTimeout(100);
  console.log('다시 열기 → 자리:', st0, '→', await p.$eval('#r20-sn .bd', e => e.scrollTop), '| 이름:', await p.$eval('#r20-sn .nm', e => e.textContent));
  await p.dblclick('#r20-sn .hd .nm'); console.log('두 번 → 접힘 높이:', await p.$eval('#r20-sn', e => e.offsetHeight)); await p.dblclick('#r20-sn .hd .nm');
  // 새로 고침 뒤 (같은 브라우저) → 마지막 시나리오 바로
  await p.reload(); await p.evaluate(([NOTES, GM]) => {
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>`;
    const mk = (id, name, share) => ({ id, attributes: { name, inplayerjournals: share }, get(k) { return this.attributes[k]; }, _getLatestBlob(f, cb) { setTimeout(() => cb(f === 'notes' ? NOTES[id] : GM[id] || ''), 15); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const hs = [mk('h1', '본편', ''), mk('h2', 'NPC', 'all'), mk('h3', '단서 · 지도', ''), mk('h6', '▶장면표', 'all'), mk('h7', '▶[본문] 토끼 시나리오 개요', ''), mk('h8', '시나리오 앵커 A', '')];
    const tree = [{ n: '시나리오', i: [{ n: '마기카로기아', i: [{ n: '토끼가 되어랏!', i: ['h1', 'h2', { n: '자료', i: ['h3', 'h6'] }, 'h7', 'h8'] }] }] }];
    window.Campaign = { get: k => k === 'journalfolder' ? JSON.stringify(tree) : '[]', save() {}, on() {}, handouts: coll(hs), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = false;
  }, [NOTES, GM]);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.click('#r20-snbtn'); await p.waitForTimeout(300);
  console.log('[플레이어 · 새로 고침] 목차:', await p.$$eval('#r20-sn .toc .tr', ts => ts.map(t => t.textContent).join(' | ')), '| GM 메모:', await p.$('#r20-sn .bd .gm').then(x => !!x), '| ⚠:', await p.$eval('#r20-sn .warn', b => !b.hidden));
  console.log('errors:', errs); await b.close();
})();
