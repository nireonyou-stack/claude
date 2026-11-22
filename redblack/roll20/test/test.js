// 적과 흑 시트 워커 시험: node redblack/roll20/test/test.js  (블러드문의 Roll20 흉내 r20sim.js 를 같이 쓴다)
const fs = require('fs'), path = require('path');
const { makeSim } = require('../../../bloodmoon/roll20/test/r20sim');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../sheet/redblack.html'), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); };
const has = (name, s, sub) => { const ok = String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— missing', JSON.stringify(sub), 'in', String(s).slice(0, 600)); };
const not = (name, s, sub) => { const ok = !String(s).includes(sub); ok ? pass++ : fail++; if (!ok) console.log('FAIL', name, '— unexpected', JSON.stringify(sub), 'in', String(s).slice(0, 400)); };
const last = s => s.rolls[s.rolls.length - 1];
const g = (s, ...ks) => ks.map(k => String(s.get(k)));
const pick = (o, ...ks) => Object.fromEntries(ks.map(k => [k, o[k]]));
(async () => {
  // ── 새 캐릭터 · 금지 사항
  let s = makeSim(HTML); s.open(); await s.settle();
  eq('new: version, sums 0, glory 5', g(s, 'sheet_version', 'sum_b', 'sum_r', 'sum_n', 'glory'), ['1', '0', '0', '0', '5']);
  eq('no placeholder', /placeholder=/.test(HTML), false);
  eq('no table tags', /<table/i.test(HTML), false);
  eq('one script element', (HTML.match(/<script/g) || []).length, 1);
  eq('no html/head/body tags', /<(html|head|body)[\s>]/i.test(HTML), false);
  eq('no underscore in act names', (HTML.match(/name="act_[^"]*_/g) || []).length, 0);
  eq('rank radio: hidden empty default', /<input type="radio" class="hid" name="attr_rank" value="" checked>/.test(HTML), true);

  // ── 카드 패드: 흑 K · 흑 3 · 적 2 · 광대 → 칸 · 무늬 번갈아 · 합계 (그림 10 · A 15 · 광대 15)
  s.click('bk'); await s.settle(); s.click('b3'); await s.settle(); s.click('r2'); await s.settle();
  eq('slots', g(s, 'pc1', 'pc1_k', 'pc1_s', 'pc2', 'pc2_s', 'pc3', 'pc3_s', 'pc4'), ['bk', 'K', '♠', 'b3', '♣', 'r2', '♥', '']);
  eq('sums', g(s, 'sum_b', 'sum_r', 'sum_n'), ['13', '2', '3']);
  s.click('ba'); await s.settle(); s.click('jx'); await s.settle(); s.click('jx'); await s.settle();
  eq('A 15 · one joker 15 in both colors', g(s, 'sum_b', 'sum_r', 'sum_n', 'pc5', 'pc5_k', 'pc5_s', 'pc6'), ['43', '17', '5', 'jx', 'JK', '★', '']);
  eq('one joker button, no colored jokers', [/name="act_jx"/.test(HTML), /name="act_[br]x"/.test(HTML)], [true, false]);
  s.click('pcx1'); await s.settle();
  eq('remove first → shift left, suits recomputed', g(s, 'pc1', 'pc1_s', 'pc2', 'pc2_s', 'pc4', 'pc5', 'sum_b'), ['b3', '♠', 'r2', '♥', 'jx', '', '33']);
  s.click('clr'); await s.settle();
  eq('clear', g(s, 'pc1', 'sum_n'), ['', '0']);

  // ── 기본 선언: 〔기동〕 흑：12 — 부족이면 카드 남김, 기동하면 비움
  s.set('bc3_boot', '흑：12'); s.set('bc3_lv', '2'); await s.settle();
  s.click('b5'); await s.settle(); s.click('r9'); await s.settle();
  s.click('bc3'); await s.settle();
  has('basic card', last(s).macro, '&{template:redblack} {{title=심문 선고}} {{en=BASIC CALLING}} {{head=선언 마법 · LV 2}}');
  has('req black', last(s).macro, '{{req=흑：12}} {{reqb=1}} {{ng=1}}');
  has('chips in order', last(s).macro, '{{bk1=5}} {{bs1=♠}} {{rk2=9}} {{rs2=♥}} {{sb=5}} {{sr=9}} {{sn=2}}');
  has('short note', last(s).macro, '{{note=흑 합계 5 / 필요 12}}');
  has('printed LV2 effect', last(s).macro, '{{lvx=LV2: GM 에게서 NO 라는 답도 얻을 수 있다 (불명 = 시나리오에 없음)}}');
  not('no LV3 at LV2', last(s).macro, 'LV3:');
  eq('LV lines printed, no LV textarea', [/attr_bc3_lvx/.test(HTML), /class="lvm" name="attr_bc4_lv"/.test(HTML)], [false, true]);
  has('printed text', last(s).macro, '{{eff=당신을 대상으로, YES / NO');
  eq('short → cards kept', g(s, 'sum_n'), ['2']);
  s.click('bq'); await s.settle();
  s.click('bc3'); await s.settle();
  has('invoked', last(s).macro, '{{ok=1}}');
  eq('invoked → cleared', g(s, 'sum_n', 'pc1'), ['0', '']);

  // ── ？：10 = 색 상관없이 · 조건 없음 · 낸 카드 없음
  s.set('bc5_boot', '？：10'); await s.settle();
  s.click('b4'); await s.settle(); s.click('r6'); await s.settle();
  s.click('bc5'); await s.settle();
  has('any color 4+6 = 10 ok', last(s).macro, '{{req=？：10}} {{ok=1}}');
  s.click('bc4'); await s.settle();
  has('no condition, no cards', last(s).macro, '{{req=—}} {{none=1}}');
  not('no stamp without condition', last(s).macro, '{{ok=1}}');

  // ── 룰북 54쪽: 조건 0 이어도 카드 1장 이상 · 「—」 = 기동 불가 · 광대는 흑으로도 적으로도
  s.set('bc6_boot', '흑：0'); await s.settle();
  s.click('bc6'); await s.settle();
  has('zero condition still needs a card', last(s).macro, '{{ng=1}} {{none=1}} {{note=카드를 1장 이상 내야 함}}');
  s.set('bc4_boot', '—'); await s.settle();
  s.click('r9'); await s.settle(); s.click('bc4'); await s.settle();
  has('dash = cannot invoke, cards kept', last(s).macro, '{{note=기동할 수 없는 마법}}');
  eq('dash keeps cards', g(s, 'sum_n'), ['1']);
  s.click('clr'); s.set('bc1_boot', '흑：20'); await s.settle();
  s.click('b5'); await s.settle(); s.click('jx'); await s.settle(); s.click('bc1'); await s.settle();
  has('joker as black: 5 + 15', last(s).macro, '{{reqb=1}} {{ok=1}}');
  has('joker chip, sums count it in both', last(s).macro, '{{bk1=5}} {{bs1=♠}} {{jk2=1}} {{sb=20}} {{sr=15}} {{sn=2}}');
  s.set('bc2_boot', '적：15'); await s.settle();
  s.click('jx'); await s.settle(); s.click('bc2'); await s.settle();
  has('joker alone as red', last(s).macro, '{{reqr=1}} {{ok=1}}');

  // ── 상급 선언 (이름 없으면 아무것도 안 함) · 권한 마법 태그
  const n0 = s.rolls.length;
  s.click('nc2'); await s.settle();
  eq('empty noble → no card', s.rolls.length, n0);
  s.set('au1_name', '【추구 권한】'); s.set('au1_boot', '？：1'); s.set('au1_acc', '1'); s.set('au1_sup', '1'); s.set('au1_text', '어택이나 실드'); await s.settle();
  s.click('r3'); await s.settle();
  s.click('au1'); await s.settle();
  has('auth tags', last(s).macro, '{{en=BATTLE MAGIC}} {{head=권한 마법}} {{acc=1}} {{sup=1}}');
  has('auth ok', last(s).macro, '{{req=？：1}} {{ok=1}} {{rk1=3}} {{rs1=♥}}');

  // ── 언리미티드 (문장 3): 권한 마법에서만 낸 카드 1장을 양쪽 색으로
  s.set('au2_name', '흑검'); s.set('au2_boot', '흑：12'); await s.settle();
  s.click('b4'); await s.settle(); s.click('rk'); await s.settle(); s.click('r3'); await s.settle();
  s.click('au2'); await s.settle();
  has('without unlimited: short', last(s).macro, '{{note=흑 합계 4 / 필요 12}}');
  s.set('crest3_on', '1'); await s.settle();
  s.click('au2'); await s.settle();
  has('unlimited: red K counts as black', last(s).macro, '{{ok=1}}');
  has('unlimited note', last(s).macro, '{{note=언리미티드: 적 K 를 흑으로도 취급}}');
  s.set('bc1_boot', '흑：12'); await s.settle();
  s.click('b4'); await s.settle(); s.click('rk'); await s.settle(); s.click('bc1'); await s.settle();
  has('unlimited not for basic calling', last(s).macro, '{{ng=1}}');
  s.click('clr'); await s.settle();

  // ── 고발 공격 · GM 귓속말
  s.set('acc_power', '3'); s.set('acc_count', '2'); await s.settle();
  s.click('atk'); await s.settle();
  has('accusation', last(s).macro, '{{title=고발 공격}} {{en=ACCUSATION}} {{head=적대 진영에}} {{big=6}} {{how=위력 3 × 횟수 2}}');
  not('no zero note', last(s).macro, '{{note=');
  s.set('acc_count', '0'); await s.settle();
  s.click('atk'); await s.settle();
  has('zero damage = no attack', last(s).macro, '{{big=0}} {{how=위력 3 × 횟수 0}} {{note=0 대미지 — 고발 공격은 일어나지 않은 것으로 본다}}');
  eq('gm whisper roll button', /name="roll_gmw"[^>]*value="\/w gm &\{template:redblack\}/.test(HTML), true);

  const errAll = s.log.filter(l => l[0] === 'ERROR');

  // ── 권한 마법 〔마력〕 조건 (76쪽): 흑 · 적의 마력이 모두 조건 이상이어야 기동, 마력은 쓰지 않음
  s = makeSim(HTML); s.open(); await s.settle();
  s.set('au3_name', '【참격 권한】'); s.set('au3_boot', '흑：12'); s.set('au3_black', '4'); s.set('au3_red', '1'); s.set('mb', '4'); s.set('mr', '0'); await s.settle();
  s.click('bk'); await s.settle(); s.click('b2'); await s.settle();
  s.click('au3'); await s.settle();
  has('mana in head', last(s).macro, '{{head=권한 마법 · 〔마력〕 4／1}}');
  has('mana short → ng', last(s).macro, '{{ng=1}}');
  has('mana note', last(s).macro, '{{note=〔마력〕 흑 4 / 적 1 필요 — 지금 흑 4 · 적 0}}');
  eq('mana short keeps cards', g(s, 'sum_n'), ['2']);
  s.set('mr', '1'); await s.settle();
  s.click('au3'); await s.settle();
  has('mana ok', last(s).macro, '{{ok=1}}');
  eq('ether not spent, cards cleared', g(s, 'mb', 'mr', 'sum_n'), ['4', '1', '0']);
  s.set('au4_name', '없음'); s.set('au4_boot', '？：1'); s.set('au4_black', '－'); s.set('au4_red', '－'); await s.settle();
  s.click('r2'); await s.settle(); s.click('au4'); await s.settle();
  has('dash = no mana condition', last(s).macro, '{{head=권한 마법}}');
  has('dash ok', last(s).macro, '{{ok=1}}');

  // ── 고발 공격 + 〈어택〉 (75쪽): 1 이상일 때만 · 〈브레이크〉 표시
  s.set('acc_power', '3'); s.set('acc_count', '2'); s.set('attack', '1'); s.set('break', '2'); await s.settle();
  s.click('atk'); await s.settle();
  has('attack adds', last(s).macro, '{{big=7}} {{how=위력 3 × 횟수 2 + 어택 1}} {{note=브레이크 2: 상대의 실드를 2 까지 무효}}');
  s.set('acc_count', '0'); await s.settle();
  s.click('atk'); await s.settle();
  has('no attack bonus on 0', last(s).macro, '{{big=0}} {{how=위력 3 × 횟수 0}} {{note=0 대미지 — 고발 공격은 일어나지 않은 것으로 본다}}');
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  // ── 피해: 실드 − 브레이크 · 리벤지 · 살해 (영광 절반 올림 빼앗김, 지속 효과 소멸) · 복원
  s = makeSim(HTML, { queries: { '받은 대미지': '4', '대미지 종류': '1', '상대의 브레이크': '1' } }); s.open(); await s.settle();
  s.set('hp_init', '7'); s.set('hp_restore', '4'); s.set('hp', '7'); s.set('shield', '2'); s.set('revenge', '1'); s.set('attack', '1'); await s.settle();
  s.click('hit'); await s.settle();
  has('hit computed first', last(s).macro, '{{tk=[[0]]}} {{hhow=[[0]]}} {{hres=[[0]]}} {{dm=[[?{받은 대미지|0}]]}} {{kd=[[?{대미지 종류|');
  eq('4 − (2 − 1) = 3, revenge', pick(last(s).computed, 'tk', 'hhow', 'hres'), { tk: 3, hhow: '대미지 4 − 실드 1 (브레이크 1)', hres: 'HP 7 → 4 · 리벤지: 공격한 쪽 HP −1' });
  eq('hp 4', g(s, 'hp'), ['4']);
  s.click('hit'); await s.settle(); s.set('glory', '5'); await s.settle();
  s.click('hit'); await s.settle();
  eq('killed: glory 5 → 2, effects gone', [last(s).computed.hres, ...g(s, 'hp', 'killed', 'glory', 'attack', 'shield', 'revenge')],
    ['HP 1 → 0 · 살해됨 · 영광 5 → 2 (빼앗김 3) · 지속 효과 소멸', '0', '1', '2', '', '', '']);
  s.click('hit'); await s.settle();
  eq('already killed', last(s).computed.hres, '이미 살해된 상태 — 복원까지 대상이 되지 않음');
  s.click('rest'); await s.settle();
  has('restore card', last(s).macro, '{{title=복원}} {{en=REFORMAT}} {{big=4}} {{how=HP 0 → 4 (복원치 4 · 상한 7)}} {{note=살해 해제}}');
  eq('restored', g(s, 'hp', 'killed'), ['4', '0']);
  s.click('rest'); await s.settle();
  eq('restore capped at initial', g(s, 'hp'), ['7']);
  not('no shield → no kind query', (s.click('hit'), await s.settle(), last(s).macro), '대미지 종류');
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  // ── 결말 마법 (84 · 85쪽): 암시 · 총마력 · 개찬 규모 · 마력 0
  s = makeSim(HTML, { queries: { '협력 기동으로': '6' } }); s.open(); await s.settle();
  s.set('mb', '9'); s.set('mr', '5'); await s.settle();
  s.click('b7'); await s.settle(); s.click('rk'); await s.settle(); s.click('jx'); await s.settle();
  s.click('endr'); await s.settle();
  has('end roll computed first', last(s).macro, '{{etot=[[0]]}} {{ehow=[[0]]}} {{escale=[[0]]}} {{eh1=[[0]]}} {{eh2=[[0]]}} {{eh3=[[0]]}} {{co=[[?{협력 기동으로 받은 마력|0}]]}}');
  eq('end roll', pick(last(s).computed, 'etot', 'ehow', 'escale', 'eh1', 'eh2', 'eh3'), { etot: 20, ehow: '내 마력 14 + 협력 6',
    escale: '총마력 20: 사건 일대에 있는 인물이나 사물을 자유롭게 조작하는 정도', eh1: '흑 7: 좌절 · 겁 · 무력 · 전사', eh2: '적 K: 종말 · 이별 · 사망 · 재생', eh3: '광대: 방랑 · 무구 · 광기 · 무모' });
  eq('ether 0, hand cleared', g(s, 'mb', 'mr', 'sum_n'), ['0', '0', '0']);
  s = makeSim(HTML, { queries: { '협력 기동으로': '0' } }); s.open(); await s.settle();
  s.set('mb', '15'); s.set('mr', '9'); await s.settle();
  s.click('endr'); await s.settle();
  eq('own max 20', pick(last(s).computed, 'etot', 'ehow'), { etot: 20, ehow: '내 마력 20 (최대 20, 가진 값 24)' });
  s.set('mb', '4'); await s.settle(); s.click('endr'); await s.settle();
  eq('9 or less', last(s).computed.escale, '총마력 9 이하: 마력이 적어 아무것도 개찬할 수 없다');
  errAll.push(...s.log.filter(l => l[0] === 'ERROR'));

  const errs = errAll;
  eq('no worker errors', errs.map(e => e[1].split('\n')[0]), []);
  console.log(`${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
