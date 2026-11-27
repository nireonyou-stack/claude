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
// 특기 표기 《분야n/특기》 (룰북 표기 — 모술11/유언비어). 특기 리스트에 없는 이름은 《이름》 그대로
const skTag = (v, s, name) => (s ? `《${FIELD_NAMES[s.f]}${s.r + 2}/${skName(v, s.id || `${COLS[s.f]}${s.r + 2}`) || '빈칸'}》` : `《${name}》`);
const findSkill = (v, s) => {
  const n = String(s || '').replace(/[《》〈〉<>\s]/g, '');
  if (!n) return null;
  const id = SKILL_IDS.find(k => skName(v, k).replace(/\s/g, '') === n);
  return id ? { ...pos(id), id } : null;
};

// ── 목표치 = 5 + 거리 (세로 한 칸 1, 옆 분야 2 · 칠한 공백을 건너면 1)
//   【연기파 아이돌】(acting, 아이돌 스킬 이름으로 켬 · 룰북 143): ① 공백을 모두 메움 ② 신장과 출신이 이어짐
//   예: 《190~》(신장 12)을 《해외》(출신 12)로 대용하면 목표치 6 → 이음매 1
const WRAP = 1;
function dist(a, b, gap, wrap) {
  const lo = Math.min(a.f, b.f), hi = Math.max(a.f, b.f);
  let direct = 0, around = WRAP;
  for (let k = 0; k < 5; k++) { if (k >= lo && k < hi) direct += gap[k]; else around += gap[k]; }
  return Math.abs(a.r - b.r) + (wrap ? Math.min(direct, around) : direct);
}
const TKEYS = [...SKILL_IDS, ...GAPS, ...FREE.map(id => `${id}_name`), 'acting'];
function targets(v) {
  const wrap = on1(v.acting), gap = GAPS.map(g => (wrap || on1(v[g]) ? 1 : 2));
  const src = SKILL_IDS.filter(id => on1(v[id])).map(pos);
  const out = {};
  SKILL_IDS.forEach(id => { const p = pos(id); out[id] = src.length ? 5 + Math.min(...src.map(s => dist(s, p, gap, wrap))) : null; });   // 룰북 2·02: 목표치 상한 없음
  return out;
}
const calcTargets = () => getAttrs(TKEYS, v => {
  const T = targets(v);
  setAttrs(Object.fromEntries(SKILL_IDS.map(id => [`${id}_value`, T[id] == null ? '' : String(T[id])])), { silent: true });
});
on([...SKILL_IDS, ...GAPS, 'acting'].map(k => `change:${k.toLowerCase()}`).concat('sheet:opened').join(' '), calcTargets);
// 아이돌 스킬 이름에 【연기파 아이돌】이 있으면 acting 을 켬 (시노비가미 시트의 인법 이름 방식)
const SKN = [1, 2, 3, 4, 5, 6].map(i => `sk${i}_name`);
on(SKN.map(k => `change:${k}`).concat('sheet:opened').join(' '), () => getAttrs([...SKN, 'acting'], v => {
  const act = SKN.some(k => /연기파\s*아이돌|演技派アイドル/.test(v[k] || '')) ? 1 : 0;
  if (act !== (on1(v.acting) ? 1 : 0)) setAttrs({ acting: act }, { silent: true }, calcTargets);
}));

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

// ── 마이 플랜: 【아이돌 볼티지】가 목표 볼티지 이상이 되면 달성 체크 (룰북 5·03·03, 체크는 지우지 않음)
on('change:idol_voltage change:plan_goalv', () => getAttrs(['idol_voltage', 'plan_goalv', 'plan_vol_done'], v => {
  const iv = num(v.idol_voltage), gv = num(v.plan_goalv);
  if (gv > 0 && iv !== null && iv >= gv && !on1(v.plan_vol_done)) setAttrs({ plan_vol_done: 1 });
}));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드 템플릿은 src/rolltemplate.html. computed 칸은 매크로 앞쪽에 둔다.
// 공개: roll_display_to 가 "/w gm " 이면 GM 에게 귓속말. 크라운 노선이면 카드에 cr (파랑 · ☆), 유닛 시트는 티아라 색

