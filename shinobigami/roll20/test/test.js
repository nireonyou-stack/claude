// 시노비가미 시트 워커 시험: node shinobigami/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/shinobigami.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 400)); };
const last = s => s.rolls[s.rolls.length - 1];
const g = (s, ...ks) => ks.map(k => String(s.get(k)));
(async () => {
  // ── 새 캐릭터
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version', g(s, 'sheet_version'), ['1']);
  eq('new: fold closed', g(s, 'fold_open'), ['0']);
  eq('new: hp 6/6, 10 slots', g(s, 'hp', 'hp_max', 'hp_dim', 'hp_slots'), ['6', '6', '6', '10']);
  eq('new: fumble 2 special 12', g(s, 'fumble', 'special'), ['2', '12']);
  eq('new: no targets', g(s, 'A2_value', 'F12_value'), ['', '']);
  eq('new: flat battlefield', g(s, 'bf_flat'), ['1']);
  eq('no placeholder', /placeholder=/.test(HTML), false);
  eq('no table tags', /<table/i.test(HTML), false);

  // ── 목표치
  s.set('C7', '1'); await s.settle();
  eq('target learned / up-down / next field', g(s, 'C7_value', 'C6_value', 'C9_value', 'B7_value', 'A7_value'), ['5', '6', '7', '7', '9']);
  s.set('B', '1'); await s.settle();
  eq('gap B painted (체술|인술)', g(s, 'B7_value', 'D7_value'), ['6', '7']);
  eq('cap 12', g(s, 'A12_value'), ['12']);

  // ── 생명력 슬롯: 빈칸 → 소실 → 부정 → 빈칸
  s.click('slotc'); await s.settle();
  eq('slot lost: value · hp -1', g(s, 'Ninpo_C_Field', 'hp'), ['@{Stealth(lost)}', '5']);
  eq('slot lost: no source → no target', g(s, 'C7_value'), ['']);
  s.set('B5', '1'); await s.settle();
  eq('other source works', g(s, 'C7_value'), ['8']);
  s.click('slotc'); await s.settle();
  eq('slot dirty: hp same', g(s, 'Ninpo_C_Field', 'hp'), ['@{Stealth(dirty)}', '5']);
  eq('dirty also excluded', g(s, 'C7_value'), ['8']);
  s.set('yoma', '1'); await s.settle();
  eq('yoma: dirty field used', g(s, 'C7_value'), ['5']);
  s.set('yoma', '0'); await s.settle();
  s.click('slotc'); await s.settle();
  eq('slot back to blank: hp +1', g(s, 'Ninpo_C_Field', 'hp', 'C7_value'), ['@{Stealth}', '6', '5']);

  // ── 목련 (2 와 12 가 이어짐) · 마계공학 (기술 · 요술이 이어짐)
  s = makeSim(HTML); s.open(); await s.settle();
  s.set('A2', '1'); await s.settle();
  eq('no wrap', g(s, 'A12_value', 'F2_value'), ['12', '12']);
  s.set('Ninpo_03_Name', '목련'); await s.settle();
  eq('mokuren on', g(s, 'MuLian', 'Ninpo_03_on', 'A12_value', 'A11_value'), ['1', '1', '6', '7']);
  s.set('Ninpo_03_Name', ''); const row = s.addRow('acitems', { Ninpo_Name: '마계공학' }); await s.settle();
  eq('makai kougaku on (repeating row)', g(s, 'MuoChie', 'MuLian', 'F2_value', 'E2_value', `${row}_Ninpo_on`), ['1', '0', '7', '9', '1']);
  s.set('Z', '1'); await s.settle();
  eq('gap Z painted', g(s, 'F2_value'), ['6']);

  // ── 펌블치 · 스페셜치
  s.set('scene', 'battle'); s.set('plot', '5'); await s.settle();
  eq('battle plot 5', g(s, 'fumble'), ['5']);
  s.set('plot', '0'); await s.settle();
  eq('plot 0 → 2', g(s, 'fumble'), ['2']);
  s.set('plot', '7'); s.set('bf_crowd', '1'); await s.settle();
  eq('plot 7 + crowd', g(s, 'fumble', 'bf_flat'), ['8', '0']);
  s.set('cond_hidaruma', '2'); await s.settle();
  eq('burning 2', g(s, 'fumble', 'cf_hidaruma'), ['10', '1']);
  s.click('fup'); await s.settle();
  eq('fumble up', g(s, 'fumble', 'fumble_adj'), ['11', '1']);
  s.click('frs'); s.click('sdn'); await s.settle(); s.click('sdn'); await s.settle();
  eq('fumble reset · special -2', g(s, 'fumble', 'special'), ['10', '10']);
  s.set('scene', 'drama'); await s.settle();
  eq('drama: 2 + burning (crowd only in battle)', g(s, 'fumble'), ['4']);
  s.set('bf_flat', '1'); await s.settle();
  eq('flat clears others', g(s, 'bf_crowd'), ['0']);
  s.set('bf_water', '1'); await s.settle();
  eq('other clears flat', g(s, 'bf_flat'), ['0']);
  s.set('bf_water', '0'); await s.settle();
  eq('none → flat', g(s, 'bf_flat'), ['1']);

  // ── 요마화 칸 · 상태이상 표시 · 감정 표시
  s.set('background_name_02', '【마인】'); await s.settle();
  eq('majin → yoma box', g(s, 'yoma_ok'), ['1']);
  s.set('yoma', '1'); s.set('background_name_02', ''); await s.settle();
  eq('no majin → yoma off', g(s, 'yoma_ok', 'yoma'), ['0', '0']);
  s.set('cond_mahi', '2'); s.set('cond_noroi', '0'); await s.settle();
  eq('cond flags', g(s, 'cf_mahi', 'cf_noroi'), ['1', '0']);
  s.set('relation_sense_03', '우정'); await s.settle();
  eq('emotion row flag', g(s, 'relation_emo_03', 'relation_emo_04'), ['1', '0']);
  s.set('hp_max', '26'); await s.settle();
  eq('hp 26 → 30 slots', g(s, 'hp_dim', 'hp_slots'), ['26', '30']);
  s.set('hp_max', '1'); await s.settle();
  eq('hp 1 → 10 slots', g(s, 'hp_dim', 'hp_slots'), ['1', '10']);

  // ── 판정 굴림
  s = makeSim(HTML, { dice: [] }); s.open(); await s.settle();
  s.set('character_name', '카게로'); s.set('C7', '1'); await s.settle();
  s.dice.push(4, 3); s.click('rc7'); await s.settle();
  let r = last(s);
  has('skill roll template', r.macro, '&{template:shinobigami}');
  has('skill roll title', r.macro, '{{title=《은형술》 판정}}');
  has('skill roll sub', r.macro, '{{sub=인술 · 목표치 5}}');
  eq('skill roll: success', [r.computed.ok, r.computed.total], [3, 7]);
  s.dice.push(6, 6); s.click('ra12'); await s.settle();
  eq('special', last(s).computed.ok, 1);
  s.dice.push(1, 1); s.click('rc7'); await s.settle();
  eq('fumble', last(s).computed.ok, 2);
  s.dice.push(2, 3); s.click('ra12'); await s.settle();
  eq('failure (target 12)', last(s).computed.ok, 4);
  s.set('scene', 'battle'); s.set('plot', '4'); s.set('bf_high', '1'); s.set('bf_water', '1'); s.set('cond_mahi', '1'); await s.settle();
  s.dice.push(1, 3); s.click('rc7'); await s.settle();
  r = last(s);
  eq('battle fumble 4 + highland note', [r.computed.ok, r.computed.hi], [2, 1]);
  has('tail', r.macro, '목표치 5 · 펌블치 4 · 수중 · 고지대 · 마비 1');
  has('water note', r.macro, '{{note=수중 · 회피 판정 -2}}');
  s.set('roll_display_to', '/w gm '); await s.settle();
  s.dice.push(3, 3); s.click('rc7'); await s.settle();
  eq('gm only', last(s).macro.startsWith('/w gm '), true);
  s.set('roll_display_to', ' '); s.set('scene', 'drama'); s.set('cond_mahi', ''); await s.settle();

  // 인법 · 악천후 · 그림
  s.set('Ninpo_01_Name', '그림자 베기'); s.set('Ninpo_01_Types', '@{Tool}'); s.set('Ninpo_01_Range', '1'); s.set('Ninpo_01_Cost', '1');
  s.set('Ninpo_01_Assigned_Skill', '《은형술》'); s.set('Ninpo_01_Img', 'https://example.com/a'); await s.settle();
  s.dice.push(5, 5); s.click('np01'); await s.settle();
  r = last(s);
  has('ninpo title', r.macro, '{{title=【그림자 베기】}}');
  has('ninpo sub', r.macro, '{{sub=공격 · 간격 1 · 코스트 1 · 《은형술》 · 목표치 5}}');
  has('ninpo image', r.macro, '{{img=[【그림자 베기】](https://example.com/a#.png)}}');
  s.set('scene', 'battle'); s.set('bf_storm', '1'); await s.settle();
  s.dice.push(5, 5); s.click('np01'); await s.settle();
  has('storm range +1', last(s).macro, '간격 1+1');
  s.set('scene', 'drama'); await s.settle();
  s.set('Ninpo_02_Name', '연막'); s.set('Ninpo_02_Assigned_Skill', ''); await s.settle();
  s.click('np02'); await s.settle();
  eq('no skill → no dice', /d1=/.test(last(s).macro), false);

  // 파훼 판정: 스페셜 · 펌블만
  s.set('relation_name_01', '츠바키'); s.set('relation_ougi_01', '변장술'); await s.settle();
  s.dice.push(3, 4); s.click('brk01'); await s.settle();
  r = last(s);
  has('break title', r.macro, '{{title=《변장술》 파훼 판정}}');
  has('break sub', r.macro, '{{sub=츠바키의 오의 · 인술 · 목표치 6}}');
  eq('break: no success stamp', r.computed.ok, 0);
  s.dice.push(6, 6); s.click('brk01'); await s.settle();
  eq('break: special', last(s).computed.ok, 1);

  // 오의 (강점 · 결점) · 닌자도구
  s.set('Ougi1_name', '월영'); s.set('Ougi1_skill', '은형술'); s.set('Ougi1', '판정 방해');
  s.addRow('ougia', { sname: '범위', seff: '효과A', wname: '약점', weff: '' }); await s.settle();
  s.click('ougi1'); await s.settle();
  r = last(s);
  has('ougi card', r.macro, '{{ougi=1}}');
  has('ougi pair s', r.macro, '{{g1s=범위}} {{g1se=효과A}}');
  has('ougi pair w', r.macro, '{{g1w=약점}}');
  s.set('gear_01', '2'); await s.settle();
  const n0 = s.rolls.length; s.click('gear1'); await s.settle();
  eq('gear count -1', g(s, 'gear_01'), ['1']);
  eq('gear: 2 cards', s.rolls.length - n0, 2);
  has('gear public card', s.rolls[n0].macro, '{{title=병량환 사용}}');
  has('gear gm whisper', s.rolls[n0 + 1].macro, '/w gm ');
  has('gear remain', s.rolls[n0 + 1].macro, '남은 개수 2 → 1');

  // 굴림표 · nD6 · 플롯 · GM 귓속말
  s.dice.push(3); s.click('rt4'); await s.settle();
  has('fumble table', last(s).computed.tres, '정보가 새어나갔다!');
  s.dice.push(5, 4); s.click('rt1'); await s.settle();
  has('scene table 9', last(s).computed.tres, '세찬 비가 내린다.');
  s.dice.push(2, 4, 6); s.click('nd3'); await s.settle();
  eq('3d6', last(s).computed.total, 12);
  s.set('plot', '3'); await s.settle(); s.click('plotsend'); await s.settle();
  has('plot to gm', last(s).macro, '/w gm ');
  has('plot text', last(s).macro, '카게로의 플롯은 3');
  s.set('crest_url', 'https://example.com/crest.png'); await s.settle();
  s.click('gmw'); await s.settle();
  has('gm whisper query', last(s).macro, '{{plain=?{GM 에게 귓속말}}}');
  has('crest watermark', last(s).macro, '{{crest=[문장](https://example.com/crest.png)}}');

  const errs = s.log.filter(l => l[0] !== 'INFO');
  eq('worker log clean', errs, []);
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
