// 둘이서 수사 시트 워커 시험: node futarisousa/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/futarisousa.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 300)); };
const acts = s => [...s.attrs.keys()].filter(k => /^repeating_actions_.*_name$/.test(k)).map(k => s.get(k));
const last = s => s.rolls[s.rolls.length - 1];
(async () => {
  // ── 새 탐정 시트: 기본 액션 한 줄 · 다시 열어도 그대로
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version', String(s.get('sheet_version')), '1');
  eq('new: default action (탐정)', acts(s), ['둘이서 수사']);
  s.open(); await s.settle();
  eq('reopen: still one action', acts(s), ['둘이서 수사']);
  // 조수로 바꾸면 손대지 않은 기본 액션은 바뀐다
  s.set('sheet_type', 'asi'); await s.settle();
  eq('switch to 조수: default replaced', acts(s), ['따라잡다']);
  eq('조수 default cost', s.get([...s.attrs.keys()].find(k => /^repeating_actions_.*_cost$/.test(k))), '1');
  // 고친 액션은 그대로 둔다
  const row = [...s.attrs.keys()].find(k => /^repeating_actions_.*_name$/.test(k)).replace(/name$/, '');
  s.set(row + 'effect', '내가 고친 효과'); await s.settle();
  s.set('sheet_type', 'det'); await s.settle();
  eq('edited action kept on switch', acts(s), ['따라잡다']);

  // ── 기능 판정: 탐정 10면체 · 조수 6면체 · 개수 묻기 · 미습득
  s = makeSim(HTML); s.open(); await s.settle();
  s.set('character_name', '쿠로사와 렌'); s.set('sk_lie', '1'); await s.settle();
  s.queries['주사위 수'] = 2; s.dice.push(7, 3, 9, 2);
  s.click('rlie'); await s.settle();
  let r = last(s);
  has('skill roll: template', r.macro, '&{template:futarisousa}');
  has('skill roll: d10', r.macro, '{{d1=[[1d10]]}}');
  has('skill roll: title', r.macro, '{{title=거짓말 판정}}');
  has('skill roll: sub', r.macro, '{{sub=통찰 · 탐정 10면체}}');
  eq('skill roll: dice count asked', r.results.n.result, 2);
  eq('skill roll: computed dice', [r.computed.d1, r.computed.d2, r.computed.d3], [7, 3, 9]);
  eq('skill roll: learned → no flag', r.macro.includes('{{flag='), false);
  s.click('rweather'); await s.settle();
  has('unlearned skill flagged', last(s).macro, '{{flag=미습득}}');
  s.set('sheet_type', 'asi'); await s.settle();
  s.click('rchase'); await s.settle();
  has('조수 판정: d6', last(s).macro, '{{d1=[[1d6]]}}');
  has('조수 판정: sub', last(s).macro, '조수 6면체');

  // ── 기벽 · 감정 표 · 상태이상
  s.set('sheet_type', 'det'); s.set('quirk4', '단 것을 먹지 않으면 추리가 멈춘다'); await s.settle();
  s.dice.push(4); s.click('quirk'); await s.settle();
  eq('quirk: face + text', [last(s).computed.dice, last(s).computed.res], ['⚃', '단 것을 먹지 않으면 추리가 멈춘다']);
  s.dice.push(2); s.click('quirk'); await s.settle();
  eq('quirk: empty row', last(s).computed.res, '(비어 있음)');
  s.dice.push(5, 2); s.click('emoa'); await s.settle();
  eq('감정 표A: D66 sorted (5,2 → 25)', [last(s).computed.dice, last(s).computed.res], ['25', '별 이유 없이']);
  s.dice.push(6, 6); s.click('emoa'); await s.settle();
  eq('감정 표A: 66', last(s).computed.res, '생활 관습');
  s.dice.push(10); s.click('emob'); await s.settle();
  eq('감정 표B: 10', [last(s).computed.dice, last(s).computed.res], ['10', '자신과의 관계']);
  s.dice.push(2); s.click('status'); await s.settle();
  eq('상태이상: 2', last(s).computed.res, '탐정의 폭주');
  has('상태이상: effect', last(s).computed.eff, '[유리함]');

  // ── 【여유】 ± (0 아래로 안 내려감)
  s.click('reserveup'); await s.settle(); s.click('reserveup'); await s.settle();
  eq('여유 +2', String(s.get('reserve')), '2');
  for (let i = 0; i < 3; i++) { s.click('reservedn'); await s.settle(); }
  eq('여유 floor 0', String(s.get('reserve')), '0');

  // ── 액션 출력
  const arow = s.addRow('actions', { name: '추리 쇼', type: '보조', cost: '2', effect: '모두를 모아 추리를 펼친다.' }); await s.settle();
  s.click('use', arow); await s.settle();
  has('action: title', last(s).macro, '{{title=추리 쇼}}');
  has('action: sub', last(s).macro, '{{sub=보조 · 코스트 2}}');
  has('action: effect', last(s).macro, '{{effect=모두를 모아 추리를 펼친다.}}');

  const warn = s.log.filter(l => l[0] === 'WARN');
  eq('no simulator warnings', warn, []);
  console.log(`pass ${pass} · fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
