// v1.104 창 겹침 순서: 올인원 창(일괄 편집기)을 열면 · 누르면 Roll20 창(시트 · 핸드아웃) 위로, Roll20 창을 누르면(jQuery UI 흉내) 다시 그 위로 · 펼침 창 층은 늘 맨 위
// 저널 탭: 맨 앞에 열린 시트의 제목을 다시 누르면 닫힘 · 뒤에 깔려 있으면 그대로 둠(Roll20 이 앞으로) · 안 열린 것은 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    const dlg = (id, kind, title, z, x) => `<div class="ui-dialog ui-front" id="${id}" style="position:fixed;left:${x}px;top:120px;width:260px;height:200px;background:#fff;border:1px solid #777;z-index:${z}"><div class="ui-dialog-titlebar"><span class="ui-dialog-title">${title}</span><button class="ui-dialog-titlebar-close">x</button></div><div class="ui-dialog-content ${kind === 'char' ? 'characterdialog' : 'handoutdialog'}" data-${kind === 'char' ? 'characterid' : 'handoutid'}="${id.slice(2)}">내용</div></div>`;
    document.body.innerHTML = dlg('d-c1', 'char', '하루카', 10500, 300) + dlg('d-h1', 'handout', '단서', 10501, 420)
      + '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"><div id="journal"><div class="content"><ol><li class="journalitem" data-itemid="c1"><div class="dd-content"><div class="namecontainer">하루카</div></div></li><li class="journalitem" data-itemid="h1"><div class="dd-content"><div class="namecontainer">단서</div></div></li><li class="journalitem" data-itemid="h2"><div class="dd-content"><div class="namecontainer">안 열린 것</div></div></li></ol></div></div></div>'
      + '<div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    // Roll20(jQuery UI) 처럼: 창을 누르면 .ui-front 형제 가운데 맨 위로 · 닫기 단추는 창을 숨김 · 저널 항목을 누르면 창을 연다(이미 열렸으면 앞으로)
    window.__opened = [];
    const top = d => { const z = Math.max(...[...document.querySelectorAll('body > .ui-front')].filter(e => e !== d && e.getClientRects().length).map(e => parseInt(getComputedStyle(e).zIndex, 10) || 0)); if ((parseInt(d.style.zIndex, 10) || 0) <= z) d.style.zIndex = z + 1; };
    document.querySelectorAll('.ui-dialog').forEach(d => { d.addEventListener('mousedown', () => top(d)); d.querySelector('.ui-dialog-titlebar-close').addEventListener('click', () => { d.style.display = 'none'; }); });
    document.getElementById('journal').addEventListener('click', e => { const li = e.target.closest('.journalitem'); if (!li) return; __opened.push(li.dataset.itemid); const d = document.querySelector('.ui-dialog [data-characterid="' + li.dataset.itemid + '"], .ui-dialog [data-handoutid="' + li.dataset.itemid + '"]')?.closest('.ui-dialog'); if (d) { d.style.display = ''; top(d); } });
    let n = 0;
    const M = a => { const m = { id: a.id || 'n' + (++n), cid: 'c' + (a.id || n), attributes: a, get: k => m.attributes[k], set() {}, save() {}, on() {}, off() {}, _getLatestBlob(f, cb) { cb(''); }, toJSON: () => ({ ...m.attributes }) }; return m; };
    const coll = arr => ({ models: arr, length: arr.length, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), create(o) { const m = M({ ...o }); arr.push(m); return m; } });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([M({ id: 'h1', name: '단서' }), M({ id: 'h2', name: '안 열린 것' })]), characters: coll([M({ id: 'c1', name: '하루카' })]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]), activePage: () => null };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const z = () => p.evaluate(() => ['#r20be', '#d-c1', '#d-h1'].map(s => { const e = document.querySelector(s); return s + '=' + (e && e.getClientRects().length ? getComputedStyle(e).zIndex : '닫힘'); }).join(' ') + ' 펼침=' + getComputedStyle(document.documentElement).getPropertyValue('--aio-z-pop').trim());
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForSelector('#r20be.r20be-show'); await p.waitForTimeout(400);
  console.log('편집기를 열면 맨 앞:', await z());
  await p.mouse.click(660, 300); await p.waitForTimeout(100);       // 핸드아웃 창(편집기에 가려진 자리 밖)을 누름
  const onTop = async (x, y) => p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e?.closest('#r20be, .ui-dialog')?.id; }, [x, y]);
  await p.$eval('#d-h1', d => d.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))); await p.dispatchEvent('#d-h1', 'pointerdown'); await p.waitForTimeout(100);
  console.log('핸드아웃 창을 누르면 그 위:', await z(), '| 맨 위:', await onTop(500, 250));
  await p.dispatchEvent('#r20be .r20be-head', 'pointerdown'); await p.waitForTimeout(100);
  console.log('편집기를 누르면 다시 맨 앞:', await z(), '| 맨 위:', await onTop(500, 250));
  await p.$eval('#r20be .r20be-ib[aria-label="닫기"]', x => x.click()); await p.waitForTimeout(100);
  // 저널: 맨 앞 창(단서)의 제목을 다시 누르면 닫힘
  await p.$eval('#d-h1', d => d.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))); await p.waitForTimeout(50);
  await p.click('#journal li[data-itemid="h1"] .namecontainer'); await p.waitForTimeout(100);
  console.log('맨 앞 창 제목 다시 누름:', await z(), '| Roll20 까지 간 누름:', await p.evaluate(() => __opened.join(',') || '없음'));
  await p.click('#journal li[data-itemid="h1"] .namecontainer'); await p.waitForTimeout(100);
  console.log('닫힌 것을 누르면 열림:', await z(), '| Roll20 까지 간 누름:', await p.evaluate(() => __opened.join(',')));
  await p.click('#journal li[data-itemid="c1"] .namecontainer'); await p.waitForTimeout(100);
  console.log('뒤에 깔린 창(하루카) 제목 → 닫지 않고 앞으로:', await z());
  await p.click('#journal li[data-itemid="c1"] .namecontainer'); await p.waitForTimeout(100);
  console.log('이제 맨 앞이라 다시 누르면 닫힘:', await z());
  await p.click('#journal li[data-itemid="h2"] .namecontainer'); await p.waitForTimeout(100);
  console.log('안 열린 것:', await p.evaluate(() => __opened.join(',')));
  console.log('errors:', errs); await b.close();
})();
