// 피카부 sheet worker — 자동 계산 (굴림은 아래 "굴림" 구역)
'use strict';

// ── 특기 리스트: 열 A~F = 불량 · 운동 · 친구 · 놀이 · 공부 · 어른, 특기 칸 A2~F12, 목표치 A2_value~
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FIELD_NAMES = ['불량', '운동', '친구', '놀이', '공부', '어른'];
const SK = [
  ['밤샘', '졸기', '무시', '거짓말', '욕', '장난', '꼼수', '숨기', '훔치기', '겁주기', '싸움'],
  ['수영', '나무 타기', '유연함', '마라톤', '점프', '달리기 시합', '균형', '던지기', '구기', '받아치기', '힘센'],
  ['인터넷', '소문', '다정함', '참기', '편지', '수다', '자전거', '용기', '약속', '리드하기', '비밀 기지'],
  ['컴퓨터', '게임', '모으기', '그림', '음악', '공상', '독서', '이야기 짓기', '퀴즈', '마술', '점'],
  ['실험', '우주', '생물', '공작', '계산', '숙제', '한자', '작문', '역사', '지리', '외국어'],
  ['법률', '꾸짖기', '치료', '매너', '추리', '계획성', '요리', '장보기', '멋내기', '연애', '도락']];
const GAPS = ['gap_a', 'gap_b', 'gap_c', 'gap_d', 'gap_e'];   // k 번째 공백 = k 번째 분야 오른쪽
const SLOTS = ['slot_a', 'slot_b', 'slot_c', 'slot_d', 'slot_e', 'slot_f'];   // 원기 슬롯 (분야 이름 옆 □)
const SKILL_IDS = COLS.flatMap(c => SK[0].map((_, r) => `${c}${r + 2}`));

const on1 = v => v === '1' || v === 1 || v === 'on';
const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[−－]/g, '-').trim(), 10); return Number.isNaN(n) ? null : n; };
const pos = id => ({ f: COLS.indexOf(id[0]), r: +id.slice(1) - 2 });

// ── 목표치 = 5 + 거리 (세로 한 칸 1, 옆 분야 2 · 칠한 공백을 건너면 1, 최대 12). 원기 슬롯에 체크한 분야의 습득 특기는 출발점이 못 됨
function dist(a, b, gap) {
  let d = Math.abs(a.r - b.r);
  for (let k = Math.min(a.f, b.f); k < Math.max(a.f, b.f); k++) d += gap[k];
  return d;
}
const TKEYS = [...SKILL_IDS, ...GAPS, ...SLOTS];
function targets(v) {
  const gap = GAPS.map(g => (on1(v[g]) ? 1 : 2));
  const src = SKILL_IDS.filter(id => on1(v[id])).map(pos).filter(p => !on1(v[SLOTS[p.f]]));
  const out = {};
  SKILL_IDS.forEach(id => { const p = pos(id); out[id] = src.length ? Math.min(12, 5 + Math.min(...src.map(s => dist(s, p, gap)))) : null; });
  return out;
}
const calcTargets = () => getAttrs(TKEYS, v => {
  const T = targets(v);
  setAttrs(Object.fromEntries(SKILL_IDS.map(id => [`${id}_value`, T[id] == null ? '' : String(T[id])])), { silent: true });
});
on([...TKEYS.map(k => `change:${k.toLowerCase()}`), 'sheet:opened'].join(' '), calcTargets);

// ── 펌블치 · 스페셜치: 기본 2 · 12 + 손 수정
const calcFumble = () => getAttrs(['fumble_adj', 'special_adj'], v => setAttrs({ fumble: 2 + (num(v.fumble_adj) || 0), special: 12 + (num(v.special_adj) || 0) }, { silent: true }));
on('change:fumble_adj change:special_adj sheet:opened', calcFumble);
[['fup', 'fumble_adj', 1], ['fdn', 'fumble_adj', -1], ['sup', 'special_adj', 1], ['sdn', 'special_adj', -1]].forEach(([b, k, d]) => {
  on(`clicked:${b}`, () => getAttrs([k], v => setAttrs({ [k]: Math.max(-12, Math.min(12, (num(v[k]) || 0) + d)) })));
});
on('clicked:frs', () => setAttrs({ fumble_adj: 0 }));
on('clicked:srs', () => setAttrs({ special_adj: 0 }));

