// 적과 흑 sheet worker — 카드 패드 · 〔기동〕 계산 (주사위 없음)
'use strict';

const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[−－]/g, '-').trim(), 10); return Number.isNaN(n) ? null : n; };
const on1 = v => v === '1' || v === 1 || v === 'on';

// ── 카드: 코드 = 색(b 흑 · r 적) + 값(a 2~10 j q k), 광대 = jx. 숫자 카드 = 숫자 · 그림 카드 = 10 · A = 15 · 광대 = 15 (룰북 52쪽)
//    광대는 덱에 1장이고 적이면서 흑 — 흑 합계에도 적 합계에도 들어간다 (예전 코드 bx · rx 도 광대로 읽음)
const RANKS = ['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'];
const SLOTS = 10;
const SUIT = { b: ['♠', '♣'], r: ['♥', '♦'] };
const val = k => (k === 'x' || k === 'a' ? 15 : /^[jqk]$/.test(k) ? 10 : +k);
const label = k => (k === 'x' ? 'JK' : k.toUpperCase());
const PC = Array.from({ length: SLOTS }, (_, i) => `pc${i + 1}`);
const parse = code => {
  const m = String(code || '').match(/^([brj])(a|10|[2-9]|j|q|k|x)$/);
  if (!m || (m[1] === 'j' && m[2] !== 'x')) return null;
  return m[2] === 'x' ? { c: 'j', k: 'x' } : { c: m[1], k: m[2] };
};
const played = v => PC.map(k => parse(v[k])).filter(Boolean);
const sumOf = (cards, col) => cards.filter(c => c.c === col || c.c === 'j').reduce((a, c) => a + val(c.k), 0);   // 광대는 양쪽

// 낸 카드 칸을 다시 씀: 코드 · 표시 글자 · 무늬(같은 색 안에서 ♠♣ / ♥♦ 를 번갈아) · 합계
function writeHand(cards) {
  const out = {}, cnt = { b: 0, r: 0 };
  PC.forEach((k, i) => {
    const c = cards[i];
    if (!c) { out[k] = ''; out[`${k}_k`] = ''; out[`${k}_s`] = ''; return; }
    out[k] = c.c + c.k; out[`${k}_k`] = label(c.k); out[`${k}_s`] = c.c === 'j' ? '★' : SUIT[c.c][cnt[c.c]++ % 2];
  });
  out.sum_b = sumOf(cards, 'b');
  out.sum_r = sumOf(cards, 'r');
  out.sum_n = cards.length;
  setAttrs(out);
}
['b', 'r'].forEach(col => RANKS.forEach(k => on(`clicked:${col}${k}`, () => getAttrs(PC, v => {
  const cards = played(v);
  if (cards.length < SLOTS) writeHand([...cards, { c: col, k }]);
}))));
on('clicked:jx', () => getAttrs(PC, v => {
  const cards = played(v);
  if (cards.length < SLOTS && !cards.some(c => c.c === 'j')) writeHand([...cards, { c: 'j', k: 'x' }]);
}));
PC.forEach((_, i) => on(`clicked:pcx${i + 1}`, () => getAttrs(PC, v => {
  const cards = PC.map(k => parse(v[k]));
  if (!cards[i]) return;
  cards.splice(i, 1);
  writeHand(cards.filter(Boolean));
})));
on('clicked:clr', () => writeHand([]));

// ── 새 시트
on('sheet:opened', () => getAttrs(['sheet_version'], v => { if ((num(v.sheet_version) || 0) < 1) setAttrs({ sheet_version: 1, sum_b: 0, sum_r: 0, sum_n: 0 }, { silent: true }); }));

// ════════ 채팅 카드 — startRoll 로 보낸다 (굴림 없음) ════════
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const prefix = v => (String(v.roll_display_to || '').trim() ? '/w gm ' : '');
const TPL = '&{template:redblack}';
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));   // computed: 결과 → computed:: 값

