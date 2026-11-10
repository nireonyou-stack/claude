// v1.88 빠른 찾기 명령: 창 열기 · 주크박스 멈춤 · 설정 바로가기 · '>' 명령만 · 초성
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
      <div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div><div id="textchat-input"><div><select id="speakingas"><option>GM</option></select></div><textarea class="ui-autocomplete-input">안녕</textarea><button id="chatSendBtn">Send</button></div>`);
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
  const groups = () => p.$$eval('#r20-qf .qf-gh, #r20-qf [class*="qf-g"]', hs => [...new Set(hs.map(h => h.textContent.trim().split(/\s/)[0]))].slice(0, 4).join(' · ')).catch(() => '');
  await p.keyboard.press('Control+KeyF'); await type('링크');
  console.log('링크 →', await names());
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('Enter → 일괄 편집기 탭:', await p.$eval('#r20be .r20be-seg button.on', b => b.textContent).catch(() => '(안 열림)'));
  await p.evaluate(() => document.querySelector('#r20be [aria-label="닫기"]')?.click());
  await p.keyboard.press('Control+KeyF'); await type('>');
  console.log('> 명령만:', (await names()).split(' | ').length, '개 · 처음', (await names()).split(' | ').slice(0, 5).join(' | '));
  await type('ㅈㅋㅂㅅ');
  console.log('초성 ㅈㅋㅂㅅ →', await names());
  await type('>가늘');
  console.log('>가늘 (설명으로) →', await names());
  await type('>설정 빠른'); 
  console.log('>설정 빠른 →', await names());
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('Enter → 설정 찾기 칸:', JSON.stringify(await p.$eval('#custom-settings-popup .cs-search input', i => i.value).catch(() => '(없음)')), '| 보이는 줄:', await p.$$eval('#custom-settings-popup .cs-blk:not([hidden]) .cs-name', ns => ns.map(n => n.textContent).join(', ')).catch(() => ''));
  if (SHOT) { await p.keyboard.press('Escape'); await p.keyboard.press('Control+KeyF'); await type('주크'); await p.screenshot({ path: SHOT + '/qfcmd.png', clip: await p.$eval('#r20-qf .qf-box', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 400) }; }) }); }
  console.log('errors:', errs); await b.close();
})();
