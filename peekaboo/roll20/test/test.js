// 피카부 시트 워커 시험: node peekaboo/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/peekaboo.html'), 'utf8');
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
  eq('new: innocent, sleep 0', g(s, 'sheet_type', 'sleep', 'sleep_mod', 'sleep_band'), ['in', '0', '0', '0']);
  eq('new: no targets', g(s, 'A2_value', 'F12_value'), ['', '']);
  eq('no placeholder', /placeholder=/.test(HTML), false);
  eq('no table tags', /<table/i.test(HTML), false);
  eq('one script element', (HTML.match(/<script/g) || []).length, 1);
  eq('no html/head/body tags', /<(html|head|body)[\s>]/i.test(HTML), false);
  eq('no underscore in act names', (HTML.match(/name="act_[^"]*_/g) || []).length, 0);

  // ── 목표치: 세로 1 · 옆 분야 2 · 칠한 공백 1 · 최대 12 · 원기 슬롯 체크한 분야는 출발점 아님
  s.set('C9', '1'); await s.settle();
  eq('target from 용기', g(s, 'C9_value', 'C8_value', 'B9_value', 'D9_value', 'A9_value'), ['5', '6', '7', '7', '9']);
  s.set('gap_c', '1'); await s.settle();
  eq('gap C painted (친구|놀이)', g(s, 'D9_value', 'E9_value'), ['6', '8']);
  eq('cap 12', g(s, 'F2_value'), ['12']);
  s.set('B4', '1'); await s.settle();
  eq('B4 learned', g(s, 'B4_value'), ['5']);
  s.set('slot_b', '1'); await s.settle();
  eq('slot B checked: B4 no longer a source (from C9: 5 rows + 2)', g(s, 'B4_value', 'C9_value'), ['12', '5']);

  // ── 졸음: 수정치 · 단계
  s.set('sleep', '12'); await s.settle();
  eq('sleep 12 → -1, band 2', g(s, 'sleep_mod', 'sleep_band'), ['-1', '2']);
  s.set('sleep', '25'); await s.settle();
  eq('sleep 25 → -2, band 5', g(s, 'sleep_mod', 'sleep_band'), ['-2', '5']);
  s.set('sleep', '30'); await s.settle();
  eq('sleep 30 → 0, band 6', g(s, 'sleep_mod', 'sleep_band'), ['0', '6']);

  // ── 판정 (이노센트): 졸음 수정 · 실패 때 졸음 증가 · 행동 불능
  s = makeSim(HTML, { dice: [4, 3, 2, 2, 6, 6, 1, 1] }); s.open(); await s.settle();
  s.set('C9', '1'); s.set('sleep', '12'); await s.settle();
  s.click('rc9'); await s.settle();
  has('skill title', last(s).macro, '{{title=《용기》 판정}}');
  has('computed first', last(s).macro, '&{template:peekaboo} {{ok=[[0]]}} {{total=[[0]]}} {{up=[[0]]}} {{d1=[[1d6]]}}');
  has('innocent flag', last(s).macro, '{{in=1}}');
  has('sleep mod shown', last(s).macro, '{{add=-1}}');
  has('sleep in sub', last(s).macro, '졸음 -1');
  eq('7-1 = 6 ≥ 5 success, no sleep up', last(s).computed, { ok: 3, total: 6, up: 0 });
  s.click('fear'); await s.settle();
  has('fear title', last(s).macro, '{{title=공포 판정 《용기》}}');
  eq('4-1 = 3 fail → sleep +1', last(s).computed, { ok: 4, total: 3, up: 1 });
  s.click('rc9'); await s.settle();
  eq('12 special', last(s).computed, { ok: 1, total: 11, up: 0 });
  s.click('rc9'); await s.settle();
  eq('1+1 fumble → sleep +1', last(s).computed, { ok: 2, total: 1, up: 1 });
  s.set('sleep', '30'); await s.settle();
  s.click('rc9'); await s.settle();
  not('sleep 30: no dice', last(s).macro, '{{d1=');
  has('sleep 30: 행동 불능', last(s).macro, '{{note=졸음 30 · 행동 불능}}');

  // ── 스푸키: 졸음 없음 · in 표시 없음 · 마법 = 마력에서 코스트
  s = makeSim(HTML, { dice: [3, 3] }); s.open(); await s.settle();
  s.set('sheet_type', 'sp'); s.set('sleep', '20'); s.set('C2', '1'); s.set('mp', '12'); await s.settle();
  s.click('rc2'); await s.settle();
  not('spooky: no in flag', last(s).macro, '{{in=1}}');
  not('spooky: no sleep mod', last(s).macro, '{{add=');
  eq('spooky result', last(s).computed, { ok: 3, total: 6 });
  s.set('mg1_name', '꿈나라 보내기'); s.set('mg1_cost', '3'); s.set('mg1_effect', '목표 한 명을 잠들게 한다.'); await s.settle();
  s.click('mg1'); await s.settle();
  eq('mp 12 - 3', g(s, 'mp'), ['9']);
  has('magic card', last(s).macro, '{{title=【마법】 꿈나라 보내기}} {{sub=코스트 3 · 마력 12 → 9}} {{eff=목표 한 명을 잠들게 한다.}}');

  // ── □ 칸: 누른 칸까지, 채워진 마지막 칸을 다시 누르면 하나 줄임 (이노센트 · 스푸키 부글부글이 같은 값)
  s.click('mk4'); await s.settle();
  eq('muka 4', g(s, 'muka'), ['4']);
  s.click('smk4'); await s.settle();
  eq('muka same box again → 3', g(s, 'muka'), ['3']);
  s.click('tl2'); await s.settle();
  eq('talent 2', g(s, 'talent_used'), ['2']);
  s.click('ms20'); await s.settle();
  eq('mana slot 20', g(s, 'mp'), ['20']);

  // ── 펌블치 · 스페셜치 손 수정
  s.click('fup'); await s.settle(); s.click('fup'); await s.settle();
  eq('fumble +2', g(s, 'fumble', 'fumble_adj'), ['4', '2']);
  s.click('frs'); await s.settle();
  eq('reset', g(s, 'fumble'), ['2']);

  // ── 랜덤 특기 · nD6 · GM 귓속말
  s = makeSim(HTML, { dice: [3, 4, 4, 2, 5] }); s.open(); await s.settle();
  s.click('rsk'); await s.settle();
  eq('random skill 3 / 4+4 = 친구 8 자전거', last(s).computed, { tres: '친구 · 《자전거》' });
  s.click('nd2'); await s.settle();
  eq('2D6', last(s).computed, { total: 7 });
  eq('gm whisper roll button', /name="roll_gmw"[^>]*value="\/w gm &\{template:peekaboo\} \{\{plain=\?\{GM 에게 귓속말\}\}\}"/.test(HTML), true);

  const errs = s.log.filter(l => l[0] === 'ERROR');
  eq('no worker errors', errs.map(e => e[1].split('\n')[0]), []);
  console.log(`${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
