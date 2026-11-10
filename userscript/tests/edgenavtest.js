// v1.78 왼쪽 도구 줄 가늘게 · 내비게이터 왼쪽 끝 붙이기 · 목차 너비 · 보는 사람 칩 · 📢 보여주기 · 목차 깊이
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const fill = n => Array.from({ length: n }, (_, i) => `<p>본문 줄 ${i}. 별이 빛난다.</p>`).join('');
const NOTES = {
  k1: `<p><b>From 아오이</b></p><p><b>「아득한 별을 보고 있었다」</b></p><p><span style="font-size:20px">【트레일러】</span></p>${fill(6)}<p><b>「─그건 너희의 별이야」</b></p><p>【시나리오 개요】</p>${fill(6)}<p>【단서】 계산대 밑의 시든 백합 — 편지와 관련.</p><h2>【도입】</h2><p><b>도입1 (방문자)</b></p>${fill(6)}<p><b>그외 도입</b></p><p>【핸드아웃】</p><p><b>분과회 &lt;여름의 별하늘&gt;</b></p><p>【긴급소환】</p>${fill(3)}<p>【긴급소환】</p><p>【긴급소환】</p><p>【엔딩】</p><p><b>A엔드 「은하수」</b></p><p><b>「미안해. 그리고 고마워」</b></p>${fill(8)}`,
  h1: `<div style="width:900px;height:60px;background:#234">넓은 카드</div><p>로쿠분기시의 밤하늘에 빛나는 은하수.</p>${fill(30)}`, k0: `<p>그냥 핸드아웃</p>`, h2: `<div style="width:100%;height:40px;background:teal">창 폭 카드</div><p>호시 나츠히코</p>`, h3: `<div style="width:500px;margin:0 auto;background:#234;color:#fff;padding:30px 0;text-align:center">고정 폭 카드</div><p>비밀</p>`
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/올인원/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(NOTES => {
    localStorage.clear(); localStorage.setItem('r20_aio_zoom', '1.1');
    document.body.style.cssText = 'margin:0;height:100vh;background:#26262b;font:13px sans-serif';
    const btn = (lb) => `<div class="toolbar-button-outer" style="position:relative;display:flex;justify-content:center"><div class="toolbar-button-mid" style="display:flex;flex-direction:column;align-items:center"><div class="toolbar-button-inner" style="width:42px;height:34px;display:flex;align-items:center;justify-content:center"><div class="icon-slot" style="width:34px;height:34px;border-radius:12px;background:#ddd" title="${lb}"></div></div><div class="label" style="font-size:8px">${lb}</div></div></div>`;
    document.body.innerHTML = `<div id="vm-master-toolbar" style="position:fixed;left:0;top:0;bottom:0;width:0;z-index:10602">
        <div class="master-toolbar-outer" style="position:absolute;left:0;top:0;width:44px;height:100%;padding-top:18px;padding-bottom:16px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;align-items:center;background:#fff;z-index:10602;transition:left 200ms">
          <div class="top"><div class="spacer-header" style="font-size:8px">도구</div>${btn('선택')}${btn('손')}${btn('그리기')}
            <div class="toolbar-button-outer" style="position:relative"><div class="toolbar-button-inner" style="width:42px;height:34px"><div class="icon-slot" style="width:34px;height:34px"></div></div><div class="drawer-outer" style="position:absolute;left:2.938rem;bottom:0.188rem;width:40px;min-height:44px;background:#f0f;"></div></div></div>
          <div class="bot"><div class="spacer-header" style="font-size:8px">레이어</div>${btn('토큰')}${btn('GM')}${btn('맵')}</div>
          <button class="collapse-toggle" style="position:absolute;right:-40px;top:6px;width:40px;height:40px;border-radius:20px;border:1px solid #999;background:#fff">«</button>
        </div></div>
      <div id="playerzone" class="toolbar-collapse-adjust" style="position:absolute;left:44px;bottom:0;height:90px;width:300px;background:#555"></div>
      <div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div>
      <div id="textchat-input" style="position:absolute;bottom:0;left:0;right:0"><div><select id="speakingas"><option>GM</option></select></div><textarea style="width:100%;height:60px"></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    const evs = {};
    const mk = (id, name, share) => ({ id, attributes: { name, inplayerjournals: share }, get(k) { return this.attributes[k]; },
      save(a) { Object.assign(this.attributes, a); (evs['change:inplayerjournals'] || []).forEach(f => f(this)); },
      _getLatestBlob(f, cb) { setTimeout(() => cb(f === 'notes' ? NOTES[id] : ''), 10); },
      view: { showDialog() {
        const d = document.createElement('div'); d.className = 'ui-dialog'; d.style.cssText = 'position:fixed;left:500px;top:100px;width:300px;height:200px;background:#fff;z-index:20000';
        d.innerHTML = `<div class="ui-dialog-titlebar"><span class="ui-dialog-title">${name}</span><button class="ui-dialog-titlebar-close">x</button></div><div class="dialog"><button class="btn broadcasthandout">Show to Players</button></div>`;
        d.querySelector('.broadcasthandout').onclick = () => { window.__bc = (window.__bc || []).concat(id); };
        d.querySelector('.ui-dialog-titlebar-close').onclick = () => d.remove();
        document.body.appendChild(d); window.__dlg = (window.__dlg || 0) + 1;
      } } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on(ev, f) { if (f) ev.split(' ').forEach(e => (evs[e] = evs[e] || []).push(f)); }, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const pl = (id, n, c, on) => ({ id, attributes: { displayname: n, color: c, online: on }, get(k) { return this.attributes[k]; } });
    const hs = [mk('k1', '▶시나리오 본문 · 은하수의 기억', ''), mk('k0', '[본문] 표시만 있음', ''), mk('h1', '로쿠분기시 상공 · 은하수', 'p2,p3'), mk('h2', '호시 나츠히코', ''), mk('h3', 'ㄴ비밀', 'all')];
    const tree = [{ n: '은하수의 기억', i: ['k0', 'k1', 'h1', 'h2', 'h3'] }];
    window.Campaign = { get: k => k === 'journalfolder' ? JSON.stringify(tree) : '[]', save() {}, on() {}, handouts: coll(hs), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]),
      players: coll([pl('p1', 'GM', '#000000', true), pl('p2', '리버트', '#3b7bd6', true), pl('p3', '키어런', '#ffee55', true), pl('p4', '캄파넬라', '#d1772a', false)]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  }, NOTES);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const R = sel => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(','); });
  // 1) 왼쪽 도구 줄 (기본 가늘게)
  console.log('도구 줄 가늘게:', await R('.master-toolbar-outer'), '| 라벨 보임:', await p.$eval('.master-toolbar-outer .label', e => getComputedStyle(e).display !== 'none'), '| 서랍:', await R('.drawer-outer'), '| playerzone left:', await p.$eval('#playerzone', e => Math.round(e.getBoundingClientRect().left)));
  await p.click('#custom-settings-btn'); await p.waitForTimeout(200);
  const seg = async v => { await p.$eval(`#custom-settings-popup [aria-label="왼쪽 도구 줄"] [data-v="${v}"]`, b => b.click()); await p.waitForTimeout(250); };
  console.log('설정 줄:', await p.$eval('#custom-settings-popup [aria-label="왼쪽 도구 줄"]', s => [...s.children].map(b => b.textContent + (b.getAttribute('aria-checked') === 'true' ? '✓' : '')).join(' ')));
  await seg('short'); console.log('짧게:', await R('.master-toolbar-outer'), '| playerzone left:', await p.$eval('#playerzone', e => Math.round(e.getBoundingClientRect().left)));
  await seg('strip'); console.log('숨김 띠:', await R('.master-toolbar-outer'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  await p.mouse.move(2, 300); await p.waitForTimeout(450); console.log('  마우스 대면:', await R('.master-toolbar-outer'));
  await p.mouse.move(700, 300); await p.waitForTimeout(900); console.log('  떠나면:', await R('.master-toolbar-outer'));
  await p.click('#custom-settings-btn'); await p.waitForTimeout(200);
  await seg('orig'); console.log('원래:', await R('.master-toolbar-outer'), '| 라벨 보임:', await p.$eval('.master-toolbar-outer .label', e => getComputedStyle(e).display !== 'none'), '| playerzone left:', await p.$eval('#playerzone', e => Math.round(e.getBoundingClientRect().left)));
  await seg('thin');
  await p.keyboard.press('Escape'); await p.mouse.click(700, 400); await p.waitForTimeout(100);
  // 2) 내비게이터 · 목차 깊이
  await p.click('#r20-snbtn'); await p.waitForTimeout(150);
  await p.click('#r20-sn .pl [data-p]'); await p.waitForTimeout(400);
  console.log('목차:', await p.$$eval('#r20-sn .ls .tr', ts => ts.map(t => (t.classList.contains('h1') ? '  ' : t.classList.contains('h2') ? '    ' : '') + (t.querySelector('.tn') || t).textContent.trim()).map((x, i, a) => x).join('\n')));
  console.log('들여쓰기 px h1/h2:', await p.evaluate(() => ['.tr.h1', '.tr.h2'].map(s => getComputedStyle(document.querySelector('#r20-sn ' + s)).paddingLeft).join(' / ')));
  console.log('띄운 창:', await R('#r20-sn'));
  await p.evaluate(() => { localStorage.setItem('r20_sn_tw', '70'); document.querySelector('#r20-sn').style.setProperty('--sn-tw', '70px'); });
  console.log('갈래 머리 (목차 70px):', await p.$$eval('#r20-sn .br:not([hidden])', bs => bs.map(b => b.textContent + ' h=' + Math.round(b.getBoundingClientRect().height)).join(' | ')));
  if (SHOT) await p.screenshot({ path: SHOT + '/edgenav-narrow.png', clip: { x: 0, y: 0, width: 460, height: 400 } });
  await p.evaluate(() => { localStorage.removeItem('r20_sn_tw'); document.querySelector('#r20-sn').style.setProperty('--sn-tw', '112px'); });
  // 3) 붙이기
  await p.click('#r20-sn .aio-dock [data-v="dock"]'); await p.waitForTimeout(200);
  const pz = () => p.$eval('#playerzone', e => Math.round(e.getBoundingClientRect().left));
  console.log('« 단추:', await R('.collapse-toggle'), '| 머리줄 왼쪽 여백:', await p.$eval('#r20-sn .hd', h => h.style.paddingLeft), '| ☰ 위치:', await R('#r20-sn .hd .tg'));
  console.log('붙임:', await R('#r20-sn'), '| 자리:', await p.$eval('#r20-sn .aio-dock [aria-pressed="true"]', b => b.textContent), '| 📌 숨김:', await p.$eval('#r20-sn .pin', b => b.hidden), '| playerzone left:', await pz());
  // ½ 반쪽 · 아래 끝 끌기 · 두 번 → 반쪽
  await p.click('#r20-sn .aio-dock [data-v="half"]'); await p.waitForTimeout(100);
  console.log('½ →', await R('#r20-sn'), '| 자리:', await p.$eval('#r20-sn .aio-dock [aria-pressed="true"]', b => b.textContent));
  let g = await p.$eval('#r20-sn .hg', e => e.getBoundingClientRect().toJSON());
  await p.mouse.move(400, g.y + 3); await p.mouse.down(); await p.mouse.move(400, g.y + 103, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(100);
  console.log('아래 끝 +100 →', await R('#r20-sn'), '| 저장:', await p.evaluate(() => localStorage.getItem('r20_sn_dh')));
  await p.click('#r20-sn .aio-dock [data-v="dock"]'); await p.waitForTimeout(100);
  console.log('붙임 → 전체:', await R('#r20-sn'));
  // 너비 끌기
  let r = await p.$eval('#r20-sn .eg', e => e.getBoundingClientRect().toJSON());
  await p.mouse.move(r.x + 3, 300); await p.mouse.down(); await p.mouse.move(r.x + 103, 300, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(100);
  console.log('오른쪽 끝 +100 →', await R('#r20-sn'), '| playerzone left:', await pz());
  r = await p.$eval('#r20-sn .tgr', e => e.getBoundingClientRect().toJSON());
  await p.mouse.move(r.x + 3, 300); await p.mouse.down(); await p.mouse.move(r.x + 63, 300, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(100);
  console.log('목차 +60 →', await R('#r20-sn .toc'), '| 저장:', await p.evaluate(() => localStorage.getItem('r20_sn_tw')));
  await p.dblclick('#r20-sn .tgr'); await p.waitForTimeout(100);
  console.log('목차 두 번 →', await R('#r20-sn .toc'));
  // 4) 보는 사람 칩
  await p.click('#r20-sn .ls .tr.ch:has-text("로쿠분기시")'); await p.waitForTimeout(150);
  const chips = () => p.$$eval('#r20-sn .bd section.on .pm .pm-c', cs => cs.map(c => c.textContent + (c.classList.contains('on') ? '✓' : '') + (c.classList.contains('via') ? '~' : '')).join(' '));
  const who = id => p.$eval(`#r20-sn .ls .tr.ch[data-c="${id}"] .who`, w => [...w.children].map(u => u.style.color || u.textContent).join(' ') + ' «' + w.title + '»').catch(() => '(없음)');
  const share = id => p.evaluate(id => Campaign.handouts.get(id).get('inplayerjournals'), id);
  console.log('칩:', await chips(), '| 목차 동그라미:', await who('h1'));
  await p.click('#r20-sn .bd section.on .pm-c[data-pid="p3"]'); await p.waitForTimeout(100);
  console.log('키어런 끔 →', await share('h1'), '|', await chips(), '|', await who('h1'));
  await p.click('#r20-sn .bd section.on .pm-c[data-pid="all"]'); await p.waitForTimeout(100);
  console.log('모두 켬 →', await share('h1'), '|', await chips(), '|', await who('h1'));
  await p.click('#r20-sn .bd section.on .pm-c[data-pid="p4"]'); await p.waitForTimeout(100);
  console.log('모두인데 캄파넬라 → 빼기:', await share('h1'), '|', await chips(), '|', await who('h1'));
  console.log('글자 크기: ▶ 본문', await p.evaluate(() => { const k = document.querySelector('#r20-sn .bd section.key .cb p'), n = document.querySelector('#r20-sn .bd section.on .cb p'); return [k, n].map(e => getComputedStyle(e.closest('.cz')).zoom + ' · 높이 ' + Math.round(e.getBoundingClientRect().height)).join(' | 일반 '); }));
  if (SHOT) await p.screenshot({ path: SHOT + '/edgenav-small.png', clip: { x: 0, y: 0, width: 560, height: 420 } });
  console.log('창 폭 카드 (일반 핸드아웃):', await p.evaluate(async () => { const sec = document.querySelector('#r20-sn .bd section.ch[data-id="h2"]'); sec.classList.add('on'); const r = sec.querySelector('.cb > div').getBoundingClientRect().width, w = document.querySelector('#r20-sn .bd').clientWidth * 1.1; sec.classList.remove('on'); return Math.round(r) + ' / 본문 칸 ' + Math.round(w) + ' = ' + Math.round(r / w * 100) + '%'; }));
  console.log('500px 카드:', await p.evaluate(() => { const sec = document.querySelector('#r20-sn .bd section.ch[data-id="h3"]'); sec.classList.add('on'); const cb = sec.querySelector('.cb'), c = cb.querySelector('.cz > div').getBoundingClientRect(), r = cb.getBoundingClientRect(); const out = '카드 ' + Math.round(c.left - r.left) + '~' + Math.round(c.right - r.left) + ' / 칸 ' + Math.round(r.width) + ' · 칸 넘침 ' + (cb.scrollWidth - cb.clientWidth); sec.classList.remove('on'); return out; }));
  console.log('가로 넘침: 본문 칸', await p.$eval('#r20-sn .bd', e => e.scrollWidth - e.clientWidth), '| 내용 칸', await p.$eval('#r20-sn .bd section.on .cb', e => e.scrollWidth > e.clientWidth));
  console.log('⚠ 보임:', await p.$eval('#r20-sn .warn', b => !b.hidden));
  // 머리 붙어 있음 (스크롤해도)
  await p.$eval('#r20-sn .bd', bd => { bd.scrollTop = 600; }); await p.waitForTimeout(100);
  console.log('스크롤 600 → 장 머리 위치:', await p.evaluate(() => Math.round(document.querySelector('#r20-sn .bd section.on .cht').getBoundingClientRect().top - document.querySelector('#r20-sn .bd').getBoundingClientRect().top)));
  // 5) 📢 보여주기
  await p.click('#r20-sn .bd section.on .pm-b[data-a="bc"]'); await p.waitForTimeout(400);
  console.log('📢 →', await p.evaluate(() => JSON.stringify(window.__bc)), '| 열린 창 남음:', await p.$$eval('.ui-dialog', d => d.length), '| 단추 글:', await p.$eval('#r20-sn .bd section.on .pm-b[data-a="bc"]', b => b.textContent));
  // 6) 목차 줄 마우스 → 👁 📢
  await p.hover('#r20-sn .ls .tr.ch[data-c="h2"]'); await p.waitForTimeout(80);
  console.log('줄 위 단추 보임:', await p.$eval('#r20-sn .ls .tr.ch[data-c="h2"] .ta', e => getComputedStyle(e).display));
  await p.click('#r20-sn .ls .tr.ch[data-c="h2"] [data-a="see"]'); await p.waitForTimeout(100);
  console.log('👁 상자:', await p.$eval('#r20-sn .pp', e => !e.hidden && e.innerText.replace(/\s+/g, ' ')));
  await p.click('#r20-sn .pp .pm-c[data-pid="p2"]'); await p.waitForTimeout(100);
  console.log('  리버트 켬 →', await share('h2'), '|', await who('h2'), '| 상자 그대로:', await p.$eval('#r20-sn .pp', e => !e.hidden));
  if (SHOT) await p.screenshot({ path: SHOT + '/edgenav.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(50);
  console.log('  Esc → 상자 닫힘:', await p.$eval('#r20-sn .pp', e => e.hidden), '| 창 그대로:', await p.$eval('#r20-sn', e => !e.hidden));
  await p.hover('#r20-sn .ls .tr.ch[data-c="h2"]'); await p.click('#r20-sn .ls .tr.ch[data-c="h2"] [data-a="bc"]'); await p.waitForTimeout(400);
  console.log('줄 📢 →', await p.evaluate(() => JSON.stringify(window.__bc)));
  // 7) 붙인 채 닫기 → 손잡이 → 다시 펴기
  await p.click('#r20-sn [data-a="x"]'); await p.waitForTimeout(100);
  console.log('닫음 → 손잡이 없음:', !(await p.$('#r20-sn-tab')), '| playerzone left:', await pz());
  await p.click('#r20-snbtn'); await p.waitForTimeout(150);
  console.log('📖 로 다시 → 창:', await R('#r20-sn'));
  // 8) 도구 줄 바꾸면 따라옴
  await p.click('#custom-settings-btn'); await p.waitForTimeout(200); await seg('orig'); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  console.log('도구 줄 원래로 → 창:', await R('#r20-sn'));
  await p.click('#custom-settings-btn'); await p.waitForTimeout(200); await seg('thin'); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // 9) 띄우기로
  await p.click('#r20-sn .aio-dock [data-v="float"]'); await p.waitForTimeout(150);
  console.log('떠 있기 →', await R('#r20-sn'), '| playerzone left:', await pz());
  console.log('errors:', errs, '| aio 오류:', await p.evaluate(() => document.querySelector('#custom-settings-btn')?.dataset.err || ''));
  await b.close();
})();
