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
  eq('new: dif 0', g(s, 'dif'), ['0']);
  eq('no fumble/special thresholds (rule: count of 6s / 1s)', /attr_fumble|attr_special/.test(HTML), false);
  eq('new: no targets', g(s, 'A2_value', 'F12_value'), ['', '']);
  eq('no placeholder', /placeholder=/.test(HTML), false);
  eq('no table tags', /<table/i.test(HTML), false);
  eq('one script element', (HTML.match(/<script/g) || []).length, 1);
  eq('no html/head/body tags', /<(html|head|body)[\s>]/i.test(HTML), false);
  eq('no underscore in act names', (HTML.match(/name="act_[^"]*_/g) || []).length, 0);
  eq('effect mirror span (auto height)', /<span class="mir" name="attr_ab2_effect"><\/span><textarea name="attr_ab2_effect"/.test(HTML), true);

  // ── 기본 목표치 (150쪽): 세로 1 · 옆 분야는 분야 1 + 공백 1 · 칠한 공백은 없음 · 상한 없음
  s.set('D6', '1'); await s.settle();
  eq('target from 도검', g(s, 'D6_value', 'D5_value', 'C6_value', 'E6_value', 'A6_value', 'D12_value'), ['5', '6', '7', '7', '11', '11']);
  eq('no cap', g(s, 'A12_value'), ['17']);
  s.set('gap_c', '1'); await s.settle();
  eq('painted gap C (이지|신체) counts 0', g(s, 'C6_value', 'B6_value', 'E6_value'), ['6', '8', '7']);
  eq('gap columns', (HTML.match(/name="attr_gap_[a-e]"/g) || []).length, 60);

  // ── 생명력 총합
  s.set('hp_base', '12'); s.set('hp_equip', '2'); await s.settle();
  eq('hp total', g(s, 'hp_max'), ['14']);
  s.set('level', '7'); await s.settle();
  eq('level → life base (p.113)', g(s, 'hp_base', 'hp_max'), ['7', '9']);
  eq('equipment effect fields', (HTML.match(/name="attr_eq\d_effect"/g) || []).length, 5);

  // ── 판정: 난이도 · 부스트 · 각성 · 주박 · 고양
  s = makeSim(HTML, { dice: [5, 4, 3, 1, /* ft */ 1, 1, 4, 6, 6, 2, 2, 3, 3, 1] }); s.open(); await s.settle();
  s.set('D6', '1'); s.set('dif', '5'); s.set('boost', '1'); await s.settle();
  s.click('rd6'); await s.settle();
  has('skill title', last(s).macro, '{{title=《신체6/도검》 판정}}');
  has('computed first, 3 dice', last(s).macro, '&{template:samuraiblade} {{ok=[[0]]}} {{total=[[0]]}} {{fres=[[0]]}} {{crit=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{d3=[[1d6]]}} {{ft=[[1d6]]}}');
  not('no 4th die', last(s).macro, '{{d4=');
  has('sub', last(s).macro, '{{sub=중급 +5 · 목표치 10 · 부스트 +1}}');
  eq('5+4+3 = 12 ≥ 10 success', last(s).computed, { ok: 3, total: 12, crit: '' });
  s.set('boost', ''); s.set('dif', '0'); await s.settle();
  s.click('rd6'); await s.settle();
  eq('1 1 → fumble, fumble table 4', last(s).computed, { ok: 2, total: 2, crit: '', fres: '계산 밖 — 통한의 실수! 자신 이외의 PC의 【생명력】을 1D6점 잃게 한다.' });
  s.click('rd6'); await s.settle();
  eq('6 6 → special, not an attack → no critical', last(s).computed, { ok: 1, total: 12, crit: '' });
  s.set('awakened', '1'); s.set('bs2', '1'); await s.settle();
  s.click('rd6'); await s.settle();
  has('awakened = 3 dice', last(s).macro, '{{d3=[[1d6]]}}');
  has('curse raises difficulty', last(s).macro, '중급 +5 · 목표치 10 · 부스트 +1');
  has('notes', last(s).macro, '{{note=BS 주박 · 난이도 한 단계 위 / 각성 · 부스트 +1}}');
  eq('2+3+3 = 8 < 10 fail', last(s).computed, { ok: 4, total: 8, crit: '' });

  // ── 어빌리티: 기능 칸의 특기 · 공격이면 GS 고양
  s = makeSim(HTML, { dice: [3, 4, 5, 2, 2, 2] }); s.open(); await s.settle();
  s.set('D6', '1'); s.set('gs1', '1'); s.set('ab2_name', '벚꽃 베기'); s.set('ab2_timing', '이동공격'); s.set('ab2_skill', '《도검》'); s.set('ab2_effect', '대미지 +2'); await s.settle();
  s.click('ab2'); await s.settle();
  has('ability card', last(s).macro, '{{title=【벚꽃 베기】}}');
  has('ability sub', last(s).macro, '{{sub=이동공격 · 《신체6/도검》 · 하급 · 목표치 5 · 부스트 +1}}');
  has('GS 고양 note', last(s).macro, '{{note=GS 고양 · 부스트 +1}}');
  eq('3+4+5 success', last(s).computed, { ok: 3, total: 12, crit: '' });
  s.set('ab3_name', '결계'); s.set('ab3_timing', '선언'); s.set('ab3_skill', '없음'); s.set('ab3_effect', '방어'); await s.settle();
  s.click('ab3'); await s.settle();
  not('no skill → no dice', last(s).macro, '{{d1=');
  has('info card', last(s).macro, '{{title=【결계】}} {{sub=타이밍 선언}} {{eff=방어}}');

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

  // ── 1번 어빌리티 줄도 빈칸 · 공격의 스페셜 = 크리티컬 히트 (p.165)
  s = makeSim(HTML, { dice: [6, 6, 4, 1] }); s.open(); await s.settle();
  s.set('D6', '1'); s.set('ab1_name', '무령도'); s.set('ab1_timing', '이동공격'); s.set('ab1_skill', '도검'); await s.settle();
  s.click('ab1'); await s.settle();
  not('no blade damage', last(s).macro, '{{dmg=');
  eq('critical hit 6 6', [last(s).computed.ok, last(s).computed.crit], [1, '크리티컬 히트 — 대미지 × 2 (6 의 개수)']);
  has('crit row in template', HTML, '{{#atk}}{{#rollTotal() computed::ok 1}}<div class="sheet-note">{{computed::crit}}</div>');
  eq('no printed text', /봉마와 싸운다|무령각성|장식품은 전투시|모든 판정에 부스트/.test(HTML), false);

  const errAll = s.log.filter(l => l[0] === 'ERROR');

  // ── 스페셜과 펌블이 함께면 스페셜 (151쪽) · 부스트는 모두 더함 · 주사위 최대 12개
  s = makeSim(HTML, { dice: [6, 1, 6, 1, 3] }); s.open(); await s.settle();
  s.set('A2', '1'); s.set('boost', '2'); await s.settle();
  s.click('ra2'); await s.settle();
  eq('6 1 6 1 → special wins', [last(s).computed.ok, last(s).computed.total], [1, 14]);
  s.set('boost', '20'); await s.settle(); s.click('ra2'); await s.settle();
  has('max 12 dice', last(s).macro, '{{d12=[[1d6]]}}');
  not('no 13th die', last(s).macro, '{{d13=');
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  // ── 방어 판정: GS 축복 부스트 +1 (공격이 아닐 때만)
  s = makeSim(HTML, { dice: [2, 3, 4, 1] }); s.open(); await s.settle();
  s.set('D6', '1'); s.set('gs2', '1'); s.set('defense', '1'); await s.settle();
  s.click('rd6'); await s.settle();
  has('defense sub + 3 dice', last(s).macro, '{{d3=[[1d6]]}}');
  has('defense label', last(s).macro, '{{sub=방어 판정 · 하급 · 목표치 5 · 부스트 +1}}');
  has('blessing note', last(s).macro, '{{note=GS 축복 · 부스트 +1}}');
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  // ── 주사위 고치기 (152쪽 다시 굴리기): 0 = 다시 굴림, 숫자 = 눈 바꾸기
  s = makeSim(HTML, { dice: [1, 1, 2, /* ft */ 3, /* x1 x2 x3 */ 6, 5, 4, /* ft */ 2], queries: { '주사위 눈': '602' } }); s.open(); await s.settle();
  s.click('fix'); await s.settle();
  has('nothing to fix', last(s).macro, '{{title=주사위 고치기}}');
  s.set('D6', '1'); s.set('boost', '1'); await s.settle();
  s.click('rd6'); await s.settle();
  eq('fumble first', [last(s).computed.ok, ...g(s, 'last_dice')], [2, '112']);
  s.click('fix'); await s.settle();
  has('fix query default', last(s).macro, '{{fq=[[?{주사위 눈 (바꿀 눈은 고쳐 적고 다시 굴릴 눈은 0)|112}]]}}');
  eq('change 1st to 6, reroll 2nd → 6 5 2 = 13 success', [last(s).computed.ok, last(s).computed.total, last(s).computed.fsub, last(s).computed.f1], [3, 13, '1 1 2 → 6 5 2 (다시 굴림 1개)', 6]);
  eq('fix remembered', g(s, 'last_dice'), ['652']);
  s.set('ab4_name', '운명유전'); await s.settle();
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  const errs = errAll;
  eq('no worker errors', errs.map(e => e[1].split('\n')[0]), []);
  console.log(`${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
