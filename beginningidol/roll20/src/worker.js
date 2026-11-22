// 비기닝 아이돌 sheet worker — 자동 계산 (굴림은 아래 "굴림" 구역)
'use strict';

// ── 특기 리스트: 열 A~F = 신장 · 속성 · 재능 · 캐릭터 · 취미 · 출신, 특기 칸 A2~F12, 목표치 A2_value~
//   캐릭터 7 (D7) · 취미 7 (E7) 은 직접 적는 칸 (이름 = D7_name · E7_name)
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FIELD_NAMES = ['신장', '속성', '재능', '캐릭터', '취미', '출신'];
const SK = [
  ['~125', '131', '136', '141', '146', '156', '166', '171', '176', '180', '190~'],
  ['에스닉', '다크', '섹시', '페미닌', '큐트', '플레인', '패션', '팝', '버닝', '쿨', '스타'],
  ['이국 문화', '스타일', '집중력', '담력', '체력', '미소', '운동 신경', '배려', '학력', '셀럽', '연기력'],
  ['중2병', '미스터리어스', '마이페이스', '연파', '말꼬리', '', '활기', '경파', '공손함', '덜렁이', '바보'],
  ['오컬트', '펫', '스포츠', '멋내기', '요리', '', '쇼핑', '댄스', '게임', '음악', '아이돌'],
  ['오키나와', '규슈', '시코쿠', '주고쿠', '긴키', '주부', '간토', '호쿠리쿠', '도호쿠', '홋카이도', '해외']];
const FREE = ['D7', 'E7'];
const GAPS = ['gap_a', 'gap_b', 'gap_c', 'gap_d', 'gap_e'];   // k 번째 공백 = k 번째 분야 오른쪽
const SKILL_IDS = COLS.flatMap(c => SK[0].map((_, r) => `${c}${r + 2}`));
const STATS = { voice: '보이스', physical: '피지컬', visual: '비주얼' };

const on1 = v => v === '1' || v === 1 || v === 'on';
const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[−－]/g, '-').trim(), 10); return Number.isNaN(n) ? null : n; };
const pos = id => ({ f: COLS.indexOf(id[0]), r: +id.slice(1) - 2 });
const skName = (v, id) => { const p = pos(id); return SK[p.f][p.r] || String(v[`${id}_name`] || '').trim(); };
const findSkill = (v, s) => {
  const n = String(s || '').replace(/[《》〈〉<>\s]/g, '');
  if (!n) return null;
  const id = SKILL_IDS.find(k => skName(v, k).replace(/\s/g, '') === n);
  return id ? { ...pos(id), id } : null;
};

// ── 목표치 = 5 + 거리 (세로 한 칸 1, 옆 분야 2 · 칠한 공백을 건너면 1, 최대 12)
function dist(a, b, gap) {
  let d = Math.abs(a.r - b.r);
  for (let k = Math.min(a.f, b.f); k < Math.max(a.f, b.f); k++) d += gap[k];
  return d;
}
const TKEYS = [...SKILL_IDS, ...GAPS, ...FREE.map(id => `${id}_name`)];
function targets(v) {
  const gap = GAPS.map(g => (on1(v[g]) ? 1 : 2));
  const src = SKILL_IDS.filter(id => on1(v[id])).map(pos);
  const out = {};
  SKILL_IDS.forEach(id => { const p = pos(id); out[id] = src.length ? 5 + Math.min(...src.map(s => dist(s, p, gap))) : null; });   // 룰북 2·02: 목표치 상한 없음
  return out;
}
const calcTargets = () => getAttrs(TKEYS, v => {
  const T = targets(v);
  setAttrs(Object.fromEntries(SKILL_IDS.map(id => [`${id}_value`, T[id] == null ? '' : String(T[id])])), { silent: true });
});
on([...SKILL_IDS, ...GAPS].map(k => `change:${k.toLowerCase()}`).concat('sheet:opened').join(' '), calcTargets);

// ── 펌블치 · 스페셜치: 기본 2 · 12 + 손 수정
// 룰북 2·04: 스페셜치는 13 이상이 되지 않고, 펌블치는 12 이상이 되지 않는다 (1 이하면 펌블 없음)
const calcFumble = () => getAttrs(['fumble_adj', 'special_adj'], v => setAttrs({ fumble: Math.min(11, 2 + (num(v.fumble_adj) || 0)), special: Math.min(12, 12 + (num(v.special_adj) || 0)) }, { silent: true }));
on('change:fumble_adj change:special_adj sheet:opened', calcFumble);
[['fup', 'fumble_adj', 1], ['fdn', 'fumble_adj', -1], ['sup', 'special_adj', 1], ['sdn', 'special_adj', -1]].forEach(([b, k, d]) => {
  on(`clicked:${b}`, () => getAttrs([k], v => setAttrs({ [k]: Math.max(-12, Math.min(12, (num(v[k]) || 0) + d)) })));
});
on('clicked:frs', () => setAttrs({ fumble_adj: 0 }));
on('clicked:srs', () => setAttrs({ special_adj: 0 }));

