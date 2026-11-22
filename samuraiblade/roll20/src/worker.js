// 사무라이 블레이드 sheet worker — 자동 계산 (굴림은 아래 "굴림" 구역)
'use strict';

// ── 특기 리스트: 열 A~F = 재능 · 숙달 · 이지 · 신체 · 감성 · 심연, 특기 칸 A2~F12, 기본 목표치 A2_value~
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FIELD_NAMES = ['재능', '숙달', '이지', '신체', '감성', '심연'];
const SK = [
  ['질서', '괴물', '인덕', '천계', '방패', '꿈', '신기', '성신', '의료', '기도', '사랑'],
  ['현세', '이형', '경비', '규칙', '맨손', '땅', '곤봉', '수행', '기계', '각인', '기쁨'],
  ['창조', '요괴', '교섭', '계승', '총', '물', '활', '탐구', '학문', '주문', '슬픔'],
  ['파괴', '짐승', '운동', '혈통', '도검', '불꽃', '장병', '파사', '조종', '기공', '분노'],
  ['상야', '빙의', '지각', '운명', '편쇄', '바람', '닌구', '환상', '전뇌', '염력', '안락'],
  ['혼돈', '죽음', '은밀', '신비', '조아', '영혼', '주물', '윤회', '범죄', '마법', '미움']];
const SKILL_IDS = COLS.flatMap(c => SK[0].map((_, r) => `${c}${r + 2}`));
const ITEMS = [['방진', '배치 롤을 2회 실행해, 원하는 쪽을 선택할 수 있다.'], ['병기', '하급 봉마 1체를 전투 시트 상에서 배제할 수 있다.'],
  ['영측', '상급·특급 봉마 1체의 데이터를 알 수 있다. 봉마 어빌리티는 알 수 없다.'], ['약품', '생명력 완쾌나 BS 전체 해제. 전투 중엔 생명력 1D6 회복 or BS 1개 해제'],
  ['탈것', '즉시 전력 이동 한다. BS 【발묶임】이라도 사용 가능.'], ['호부', '【횟수: 사이클】인 사용완료 어빌리티를 재사용할 수 있다.']];
const PRINTED = [['무령각성', '혼백사', '선언', '자신', '세션', '생명력 전부 회복, BS 전체 해제 후 【각성】'], ['참찰전개', '혼백사', '선언', '자신', '세션', '손패에서 완성된 역을 【참패】로 전개'],
  ['화투동조', '혼백사', '선언', '자신', '세션', '손패가 최대가 될 때까지 화투 습득'], ['혼백산화', '혼백사', '선언', '자신', '세션', '【화투동조】와 같은 효과. 세션 종료 시 【은퇴】']];

const on1 = v => v === '1' || v === 1 || v === 'on';
const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[−－]/g, '-').trim(), 10); return Number.isNaN(n) ? null : n; };
const pos = id => ({ f: COLS.indexOf(id[0]), r: +id.slice(1) - 2 });
const findSkill = s => {
  const n = String(s || '').replace(/[《》〈〉<>\s]/g, '');
  for (let f = 0; f < 6; f++) { const r = SK[f].findIndex(x => x === n); if (r >= 0) return { f, r, id: `${COLS[f]}${r + 2}` }; }
  return null;
};

// ── 기본 목표치 = 5 + 거리 (세로 한 칸 1, 옆 분야 2, 최대 12). 공식 시트에 공백 칸이 없어 공백 칠하기는 없다. 판정 때 난이도를 더한다
const dist = (a, b) => Math.abs(a.r - b.r) + 2 * Math.abs(a.f - b.f);
function targets(v) {
  const src = SKILL_IDS.filter(id => on1(v[id])).map(pos), out = {};
  SKILL_IDS.forEach(id => { const p = pos(id); out[id] = src.length ? Math.min(12, 5 + Math.min(...src.map(s => dist(s, p)))) : null; });
  return out;
}
const calcTargets = () => getAttrs(SKILL_IDS, v => {
  const T = targets(v);
  setAttrs(Object.fromEntries(SKILL_IDS.map(id => [`${id}_value`, T[id] == null ? '' : String(T[id])])), { silent: true });
});
on([...SKILL_IDS.map(k => `change:${k.toLowerCase()}`), 'sheet:opened'].join(' '), calcTargets);

// ── 생명력 총합 = 기본치 + 장비품
on('change:hp_base change:hp_equip sheet:opened', () => getAttrs(['hp_base', 'hp_equip'], v => {
  const b = num(v.hp_base), e = num(v.hp_equip);
  setAttrs({ hp_max: b == null && e == null ? '' : (b || 0) + (e || 0) }, { silent: true });
}));

