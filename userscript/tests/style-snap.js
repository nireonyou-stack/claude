// CSS 정리 확인 (값이 바뀔 수 있는 정리용): 두 판의 올인원으로 같은 화면을 열어, 올인원 창 안 모든 요소의 계산된 모양을 견준다.
// Roll20 비슷한 바탕(Bootstrap · jQuery UI)을 깔고 연다 — 실제 Roll20 CSS 는 없어서, Roll20 고유 규칙과의 다툼까지는 못 본다.
//   node tests/style-snap.js 옛판.user.js 새판.user.js      (tests/serve.js 가 떠 있어야 함)
const { chromium } = require('playwright'); const fs = require('fs');
const PROPS = ['display', 'position', 'width', 'height', 'margin', 'padding', 'border', 'border-radius', 'background-color', 'color', 'font-size', 'font-weight',
  'line-height', 'box-shadow', 'outline-style', 'text-align', 'white-space', 'overflow', 'gap', 'flex', 'align-items', 'justify-content', 'opacity', 'visibility', 'cursor', 'z-index'];
const ROOTS = ['#r20be', '#custom-settings-popup', '#r20-qf', '#custom-journal-popup'];
const snap = async file => {
  const us = fs.readFileSync(file, 'utf8');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/bootstrap.min.css' }); await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear();
    document.body.insertAdjacentHTML('beforeend', `<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"><div id="textchat-input" style="position:absolute;bottom:0;left:0;right:0"><div><select id="speakingas"><option value="player|p1">GM</option><option value="character|c1">하루카</option><option value="character|c2">렌</option></select></div><textarea></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>`);
    const M = (id, a) => ({ id, attributes: a, get: k => a[k], set() {}, save(o) { Object.assign(a, o || {}); }, on() {}, _getLatestBlob(n, cb) { cb(''); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const t1 = M('t1', { name: 'NPC표' }); t1.tableitems = coll([M('i1', { name: '웃음', weight: 1, avatar: '' }), M('i2', { name: '――― 네온 ―――', weight: 0, avatar: '' }), M('i3', { name: '화남', weight: 1, avatar: '' })]);
    window.Campaign = { get: k => k === 'journalfolder' ? JSON.stringify(['h1', 'c1', 'c2', 'h2']) : '[]', save() {}, on() {},
      handouts: coll([M('h1', { name: '의뢰서', inplayerjournals: '' }), M('h2', { name: '마녀의 편지', inplayerjournals: 'all' })]),
      characters: coll([M('c1', { name: '하루카', avatar: '' }), M('c2', { name: '렌', avatar: '' })]),
      rollabletables: coll([t1]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) };
    window.currentPlayer = { id: 'p1', macros: coll([M('m1', { name: '장면선택', action: '/desc ?{장면|도입,https://i.imgur.com/a.png|메인,https://i.imgur.com/b.png}', visibleto: '', istokenaction: false })]) };
    window.is_gm = true;
  });
  await p.route(/imgur/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>' }));
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const take = async (label, root) => p.evaluate(([label, root, PROPS]) => {
    const r = document.querySelector(root);
    if (!r || !r.getClientRects().length) return [[label + ' ' + root + ' (안 보임)', '']];
    return [...r.querySelectorAll('*')].concat(r).filter(e => e.getClientRects().length).map((e, i) => {
      const s = getComputedStyle(e);
      return [label + ' ' + root + ' #' + i + ' ' + e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''), PROPS.map(k => k + ':' + s.getPropertyValue(k)).join('; ')];
    });
  }, [label, root, PROPS]);
  const out = [];
  await p.$eval('#r20-bebtn', x => x.click()); await p.waitForTimeout(300);
  out.push(...await take('저널', '#r20be'));
  for (const [tab, pick] of [['매크로', 'm1'], ['굴림표', 't1'], ['링크 점검', null]]) {
    await p.evaluate(t => [...document.querySelectorAll('#r20be .r20be-seg button')].find(b => b.textContent.trim() === t)?.click(), tab); await p.waitForTimeout(200);
    if (pick) { await p.click(`#r20be .r20be-row[data-id="${pick}"] [data-act="pick"]`).catch(() => {}); await p.waitForTimeout(200); }
    out.push(...await take(tab, '#r20be'));
  }
  await p.evaluate(() => document.querySelector('#r20be [aria-label="닫기"]')?.click());
  await p.evaluate(() => { const r = document.querySelector('#r20be'); if (!r || !r.classList.contains('r20be-show') || !r.classList.contains('r20be-setmode')) document.querySelector('#custom-settings-btn').click(); }).catch(() => {}); await p.waitForTimeout(200);
  out.push(...await take('설정', '#custom-settings-popup'));
  await p.keyboard.press('Escape'); await p.mouse.click(400, 400); await p.waitForTimeout(100);
  await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(100); await p.fill('#r20-qf input.qf-in', '마').catch(() => {}); await p.waitForTimeout(100);
  out.push(...await take('빠른 찾기', '#r20-qf'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  await p.click('#custom-select-visual').catch(() => {}); await p.waitForTimeout(200);
  out.push(...await take('말하는 이', '#custom-journal-popup'));
  await b.close();
  return out;
};
// 바탕 화면을 한 번 떠 두기: node style-snap.js --dump 옛판.user.js 옛판.json  →  다음부터 옛판 자리에 .json
const load = f => f.endsWith('.json') ? JSON.parse(fs.readFileSync(f, 'utf8')) : snap(f);
(async () => {
  if (process.argv[2] === '--dump') { fs.writeFileSync(process.argv[4], JSON.stringify(await snap(process.argv[3]))); return console.log('저장', process.argv[4]); }
  const [a, b] = [await load(process.argv[2]), await load(process.argv[3])];
  const A = new Map(a), B = new Map(b);
  let diff = 0;
  const keys = [...new Set([...A.keys(), ...B.keys()])];
  for (const k of keys) {
    const x = A.get(k), y = B.get(k);
    if (x === y) continue;
    diff++;
    if (diff > 40) continue;
    if (x == null || y == null) { console.log((x == null ? '+ ' : '- ') + k); continue; }
    const xs = x.split('; '), ys = y.split('; ');
    console.log('≠ ' + k + '\n    ' + xs.map((v, i) => v !== ys[i] ? v + '  →  ' + ys[i].split(':').slice(1).join(':') : null).filter(Boolean).join('\n    '));
  }
  console.log(`요소 ${a.length} → ${b.length} · 다른 요소 ${diff}개`);
})();
