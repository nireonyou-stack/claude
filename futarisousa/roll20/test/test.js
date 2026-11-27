// 둘이서 수사 시트 워커 시험: node futarisousa/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/futarisousa.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 300)); };
const acts = s => [...s.attrs.keys()].filter(k => /^repeating_acts_.*_name$/.test(k)).map(k => s.get(k));
const last = s => s.rolls[s.rolls.length - 1];
(async () => {
  // ── 새 탐정 시트: role · 미리 채운 액션 없음 · 종류 바꾸면 role 따라감
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version', String(s.get('sheet_version')), '1');
  eq('new: role 탐정', s.get('role'), '탐정');
  eq('new: no prefilled action rows', acts(s), []);
  s.set('sheet_type', 'asi'); await s.settle();
  eq('switch to 조수: role', s.get('role'), '조수');
  s.set('sheet_type', 'case'); await s.settle();
  eq('사건: role 비움', s.get('role'), '');
  eq('사건: 고백 효과는 입력칸이 아님', HTML.includes('name="attr_confess"'), false);
  eq('placeholder 없음', /placeholder=/.test(HTML), false);

  // ── 기능 판정: 보통 2 · 유리함 3 · 불리함 1 → 성공 · 실패 · 스페셜 · 펌블
  s = makeSim(HTML); s.open(); await s.settle();
  s.set('character_name', '쿠로사와 렌'); s.set('skill_1_1', '1'); await s.settle();
  const roll = async (btn, n, dice) => { s.queries['판정'] = n; s.dice.push(...dice); s.click(btn); await s.settle(); return last(s); };
  let r = await roll('sk11', 2, [7, 3, 9]);
  has('skill: template', r.macro, '&{template:futarisousa}');
  has('skill: d10', r.macro, '{{d1=[[1d10]]}}');
  has('skill: title', r.macro, '{{title=거짓말 판정}}');
  has('skill: sub', r.macro, '{{sub=통찰 · 탐정 10면체}}');
  eq('skill: 보통 2 → 7·3 성공', [r.computed.ok, r.computed.res, r.computed.mode], [1, '성공', '보통 2D10']);
  eq('skill: learned → no flag', r.macro.includes('{{flag='), false);
  eq('skill: computed fields first', r.macro.indexOf('{{ok=') < r.macro.indexOf('{{title='), true);
  r = await roll('sk11', 3, [2, 6, 1]);
  eq('유리함 3 → 6 → 스페셜', [r.computed.ok, r.computed.res, r.computed.mode, r.computed.note, r.computed.hn], [3, '스페셜', '유리함 3D10', '', 0]);
  // 스페셜 · 펌블 효과는 도장 밑 작은 글씨
  has('special / fumble captions', HTML, '<span class="sheet-cap">여유+1</span>');
  has('fumble captions', HTML, '<span class="sheet-cap">마음고생+1</span><span class="sheet-cap">상태이상</span>');
  r = await roll('sk11', 1, [3, 9, 9]);
  eq('불리함 1 → 3 실패 (뒤 눈은 안 셈)', [r.computed.ok, r.computed.res, r.computed.hn], [2, '실패', 0]);
  r = await roll('sk11', 2, [1, 1, 8]);
  eq('모두 1 → 펌블', [r.computed.ok, r.computed.res, r.computed.note], [4, '펌블', '']);
  r = await roll('sk16', 2, [5, 2, 2]);
  has('미습득 표시', r.macro, '{{flag=미습득}}');
  s.set('sheet_type', 'asi'); await s.settle();
  r = await roll('sk46', 2, [4, 2, 2]);
  has('조수 판정: d6', r.macro, '{{d1=[[1d6]]}}');
  has('조수 판정: sub', r.macro, '{{title=추적 판정}}');
  eq('조수 4 이상 → 탐정 감정 안내', [r.computed.ok, r.computed.note], [1, '탐정이 조수에 대한 감정 1 · 【여유】+1']);

  // ── 기벽 · 감정 표 · 상태이상
  s.set('sheet_type', 'det'); s.set('quirk_4', '단 것을 먹지 않으면 추리가 멈춘다'); await s.settle();
  s.dice.push(4); s.click('quirk'); await s.settle();
  eq('기벽: 눈 + 글', [last(s).computed.dice, last(s).computed.res], ['⚃', '단 것을 먹지 않으면 추리가 멈춘다']);
  s.dice.push(2); s.click('quirk'); await s.settle();
  eq('기벽: 빈 줄', last(s).computed.res, '(비어 있음)');
  s.dice.push(5, 2); s.click('emoa'); await s.settle();
  eq('감정 표A: D66 (5,2 → 25)', [last(s).computed.dice, last(s).computed.res], ['25', '별 이유 없이']);
  eq('감정 표A: 효과 칸 없음', last(s).macro.includes('{{eff='), false);
  s.dice.push(10); s.click('emob'); await s.settle();
  eq('감정 표B: 10', [last(s).computed.dice, last(s).computed.res], ['10', '자신과의 관계']);
  s.dice.push(2); s.click('cond'); await s.settle();
  eq('상태이상: 2', last(s).computed.res, '탐정의 폭주');
  has('상태이상: 효과', last(s).computed.eff, '[유리함]');

  // ── 【여유】 ± (0 아래로 안 내려감)
  s.click('calmup'); await s.settle(); s.click('calmup'); await s.settle();
  eq('여유 +2', String(s.get('calm')), '2');
  for (let i = 0; i < 3; i++) { s.click('calmdn'); await s.settle(); }
  eq('여유 바닥 0', String(s.get('calm')), '0');

  // ── 액션 · 규격 외 · 카드 공개
  const arow = s.addRow('acts', { name: '추리 쇼', type: '보조', cost: '2', eff: '모두를 모아 추리를 펼친다.' }); await s.settle();
  s.click('use', arow); await s.settle();
  has('action: title', last(s).macro, '{{title=추리 쇼}}');
  has('action: sub', last(s).macro, '{{sub=보조 · 코스트 2}}');
  has('action: effect', last(s).macro, '{{effect=모두를 모아 추리를 펼친다.}}');
  const xrow = s.addRow('exasi', { name: '비장의 한 수', type: '보조', cost: '3', eff: '규격 외.' }); await s.settle();
  s.click('use', xrow); await s.settle();
  has('규격 외 (조수): sub', last(s).macro, '{{sub=조수 규격 외 · 보조 · 코스트 3}}');
  const krow = s.addRow('knew', { no: '2', text: '피해자는 열쇠를 맡겼다.' }); await s.settle();
  s.click('reveal', krow); await s.settle();
  has('알고 있었어 카드: 제목', last(s).macro, '{{title=알고 있었어 카드 2}}');
  has('알고 있었어 카드: 꼬리', last(s).macro, '{{sub=You knew.}}');
  const prow = s.addRow('pcards', { no: '1', text: '예고장' }); await s.settle();
  s.click('reveal', prow); await s.settle();
  has('괴도 카드: 꼬리', last(s).macro, "{{sub=Phantom thief's act.}}");

  // ── 감정 한 줄 채팅
  s.set('partner', '쿠로사와 렌'); await s.settle();
  const erow = s.addRow('plike', { text: '얼굴' }); await s.settle();
  s.click('send', erow); await s.settle();
  has('감정: 제목', last(s).macro, '{{title=마음에 드는 점}}');
  has('감정: 파트너', last(s).macro, '{{sub=파트너 · 쿠로사와 렌}}');
  has('감정: 내용', last(s).macro, '{{effect=얼굴}}');
  const n0 = s.rolls.length, jrow = s.addRow('jtdislike', { text: '' }); await s.settle();
  s.click('send', jrow); await s.settle();
  eq('감정: 빈 줄은 안 보냄', s.rolls.length, n0);
  s.set(jrow + '_text', '잔소리'); await s.settle(); s.click('send', jrow); await s.settle();
  has('감정: 사건 조사 시트 부제', last(s).macro, '{{sub=조수가 탐정에 대해}}');
  s.set('sheet_type', 'det'); await s.settle();

  // ── 사전 조사 시트: 체크한 항목만 (그 사람 질문으로)
  s.set('pre_q1', '단 것만 있으면 무엇이든 풀어내는 명탐정'); s.set('pre_c1', '1'); s.set('pre_q4', '아침에 깨워 주기'); s.set('pre_c4', '1'); s.set('pre_c5', '1'); await s.settle();
  s.click('preuse'); await s.settle();
  has('사전 조사: 제목', last(s).macro, '{{title=사전 조사 시트 · 탐정}}');
  has('사전 조사: 1번', last(s).macro, '{{k1=어떤 탐정인가요?}} {{v1=단 것만 있으면 무엇이든 풀어내는 명탐정}}');
  has('사전 조사: 4번', last(s).macro, '{{k2=파트너가 해주기를 바라는 대우}}');
  eq('사전 조사: 탐정에게 없는 5번은 빠짐', last(s).macro.includes('{{k3='), false);

  const warn = s.log.filter(l => l[0] === 'WARN');
  eq('no simulator warnings', warn, []);
  console.log(`pass ${pass} · fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
