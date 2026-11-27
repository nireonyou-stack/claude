// 킬데스 비즈니스 시트 워커 시험: node killdeath/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/killdeath.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 400)); };
const not = (name, s, sub) => { const ok = !String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— unexpected', JSON.stringify(sub), 'in', String(s).slice(0, 400)); };
const last = s => s.rolls[s.rolls.length - 1];
const g = (s, ...ks) => ks.map(k => String(s.get(k)));
(async () => {
  // ── 새 캐릭터 · 금지 사항
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version', g(s, 'sheet_version'), ['1']);
  eq('new: fumble 2 special 12', g(s, 'fumble', 'special'), ['2', '12']);
  eq('new: no targets', g(s, 'A2_value', 'F12_value'), ['', '']);
  eq('new: collector sheet', g(s, 'sheet_type'), ['pc']);
  eq('new: tokens 0', g(s, 'charge', 'block', 'deaths'), ['0', '0', '0']);
  eq('no placeholder', /placeholder=/.test(HTML), false);
  eq('no table tags', /<table/i.test(HTML), false);
  eq('one script element', (HTML.match(/<script/g) || []).length, 1);
  eq('no html/head/body tags', /<(html|head|body)[\s>]/i.test(HTML), false);
  eq('no underscore in act names', (HTML.match(/name="act_[^"]*_/g) || []).length, 0);

  // ── 목표치: 세로 1 · 옆 분야 2 · 칠한 공백 1 · 최대 12
  s.set('B4', '1'); await s.settle();
  eq('target learned / up-down / next field', g(s, 'B4_value', 'B3_value', 'B7_value', 'A4_value', 'C4_value', 'D4_value'), ['5', '6', '8', '7', '7', '9']);
  s.set('gap_b', '1'); await s.settle();
  eq('gap B painted (동작|소품)', g(s, 'C4_value', 'D4_value', 'A4_value'), ['6', '8', '7']);
  eq('cap 12', g(s, 'F12_value'), ['12']);

  // ── 펌블치 · 스페셜치 손 수정
  s.click('fup'); await s.settle(); s.click('fup'); await s.settle();   // 빠른 두 번 누름은 흉내에서 같은 값을 읽음 — 사이에 정리
  eq('fumble +2', g(s, 'fumble', 'fumble_adj'), ['4', '2']);
  s.click('sdn'); await s.settle();
  eq('special -1', g(s, 'special'), ['11']);
  s.click('frs'); s.click('srs'); await s.settle();
  eq('reset', g(s, 'fumble', 'special'), ['2', '12']);

  // ── 토큰: 누른 칸까지, 채워진 마지막 칸을 다시 누르면 하나 줄임 (회수인 · 표적 단추가 같은 값)
  s.click('chg2'); await s.settle();
  eq('charge 2', g(s, 'charge'), ['2']);
  s.click('chg2'); await s.settle();
  eq('charge 2 again → 1', g(s, 'charge'), ['1']);
  s.click('tchg3'); await s.settle();
  eq('target sheet charge 3', g(s, 'charge'), ['3']);
  s.click('dth6'); s.click('blk1'); await s.settle();
  eq('deaths 6, block 1', g(s, 'deaths', 'block'), ['6', '1']);

  // ── 특기 판정: 2D6 합(눈)으로 펌블 · 스페셜, 합 + 수정치로 성공 · 실패
  s = makeSim(HTML, { dice: [3, 2, 6, 6, 1, 1, 4, 4] }); s.open(); await s.settle();
  s.set('B4', '1'); await s.settle();
  s.click('rb4'); await s.settle();
  has('skill title', last(s).macro, '{{title=《동작4/베기》 판정}}');
  has('skill sub', last(s).macro, '{{sub=목표치 5}}');
  has('computed first', last(s).macro, '&{template:killdeath} {{ok=[[0]]}} {{total=[[0]]}} {{d1=[[1d6]]}}');
  eq('skill 3+2=5 ≥ 5 → success', last(s).computed, { ok: 3, total: 5 });
  s.click('rb4'); await s.settle();
  eq('12 → special', last(s).computed, { ok: 1, total: 12 });
  s.click('rb4'); await s.settle();
  eq('2 → fumble', last(s).computed, { ok: 2, total: 2 });
  s.set('mod', '-4'); await s.settle();
  s.click('rb4'); await s.settle();
  eq('8 - 4 = 4 < 5 → failure (mod counted)', last(s).computed, { ok: 4, total: 4 });
  has('mod in sub', last(s).macro, '수정치 -4');
  has('mod shown', last(s).macro, '{{add=-4}}');

  // ── 어빌리티 공격 판정: 펌블치 = 리스크 + 손 수정, 차지만큼 +
  s = makeSim(HTML, { dice: [2, 2, 3, 2, 3, 2, 5, 6] }); s.open(); await s.settle();
  s.set('B4', '1'); s.set('ab4_name', '연속 베기'); s.set('ab4_level', '2'); s.set('ab4_skill', '《베기》'); s.set('ab4_effect', '공격 판정에 성공하면 대미지.'); await s.settle();
  s.click('ab4'); await s.settle();
  eq('risk 4: 2+2=4 → fumble', last(s).computed, { ok: 2, total: 4 });
  has('attack sub', last(s).macro, '{{sub=리스크 4 · 레벨 2 · 《동작4/베기》 · 목표치 5 · 펌블치 4}}');
  has('attack eff', last(s).macro, '{{eff=공격 판정에 성공하면 대미지.}}');
  s.click('chg1'); await s.settle();
  s.click('ab4'); await s.settle();
  eq('risk 4: 3+2=5 > 4, +1 charge = 6 → success', last(s).computed, { ok: 3, total: 6 });
  has('charge in sub', last(s).macro, '차지 +1');
  s.click('fdn'); await s.settle();
  s.click('ab4'); await s.settle();
  eq('fumble adj -1 → risk fumble 3: 3+2=5 ok', last(s).computed, { ok: 3, total: 6 });
  has('adjusted fumble shown', last(s).macro, '펌블치 3');
  s.set('ab7_name', '헬 피니시'); s.set('ab7_skill', '베기'); await s.settle();
  s.click('ab7'); await s.settle();
  not('killer trick has no level', last(s).macro, '레벨');
  has('killer trick risk 7 fumble 6 (adj -1)', last(s).macro, '리스크 7');

  // ── 출력 카드
  s.set('rel1_name', '미즈키'); s.set('rel1_attr', '라이벌'); s.set('rel1_depth', '2'); await s.settle();
  s.click('rel1'); await s.settle();
  has('relation', last(s).macro, '{{title=【관계】 미즈키}} {{sub=속성 라이벌 · 심도 2}} {{eff=판정에 ±2}}');
  s.set('cy1_name', '헬 아이'); s.set('cy1_effect', '주사위 하나를 다시 굴린다.'); await s.settle();
  s.click('cy1'); await s.settle();
  has('hell cyber', last(s).macro, '{{title=【헬 사이버】 헬 아이}} {{eff=주사위 하나를 다시 굴린다.}}');
  s.set('sub_name', '마지막 무대'); s.set('sub_clear', '사이클 종료 시\n【시청률】이 60% 이상'); s.set('sub_reward', '200【소울】'); await s.settle();
  s.click('sub'); await s.settle();
  has('subplot kv', last(s).macro, '{{k1=클리어 조건}} {{v1=사이클 종료 시%NEWLINE%【시청률】이 60% 이상}} {{k2=보수}} {{v2=200【소울】}}');

  // ── 랜덤 특기 · nD6 · 공개
  s = makeSim(HTML, { dice: [5, 3, 4, 2, 5, 6] }); s.open(); await s.settle();
  s.click('rsk'); await s.settle();
  eq('random skill 5 / 3+4 = row 7', last(s).computed, { tres: '《정동7/분노》' });
  s.click('nd3'); await s.settle();
  eq('3D6 total', last(s).computed, { total: 13 });
  s.set('roll_display_to', '/w gm '); await s.settle();
  s.click('rsk'); await s.settle();
  has('whisper to gm', last(s).macro, '/w gm &{template:killdeath}');
  eq('gm whisper roll button', /name="roll_gmw"[^>]*value="\/w gm &\{template:killdeath\} \{\{plain=\?\{GM 에게 귓속말\}\}\}"/.test(HTML), true);

  // ── 매크로를 깨는 글자
  s.set('cy2_name', 'a{{b}}@{x}[[1]]'); await s.settle();
  s.click('cy2'); await s.settle();
  not('escaped braces', last(s).macro.replace(/\{\{(title|eff)=/g, ''), '{{b');

  const errAll = s.log.filter(l => l[0] === 'ERROR');
  const pick = (o, ...ks) => Object.fromEntries(ks.map(k => [k, o[k]]));

  // ── 룰북 4·08·04: 첫 공격 (리스크 1 · 2) 은 특기 없이 목표치 5, 반격은 지정특기 · 성공/실패 안내 · 회수인 시청률
  s = makeSim(HTML, { dice: [3, 2, 3, 2, 6, 6, 1, 1], queries: { '공격': '1' } }); s.open(); await s.settle();
  s.set('A2', '1'); s.set('ab2_name', '잽'); s.set('ab2_skill', '베기'); await s.settle();
  s.click('ab2'); await s.settle();
  has('first-attack query', last(s).macro, '{{ok=[[0]]}} {{total=[[0]]}} {{tgx=[[0]]}} {{fa=[[?{공격|첫 공격 (특기 없이 목표치 5),1|반격 (지정특기),0}]]}}');
  not('no target in sub for risk 1-2', last(s).macro, '목표치 9');
  eq('first attack target 5: 3+2 = 5 success', pick(last(s).computed, 'ok', 'total', 'tgx'), { ok: 3, total: 5, tgx: '첫 공격 · 목표치 5' });
  has('counter guidance', last(s).macro, '{{asu=상대는 리스크 3 · 4 어빌리티로 반격해야 한다}} {{afa=공격한 쪽이 대미지 — 회수인은 사망}} {{vr=1}}');
  s = makeSim(HTML, { dice: [3, 2], queries: { '공격': '0' } }); s.open(); await s.settle();
  s.set('A2', '1'); s.set('ab2_name', '잽'); s.set('ab2_skill', '베기'); await s.settle();
  s.click('ab2'); await s.settle();
  eq('counter uses the skill target (A2 → 베기 B4 = 9)', pick(last(s).computed, 'ok', 'tgx'), { ok: 4, tgx: '반격 · 목표치 9' });
  s.set('ab5_name', '돌진'); s.set('ab6_name', '난무'); s.set('ab7_name', '피니시'); await s.settle();
  s.click('ab5'); await s.settle();
  has('risk 5 counter → 6 · 7', last(s).macro, '{{asu=상대는 리스크 6 · 7(킬러 트릭) 어빌리티로 반격해야 한다}}');
  not('risk 5 has no first-attack query', last(s).macro, '{{fa=');
  s.click('ab6'); await s.settle();
  has('risk 6 → killer trick only', last(s).macro, '{{asu=상대는 킬러 트릭(리스크 7)로 반격해야 한다}}');
  s.click('ab7'); await s.settle();
  has('killer trick success', last(s).macro, '{{asu=킬러 트릭 성공 — 상대가 대미지 (라이프가 있는 NPC 는 라이프 0) · 시청률 +10%}}');
  s.set('sheet_type', 'tg'); await s.settle();
  s.click('ab6'); await s.settle();
  has('target sheet: life note, no rating', last(s).macro, '{{afa=공격한 쪽이 대미지 (라이프 −1 · 표적전이면 한 번 다시 굴림)}}');
  not('target sheet: no vr', last(s).macro, '{{vr=1}}');
  // 회수인 시청률은 도장 밑 작은 글씨
  eq('rating captions in template', [HTML.includes('{{#vr}}<span class="sheet-cap">시청률+10%</span>{{/vr}}'), HTML.includes('{{#vr}}<span class="sheet-cap">시청률−20%</span>{{/vr}}')], [true, true]);
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  // ── 사망 처리 (4·08·07 · 4·09): 소울 방출 · 소생 비용 · 헬 슬러그 · 7번째
  s = makeSim(HTML, { dice: [5, 2, 1], queries: { '누구에게': '1' } }); s.open(); await s.settle();
  s.set('soul', '250'); s.set('hell_slug', '30'); s.set('deaths', '1'); await s.settle();
  s.click('die'); await s.settle();
  has('death computed first', last(s).macro, '{{drel=[[0]]}} {{dres=[[0]]}} {{kb=[[?{누구에게 살해됐나|');
  eq('killed by collector: release 300 → 250, 2nd death cost 100', [last(s).computed.drel, last(s).computed.dres, ...g(s, 'soul', 'hell_slug', 'deaths')],
    ['소울 방출 300 → 실제 250 (신에 남아 살아남은 회수인이 나눔)', '2번째 사망 · 소생 비용 100 · 소울 250 → -100 · 헬 슬러그 +100', '-100', '130', '2']);
  s = makeSim(HTML, { dice: [1, 1], queries: { '누구에게': '0' } }); s.open(); await s.settle();
  s.set('soul', '500'); s.set('deaths', '6'); await s.settle();
  s.click('die'); await s.settle();
  eq('7th death', [last(s).computed.dres, ...g(s, 'soul', 'deaths')], ['7번째 사망 — 결과 페이즈까지 부활할 수 없고, 소울은 마이너스 무한대', '500', '6']);
  s.set('deaths', '0'); await s.settle(); s.click('die'); await s.settle();
  eq('killed by NPC: no release, 1st death 50', [last(s).computed.drel, ...g(s, 'soul', 'hell_slug')], ['소울 방출 100 → 실제 0 (신에 남아 살아남은 회수인이 나눔)', '450', '50']);
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  // ── 행동순 D66 + 행동순 강화 · 신 표 · 서비스 신 표
  s = makeSim(HTML, { dice: [5, 3, 1, 2, 6, 6, 4, 5] }); s.open(); await s.settle();
  s.set('cy3_name', '스피드 칩'); s.set('cy3_effect', '행동순 강화 +20'); await s.settle();
  s.click('init'); await s.settle();
  eq('D66 small first + 20', last(s).computed, { tres: '35 + 행동순 강화 20 = 55' });
  s.click('scene'); await s.settle();
  eq('scene 12 / 66', last(s).computed, { tres: '당신의 사진으로 벽이 뒤덮인 들판' });
  s.click('svc'); await s.settle();
  eq('service 4 → 5', last(s).computed, { tres: '연애계 · 비밀을 고백하다' });
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  const errs = errAll;
  eq('no worker errors', errs.map(e => e[1].split('\n')[0]), []);
  console.log(`${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
