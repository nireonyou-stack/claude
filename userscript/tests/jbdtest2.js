// v1.71 주크박스: 미니 재생 줄(J2) · 반쪽 서랍(J3) · 서랍 곡 찾기
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.addStyleTag({ url: '/sn/jquery-ui.min.css' });
  await p.addScriptTag({ url: '/sn/jquery.min.js' }); await p.addScriptTag({ url: '/sn/jquery-ui.min.js' });
  await p.evaluate(() => {
    localStorage.clear(); window.__log = [];
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a;font:13px sans-serif';
    const names = ['마지막 무대', '빗소리', '마녀의 편지', '전투 1', '일상 노래', ...Array.from({ length: 35 }, (_, i) => `곡 ${i}`)];
    const tracks = names.map((n, i) => `<li class="dd-item jukeboxitem" data-itemid="t${i}"><div class="dd-content"><span class="title">${n}</span><a class="play" data-isplaying="false">▶</a></div></li>`).join('');
    const msgs = Array.from({ length: 40 }, (_, i) => `<div class="message general" data-messageid="m${i}"><span class="by">미오:</span> 대화 ${i}</div>`).join('');
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff">
        <ul class="tabmenu"><li id="chattab"><a href="#textchat">💬</a></li><li id="journaltab"><a href="#journal">📒</a></li><li id="jukeboxtab" class="tipme-delayed"><a href="#jukebox" class="Roll20Icon">♪</a></li></ul>
        <div id="textchat" style="padding:0;overflow-y:auto;height:calc(100% - 140px);position:relative"><div class="content">${msgs}</div></div>
        <div id="journal">저널</div>
        <div id="jukebox"><h3>Jukebox</h3><ol id="jukeboxfolderroot"><li class="dd-item dd-folder"><ol class="dd-list">${tracks}</ol></li></ol></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    $('#rightsidebar').tabs();
    const subs = [];
    const fire = (ev, m) => subs.forEach(([e, f]) => { if (e.split(' ').includes(ev)) f(m); });
    const mk = (n, i) => ({ id: 't' + i, attributes: { title: n, volume: 50, playing: false, softstop: false, loop: false, tags: i === 1 ? '비 #잔잔' : '' }, get(k) { return this.attributes[k]; },
      save(o) { Object.assign(this.attributes, o); Object.keys(o).forEach(k => fire('change:' + k, this)); window.__log.push('SAVE ' + this.id + ' ' + JSON.stringify(o)); } });
    const ms = names.map(mk);
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on(e, f) { if (f) subs.push([e, f]); }, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    // Roll20 처럼: 재생 단추 → 재생 표시 · 모델 playing
    $('#rightsidebar').on('click', '.jukeboxitem a.play', function () {
      const li = $(this).closest('li')[0], m = ms.find(x => x.id === li.dataset.itemid), on = this.dataset.isplaying !== 'true';
      this.dataset.isplaying = String(on); m.attributes.playing = on; fire('change:playing', m); window.__log.push((on ? 'PLAY ' : 'STOP ') + m.id);
    });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll(ms) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const bar = () => p.evaluate(() => { const b = document.getElementById('r20-jbm'); if (!b) return '없음'; if (b.hidden) return '숨김'; const r = b.getBoundingClientRect(); return [...b.querySelectorAll('.r')].map(x => x.querySelector('.nm').textContent + ' 볼륨 ' + x.querySelector('input').value + (x.querySelector('.fd.on') ? ' (페이드 중)' : '')).join(' / ') + ` @${Math.round(r.top)} 폭 ${Math.round(r.width)} · 첫 자식 ${b.parentElement.firstElementChild === b}`; });
  console.log('처음 줄:', await bar());
  await p.$eval('#jukebox li[data-itemid="t0"] a.play', a => a.click()); await p.waitForTimeout(250);
  console.log('마지막 무대 재생 →', await bar());
  await p.$eval('#jukebox li[data-itemid="t1"] a.play', a => a.click()); await p.waitForTimeout(250);
  console.log('빗소리도 →', await bar());
  if (SHOT) await p.screenshot({ path: SHOT + '/jbm.png', clip: { x: 1000, y: 0, width: 366, height: 160 } });
  // 채팅을 내려도 줄은 위에 붙어 있음
  await p.$eval('#textchat', e => { e.scrollTop = 400; }); await p.waitForTimeout(50);
  console.log('채팅 스크롤 400 → 줄 위치:', await p.$eval('#r20-jbm', e => Math.round(e.getBoundingClientRect().top)), '| 채팅 위:', await p.$eval('#textchat', e => Math.round(e.getBoundingClientRect().top)));
  // 볼륨 막대
  await p.$eval('#r20-jbm .r[data-id="t0"] input', s => { s.value = 30; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(200);
  console.log('볼륨 30 →', await p.evaluate(() => window.Jukebox.playlist.get('t0').get('volume')), '|', await bar());
  // 페이드 (3초 기본 — 1초 뒤 줄어드는 중)
  await p.click('#r20-jbm .r[data-id="t0"] .fd'); await p.waitForTimeout(1000);
  console.log('페이드 1초 뒤 →', await p.evaluate(() => window.Jukebox.playlist.get('t0').get('volume')), '|', await bar());
  await p.click('#r20-jbm .r[data-id="t0"] .fd'); await p.waitForTimeout(250);
  console.log('페이드 다시 누름(멈춤) →', await bar());
  // ■ 정지
  await p.click('#r20-jbm .r[data-id="t1"] [data-a="stop"]'); await p.waitForTimeout(250);
  console.log('빗소리 ■ →', await bar(), '|', await p.evaluate(() => window.__log.filter(x => /PLAY|STOP/.test(x)).join(',')));
  // 곡 이름 → 서랍에서 그 곡
  await p.click('#r20-jbm .r[data-id="t0"] .nm'); await p.waitForTimeout(150);
  console.log('곡 이름 누름 → 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')), '| 깜빡임:', await p.$eval('#jukebox li[data-itemid="t0"]', li => li.classList.contains('r20jbd-flash')));
  await p.click('#r20-jbm [data-a="drawer"]'); await p.waitForTimeout(100);
  console.log('▾ → 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  // 반쪽 서랍
  const geo = () => p.evaluate(() => { const r = id => { const e = document.getElementById(id); if (!e || !e.getClientRects().length) return '-'; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round).join(','); }; return `주크박스 ${r('jukebox')} · 머리줄 ${r('r20-jbd-hd')} · 🔍 ${r('r20-qfbtn')}`; });
  await p.click('#jukeboxtab a'); await p.waitForTimeout(100);
  console.log('♪ (전체) →', await geo());
  await p.click('#r20-jbd-hd [data-a="mode"]'); await p.waitForTimeout(100);
  console.log('½ (반쪽) →', await geo(), '| 기억:', await p.evaluate(() => localStorage.getItem('r20_jbd_mode')));
  const hg = await (await p.$('#r20-jbd-hgrip')).boundingBox();
  await p.mouse.move(hg.x + 100, hg.y + 3); await p.mouse.down(); await p.mouse.move(hg.x + 100, hg.y - 97, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  console.log('위 끝 끌기 100 위로 →', await geo(), '| 높이 기억:', await p.evaluate(() => localStorage.getItem('r20_jbd_h')));
  await p.mouse.move(hg.x + 100, hg.y - 97); await p.mouse.down(); await p.mouse.move(hg.x + 100, 5, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  console.log('맨 위까지 끌기 → (단추줄 밑에서 멈춤)', await geo());
  if (SHOT) await p.screenshot({ path: SHOT + '/jbd-half.png' });
  // 곡 찾기
  await p.fill('#r20-jbd-hd .q', 'ㅁㄴ'); await p.waitForTimeout(80);
  console.log('찾기 ㅁㄴ →', await p.$$eval('#r20-jbd-res .r', rs => rs.map(r => r.textContent + (r.classList.contains('on') ? '◀' : '')).join(' | ')));
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(350);
  console.log('↓ Enter →', await p.$$eval('#r20-jbd-res .r', rs => rs.map(r => r.textContent + (r.classList.contains('pl') ? '(재생 중)' : '')).join(' | ')), '|', await bar());
  if (SHOT) await p.screenshot({ path: SHOT + '/jbd-find.png', clip: { x: 700, y: 300, width: 666, height: 468 } });
  await p.fill('#r20-jbd-hd .q', '#잔잔'); await p.waitForTimeout(80);
  console.log('찾기 #잔잔 →', await p.$$eval('#r20-jbd-res .r', rs => rs.map(r => r.textContent).join(' | ')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(50);
  console.log('Esc → 찾기 비움:', await p.$eval('#r20-jbd-hd .q', e => JSON.stringify(e.value)), '| 결과 숨김:', await p.$eval('#r20-jbd-res', e => e.hidden), '| 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(50);
  console.log('Esc 한 번 더 → 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  // 반쪽에서 다른 데 누르기 · 미니 줄 누르기는 닫지 않음
  await p.click('#jukeboxtab a'); await p.waitForTimeout(80);
  await p.click('#r20-jbm .r[data-id="t0"] [data-a="stop"]'); await p.waitForTimeout(80);
  console.log('미니 줄 ■ 눌러도 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  await p.mouse.click(200, 300); await p.waitForTimeout(80);
  console.log('맵 누름 → 서랍:', await p.evaluate(() => document.body.classList.contains('r20jbd-open')));
  // 플레이어에게는 줄 없음
  console.log('errors:', errs); await b.close();
})();
