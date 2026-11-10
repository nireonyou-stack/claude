// 빠른 찾기 v1.63: 찾을 곳 체크칸 · 본문 찾기 · 채팅 로그 전체(아카이브 msgdata) · 채팅만 = 앞뒤 n개 묶음
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT, PLAYER = !!process.env.PLAYER;
// 아카이브 데이터: 블록 2개 ({id: msg}) · priority = ms
const T0 = new Date(2026, 10, 7, 20, 40).getTime();
const M = [];
const add = (who, content, extra = {}) => M.push({ id: '-m' + String(M.length).padStart(3, '0'), who, content, type: 'general', playerid: 'p1', avatar: false, '.priority': T0 + M.length * 60000, ...extra });
add('미오', '봉투를 열어 볼게요.');
add('니레 (GM)', '봉투는 밀랍으로 봉해져 있다.');
add('니레 (GM)', '봉투 안의 <b>편지</b>: &quot;백합이 시들면 문을 열지 마.&quot;');
add('미오', 'H... 하루카?');
add('레이', '꽃집 주인 이름이 하루카였죠.');
for (let i = 0; i < 10; i++) add('레이', '잡담 ' + i);
add('', '(장면 4 · 꽃집 뒷문)', { type: 'desc' });
add('레이', '뒷문을 두드려요.');
add('미오', '그 편지 다시 볼 수 있어요?');
add('니레 (GM)', '(핸드아웃으로 줄게요)', { type: 'whisper', target_name: '미오' });
add('미오', '', { type: 'rollresult', origRoll: '2d6+1', content: JSON.stringify({ total: 9 }) });
add('레이', '{{name=관찰}} {{결과=$[[0]]}} {{allprops=x}}', { rolltemplate: 'default', inlinerolls: [{ results: { total: 12 } }] });
add('레이', '[편지를 내민다](#" style="color:red") 하루카한테 보여 줘요.');
add('니레 (GM)', '그녀의 손이 잠깐 멈춘다.');
add('니레 (GM)', JSON.stringify({ type: 'V', rolls: [{ type: 'R', dice: 1, table: 'apng소재', results: [{ v: 0, tableItem: { name: '깨진 거울 조각' } }] }], resultType: 'sum', total: 0 }), { type: 'rollresult', origRoll: '1t[apng소재]' });
const enc = o => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');
const page = (msgs, link) => `<html><body>${link ? '<a href="?p=1&onePage=true">Show on One Page</a>' : ''}<div class="content"></div><script>var msgdata = "${enc(msgs)}";</script></body></html>`;
const blocks = [Object.fromEntries(M.slice(0, 12).map(m => [m.id, m])), Object.fromEntries(M.slice(12).map(m => [m.id, m]))];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: SHOT ? 2 : 1, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let hits = [];
  await p.route('**/campaigns/chatarchive/**', r => { const u = r.request().url(); hits.push(u.replace(/^.*chatarchive/, '')); r.fulfill({ contentType: 'text/html', body: /onePage/.test(u) ? page(blocks) : page([Object.fromEntries(M.slice(-3).map(m => [m.id, m]))], true) }); });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addScriptTag({ url: '/sn/jquery.min.js' });
  await p.evaluate(([PLAYER, last]) => {
    localStorage.clear(); window.__log = [];
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a;font:13px sans-serif';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:330px;height:100%;background:#fff;overflow:auto">
        <div id="journal" style="display:none"><div class="content"></div></div>
        <div id="textchat" style="height:600px;overflow:auto"><div class="content">${last.map(m => `<div class="message general" data-messageid="${m.id}"><span class="by">${m.who}:</span>${m.content}</div>`).join('')}
</div></div>
        <div id="textchat-input"><textarea></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:330px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    const blob = { h1: { notes: '<p>성문 안내</p><p>문지기에게 <b>편지</b>를 보이면 통과.</p>', gmnotes: escape('<p>사실 편지는 위조다 ㊙️</p>') }, h2: { notes: '<p>꽃집 메뉴</p><p>백합 3송이</p>', gmnotes: '' }, c1: { bio: '<p>하루카 — 꽃집 주인. 편지를 받은 적 있다.</p>', gmnotes: '<p>정체: 마녀</p>' } };
    const mk = (id, a) => ({ id, attributes: a, get: k => k in blob[id] ? 1000 + id.length : a[k], save: o => Object.assign(a, o), view: { showDialog: () => window.__log.push('OPEN ' + a.name) },
      _getLatestBlob: (f, cb) => { window.__log.push('BLOB ' + id + '.' + f); setTimeout(() => cb(blob[id][f]), 20); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const all = PLAYER ? 'all' : '';
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([mk('h1', { name: '성문 안내', inplayerjournals: all }), mk('h2', { name: '마녀의 편지', inplayerjournals: all })]),
      characters: coll([mk('c1', { name: '하루카', inplayerjournals: all })]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = !PLAYER; window.campaign_id = 123;
  }, [PLAYER, M.slice(-3)]);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const type = async (s, w = 120) => { await p.fill('#r20-qf .qf-in', s); await p.waitForTimeout(w); };
  const cats = () => p.$$eval('#r20-qf .qf-cats label', ls => ls.filter(l => !l.hidden).map(l => (l.querySelector('input').checked ? '☑' : '☐') + l.textContent).join(' '));
  const rows = () => p.$$eval('#r20-qf .qf-list > *', rs => rs.map(r => r.classList.contains('qf-grp') ? '【' + r.textContent.replace('지우기', '').trim() + '】'
    : r.classList.contains('qf-blk') ? '[묶음 ' + r.querySelector('.qf-bh').textContent + '] ' + [...r.querySelectorAll('.qf-row')].map(x => (x.classList.contains('hit') ? '★' : '') + x.textContent).join(' / ')
    : r.textContent.trim()).join('\n   '));
  const setCat = async (c, on) => { const x = await p.$(`#r20-qf .qf-cats input[data-c="${c}"]`); if ((await x.isChecked()) !== on) await x.click(); await p.waitForTimeout(80); };

  await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(200);
  console.log('체크칸:', await cats());
  console.log('본문 읽음:', (await p.evaluate(() => window.__log.splice(0))).join(','));
  await type('편지');
  console.log('편지 →', await cats(), '\n   ' + await rows());
  await type('편ㅈ'); console.log('치는 중 "편ㅈ" 본문 수:', await p.$eval('#r20-qf .qf-cats input[data-c="body"]', x => x.parentNode.querySelector('i').textContent));
  await type('편징'); console.log('치는 중 "편징" 본문 수:', await p.$eval('#r20-qf .qf-cats input[data-c="body"]', x => x.parentNode.querySelector('i').textContent));
  // 채팅 켜기 → 아카이브 읽기
  await setCat('chat', true); await p.waitForTimeout(500);
  console.log('읽은 주소:', hits.join(' , '));
  await type('편지');
  console.log('채팅 켬 →', await cats(), '\n   ' + await rows());
  if (SHOT) await p.screenshot({ path: SHOT + '/f-mixed.png', clip: { x: 500, y: 0, width: 380, height: 560 } });
  // 채팅 '더' 줄 → 채팅만
  await type('잡담'); console.log('잡담(섞어) →\n   ' + await rows());
  const more = await p.$('#r20-qf .qf-more'); if (more) { await more.click(); await p.waitForTimeout(150); }
  console.log('더 → 채팅만:', await cats(), '| 앞뒤 칸 보임:', await p.$eval('#r20-qf .qf-ctx', e => !e.hidden), await p.$eval('#r20-qf .qf-src', e => e.textContent));
  await type('편지');
  console.log('채팅만 편지 →\n   ' + await rows());
  console.log('바닥:', await p.$eval('#r20-qf .qf-foot', e => [...e.children].filter(x => !x.hidden).map(x => x.textContent).join('')));
  if (SHOT) await p.screenshot({ path: SHOT + '/f-chat.png', clip: { x: 500, y: 0, width: 380, height: 700 } });
  const heads = () => p.$$eval('#r20-qf .qf-blk .qf-bh b', bs => bs.map(b => b.textContent).join(' , '));
  console.log('앞뒤 줄:', await p.$eval('#r20-qf .qf-ctx', e => e.textContent), '| 순서:', await heads());
  await p.click('#r20-qf .qf-ord input[value="old"]'); await p.waitForTimeout(80);
  console.log('오래된순 →', await heads(), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_qf_order')));
  if (SHOT) await p.screenshot({ path: SHOT + '/f-old.png', clip: { x: 500, y: 0, width: 380, height: 300 } });
  await p.click('#r20-qf .qf-ord input[value="new"]'); await p.waitForTimeout(80); console.log('최신순 →', await heads());
  await p.click('#r20-qf .qf-allc'); await p.waitForTimeout(80);
  console.log('전체 체크 →', await cats()); await p.click('#r20-qf .qf-allc'); await p.waitForTimeout(80);
  console.log('전체 다시 → ', await cats(), '|', await rows());
  await p.click('#r20-qf .qf-cats input[data-c="chat"]'); await p.waitForTimeout(80); console.log('채팅만 →', await cats(), '| 전체 반쯤:', await p.$eval('#r20-qf .qf-allc', x => x.indeterminate));
  await p.fill('#r20-qf .qf-n', '0'); await p.waitForTimeout(80);
  console.log('앞뒤 0 →\n   ' + await rows());
  await p.fill('#r20-qf .qf-n', '1'); await p.waitForTimeout(80); await p.click('#r20-qf .qf-in');
  // 읽은 뒤 화면에 새로 온 채팅
  await p.evaluate(() => document.querySelector('#textchat .content').insertAdjacentHTML('beforeend', '<div class="message general" data-messageid="-new1"><span class="tstamp">22:10</span><span class="by">미오:</span>새로 온 말 — 백합 화분을 산다</div>'));
  // 굴림 · 틀 · 귓속말 · 화면 새 채팅
  for (const w of ['관찰', '2d6', '핸드아웃으로', '백합 화분', '거울']) { await type(w); console.log(`"${w}" →`, await rows()); }
  // 가기 (화면에 있는 것) · 복사
  await type('멈춘다');
  await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  console.log('Enter → 화면 채팅 반짝:', await p.$eval('[data-messageid="-m022"]', e => e.classList.contains('r20qf-flash')), '| 창 열림:', await p.$eval('#r20-qf', e => e.classList.contains('show')));
  await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(100);
  await type('하루카'); await p.keyboard.press('Control+KeyC'); await p.waitForTimeout(100);
  console.log('Ctrl+C →', JSON.stringify(await p.evaluate(() => navigator.clipboard.readText())), '| 단추:', await p.$eval('#r20-qf .qf-blk .qf-bb', b => b.textContent));
  // 다시 읽기
  hits = []; await p.click('#r20-qf .qf-re'); await p.waitForTimeout(300); console.log('다시 읽기 →', hits.length, '번 읽음');
  // 기억: 닫았다 열기
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(150);
  console.log('다시 열기:', await cats(), '| 빈 칸:', await rows());
  // Tab → 체크칸, Space 끄기, Enter 입력칸
  await p.keyboard.press('Tab'); console.log('Tab → 포커스:', await p.evaluate(() => document.activeElement.dataset.c));
  await setCat('journal', true); await setCat('body', true);
  await p.focus('#r20-qf .qf-in'); await type('편지');
  console.log('이름+본문+채팅 →', await cats());
  console.log('본문 줄 클릭 →'); await p.click('#r20-qf .qf-it.qf-wide'); await p.waitForTimeout(50); console.log('  ', (await p.evaluate(() => window.__log.splice(0))).join(','));
  console.log('errors:', errs); await b.close();
})();