// 줄바꿈은 Roll20 의 %NEWLINE% 로 (날 줄바꿈은 채팅 명령을 끊는다)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, '%NEWLINE%').replace(/\{/g, '｛').replace(/\}/g, '｝')
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
const judge = (v, d, add, target, ft) => {
  const n = d[0] + d[1], t = n + add;
  const ok = n >= spcOf(v) ? 1 : n <= fumOf(v) ? 2 : target == null ? 0 : t >= target ? 3 : 4;
  return ok === 2 ? { ok, total: t, fres: FUMBLE[ft - 1] } : { ok, total: t };
};
// 마지막 굴림 (주사위 고치기 단추가 씀): last_dice = 눈을 이어 적은 글, last_roll = 다시 계산에 필요한 것 (JSON)
const remember = (dice, roll) => setAttrs({ last_dice: dice.join(''), last_roll: JSON.stringify(roll) }, { silent: true });
function check(v, { title, sub, target, eff }) {
  const add = modOf(v);
  const s = `${head(v)} {{ok=[[0]]}} {{total=[[0]]}} {{fres=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{ft=[[1d6]]}}${add ? field('add', sgn(add)) : ''}${route(v)}${field('title', title)}${field('sub', sub)}${field('eff', eff)}`;
  post(s, R => {
    const d = [R.d1.result, R.d2.result];
    remember(d, { k: 'check', title, sub, target, add, eff: eff || '' });
    return judge(v, d, add, target, R.ft.result);
  });
}

// 특기 칸 → 그 특기로 판정
on(SKILL_IDS.map(id => `clicked:r${id.toLowerCase()}`).join(' '), e => {
  const m = (e.triggerName || '').match(/clicked:r([a-f])(\d+)$/i);
  if (!m) return;
  const id = m[1].toUpperCase() + m[2], p = pos(id);
  withCtx([], (v, T) => check(v, { title: `${skTag(v, { ...p, id })} 판정`, sub: (tgs(T[id]) + tail(v)).replace(/^ · /, ''), target: T[id] }));
});

// 【일예돌파】: 지정특기를 개성 특기로 바꾸고 개성 목표치로 판정 (룰북 2·02)
//   사이드 PC 가 마이 플랜의 과제를 달성하면 개성 특기의 목표치 −1 (룰북 5·03·02)
on('clicked:kosei', () => withCtx(['kosei_skill', 'kosei_target', 'pc_role', 'plan_task_done'], v => {
  const sk = (v.kosei_skill || '').replace(/[《》]/g, '').trim(), t0 = num(v.kosei_target);
  const cut = t0 != null && (v.pc_role || 'side') === 'side' && on1(v.plan_task_done), t = cut ? t0 - 1 : t0;
  check(v, { title: `【일예돌파】${sk ? ` ${skTag(v, findSkill(v, sk), sk)}` : ''}`, sub: (t == null ? '개성 목표치 없음' : `개성 목표치 ${t}${cut ? ' (과제 달성 −1)' : ''}`) + tail(v), target: t });
}));

// 아이돌 스킬: 지정특기가 특기 리스트에 있으면 판정, 없으면 효과만
for (let i = 1; i <= 6; i++) {
  const keys = [`sk${i}_name`, `sk${i}_type`, `sk${i}_skill`, `sk${i}_effect`];
  on(`clicked:sk${i}`, () => withCtx(keys, (v, T) => {
    const nm = (v[`sk${i}_name`] || '').trim() || '아이돌 스킬', sk = (v[`sk${i}_skill`] || '').replace(/[《》]/g, '').trim(), s = findSkill(v, sk);
    const sub = [(v[`sk${i}_type`] || '').trim(), sk && skTag(v, s, sk)].filter(Boolean).join(' · ');
    if (!s) return info(v, { title: `【${nm}】`, sub, eff: v[`sk${i}_effect`] });
    check(v, { title: `【${nm}】`, sub: sub + tgs(T[s.id]) + tail(v), target: T[s.id], eff: v[`sk${i}_effect`] });
  }));
}

