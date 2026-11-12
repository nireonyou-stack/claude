// v1.97 토큰 우클릭 › 고급 변환 › '맵 크기로 늘리기' · '비율 유지하며 맵에 맞추기' (고른 그림을 하나씩 페이지 한가운데에 · 되돌리기)
// Roll20 메뉴는 흉내: 하위 메뉴는 머리를 누르면 그려지고, '위치 고정'은 고른 그림의 잠금 칸을 바꾼다(고른 그림 알아내기 단서)
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="rightsidebar" style="position:fixed;right:0;top:0;bottom:0;width:300px"></div><div id="journal"><div class="content"></div></div><div id="jukebox"><div class="content"></div></div><div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>';
    const ev = () => { const hs = {}; return { on: (e, f) => (hs[e] = hs[e] || []).push(f), off: (e, f) => { hs[e] = (hs[e] || []).filter(x => x !== f); }, fire: (e, ...a) => (hs[e] || []).forEach(f => f(...a)) }; };
    const M = a => { const e = ev(), m = { id: a.id, attributes: a, get: k => m.attributes[k], save(o) { Object.assign(m.attributes, o); }, on: e.on, off: e.off }; return m; };
    const G = a => M({ layer: 'map', imgsrc: 'https://files.d20.io/images/1/a/thumb.png', rotation: 0, lockMovement: false, ...a });
    const gs = [G({ id: 'g1', name: '배경', width: 1000, height: 500, left: 600, top: 300 }), G({ id: 'g2', name: '돌린 그림', width: 400, height: 800, left: 100, top: 100, rotation: 90 }), G({ id: 'g3', name: '다른 것', width: 70, height: 70, left: 35, top: 35 })];
    const pe = ev(), ge = ev();
    const pg = M({ id: 'pg1', name: '맵', width: 20, height: 15, zorder: 'g1,g2,g3', snapping_increment: 1 }); pg.on = pe.on; pg.off = pe.off;
    pg.thegraphics = { models: gs, get: id => gs.find(g => g.id === id), on: ge.on, off: ge.off };
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: { models: [] }, characters: { models: [], get() {} }, rollabletables: { models: [] }, decks: { models: [] }, pages: { models: [pg] }, players: { models: [] }, activePage: () => pg };
    window.Jukebox = { playlist: { models: [] } }; window.currentPlayer = { id: 'me', macros: { models: [] } }; window.is_gm = true;
    window.__sel = ['g1'];
    // Roll20 우클릭 메뉴 흉내
    window.openMenu = () => {
      document.querySelector('.context-menu')?.remove();
      const item = (t, sub) => `<button><div class="submenu-button-outer"><span style="text-align:left">${t}</span>${sub ? '<span class="submenu-button-icon">›</span>' : ''}</div>${sub ? '<div class="submenu" style="display:none"></div>' : ''}</button>`;
      const m = document.createElement('div'); m.className = 'context-menu'; m.style.cssText = 'position:fixed;left:200px;top:120px;background:#fff;display:flex;flex-direction:column';
      m.innerHTML = item('레이어 변경', 1) + item('앞으로 가져오기') + item('뒤로 보내기') + item('위치 고정') + item('삭제') + item('고급 변환', 1);
      const [lay, front, back, lock, del, adv] = m.children;
      const sub = (btn, list) => btn.querySelector('.submenu-button-outer').addEventListener('click', () => { const s = btn.querySelector('.submenu'); if (!s.children.length) s.innerHTML = list.map(t => item(t)).join(''); s.style.display = s.style.display === 'none' ? 'block' : 'none'; });
      sub(lay, ['맵 & 배경', '토큰']); sub(adv, ['그룹 생성', '가로로 뒤집기']);
      lock.addEventListener('click', () => __sel.forEach(id => { const g = pg.thegraphics.get(id); g.save({ lockMovement: !g.get('lockMovement') }); }));
      back.addEventListener('click', () => { const z = pg.get('zorder').split(','), s = z.filter(id => __sel.includes(id)); pg.save({ zorder: [...s, ...z.filter(id => !__sel.includes(id))].join(',') }); pe.fire('change:zorder'); });
      document.body.appendChild(m);
    };
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const st = () => p.evaluate(() => Campaign.activePage().thegraphics.models.map(g => `${g.get('name')} ${g.get('width')}×${g.get('height')} @${g.get('left')},${g.get('top')}${g.get('lockMovement') ? ' 잠김' : ''}`).join(' | '));
  const openAdv = async () => {
    await p.evaluate(() => openMenu()); await p.waitForTimeout(150);
    await p.hover('.context-menu > button:nth-child(6)'); await p.waitForTimeout(200);
    return p.$$eval('.context-menu > button:nth-child(6) .submenu > button', bs => bs.map(b => b.textContent.trim() + (b.dataset.r20tmAct ? '★' : '')).join(' · '));
  };
  console.log('고급 변환 하위 메뉴:', await openAdv());
  await p.click('.context-menu .submenu button[data-r20tm-act="fitPageFill"]'); await p.waitForTimeout(1600);
  console.log('맵 크기로 늘리기(배경) →', await st(), '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent).catch(() => '(없음)'));
  await p.click('#aio-toasts .aio-t:last-child button.a'); await p.waitForTimeout(100);
  console.log('되돌리기 →', await st());
  await p.evaluate(() => { __sel = ['g1', 'g2']; });
  await openAdv();
  await p.click('.context-menu .submenu button[data-r20tm-act="fitPageFit"]'); await p.waitForTimeout(1600);
  console.log('비율 유지(배경 · 돌린 그림) →', await st(), '| 알림:', await p.$eval('#aio-toasts .aio-t:last-child .m', e => e.textContent).catch(() => '(없음)'));
  await p.evaluate(() => { window.is_gm = false; }); 
  console.log('플레이어 메뉴:', await openAdv());
  console.log('errors:', errs); await b.close();
})();