// 〔기동〕 해석 (룰북 54쪽): 「흑：12」 = 흑 합계 12 이상, 「적：5」, 「？：10」 = 색 상관없이 합계 10 이상.
//   조건이 0 이어도 카드는 1장 이상 내야 한다. 「—」 = 이 마법은 기동할 수 없음. 빈칸 = 조건을 안 적음(검사 안 함)
//   언리미티드(unl): 낸 카드 1장을 적과 흑 양쪽으로 — 필요한 색이 아닌 카드 중 가장 큰 것을 고른다
const NOUSE = /^[—\-－―ー]+$/;
function boot(req, cards, unl) {
  const t = String(req || '').replace(/\s/g, '');
  if (NOUSE.test(t)) return { ok: false, nouse: 1 };
  const m = t.match(/^(흑|적|？|\?)[：:](\d+)$/);
  if (!m) return null;
  const col = m[1] === '?' ? '？' : m[1], need = +m[2], key = col === '흑' ? 'b' : col === '적' ? 'r' : '';
  let have = key ? sumOf(cards, key) : cards.reduce((a, c) => a + val(c.k), 0), lim = null;
  if (key && unl) {
    const off = cards.filter(c => c.c !== key && c.c !== 'j').sort((a, b) => val(b.k) - val(a.k))[0];
    if (off) { have += val(off.k); lim = off; }
  }
  return { ok: cards.length > 0 && have >= need, have, need, col, empty: !cards.length, lim };
}
function chips(cards) {
  const cnt = { b: 0, r: 0 };
  return cards.map((c, i) => (c.c === 'j' ? ` {{jk${i + 1}=1}}` : ` {{${c.c}k${i + 1}=${label(c.k)}}} {{${c.c}s${i + 1}=${SUIT[c.c][cnt[c.c]++ % 2]}}}`)).join('');
}
// 마법 기동: 조건을 맞췄거나 조건을 안 적었으면 낸 카드를 비운다
//   mana: 권한 마법의 〔마력〕 조건 (룰북 76쪽) — 지금 가진 흑 · 적의 마력이 둘 다 조건 이상이어야 기동. 마력은 쓰지 않는다
function invoke(v, { title, en, head, req, lvx, eff, acc, sup, unl, mana }) {
  const cards = played(v), c = boot(req, cards, unl), r = String(req || '').trim(), mNg = mana && mana.ng;
  let s = `${prefix(v)}${TPL}${field('title', title)}${field('en', en)}${field('head', head)}${acc ? ' {{acc=1}}' : ''}${sup ? ' {{sup=1}}' : ''}`;
  s += field('req', r || '—') + (/^흑/.test(r) ? ' {{reqb=1}}' : /^적/.test(r) ? ' {{reqr=1}}' : '') + (mNg || (c && !c.ok) ? ' {{ng=1}}' : c ? ' {{ok=1}}' : '');
  s += cards.length ? `${chips(cards)} {{sb=${sumOf(cards, 'b')}}} {{sr=${sumOf(cards, 'r')}}} {{sn=${cards.length}}}` : ' {{none=1}}';
  const notes = [];
  if (mNg) notes.push(`〔마력〕 흑 ${mana.b} / 적 ${mana.r} 필요 — 지금 흑 ${mana.hb} · 적 ${mana.hr}`);
  if (c && c.lim) notes.push(`언리미티드: ${c.lim.c === 'r' ? '적' : '흑'} ${label(c.lim.k)} 를 ${c.col}으로도 취급`);
  if (c && c.nouse) notes.push('기동할 수 없는 마법');
  else if (c && c.empty) notes.push('카드를 1장 이상 내야 함');
  else if (c && !c.ok) notes.push(`${c.col === '？' ? '합계' : `${c.col} 합계`} ${c.have} / 필요 ${c.need}`);
  s += field('note', notes.join(' · '));
  s += field('lvx', lvx) + field('eff', eff);
  post(s);
  if (!mNg && (!c || c.ok)) writeHand([]);
}

// 기본 선언 (이름 · 본문 · LV2/LV3 효과는 인쇄 → 워커가 가진다. LV 효과는 룰북 64~66쪽)
const BASIC = [['현장 재구축', '오브젝트 1개를 대상으로, 대상을 소환해 질문 1개에 답하게 한다. 대상은 자신의 인식으로 증언하고, 진실로 등록한다.\n증언에서는 거짓말을 하지 않지만, 대상의 지성으로는 이해할 수 없는 정보는 증언할 수 없다.'],
  ['인물 재구축', '캐스트 1명을 대상으로, 대상을 소환해 질문 1개에 답하게 한다. 대상은 자신의 인식으로 증언하고, 진실로 등록한다.\n증언에서는 거짓말을 하지 않지만, 모르는 정보는 증언할 수 없고, 오인한 정보도 그대로 말한다.'],
  ['심문 선고', '당신을 대상으로, YES / NO 로 답할 수 있는 질문을 하고, GM 은 답이 YES 면 YES 라고 답하고, 진실로 등록한다.\n답이 NO 인 경우나, 애초에 시나리오 안에 답이 없으면 "불명" 이라고 GM 은 고한다.'],
  ['물질 재변성', '오브젝트 1개를 대상으로, 대상 크기가 손바닥 크기라면, 다른 것으로 바꾼다, 라는 환상으로 등록한다.\n어떤 형상과 기능을 가질지는 자유롭게 정한다.'],
  ['서약 재설정', '캐스트 1명을 대상으로, 대상의 마음을 세뇌해, 지정한 하루, 대상이 "절대 하지 않는 금칙" 을 정해서, 환상으로 등록한다.\n대상이 금칙의 행동을 하지 않는 것이 보장된다.\n대상이 직접 사망하는 룰은 설정할 수 없다.'],
  ['각본 검색', '단어 최대 2개를 대상으로, GM 은 대상 전부를 포함한 미발견 각본을 검색해, 해당한 수가 1건이면 환상으로 등록한다.\n해당이 1건이 아닌 경우, 해당 건수만 알 수 있다.']];
