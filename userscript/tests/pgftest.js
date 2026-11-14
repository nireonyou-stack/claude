// v1.109 페이지 폴더 관리: Roll20 저장소(firebase) 캠페인/pageFolders 에서 폴더 기록을 읽어 이름 · 빈 폴더까지 · 하위 폴더(path 칸)
// 새 폴더 · 이름 바꾸기 · 끌어서 옮기기(페이지 · 폴더) · 폴더 지우기(안의 것은 한 단계 위로) → 저장: 폴더 기록 set/update/remove · 페이지 path · 차례
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let confirmMsg = ''; p.on('dialog', d => { confirmMsg += d.message().replace(/\s+/g, ' ') + ' / '; d.accept(); });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:0;width:28px;height:28px"></div>';
    window.__w = []; window.__fb = [];
    const F1 = '-Mfolder000000000inse', F2 = '-Mfolder000000000cocx', F3 = '-Mfolder000000000subb', F4 = '-Mfolder000000000empt';
    window.__F = { F1, F2, F3, F4 };
    // 가짜 Roll20 저장소: pageFolders (하위 폴더는 path 칸)
    const DB = { pageFolders: { [F1]: { id: F1, name: '인세인', placement: 0 }, [F2]: { id: F2, name: 'COC, 영미룰', placement: 1 }, [F3]: { id: F3, name: '부록', placement: 0, path: `,${F2},` }, [F4]: { id: F4, name: '빈 폴더', placement: 2 } } };
    let k = 0;
    const ref = path => {
      const parts = path.split('/').filter(Boolean).slice(1);       // 앞의 캠페인 경로는 뺀다
      const get = () => parts.reduce((o, x) => o?.[x], DB);
      const r = {
        once: () => Promise.resolve({ val: () => JSON.parse(JSON.stringify(get() ?? null)) }),
        push: () => ({ key: '-Mnewfolder00000000' + (++k) }),
        set: v => { __fb.push('set ' + parts.slice(1).join('/').replace(/-M\w+/g, x => x.slice(-4)) + ' ' + JSON.stringify(v).replace(/-M\w+/g, x => x.slice(-4))); let o = DB; parts.slice(0, -1).forEach(x => o = o[x] ||= {}); o[parts.at(-1)] = v; return Promise.resolve(); },
        update: v => { __fb.push('update ' + parts.slice(1).join('/').replace(/-M\w+/g, x => x.slice(-4)) + ' ' + JSON.stringify(v).replace(/-M\w+/g, x => x.slice(-4))); Object.assign(get(), v); return Promise.resolve(); },
        remove: () => { __fb.push('remove ' + parts.slice(1).join('/').replace(/-M\w+/g, x => x.slice(-4))); let o = DB; parts.slice(0, -1).forEach(x => o = o?.[x]); if (o) delete o[parts.at(-1)]; return Promise.resolve(); },
        limitToFirst: () => r };
      return r;
    };
    window.campaign_storage_path = '/campaign-77'; window.firebase = { database: () => ({ ref }) };
    const M = (a, coll) => { const m = { id: a.id, attributes: a, get: k2 => a[k2], set() {}, on() {}, off() {}, save(o) { Object.assign(a, o); __w.push(a.name + ':' + Object.entries(o).map(([x, v]) => x + '=' + String(v).replace(/-M\w+/g, y => y.slice(-4))).join(',')); }, destroy() { __w.push('x:' + a.name); coll.models.splice(coll.models.indexOf(m), 1); } }; return m; };
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f) });
    const pages = coll([]);
    const P = (id, name, path, placement) => pages.models.push(M({ id, name, path, placement, width: 25, height: 25, showgrid: true, background_color: '#ffffff', archived: false }, pages));
    P('pA', '화면조정', ',', 0); P('pB', '타로카드', ',', 1);
    P('i1', '[인세인] 1', `,${F1},`, 0); P('i2', '[인세인] 2', `,${F1},`, 1);
    P('c1', '[coc] 1인', `,${F2},`, 0); P('s1', '[coc] 부록', `,${F2},${F3},`, 0);
    window.Campaign = { attributes: {}, get: x => x === 'playerpageid' ? 'pA' : '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages, players: coll([]), activePage: () => pages.models[0] };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true; window.campaign_id = 77;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be');
  await p.click('#r20be .r20be-seg button:has-text("페이지")'); await p.waitForTimeout(300);
  await p.click('#r20be [aria-label="목록으로 보기"]'); await p.click('#r20be .r20be-fold button:has-text("전체 열기")'); await p.waitForTimeout(150);
  const tree = () => p.$$eval('#r20be .r20be-row', rs => rs.map(r => '·'.repeat(Math.round((parseInt(r.style.paddingLeft) - 4) / 16)) + (r.classList.contains('del') ? '⊗' : '') + r.querySelector('.r20be-nm span').textContent).join(' | '));
  console.log('저장소에서 읽은 나무:', await tree(), '| 새 폴더 단추:', await p.$eval('#r20be .r20be-tools button:has-text("새 폴더")', e => !e.hidden).catch(() => '없음'));
  const row = id => `#r20be .r20be-row[data-id="${id}"]`;
  const F = await p.evaluate(() => window.__F);
  // 이름 바꾸기 (폴더 칸)
  await p.click(row(F.F1) + ' [data-act="pick"]'); await p.waitForTimeout(100);
  console.log('폴더 칸:', await p.$eval('#r20be .r20be-pane', e => e.innerText.replace(/\s+/g, ' ').slice(0, 110)));
  await p.fill('#r20be .r20be-pane input.r20be-in', '인세인 (정리)'); await p.waitForTimeout(80);
  // 새 폴더 (페이지 하나를 골라 둔 채 → 그 페이지가 든 곳 = 맨 위)
  await p.click(row('pB') + ' [data-act="pick"]'); await p.click('#r20be .r20be-tools button:has-text("새 폴더")'); await p.waitForTimeout(100);
  await p.keyboard.type('세션 0'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  const nid = await p.evaluate(() => [...document.querySelectorAll('#r20be .r20be-row')].find(r => r.textContent.includes('세션 0'))?.dataset.id);
  // 끌기: 타로카드 → 새 폴더 안 · 부록 폴더 → 인세인 안
  await p.dragAndDrop(row('pB'), row(nid)); await p.waitForTimeout(80);
  await p.dragAndDrop(row(F.F3), row(F.F1)); await p.waitForTimeout(80);
  // 빈 폴더 지우기 · COC 폴더 지우기(안의 [coc] 1인 은 맨 위로)
  await p.click(row(F.F4) + ' [data-act="pick"]'); await p.click('#r20be .r20be-pane button:has-text("폴더 지우기")'); await p.waitForTimeout(80);
  await p.click(row(F.F2) + ' [data-act="pick"]'); await p.click('#r20be .r20be-pane button:has-text("폴더 지우기")'); await p.waitForTimeout(80);
  await p.click('#r20be .r20be-fold button:has-text("전체 열기")'); await p.waitForTimeout(80);
  console.log('고친 뒤:', await tree(), '| 확인 창:', confirmMsg);
  if (SHOT) await p.screenshot({ path: SHOT + '/pgfold.png', clip: await p.$eval('#r20be', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
  await p.click('#r20be .r20be-pri'); await p.waitForTimeout(600);
  console.log('저장소 쓰기:\n  ' + (await p.evaluate(() => __fb.join('\n  '))));
  console.log('페이지 저장:', await p.evaluate(() => __w.join(' ‖ ')));
  await p.click('#r20be .r20be-fold button:has-text("전체 열기")'); await p.waitForTimeout(100);
  console.log('저장 뒤 다시 읽은 나무:', await tree());
  console.log('errors:', errs); await b.close();
})();
