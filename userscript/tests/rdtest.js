// v1.118.0 룰 데이터 자동완성: 둘이서 수사(액션 · 클래스 → 자동 습득 액션 줄 · 배경은 그 클래스 것만) · 적과 흑(권한 마법 · 기본 선언 〔기동〕은 계보에서 · 계보 칸)
// + 데이터 주소에 열쇠를 본문으로 보내기 (POST, 열쇠가 없으면 GET)
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const sent = [];
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(() => {
    localStorage.clear();
    window.NIRE_RULEDATA = {
      futari_action: [{ name: '이니셜의 직감', group: '탐정', type: '보조', cost: '6', effect: '범인의 이니셜' },
        { name: '피의 직감', group: '클래스', class: '운명의 혈통', type: '보조', cost: '1', effect: '눈을 모두 4로' },
        { name: '딴짓', group: '클래스', class: '괴짜 형사', type: '보조', cost: '1', effect: '휴식' },
        { name: '괴짜의 추궁', group: '클래스', class: '괴짜 형사', type: '보조', cost: '3', effect: '키워드 1개' }],
      futari_class: [{ name: '운명의 혈통', group: '탐정', actions: '피의 직감' }, { name: '괴짜 형사', group: '형사', actions: '딴짓 / 괴짜의 추궁', pick: 1 }],
      futari_background: [{ name: '운명의 혈통 · 클론', class: '운명의 혈통', n: '10', title: '클론', desc: 'DNA' },
        { name: '괴짜 형사 · 클론', class: '괴짜 형사', n: '3', title: '클론', desc: '다른 클래스' },
        { name: '운명의 혈통 · 명탐정 선조', class: '운명의 혈통', n: '1', title: '명탐정 선조', desc: '조상' }],
      shinobigami: [{ name: '접근전 공격', group: '범용 인법', type: '공격', skill: '자유', range: '1', cost: '없음', effect: '접근전 대미지 1점', flavor: '일반적인 접근전 공격.' },
        { name: '동원', group: '히라사카 기관', type: '서포트', skill: '경제력', range: '없음', cost: '3', effect: '전장을 「혼잡」으로 변경한다.\n유파 : 히라사카 기관 ——— 전장을 혼란에 빠뜨린다.' }],
      redblack_magic: [{ name: '소각 권한', group: '흑검 1장', boot: '？：10', black: '2', red: '2', acc: 1, sup: 1, flavor: '흑염', effect: '1대미지' },
        { name: '재단 권한', group: '흑검 1장', boot: '흑：8', black: '3', red: '3', sup: 1, effect: '손패 1장' },
        { name: '흑사 현현', group: '현현 · 공격 강화형', boot: '？：10', effect: '지속: 살해', enemy: 1 }],
      redblack_basic: [{ name: '현장 재구축', effect: '오브젝트 소환', lv2: '인간 수준 지성 부여', lv3: '시각 정경' },
        { name: '물질 재변성', effect: '크기 변경', lv2: '사람 크기', lv3: '집 한 채' }],
      redblack_noble: [{ name: '탐정 알고리즘', group: '추구자', boot: '흑：18', effect: '미발견 각본', lv3: '대상 변경' }],
      redblack_lineage: [{ name: '추구자', hp: 7, restore: 4, mana_b: 3, mana_r: 0, basic: '현장 재구축 흑：6 / 인물 재구축 흑：7', systems: '흑검 1장 / 흑검 2장 / 흑장 3장' }] };
    // Roll20 흉내: +Add 는 조금 뒤에 줄을 만든다
    const row = () => `<div class="repitem"><input type="text" name="attr_name"><input type="text" name="attr_type"><input type="text" name="attr_cost"><textarea name="attr_eff"></textarea></div>`;
    const card = (k, i) => `<div class="mg"><input type="text" name="attr_${k}${i}_name"><input type="number" name="attr_${k}${i}_lv"><input type="text" name="attr_${k}${i}_boot"><textarea name="attr_${k}${i}_text"></textarea></div>`;
    document.body.innerHTML = `<div class="futari" id="ft" style="position:absolute;left:20px;top:20px;width:600px">
        <input type="text" name="attr_cls"> <input type="text" name="attr_background">
        <div class="repcontainer" data-groupname="repeating_acts">${row()}</div><div class="repcontrol" data-groupname="repeating_acts"><button class="btn repcontrol_add">+Add</button></div></div>
      <div class="rb" id="rb" style="position:absolute;left:660px;top:20px;width:600px">
        <input type="text" name="attr_lineage"> <input type="number" name="attr_hp_init"> <input type="number" name="attr_hp_restore"> <input type="number" name="attr_mb_init"> <input type="number" name="attr_mr_init">
        <input name="attr_ms1"><input name="attr_ms2"><input name="attr_ms3">
        <div class="mg au"><input type="text" name="attr_au1_name"><input type="text" name="attr_au1_boot"><input name="attr_au1_black"><input name="attr_au1_red">
          <input type="checkbox" name="attr_au1_acc" value="1"><input type="checkbox" name="attr_au1_sup" value="1" checked><span name="attr_au1_text"></span><textarea name="attr_au1_text"></textarea></div>
        ${card('bc', 1)}${card('bc', 2)}${card('bc', 3)}${card('nc', 1)}</div>
      <div class="sg" id="sg" style="position:absolute;left:20px;top:420px;width:600px"><div class="nw"><div class="nr">
        <input type="text" name="attr_Ninpo_01_Name"><span class="ty"><input type="radio" class="none" name="attr_Ninpo_01_Types" value="" checked><label class="tyk"><input type="radio" name="attr_Ninpo_01_Types" value="@{Tool}"><span>공</span></label><label class="tyk"><input type="radio" name="attr_Ninpo_01_Types" value="@{support}"><span>서</span></label></span>
        <input name="attr_Ninpo_01_Range"><input name="attr_Ninpo_01_Cost"><input name="attr_Ninpo_01_Assigned_Skill"><textarea name="attr_Ninpo_01_Effect"></textarea></div><textarea name="attr_Ninpo_01_Flavor"></textarea></div></div>
      <div id="sgold" style="position:absolute;left:20px;top:560px;width:600px"><div class="nrow"><input type="text" name="attr_Ninpo_09_Name"><input name="attr_Ninpo_09_Clan"><textarea name="attr_Ninpo_09_Effect"></textarea></div></div>
      <div id="rightsidebar" style="position:fixed;right:0;top:0;width:300px;height:100%"></div>`;
    document.querySelector('.repcontrol_add').addEventListener('click', () => setTimeout(() => document.querySelector('.repcontainer').insertAdjacentHTML('beforeend', row()), 80));
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await p.addScriptTag({ content: us }); await p.waitForTimeout(400);
  const box = () => p.$eval('#r20-ac-box', e => e.classList.contains('show') ? [...e.querySelectorAll('.r20-ac-item')].map(x => x.textContent).join(' | ') : '(없음)');
  const ok = (label, got, want) => console.log((JSON.stringify(got) === JSON.stringify(want) ? '✓ ' : '✗ ') + label, JSON.stringify(got));
  const type = async (sel, t) => { await p.click(sel); await p.keyboard.type(t); await p.waitForTimeout(80); };
  const vals = sel => p.$$eval(sel, es => es.map(e => e.type === 'checkbox' ? (e.checked ? 'V' : '-') : e.value));

  // ── 둘이서 수사: 액션 이름 → 타입 · 코스트 · 효과
  await type('#ft .repitem [name="attr_name"]', '이니셜'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('액션 줄 채움', await vals('#ft .repitem:nth-child(1) :is(input,textarea)'), ['이니셜의 직감', '보조', '6', '범인의 이니셜']);
  // 클래스 → 자동 습득 액션 1줄 더함 (+Add 를 대신 누름)
  await type('#ft [name="attr_cls"]', '운명'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('클래스 칸', await vals('#ft [name="attr_cls"]'), ['운명의 혈통']);
  ok('자동 습득 액션 줄 추가', await vals('#ft .repitem:nth-child(2) :is(input,textarea)'), ['피의 직감', '보조', '1', '눈을 모두 4로']);
  // 같은 클래스를 다시 골라도 줄을 또 더하지 않음
  await p.fill('#ft [name="attr_cls"]', ''); await type('#ft [name="attr_cls"]', '운명'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('이미 있으면 안 더함', await p.$$eval('#ft .repitem', r => r.length), 2);
  // 배경: 지금 클래스(운명의 혈통)의 것만 → 「클론」 1개
  await type('#ft [name="attr_background"]', '클론');
  const bg = await box(); ok('배경은 그 클래스 것만', [bg.includes('운명의 혈통'), bg.includes('괴짜 형사')], [true, false]);
  await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('배경 칸은 배경명만', await vals('#ft [name="attr_background"]'), ['클론']);
  // 둘 중 하나: 형사 클래스는 두 액션을 띄우고 고른 쪽만
  await p.fill('#ft [name="attr_cls"]', ''); await type('#ft [name="attr_cls"]', '괴짜'); await p.keyboard.press('Enter'); await p.waitForTimeout(120);
  const pick = await box(); ok('둘 중 하나 목록', [pick.includes('딴짓'), pick.includes('괴짜의 추궁'), pick.includes('자동 습득 액션')], [true, true, true]);
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('고른 액션만 1줄', await p.$$eval('#ft .repitem [name="attr_name"]', es => es.map(e => e.value)), ['이니셜의 직감', '피의 직감', '괴짜의 추궁']);

  // ── 적과 흑: 권한 마법 (이름 【】 · 〔기동〕 · 마력 · 고발/원호 체크)
  await type('#rb [name="attr_au1_name"]', '소각'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('권한 마법', await vals('#rb .au :is(input,textarea)'), ['【소각 권한】', '？：10', '2', '2', 'V', 'V', '1대미지\n\n흑염']);
  await p.fill('#rb [name="attr_au1_name"]', ''); await type('#rb [name="attr_au1_name"]', '재단'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('고발 체크는 꺼짐', await vals('#rb .au input[type=checkbox]'), ['-', 'V']);
  await p.fill('#rb [name="attr_au1_name"]', ''); await type('#rb [name="attr_au1_name"]', '흑사');
  ok('현현 마법은 GM 전용', (await box()).includes('GM 전용'), true); await p.keyboard.press('Escape');
  // 계보를 모르면 기본 선언 〔기동〕은 비움 · LV 줄은 효과 아래
  await type('#rb [name="attr_bc3_name"]', '물질'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('기본 선언 (계보 없음)', await vals('#rb [name^="attr_bc3_"]'), ['물질 재변성', '', '', '크기 변경\nLV2: 사람 크기\nLV3: 집 한 채']);
  // 계보 → HP · 마력 · 체계 · 기본 선언 4개 중 데이터에 있는 것
  await type('#rb [name="attr_lineage"]', '추구'); await p.keyboard.press('Enter'); await p.waitForTimeout(120);
  ok('계보 값', await vals('#rb > :is([name="attr_lineage"],[name$="_init"],[name="attr_hp_restore"],[name^="attr_ms"])'), ['추구자', '7', '4', '3', '0', '흑검 1장', '흑검 2장', '흑장 3장']);
  ok('기본 선언 빈 칸에', await vals('#rb [name="attr_bc1_name"], #rb [name="attr_bc1_boot"], #rb [name="attr_bc2_name"], #rb [name="attr_bc2_boot"]'), ['현장 재구축', '흑：6', '인물 재구축', '흑：7']);
  // 계보가 있으면 그 계보에 없는 선언은 '—'
  await p.fill('#rb [name="attr_bc3_name"]', ''); await type('#rb [name="attr_bc3_name"]', '물질'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('계보에 없는 선언 = —', await vals('#rb [name="attr_bc3_boot"]'), ['—']);
  await type('#rb [name="attr_nc1_name"]', '탐정'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('상급 선언', await vals('#rb [name^="attr_nc1_"]'), ['탐정 알고리즘', '', '흑：18', '미발견 각본\nLV3: 대상 변경']);

  // ── 한국어 시노비가미(.sg): 시노비가미로 알아봄 · 공/서/장 고르기 · 개요 칸
  await type('#sg [name="attr_Ninpo_01_Name"]', '접근'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('공 고름', await p.$eval('#sg input[value="@{Tool}"]', e => e.checked), true);
  ok('효과 · 개요 따로', await vals('#sg :is([name="attr_Ninpo_01_Effect"],[name="attr_Ninpo_01_Flavor"],[name="attr_Ninpo_01_Range"])'), ['1', '접근전 대미지 1점', '일반적인 접근전 공격.']);
  // 데이터가 개요를 효과 끝 '유파 : … ———' 줄로 가진 경우: 한국어 시트는 떼어서 개요 칸에, 개요 칸 없는 시트는 효과에 그대로
  await p.fill('#sg [name="attr_Ninpo_01_Name"]', ''); await type('#sg [name="attr_Ninpo_01_Name"]', '동원'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('유파 줄 → 개요 칸', await vals('#sg :is([name="attr_Ninpo_01_Effect"],[name="attr_Ninpo_01_Flavor"])'), ['전장을 「혼잡」으로 변경한다.', '유파 : 히라사카 기관 ——— 전장을 혼란에 빠뜨린다.']);
  await type('#sgold [name="attr_Ninpo_09_Name"]', '동원'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok('개요 칸 없는 시트는 효과에 그대로', await vals('#sgold [name="attr_Ninpo_09_Effect"]'), ['전장을 「혼잡」으로 변경한다.\n유파 : 히라사카 기관 ——— 전장을 혼란에 빠뜨린다.']);

  // ── 데이터 주소: 열쇠가 있으면 본문으로 POST (새 페이지 — 주소 · 열쇠를 넣어 두고 스크립트를 띄우면 바로 받아 온다)
  const q = await b.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.route('**/ruledata.php', r => { sent.push(r.request().method() + ' ' + (r.request().postData() || '').replace(/"key":"[^"]+"/, '"key":"…"')); r.fulfill({ contentType: 'application/javascript', body: 'window.NIRE_RULEDATA = {"futari_action":[{"name":"키워드"}]};' }); });
  await q.goto('http://127.0.0.1:8766/blank.html');
  await q.evaluate(() => {
    localStorage.clear(); localStorage.setItem('r20_ruledata_url', 'http://127.0.0.1:8766/ruledata.php'); localStorage.setItem('r20_home_key', 'k-123456789012');
    const coll = arr => ({ models: arr, get: () => null, on() {}, off() {}, forEach: f => arr.forEach(f), filter: f => arr.filter(f), map: f => arr.map(f), length: arr.length });
    window.Campaign = { get: () => '[]', save() {}, on() {}, handouts: coll([]), characters: coll([]), rollabletables: coll([]), decks: coll([]), pages: coll([]) };
    window.Jukebox = { playlist: coll([]) }; window.currentPlayer = { id: 'p1', macros: coll([]) }; window.is_gm = true;
  });
  await q.addScriptTag({ content: us }); await q.waitForTimeout(500);
  ok('열쇠는 본문에 (POST)', sent, ['POST {"op":"ruledata","key":"…"}']);
  ok('받은 데이터', await q.evaluate(() => window.NIRE_RULEDATA?.futari_action?.[0]?.name), '키워드');
  console.log('errors:', errs); await b.close();
})();
