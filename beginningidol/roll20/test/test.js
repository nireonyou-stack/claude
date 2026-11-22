// 비기닝 아이돌 시트 워커 시험: node beginningidol/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/beginningidol.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 500)); };
const not = (name, s, sub) => { const ok = !String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— unexpected', JSON.stringify(sub), 'in', String(s).slice(0, 400)); };
const last = s => s.rolls[s.rolls.length - 1];
const g = (s, ...ks) => ks.map(k => String(s.get(k)));
const pick = (o, ...ks) => Object.fromEntries(ks.map(k => [k, o[k]]));
(async () => {
  // ── 새 캐릭터 · 금지 사항
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version', g(s, 'sheet_version'), ['1']);
  eq('new: fumble 2 special 12', g(s, 'fumble', 'special'), ['2', '12']);
  eq('new: tiara route, no mental', g(s, 'route', 'mental'), ['tiara', '']);
  eq('no placeholder', /placeholder=/.test(HTML), false);
  eq('no table tags', /<table/i.test(HTML), false);
  eq('one script element', (HTML.match(/<script/g) || []).length, 1);
  eq('no html/head/body tags', /<(html|head|body)[\s>]/i.test(HTML), false);
  eq('no underscore in act names', (HTML.match(/name="act_[^"]*_/g) || []).length, 0);

  // ── 목표치 (번호 왼쪽이지만 계산은 같음)
  s.set('C7', '1'); await s.settle();
  eq('target', g(s, 'C7_value', 'C6_value', 'B7_value', 'D7_value', 'F7_value'), ['5', '6', '7', '7', '11']);
  s.set('gap_c', '1'); await s.settle();
  eq('gap C painted (재능|캐릭터)', g(s, 'D7_value', 'E7_value'), ['6', '8']);

  // ── 판정 · 직접 적는 칸
  s = makeSim(HTML, { dice: [4, 3, 1, 6, 6, 1, 1, 1, 5, 2, 2, 1] }); s.open(); await s.settle();   // 판정마다 d1 d2 + 펌블 표 ft
  s.set('C7', '1'); await s.settle();
  s.click('rc7'); await s.settle();
  has('skill title', last(s).macro, '{{title=《미소》 판정}}');
  has('computed first', last(s).macro, '&{template:beginningidol} {{ok=[[0]]}} {{total=[[0]]}} {{fres=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{ft=[[1d6]]}}');
  eq('7 ≥ 5 success', last(s).computed, { ok: 3, total: 7 });
  s.click('rc7'); await s.settle();
  eq('12 special', last(s).computed, { ok: 1, total: 12 });
  s.click('rc7'); await s.settle();
  eq('2 fumble + fumble table 5', last(s).computed, { ok: 2, total: 2, fres: '대실패가 세상에 알려져 나쁜 쪽으로 해석되어 퍼졌다. 유닛은 변조 「논란」을 받는다.' });
  s.set('D7_name', '츤데레'); s.set('mod', '-1'); await s.settle();
  s.click('rd7'); await s.settle();
  has('free cell name', last(s).macro, '{{title=《츤데레》 판정}}');
  eq('free cell target 7 (from C7), 4-1=3 fail', last(s).computed, { ok: 4, total: 3 });
  has('mod shown', last(s).macro, '{{add=-1}}');

  // ── 크라운 노선: 카드에 cr
  s.set('route', 'crown'); await s.settle();
  s.click('link1'); await s.settle();
  has('crown flag', last(s).macro, '{{cr=1}}');
  has('link card', last(s).macro, '{{title=【아이돌 링크】 멘탈 케어}}');

  // ── 퍼포먼스: 같은 눈 제거 → 남은 눈의 합
  s = makeSim(HTML, { dice: [2, 5, 1, 5, 6, /* 미라클 */ 3, 3, 4, 4, 6, 6, /* 퍼펙트 */ 1, 2, 3, 4, 5, 6, /* 7 = 익스텐션 */ 2, 2, 3, 3, 5, 1] }); s.open(); await s.settle();
  s.set('voice', '5'); s.set('visual', '6'); s.set('physical', '7'); await s.settle();
  s.click('pvoice'); await s.settle();
  eq('voice 5: 2 5 1 5 6 → 2+1+6 = 9', pick(last(s).computed, 'pv', 'pst', 'g1', 'g2', 'g4'), { pv: 9, pst: 0, g1: 0, g2: 1, g4: 1 });
  has('perf computed first', last(s).macro, '&{template:beginningidol} {{pv=[[0]]}} {{pst=[[0]]}} {{g1=[[0]]}}');
  not('only 5 dice', last(s).macro, '{{p6=');
  eq('last left saved', g(s, 'last_left'), ['216']);
  s.click('pvisual'); await s.settle();
  eq('all removed → miracle 10', pick(last(s).computed, 'pv', 'pst'), { pv: 10, pst: 1 });
  s.click('pvisual'); await s.settle();
  eq('1~6 all left → perfect miracle 30', pick(last(s).computed, 'pv', 'pst'), { pv: 30, pst: 2 });
  s.click('pphysical'); await s.settle();
  eq('physical 7: six dice, 5+1 = 6, extension +1 → 7', pick(last(s).computed, 'pv', 'pst'), { pv: 7, pst: 0 });
  has('extension note', last(s).macro, '{{note=익스텐션 +1}}');

  // ── 심포니: 남은 눈 + 새 주사위
  s = makeSim(HTML, { dice: [2, 1, 5, 2, 3, 3], queries: { '남은 주사위 눈': '216', '굴릴 주사위 수': '2' } }); s.open(); await s.settle();
  s.set('last_left', '216'); await s.settle();
  s.click('sym'); await s.settle();
  has('symphony query default', last(s).macro, '?{남은 주사위 눈 (이어서 적기 · 익스텐션은 .숫자)|216}');
  has('symphony computed first', last(s).macro, '{{pv=[[0]]}} {{pst=[[0]]}} {{sym=[[0]]}} {{u1=[[0]]}}');
  eq('symphony 216 + 2 1 → 6', pick(last(s).computed, 'pv', 'pst', 'sym', 'u2', 'u3'), { pv: 6, pst: 0, sym: '남은 2 1 6 + 새 2 1 → 6', u2: 1, u3: 0 });

  // ── 아이돌 스킬: 지정특기 있으면 판정, 없으면 효과만
  s = makeSim(HTML, { dice: [3, 3, 1] }); s.open(); await s.settle();
  s.set('C7', '1'); s.set('sk1_name', '스마일 어택'); s.set('sk1_type', '보조'); s.set('sk1_skill', '《미소》'); s.set('sk1_effect', '판정에 +2'); await s.settle();
  s.click('sk1'); await s.settle();
  has('idol skill check', last(s).macro, '{{title=【스마일 어택】}} {{sub=보조 · 《미소》 · 목표치 5}} {{eff=판정에 +2}}');
  eq('idol skill result', last(s).computed, { ok: 3, total: 6 });
  s.set('sk2_name', '노래하는 천사'); s.set('sk2_type', '상주'); s.set('sk2_effect', '퍼포먼스 값 +3'); await s.settle();
  s.click('sk2'); await s.settle();
  not('no skill → no dice', last(s).macro, '{{d1=');

  // ── 리액션 표 · 랜덤 특기 (직접 적는 칸 포함)
  s = makeSim(HTML, { dice: [2, 4, 3, 4, 5, 1, 1] }); s.open(); await s.settle();
  s.set('re2', '“에헤헤…”'); s.set('D7_name', '츤데레'); await s.settle();
  s.click('react'); await s.settle();
  eq('reaction 2', last(s).computed, { tres: '“에헤헤…”' });
  s.click('rsk'); await s.settle();
  eq('random skill 4 / 3+4 = 캐릭터 7 (free)', last(s).computed, { tres: '캐릭터 · 《츤데레》' });
  s.click('react'); await s.settle();
  eq('empty reaction', last(s).computed, { tres: '(빈칸)' });
  eq('gm whisper roll button', /name="roll_gmw"[^>]*value="\/w gm &\{template:beginningidol\} \{\{plain=\?\{GM 에게 귓속말\}\}\}"/.test(HTML), true);

  // ── 룰북 반영: 목표치 상한 없음 · 스페셜치 최대 12 · 펌블치 최대 11 · 일예돌파 · 심포니의 익스텐션
  s = makeSim(HTML, { dice: [5, 6, 2, 3, 4, 4, 2, 1, 3] }); s.open(); await s.settle();
  s.set('A2', '1'); await s.settle();
  eq('no cap: F12 = 5 + 10 rows + 10 (5 gaps x 2)', g(s, 'F12_value'), ['25']);
  for (let i = 0; i < 3; i++) { s.click('sup'); await s.settle(); }
  for (let i = 0; i < 12; i++) { s.click('fup'); await s.settle(); }
  eq('special max 12, fumble max 11', g(s, 'special', 'fumble'), ['12', '11']);
  s.click('frs'); s.click('srs'); await s.settle();
  s.set('kosei_skill', '《미소》'); s.set('kosei_target', '10'); await s.settle();
  s.click('kosei'); await s.settle();
  has('one-art breakthrough', last(s).macro, '{{title=【일예돌파】 《미소》}} {{sub=개성 목표치 10}}');
  eq('5+6 = 11 ≥ 10', last(s).computed, { ok: 3, total: 11 });
  s.set('physical', '7'); await s.settle();
  s = makeSim(HTML, { dice: [1, 2, 3, 3, 4, 4, 2, 5, 6], queries: { '남은 주사위 눈': '12.1', '굴릴 주사위 수': '1' } }); s.open(); await s.settle();
  s.set('physical', '7'); await s.settle();
  s.click('pphysical'); await s.settle();
  eq('last left keeps extension', g(s, 'last_left'), ['12.1']);
  s.click('sym'); await s.settle();
  eq('symphony 1 2 + 2 → 1, extension +1 → 2', [last(s).computed.pv, last(s).computed.sym], [2, '남은 1 2 + 새 2 → 1 · 익스텐션 +1']);

  const errs = s.log.filter(l => l[0] === 'ERROR');
  eq('no worker errors', errs.map(e => e[1].split('\n')[0]), []);
  console.log(`${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