const LV = [["인간 수준의 지성과 기억력을 준다", "증언뿐 아니라 대상이 본 광경을 감시 카메라처럼 재생해 볼 수 있다"], ["증언 중 캐스트 자신이 잘못 인식한 부분을 GM 이 알려 준다", "증언뿐 아니라 캐스트가 본 광경을 감시 카메라처럼 재생해 볼 수 있다"], ["GM 에게서 NO 라는 답도 얻을 수 있다 (불명 = 시나리오에 없음)", "선택지 2개를 정해 GM 이 답을 고르게 한다 (알맞은 답이 없으면 불명)"], ["사람 크기까지 바꿀 수 있다", "집 1채 크기까지 바꿀 수 있다"], ["금칙을 영속적으로 (태어나서 죽을 때까지) 정할 수 있다", "캐스트에게 「해야 하는 의무」를 선언할 수 있다"], ["OR 검색 (단어 2개 중 하나만 있어도 됨)", "NOT 검색 (단어 1개를 「포함하지 않음」으로)"]];
BASIC.forEach(([n, t], i) => {
  const k = `bc${i + 1}`;
  on(`clicked:${k}`, () => getAttrs([...PC, `${k}_lv`, `${k}_boot`, 'roll_display_to'], v => {
    const lv = num(v[`${k}_lv`]), lvx = [lv >= 2 && `LV2: ${LV[i][0]}`, lv >= 3 && `LV3: ${LV[i][1]}`].filter(Boolean).join(' / ');
    invoke(v, { title: n, en: 'BASIC CALLING', head: `선언 마법${lv ? ` · LV ${lv}` : ''}`, req: v[`${k}_boot`], lvx, eff: t });
  }));
});
for (let i = 1; i <= 6; i++) {
  const k = `nc${i}`;
  on(`clicked:${k}`, () => getAttrs([...PC, `${k}_name`, `${k}_lv`, `${k}_boot`, `${k}_text`, 'roll_display_to'], v => {
    const n = (v[`${k}_name`] || '').trim(), lv = num(v[`${k}_lv`]);
    if (n) invoke(v, { title: n, en: 'NOBLE CALLING', head: `선언 마법${lv ? ` · LV ${lv}` : ''}`, req: v[`${k}_boot`], eff: v[`${k}_text`] });
  }));
}
for (let i = 1; i <= 9; i++) {
  const k = `au${i}`;
  // 언리미티드(문장 3)는 고발 국면 중에만 → 권한 마법에만 적용
  on(`clicked:${k}`, () => getAttrs([...PC, `${k}_name`, `${k}_boot`, `${k}_text`, `${k}_acc`, `${k}_sup`, `${k}_black`, `${k}_red`, 'crest3_on', 'mb', 'mr', 'roll_display_to'], v => {
    const n = (v[`${k}_name`] || '').trim();
    if (!n) return;
    const b = Math.max(0, num(v[`${k}_black`]) || 0), r = Math.max(0, num(v[`${k}_red`]) || 0), hb = num(v.mb) || 0, hr = num(v.mr) || 0;
    const mana = { b, r, hb, hr, ng: hb < b || hr < r };
    invoke(v, { title: n, en: 'BATTLE MAGIC', head: `권한 마법${b || r ? ` · 〔마력〕 ${b}／${r}` : ''}`, req: v[`${k}_boot`], eff: v[`${k}_text`],
      acc: on1(v[`${k}_acc`]), sup: on1(v[`${k}_sup`]), unl: on1(v.crest3_on), mana });
  }));
}

