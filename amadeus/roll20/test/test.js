// 아마데우스 시트 워커 시험: node amadeus/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/amadeus.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 300)); };
const last = s => s.rolls[s.rolls.length - 1];
(async () => {
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version', String(s.get('sheet_version')), '1');
  eq('placeholder 없음', /placeholder=/.test(HTML), false);

  // ── 평가 · 다이스 · 수정 · 생명력 기본(무용 · 영력 계수) · 최대치 = 기본 + 활력
  s.set('war_rank', 'A'); s.set('war_mode', '1'); await s.settle();
  eq('무용 A+', [s.get('war_grade'), s.get('war_dice'), s.get('war_mod')], ['A+', '3개', '+1']);
  eq('영력 없으면 생명력 기본 안 채움', s.get('hp_base'), '');
  s.set('spi_rank', 'C'); s.set('spi_mode', '0'); await s.settle();
  eq('생명력 기본 = 7+1 + 3+0', String(s.get('hp_base')), '11');
  eq('최대치 = 기본', String(s.get('hp_max')), '11');
  s.set('bra_rank', 'D'); s.set('bra_mode', '-2'); await s.settle();
  eq('두뇌 D−−', [s.get('bra_grade'), s.get('bra_dice'), s.get('bra_low'), s.get('bra_mod')], ['D−−', '2개', '낮은 눈', '−2']);
  eq('두뇌는 생명력에 안 들어감', String(s.get('hp_base')), '11');
  s.set('hp_base', '9'); await s.settle();
  eq('기본은 손으로 고칠 수 있음', String(s.get('hp_max')), '9');
  s.set('spi_mode', '2'); await s.settle();
  eq('영력이 바뀌면 다시 계산', String(s.get('hp_base')), '14');

  // ── 활력: 레벨D6 → 활력 · 최대치
  s.set('level', '2'); s.set('character_name', '아스카모리 아오이'); await s.settle();
  s.dice.push(3, 5); s.click('vigor'); await s.settle();
  has('활력: 레벨D6', last(s).macro, '{{roll=[[2d6]]}}');
  eq('활력 칸', String(s.get('vigor')), '8');
  eq('최대치 = 기본 + 활력', String(s.get('hp_max')), '22');
  eq('활력 카드', last(s).computed.res, '생명력 최대치 14 → 22');

  // ── 현재치 −/+ (0 ~ 최대치)
  s.set('hp', '21'); await s.settle();
  s.click('hpup'); await s.settle(); s.click('hpup'); await s.settle();
  eq('현재치 최대치에서 멈춤', String(s.get('hp')), '22');
  s.set('hp', '0'); await s.settle(); s.click('hpdn'); await s.settle();
  eq('현재치 0 아래로 안 감', String(s.get('hp')), '0');

  // ── 행위판정: 무용 A+ (3D6) · 목표치 4 · 기타 수정 0
  const chk = async (btn, dice, q = {}) => { Object.assign(s.queries, { 목표치: 4, '기타 수정': 0 }, q); s.dice.push(...dice); s.click(btn); await s.settle(); return last(s); };
  let r = await chk('war', [2, 5, 1, 4]);
  has('판정: 템플릿', r.macro, '&{template:amadeus}');
  has('판정: 제목', r.macro, '{{title=무용 판정}}');
  has('판정: 부제', r.macro, '{{sub=A+ · 3D6}}');
  eq('판정: computed 칸이 앞', r.macro.indexOf('{{ok=') < r.macro.indexOf('{{title='), true);
  eq('A+ 2·5·1 → 액션 5 +1 = 6 성공 · 무드 있음', [r.computed.ok, r.computed.res, r.computed.sum, r.computed.a, r.computed.m], [1, '성공', 6, 2, 1]);
  eq('보이는 다른 다이스', [r.computed.x1, r.computed.x2, r.computed.x3, r.computed.x4], [1, 0, 1, 0]);
  eq('달성치 계산 글', r.computed.calc, '액션 다이스 5 수정 +1');
  r = await chk('war', [6, 2, 3, 1]);
  eq('액션 6 → 스페셜', [r.computed.ok, r.computed.res], [3, '스페셜']);
  r = await chk('war', [1, 1, 1, 6]);
  eq('모두 1 → 펌블 (뒤 눈은 안 셈)', [r.computed.ok, r.computed.res, r.computed.sum], [4, '펌블', 2]);
  r = await chk('war', [3, 2, 2, 6], { 목표치: 5, '기타 수정': 1 });
  eq('3+1+1 = 5 ≥ 5 성공', [r.computed.ok, r.computed.sum, r.computed.tgt, r.computed.calc], [1, 5, 5, '액션 다이스 3 수정 +1 기타 +1']);
  r = await chk('war', [3, 2, 2, 6], { 목표치: 6 });
  eq('4 < 6 실패', [r.computed.ok, r.computed.res], [2, '실패']);
  // 랭크D: 2개 굴려 낮은 눈 · 인과 없음
  r = await chk('bra', [5, 3, 6, 6]);
  has('랭크D 부제', r.macro, '{{sub=D−− · 2D6 낮은 눈}}');
  eq('D 5·3 → 액션 3 −2 = 1 실패 · 무드 없음', [r.computed.ok, r.computed.sum, r.computed.a, r.computed.m, r.computed.x1, r.computed.x3], [2, 1, 2, 0, 1, 0]);
  eq('랭크D 안내', r.computed.note, '랭크D — 인과 없음');
  r = await chk('bra', [6, 6, 1, 1]);
  eq('D 6·6 → 스페셜', r.computed.ok, 3);
  // 랭크C: 1개 · 인과 없음
  r = await chk('spi', [4, 1, 1, 1]);
  eq('C++ 4 → 4+2 = 6 성공 · 다이스 1개 인과 없음', [r.computed.ok, r.computed.sum, r.computed.m, r.computed.note], [1, 6, 0, '다이스 1개 — 인과 없음']);
  // 평가 없음
  s.click('tec'); await s.settle();
  has('평가 없으면 안내', last(s).macro, '{{effect=【기술】 평가를 먼저 고르세요}}');
  // 상태이상 안내
  s.set('st_rage', '1'); s.set('st_corrupt', '1'); await s.settle();
  r = await chk('war', [4, 4, 4, 4]);
  has('분노 안내', r.macro, '{{st1=분노: 가장 낮은 눈을 무드 다이스로}}');
  has('타락 안내', r.macro, '{{st2=타락: 무드 다이스를 고르려면 【생명력】 1점 감소}}');

  // ── 부모신의 축복 · 기프트 · 아이템 · 식료
  s.click('blessing'); await s.settle();
  has('축복: 제목', last(s).macro, '{{title=부모신의 축복}}');
  has('축복: 부제', last(s).macro, '{{sub=보조 · 조건 ※}}');
  has('축복: 인쇄 글', last(s).macro, '[자신의 속성과 같은 영역의 각성단계×2]');
  const g = s.addRow('gifts', { name: '번개', cat: '보조', cond: '적적', check: '무용', tag: '공격', eff: '데미지 +2', seal: '1' }); await s.settle();
  s.click('use', g); await s.settle();
  has('기프트: 부제', last(s).macro, '{{sub=보조 · 조건 적적}}');
  has('기프트: 판정 · 태그', last(s).macro, '{{k1=판정}} {{v1=무용}} {{k2=태그}} {{v2=공격}}');
  has('기프트: 봉인', last(s).macro, '{{flag=봉인}}');
  const it = s.addRow('items', { name: '번개창', kind: 'p', power: '3', spec: '대공' }); await s.settle();
  s.click('use', it); await s.settle();
  has('아이템: 부제', last(s).macro, '{{sub=상비품 · 위력 3}}');
  s.set('food', '2'); s.set('hp', '21'); await s.settle();
  s.click('eat'); await s.settle();
  eq('식료 −1 · 생명력 +1', [String(s.get('food')), String(s.get('hp'))], ['1', '22']);
  has('식료 카드', last(s).macro, '【생명력】 21 → 22');
  s.click('eat'); await s.settle();
  eq('최대치 넘지 않음', [String(s.get('food')), String(s.get('hp'))], ['0', '22']);
  const n0 = s.rolls.length; s.click('eat'); await s.settle();
  eq('식료 0 이면 아무 일 없음', s.rolls.length, n0);

  eq('no simulator warnings', s.log.filter(l => l[0] === 'WARN' || l[0] === 'ERROR'), []);
  console.log(`pass ${pass} · fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
