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
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([{ id: 'k1', get: k => ({ name: '장면—열기', action: '/desc [열기](https://files.d20.io/images/111/abc/med.png?123)' })[k] }, { id: 'k2', get: k => ({ name: '장면—닫기', action: '/desc [닫기](https://files.d20.io/images/222/def/original.png)' })[k] }, { id: 'k3', get: k => ({ name: '페이즈', action: '/desc 페이즈 전환 선언' })[k] }]) }; window.is_gm = true; window.campaign_id = 7;
  }, [M, saved]);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(300);
  return { p, errs };
};

const tocT = p => p.$$eval('#r20-sn .lc .tr[data-s]', rs => rs.map(r => '·'.repeat((parseInt(r.style.paddingLeft) - 4) / 7) + (r.querySelector('.tn')?.textContent || '') + (r.querySelector('.dot') ? '●' : '')).join(' | '));
(async () => {
  const b = await chromium.launch();
  const { p, errs } = await setup(b);
  let n = 100;
  const say = (who, html) => p.evaluate(([id, who, html]) => document.querySelector('#textchat .content').insertAdjacentHTML('beforeend', `<div class="message general" data-messageid="${id}" style="padding:4px 8px"><span class="by">${who}:</span> ${html}</div>`), ['-x' + (n++), who, html]);
  const OPEN = t => `<img src="https://files.d20.io/images/111/abc/max.png?999"> ${t}`, CLOSE = '<img src="https://files.d20.io/images/222/def/med.png"> 장면 닫힘';
  const bar = () => p.$eval('#r20-scb', e => e.hidden ? '(숨김)' : e.textContent).catch(() => '(없음)');
  const spans = () => p.evaluate(() => [...document.querySelectorAll('#r20-sn .lc .tr[data-s]')].map(r => r.title.replace('\n', ' ')).join(' | '));
  await p.click('#r20-snbtn'); await p.waitForTimeout(200); if (await p.$eval('#r20-sn .lc', e => e.hidden)) await p.click('#r20-sn .br[data-b="scn"]'); await p.waitForTimeout(100);
  await p.click('#r20-sn [data-a="cfg"]');
  console.log('⚙ 매크로 목록:', await p.$$eval('#r20-sn .cfg select[data-k="a"] option', os => os.map(o => o.textContent).join(', ')));
  await p.selectOption('#r20-sn .cfg select[data-k="a"]', '장면—열기'); await p.selectOption('#r20-sn .cfg select[data-k="b"]', '장면—닫기');
  console.log('기억:', await p.evaluate(() => localStorage.getItem('r20_sc_mac')));
  await p.click('#r20-sn [data-a="cfg"]'); await p.waitForTimeout(3200);
  // 열기 → 이름 창 (이미 저장됨)
  await say('니레 (GM)', OPEN('🎬 1사이클 1번째 장면 시작 — 꽃집')); await p.waitForTimeout(450);
  console.log('열기 매크로 → 이름 창:', await p.$eval('#r20-scd', d => d.hidden ? '(닫힘)' : d.querySelector('.nm').value), '| 목차:', await tocT(p));
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  await say('미오', '계산대 쪽으로 걸어가요.'); await say('니레 (GM)', CLOSE); await p.waitForTimeout(450);
  console.log('닫기 →', await bar(), '| 목차:', await tocT(p));
  await say('레이', '아 잠깐, 감정 판정 하나만!'); await say('니레 (GM)', '(감정 처리)'); await say('니레 (GM)', CLOSE); await p.waitForTimeout(450);
  console.log('다시 닫기 →', await bar(), '|', await spans());
  await p.click('#r20-scb .undo'); await p.waitForTimeout(450); console.log('되돌리기 →', await spans());
  await say('니레 (GM)', CLOSE); await p.waitForTimeout(450); console.log('또 닫기 →', await bar(), '|', await spans());
  // 다음 장면 열기 → 앞 장면 확정 · 새 장면 닫기
  await say('니레 (GM)', OPEN('🎬 1사이클 2번째 장면 — 뒷문')); await p.waitForTimeout(450); await p.keyboard.press('Escape');
  await say('레이', '뒷문을 두드려요.'); await say('니레 (GM)', CLOSE); await p.waitForTimeout(450);
  console.log('2번째 장면 닫기 →', await bar(), '|', await spans());
  // 손으로 연 페이즈는 매크로 닫기가 안 건드림
  await say('니레 (GM)', '클라이맥스 페이즈 시작'); await p.waitForTimeout(100);
  await p.hover('#textchat .message:last-child .by'); await p.waitForTimeout(60); await p.click('#r20-scq [data-a="a"]'); await p.waitForTimeout(60); await p.keyboard.press('Enter'); await p.waitForTimeout(450);
  await say('미오', '결전이다'); await say('니레 (GM)', CLOSE); await p.waitForTimeout(450);
  console.log('페이즈 진행 중에 닫기 매크로 →', await bar(), '| 목차:', await tocT(p));
  // 한꺼번에 많이 (예전 채팅 다시 그리기) · 이미 찍은 메시지 다시 그리기 → 무시
  await p.evaluate(() => { const c = document.querySelector('#textchat .content'); let h = ''; for (let i = 0; i < 10; i++) h += `<div class="message general" data-messageid="-old${i}">${i === 3 ? '<img src="https://files.d20.io/images/111/abc/max.png"> 옛 장면' : '옛 채팅'}</div>`; c.insertAdjacentHTML('beforeend', h); });
  await p.evaluate(() => { const c = document.querySelector('#textchat .content'), m = c.querySelector('[data-messageid="-x100"]'); m.replaceWith(m.cloneNode(true)); });
  await p.waitForTimeout(450); console.log('예전 채팅 10개 · 다시 그리기 → 목차:', await tocT(p));
  // 글만 있는 매크로
  await p.click('#r20-sn [data-a="cfg"]'); await p.selectOption('#r20-sn .cfg select[data-k="a"]', '페이즈'); await p.click('#r20-sn [data-a="cfg"]');
  await say('니레 (GM)', '페이즈 전환 선언'); await p.waitForTimeout(450);
  console.log('글 매크로 → 이름 창:', await p.$eval('#r20-scd', d => d.hidden ? '(닫힘)' : d.querySelector('.nm').value)); await p.keyboard.press('Escape');
  console.log('목차:', await tocT(p));
  if (process.env.SHOT) { await p.click('#r20-sn [data-a="cfg"]'); await p.screenshot({ path: process.env.SHOT + '/mac.png' }); }
  console.log('errors:', errs); await b.close();
})();
