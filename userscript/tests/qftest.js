// 빠른 찾기(Ctrl+K) · 창 자리·크기 기억(📌) — Roll20 흉내 화면
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
    document.body.insertAdjacentHTML('beforeend', `<div id="journal"><div class="content"></div></div>
      <div id="jukebox"><div class="content"><ol id="jukeboxfolderroot"><li class="dd-item dd-folder"><ol class="dd-list">
        <li class="dd-item jukeboxitem" data-itemid="t1"><div class="dd-content"><span class="title">마지막 노래</span><a class="play" data-isplaying="false"></a>
        <div class="volume"><input class="slider" type="range" value="50"></div></div></li></ol></li></ol></div></div>
      <div id="textchat-input"><textarea class="ui-autocomplete-input">안녕</textarea><button id="chatSendBtn">Send</button></div>`);
    document.getElementById('chatSendBtn').addEventListener('click', () => { const ta = document.querySelector('#textchat-input textarea'); window.__log.push('SEND ' + ta.value); ta.value = ''; });
    document.getElementById('jukebox').addEventListener('click', e => { const a = e.target.closest('a.play'); if (a) { a.dataset.isplaying = String(a.dataset.isplaying !== 'true'); window.__log.push('PLAY ' + a.dataset.isplaying); } });
    const mk = (id, attrs, onView) => { const a = { ...attrs }; return { id, attributes: a, get: k => a[k], save: o => Object.assign(a, o), view: { showDialog: () => window.__log.push('OPEN ' + a.name) } }; };
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const hs = [mk('h1', { name: '마녀의 편지 ㊙️', tags: '["단서","1장"]', inplayerjournals: '' }), mk('h2', { name: '성문 안내', tags: '', inplayerjournals: 'all' }),
      mk('h3', { name: '오래된 지도', tags: '', inplayerjournals: '', archived: true })];
    const cs = [mk('c1', { name: '마을 노인', tags: '["NPC"]', inplayerjournals: '' }), mk('c2', { name: 'Eebrih Iski', tags: '', inplayerjournals: 'all' })];
    const tr = { id: 't1', attributes: { title: '마지막 노래', tags: '이별 카타르시스 엔딩', volume: 50 }, get(k) { return this.attributes[k]; }, save(o) { Object.assign(this.attributes, o); } };
    const mc = [mk('m1', { name: '낙인판정', action: '/r 1d20' })];
    window.Campaign = { get: k => k === 'journalfolder' ? JSON.stringify([{ n: '1장 · 성문', i: [{ n: 'HO2', i: ['h1'] }, 'h2'] }, 'c1', 'c2', 'h3'])
        : k === 'jukeboxfolder' ? JSON.stringify([{ n: '이별', i: ['t1'] }]) : '[]', save() {}, on() {},
      handouts: coll(hs), characters: coll(cs), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([tr]) };
    window.currentPlayer = { id: 'p1', macros: coll(mc) };
    window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const names = () => p.$$eval('#r20-qf .qf-it', rs => rs.map(r => r.querySelector('.qf-nm').innerHTML + ' [' + r.querySelector('.qf-act').textContent + ']').join(' | '));
  const type = async s => { await p.fill('#r20-qf input', s); await p.waitForTimeout(50); };
  const log = async () => (await p.evaluate(() => window.__log.splice(0))).join(' | ');

  // ── 빠른 찾기 ──
  await p.keyboard.press('Control+KeyF');
  console.log('open:', await p.$eval('#r20-qf', e => e.classList.contains('show')), '| empty:', await p.$eval('#r20-qf .qf-list', e => e.textContent.trim()));
  await type('ㅁㄴ'); console.log('ㅁㄴ →', await names());
  if (SHOT) await p.screenshot({ path: SHOT + '/qf-real.png', clip: { x: 300, y: 30, width: 600, height: 470 } });
  await type('만'); console.log('만(조합 중) →', await names());
  await type('#엔딩'); console.log('#엔딩 →', await names());
  await type('지도'); console.log('지도(보관) →', await names());
  await type('ㅁㄴ'); await p.keyboard.press('Enter'); await p.waitForTimeout(50);
  console.log('Enter →', await log(), '| closed:', !(await p.$eval('#r20-qf', e => e.classList.contains('show'))));
  await p.keyboard.press('Control+KeyF'); console.log('최근 →', await names());
  await type('ㅁㅈㅁ'); await p.keyboard.press('Enter'); await p.waitForTimeout(50); console.log('곡 Enter →', await log());
  await p.keyboard.press('Control+KeyF'); await type('판정'); console.log('판정 →', await names());
  await p.keyboard.press('Enter'); await p.waitForTimeout(50);
  console.log('매크로 →', await log(), '| 입력칸 되돌림:', await p.$eval('#textchat-input textarea', e => e.value));
  const only = async c => { for (const x of await p.$$('#r20-qf .qf-cats input')) { const want = !c || (await x.getAttribute('data-c')) === c; if ((await x.isChecked()) !== want && await x.isVisible()) await x.click(); } await p.waitForTimeout(80); };
  await p.keyboard.press('Control+KeyF'); await only('bgm');
  console.log('BGM 만:', await names()); await only(null);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+KeyF'); await type('편지'); await p.keyboard.press('Shift+Enter'); await p.waitForTimeout(300);
  console.log('Shift+Enter → 편집기:', await p.$eval('#r20be', e => getComputedStyle(e).display), '| 고른 줄:', await p.$eval('#r20be .r20be-row.sel', e => e.dataset.id + ' ' + e.textContent.trim().slice(0, 12)).catch(() => 'none'));
  await p.evaluate(() => document.querySelector('#r20be .r20be-x, #r20be [aria-label="닫기"]')?.click());
  // 플레이어: 공개된 것만 · 곡 없음
  await p.evaluate(() => { window.is_gm = false; });
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+KeyF'); await only('journal');
  console.log('플레이어 저널 →', await names(), '| BGM 칸 숨김:', await p.$eval('#r20-qf .qf-gmc', e => e.hidden)); await only(null); await p.keyboard.press('Escape');
  await p.evaluate(() => { window.is_gm = true; });

  // ── 창 자리 · 크기 기억 ──
  const mkDlg = (cls, attrs, title, at = 'left+20 top+20') => p.evaluate(([cls, attrs, title, at]) => {
    const $c = $(`<div class="${cls}" ${attrs}><div style="height:600px">내용</div></div>`);
    $c.dialog({ title, width: 400, height: 300, autoOpen: true, position: { my: 'left top', at, of: window } }); return true;
  }, [cls, attrs, title, at]);
  const geo = sel => p.$eval(sel, d => [d.offsetLeft, d.offsetTop, d.offsetWidth, d.offsetHeight].join(','));
  await mkDlg('dialog characterdialog', 'data-characterid="c2"', 'Eebrih Iski');
  await mkDlg('dialog', '', '마녀의 편지 ㊙️', 'left+760 top+20');
  await mkDlg('dialog', '', '토큰 설정', 'left+760 top+400');
  await p.waitForTimeout(300);
  console.log('📌 단추:', await p.$$eval('.ui-dialog', ds => ds.map(d => d.querySelector('.ui-dialog-title').textContent + (d.querySelector('.r20wm-pin') ? ' 📌' : ' -')).join(' / ')));
  const cd = '.ui-dialog:has(.characterdialog)';
  const first = await geo(cd); console.log('처음:', first);
  await p.click(cd + ' .r20wm-pin'); console.log('켬:', await p.$eval(cd + ' .r20wm-pin', b => b.getAttribute('aria-pressed')));
  // 실제로 끌기 · 크기 바꾸기
  const tb = await p.$(cd + ' .ui-dialog-titlebar'), bb = await tb.boundingBox();
  await p.mouse.move(bb.x + 150, bb.y + 15); await p.mouse.down(); await p.mouse.move(bb.x + 450, bb.y + 115, { steps: 8 }); await p.mouse.up();
  const se = await (await p.$(cd + ' .ui-resizable-se')).boundingBox();
  await p.mouse.move(se.x + 5, se.y + 5); await p.mouse.down(); await p.mouse.move(se.x + 125, se.y + 205, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(150);
  const moved = await geo(cd); console.log('옮김:', moved, '| 저장:', await p.evaluate(() => localStorage.getItem('r20_win_mem')));
  // 닫고 새로 만들기 (Roll20 은 다시 열 때 새 창)
  await p.evaluate(() => { const $c = $('.characterdialog'); $c.dialog('destroy').remove(); });
  await mkDlg('dialog characterdialog', 'data-characterid="c2"', 'Eebrih Iski'); await p.waitForTimeout(500);
  console.log('새 창:', await geo(cd), '| 내용 높이:', await p.$eval('.characterdialog', c => c.offsetHeight));
  // 닫았다 다시 열기 (같은 창)
  await p.evaluate(() => { const $c = $('.characterdialog'); $c.dialog('close'); $c.dialog('open'); }); await p.waitForTimeout(400);
  console.log('같은 창 다시:', await geo(cd));
  // 작은 화면: 안으로 당기기
  await p.setViewportSize({ width: 800, height: 500 });
  await p.evaluate(() => { $('.characterdialog').dialog('destroy').remove(); });
  await mkDlg('dialog characterdialog', 'data-characterid="c2"', 'Eebrih Iski'); await p.waitForTimeout(500);
  console.log('작은 화면(800×500):', await geo(cd));
  await p.setViewportSize({ width: 1200, height: 760 });
  // 다른 캐릭터는 항목마다 → 기본 자리
  await mkDlg('dialog characterdialog', 'data-characterid="c1"', '마을 노인', 'left+20 top+400'); await p.waitForTimeout(500);
  console.log('다른 캐릭터(항목마다):', await geo('.ui-dialog:has([data-characterid="c1"])'));
  // 길게 누르기 → 지움
  const pin = await (await p.$(cd + ' .r20wm-pin')).boundingBox();
  await p.mouse.move(pin.x + 5, pin.y + 5); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up();
  console.log('길게 누름 뒤:', await p.evaluate(() => localStorage.getItem('r20_win_mem')), '| 켜짐 유지:', await p.$eval(cd + ' .r20wm-pin', b => b.getAttribute('aria-pressed')));
  // 덱 선택창(그 밖의 창): 제목줄에 올리면 📌 → 켜고 옮기면 다음에 그 자리
  await mkDlg('dialog', '', '카드 고르기 — 장면 덱', 'left+380 top+200'); await p.waitForTimeout(300);
  const dk = '.ui-dialog:has(.ui-dialog-title:text-is("카드 고르기 — 장면 덱"))';
  console.log('덱 📌 숨김(평소):', await p.$eval(dk + ' .r20wm-pin', b => getComputedStyle(b).opacity));
  await p.hover(dk + ' .ui-dialog-titlebar'); console.log('덱 📌 (올림):', await p.$eval(dk + ' .r20wm-pin', b => getComputedStyle(b).opacity));
  await p.click(dk + ' .r20wm-pin');
  const tb2 = await (await p.$(dk + ' .ui-dialog-titlebar')).boundingBox();
  await p.mouse.move(tb2.x + 100, tb2.y + 12); await p.mouse.down(); await p.mouse.move(tb2.x + 300, tb2.y - 120, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
  const dmoved = await geo(dk);
  await p.evaluate(() => { $('.ui-dialog-title').filter((i, e) => e.textContent === '카드 고르기 — 장면 덱').closest('.ui-dialog').find('.ui-dialog-content').dialog('destroy').remove(); });
  await mkDlg('dialog', '', '카드 고르기 — 장면 덱', 'left+380 top+200'); await p.waitForTimeout(500);
  console.log('덱 옮김:', dmoved, '→ 다시 열기:', await geo(dk), '| 켜짐:', await p.$eval(dk + ' .r20wm-pin', b => getComputedStyle(b).opacity));
  console.log('errors:', errs);
  await b.close();
})();
