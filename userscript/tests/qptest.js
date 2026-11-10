// v1.80.1 매크로 선택지 그림 창(Macro Options): ― 구분선 · 그림 없는 줄은 묶음 제목 · 안 불러와지는 그림 칸 숨김 · 찾기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const OPTS = [['사이코로픽션 범용｜시크', '사이코로픽션 범용｜시크'], ['도입 페이즈', 'https://i.imgur.com/mLdgImK.png'], ['메인 페이즈', 'https://i.imgur.com/8ll6baD.jpg'], ['장면닫기', '장면닫기'],
  ['전투종료', 'https://imgur.com/BROKEN1.png'], ['――――――――――――――――――-', '――――――――――――――――――-'], ['사이코로픽션 범용｜윈도우', '사이코로픽션 범용｜윈도우'],
  ['도입', 'https://imgur.com/LON2gNv.png'], ['메인', 'https://imgur.com/ZowTIBj.png'], ['네온—————————————————', '네온—————————————————'], ['네온-인트로', 'https://i.imgur.com/abcdE12.png'], ['장면 열기', '장면 열기'], ['네온-메인', 'https://i.imgur.com/abcdE13.png'], ['————', '————'],
  ['글리치—————', '글리치—————'], ['글리치-인트로', ' [도입](https://i.imgur.com/m4FfGp4.gif)'], ['글리치-메인', 'https://imgur.com/8mttSQv.gif'],
  ['8비트—————', '8비트—————'], ['8비트-도입', 'https://cdn.discordapp.com/attachments/1/2/1.png'], ['8비트-메인', 'https://cdn.discordapp.com/attachments/1/3/2.png']];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/imgur\.com/, r => /BROKEN/.test(r.request().url()) ? r.fulfill({ status: 404, body: 'no' }) : r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#345"/></svg>' }));
  await p.route(/discordapp/, r => r.fulfill({ status: 404, body: 'This content is no longer available.' }));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="textchat"><div class="content" style="background:#fff"><div class="message general">안녕</div><div class="message desc" style="background:rgb(241, 214, 233)">장면</div></div></div>'));
  await p.evaluate(OPTS => {
    const d = document.createElement('div');
    d.className = 'ui-dialog'; d.style.cssText = 'position:absolute;left:100px;top:50px;width:400px;background:#fff';
    d.innerHTML = `<div class="ui-dialog-titlebar"><span class="ui-dialog-title">Macro Options</span></div><div class="ui-dialog-content"><p>장면 선택: <select>${OPTS.map(([l, v]) => `<option value="${v}">${l}</option>`).join('')}</select></p></div><div class="ui-dialog-buttonset"><button>Submit</button></div>`;
    document.body.appendChild(d);
  }, OPTS);
  await p.waitForTimeout(800);
  const view = () => p.$$eval('.r20qp-sec', ss => ss.filter(s => !s.hidden).map(s => [...s.children].filter(c => !c.hidden).map(c => c.classList.contains('r20qp-cap') ? '«' + c.textContent + '»' : c.querySelector('.r20qp-lb').textContent + (c.dataset.broken ? '⚠' : '')).join(', ')).join('  ||  '));
  console.log('그림 창:', await view());
  console.log('그림 주소 · 바탕:', await p.$$eval('.r20qp-tile img', is => is.map(i => i.closest('.r20qp-tile').title + '=' + i.getAttribute('src').replace(/^https:\/\/i\.imgur\.com\//, '') + ' ' + getComputedStyle(i).backgroundColor).join(' / ')));
  console.log('안 열린 칸(이름 칸으로):', await p.$$eval('.r20qp-tile[data-broken]', bs => bs.map(x => x.title).join(', ')));
  if (SHOT) await p.screenshot({ path: SHOT + '/qp.png', clip: { x: 90, y: 40, width: 430, height: 600 } });
  await p.fill('.r20qp-bar input', '메인'); await p.waitForTimeout(80);
  console.log('찾기 메인 →', await view());
  await p.fill('.r20qp-bar input', '윈도우'); await p.waitForTimeout(80);
  console.log('찾기 윈도우(묶음 이름) →', await view());
  await p.fill('.r20qp-bar input', '네온-인'); await p.waitForTimeout(80);
  console.log('찾기 네온-인 →', await view());
  await p.fill('.r20qp-bar input', '전투'); await p.waitForTimeout(80);
  console.log('찾기 전투 →', JSON.stringify(await view()));
  await p.fill('.r20qp-bar input', ''); await p.waitForTimeout(80);
  await p.click('.r20qp-tile[title="네온-인트로"]'); await p.waitForTimeout(50);
  console.log('네온-인트로 누름 → 목록:', await p.$eval('.ui-dialog-content select', s => s.options[s.selectedIndex].text));
  // v1.81.0 묶음만 보기 칩
  const chips = () => p.$$eval('.aio-gd-op', os => os.map(o => (o.getAttribute('aria-selected') === 'true' ? '*' : '') + o.querySelector('span').textContent + o.querySelector('b').textContent + (o.querySelector('img') ? '🖼' : '')).join(' · '));
  const pickG = async name => { await p.click('.aio-gd-btn'); await p.click(`.aio-gd-op:has(span:text-is("${name}"))`); await p.waitForTimeout(60); };
  console.log('칩:', await chips());
  await pickG('사이코로픽션 범용｜윈도우');
  console.log('메뉴 높이 제한:', await p.evaluate(async () => { const b = document.querySelector('.aio-gd-btn'); b.click(); await new Promise(r => setTimeout(r, 50)); const m = document.querySelector('.aio-gd-menu'); const r = m.style.maxHeight; b.click(); return r; }), '| 그림 칸 최소 높이:', await p.$eval('.r20qp-grid', g => getComputedStyle(g).minHeight));
  console.log('단추:', await p.$eval('.aio-gd-btn', b => b.textContent), '| 메뉴 닫힘:', await p.$eval('.aio-gd-menu', m => m.hidden));
  console.log('윈도우 칩 →', await view(), '| 칩:', await chips());
  await p.fill('.r20qp-bar input', '메인'); await p.waitForTimeout(80);
  console.log('윈도우 안에서 찾기 메인 →', await view());
  await p.fill('.r20qp-bar input', ''); await p.waitForTimeout(50);
  // 같은 질문 창을 다시 열면 고른 묶음 기억
  await p.evaluate(() => document.querySelector('.ui-dialog').remove());
  await p.evaluate(OPTS => {
    const d = document.createElement('div');
    d.className = 'ui-dialog'; d.style.cssText = 'position:absolute;left:100px;top:50px;width:400px;background:#fff';
    d.innerHTML = `<div class="ui-dialog-titlebar"><span class="ui-dialog-title">Macro Options</span></div><div class="ui-dialog-content"><p>장면 선택: <select>${OPTS.map(([l, v]) => `<option value="${v}">${l}</option>`).join('')}</select></p></div><div class="ui-dialog-buttonset"><button>Submit</button></div>`;
    document.body.appendChild(d);
  }, OPTS);
  await p.waitForTimeout(800);
  console.log('다시 열기 →', await view(), '| 칩:', await chips());
  if (SHOT) { await p.screenshot({ path: SHOT + '/qp-grp.png', clip: { x: 300, y: 40, width: 760, height: 420 } }); await p.click('.aio-gd-btn'); await p.waitForTimeout(300); await p.screenshot({ path: SHOT + '/qp-menu.png', clip: { x: 300, y: 40, width: 760, height: 520 } }); await p.click('.aio-gd-btn'); }
  await pickG('전체');
  // 키보드: ↓ 두 번 Enter
  await p.focus('.aio-gd-btn'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(60);
  console.log('키보드 ↓↓ Enter →', await view());
  console.log('제목 보임:', await p.$eval('.ui-dialog-title', e => getComputedStyle(e).display), '| 제목줄 높이:', await p.$eval('.ui-dialog-titlebar', e => e.getBoundingClientRect().height));
  await pickG('전체');
  console.log('전체 →', (await view()).split('||').length, '묶음 | 기억:', await p.evaluate(() => localStorage.getItem('r20_qp_grp')));
  await pickG('8비트');
  console.log('8비트(그림 모두 안 열림) →', await view(), '| 단추:', await p.$eval('.aio-gd-btn', b => b.textContent), '| 그림 칸 높이:', await p.$eval('.r20qp-grid', g => Math.round(g.getBoundingClientRect().height)));
  if (SHOT) await p.screenshot({ path: SHOT + '/qp-bad.png', clip: await p.$eval('.ui-dialog', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 500) }; }) });
  await pickG('전체');
  console.log('errors:', errs); await b.close();
})();