// 고발 공격 (룰북 74 · 75쪽): 대미지 = 위력 × 횟수 (조서의 공격 + 정답 보너스를 더해 적는다), 1 이상이면 〈어택: X〉 +X.
//   0 대미지면 고발 공격 자체가 일어나지 않은 것으로 본다. 〈브레이크: X〉는 상대의 실드를 X 까지 무효 — 카드에 적어 GM 이 계산
const kw = (v, k) => Math.max(0, num(v[k]) || 0);
on('clicked:atk', () => getAttrs(['acc_power', 'acc_count', 'attack', 'break', 'roll_display_to'], v => {
  const p = kw(v, 'acc_power'), n = kw(v, 'acc_count'), base = p * n, a = base ? kw(v, 'attack') : 0, br = kw(v, 'break');
  post(`${prefix(v)}${TPL}${field('title', '고발 공격')} {{en=ACCUSATION}}${field('head', '적대 진영에')} {{big=${base + a}}}${field('how', `위력 ${p} × 횟수 ${n}${a ? ` + 어택 ${a}` : ''}`)}`
    + field('note', [!base && '0 대미지 — 고발 공격은 일어나지 않은 것으로 본다', base && br && `브레이크 ${br}: 상대의 실드를 ${br} 까지 무효`].filter(Boolean).join(' · ')));
}));

// 피해 (75 · 78쪽): 받은 대미지 − 실드(상대 브레이크만큼 무효) → HP. 「공격」 대미지에만 실드 · 리벤지. HP 0 이면 살해:
//   이츠와리가 영광의 절반(올림)을 빼앗고, 걸려 있던 지속 효과(어택 · 실드 · 브레이크 · 리벤지)가 사라진다
on('clicked:hit', () => getAttrs(['hp', 'glory', 'killed', 'shield', 'revenge', 'roll_display_to'], v => {
  const sh = kw(v, 'shield'), rv = kw(v, 'revenge'), kd = sh || rv;
  let s = `${prefix(v)}${TPL} {{tk=[[0]]}} {{hhow=[[0]]}} {{hres=[[0]]}} {{dm=[[?{받은 대미지|0}]]}}`;
  if (kd) s += ' {{kd=[[?{대미지 종류|공격 (실드 · 리벤지),1|직접 대미지,0}]]}}';
  if (sh) s += ' {{bk=[[?{상대의 브레이크|0}]]}}';
  s += `${field('title', '피해')} {{en=DAMAGE}} {{hit=1}}`;
  post(s, R => {
    const dm = Math.max(0, R.dm.result || 0), atk = kd ? R.kd.result === 1 : true, bk = sh ? Math.max(0, R.bk.result || 0) : 0;
    const es = atk ? Math.max(0, sh - bk) : 0, tk = Math.max(0, dm - es), hp0 = num(v.hp) || 0, hp = Math.max(0, hp0 - tk);
    const how = `대미지 ${dm}${es ? ` − 실드 ${es}` : ''}${bk && atk ? ` (브레이크 ${bk})` : ''}${kd && !atk ? ' · 직접 대미지' : ''}`;
    if (on1(v.killed)) return { tk, hhow: how, hres: '이미 살해된 상태 — 복원까지 대상이 되지 않음' };
    const out = { hp }, res = [`HP ${hp0} → ${hp}`];
    if (hp === 0 && tk > 0) {
      const g = num(v.glory) || 0, lose = Math.ceil(g / 2);
      Object.assign(out, { killed: 1, glory: g - lose, attack: '', shield: '', break: '', revenge: '' });
      res.push('살해됨', `영광 ${g} → ${g - lose} (빼앗김 ${lose})`, '지속 효과 소멸');
    } else if (atk && tk >= 1 && rv) res.push(`리벤지: 공격한 쪽 HP −${rv}`);
    setAttrs(out);
    return { tk, hhow: how, hres: res.join(' · ') };
  });
}));

// 복원 (80쪽, 고발 국면의 재초기화): 살해 해제, HP + 복원치 (상한 = 초기치)
on('clicked:rest', () => getAttrs(['hp', 'hp_init', 'hp_restore', 'killed', 'roll_display_to'], v => {
  const hp0 = num(v.hp) || 0, add = kw(v, 'hp_restore'), max = num(v.hp_init), hp = max == null ? hp0 + add : Math.min(max, hp0 + add), k = on1(v.killed);
  setAttrs({ hp, killed: 0 });
  post(`${prefix(v)}${TPL}${field('title', '복원')} {{en=REFORMAT}} {{big=${hp}}}${field('how', `HP ${hp0} → ${hp} (복원치 ${add}${max == null ? '' : ` · 상한 ${max}`})`)}${k ? field('note', '살해 해제') : ''}`);
}));

