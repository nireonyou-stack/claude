// 사무라이 블레이드 시트 워커 시험: node samuraiblade/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/samuraiblade.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 500)); };
const not = (name, s, sub) => { const ok = !String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— unexpected', JSON.stringify(sub), 'in', String(s).slice(0, 400)); };
const last = s => s.rolls[s.rolls.length - 1];
const g = (s, ...ks) => ks.map(k => String(s.get(k)));
(async () => {
  // ── 새 캐릭터 · 금지 사항
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version', g(s, 'sheet_version'), ['1']);
  eq('new: fumble 2 special 12, dif 0', g(s, 'fumble', 'special', 'dif'), ['2', '12', '0']);
  eq('new: no targets', g(s, 'A2_value', 'F12_value'), ['', '']);
  eq('no placeholder', /placeholder=/.test(HTML), false);
  eq('no table tags', /<table/i.test(HTML), false);
  eq('one script element', (HTML.match(/<script/g) || []).length, 1);
  eq('no html/head/body tags', /<(html|head|body)[\s>]/i.test(HTML), false);
  eq('no underscore in act names', (HTML.match(/name="act_[^"]*_/g) || []).length, 0);
  eq('effect mirror span (auto height)', /<span class="mir" name="attr_ab2_effect"><\/span><textarea name="attr_ab2_effect"/.test(HTML), true);

  // ── 기본 목표치: 세로 1 · 옆 분야 2 · 최대 12 (공백 없음)
  s.set('D6', '1'); await s.settle();
  eq('target from 도검', g(s, 'D6_value', 'D5_value', 'C6_value', 'E6_value', 'A6_value', 'D12_value'), ['5', '6', '7', '7', '11', '11']);
  eq('cap 12', g(s, 'A12_value'), ['12']);

  // ── 생명력 총합
  s.set('hp_base', '12'); s.set('hp_equip', '2'); await s.settle();
  eq('hp total', g(s, 'hp_max'), ['14']);

  // ── 판정: 난이도 · 부스트 · 각성 · 주박 · 고양
  s = makeSim(HTML, { dice: [5, 4, 3, 1, 1, 6, 6, 2, 3, 3, 3, 3, 4, 4, 4] }); s.open(); await s.settle();
  s.set('D6', '1'); s.set('dif', '5'); s.set('boost', '1'); await s.settle();
  s.click('rd6'); await s.settle();
  has('skill title', last(s).macro, '{{title=《도검》 판정}}');
  has('computed first, 3 dice', last(s).macro, '&{template:samuraiblade} {{ok=[[0]]}} {{total=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{d3=[[1d6]]}}');
  not('no 4th die', last(s).macro, '{{d4=');
  has('sub', last(s).macro, '{{sub=신체 · 중급 +5 · 목표치 10 · 부스트 +1}}');
  eq('5+4+3 = 12 ≥ 10 success', last(s).computed, { ok: 3, total: 12 });
  s.set('boost', ''); s.set('dif', '0'); await s.settle();
  s.click('rd6'); await s.settle();
  eq('1+1 fumble', last(s).computed, { ok: 2, total: 2 });
  s.click('rd6'); await s.settle();
  eq('6+6 special', last(s).computed, { ok: 1, total: 12 });
  s.set('awakened', '1'); s.set('bs2', '1'); await s.settle();
  s.click('rd6'); await s.settle();
  has('awakened = 3 dice', last(s).macro, '{{d3=[[1d6]]}}');
  has('curse raises difficulty', last(s).macro, '중급 +5 · 목표치 10 · 부스트 +1');
  has('notes', last(s).macro, '{{note=BS 주박 · 난이도 한 단계 위 / 각성 · 부스트 +1}}');
  eq('2+3+3 = 8 < 10 fail', last(s).computed, { ok: 4, total: 8 });

  // ── 어빌리티: 기능 칸의 특기 · 공격이면 GS 고양
  s = makeSim(HTML, { dice: [3, 4, 5, 2, 2] }); s.open(); await s.settle();
  s.set('D6', '1'); s.set('gs1', '1'); s.set('ab2_name', '벚꽃 베기'); s.set('ab2_timing', '이동공격'); s.set('ab2_skill', '《도검》'); s.set('ab2_effect', '대미지 +2'); await s.settle();
  s.click('ab2'); await s.settle();
  has('ability card', last(s).macro, '{{title=【벚꽃 베기】}}');
  has('ability sub', last(s).macro, '{{sub=이동공격 · 《도검》 · 신체 · 하급 · 목표치 5 · 부스트 +1}}');
  has('GS 고양 note', last(s).macro, '{{note=GS 고양 · 부스트 +1}}');
  eq('3+4+5 success', last(s).computed, { ok: 3, total: 12 });
  s.set('ab3_name', '결계'); s.set('ab3_timing', '선언'); s.set('ab3_skill', '없음'); s.set('ab3_effect', '방어'); await s.settle();
  s.click('ab3'); await s.settle();
  not('no skill → no dice', last(s).macro, '{{d1=');
  has('info card', last(s).macro, '{{title=【결계】}} {{sub=타이밍 선언}} {{eff=방어}}');
  s.set('mr_skill', '도검'); s.set('mr_dmg', '3'); await s.settle();
  s.click('mr'); await s.settle();
  has('blade card', last(s).macro, '{{eff=이동공격 3점 / 전력공격에는 +1점}}');
  s.click('pab1'); await s.settle();
  has('printed ability', last(s).macro, '{{title=【무령각성】}} {{sub=조건 혼백사 · 타이밍 선언 · 대상 자신 · 회수 세션}}');

  // ── 아이템: 개수 칸 · 사용
  s.click('it4c2'); await s.settle();
  eq('item 4 count 2', g(s, 'it4_n'), ['2']);
  s.click('it4'); await s.settle();
  eq('used → 1', g(s, 'it4_n'), ['1']);
  has('item card', last(s).macro, '{{title=【아이템】 약품 사용}} {{sub=남은 개수 2 → 1}}');
  s.click('it1'); await s.settle();
  has('item none left', last(s).macro, '{{note=남은 개수 0}}');

  // ── 굴림표 · nD6 · GM 귓속말
  s = makeSim(HTML, { dice: [3, 4, 2, 1, 5] }); s.open(); await s.settle();
  s.click('t1'); await s.settle();
  has('scene table 2D6', last(s).macro, '{{te1=[[1d6]]}} {{te2=[[1d6]]}}');
  eq('scene 7', last(s).computed.tres.slice(0, 9), '밝은 햇살에 감싸');
  s.click('t4'); await s.settle();
  not('emotion table 1D6', last(s).macro, '{{te2=');
  eq('emotion 2', last(s).computed, { tres: '우정(+감정) / 분노(−감정)' });
  s.click('nd2'); await s.settle();
  eq('2D6', last(s).computed, { total: 6 });
  eq('gm whisper roll button', /name="roll_gmw"[^>]*value="\/w gm &\{template:samuraiblade\} \{\{plain=\?\{GM 에게 귓속말\}\}\}"/.test(HTML), true);

  const errs = s.log.filter(l => l[0] === 'ERROR');
  eq('no worker errors', errs.map(e => e[1].split('\n')[0]), []);
  console.log(`${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
