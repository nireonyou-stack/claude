// 주크박스 ↘ 페이드 아웃: 막대 + 저장으로 0 까지 · 정지는 직접 · 다음 재생 때 원래 볼륨 / 일괄 편집기 저장 안 함 경고
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('r20jb_fade', '1');
    window.__log = [];
    document.body.innerHTML = `<div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content">
      <div class="secondarycontrols"></div>
      <ol id="jukeboxfolderroot"><li class="dd-item dd-folder" data-globalfolderid="pl1"><div class="dd-content"><span class="folder-title">이별</span></div>
        <ol class="dd-list"><li class="dd-item jukeboxitem" data-itemid="t1"><div class="dd-handle"></div><div class="dd-content"><span class="title">Kokia - 2 Days</span>
          <a class="play" data-isplaying="false"></a><div class="volume"><input class="slider" type="range" min="0" max="100" value="40"></div></div></li></ol></li></ol></div></div>`;
    const a = { title: 'Kokia - 2 Days', volume: 40, loop: false, playing: false };
    const m = { id: 't1', attributes: a, get: k => a[k], save: o => { Object.assign(a, o); window.__log.push('save ' + JSON.stringify(o)); } };
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, forEach: f => arr.forEach(f) });
    window.Jukebox = { playlist: coll([m]) };
    window.Campaign = { get: k => k === 'jukeboxfolder' ? JSON.stringify([{ n: '이별', i: ['t1'], id: 'pl1' }]) : '[]', save() {}, on() {},
      handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.is_gm = true;
    // Roll20 흉내: 막대가 바뀌면 소리 볼륨이 그 값 · 재생 단추는 그때 막대 값으로 시작/정지
    const sl = document.querySelector('.slider'), pa = document.querySelector('a.play');
    document.getElementById("jukebox").addEventListener("change", e => { if (e.target.matches(".slider")) window.__log.push("slider " + e.target.value); });
    document.getElementById('jukebox').addEventListener('click', e => { const pa = e.target.closest('a.play'); if (!pa) return; const sl = pa.closest('li').querySelector('.slider'); const on = pa.dataset.isplaying !== 'true'; pa.dataset.isplaying = String(on); window.__log.push((on ? 'PLAY at ' : 'STOP at ') + sl.value); });
    const rerender = () => { const li = document.querySelector('li.jukeboxitem'); const n = li.cloneNode(true); n.querySelector('.slider').value = a.volume; li.replaceWith(n); window.__log.push('rerender'); };
    m.save = o => { Object.assign(a, o); window.__log.push('save ' + JSON.stringify(o)); if ('volume' in o && !document.querySelector('a.play[data-isplaying="true"]')) rerender(); };
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const fadeBtn = () => p.$('#jukebox .r20jb-fade');
  console.log('step controls:', await p.$$eval('#jukebox .r20jb-step', ls => ls.map(l => l.textContent.trim()).join(' / ')), '| fade btn:', !!(await fadeBtn()));
  await p.click('#jukebox .title'); await p.waitForTimeout(100);                 // 재생
  console.log('fade visible while playing:', await p.$eval('#jukebox .r20jb-fade', e => getComputedStyle(e).display));
  await p.click('#jukebox .r20jb-fade'); await p.waitForTimeout(1500);           // 1초 페이드
  console.log('after fade: slider', await p.$eval('.slider', e => e.value), '| held', await p.evaluate(() => localStorage.getItem('r20jb_held')), '| still playing', await p.$eval('a.play', e => e.dataset.isplaying));
  await p.click('#jukebox .title'); await p.waitForTimeout(100);                 // 정지 (직접)
  await p.click('#jukebox .title'); await p.waitForTimeout(100);                 // 다음 재생
  console.log('log:', (await p.evaluate(() => window.__log)).join(' | '));
  console.log('held after replay:', await p.evaluate(() => localStorage.getItem('r20jb_held')));
  console.log('errors:', errs); await b.close();
})();
