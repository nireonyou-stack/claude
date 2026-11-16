// v1.112.0 움직이는 그림 멈춤: 문서 밖 <video>(맵 webm)를 찾아 단추를 보이고, 누르면 멈춘 채 유지(Roll20 이 다시 틀어도 막음) · 다시 누르면 재생
// 스크립트보다 먼저 튼 영상은 엿보기로 · 멈춘 동안 새 영상은 첫 장면만 · 문서 안 영상은 그대로 · 기능 끄면 재생으로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const open = async pre => { const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(async pre => {
    localStorage.clear(); Object.entries(pre).forEach(([k, v]) => localStorage.setItem(k, v));
    document.body.innerHTML = '<div id="sidebarcontrol" style="position:fixed;right:0;top:0;width:28px;height:28px"></div>'
      + '<div id="vm_zoom_buttons" style="position:fixed;left:10px;top:60px"><div class="zoomButtonsInner"><button class="btnStyle plus" data-v-abc="">+</button><span class="level">100%</span><button class="btnStyle minus" data-v-abc="">−</button></div></div>'
      + '<canvas id="babylonCanvas" width="64" height="64"></canvas><video id="domvid" muted loop></video>'
      + '<div id="textchat-input"><div><select id="speakingas"><option>GM</option></select></div><textarea></textarea><button id="chatSendBtn">Send</button></div>';
    const coll = arr => ({ models: arr, length: arr.length, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f) });
    window.Campaign = { get: () => '[]', save() {}, on() {}, activePage: () => ({ id: 'p1', get: () => null }), handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'me', macros: coll([]) }; window.is_gm = false;
    // 3초짜리 webm 을 만든다 (캔버스 녹화)
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); let t = 0;
    const iv = setInterval(() => { x.fillStyle = `hsl(${t++ * 12},80%,50%)`; x.fillRect(0, 0, 32, 32); }, 33);
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' }), parts = [];
    rec.ondataavailable = e => parts.push(e.data); rec.start(); await new Promise(r => setTimeout(r, 3000)); rec.stop(); await new Promise(r => rec.onstop = r); clearInterval(iv);
    window.__url = URL.createObjectURL(new Blob(parts, { type: 'video/webm' }));
    // Roll20(Babylon) 흉내: 문서 밖 영상 · 멈추면 곧바로 다시 틀기 · 멈춘 영상은 한 번만 올림
    window.__vids = []; window.__up = 0; window.__retry = 0;
    window.__mk = () => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.src = __url; v.addEventListener('pause', () => { __retry++; v.play(); }); v.play(); __vids.push(v); return v; };
    const gl = document.getElementById('babylonCanvas').getContext('webgl'), tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    const still = new WeakSet();
    (function loop() { __vids.forEach(v => { if (v.readyState < 2 || (v.paused && still.has(v))) return; still.add(v); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); __up++; }); requestAnimationFrame(loop); })();
    __mk();       // 스크립트보다 먼저 튼 영상
  }, pre);
  await p.waitForTimeout(800);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500); return p; };
  let p = await open({});
  const btn = () => p.evaluate(() => { const b = document.querySelector('#vm_zoom_buttons .r20-vpause'); return !b ? '없음' : (b.style.display === 'none' ? '숨김' : '보임') + ' · 눌림 ' + b.getAttribute('aria-pressed') + ' · 뒤: ' + (b.previousElementSibling?.className || '') + ' · data-v ' + b.hasAttribute('data-v-abc'); });
  const ups = async () => { const a = await p.evaluate(() => __up); await p.waitForTimeout(1000); return (await p.evaluate(() => __up)) - a; };
  const st = () => p.evaluate(() => __vids.map((v, i) => `#${i} ${v.paused ? '멈춤' : '재생'} t=${v.currentTime.toFixed(2)}`).join(' / '));
  console.log('스크립트 직후 (아직 못 찾음):', await btn());
  await p.waitForTimeout(4500);
  console.log('페이지 엿보기 뒤 → 보임:', await btn(), '| 1초 올림', await ups());
  await p.click('#vm_zoom_buttons .r20-vpause'); await p.waitForTimeout(1200);
  console.log('누름 → 멈춤 유지:', await st(), '| 1초 올림', await ups(), '| Roll20 다시 틀기 시도', await p.evaluate(() => __retry), '|', await btn());
  console.log('기억:', await p.evaluate(() => localStorage.getItem('r20_mapanim_paused')));
  await p.evaluate(() => __mk()); await p.waitForTimeout(2000);
  console.log('멈춘 동안 새 영상 → 첫 장면만 그리고 멈춤:', await st(), '| 1초 올림', await ups());
  const dom = await p.evaluate(async () => { const v = document.getElementById('domvid'); v.src = __url; await v.play().catch(e => e.name); await new Promise(r => setTimeout(r, 400)); return v.paused ? '멈춤(✗)' : '재생'; });
  console.log('문서 안 영상은 그대로:', dom);
  await p.click('#vm_zoom_buttons .r20-vpause'); await p.waitForTimeout(800);
  console.log('다시 누름 → 재생:', await st(), '| 1초 올림', await ups(), '|', await btn());
  await p.click('#vm_zoom_buttons .r20-vpause'); await p.waitForTimeout(800);
  await p.evaluate(() => { const r = document.querySelector('#r20be'); if (!r || !r.classList.contains('r20be-show') || !r.classList.contains('r20be-setmode')) document.querySelector('#custom-settings-btn').click(); }); await p.waitForTimeout(300);
  const row = await p.$$eval('#custom-settings-popup .cs-row', rs => { const r = rs.find(x => x.textContent.includes('움직이는 그림 멈춤 단추')); if (!r) return '줄 없음'; const i = r.querySelector('.cs-switch input'); const was = i.checked; i.click(); return '설정 줄 있음 · 켜짐 ' + was + ' → ' + i.checked; });
  await p.waitForTimeout(600);
  console.log(row);
  console.log('멈춘 채 기능 끔 → 재생 · 단추 없음:', await st(), '|', await btn());
  await p.close(); p = await open({ r20_mapanim_paused: 'true' });
  await p.evaluate(() => __mk()); await p.waitForTimeout(1500);
  console.log('멈춤 기억한 채 새로 열기 · 스크립트 뒤 새 영상은 첫 장면만:', await st());
  await p.waitForTimeout(3500);
  console.log('엿보기 뒤 먼저 튼 영상도 멈춤:', await st(), '| 1초 올림', await ups(), '|', await btn());
  console.log('errors:', errs); await b.close();
})();