// ── 새 시트
on('sheet:opened', () => getAttrs(['sheet_version'], v => { if ((num(v.sheet_version) || 0) < 1) setAttrs({ sheet_version: 1 }, { silent: true }); }));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드 템플릿은 src/rolltemplate.html. computed 칸은 매크로 앞쪽에 둔다.
// 공개: roll_display_to 가 "/w gm " 이면 GM 에게 귓속말. 크라운 노선이면 카드에 cr (파랑 · ☆)

const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const prefix = v => (String(v.roll_display_to || '').trim() ? '/w gm ' : '');
const TPL = '&{template:beginningidol}';
const route = v => (v.route === 'crown' ? ' {{cr=1}}' : '');
const head = v => `${prefix(v)}${TPL}`;
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const info = (v, { title, sub, eff }) => post(`${head(v)}${route(v)}${field('title', title)}${field('sub', sub)}${field('eff', eff)}`);

const fumOf = v => { const f = num(v.fumble); return f === null ? 2 : f; };
const spcOf = v => { const s = num(v.special); return s === null ? 12 : s; };
const sgn = n => (n > 0 ? `+${n}` : String(n));
const tgs = t => (t == null ? '' : ` · 목표치 ${t}`);
const modOf = v => num(v.mod) || 0;
const tail = v => {
  const parts = [], m = modOf(v);
  if (m) parts.push(`수정치 ${sgn(m)}`);
  if (fumOf(v) !== 2) parts.push(`펌블치 ${fumOf(v)}`);
  if (spcOf(v) !== 12) parts.push(`스페셜치 ${spcOf(v)}`);
  return parts.map(p => ` · ${p}`).join('');
};
const CTX = [...TKEYS, 'roll_display_to', 'route', 'fumble', 'special', 'mod'];
const withCtx = (extra, cb) => getAttrs([...CTX, ...extra], v => cb(v, targets(v)));

// 판정: 2D6 합(눈) ≥ 스페셜치 → 스페셜, ≤ 펌블치 → 펌블, 아니면 합 + 수정치가 목표치 이상이면 성공
// 펌블 표 (1D6): 유닛이 받는 변조 (룰북 2·04·02 · 5·01·06)
const FUMBLE = ['대실패로 세상에 유닛 전체에 대한 불신감이 감돌고 말았다. 유닛은 변조 「불온한 공기」를 받는다.',
  '대실패가 유닛 멤버 사이의 소통에 응어리로 남았다. 유닛은 변조 「미묘한 거리감」을 받는다.',
  '유닛 전체에 대실패를 두려워하는 분위기가 생기고 말았다. 유닛은 변조 「실패에 대한 불안」을 받는다.',
  '눈치채지 못한 사이에 부상을 입고 있었다. 대실패의 원인은 이것이다. 유닛은 변조 「멤버의 부상」을 받는다.',
  '대실패가 세상에 알려져 나쁜 쪽으로 해석되어 퍼졌다. 유닛은 변조 「논란」을 받는다.',
  '대실패가 유닛 전체의 분위기를 나쁘게 만들고 말았다. 유닛은 변조 「엇갈림」을 받는다.'];
function check(v, { title, sub, target, eff }) {
  const add = modOf(v);
  const s = `${head(v)} {{ok=[[0]]}} {{total=[[0]]}} {{fres=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{ft=[[1d6]]}}${add ? field('add', sgn(add)) : ''}${route(v)}${field('title', title)}${field('sub', sub)}${field('eff', eff)}`;
  post(s, R => {
    const n = R.d1.result + R.d2.result, t = n + add;
    const ok = n >= spcOf(v) ? 1 : n <= fumOf(v) ? 2 : target == null ? 0 : t >= target ? 3 : 4;
    return ok === 2 ? { ok, total: t, fres: FUMBLE[R.ft.result - 1] } : { ok, total: t };
  });
}

