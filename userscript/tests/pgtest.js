// v1.108 일괄 편집기 [페이지] 탭: path(",폴더,하위,") 로 폴더 나무 · 폴더 이름은 Roll20 페이지 메뉴 카드에서 읽어 기억 · 폴더는 읽기만
// 전체 · 해제 · 반전 · 삭제 · 보관 거르기 · 찾기 · 이름 · 크기 · 격자 · 폴더 옮기기(끌기 · 고르기) · 저장(path · placement · destroy · 확인 창) · 플레이어 이동 · 이 페이지 열기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let confirmMsg = ''; p.on('dialog', d => { confirmMsg = d.message(); d.accept(); });
  await p.route(/files\.d20\.io/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="#89a"/></svg>' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    const F1 = '-Mfolder000000000inse', F2 = '-Mfolder000000000cocx', F3 = '-Mfolder000000000subb';
    // Roll20 페이지 메뉴처럼: 폴더 카드(data-page-id = 폴더 아이디) — 이름은 카드 글자
    document.body.innerHTML = '<div class="vtt-page-card-menu" style="position:fixed;left:0;top:0;width:10px;height:10px;overflow:hidden">'
      + `<div class="vtt-page-card-wrapper" data-page-id="${F2}"><div>40</div><div>COC, 영미룰</div></div><div class="vtt-page-card-wrapper" data-page-id="${F1}"><div>14</div><div>인세인</div></div>`
      + '<div class="vtt-page-card-wrapper" data-page-id="pA"><span>현재</span><div>화면조정</div></div></div>'
      + '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:0;width:28px;height:28px"></div>';
    window.__w = [];
    const M = (a, coll) => { const m = { id: a.id, attributes: a, get: k => a[k], set() {}, on() {}, off() {}, save(o) { Object.assign(a, o); __w.push(a.name + ':' + Object.entries(o).map(([k, v]) => k + '=' + v).join(',')); }, destroy() { __w.push('x:' + a.name); coll.models.splice(coll.models.indexOf(m), 1); } }; return m; };
    const coll = arr => { const c = { models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f) }; return c; };
    const pages = coll([]);
    const P = (id, name, path, placement, extra = {}) => pages.models.push(M({ id, name, path, placement, width: 25, height: 25, showgrid: true, background_color: '#ffffff', archived: false, thumbnail: `https://files.d20.io/images/${id}/thumb.png`, ...extra }, pages));
    P('pA', '화면조정', ',', 0); P('pB', '타로카드', ',', 1);
    P('i1', '[인세인] 1', `,${F1},`, 0); P('i2', '[인세인] 2', `,${F1},`, 1);
    P('c1', '[coc] 1인', `,${F2},`, 0); P('c2', '[coc] 2인', `,${F2},`, 1); P('c3', '새 페이지 5', `,${F2},`, 2, { archived: true });
    P('s1', '[coc] 부록', `,${F2},${F3},`, 0);
    window.Campaign = { attributes: {}, get: k => k === 'playerpageid' ? 'pA' : '[]', save(o) { __w.push('방:' + JSON.stringify(o)); }, on() {}, switchPageById(id) { __w.push('열기:' + id); },
      handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages, players: coll([]), activePage: () => pages.models[0] };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true; window.campaign_id = 99;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  console.log('폴더 이름 기억:', await p.evaluate(() => localStorage.getItem('r20_pg_folders_99')));
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.click('#r20be .r20be-seg button:has-text("페이지")'); await p.waitForTimeout(200);
  // 목록 보기로 (기본은 썸네일)
  await p.click('#r20be [aria-label="목록으로 보기"]'); await p.click('#r20be .r20be-fold button:has-text("전체 열기")').catch(() => {}); await p.waitForTimeout(150);
  const tree = () => p.$$eval('#r20be .r20be-row', rs => rs.map(r => '·'.repeat(Math.round((parseInt(r.style.paddingLeft) - 4) / 16)) + (r.classList.contains('chk') ? '☑' : '') + (r.classList.contains('del') ? '⊗' : '') + r.querySelector('.r20be-nm span').textContent + (r.querySelector('.r20be-meta').textContent ? `(${r.querySelector('.r20be-meta').textContent})` : '')).join(' | '));
  console.log('나무:', await tree());
  console.log('칩:', await p.$$eval('#r20be .r20be-chips button', bs => bs.map(b => b.textContent).join(' / ')), '| 고르기 줄:', await p.$eval('#r20be .r20be-tools [aria-label="고르기"]', e => e.innerText.replace(/\s+/g, ' ')));
  // 고르기: 전체 · 반전 · 보관 거르기
  await p.click('#r20be [aria-label="고르기"] button:has-text("전체")'); console.log('전체:', await p.$eval('#r20be .r20be-ph strong', e => e.textContent));
  await p.click('#r20be [aria-label="고르기"] button:has-text("해제")');
  await p.click('#r20be .r20be-row[data-id="pA"] [data-act="check"]'); await p.click('#r20be [aria-label="고르기"] button:has-text("반전")');
  console.log('하나 고르고 반전:', await p.$eval('#r20be .r20be-ph strong', e => e.textContent));
  await p.click('#r20be [aria-label="고르기"] button:has-text("해제")');
  await p.click('#r20be .r20be-chips button:has-text("보관")'); console.log('보관만:', await tree());
  await p.click('#r20be [aria-label="고르기"] button:has-text("전체")'); await p.click('#r20be [aria-label="고르기"] button:has-text("삭제")'); await p.waitForTimeout(100);
  await p.click('#r20be .r20be-chips button:has-text("전체")'); await p.waitForTimeout(100);
  console.log('보관 페이지 삭제 표시 뒤:', await tree(), '|', await p.$eval('#r20be .r20be-badge, #r20be [class*=badge]', e => e.textContent).catch(() => '?'));
  // 한 페이지: 이름 · 크기 · 격자 · 폴더 · 플레이어 · 열기
  await p.click('#r20be .r20be-row[data-id="pB"] [data-act="pick"]'); await p.waitForTimeout(100);
  console.log('오른쪽 단추:', await p.$$eval('#r20be .r20be-ph button', bs => bs.map(b => b.textContent + (b.disabled ? '(꺼짐)' : '')).join(', ')));
  await p.fill('#r20be .r20be-pane input.r20be-in:not([type])', '타로카드 v2'); await p.waitForTimeout(50);
  await p.fill('#r20be .r20be-pane input[aria-label="가로 칸"]', '32'); await p.press('#r20be .r20be-pane input[aria-label="가로 칸"]', 'Tab');
  await p.click('#r20be .r20be-pane .aio-chip:has-text("16:9")'); await p.click('#r20be .r20be-seg2 button:has-text("숨김")');
  await p.selectOption('#r20be .r20be-pane select', { label: 'COC, 영미룰' }); await p.waitForTimeout(100);
  console.log('고친 뒤 나무:', await tree());
  await p.click('#r20be .r20be-ph button:has-text("플레이어를 여기로")'); await p.click('#r20be .r20be-ph button:has-text("이 페이지 열기")');
  console.log('바로 반영:', await p.evaluate(() => __w.join(' ‖ ')));
  // 끌어서: [인세인] 2 → COC 폴더 맨 위 (c1 앞)
  await p.dragAndDrop('#r20be .r20be-row[data-id="i2"]', '#r20be .r20be-row[data-id="c1"]'); await p.waitForTimeout(100);
  console.log('끌기 뒤:', await tree());
  console.log('폴더 줄 끌기 · 이름 바꾸기 안 됨:', await p.$eval('#r20be .r20be-row[data-id="-Mfolder000000000cocx"]', r => r.draggable), '→', await (async () => { await p.dblclick('#r20be .r20be-row[data-id="-Mfolder000000000cocx"] .r20be-nm'); return !(await p.$('#r20be .r20be-inl')); })());
  await p.click('#r20be .r20be-row[data-id="-Mfolder000000000cocx"] [data-act="pick"]'); console.log('폴더 칸:', await p.$eval('#r20be .r20be-pane', e => e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
  if (SHOT) await p.screenshot({ path: SHOT + '/pgtab.png', clip: await p.$eval('#r20be', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
  // 저장
  await p.evaluate(() => { __w.length = 0; });
  await p.click('#r20be .r20be-pri'); await p.waitForTimeout(400);
  console.log('확인 창:', confirmMsg.replace(/\s+/g, ' '));
  console.log('저장:', await p.evaluate(() => __w.join(' ‖ ')));
  console.log('저장 뒤 나무:', await tree());
  // 썸네일 보기
  await p.click('#r20be [aria-label="아이콘으로 보기"]'); await p.waitForTimeout(150);
  console.log('썸네일:', await p.$$eval('#r20be .r20be-igh span', gs => gs.map(g => g.textContent).join(' / ')), '|', await p.$$eval('#r20be .r20be-tile', ts => ts.length));
  console.log('errors:', errs); await b.close();
})();