// 아이돌 링크: 채팅에 출력 (이름 · 효과는 직접 기입)
for (let i = 1; i <= 6; i++) on(`clicked:link${i}`, () => getAttrs(['roll_display_to', 'route', `link${i}_name`, `link${i}_text`], v =>
  info(v, { title: `【아이돌 링크】 ${String(v[`link${i}_name`] || '').trim()}`.trim(), eff: v[`link${i}_text`] })));

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
//    서포터는 퍼포먼스 판정에서 능력치를 모두 1 로 본다
Object.entries(STATS).forEach(([key, nm]) => on(`clicked:p${key}`, () => getAttrs([key, 'roll_display_to', 'route', 'pc_role'], v => {
  const sup = v.pc_role === 'support', val = sup ? 1 : Math.max(0, num(v[key]) || 0), n = Math.min(6, val), ext = Math.max(0, val - 6);
  const ps = Array.from({ length: n }, (_, i) => `{{p${i + 1}=[[1d6]]}}`).join(' ');
  const s = `${head(v)} {{pv=[[0]]}} {{pst=[[0]]}} {{g1=[[0]]}} {{g2=[[0]]}} {{g3=[[0]]}} {{g4=[[0]]}} {{g5=[[0]]}} {{g6=[[0]]}} {{perf=1}} ${ps}${route(v)}`
    + `${field('title', `${nm} 퍼포먼스`)}${field('sub', `${sup ? '서포터 · 능력치 1' : `${nm} ${val}`} · 주사위 ${n}개`)}${ext ? field('note', `익스텐션 +${ext}`) : ''}`;
  post(s, R => {
    const all = Array.from({ length: n }, (_, i) => R[`p${i + 1}`].result), { gone, left } = settle(all), sc = scoreOf(left, n, 10);
    setAttrs({ last_left: left.join('') + (ext ? `.${ext}` : '') }, { silent: true });   // 심포니 기본값 (익스텐션은 . 뒤)
    remember(all, { k: 'perf', title: `${nm} 퍼포먼스`, ext });
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
    remember([...left0, ...fresh], { k: 'sym', title: '심포니', ext });
    return { pv: sc.pv + ext, pst: sc.pst, sym: `남은 ${left0.join(' ') || '없음'} + 새 ${fresh.join(' ')} → ${left.join(' ') || '없음'}${ext ? ` · 익스텐션 +${ext}` : ''}`,
      ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(i => [`u${i}`, i <= k ? 1 : 0])) };
  });
}));

// ── 주사위 고치기: 마지막 판정 · 퍼포먼스 · 심포니의 눈을 물음 창에 보여 주고, 고친 눈으로 다시 계산
//    바꿀 눈은 숫자를 고쳐 적고(【추억】), 다시 굴릴 눈은 0. 앞자리 0 은 숫자에서 빠지므로 왼쪽을 0 으로 채움
const FIXQ = '주사위 눈 (바꿀 눈은 고쳐 적고 다시 굴릴 눈은 0)';
on('clicked:fix', () => getAttrs(['roll_display_to', 'route', 'fumble', 'special', 'last_dice', 'last_roll'], v => {
  let L = null;
  try { L = JSON.parse(v.last_roll || 'null'); } catch (e) { L = null; }
  const old = String(v.last_dice || '').replace(/[^1-6]/g, '').split('').map(Number);
  if (!L || !old.length) return info(v, { title: '주사위 고치기', eff: '고칠 굴림이 없습니다. 판정이나 퍼포먼스를 먼저 굴려 주세요.' });
  const n = old.length, ck = L.k === 'check', box = n <= 6, idx = Array.from({ length: n }, (_, i) => i + 1);
  const comp = ['fsub', ...(ck ? ['ok', 'total', 'fres'] : ['pv', 'pst']), ...(box ? idx.flatMap(i => [`f${i}`, `g${i}`]) : [])];
  const s = `${head(v)} ${comp.map(k => `{{${k}=[[0]]}}`).join(' ')} {{fq=[[?{${FIXQ}|${old.join('')}}]]}} ${idx.map(i => `{{x${i}=[[1d6]]}}`).join(' ')}`
    + `${ck ? ' {{ft=[[1d6]]}} {{fck=1}}' : ''} {{fx=1}}${ck && L.add ? field('add', sgn(L.add)) : ''}${route(v)}${field('title', `${L.title || '굴림'} · 주사위 고침`)}${ck ? field('eff', L.eff) : ''}`;
  post(s, R => {
    const typed = String(Math.abs(Math.trunc(R.fq.result || 0))).padStart(n, '0').slice(0, n).split('').map(Number);
    let re = 0;
    const dice = typed.map((d, i) => (d === 0 ? (re++, R[`x${i + 1}`].result) : d >= 1 && d <= 6 ? d : old[i]));
    const show = ds => ds.join(' ');
    const fsub = `${show(old)} → ${show(dice)}${re ? ` (다시 굴림 ${re}개)` : ''}`;
    const boxes = box ? Object.fromEntries(dice.flatMap((d, i) => [[`f${i + 1}`, d], [`g${i + 1}`, 0]])) : {};
    remember(dice, L);
    if (ck) return { fsub, ...boxes, ...judge(v, dice, L.add || 0, L.target == null ? null : L.target, R.ft.result) };
    const { gone, left } = settle(dice), ext = Math.max(0, num(L.ext) || 0), sc = scoreOf(left, n, L.k === 'sym' ? 20 : 10);
    if (L.k === 'perf') setAttrs({ last_left: left.join('') + (ext ? `.${ext}` : '') }, { silent: true });
    if (box) gone.forEach((g, i) => { boxes[`g${i + 1}`] = g; });
    return { fsub: fsub + ` → 남은 ${show(left) || '없음'}${ext ? ` · 익스텐션 +${ext}` : ''}`, ...boxes, pv: sc.pv + ext, pst: sc.pst };
  });
}));