// 결말 마법 (84 · 85쪽): 낸 카드마다 암시표의 단어 4 개 중 1 개를 골라 진실의 선언을 만든다. 총마력 = 내 흑 + 적의 마력
//   (한 명이 가질 수 있는 최대 20) + 협력 기동으로 받은 마력 → 개찬 규모. 기동이 끝나면 내 흑 · 적의 마력은 0
const HINT = {
  b: { a: '헤맴 · 실패 · 흥미 · 재해', 2: '냉대 · 착오 · 전락 · 비참', 3: '낭비 · 질투 · 원한 · 이혼', 4: '빚 · 오만 · 실각 · 추락', 5: '책임 · 고독 · 왜곡 · 병사',
    6: '이혼 · 바람 · 배신 · 투옥', 7: '좌절 · 겁 · 무력 · 전사', 8: '체념 · 무모함 · 남용 · 중상', 9: '고독 · 노해 · 상실 · 빈곤', 10: '불행 · 실연 · 전락 · 사고',
    j: '분쟁 · 범죄 · 응보 · 처형', q: '처벌 · 사욕 · 망각 · 사고', k: '고통 · 파멸 · 공황 · 자살' },
  r: { a: '창조 · 출발 · 성장 · 탐정', 2: '해명 · 직감 · 학문 · 증인', 3: '미려 · 조화 · 결혼 · 풍요', 4: '지배 · 재산 · 권력 · 경찰', 5: '평화 · 도움 · 관용 · 검시',
    6: '연애 · 정열 · 공감 · 친구', 7: '승리 · 행동 · 독립 · 영웅', 8: '의지 · 용기 · 희생 · 범인', 9: '진상 · 정적 · 현명 · 기자', 10: '운명 · 호기 · 역전 · 흑막',
    j: '공정 · 균형 · 정의 · 용서', q: '헌신 · 자애 · 희생 · 시체', k: '종말 · 이별 · 사망 · 재생' },
  j: { x: '방랑 · 무구 · 광기 · 무모' } };
const SCALE = [[50, '사건 발생 전의 가까운 과거로 거슬러 올라가 영향을 미치는 정도'], [40, '정부나 세계 수준으로 정보 통제나 개찬을 할 수 있는 정도'],
  [30, '미디어나 기업, 경찰 등 큰 조직을 뜻대로 움직이는 정도'], [20, '사건 일대에 있는 인물이나 사물을 자유롭게 조작하는 정도'],
  [15, '캐스트 1명분의 앞으로의 인생을 조작할 수 있는 정도'], [10, '눈에 띄게 부자연스럽지 않을 만큼 우연을 조작할 수 있는 정도']];
const cardName = c => (c.c === 'j' ? '광대' : `${c.c === 'b' ? '흑' : '적'} ${label(c.k)}`);
on('clicked:endr', () => getAttrs([...PC, 'mb', 'mr', 'roll_display_to'], v => {
  const cards = played(v), own0 = (num(v.mb) || 0) + (num(v.mr) || 0), own = Math.min(20, own0);
  const s = `${prefix(v)}${TPL} {{etot=[[0]]}} {{ehow=[[0]]}} {{escale=[[0]]}} ${cards.map((_, i) => `{{eh${i + 1}=[[0]]}}`).join(' ')} {{co=[[?{협력 기동으로 받은 마력|0}]]}}`
    + `${field('title', '결말 마법')} {{en=END ROLL}} {{endr=1}}${cards.length ? `${chips(cards)} {{sb=${sumOf(cards, 'b')}}} {{sr=${sumOf(cards, 'r')}}} {{sn=${cards.length}}}` : ' {{none=1}}'}`;
  post(s, R => {
    const co = Math.max(0, R.co.result || 0), tot = own + co, sc = SCALE.find(([t]) => tot >= t);
    setAttrs({ mb: 0, mr: 0 });
    writeHand([]);
    return { etot: tot, ehow: `내 마력 ${own}${own0 > 20 ? ` (최대 20, 가진 값 ${own0})` : ''}${co ? ` + 협력 ${co}` : ''}`,
      escale: sc ? `총마력 ${sc[0]}: ${sc[1]}` : '총마력 9 이하: 마력이 적어 아무것도 개찬할 수 없다',
      ...Object.fromEntries(cards.map((c, i) => [`eh${i + 1}`, `${cardName(c)}: ${HINT[c.c][c.k]}`])) };
  });
}));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
