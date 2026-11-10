// v1.78 주크박스 서랍 곡 찾기: 🎧 미리듣기 · 이름 = 모두에게 재생 · Shift+Enter
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
    const mk = (n, i) => ({ id: 't' + i, attributes: { title: n, volume: 50, playing: false, softstop: false, loop: false, tags: i === 1 ? '비 #잔잔' : '', source: 'My Audio', track_id: (100 + i) + '-x' }, get(k) { return this.attributes[k]; },
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
  await p.evaluate(() => {        // 가짜 Audio: 재생하면 시간이 흐름
    window.__aud = [];
    window.Audio = class { constructor(u) { this.src = u; this.currentTime = 0; this.duration = 200; this.volume = 1; this.l = {}; window.__aud.push(this); }
      addEventListener(t, f) { (this.l[t] = this.l[t] || []).push(f); } play() { this.t = setInterval(() => { this.currentTime += 1; (this.l.timeupdate || []).forEach(f => f()); }, 100); return Promise.resolve(); }
      pause() { clearInterval(this.t); this.paused = true; } load() {} removeAttribute() {} };
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  await p.click('#jukeboxtab a'); await p.waitForTimeout(200);
  const rows = () => p.$$eval('#r20-jbd-res .r', rs => rs.map(r => [r.querySelector('.pv')?.textContent, r.querySelector('.nm').textContent, r.querySelector('.tm')?.textContent, r.querySelector('.st')?.textContent].filter(Boolean).join(' ') + (r.classList.contains('on') ? '◀' : '')).join(' | '));
  await p.fill('#r20-jbd-hd .q', 'ㅁㄴ'); await p.waitForTimeout(80);
  console.log('찾기 ㅁㄴ →', await rows());
  await p.click('#r20-jbd-res .r[data-id="t2"] .pv'); await p.waitForTimeout(450);
  console.log('🎧 마녀의 편지 →', await rows(), '| 주소:', await p.evaluate(() => window.__aud.at(-1)?.src), '| 모두 재생:', await p.evaluate(() => window.__log.filter(x => /PLAY|STOP/.test(x)).join(',') || '없음'));
  await p.waitForTimeout(400); console.log('  0.4초 뒤 →', await rows());
  await p.click('#r20-jbd-res .r[data-id="t2"] .pv'); await p.waitForTimeout(100);
  console.log('🎧 다시 → 멈춤:', await rows());
  await p.keyboard.press('Shift+Enter'); await p.waitForTimeout(250);
  console.log('Shift+Enter (첫 줄) →', await rows());
  await p.click('#r20-jbd-res .r[data-id="t2"] .nm'); await p.waitForTimeout(400);
  console.log('이름 누름 → 모두 재생:', await p.evaluate(() => window.__log.filter(x => /PLAY|STOP/.test(x)).join(',')), '|', await rows());
  await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  console.log('Enter (첫 줄) →', await p.evaluate(() => window.__log.filter(x => /PLAY|STOP/.test(x)).join(',')), '|', await rows());
  if (SHOT) await p.screenshot({ path: SHOT + '/jbpv.png', clip: { x: 700, y: 0, width: 666, height: 300 } });
  console.log('errors:', errs); await b.close();
})();