// ── D66 표 (작은 눈이 십의 자리): 이해표 · 긍정 · 부정 이해표 (ポジネガ理解表, 룰북 6·01·03 ⑤) · 서포트 대응표 (8·01)
const D66 = (a, b) => Math.min(a, b) * 10 + Math.max(a, b);
const KEYS66 = [11, 12, 13, 14, 15, 16, 22, 23, 24, 25, 26, 33, 34, 35, 36, 44, 45, 46, 55, 56, 66];
const tab66 = list => Object.fromEntries(KEYS66.map((k, i) => [k, list[i]]));
const UTAB = tab66(['사람으로서는 좀……', '아이돌로서의 자세', '아이돌로서의 노력', '아이돌에 대한 마음', '배경', '목표',
  '대단한 사람이다!', '동료 의식', '나에 대한 마음', '거리감', '취향', '무슨 생각을 하는 걸까', '서툰 것', '패션 센스', '태도',
  '의외로 수수함 / 의외로 화려함', '말의 의도', '버릇', '금전 감각', '아이돌 활동할 때의 버릇', '모르는 게 있다는 걸 알았다']);
const PNTAB = tab66(['사랑해 / 미워', '대단해 / 성격이 안 맞아', '귀여워 / 분하지만 못 당하겠어', '멋있어 / 라이벌', '멋져 / 의견이 반대', '역시 / 인정하고 싶지 않아',
  '좋아…… / 안 좋아……', '나에게 없는 게 있어 / 마음에 안 들어', '흉내 낼 수 없어 / 흥미가 안 생겨', '모르는 걸 알고 있어 / 사과하고 싶어', '센스가 있어 / 진심으로 하는 거야?',
  '익숙해졌어 / 나한테 도움이 안 돼', '친해질 수 있을 것 같아 / 취미가 안 맞아', '이야기가 잘 통해 / 대화가 이어지지 않아', '같이 있으면 즐거워 / 되도록 피하고 싶어',
  '가족 같은 존재 / 알고 싶지도 않은 상대', '한 수 위로 인정해 / 음악성이 달라', '의욕이 있어 / 부러워',
  '여우 같아 / 너무 여우 같아', '계속 관계를 이어 가고 싶어 / 이용할 수 없어', '평생 따라가고 싶어 / 더는 못 어울려 주겠어']);