// ── 펌블치 · 스페셜치: 기본 2 · 12 + 손 수정
const calcFumble = () => getAttrs(['fumble_adj', 'special_adj'], v => setAttrs({ fumble: 2 + (num(v.fumble_adj) || 0), special: 12 + (num(v.special_adj) || 0) }, { silent: true }));
on('change:fumble_adj change:special_adj sheet:opened', calcFumble);
[['fup', 'fumble_adj', 1], ['fdn', 'fumble_adj', -1], ['sup', 'special_adj', 1], ['sdn', 'special_adj', -1]].forEach(([b, k, d]) => {
  on(`clicked:${b}`, () => getAttrs([k], v => setAttrs({ [k]: Math.max(-12, Math.min(12, (num(v[k]) || 0) + d)) })));
});
on('clicked:frs', () => setAttrs({ fumble_adj: 0 }));
on('clicked:srs', () => setAttrs({ special_adj: 0 }));

// ── 아이템 개수 칸 (0~3): 누른 칸까지, 채워진 마지막 칸을 다시 누르면 하나 줄임
for (let i = 1; i <= 6; i++) for (let k = 1; k <= 3; k++) on(`clicked:it${i}c${k}`, () => getAttrs([`it${i}_n`], v => setAttrs({ [`it${i}_n`]: (num(v[`it${i}_n`]) || 0) === k ? k - 1 : k })));

// ── 새 시트
on('sheet:opened', () => getAttrs(['sheet_version'], v => { if ((num(v.sheet_version) || 0) < 1) setAttrs({ sheet_version: 1 }, { silent: true }); }));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드 템플릿은 src/rolltemplate.html. computed 칸(ok · total · tres)은 매크로 앞쪽에 둔다.
// 공개: roll_display_to 가 "/w gm " 이면 GM 에게 귓속말

const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const prefix = v => (String(v.roll_display_to || '').trim() ? '/w gm ' : '');
const TPL = '&{template:samuraiblade}';
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const info = (v, { title, sub, eff, note }) => post(`${prefix(v)}${TPL}${field('title', title)}${field('sub', sub)}${field('note', note)}${field('eff', eff)}`);

const fumOf = v => { const f = num(v.fumble); return f === null ? 2 : f; };
const spcOf = v => { const s = num(v.special); return s === null ? 12 : s; };
const sgn = n => (n > 0 ? `+${n}` : String(n));
const DIF = { 0: '하급', 5: '중급', 10: '상급', 15: '특급' };
const CTX = [...SKILL_IDS, 'roll_display_to', 'fumble', 'special', 'mod', 'boost', 'dif', 'awakened', 'gs1', 'bs2'];
const withCtx = (extra, cb) => getAttrs([...CTX, ...extra], v => cb(v, targets(v)));

// 판정: 2D6 + 부스트 1 마다 1D6, 모두 더함. 처음 두 주사위 합 ≥ 스페셜치 → 스페셜, ≤ 펌블치 → 펌블, 아니면 합 + 수정이 목표치 이상이면 성공.
// 목표치 = 기본 목표치 + 난이도 (BS 주박이면 한 단계 위). 【각성】 부스트 +1, 공격(타이밍에 '공격') 때 GS 고양 부스트 +1
function check(v, T, { title, id, attack = false, eff, head }) {
  const p = pos(id), base = T[id];
  const sel = [0, 5, 10, 15].includes(num(v.dif)) ? num(v.dif) : 0, curse = on1(v.bs2) ? 5 : 0, dif = Math.min(15, sel + curse);
  const boost = Math.max(0, num(v.boost) || 0) + (on1(v.awakened) ? 1 : 0) + (attack && on1(v.gs1) ? 1 : 0);
  const nd = Math.min(8, 2 + boost), m = num(v.mod) || 0, t = base == null ? null : base + dif, fb = fumOf(v), sp = spcOf(v);
  const sub = [head, FIELD_NAMES[p.f], `${DIF[dif]}${dif ? ` +${dif}` : ''}`, t != null && `목표치 ${t}`, boost && `부스트 +${boost}`, m && `수정치 ${sgn(m)}`,
    fb !== 2 && `펌블치 ${fb}`, sp !== 12 && `스페셜치 ${sp}`].filter(Boolean).join(' · ');
  const notes = [curse && 'BS 주박 · 난이도 한 단계 위', on1(v.awakened) && '각성 · 부스트 +1', attack && on1(v.gs1) && 'GS 고양 · 부스트 +1'].filter(Boolean).join(' / ');
  const ks = Array.from({ length: nd }, (_, i) => `d${i + 1}`);
  const s = `${prefix(v)}${TPL} {{ok=[[0]]}} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${m ? field('add', sgn(m)) : ''}${field('title', title)}${field('sub', sub)}${field('note', notes)}${field('eff', eff)}`;
  post(s, R => {
    const two = R.d1.result + R.d2.result, tot = ks.reduce((a, k) => a + R[k].result, 0) + m;
    return { ok: two >= sp ? 1 : two <= fb ? 2 : t == null ? 0 : tot >= t ? 3 : 4, total: tot };
  });
}

