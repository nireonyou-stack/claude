// 킬데스 비즈니스 sheet worker — 자동 계산 (굴림은 아래 "굴림" 구역)
'use strict';

// ── 특기 리스트: 열 A~F = 직업 · 동작 · 소품 · 의상 · 정동 · 소망, 특기 칸 A2~F12, 목표치 A2_value~
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FIELD_NAMES = ['직업', '동작', '소품', '의상', '정동', '소망'];
const SK = [
  ['무직', '예술가', '연구자', '가사 도우미', '학생', '악한', '노동자', '탐정', '거물', '의사', '공무원'],
  ['외치기', '번뜩이기', '베기', '휘두르기', '던지기', '때리기', '차기', '뛰기', '쏘기', '잡기', '기다리기'],
  ['피어스', '머리 장식', '총', '목걸이', '벨트', '안경', '모자', '시계', '검', '반지', '타투'],
  ['네이키드', '아웃도어', '에스닉', '힙합', '밀리터리', '포멀', '트래드', '고딕', '펑크', '메탈', '아이돌'],
  ['사랑', '기쁨', '기대', '초조', '자부', '분노', '슬픔', '질투', '공포', '수치', '혐오'],
  ['죽음', '복수', '승리', '지배', '획득', '번영', '강화', '안전', '건강', '장수', '삶']];
const GAPS = ['gap_a', 'gap_b', 'gap_c', 'gap_d', 'gap_e'];   // k 번째 공백 = k 번째 분야 오른쪽
const SKILL_IDS = COLS.flatMap(c => SK[0].map((_, r) => `${c}${r + 2}`));

const on1 = v => v === '1' || v === 1 || v === 'on';
const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[−－]/g, '-').trim(), 10); return Number.isNaN(n) ? null : n; };
const pos = id => ({ f: COLS.indexOf(id[0]), r: +id.slice(1) - 2 });
const findSkill = s => {
  const n = String(s || '').replace(/[《》〈〉<>\s]/g, '');
  for (let f = 0; f < 6; f++) { const r = SK[f].findIndex(x => x.replace(/\s/g, '') === n); if (r >= 0) return { f, r, id: `${COLS[f]}${r + 2}` }; }
  return null;
};

// ── 목표치 = 5 + 거리 (세로 한 칸 1, 옆 분야 2 · 칠한 공백을 건너면 1, 최대 12)
function dist(a, b, gap) {
  let d = Math.abs(a.r - b.r);
  for (let k = Math.min(a.f, b.f); k < Math.max(a.f, b.f); k++) d += gap[k];
  return d;
}
const TKEYS = [...SKILL_IDS, ...GAPS];
function targets(v) {
  const gap = GAPS.map(g => (on1(v[g]) ? 1 : 2));
  const src = SKILL_IDS.filter(id => on1(v[id])).map(pos);
  const out = {};
  SKILL_IDS.forEach(id => { const p = pos(id); out[id] = src.length ? Math.min(12, 5 + Math.min(...src.map(s => dist(s, p, gap)))) : null; });
  return out;
}
const calcTargets = () => getAttrs(TKEYS, v => {
  const T = targets(v);
  setAttrs(Object.fromEntries(SKILL_IDS.map(id => [`${id}_value`, T[id] == null ? '' : String(T[id])])), { silent: true });
});
on([...TKEYS.map(k => `change:${k.toLowerCase()}`), 'sheet:opened'].join(' '), calcTargets);

// ── 펌블치 · 스페셜치: 기본 2 · 12 + 손 수정 (공격 판정의 펌블치는 【리스크】 + 손 수정)
const calcFumble = () => getAttrs(['fumble_adj', 'special_adj'], v => setAttrs({ fumble: 2 + (num(v.fumble_adj) || 0), special: 12 + (num(v.special_adj) || 0) }, { silent: true }));
on('change:fumble_adj change:special_adj sheet:opened', calcFumble);
[['fup', 'fumble_adj', 1], ['fdn', 'fumble_adj', -1], ['sup', 'special_adj', 1], ['sdn', 'special_adj', -1]].forEach(([b, k, d]) => {
  on(`clicked:${b}`, () => getAttrs([k], v => setAttrs({ [k]: Math.max(-12, Math.min(12, (num(v[k]) || 0) + d)) })));
});
on('clicked:frs', () => setAttrs({ fumble_adj: 0 }));
on('clicked:srs', () => setAttrs({ special_adj: 0 }));