const TR = sk => `${sk}으로 「트러블 판정」을 한다.`, UM = '「유닛 멤버의 특훈」을 한다.', IL = '「아이돌 링크 획득」을 한다.';
const STAB = tab66([`유명한 트레이너에게 부탁해 특훈을 받는다. ${UM}`, `빈 시간을 써서 추가 레슨을 한다. ${UM}`, `지금 유닛 멤버의 자료를 보고, 무엇이 필요한지 생각한다. ${UM}`,
  `앞으로의 방침에 대해 아이돌들과 이야기할 시간을 만든다. ${IL}`, `앞으로 아이돌들이 의지할 수 있도록 자료를 모은다. ${IL}`, `아이돌들이 여유를 가질 수 있도록 휴가를 권한다. ${IL}`,
  `자기 자신을 돌아보고, 아이돌들과 어떻게 마주할지 정한다. ${IL}`, '지역 밖에서 오퍼가 왔다. 미리 그 지역의 유행을 조사하자. 출신 분야에서 무작위로 특기를 정하고, 그 특기로 「트러블 판정」을 한다.',
  `아이돌의 메이크업이나 의상이 어딘가 어색하다. ${TR('《멋내기》')}`, `아이돌의 댄스에 망설임이 보였다. ${TR('《댄스》')}`, `아이돌의 노래가 어딘가 어색하게 느껴졌다. ${TR('《음악》')}`,
  `여행을 떠나 기분 전환을 한다. ${IL}`, `아이돌의 스케줄이 너무 빡빡하다. 체력 배분에 신경 쓰자. ${TR('《배려》')}`, `아이돌에게 연기가 필요한 일이 들어왔다. 어떻게 연기 지도를 할까. ${TR('《연기력》')}`,
  `아이돌의 컨디션이 무너질 것 같은 조짐을 발견했다. 그렇게 되기 전에 대응하자. ${TR('《활기》')}`, `지금의 유행을 조사해서 아이돌 활동에 필요한 정보를 얻는다. ${UM}`,
  `라이벌이 될 그룹이 떠오르고 있다. 정체가 무엇인지 조사하자. ${TR('《아이돌》')}`, `일에 필요한 소품이 부족하다는 걸 알아차렸다. 서둘러 사러 가자. ${TR('《쇼핑》')}`,
  `유닛 멤버의 좋은 점을 찾아서 그걸로 격려한다. ${UM}`, `아이돌에게 해외 오퍼가 왔다. 외국어 실력을 시험받는다. ${TR('《해외》')}`, `유닛 멤버의 결점을 짚고, 그걸 어떻게 다룰지 이야기한다. ${UM}`]);
const roll66 = (v, title, tab) => post(`${head(v)} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}}${route(v)}${field('title', title)}`, R => {
  const k = D66(R.te1.result, R.te2.result);
  return { tres: `${k} ${tab[k]}` };
});
on('clicked:utab', () => getAttrs(['roll_display_to', 'route'], v => roll66(v, '이해표', UTAB)));
on('clicked:pntab', () => getAttrs(['roll_display_to', 'route'], v => roll66(v, '긍정 · 부정 이해표', PNTAB)));
//   서포트 대응표: 굵은 줄 = 할 일 (특훈 · 링크 · 트러블 판정 《특기》), 아래 = 표의 글. 23 은 출신 분야 무작위 특기 (숨은 2D6 h1 · h2)
on('clicked:support', () => getAttrs(['roll_display_to', 'route'], v => {
  post(`${head(v)} {{tres=[[0]]}} {{tlong=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}} {{h1=[[1d6]]}} {{h2=[[1d6]]}}${route(v)}${field('title', '서포트 대응표')}`, R => {
    const k = D66(R.te1.result, R.te2.result), text = STAB[k];
    const sk = k === 23 ? skTag(v, { f: 5, r: R.h1.result + R.h2.result - 2 }) : (text.match(/《[^》]+》/) || [''])[0];
    const what = text.includes(UM) ? '유닛 멤버의 특훈' : text.includes(IL) ? '아이돌 링크 획득' : `트러블 판정 ${sk}`;
    return { tres: `${k} ${what}`, tlong: text };
  });
}));

// ── 【추억】으로 멘탈 회복: 아직 쓰지 않은 추억 1개를 쓰고 【멘탈】 +1D6 (상한 50, 상한 80 체크 때 80)
on('clicked:memrec', () => getAttrs(['roll_display_to', 'route', 'mental', 'mental80', 'mem1', 'mem2', 'mem3', 'mem1_used', 'mem2_used', 'mem3_used'], v => {
  const k = [1, 2, 3].find(i => !on1(v[`mem${i}_used`]));
  if (!k) return info(v, { title: '【추억】 사용 · 멘탈 회복', eff: '남은 【추억】이 없습니다.' });
  const cur = num(v.mental) || 0, max = on1(v.mental80) ? 80 : 50, memo = String(v[`mem${k}`] || '').trim();
  post(`${head(v)} {{tres=[[0]]}} {{te1=[[1d6]]}}${route(v)}${field('title', '【추억】 사용 · 멘탈 회복')}${field('sub', `No.${k}${memo ? ` ${memo}` : ''}`)}`, R => {
    const to = Math.min(max, cur + R.te1.result);
    setAttrs({ mental: String(to), [`mem${k}_used`]: 1 });
    return { tres: `【멘탈】 ${cur} → ${to}` };
  });
}));

