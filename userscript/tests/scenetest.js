// v1.64 장면 구간: + 구간(여기부터 → 여기까지 → 이름) · 채팅 ▶ ■ · 목차 들여쓰기 · 장면 로그 창 · '장면 목차' 핸드아웃 저장 · 다시 읽기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const T0 = new Date(2026, 10, 7, 20, 40).getTime();
const TXT = [['니레 (GM)', '도입 페이즈 시작'], ['미오', '안녕하세요'], ['니레 (GM)', '(도입 묘사)'], ['니레 (GM)', '도입 페이즈 종료'],
  ['니레 (GM)', '메인 페이즈 시작'], ['니레 (GM)', '[1사이클 시작]'], ['미오', '🎬 1사이클 1번째 장면 시작 — 꽃집'], ['니레 (GM)', '문에 달린 종이 울린다.'],
  ['레이', '계산대 쪽으로 걸어가요.'], ['미오', '1사이클 1번째 장면 종료'], ['니레 (GM)', '1사이클 종료'], ['니레 (GM)', '(다음은 레이 장면)']];
const M = TXT.map(([who, content], i) => ({ id: '-m' + String(i).padStart(3, '0'), who, content, type: 'general', '.priority': T0 + i * 60000 }));
const page = msgs => `<html><body><a href="?p=1&onePage=true">Show on One Page</a><script>var msgdata = "${Buffer.from(JSON.stringify([Object.fromEntries(msgs.map(m => [m.id, m]))]), 'utf8').toString('base64')}";</script></body></html>`;

