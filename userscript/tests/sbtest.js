// v1.113.1 스크롤 막대 통일: 모든 막대 6px — 보통 칸 · Roll20 창(.ui-dialog 에 thin · 색) · 색을 물려받는 칸 · 쪽 전체 막대 · 시트(iframe) 안 · 일부러 숨긴 칸은 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] }); const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    // Roll20 CSS 흉내 (f2.css · m001.css 에 있는 것)
    document.head.insertAdjacentHTML('beforeend', '<style>.ui-dialog{scrollbar-width:thin;scrollbar-color:rgb(144,164,174) rgb(207,216,220)}.ui-dialog .ui-dialog-content{scrollbar-width:thin}.el-vl__window{scrollbar-width:none}.el-vl__window::-webkit-scrollbar{display:none}#rightsidebar{scrollbar-color:#999 #eee}</style>');
    const box = (id, extra = '') => `<div id="${id}" style="width:160px;height:80px;overflow:scroll;${extra}"><div style="height:400px;width:400px"></div></div>`;
    document.body.innerHTML = box('plain') + '<div class="ui-dialog"><div class="ui-dialog-content">' + box('dlg') + '</div></div>'
      + '<div class="ui-dialog"><div class="ui-dialog-content" id="dlgc" style="height:80px;width:160px;overflow:auto"><div style="height:400px"></div></div></div>'
      + '<div id="rightsidebar">' + box('chat') + '</div>' + '<div class="el-vl__window" id="hid" style="width:160px;height:80px;overflow:scroll"><div style="height:400px"></div></div>'
      + '<iframe id="fr" style="width:200px;height:120px"></iframe><div style="height:2000px"></div>';
    const d = document.getElementById('fr').contentDocument; d.open(); d.write('<html><head></head><body style="margin:0"><div id="in" style="width:160px;height:80px;overflow:scroll"><div style="height:400px;width:400px"></div></div></body></html>'); d.close();
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) }; window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) };
  });
  const w = () => p.evaluate(() => { const g = e => e.offsetWidth - e.clientWidth; const $ = id => document.getElementById(id);
    return `보통 ${g($('plain'))} · 창 안 ${g($('dlg'))} · 창 내용칸 ${g($('dlgc'))} · 색 물려받는 칸 ${g($('chat'))} · 숨긴 칸 ${g($('hid'))} · 쪽 전체 ${innerWidth - document.documentElement.clientWidth} · 시트 안 ${g($('fr').contentDocument.getElementById('in'))}`; });
  console.log('전:', await w());
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  console.log('후:', await w());
  // 시트를 다시 쓰면(새 문서) 다시 넣는다
  await p.evaluate(() => { const d = document.getElementById('fr').contentDocument; d.open(); d.write('<html><head></head><body style="margin:0"><div id="in" style="width:160px;height:80px;overflow:scroll"><div style="height:400px;width:400px"></div></div></body></html>'); d.close(); });
  await p.waitForTimeout(300);
  console.log('시트 다시 씀:', await w());
  // 일괄 편집기도 브라우저 막대 (v1.113.3 직접 그린 막대를 뺌) — 같은 6px
  const q = await b.newPage({ viewport: { width: 1366, height: 768 } }); q.on('pageerror', e => errs.push(e.message));
  await q.goto('http://127.0.0.1:8766/blank.html');
  await q.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>';
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const hs = Array.from({ length: 80 }, (_, i) => ({ id: 'h' + i, attributes: { name: '핸드아웃 ' + i }, get(k) { return this.attributes[k]; } }));
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll(hs), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await q.addScriptTag({ content: us }); await q.waitForTimeout(400);
  await q.click('#r20-bebtn'); await q.waitForTimeout(400);
  console.log('일괄 편집기 막대:', await q.evaluate(() => ['.r20be-tree', '.r20be-pane'].map(c => { const e = document.querySelector('#r20be ' + c); return c + ' ' + (e.offsetWidth - e.clientWidth) + 'px'; }).join(' · ')), '| 직접 그린 막대 없음:', !(await q.$('.r20be-sb')));
  console.log('errors:', errs); await b.close();
})();