// ── 유닛 시트: 변조표 1D6 (같은 변조는 두 번 받지 않음) · 유닛 파워 · 의상은 채팅에 출력
const CONDS = [['불온한 공기', '유닛 멤버의 【멘탈】이 감소할 때, 감소하는 값을 1점 더 늘린다.'], ['미묘한 거리감', '유닛 멤버는 「이해」를 할 수 없게 된다.'],
  ['실패에 대한 불안', '유닛 멤버의 펌블치가 1점 상승한다.'], ['멤버의 부상', '유닛 멤버는 「막간」에 【멘탈】을 상승시킬 수 없게 된다.'],
  ['논란', '유닛 멤버가 퍼포먼스 판정을 할 때, 모든 능력치를 1점 낮은 것으로 취급한다.'], ['엇갈림', '유닛 멤버는 아이돌 링크를 사용할 수 없다.']];
on('clicked:cond', () => getAttrs(['roll_display_to', 'route', 'cond1', 'cond2', 'cond3', 'cond4', 'cond5', 'cond6'], v => {
  post(`${head(v)} {{tres=[[0]]}} {{te1=[[1d6]]}}${route(v)}${field('title', '변조표')}`, R => {
    const i = R.te1.result, [nm, ef] = CONDS[i - 1], had = on1(v[`cond${i}`]);
    if (!had) setAttrs({ [`cond${i}`]: 1 });
    return { tres: `「${nm}」 ${ef}${had ? ' (이미 받은 변조라 아무 일도 없음)' : ''}` };
  });
}));
for (let i = 1; i <= 5; i++) {
  on(`clicked:up${i}`, () => getAttrs(['roll_display_to', 'route', `up${i}_name`, `up${i}_type`, `up${i}_effect`], v => info(v, {
    title: `【${(v[`up${i}_name`] || '').trim() || '유닛 파워'}】`, sub: ['유닛 파워', (v[`up${i}_type`] || '').trim()].filter(Boolean).join(' · '), eff: v[`up${i}_effect`] })));
}
for (let i = 1; i <= 3; i++) {
  on(`clicked:cos${i}`, () => getAttrs(['roll_display_to', 'route', `cos${i}_brand`, `cos${i}_effect`], v => info(v, {
    title: `「${(v[`cos${i}_brand`] || '').trim() || '의상'}」`, sub: '의상', eff: v[`cos${i}_effect`] })));
}

// ── 리액션 표 · 랜덤 특기 · nD6
on('clicked:react', () => getAttrs(['roll_display_to', 'route', 're1', 're2', 're3', 're4', 're5', 're6'], v => {
  post(`${head(v)} {{tres=[[0]]}} {{te1=[[1d6]]}}${route(v)}${field('title', '리액션 표')}`, R => ({ tres: String(v[`re${R.te1.result}`] || '').trim() || '(빈칸)' }));
}));
on('clicked:rsk', () => getAttrs(['roll_display_to', 'route', 'D7_name', 'E7_name'], v => {
  post(`${head(v)} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}} {{te3=[[1d6]]}}${route(v)}${field('title', '랜덤 특기')}`,
    R => { const f = R.te1.result - 1, id = `${COLS[f]}${R.te2.result + R.te3.result}`; return { tres: skTag(v, { ...pos(id), id }) }; });
}));
[1, 2, 3].forEach(n => on(`clicked:nd${n}`, () => getAttrs(['roll_display_to', 'route'], v => {
  const ks = Array.from({ length: n }, (_, i) => `n${i + 1}`);
  post(`${head(v)} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${route(v)}${field('title', `${n}D6`)}`, R => ({ total: ks.reduce((a, k) => a + R[k].result, 0) }));
})));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
