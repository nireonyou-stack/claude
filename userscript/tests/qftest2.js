// 빠른 찾기 새 모양(일괄 편집기와 같게 · 340px) · 📌 열어 두기 · ✕ · 개수 · 사진 · 최근 지우기 / 제목줄 두 번 눌러 접기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); window.__log = [];
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a';
    const av = c => 'http://127.0.0.1:8766/' + (c === '#7a5aa8' ? 'av1.svg' : 'av2.svg');
    document.body.insertAdjacentHTML('beforeend', `<div id="journal"><div class="content"></div></div>
      <div id="jukebox"><div class="content"><ol id="jukeboxfolderroot"><li class="dd-item dd-folder"><ol class="dd-list">
        <li class="dd-item jukeboxitem" data-itemid="t1"><div class="dd-content"><span class="title">마지막 무대</span><a class="play" data-isplaying="false"></a>
        <div class="volume"><input class="slider" type="range" value="50"></div></div></li></ol></li></ol></div></div>
      <div id="rightsidebar" style="position:fixed;right:0;top:0;width:330px;height:100%;background:#fff"></div><div id="sidebarcontrol" style="position:fixed;right:330px;top:6px;width:28px;height:28px"></div>
      <div id="textchat-input"><textarea class="ui-autocomplete-input"></textarea><button id="chatSendBtn">Send</button></div>`);
    document.getElementById('jukebox').addEventListener('click', e => { const a = e.target.closest('a.play'); if (a) { a.dataset.isplaying = String(a.dataset.isplaying !== 'true'); window.__log.push('PLAY ' + a.dataset.isplaying); } });
    const mk = (id, attrs) => { const a = { ...attrs }; return { id, attributes: a, get: k => a[k], save: o => Object.assign(a, o), view: { showDialog: () => window.__log.push('OPEN ' + a.name) } }; };
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const hs = [mk('h1', { name: '모모코의 일기 ㊙️', tags: '["단서"]', inplayerjournals: '', avatar: av('#b58a5a') })];
    const cs = [mk('c1', { name: '아카메 모모코', tags: '', inplayerjournals: '', avatar: av('#7a5aa8') }), mk('c2', { name: '마녀 무리', tags: '["NPC"]', inplayerjournals: '' })];
    const tr = { id: 't1', attributes: { title: '마지막 무대', tags: '엔딩' }, get(k) { return this.attributes[k]; }, save(o) { Object.assign(this.attributes, o); } };
    window.Campaign = { get: k => k === 'journalfolder' ? JSON.stringify([{ n: '주력룰', i: [{ n: '마기카로기아', i: [{ n: '시나리오 세팅', i: [{ n: '[공식] 토끼가 되어랏!', i: ['c1', 'h1'] }] }] }] }, 'c2'])
        : k === 'jukeboxfolder' ? JSON.stringify([{ n: '이별', i: ['t1'] }]) : '[]', save() {}, on() {},
      handouts: coll(hs), characters: coll(cs), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([tr]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const type = async s => { await p.fill('#r20-qf .qf-in', s); await p.waitForTimeout(80); };
  const log = async () => (await p.evaluate(() => window.__log.splice(0))).join(' | ');
  const rows = () => p.$$eval('#r20-qf .qf-it', rs => rs.map(r => r.querySelector('.qf-nm').textContent + ' (' + r.querySelector('.qf-pt').textContent + ') [' + r.querySelector('.qf-act').textContent + ']' + (r.querySelector('img.qf-th') ? ' 🖼' : '')).join(' | '));
  const outside = async () => { await p.mouse.click(60, 700); await p.waitForTimeout(50); return !(await p.$eval('#r20-qf', e => e.classList.contains('show'))); };
  const seg = () => p.$$eval('#r20-qf .qf-cats label', ls => ls.filter(l => !l.hidden).map(l => (l.querySelector('input').checked ? '☑' : '☐') + l.textContent).join(' '));
  const boxGeo = () => p.$eval('#r20-qf .qf-box', x => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(','); });

  await p.keyboard.press('Control+KeyF');
  console.log('창 크기:', await boxGeo(), '| Esc 안내 있음:', await p.$$eval('#r20-qf kbd, #r20-qf .qf-foot', es => es.some(e => /Esc/.test(e.textContent))));
  await type('ㅁㅁ');
  console.log('칸:', await seg()); console.log('줄:', await rows());
  if (SHOT) await p.screenshot({ path: SHOT + '/qf3-normal.png', clip: { x: 500, y: 20, width: 370, height: 330 } });
  await p.keyboard.press('Enter'); await p.waitForTimeout(50);
  console.log('Enter →', await log(), '| 닫힘:', !(await p.$eval('#r20-qf', e => e.classList.contains('show'))));
  await p.keyboard.press('Control+KeyF'); console.log('최근:', await rows(), '| 화면 덮개 없음 → 맵 누름:', await p.evaluate(() => document.elementFromPoint(60, 700)?.tagName));
  console.log('창 밖 누르면 닫힘:', await outside()); await p.keyboard.press('Control+KeyF');
  await p.keyboard.press('Tab'); console.log('Tab → 체크칸:', await p.evaluate(() => document.activeElement.dataset.c)); await p.keyboard.press('Enter');
  console.log('Enter → 입력칸:', await p.evaluate(() => document.activeElement.className));
  await p.click('#r20-qf .qf-clr'); console.log('지우기 뒤:', await p.$eval('#r20-qf .qf-list', e => e.textContent.trim()));
  await p.click('#r20-qf .qf-x'); console.log('✕ → 닫힘:', !(await p.$eval('#r20-qf', e => e.classList.contains('show'))));

  // 📌 열어 두기
  await p.keyboard.press('Control+KeyF'); await p.click('#r20-qf .qf-pin'); await p.waitForTimeout(100);
  console.log('📌 켬: 창', await boxGeo());
  await type('#엔딩'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  console.log('곡 Enter →', await log(), '| 열려 있음:', await p.$eval('#r20-qf', e => e.classList.contains('show')), '| 줄:', await rows());
  const behind = await p.evaluate(() => { const r = document.querySelector('#r20-qf .qf-box').getBoundingClientRect(); return document.elementFromPoint(r.right + 50, r.bottom + 50)?.tagName; });
  console.log('창 밖 누르면 뒤 화면:', behind);
  const hb = await (await p.$('#r20-qf .qf-grip')).boundingBox();
  await p.mouse.move(hb.x + 6, hb.y + 8); await p.mouse.down(); await p.mouse.move(hb.x + 6 - 300, hb.y + 8 + 120, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(100);
  console.log('끌어 옮김:', await boxGeo(), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_qf_geo')));
  await p.dblclick('#r20-qf .qf-grip'); await p.waitForTimeout(100);
  console.log('두 번 누름 → 접힘:', await boxGeo(), '| 검색칸 보임:', await p.$eval('#r20-qf .qf-in', e => e.getClientRects().length > 0));
  if (SHOT) await p.screenshot({ path: SHOT + '/qf4-min.png', clip: { x: 200, y: 140, width: 390, height: 80 } });
  await p.click('#r20-qf .qf-in'); await p.keyboard.type('마'); await p.waitForTimeout(100);
  console.log('접힌 채 치면 펼침:', await boxGeo());
  await p.dblclick('#r20-qf .qf-grip'); await p.waitForTimeout(100);
  await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(50);
  console.log('Ctrl+F (열어 둔 채) → 펴고 입력칸:', await boxGeo(), await p.evaluate(() => document.activeElement?.className));
  if (SHOT) { await type('ㅁ'); await p.screenshot({ path: SHOT + '/qf3-pin.png', clip: { x: 80, y: 120, width: 460, height: 460 } }); }
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(50);
  console.log('다시 열면 그 자리:', await boxGeo());
  await p.keyboard.press('Escape');

  // 제목줄 두 번 눌러 접기: 일괄 편집기 · Roll20 덱 선택창 / 시트는 Roll20 몫
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be.r20be-show');
  const beH = () => p.$eval('#r20be', e => e.offsetHeight);
  const h0 = await beH(); await p.dblclick('#r20be .r20be-head strong'); const h1 = await beH(); await p.dblclick('#r20be .r20be-head strong'); const h2 = await beH();
  console.log('일괄 편집기 높이: 처음', h0, '→ 접기', h1, '→ 펴기', h2);
  await p.$eval('#r20be [aria-label="닫기"]', x => x.click());
  await p.evaluate(() => {
    $('<div class="dialog">카드들</div>').dialog({ title: '카드 고르기', width: 300, height: 260, position: { my: 'left top', at: 'left+40 top+300', of: window } });
    $('<div class="dialog characterdialog" data-characterid="c1">시트</div>').dialog({ title: '아카메 모모코', width: 300, height: 260, position: { my: 'left top', at: 'left+400 top+300', of: window } });
  });
  await p.waitForTimeout(200);
  const dh = sel => p.$eval(sel, d => d.offsetHeight);
  const dk = '.ui-dialog:has(.ui-dialog-title:text-is("카드 고르기"))', ch = '.ui-dialog:has(.characterdialog)';
  const d0 = await dh(dk); await p.dblclick(dk + ' .ui-dialog-title'); const d1 = await dh(dk);
  const c0 = await dh(ch); await p.dblclick(ch + ' .ui-dialog-title'); const c1 = await dh(ch);
  console.log('덱 선택창:', d0, '→', d1, '| 시트(Roll20 몫, 그대로):', c0, '→', c1);
  console.log('errors:', errs); await b.close();
})();