// 특기 칸 이름 → 그 특기로 판정
on(SKILL_IDS.map(id => `clicked:r${id.toLowerCase()}`).join(' '), e => {
  const m = (e.triggerName || '').match(/clicked:r([a-f])(\d+)$/i);
  if (!m) return;
  const id = m[1].toUpperCase() + m[2], p = pos(id);
  withCtx([], (v, T) => check(v, T, { title: `《${SK[p.f][p.r]}》 판정`, id }));
});

// 어빌리티: 기능 칸의 특기로 판정 (특기가 아니면 효과만 채팅에). 인쇄된 4 줄은 말풍선 = 채팅
for (let lv = 2; lv <= 7; lv++) {
  const keys = ['name', 'cond', 'timing', 'skill', 'range', 'target', 'count', 'effect'].map(k => `ab${lv}_${k}`);
  on(`clicked:ab${lv}`, () => withCtx(keys, (v, T) => {
    const g = k => (v[`ab${lv}_${k}`] || '').trim(), nm = g('name') || '어빌리티', tim = g('timing'), sk = g('skill').replace(/[《》]/g, ''), s = findSkill(sk);
    if (!s) return info(v, { title: `【${nm}】`, sub: [tim && `타이밍 ${tim}`, g('target') && `대상 ${g('target')}`, g('count') && `회수 ${g('count')}`].filter(Boolean).join(' · '), eff: v[`ab${lv}_effect`] });
    check(v, T, { title: `【${nm}】`, id: s.id, attack: /공격/.test(tim), eff: v[`ab${lv}_effect`], head: [tim, `《${sk}》`].filter(Boolean).join(' · ') });
  }));
}
on('clicked:mr', () => withCtx(['mr_skill', 'mr_dmg'], (v, T) => {
  const sk = (v.mr_skill || '').replace(/[《》]/g, '').trim(), s = findSkill(sk), d = (v.mr_dmg || '').trim(), eff = `이동공격 ${d || '　'}점 / 전력공격에는 +1점`;
  if (!s) return info(v, { title: '【† 무령도】', sub: '이동공격 · 전력공격', eff });
  check(v, T, { title: '【† 무령도】', id: s.id, attack: true, eff, head: `이동공격 · 전력공격 · 《${sk}》` });
}));
PRINTED.forEach(([n, cond, tim, tgt, cnt, ef], i) => on(`clicked:pab${i + 1}`, () => getAttrs(['roll_display_to'], v => info(v, { title: `【${n}】`, sub: `조건 ${cond} · 타이밍 ${tim} · 대상 ${tgt} · 회수 ${cnt}`, eff: ef }))));

// 아이템 사용: 개수 하나 줄이고 효과를 채팅에
ITEMS.forEach(([n, e], i) => on(`clicked:it${i + 1}`, () => getAttrs([`it${i + 1}_n`, 'roll_display_to'], v => {
  const left = Math.max(0, Math.min(3, num(v[`it${i + 1}_n`]) || 0));
  if (!left) return info(v, { title: `【아이템】 ${n}`, note: '남은 개수 0' });
  setAttrs({ [`it${i + 1}_n`]: left - 1 });
  info(v, { title: `【아이템】 ${n} 사용`, sub: `남은 개수 ${left} → ${left - 1}`, eff: e });
})));