// 특기 칸 → 그 특기로 판정
on(SKILL_IDS.map(id => `clicked:r${id.toLowerCase()}`).join(' '), e => {
  const m = (e.triggerName || '').match(/clicked:r([a-f])(\d+)$/i);
  if (!m) return;
  const id = m[1].toUpperCase() + m[2], p = pos(id);
  withCtx([], (v, T) => check(v, { title: `《${skName(v, id) || '빈칸'}》 판정`, sub: FIELD_NAMES[p.f] + tgs(T[id]) + tail(v), target: T[id] }));
});

// 【일예돌파】: 지정특기를 개성 특기로 바꾸고 개성 목표치로 판정 (룰북 2·02)
on('clicked:kosei', () => withCtx(['kosei_skill', 'kosei_target'], v => {
  const sk = (v.kosei_skill || '').replace(/[《》]/g, '').trim(), t = num(v.kosei_target);
  check(v, { title: `【일예돌파】${sk ? ` 《${sk}》` : ''}`, sub: (t == null ? '개성 목표치 없음' : `개성 목표치 ${t}`) + tail(v), target: t });
}));

// 아이돌 스킬: 지정특기가 특기 리스트에 있으면 판정, 없으면 효과만
for (let i = 1; i <= 6; i++) {
  const keys = [`sk${i}_name`, `sk${i}_type`, `sk${i}_skill`, `sk${i}_effect`];
  on(`clicked:sk${i}`, () => withCtx(keys, (v, T) => {
    const nm = (v[`sk${i}_name`] || '').trim() || '아이돌 스킬', sk = (v[`sk${i}_skill`] || '').replace(/[《》]/g, '').trim(), s = findSkill(v, sk);
    const sub = [(v[`sk${i}_type`] || '').trim(), sk && `《${sk}》`].filter(Boolean).join(' · ');
    if (!s) return info(v, { title: `【${nm}】`, sub, eff: v[`sk${i}_effect`] });
    check(v, { title: `【${nm}】`, sub: sub + tgs(T[s.id]) + tail(v), target: T[s.id], eff: v[`sk${i}_effect`] });
  }));
}

// 아이돌 링크 (인쇄된 6 개): 채팅에 출력
const LINKS = [['멘탈 케어', '언제든지 사용할 수 있다. 캐릭터 한 명의 【멘탈】을 1D6점 상승시킨다.'],
  ['트레이닝+', '드라마 페이즈의 장면이 종료하기 직전에 사용할 수 있다. 그 장면의 장면 플레이어는 「특훈」을 한다.'],
  ['커버 포지션', '캐릭터 한 명이 판정의 주사위를 굴린 직후에 사용할 수 있다. 그 판정에 사용한 주사위를 모두 다시 굴린다.'],
  ['싱크로', '캐릭터 한 명이 퍼포먼스 판정을 한 직후(주사위를 제거하기 전)에 사용할 수 있다. 그 퍼포먼스에 사용한 주사위를 1개 골라 다시 굴린다.'],
  ['심퍼시', '캐릭터 한 명이 판정 혹은 퍼포먼스 판정을 한 직후에 사용할 수 있다. 그 PC에 대해 「이해」를 얻는다.'],
  ['디스커션', '언제든지 사용할 수 있다. 「변조」를 모두 회복한다.']];
LINKS.forEach(([n, e], i) => on(`clicked:link${i + 1}`, () => getAttrs(['roll_display_to', 'route'], v => info(v, { title: `【아이돌 링크】 ${n}`, eff: e }))));

// ── 퍼포먼스: 같은 눈은 모두 지우고 남은 눈의 합. 다 지워지면 미라클 10, 1~6 이 다 남으면 퍼펙트 미라클 30
//    능력치 7 이상은 익스텐션 (퍼포먼스 값 + 능력치−6). 주사위는 최대 6개 (OPEN_QUESTIONS)
function settle(all) {
  const count = {};
  all.forEach(x => { count[x] = (count[x] || 0) + 1; });
  return { gone: all.map(x => (count[x] > 1 ? 1 : 0)), left: all.filter(x => count[x] === 1) };
}
function scoreOf(left, n, none) {
  if (left.length === 6) return { pv: 30, pst: 2 };
  if (!left.length && n) return { pv: none, pst: none === 20 ? 3 : 1 };
  return { pv: left.reduce((a, c) => a + c, 0), pst: 0 };
}
Object.entries(STATS).forEach(([key, nm]) => on(`clicked:p${key}`, () => getAttrs([key, 'roll_display_to', 'route'], v => {
  const val = Math.max(0, num(v[key]) || 0), n = Math.min(6, val), ext = Math.max(0, val - 6);
  const ps = Array.from({ length: n }, (_, i) => `{{p${i + 1}=[[1d6]]}}`).join(' ');
  const s = `${head(v)} {{pv=[[0]]}} {{pst=[[0]]}} {{g1=[[0]]}} {{g2=[[0]]}} {{g3=[[0]]}} {{g4=[[0]]}} {{g5=[[0]]}} {{g6=[[0]]}} {{perf=1}} ${ps}${route(v)}`
    + `${field('title', `${nm} 퍼포먼스`)}${field('sub', `${nm} ${val} · 주사위 ${n}개`)}${ext ? field('note', `익스텐션 +${ext}`) : ''}`;
  post(s, R => {
    const all = Array.from({ length: n }, (_, i) => R[`p${i + 1}`].result), { gone, left } = settle(all), sc = scoreOf(left, n, 10);
    setAttrs({ last_left: left.join('') + (ext ? `.${ext}` : '') }, { silent: true });   // 심포니 기본값 (익스텐션은 . 뒤)
    return { pv: sc.pv + ext, pst: sc.pst, ...Object.fromEntries(gone.map((g, i) => [`g${i + 1}`, g])) };
  });
})));

