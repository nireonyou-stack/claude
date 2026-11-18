// v1.116.1 표만 있는 핸드아웃: Roll20 새 편집기의 <figure class="table"> 표가 기본 여백으로 칸을 뚫던 것 · ⤢ 맞춤이면 어떤 표든 칸 안 (넘치면 ✗)
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const rows = (n, c) => Array.from({ length: n }, (_, i) => `<tr>${Array.from({ length: c }, (_, j) => `<td>${j ? '수상한 꽃 냄새가 나는 골목 ' + i : i + 1}</td>`).join('')}</tr>`).join('');
const NOTES = {
  t1: `<table border="1" style="width:100%;border-collapse:collapse"><tbody>${rows(6, 3)}</tbody></table>`,
  t2: `<table style="width:700px;border-collapse:collapse" border="1"><tbody>${rows(6, 4)}</tbody></table>`,
  t3: `<table style="border:none;border-collapse:collapse;width:451.3pt"><colgroup><col width="200"><col width="401"></colgroup><tbody><tr><td style="border:solid #000 1pt;padding:5pt;overflow:hidden;overflow-wrap:break-word"><p>항목</p></td><td style="border:solid #000 1pt;padding:5pt"><p>아주 긴 설명이 들어가는 칸 아주 긴 설명이 들어가는 칸 아주 긴 설명이 들어가는 칸</p></td></tr></tbody></table>`,
  t4: `<table width="800" border="1"><tr><td width="200">이름</td><td width="600">설명 설명 설명</td></tr></table>`,
  t5: `<table border="1"><tr><td>https://example.com/very/long/unbroken/path/that/keeps/going/and/going/forever/and/ever</td><td>짧음</td></tr></table>`,
  t7: `<figure class="table" style="width:100%;"><table class="ck-table-resized" style="border:1px solid #000"><colgroup><col style="width:30%;"><col style="width:70%;"></colgroup><tbody>${rows(5, 2)}</tbody></table></figure>`,
  t8: `<table style="table-layout:fixed;width:100%;border-collapse:collapse" border="1"><colgroup><col style="width:300px"><col style="width:400px"></colgroup><tbody>${rows(4, 2)}</tbody></table>`,
  t9: `<figure class="table"><table style="border:1px solid #000;width:650px"><tbody>${rows(4, 3)}</tbody></table></figure>`,
  t6: `<table border="1" style="width:100%"><tr><td style="white-space:nowrap">줄바꿈 없는 아주 아주 아주 아주 긴 글 줄바꿈 없는 아주 아주 긴 글</td><td>b</td></tr></table>`,
};
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: SHOT ? 2 : 1 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(NOTES => {
    localStorage.clear();
    document.body.style.cssText = 'margin:0;height:100vh;background:#3c4a3a;font:13px sans-serif';
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div>
      <div id="textchat-input" style="position:absolute;bottom:0;left:0;right:0"><textarea style="width:100%;height:60px"></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px;background:#eee"></div>`;
    const mk = (id, name) => ({ id, attributes: { name, inplayerjournals: '' }, get(k) { return this.attributes[k]; }, _getLatestBlob(f, cb) { setTimeout(() => cb(f === 'notes' ? NOTES[id] : ''), 15); } });
    const coll = arr => ({ models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    const ids = Object.keys(NOTES), hs = ids.map(id => mk(id, '표 ' + id));
    window.Campaign = { get: k => k === 'journalfolder' ? JSON.stringify([{ n: '표 시험', i: ids }]) : '[]', save() {}, on() {}, handouts: coll(hs), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  }, NOTES);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  await p.click('#r20-snbtn'); await p.waitForTimeout(150);
  await p.click('#r20-sn .pl [data-p]'); await p.waitForTimeout(500);
  const look = async (id, tag) => {
    await p.click(`#r20-sn .ls .tr.ch[data-c="${id}"]`); await p.waitForTimeout(200);
    const r = await p.evaluate(([id, tag]) => {
      const sec = document.querySelector(`#r20-sn .bd section[data-id="${id}"]`), cb = sec.querySelector('.cb'), z = cb.querySelector('.cz'), t = z.querySelector('table'), bd = document.querySelector('#r20-sn .bd');
      const R = e => e.getBoundingClientRect();
      const tds = [...t.querySelectorAll('td')], over = tds.filter(td => td.scrollWidth > td.clientWidth + 1).length;
      const bad = (tag === '맞춤' && cb.scrollWidth - cb.clientWidth > 0) || (t.closest('figure') && Math.abs(R(t).left - R(cb).left) > 2 && R(t).width >= R(cb).width - 2) || (t.closest('figure') && R(t).right > R(cb).right + 1 && t.closest('figure').getAttribute('style'));
      return (bad ? '✗ ' : '') + `칸 ${Math.round(R(cb).left)}~${Math.round(R(cb).right)} · 표 ${Math.round(R(t).left)}~${Math.round(R(t).right)} · 배율 ${(+getComputedStyle(z).zoom).toFixed(2)} · cb넘침 ${cb.scrollWidth - cb.clientWidth} · bd넘침 ${bd.scrollWidth - bd.clientWidth} · 칸 넘친 td ${over}/${tds.length}`;
    }, [id, tag]);
    console.log(tag, id, r);
    if (SHOT) await p.screenshot({ path: `${SHOT}/${tag}-${id}.png`, clip: await p.$eval('#r20-sn', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 360) }; }) });
  };
  for (const id of Object.keys(NOTES)) await look(id, '65%');
  await p.click('#r20-sn .fit'); await p.waitForTimeout(300);
  for (const id of Object.keys(NOTES)) await look(id, '맞춤');
  console.log('errors:', errs); await b.close();
})();
