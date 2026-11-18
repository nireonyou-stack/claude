// v1.117.0 NPC 보관소: 시트 창 📇 → npc_save (어빌리티 · 기본 토큰까지) · 새 시트 이름 칸에 치면 npc_list 로 고르고 npc_get 으로 통째로 채움
// 반복 줄은 새 id · 차례는 char.order · 다른 시트(hint)면 안 채움 · 내용이 있으면 확인 뒤 같은 반복 칸 줄을 지우고 새로
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const dialogs = []; p.on('dialog', async d => { dialogs.push(d.message().split('\n')[0]); await d.accept(); });
  let saved = null;
  await p.route('https://home.test/**', async r => {
    const q = JSON.parse(r.request().postData());
    const res = q.key !== 'test-key-1234567890' ? { ok: false, error: 'badkey', msg: '열쇠가 맞지 않습니다.' }
      : q.op === 'npc_save' ? (saved = q.char, { ok: true, id: 7, mode: 'new', rule: 'bloodmoon', name: q.char.name })
      : q.op === 'npc_list' ? { ok: true, rule: 'bloodmoon', items: [{ id: 7, rule: 'bloodmoon', rule_name: '블러드문', name: '붉은 백작', tags: '보스', n: 6 }, { id: 8, rule: 'shinobigami', rule_name: '시노비가미', name: '붉은 늑대', tags: '', n: 3 }], hint: q.hint }
      : q.op === 'npc_get' ? (q.id === 7 ? { ok: true, item: { id: 7, rule: 'bloodmoon', rule_name: '블러드문', name: '붉은 백작', tags: '보스', char: saved } }
        : { ok: true, item: { id: 8, rule: 'shinobigami', rule_name: '시노비가미', name: '붉은 늑대', char: { name: '붉은 늑대', hint: 'Shinobigami', attrs: [['ninjutsu', '3', '']] } } })
      : { ok: false, error: 'op', msg: '모르는 요청' };
    if (q.op === 'npc_list') console.log('npc_list hint:', q.hint);
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(res) });
  });
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('r20_home_url', 'https://home.test/skin/board/character/sheet/import.roll20.php'); localStorage.setItem('r20_home_key', 'test-key-1234567890');
    const dlg = (id, cid, name, top) => `<div class="ui-dialog" id="${id}" style="position:absolute;left:40px;top:${top}px;width:520px;height:200px;background:#fff"><div class="ui-dialog-titlebar" style="height:40px"><span class="ui-dialog-title">${name}</span></div>
      <div class="dialog characterdialog" data-characterid="${cid}"><iframe style="width:500px;height:120px" srcdoc='<input type="text" name="attr_character_name" value="${name}">'></iframe></div></div>`;
    document.body.innerHTML = `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%;background:#fff"><div id="textchat"><div class="content"></div></div><div id="textchat-input"><textarea></textarea><button id="chatSendBtn">Send</button></div></div>
      <div id="sidebarcontrol" style="position:fixed;right:300px;top:6px;width:28px;height:28px"></div>${dlg('d1', 'c1', '붉은 백작', 20)}${dlg('d2', 'c2', '', 260)}`;
    const coll = (arr, mk) => { const c = { models: arr, get: id => arr.find(x => x.id === id), on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), get length() { return arr.length; } };
      if (mk) c.create = a => { const m = mk(a, c); arr.push(m); return m; }; return c; };
    let seq = 0;
    const mkM = (a, c) => { const m = { id: 'm' + (++seq), attributes: { ...a }, get(k) { return this.attributes[k]; }, save(v) { Object.assign(this.attributes, v); }, destroy() { const i = c.models.indexOf(m); if (i >= 0) c.models.splice(i, 1); } }; return m; };
    const mkChar = (id, name, attrs, abil, blobs) => {
      const ch = { id, attributes: { name, avatar: name ? 'https://files.d20.io/images/9/a/med.png' : '' }, get(k) { return this.attributes[k]; }, save(v) { Object.assign(this.attributes, v); },
        blobs: { ...blobs }, _getLatestBlob(f, cb) { setTimeout(() => cb(this.blobs[f] || ''), 5); }, updateBlobs(o) { Object.assign(this.blobs, o); } };
      ch.attribs = coll([], mkM); attrs.forEach(([n, v, m]) => ch.attribs.create({ name: n, current: v, max: m || '' }));
      ch.abilities = coll([], mkM); abil.forEach(a => ch.abilities.create(a));
      return ch;
    };
    const A = '-AAAAAAAAAAAAAAAAAAA', B = '-BBBBBBBBBBBBBBBBBBB';
    const c1 = mkChar('c1', '붉은 백작', [['sheet_type', 'monster'], ['level', '5'], ['hp', '30', '30'], ['character_name', '붉은 백작'],
      [`repeating_abilities_${A}_name`, '송곳니'], [`repeating_abilities_${A}_cost`, '2'], [`repeating_abilities_${B}_name`, '어둠'], ['_reporder_repeating_abilities', `${B},${A}`]],
      [{ name: '공격', action: '/r 2d6', istokenaction: true }], { bio: '<p>백작</p>', gmnotes: 'GM 비밀', defaulttoken: JSON.stringify({ represents: 'c1', imgsrc: 'https://files.d20.io/images/9/t/thumb.png', bar1_link: '-oldattrid', bar2_link: 'sheetattr_hp', bar1_value: '30' }) });
    const c2 = mkChar('c2', '', [['character_name', ''], ['sheet_type', 'hunter']], [], {});
    window.__c = { c1, c2 };
    window.Campaign = { get: k => k === 'charactersheetname' ? 'Blood Moon (Korean)' : '[]', save() {}, on() {}, handouts: coll([]), characters: coll([c1, c2]), rollabletables: coll([]), decks: coll([]), pages: coll([]), players: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(600);
  const toast = () => p.$eval('#r20-home-toast', e => e.textContent).catch(() => '(없음)');
  console.log('머리줄:', await p.$eval('#d1 .ui-dialog-titlebar', t => [...t.querySelectorAll('button')].map(x => x.textContent + (x.classList.contains('off') ? '(흐림)' : '')).join(' ')));
  // 1) 📇 보내기
  await p.click('#d1 .r20home.npc'); await p.waitForTimeout(1000);
  console.log('📇 →', await toast());
  console.log('보낸 것:', JSON.stringify({ name: saved?.name, hint: saved?.hint, attrs: saved?.attrs.length, order: saved?.order, abilities: saved?.abilities, gm: saved?.gmnotes, tok: !!saved?.defaulttoken }));
  // 2) 새 시트 이름 칸에 치기 → 고르기 → 채움
  const nm = p.frameLocator('#d2 iframe').locator('[name="attr_character_name"]');
  await nm.click(); await p.keyboard.type('붉은'); await p.waitForTimeout(400);
  console.log('후보:', await p.$eval('#r20-ac-box', e => e.classList.contains('show') ? [...e.querySelectorAll('.r20-ac-item')].map(i => i.textContent).join(' / ') : '(없음)'));
  await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  const state = () => p.evaluate(() => {
    const c = __c.c2, at = c.attribs.models.map(a => [a.get('name'), a.get('current'), a.get('max')]);
    const rep = at.filter(a => /^repeating_/.test(a[0])), ids = [...new Set(rep.map(a => a[0].split('_')[2]))], ord = at.find(a => a[0] === '_reporder_repeating_abilities')?.[1] || '';
    const nameOf = id => rep.find(a => a[0] === `repeating_abilities_${id}_name`)?.[1];
    const tok = JSON.parse(c.blobs.defaulttoken || '{}');
    return `이름 ${c.get('name')} · 초상 ${!!c.get('avatar')} · hp ${at.find(a => a[0] === 'hp')?.slice(1).join('/')} · sheet_type ${at.find(a => a[0] === 'sheet_type')?.[1]} · 반복 줄 ${ids.length}개(새 id ${ids.every(id => id.length === 20 && id[0] === '-' && !/^-[AB]{19}$/.test(id))})`
      + ` · 차례 ${ord.split(',').map(nameOf).join('→')} · 어빌리티 ${c.abilities.models.map(a => a.get('name') + (a.get('istokenaction') ? '🎯' : '')).join(',')} · bio ${c.blobs.bio} · gm ${c.blobs.gmnotes}`
      + ` · 토큰 represents=${tok.represents} bar1_link=${JSON.stringify(tok.bar1_link)} bar2_link=${tok.bar2_link}`;
  });
  console.log('채움 →', await state(), '| 확인창:', dialogs.length);
  console.log('알림:', await toast());
  // 3) 다른 시트용 NPC → 안 채움
  await nm.fill(''); await nm.click(); await p.keyboard.type('붉은 늑'); await p.waitForTimeout(400);
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  console.log('다른 시트 NPC →', await toast(), '| ninjutsu 안 들어감:', await p.evaluate(() => !__c.c2.attribs.models.some(a => a.get('name') === 'ninjutsu')));
  // 4) 내용이 있는 시트에 다시 → 확인 뒤 같은 반복 칸 줄은 지우고 새로 (줄 수 그대로)
  await nm.fill(''); await nm.click(); await p.keyboard.type('붉은 백'); await p.waitForTimeout(400);
  await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  console.log('다시 채움 → 확인창:', dialogs.join(' | '), '|', await state());
  console.log('errors:', errs); await b.close();
})();