// ── 심포니: 남은 주사위(이 시트의 마지막 퍼포먼스가 기본값, 눈을 이어 적음) + 새로 굴린 주사위 1~6개 → 같은 눈 제거
//    다 지워지면 미라클 싱크로 20, 1~6 이 다 남으면 퍼펙트 미라클 30
on('clicked:sym', () => getAttrs(['roll_display_to', 'route', 'last_left'], v => {
  const def = String(v.last_left || '').replace(/[^0-9.]/g, '') || '0';
  const qs = [1, 2, 3, 4, 5, 6].map(i => `{{q${i}=[[1d6]]}}`).join(' ');
  const s = `${head(v)} {{pv=[[0]]}} {{pst=[[0]]}} {{sym=[[0]]}} {{u1=[[0]]}} {{u2=[[0]]}} {{u3=[[0]]}} {{u4=[[0]]}} {{u5=[[0]]}} {{u6=[[0]]}}`
    + ` {{lft=[[?{남은 주사위 눈 (이어서 적기 · 익스텐션은 .숫자)|${def}}]]}} {{k=[[?{굴릴 주사위 수|1|2|3|4|5|6}]]}} {{sy=1}} ${qs}${route(v)}${field('title', '심포니')}`;
  post(s, R => {
    const [dg, ex] = String(R.lft.result).split('.'), ext = Math.max(0, parseInt(ex || '0', 10) || 0);
    const left0 = String(dg || '').replace(/[^1-6]/g, '').split('').map(Number).slice(0, 6);
    const k = Math.max(1, Math.min(6, R.k.result || 1)), fresh = [1, 2, 3, 4, 5, 6].slice(0, k).map(i => R[`q${i}`].result);
    const { left } = settle([...left0, ...fresh]), sc = scoreOf(left, left0.length + k, 20);
    return { pv: sc.pv + ext, pst: sc.pst, sym: `남은 ${left0.join(' ') || '없음'} + 새 ${fresh.join(' ')} → ${left.join(' ') || '없음'}${ext ? ` · 익스텐션 +${ext}` : ''}`,
      ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(i => [`u${i}`, i <= k ? 1 : 0])) };
  });
}));

// ── 리액션 표 · 랜덤 특기 · nD6
on('clicked:react', () => getAttrs(['roll_display_to', 'route', 're1', 're2', 're3', 're4', 're5', 're6'], v => {
  post(`${head(v)} {{tres=[[0]]}} {{te1=[[1d6]]}}${route(v)}${field('title', '리액션 표')}`, R => ({ tres: String(v[`re${R.te1.result}`] || '').trim() || '(빈칸)' }));
}));
on('clicked:rsk', () => getAttrs(['roll_display_to', 'route', 'D7_name', 'E7_name'], v => {
  post(`${head(v)} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}} {{te3=[[1d6]]}}${route(v)}${field('title', '랜덤 특기')}`,
    R => { const f = R.te1.result - 1, id = `${COLS[f]}${R.te2.result + R.te3.result}`; return { tres: `${FIELD_NAMES[f]} · 《${skName(v, id) || '빈칸'}》` }; });
}));
[1, 2, 3].forEach(n => on(`clicked:nd${n}`, () => getAttrs(['roll_display_to', 'route'], v => {
  const ks = Array.from({ length: n }, (_, i) => `n${i + 1}`);
  post(`${head(v)} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${route(v)}${field('title', `${n}D6`)}`, R => ({ total: ks.reduce((a, k) => a + R[k].result, 0) }));
})));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