const setup = async (b, saved) => {
  const p = await b.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/campaigns/chatarchive/**', r => r.fulfill({ contentType: 'text/html', body: page(M) }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(([M, saved]) => {
    localStorage.clear(); localStorage.setItem('r20_qf_cats', '["scene"]');
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a;font:13px sans-serif';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:330px;height:100%;background:#fff">
        <div id="textchat" style="height:100%;overflow:auto"><div class="content">${M.map(m => `<div class="message general" data-messageid="${m.id}" style="padding:4px 8px;border-bottom:1px solid #eee"><span class="by">${m.who}:</span> ${m.content}</div>`).join('')}</div></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:330px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), get length() { return arr.length; },
      create(a) { const m = mk('h' + arr.length, a); arr.push(m); window.__log.push('CREATE ' + a.name + ' players=' + JSON.stringify(a.inplayerjournals)); return m; } });
    let ver = 0;
    const mk = (id, a, blobs = {}) => ({ id, attributes: a, blobs, get: k => a[k], save: o => { Object.assign(a, o); window.__log.push('SAVE'); },
      updateBlobs(o) { Object.assign(this.blobs, o); a.gmnotes = ++ver; a.notes = ver; }, _getLatestBlob(f, cb) { setTimeout(() => cb(this.blobs[f] ?? ''), 10); } });
    window.__log = [];
    const hs = saved ? [mk('h0', { name: '장면 목차', inplayerjournals: '', gmnotes: 99 }, saved)] : [];
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll(hs), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true; window.campaign_id = 7;
  }, [M, saved]);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(300);
  return { p, errs };
};
const toc = p => p.$$eval('#r20-qf .qf-list > *', rs => rs.map(r => r.classList.contains('qf-grp') ? '【' + r.textContent.trim() + '】'
  : r.classList.contains('qf-sc') ? '·'.repeat((parseInt(r.style.paddingLeft) - 2) / 14) + r.querySelector('.qf-nm').textContent + ' (' + r.querySelector('.qf-pt').textContent + ')' + [...r.querySelectorAll('[data-a="end"]')].map(() => ' [끝 찍기]').join('')
  : r.textContent.trim()).join('\n   '));
const msg = i => `#textchat .message[data-messageid="-m${String(i).padStart(3, '0')}"]`;

(async () => {
  const b = await chromium.launch();
  const { p, errs } = await setup(b);
  const bar = () => p.$eval('#r20-scb', e => e.hidden ? '(숨김)' : e.className + ': ' + e.textContent).catch(() => '(없음)');
  const dlgV = () => p.$eval('#r20-scd', e => e.hidden ? '(닫힘)' : e.querySelector('.nm').value + ' | ' + e.querySelector('.info').textContent);
  console.log('단추줄 (위 → 아래):', await p.evaluate(() => ['r20-mapshot', 'r20-bebtn', 'r20-scnbtn', 'r20-snbtn', 'r20-qfbtn'].map(id => { const e = document.getElementById(id); return e ? id.replace('r20-', '') + '@' + Math.round(e.getBoundingClientRect().top) : id.replace('r20-', '') + '(없음)'; }).join('  ')));
  await p.click('#r20-snbtn'); await p.waitForTimeout(150);
  console.log('📖 → 창:', await p.$eval('#r20-sn', w => !w.hidden + ' | 목차: ' + [...w.querySelectorAll('.toc > *')].filter(x => !x.hidden).map(x => x.textContent).join(' / ') + ' | 장면 갈래 접힘: ' + w.querySelector('.lc').hidden));
  await p.click('#r20-snbtn'); await p.waitForTimeout(60); console.log('한 번 더 → 닫힘:', await p.$eval('#r20-sn', w => w.hidden));
  await p.keyboard.press('Control+KeyF'); await p.waitForTimeout(400);
  console.log('처음:', await toc(p));
  // + 구간 → 시작 → 끝 → 이름
  await p.click('#r20-qf .qf-add'); console.log('+ 구간 →', await bar());
  await p.click(msg(0)); console.log('시작 누름 →', await bar(), '| 표시:', await p.$eval(msg(0), e => e.className));
  await p.click(msg(3)); await p.waitForTimeout(80);
  console.log('끝 누름 → 이름 창:', await dlgV(), '| 띠:', await bar());
  if (SHOT) await p.screenshot({ path: SHOT + '/sc-name.png' });
  await p.keyboard.press('Enter'); await p.waitForTimeout(450);
  console.log('Enter →', await bar(), '| 만듦:', (await p.evaluate(() => window.__log.splice(0))).join(','));
  console.log('목차:\n   ' + await toc(p));
  // 채팅에 마우스 ▶ (진행 중) · 안쪽부터 ■
  const hoverPress = async (i, a) => { await p.hover(msg(i) + ' .by'); await p.waitForTimeout(50); const vis = await p.$eval(`#r20-scq [data-a="${a}"]`, x => !x.hidden && !x.parentNode.hidden); if (!vis) return '(단추 없음)'; await p.click(`#r20-scq [data-a="${a}"]`); await p.waitForTimeout(60); return 'ok'; };
  for (const i of [4, 5, 6]) { const r = await hoverPress(i, 'a'); const d = await dlgV(); await p.keyboard.press('Enter'); await p.waitForTimeout(60); console.log(`▶ ${i}:`, r, '→ 이름 창:', d); }
  await p.hover(msg(2)); await p.waitForTimeout(50); console.log('본문에 마우스 → ▶ 상자:', await p.$eval('#r20-scq', x => x.hidden ? '숨김' : '보임'));
  await p.hover(msg(9) + ' .by'); await p.waitForTimeout(50); console.log('■ 제목:', await p.$eval('#r20-scq [data-a="b"]', x => x.title));
  console.log('■ 9:', await hoverPress(9, 'b'), await bar());
  console.log('■ 10:', await hoverPress(10, 'b'), await bar());
  await p.hover('#r20-qf .qf-in'); await p.waitForTimeout(450);
  console.log('목차:\n   ' + await toc(p));
  if (SHOT) await p.screenshot({ path: SHOT + '/sc-toc.png' });
  // 이름으로 찾기 (초성)
  await p.fill('#r20-qf .qf-in', 'ㅅㅇㅋ'); await p.waitForTimeout(80); console.log('ㅅㅇㅋ →', await toc(p)); await p.fill('#r20-qf .qf-in', ''); await p.waitForTimeout(80);
  // 보기 → 장면 로그 창
  await p.click('#r20-qf .qf-sc:nth-of-type(4)'); await p.waitForTimeout(150);
  const scw = () => p.$eval('#r20-sn', w => w.querySelector('.nm').textContent + ' [' + w.querySelector('.mt').textContent + '] ' + w.querySelector('.qn').textContent + '\n      ' + [...w.querySelectorAll('.lg .m')].map(m => m.textContent).join('\n      '));
  console.log('장면 로그 창:', await scw());
  if (SHOT) await p.screenshot({ path: SHOT + '/sc-win.png' });
  const tocT = () => p.$$eval('#r20-sn .lc .tr[data-s]', rs => rs.map(r => '·'.repeat((parseInt(r.style.paddingLeft) - 4) / 7) + (r.classList.contains('on') ? '[' : '') + (r.querySelector('.tn')?.textContent || '') + (r.classList.contains('on') ? ']' : '') + (r.querySelector('.dot') ? '●' : '')).join(' | '));
  const geo = () => p.$eval('#r20-sn', w => [w.offsetLeft, w.offsetTop, w.offsetWidth, w.offsetHeight].join(','));
  console.log('창 자리 · 크기:', await geo(), '| 목차 폭:', await p.$eval('#r20-sn .toc', e => e.offsetWidth));
  console.log('목차:', await tocT());
  await p.click('#r20-sn .lc .tr[data-s] >> nth=3'); await p.waitForTimeout(60); console.log('목차 누름 →', (await scw()).split('\n')[0]);
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(60); console.log('↑↑ →', (await scw()).split('\n')[0], '|', await tocT());
  await p.dblclick('#r20-sn .lc .tr[data-s] >> nth=0 >> .tn'); await p.waitForTimeout(60);
  console.log('두 번 → 고치는 칸:', await p.$eval('#r20-sn .lc .tr[data-s] input', i => i.value));
  await p.keyboard.type('도입부'); await p.keyboard.press('Enter'); await p.waitForTimeout(450); console.log('Enter →', await tocT());
  await p.hover('#r20-sn .lc .tr[data-s] >> nth=0'); await p.click('#r20-sn .lc .tr[data-s] >> nth=0 >> [data-a="del"]'); console.log('✕ 한 번:', await p.$eval('#r20-sn .lc .tr[data-s] >> nth=0', r => r.className));
  await p.mouse.move(5, 700); await p.waitForTimeout(30); console.log('마우스 뗌 → 되돌림:', await p.$eval('#r20-sn .lc .tr[data-s]', r => r.className));
  await p.click('#r20-sn [data-a="toc"]'); await p.waitForTimeout(60); console.log('☰ 접기 →', await geo());
  await p.click('#r20-sn [data-a="toc"]'); await p.waitForTimeout(60); console.log('☰ 펴기 →', await geo());
  await p.click('#r20-sn .br[data-b="scn"]'); await p.waitForTimeout(60); console.log('🎬 갈래 접기 → 장면 줄 보임:', await p.$eval('#r20-sn .lc', e => !e.hidden), '| 진행 중 ●:', await p.$eval('#r20-sn .br[data-b="scn"] .dot', e => !e.hidden));
  await p.click('#r20-sn .br[data-b="scn"]'); await p.waitForTimeout(60);
  await p.click('#r20-sn .lc .tr[data-s] >> nth=2');
  await p.fill('#r20-sn .q', '종'); await p.waitForTimeout(60); await p.press('#r20-sn .q', 'Enter'); console.log('찾기 "종" + Enter:', await p.$eval('#r20-sn .qn', e => e.textContent), await p.$eval('#r20-sn .m.cur', e => e.textContent));
  await p.dblclick('#r20-sn .hd .nm'); console.log('두 번 → 접힘 높이:', await p.$eval('#r20-sn', e => e.offsetHeight)); await p.dblclick('#r20-sn .hd .nm');
  await p.keyboard.press('Escape'); console.log('Esc → 창 닫힘:', await p.$eval('#r20-sn', e => e.hidden));
  // ✎ 고치기: 이름 · 진행 중 → 끝 찍기 (메인 페이즈)
  await p.focus('#r20-qf .qf-in');
  const rowOf = async name => (await p.$$('#r20-qf .qf-sc')).find(async () => true) && (await p.$$eval('#r20-qf .qf-sc', (rs, n) => rs.findIndex(r => r.querySelector('.qf-nm').textContent === n), name));
  let k = await rowOf('도입부');
  await p.hover(`#r20-qf .qf-sc >> nth=${k}`); await p.click(`#r20-qf .qf-sc >> nth=${k} >> .qf-ed`); await p.waitForTimeout(60);
  console.log('✎ →', await dlgV(), '| 단추:', await p.$$eval('#r20-scd .ed button', bs => bs.filter(b => !b.hidden).map(b => b.textContent).join(',')));
  await p.fill('#r20-scd .nm', '도입'); await p.keyboard.press('Enter'); await p.waitForTimeout(60);
  k = await rowOf('메인 페이즈');
  await p.click(`#r20-qf .qf-sc >> nth=${k} >> [data-a="end"]`); console.log('끝 찍기 →', await bar());
  await p.click(msg(11)); await p.waitForTimeout(450); console.log('누름 →', await bar());
  // 다시 찍기: 1사이클 1번째 장면 시작을 7로
  k = await rowOf('1사이클 1번째 장면');
  await p.hover(`#r20-qf .qf-sc >> nth=${k}`); await p.click(`#r20-qf .qf-sc >> nth=${k} >> .qf-ed`); await p.click('#r20-scd [data-a="ra"]');
  console.log('시작 다시 →', await bar()); await p.click(msg(7)); await p.waitForTimeout(60); console.log('누름 → 이름 창:', await dlgV()); await p.keyboard.press('Enter'); await p.waitForTimeout(450);
  // + 구간 → 시작만 · Esc = 진행 중
  await p.click('#r20-qf .qf-add'); await p.click(msg(11)); await p.keyboard.press('Escape'); await p.waitForTimeout(60);
  console.log('시작 뒤 Esc → 이름 창:', await dlgV()); await p.fill('#r20-scd .nm', '레이 장면'); await p.keyboard.press('Enter'); await p.waitForTimeout(450);
  // 지우기 (두 번)
  k = await rowOf('레이 장면');
  await p.hover(`#r20-qf .qf-sc >> nth=${k}`); await p.click(`#r20-qf .qf-sc >> nth=${k} >> .qf-ed`); await p.click('#r20-scd .del'); console.log('지우기 1번:', await p.$eval('#r20-scd .del', e => e.textContent)); await p.click('#r20-scd .del'); await p.waitForTimeout(450);
  console.log('목차:\n   ' + await toc(p));
  const saved = await p.evaluate(() => window.Campaign.handouts.models.find(m => m.get('name') === '장면 목차').blobs);
  console.log('저장(GM 메모):', unescape(saved.gmnotes).slice(0, 120) + '…');
  console.log('저장(본문):', unescape(saved.notes).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, '·').replace(/\s+/g, ' ').trim());
  console.log('errors:', errs);
  // 다른 화면(새로 고침)에서 읽기
  const t2 = await setup(b, saved);
  await t2.p.keyboard.press('Control+KeyF'); await t2.p.waitForTimeout(500);
  console.log('새로 고침 뒤 목차:\n   ' + await toc(t2.p));
  // 플레이어: 장면 칸 없음 · ▶ 없음
  await t2.p.evaluate(() => { window.is_gm = false; }); await t2.p.keyboard.press('Escape'); await t2.p.keyboard.press('Control+KeyF'); await t2.p.waitForTimeout(100);
  await t2.p.hover(msg(2) + ' .by'); await t2.p.waitForTimeout(60);
  console.log('옛 장면 목차 단추 없음:', !(await t2.p.$('#r20-scnbtn')));
  await t2.p.keyboard.press('Escape'); await t2.p.click('#r20-snbtn'); await t2.p.waitForTimeout(150);
  console.log('플레이어 📖 → 장면 갈래 · ⚙ 숨김:', await t2.p.$eval('#r20-sn', w => [w.querySelector('.br.sc').hidden, w.querySelector('.lc').hidden, w.querySelector('.cfgb').hidden].join(',')));
  console.log('플레이어: 장면 칸 숨김', await t2.p.$eval('#r20-qf .qf-cats input[data-c="scene"]', x => x.parentNode.hidden), '| ▶ 보임', await t2.p.$eval('#r20-scq', x => !x.hidden).catch(() => false));
  console.log('errors:', t2.errs); await b.close();
})();
