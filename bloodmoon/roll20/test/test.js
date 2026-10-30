// 블러드문 시트 워커 시험: node bloodmoon/roll20/test/test.js  (Roll20 흉내 r20sim.js 위에서 자동 계산 · 굴림을 확인)
const fs = require('fs');
const { makeSim } = require('./r20sim');
const HTML = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '../sheet/bloodmoon.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 300)); };
(async () => {
  // ── 새 헌터 시트
  let s = makeSim(HTML); s.open(); await s.settle();
  const items = [...s.attrs.keys()].filter(k => /^repeating_items_.*_row$/.test(k));
  eq('new sheet: 3 item rows', items.length, 3);
  eq('new sheet: version', String(s.get('sheet_version')), '1');
  eq('new sheet: tn all 12', s.get('sk_arm4_tn'), 12);
  eq('new sheet: durability', s.get('durability'), '—');
  s.open(); await s.settle();
  eq('reopen: still 3 item rows', [...s.attrs.keys()].filter(k => /^repeating_items_.*_row$/.test(k)).length, 3);

  // ── 목표치
  s.set('sk_arm4', '1'); await s.settle();
  eq('tn learned', s.get('sk_arm4_tn'), 5);
  eq('tn up/down 1', [s.get('sk_arm3_tn'), s.get('sk_arm5_tn')], [6, 6]);
  eq('tn up/down 2', [s.get('sk_arm2_tn'), s.get('sk_arm6_tn')], [7, 7]);
  eq('tn next column (no gap)', [s.get('sk_head4_tn'), s.get('sk_body4_tn')], [7, 7]);
  eq('tn two columns', s.get('sk_soc4_tn'), 9);
  eq('tn far (cap 12)', s.get('sk_env12_tn'), 12);
  s.set('gap_b', '1'); await s.settle();
  eq('tn gap painted (머리|팔)', s.get('sk_head4_tn'), 6);
  eq('tn gap does not affect other side', s.get('sk_body4_tn'), 7);
  s.set('gap_b', '0'); await s.settle();
  eq('tn gap cleared', s.get('sk_head4_tn'), 7);

  // ── 부위 대미지 (주팔 = arm5 → 십자 사용불능)
  s.set('dmg_armm', '1'); await s.settle();
  eq('dmg total', s.get('dmg_total'), 1);
  eq('dmg cross off', ['arm5', 'arm4', 'arm6', 'head5', 'body5', 'arm3'].map(id => s.get(`sk_${id}_off`)), [1, 1, 1, 1, 1, 0]);
  eq('dmg: learned skill off → all 12', [s.get('sk_arm3_tn'), s.get('sk_head4_tn')], [12, 12]);
  s.set('sk_head2', '1'); await s.settle();
  eq('dmg: other source still works', [s.get('sk_head2_tn'), s.get('sk_head3_tn'), s.get('sk_head5_tn')], [5, 6, 12]);
  s.set('dmg_armm', '0'); await s.settle();
  eq('dmg cleared', [s.get('dmg_total'), s.get('sk_arm4_tn'), s.get('sk_arm5_off')], [0, 5, 0]);

  // ── 공황
  s.set('cond_panic', '1'); await s.settle();
  eq('panic off ▲', ['soc2', 'arm2', 'leg2', 'soc12', 'arm12', 'leg12', 'arm3'].map(id => s.get(`sk_${id}_off`)), [1, 1, 1, 1, 1, 1, 0]);
  s.set('cond_panic', '0'); await s.settle();

  // ── 내구력
  s.set('dur_base', '3'); await s.settle();
  eq('durability base only', [s.get('durability'), s.get('dur_sum')], [3, 0]);
  const h1 = s.addRow('happiness', { kind: '행복', power: '1' }), h2 = s.addRow('happiness', { kind: '배덕', power: '2' }); await s.settle();
  eq('durability + happiness', [s.get('durability'), s.get('power_total')], [6, 3]);
  s.remove(h2); await s.settle();
  eq('durability after row removed', s.get('durability'), 4);
  const d1 = s.addRow('dominance', { power: '4' }); await s.settle();
  eq('hunter ignores dominance', s.get('durability'), 4);
  s.set('sheet_type', 'monster'); await s.settle();
  eq('monster uses dominance', [s.get('durability'), s.get('dominance_total')], [7, 4]);
  s.set('sheet_type', 'hunter'); s.set('dur_base', ''); await s.settle();
  eq('durability blank base', s.get('durability'), '—');

  // ── 상주 코스트
  s.addRow('abilities', { name: 'A', type: '상주', cost: '2' }); s.addRow('abilities', { name: 'B', type: '상주', cost: '×' }); s.addRow('abilities', { name: 'C', type: '공격', cost: '3' }); await s.settle();
  eq('passive cost', s.get('passive_cost'), 2);
  s.click('addmild'); s.click('addsevere'); await s.settle();
  const mild = [...s.attrs.entries()].filter(([k, v]) => /^repeating_abilities_.*_name$/.test(k) && /광기/.test(v)).map(([, v]) => v);
  eq('madness rows added', mild.sort(), ['경증광기', '중증광기']);
  eq('passive cost unchanged by ×', s.get('passive_cost'), 2);

  // ── 팔로워 · 행동 횟수
  const f1 = s.addRow('followers', { name: '구울', lv: '3' }), f2 = s.addRow('followers', { name: '거인', lv: '6' }); await s.settle();
  eq('follower tn/hp lv3', [s.get(`${f1}_tn`), s.get(`${f1}_hp`)], [7, 5]);
  eq('follower tn/hp lv6 (min 5)', [s.get(`${f2}_tn`), s.get(`${f2}_hp`)], [5, 8]);
  s.set('hunters', '4'); await s.settle();
  eq('acts 4 hunters', [s.get('acts1'), s.get('acts2'), s.get('acts3')], [2, 2, 3]);
  s.set('hunters', '2'); await s.settle();
  eq('acts 2 hunters', [s.get('acts1'), s.get('acts2'), s.get('acts3')], [0, 0, 1]);

  // ── 여유 · 혈량 단추
  s.click('reserveup'); await s.settle(); s.click('reserveup'); await s.settle();
  eq('reserve up x2', String(s.get('reserve')), '2');
  for (let i = 0; i < 3; i++) { s.click('reservedn'); await s.settle(); }
  eq('reserve down clamp', String(s.get('reserve')), '0');

  // ── 굴림: 특기 행동판정
  const last = () => s.rolls[s.rolls.length - 1];
  s.dice.push(3, 4); s.click('rarm4'); await s.settle();
  eq('skill roll computed', last().computed, { res: '✓ 성공', total: 7, target: 5, skill: '《베기》' });
  has('skill roll prompt', last().macro, '《베기》 목표치 5');
  s.dice.push(1, 1); s.click('rarm4'); await s.settle();
  eq('fumble', last().computed.res, '✗ 펌블 · 【여유】 0');
  s.dice.push(6, 6); s.click('renv12'); await s.settle();
  eq('special even if tn 12', last().computed.res, '★ 스페셜 · 【여유】 +3');
  s.queries['《베기》'] = -3; s.dice.push(3, 4); s.click('rarm4'); await s.settle(); delete s.queries['《베기》'];
  eq('modifier applied', [last().computed.total, last().computed.res], [4, '✗ 실패']);

  // ── 굴림: 어빌리티
  s.set('attack', '2');
  const ab = s.addRow('abilities', { name: '일격', type: '공격', cost: '1', skill: '《베기》', effect: '대미지 1점', flavor: '개요' }); await s.settle();
  s.dice.push(2, 1); s.click('use', ab); await s.settle();
  eq('attack ability adds 공격력', [last().computed.total, last().computed.res], [5, '✓ 성공']);
  has('attack ability macro atk', last().macro, '{{atk=[[2]]}}');
  has('ability effect/flavor', last().macro, '{{effect=대미지 1점}} {{flavor=개요}}');
  const ab2 = s.addRow('abilities', { name: '자세', type: '상주', cost: '1', skill: '없음', effect: '항상' }); await s.settle();
  const before = s.rolls.length; s.click('use', ab2); await s.settle();
  eq('passive ability: info card only', [s.rolls.length - before, /\[\[1d6\]\]/.test(last().macro)], [1, false]);
  has('passive card', last().macro, '{{k1=지정특기}} {{v1=없음}}');
  const ab3 = s.addRow('abilities', { name: '자유기', type: '보조', skill: '자유' }); await s.settle();
  s.queries['판정 특기'] = 0; s.dice.push(4, 4); s.click('use', ab3); await s.settle(); delete s.queries['판정 특기'];
  eq('free skill → first option = lowest tn', [last().computed.skill, last().computed.target], ['《듣기》', 5]);
  has('free skill query lists sorted', last().macro, '?{판정 특기|듣기 (5),0|베기 (5),1|감각기 (6),2|');
  s.queries['판정 특기'] = 1; s.dice.push(4, 4); s.click('use', ab3); await s.settle(); delete s.queries['판정 특기'];
  eq('free skill picks chosen option', last().computed.skill, '《베기》');

  // ── 굴림: 팔로워
  s.dice.push(3, 3); s.click('roll', f1); await s.settle();
  eq('follower roll tn 7', [last().computed.total, last().computed.target, last().computed.res, 'skill' in last().computed], [6, 7, '✗ 실패', false]);
  s.set(`${f1}_ab1_name`, '할퀴기'); s.set(`${f1}_ab1_type`, '공격'); s.set(`${f1}_ab1_skill`, '《베기》'); await s.settle();
  s.dice.push(4, 4); s.click('ab1', f1); await s.settle();
  eq('follower ability uses 판정치', [last().computed.target, last().computed.res], [7, '✓ 성공']);
  has('follower ability title', last().macro, '{{title=구울 · 할퀴기}}');

  // ── 표 굴림
  s.dice.push(3, 4, 2); s.click('rskill'); await s.settle();
  eq('random skill all', last().computed, { res: '《뇌》', field: '1D6 2 → 머리' });
  s.set('rand_field', 'env'); s.dice.push(1, 1); s.click('rskill'); await s.settle();
  eq('random skill field', last().computed, { res: '《쉬기》', field: '환경' });
  s.dice.push(6, 6); s.click('rpart'); await s.settle();
  eq('part table', last().computed.res, '심장');
  s.dice.push(6); s.click('rinit'); await s.settle();
  eq('init table', last().computed.res, '《심장/동체7》');
  s.set('nd_count', '3'); s.set('nd_mod', '-1'); s.dice.push(1, 2, 3); s.click('rnd'); await s.settle();
  eq('nD6', last().computed, { dice: '1, 2, 3', res: '합계 5' });
  has('nD6 title', last().macro, '{{title=3D6-1}}');

  // ── 목록 출력
  const it = items[0].replace(/_row$/, '');
  s.set(`${it}_name`, '붕대'); s.set(`${it}_kind`, '소모품'); s.set(`${it}_count`, '2'); s.set(`${it}_effect`, '회복 {{x}} [[1d6]]'); await s.settle();
  s.click('say', it); await s.settle();
  has('item card', last().macro, '{{title=붕대}} {{k1=분류}} {{v1=소모품}} {{k2=개수}} {{v2=2}}');
  has('user text sanitized', last().macro, '{{effect=회복 ｛｛x｝｝ [ [1d6] ]}}');
  s.set(`${h1}_name`, '가족'); s.set(`${h1}_link`, '일상'); await s.settle(); s.click('say', h1); await s.settle();
  has('happiness card', last().macro, '{{title=【행복】 가족}} {{k1=링크}} {{v1=《일상》}} {{k2=강도}} {{v2=1}}');

  const errs = s.log.filter(l => l[0] !== 'INFO');
  console.log(`\n${pass} passed, ${fail} failed`, errs.length ? errs : '');
})();