// ── □ 칸 (재능 사용 · 부글부글 포인트 · 마력 슬롯): 누른 칸까지 채움, 채워진 마지막 칸을 다시 누르면 하나 줄임
[['talent_used', 6, ['tl']], ['muka', 10, ['mk']], ['muka', 5, ['smk']], ['mp', 30, ['ms']]].forEach(([attr, n, pres]) => {
  pres.forEach(p => { for (let k = 1; k <= n; k++) on(`clicked:${p}${k}`, () => getAttrs([attr], v => setAttrs({ [attr]: (num(v[attr]) || 0) === k ? k - 1 : k }))); });
});

// ── 졸음: 10~19 판정 −1, 20~29 −2 (30 = 행동 불능). 실패하면 5~14 +1, 15~24 +2, 25~29 +3. 단계(0~6)는 효과 칸 강조용
const sleepMod = s => (s >= 30 ? 0 : s >= 20 ? -2 : s >= 10 ? -1 : 0);
const sleepUp = s => (s >= 30 ? 0 : s >= 25 ? 3 : s >= 15 ? 2 : s >= 5 ? 1 : 0);
const calcSleep = () => getAttrs(['sleep'], v => { const s = Math.max(0, Math.min(30, num(v.sleep) || 0)); setAttrs({ sleep_mod: sleepMod(s), sleep_band: Math.min(6, Math.floor(s / 5)) }, { silent: true }); });
on('change:sleep sheet:opened', calcSleep);

// ── 새 시트
on('sheet:opened', () => getAttrs(['sheet_version'], v => { if ((num(v.sheet_version) || 0) < 1) setAttrs({ sheet_version: 1 }, { silent: true }); }));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드 템플릿은 src/rolltemplate.html. computed 칸(ok · total · up · tres)은 매크로 앞쪽에 둔다.
// 공개: roll_display_to 가 "/w gm " 이면 GM 에게 귓속말. 이노센트 시트면 {{in=1}} (카드 노랑 테마)

// 매크로에 넣는 글: 템플릿 · 인라인 굴림 · 속성 호출을 깨뜨리는 문자를 바꾼다(줄바꿈은 공백)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const prefix = v => (String(v.roll_display_to || '').trim() ? '/w gm ' : '');
const isIn = v => v.sheet_type !== 'sp';
const TPL = '&{template:peekaboo}';
const inf = v => (isIn(v) ? ' {{in=1}}' : '');   // computed 칸 뒤에 둔다
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const info = (v, { title, sub, eff, note }) => post(`${prefix(v)}${TPL}${inf(v)}${field('title', title)}${field('sub', sub)}${field('note', note)}${field('eff', eff)}`);

const fumOf = v => { const f = num(v.fumble); return f === null ? 2 : f; };
const spcOf = v => { const s = num(v.special); return s === null ? 12 : s; };
const sgn = n => (n > 0 ? `+${n}` : String(n));
const tgs = t => (t == null ? '' : ` · 목표치 ${t}`);
const CTX = [...TKEYS, 'roll_display_to', 'fumble', 'special', 'mod', 'sleep', 'sheet_type'];
const withCtx = (extra, cb) => getAttrs([...CTX, ...extra], v => cb(v, targets(v)));
const sleepOf = v => (isIn(v) ? Math.max(0, Math.min(30, num(v.sleep) || 0)) : 0);

