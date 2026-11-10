// v1.76 포트레이트 (Roll20 구조 그대로: #playerzone > #avatarContainer > .player · #macrobar 도 그 안)
// 왼쪽 아래 · 왼쪽 위 (매크로 줄은 제자리) · 크기 · 세로 · 포트레이트 · 이름 숨김 · 왼쪽 끝 매크로면 아래 여백 없앰 · 누르면 설정/권한
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  const setup = async (gm, edge) => {
    await p.evaluate(([gm, edge]) => {
      localStorage.clear(); if (!edge) localStorage.setItem('r20_edge_dm', 'map'); window.__log = [];
      document.body.style.cssText = 'margin:0;height:100vh;background:#222;font:13px sans-serif';
      const st = document.createElement('style');
      st.textContent = `#playerzone{position:absolute;bottom:0;left:44px;width:990px;height:100%;padding:14px 0 25px 0;margin:0;pointer-events:none;z-index:2000;box-sizing:border-box;display:flex;align-items:flex-end;align-content:flex-end;flex-wrap:wrap}
        #playerzone.showmacrobar{padding-bottom:69px} #avatarContainer{display:flex} #playerzone .player{pointer-events:auto;float:left;margin:5px 5px 0;position:relative}
        .player .video{width:150px;height:150px;background:#555} .player .playername{font-size:16px;text-align:center;color:#fff;padding:3px 0;line-height:18px;background:#000}
        #macrobar{display:none;height:50px;margin-bottom:15px;width:auto;max-width:100%;overflow-x:hidden;position:absolute;bottom:0;left:0;pointer-events:auto} #playerzone.showmacrobar #macrobar{display:block}
        #macrobar_macros{white-space:nowrap} #macrobar .macrobox{display:inline-block;margin-right:15px}`;
      document.head.appendChild(st);
      const pl = (id, n, hand) => `<div id="player_${id}" class="player"><div class="deckhands" style="position:absolute;top:-50px;left:0;width:150px;height:50px">${hand ? '<div><div class="hand"><div class="cardback" style="width:30px;height:40px;background:#ccc"><span>1</span></div><div class="handcontainer popover open" style="position:absolute;bottom:44px;left:0;width:260px;height:120px;background:#111;color:#fff">[D6] 플롯</div></div></div>' : '<div></div>'}</div>
          <div class="video player-bookmark" onclick="__log.push('R20CLICK')"></div><div class="playername">${n}</div></div>`;
      const macs = ['🎬 진행:이미지', '🎬 진행:텍스트', '😊 말풍선-드립'].map((n, i) => `<div class="macrobox"><button class="btn" onclick="__log.push('M${i}')">${n}</button></div>`).join('');
      document.body.innerHTML = `<div id="playerzone" class="toolbar-collapse-adjust showmacrobar"><div id="avatarContainer"><div id="vm_peer_display"></div>${pl('gm1', '니레', false)}${pl('p2', '미오', true)}${pl('p3', '레이', false)}<div id="macrobar"><div id="macrobar_macros">${macs}</div></div></div></div>
        <div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div></div><div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>`;
      const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
      const mk = (id, a) => ({ id, attributes: a, get(k) { return this.attributes[k]; }, view: { showDialog() { __log.push('OPEN ' + id); } } });
      const players = [mk('gm1', { displayname: '니레' }), mk('p2', { displayname: '미오' }), mk('p3', { displayname: '레이' })];
      const chars = [mk('c1', { name: '레이 (PC)', controlledby: 'p3', inplayerjournals: 'p3' }), mk('c2', { name: '사역마', controlledby: 'p3,p2' }), mk('c3', { name: '하루카 (NPC)', controlledby: '', inplayerjournals: 'all' })];
      const hos = [mk('h1', { name: '단서 · 지도', inplayerjournals: 'p3' }), mk('h2', { name: '장면표', inplayerjournals: 'all' })];
      window.Campaign = { get: () => '[]', save() {}, on() {}, players: coll(players), handouts: coll(hos), characters: coll(chars), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
      window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: gm ? 'gm1' : 'p3', macros: coll([]) }; window.is_gm = gm;
    }, [gm, edge]);
    await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  };
  const geo = () => p.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return '숨김'; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round).join(','); };
    return `니레 ${r('#player_gm1')} · 미오 패 ${r('#player_p2 .deckhands')} · 펼친 패 ${r('#player_p2 .handcontainer')} · 매크로 ${r('#macrobar')} · 이름 ${r('#player_gm1 .playername')} · 그림 ${r('#player_gm1 .video')}`; });
  // ① 매크로 원래 자리
  await setup(true, false);
  console.log('[원래 자리] 처음:', await geo());
  await p.click('#player_gm1 .video'); await p.waitForTimeout(100);
  console.log('내(GM) 포트레이트 → 자리 고르기:', await p.$$eval('#r20-pz-pop .seg[data-k="pos"] button', bs => bs.map(b => b.textContent).join(' | ')), '| Roll20 에도:', await p.evaluate(() => __log.join(',')));
  await p.click('#r20-pz-pop .seg[data-k="pos"] [data-v="tl"]'); await p.waitForTimeout(150);
  console.log('왼쪽 위 →', await geo());
  if (SHOT) await p.screenshot({ path: SHOT + '/pz-tl.png' });
  await p.$eval('#r20-pz-pop input[type=range]', r => { r.value = 96; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(150);
  console.log('크기 96 →', await geo());
  await p.click('#r20-pz-pop .seg[data-k="dir"] [data-v="col"]'); await p.waitForTimeout(150);
  console.log('세로 →', await geo());
  await p.click('#r20-pz-pop .seg[data-k="pics"] [data-v="0"]'); await p.waitForTimeout(150);
  console.log('포트레이트 숨김 →', await geo());
  await p.click('#r20-pz-pop [data-a="x"]'); await p.click('#player_gm1 .playername'); await p.waitForTimeout(100);
  console.log('이름 띠 누름 → 창:', await p.$eval('#r20-pz-pop', e => e.hidden ? '닫힘' : e.querySelector('.hd b').textContent));
  await p.click('#r20-pz-pop .seg[data-k="names"] [data-v="0"]'); await p.waitForTimeout(100);
  console.log('이름도 숨김 →', await geo());
  await p.click('#r20-pz-pop [data-a="reset"]'); await p.waitForTimeout(150);
  console.log('↺ →', await geo());
  await p.click('#player_p3 .video'); await p.waitForTimeout(100);
  console.log('레이 →', await p.$eval('#r20-pz-pop', e => e.querySelector('.hd b').textContent + ' | ' + e.querySelector('.bd').innerText.replace(/\n+/g, ' / ')));
  // ② 매크로 왼쪽 끝: 아래 여백 · 왼쪽 위로 옮겨도 매크로는 왼쪽 끝 그대로
  await p.reload(); await setup(true, true); await p.waitForTimeout(1500);
  console.log('[왼쪽 끝] 처음:', await geo(), '| 판 아래 여백:', await p.$eval('#playerzone', e => getComputedStyle(e).paddingBottom), '| 몸:', await p.evaluate(() => document.body.className.match(/r20edge-\w+/g)));
  await p.click('#player_gm1 .video'); await p.click('#r20-pz-pop .seg[data-k="pos"] [data-v="tl"]'); await p.waitForTimeout(1600);
  console.log('왼쪽 위 →', await geo(), '| 몸:', await p.evaluate(() => document.body.className.match(/r20edge-\w+/g)));
  if (SHOT) await p.screenshot({ path: SHOT + '/pz-edge-tl.png' });
  // ③ 플레이어
  await p.reload(); await setup(false, true);
  await p.click('#player_p3 .video'); await p.waitForTimeout(100); await p.click('#r20-pz-pop [data-tab="perm"]'); await p.waitForTimeout(50);
  console.log('[플레이어] 내 권한 →', await p.$eval('#r20-pz-pop .bd', e => e.innerText.replace(/\n+/g, ' / ')));
  console.log('errors:', errs); await b.close();
})();