// ── 토큰 (차지 · 블록 · 사망 횟수): 누른 칸까지 채움, 채워진 마지막 칸을 다시 누르면 하나 줄임
[['charge', 3, ['chg', 'tchg']], ['block', 3, ['blk', 'tblk']], ['deaths', 6, ['dth']]].forEach(([attr, n, pres]) => {
  pres.forEach(p => { for (let k = 1; k <= n; k++) on(`clicked:${p}${k}`, () => getAttrs([attr], v => setAttrs({ [attr]: (num(v[attr]) || 0) === k ? k - 1 : k }))); });
});

// ── 새 시트
on('sheet:opened', () => getAttrs(['sheet_version'], v => { if ((num(v.sheet_version) || 0) < 1) setAttrs({ sheet_version: 1 }, { silent: true }); }));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드 템플릿은 src/rolltemplate.html. computed 칸(ok · total · tres)은 매크로 앞쪽에 둔다.
// 공개: roll_display_to 가 "/w gm " 이면 GM 에게 귓속말

// 매크로에 넣는 글: 템플릿 · 인라인 굴림 · 속성 호출을 깨뜨리는 문자를 바꾼다(줄바꿈은 공백)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const prefix = v => (String(v.roll_display_to || '').trim() ? '/w gm ' : '');
const TPL = '&{template:killdeath}';
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const info = (v, { title, sub, eff, kv = [] }) => post(`${prefix(v)}${TPL}${field('title', title)}${field('sub', sub)}`
  + kv.map(([k, x], i) => (x ? field(`k${i + 1}`, k) + field(`v${i + 1}`, x) : '')).join('') + field('eff', eff));

const fumOf = v => { const f = num(v.fumble); return f === null ? 2 : f; };
const spcOf = v => { const s = num(v.special); return s === null ? 12 : s; };
const sgn = n => (n > 0 ? `+${n}` : String(n));
const tgs = t => (t == null ? '' : ` · 목표치 ${t}`);
const CTX = [...TKEYS, 'roll_display_to', 'fumble', 'special', 'fumble_adj', 'mod', 'charge'];
const withCtx = (extra, cb) => getAttrs([...CTX, ...extra], v => cb(v, targets(v)));

// 판정: 2D6 합(눈) ≥ 스페셜치 → 스페셜, ≤ 펌블치 → 펌블, 아니면 합 + 수정이 목표치 이상이면 성공
function check(v, { title, sub, target, add = 0, fumble, eff }) {
  const fb = fumble == null ? fumOf(v) : fumble, sp = spcOf(v);
  const s = `${prefix(v)}${TPL} {{ok=[[0]]}} {{total=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}}${add ? field('add', sgn(add)) : ''}${field('title', title)}${field('sub', sub)}${field('eff', eff)}`;
  post(s, R => {
    const n = R.d1.result + R.d2.result, t = n + add;
    return { ok: n >= sp ? 1 : n <= fb ? 2 : target == null ? 0 : t >= target ? 3 : 4, total: t };
  });
}
const modOf = v => num(v.mod) || 0;
const tail = (v, fb) => {
  const parts = [], m = modOf(v), sp = spcOf(v);
  if (m) parts.push(`수정치 ${sgn(m)}`);
  if (fb != null) parts.push(`펌블치 ${fb}`); else if (fumOf(v) !== 2) parts.push(`펌블치 ${fumOf(v)}`);
  if (sp !== 12) parts.push(`스페셜치 ${sp}`);
  return parts.map(p => ` · ${p}`).join('');
};