// 판정: 2D6 합(눈) ≥ 스페셜치 → 스페셜, ≤ 펌블치 → 펌블, 아니면 합 + 수정이 목표치 이상이면 성공.
// 이노센트는 졸음 수정을 더하고, 실패 · 펌블이면 졸음 증가치(up)를 카드에 적는다 (자동으로 올리지는 않음)
function check(v, { title, sub, target }) {
  const fb = fumOf(v), sp = spcOf(v), sl = sleepOf(v), add = (num(v.mod) || 0) + sleepMod(sl), inc = sleepUp(sl);
  const s = `${prefix(v)}${TPL} {{ok=[[0]]}} {{total=[[0]]}}${inc ? ' {{up=[[0]]}}' : ''} {{d1=[[1d6]]}} {{d2=[[1d6]]}}${inf(v)}${add ? field('add', sgn(add)) : ''}${field('title', title)}${field('sub', sub)}`;
  post(s, R => {
    const n = R.d1.result + R.d2.result, t = n + add;
    const ok = n >= sp ? 1 : n <= fb ? 2 : target == null ? 0 : t >= target ? 3 : 4;
    const out = { ok, total: t };
    if (inc) out.up = ok === 2 || ok === 4 ? inc : 0;
    return out;
  });
}
const tail = v => {
  const parts = [], m = num(v.mod) || 0, sl = sleepMod(sleepOf(v));
  if (m) parts.push(`수정치 ${sgn(m)}`);
  if (sl) parts.push(`졸음 ${sl}`);
  if (fumOf(v) !== 2) parts.push(`펌블치 ${fumOf(v)}`);
  if (spcOf(v) !== 12) parts.push(`스페셜치 ${spcOf(v)}`);
  return parts.map(p => ` · ${p}`).join('');
};
function rollSkill(id, title) {
  const p = pos(id);
  withCtx([], (v, T) => {
    const t = title || `《${SK[p.f][p.r]}》 판정`;
    if (isIn(v) && sleepOf(v) >= 30) return info(v, { title: t, note: '졸음 30 · 행동 불능' });
    check(v, { title: t, sub: FIELD_NAMES[p.f] + tgs(T[id]) + tail(v), target: T[id] });
  });
}

// 특기 칸 이름 → 그 특기로 판정
on(SKILL_IDS.map(id => `clicked:r${id.toLowerCase()}`).join(' '), e => {
  const m = (e.triggerName || '').match(/clicked:r([a-f])(\d+)$/i);
  if (m) rollSkill(m[1].toUpperCase() + m[2]);
});
// 공포 판정: 처음 보는 오바케를 만나면 《용기》 (친구 8 = C9)
on('clicked:fear', () => rollSkill('C9', '공포 판정 《용기》'));

// 마법 사용: 마력에서 코스트를 빼고 카드
for (let i = 1; i <= 3; i++) {
  on(`clicked:mg${i}`, () => getAttrs([`mg${i}_name`, `mg${i}_cost`, `mg${i}_effect`, 'mp', 'roll_display_to', 'sheet_type'], v => {
    const cost = Math.max(0, num(v[`mg${i}_cost`]) || 0), before = Math.max(0, num(v.mp) || 0), after = Math.max(0, before - cost);
    setAttrs({ mp: after });
    info(v, { title: `【마법】 ${(v[`mg${i}_name`] || '').trim() || `마법 ${i}`}`, sub: `코스트 ${cost} · 마력 ${before} → ${after}`, eff: v[`mg${i}_effect`] });
  }));
}

// 랜덤 특기: 1D6 분야 · 2D6 특기
on('clicked:rsk', () => getAttrs(['roll_display_to', 'sheet_type'], v => {
  post(`${prefix(v)}${TPL} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}} {{te3=[[1d6]]}}${inf(v)}${field('title', '랜덤 특기')}`,
    R => { const f = R.te1.result - 1; return { tres: `${FIELD_NAMES[f]} · 《${SK[f][R.te2.result + R.te3.result - 2]}》` }; });
}));
[1, 2, 3].forEach(n => on(`clicked:nd${n}`, () => getAttrs(['roll_display_to', 'sheet_type'], v => {
  const ks = Array.from({ length: n }, (_, i) => `n${i + 1}`);
  post(`${prefix(v)}${TPL} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${inf(v)}${field('title', `${n}D6`)}`, R => ({ total: ks.reduce((a, k) => a + R[k].result, 0) }));
})));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