// 굴림표 (범용 장면 · 카르마 장면 = 2D6, 펌블 · 감정 = 1D6)
const TABLES = [['범용 장면 표', 2, { 2: '피 냄새가 콧속을 간질인다. 사건인가 사고인가? 무령도가 싸움의 기척을 알린다.', 3: '청렴한 분위기가 감돈다. 귀를 기울이면 새나 벌레 소리, 바람에 흔들리는 나무 소리가 들려온다.', 4: '높은 건물의 옥상. 주위를 한눈에 둘러볼 수 있는 곳에 서서 아래를 내려다본다.', 5: '세계의 끝 같은 암흑. 어둠 속에서 누군가의 기척이 꿈틀거린다…….', 6: '평온한 시간이 지나간다. 잠시나마 싸움을 잊을 수 있을 것 같다.', 7: '밝은 햇살에 감싸인다. 설령 절망의 구렁텅이에 있더라도 한 가닥 희망을 확신할 수 있다. 이 장면에서 개시 판정을 할 경우 「부스트+1」할 수 있다.', 8: '봉마의 시각, 상야와 현세의 경계선이 흔들리는 시각. 어디선가 분명치 않은 목소리나 소리가 새어 나온다.', 9: '갑자기 하늘을 구름이 뒤덮는다. 비가 내리기 시작하자 사람들이 처마를 찾아 뛰어간다.', 10: '한 줄기 바람이 지나간다. 머리카락과 옷이 크게 흔들리고, 무언가 일어날 예감이 든다.', 11: '사람들이 오가고 거리의 소란이 들려온다. 여느 때의 번화가 풍경이지만…….', 12: '이건…… 꿈인가? 끝났을 터인 과거가 기억 속에서 되살아난다.' }],
  ['카르마 장면 표', 2, { 2: '과거 기억의 한 페이지. 세피아 빛 세계는 마치 오래된 사진 같다.', 3: '눈이 내리는 차가운 하늘 아래, 온통 은빛 세계가 펼쳐져 있다.', 4: '청렴한 숲 속, 나뭇잎 사이로 햇살이 쏟아진다.', 5: '칠흑 같은 어둠. 하지만 어딘가 다정함을 느낄 수 있다.', 6: '하늘 가득한 별. 금방이라도 별이 쏟아질 것 같다.', 7: '커다란 빛에 감싸인 실루엣이 서서히 형태를 띠며 나타난다.', 8: '풀과 나무가 흔들리는 초원, 먼 하늘에 무지개가 걸려 있다.', 9: '바람이 휘몰아치는 옛 전장. 지난날의 싸움이 흔적으로 남아 있다.', 10: '마천루의 거리. 네온 속에는 자기 혼자밖에 없다.', 11: '쨍쨍 빛나는 태양 아래, 바다의 파도 소리가 들려온다.', 12: '미래 세계의 풍경. 그 세계에 자신은 있는 것일까!?' }],
  ['펌블 표', 1, { 1: '부조 — 뭔가 상태가 이상하다. 이 사이클 동안 화투와 어빌리티를 사용할 수 없게 된다.', 2: '불운 — 정신 차려 보니 없어졌다! 임의의 아이템 1개를 잃어버린다.', 3: '습격 — 방심했다! 자신의 【생명력】을 1D6점 잃는다.', 4: '계산 밖 — 통한의 실수! 자신 이외의 PC의 【생명력】을 1D6점 잃게 한다.', 5: '책모 — 적의 음모인가? 무작위로 【BS】 1개를 받는다.', 6: '소실 — 화투가 사라진다! 자신에게 손패가 있을 경우, 원하는 손패 1장을 버린다.' }],
  ['감정 표', 1, { 1: '공감(+감정) / 불신(−감정)', 2: '우정(+감정) / 분노(−감정)', 3: '애정(+감정) / 질투(−감정)', 4: '충성(+감정) / 모멸(−감정)', 5: '동경(+감정) / 열등감(−감정)', 6: '광신(+감정) / 살의(−감정)' }]];
TABLES.forEach(([n, d, tab], i) => on(`clicked:t${i + 1}`, () => getAttrs(['roll_display_to'], v => {
  post(`${prefix(v)}${TPL} {{tres=[[0]]}} {{te1=[[1d6]]}}${d === 2 ? ' {{te2=[[1d6]]}}' : ''}${field('title', n)}`,
    R => ({ tres: tab[R.te1.result + (d === 2 ? R.te2.result : 0)] || '' }));
})));
[1, 2].forEach(n => on(`clicked:nd${n}`, () => getAttrs(['roll_display_to'], v => {
  const ks = Array.from({ length: n }, (_, i) => `n${i + 1}`);
  post(`${prefix(v)}${TPL} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${field('title', `${n}D6`)}`, R => ({ total: ks.reduce((a, k) => a + R[k].result, 0) }));
})));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