// 특기 칸 이름 → 그 특기로 판정
on(SKILL_IDS.map(id => `clicked:r${id.toLowerCase()}`).join(' '), e => {
  const m = (e.triggerName || '').match(/clicked:r([a-f])(\d+)$/i);
  if (!m) return;
  const id = m[1].toUpperCase() + m[2], p = pos(id);
  withCtx([], (v, T) => check(v, { title: `《${SK[p.f][p.r]}》 판정`, sub: FIELD_NAMES[p.f] + tgs(T[id]) + tail(v), target: T[id], add: modOf(v) }));
});

// 어빌리티 공격 판정: 지정특기의 목표치, 차지만큼 +, 펌블치 = 【리스크】 + 손 수정 (7 = 킬러 트릭, 레벨 없음)
for (let k = 1; k <= 7; k++) {
  const keys = [`ab${k}_name`, `ab${k}_level`, `ab${k}_effect`, `ab${k}_skill`];
  on(`clicked:ab${k}`, () => withCtx(keys, (v, T) => {
    const nm = (v[`ab${k}_name`] || '').trim() || '어빌리티', lv = k === 7 ? '' : (v[`ab${k}_level`] || '').trim();
    const sk = (v[`ab${k}_skill`] || '').replace(/[《》]/g, '').trim(), s = findSkill(sk), t = s ? T[s.id] : null;
    const ch = Math.max(0, num(v.charge) || 0), fb = k + (num(v.fumble_adj) || 0);
    const sub = [`리스크 ${k}`, lv && `레벨 ${lv}`, sk && `《${sk}》`].filter(Boolean).join(' · ') + tgs(t) + (ch ? ` · 차지 +${ch}` : '') + tail(v, fb);
    check(v, { title: `【${nm}】 공격 판정`, sub, target: t, add: ch + modOf(v), fumble: fb, eff: v[`ab${k}_effect`] });
  }));
}

// 관계 · 헬 사이버 · 서브플롯: 채팅에 출력
for (let i = 1; i <= 6; i++) {
  on(`clicked:rel${i}`, () => getAttrs([`rel${i}_name`, `rel${i}_attr`, `rel${i}_depth`, 'roll_display_to'], v => {
    const d = (v[`rel${i}_depth`] || '').trim(), a = (v[`rel${i}_attr`] || '').trim();
    info(v, { title: `【관계】 ${v[`rel${i}_name`] || ''}`.trim(), sub: [a && `속성 ${a}`, d && `심도 ${d}`].filter(Boolean).join(' · '), eff: d ? `판정에 ±${d}` : '' });
  }));
}
for (let i = 1; i <= 5; i++) {
  on(`clicked:cy${i}`, () => getAttrs([`cy${i}_name`, `cy${i}_effect`, 'roll_display_to'], v => {
    info(v, { title: `【헬 사이버】 ${v[`cy${i}_name`] || ''}`.trim(), eff: v[`cy${i}_effect`] });
  }));
}
on('clicked:sub', () => getAttrs(['sub_name', 'sub_clear', 'sub_reward', 'roll_display_to'], v => {
  info(v, { title: `【서브플롯】 ${v.sub_name || ''}`.trim(), kv: [['클리어 조건', v.sub_clear], ['보수', v.sub_reward]] });
}));

// 랜덤 특기: 1D6 분야 · 2D6 특기
on('clicked:rsk', () => getAttrs(['roll_display_to'], v => {
  post(`${prefix(v)}${TPL} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}} {{te3=[[1d6]]}}${field('title', '랜덤 특기')}`,
    R => { const f = R.te1.result - 1; return { tres: `${FIELD_NAMES[f]} · 《${SK[f][R.te2.result + R.te3.result - 2]}》` }; });
}));
[1, 2, 3].forEach(n => on(`clicked:nd${n}`, () => getAttrs(['roll_display_to'], v => {
  const ks = Array.from({ length: n }, (_, i) => `n${i + 1}`);
  post(`${prefix(v)}${TPL} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${field('title', `${n}D6`)}`, R => ({ total: ks.reduce((a, k) => a + R[k].result, 0) }));
})));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
