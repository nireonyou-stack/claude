// 둘이서 수사 시트 워커 — 기본 액션 · 【여유】 ± · 굴림(Custom Roll Parsing)
// DATA(기능 · 기벽 눈 · 감정 표 · 상태이상 · 기본 액션)는 build.py 가 아래 줄에 넣는다 (표는 한 곳에만)
// @DATA
const num = v => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };
const SKILL = {};                 // id → [이름, 분야]
DATA.skills.forEach(([g, items]) => items.forEach(([id, n]) => { SKILL[id] = [n, g]; }));

// ── 새 시트 · 종류를 바꿀 때: 액션이 비었으면 그 종류의 기본 액션을 첫 줄에.
//    다른 종류의 기본 액션 한 줄만 그대로 있으면(손대지 않음) 이 종류 것으로 바꾼다 — 탐정 ↔ 조수를 고르는 처음 한 번
const ensureAction = () => getAttrs(['sheet_type'], v => {
  const t = v.sheet_type || 'det', mine = DATA.actions[t];
  if (!mine) return;
  const put = row => setAttrs({ [`${row}name`]: mine[0], [`${row}type`]: mine[1], [`${row}cost`]: mine[2], [`${row}effect`]: mine[3] });
  getSectionIDs('actions', ids => {
    if (!ids.length) return put(`repeating_actions_${generateRowID()}_`);
    if (ids.length !== 1) return;
    const row = `repeating_actions_${ids[0]}_`;
    getAttrs(['name', 'type', 'cost', 'effect'].map(k => row + k), a => {
      const other = Object.entries(DATA.actions).find(([k, d]) => k !== t && a[row + 'name'] === d[0] && a[row + 'effect'] === d[3]);
      if (other) put(row);
    });
  });
});
on('sheet:opened', () => getAttrs(['sheet_version'], v => {
  if (num(v.sheet_version) >= 1) return;
  setAttrs({ sheet_version: 1 }, { silent: true });
  ensureAction();
}));
on('change:sheet_type', ensureAction);

// ── 【여유】 ▲▼ (0 아래로는 안 내려감)
[['reserveup', 1], ['reservedn', -1]].forEach(([btn, d]) => on(`clicked:${btn}`, () => getAttrs(['reserve'], v => setAttrs({ reserve: Math.max(0, (num(v.reserve) || 0) + d) }))));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드는 src/rolltemplate.html. computed 칸(res · dice · eff · d1~d3)은 매크로 앞쪽에 둔다.
// 매크로에 넣는 글: 템플릿 · 인라인 굴림 · 속성 호출을 깨뜨리는 문자를 바꾼다(줄바꿈은 공백)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const T = '&{template:futarisousa}';

// 기능 판정: 탐정은 10면체, 조수는 6면체를 1~3개 (개수는 굴릴 때 묻는다). 성공 · 스페셜은 판정 규칙에 따라 사람이 본다
Object.keys(SKILL).forEach(id => on(`clicked:r${id}`, () => getAttrs(['sheet_type', `sk_${id}`, 'character_name'], v => {
  const [name, group] = SKILL[id], asi = v.sheet_type === 'asi', die = asi ? 6 : 10;
  post(`${T} {{d1=[[1d${die}]]}} {{d2=[[1d${die}]]}} {{d3=[[1d${die}]]}} {{n=[[?{주사위 수|1|2|3}]]}}`
    + field('title', `${name} 판정`) + field('sub', `${group} · ${asi ? '조수 6면체' : '탐정 10면체'}`)
    + field('who', v.character_name) + (v[`sk_${id}`] === '1' ? '' : field('flag', '미습득')),
  r => ({ d1: r.d1.result, d2: r.d2.result, d3: r.d3.result }));
})));

// 기벽: 1D6 → 그 눈의 기벽
on('clicked:quirk', () => getAttrs(['quirk1', 'quirk2', 'quirk3', 'quirk4', 'quirk5', 'quirk6', 'character_name'], v => {
  post(`${T} {{dice=[[0]]}} {{res=[[0]]}} {{roll=[[1d6]]}}` + field('title', '기벽') + field('sub', '1D6') + field('who', v.character_name), r => {
    const k = r.roll.result;
    return { dice: DATA.faces[k - 1], res: v[`quirk${k}`] || '(비어 있음)' };
  });
}));

// 감정 표A: D66 — 두 눈 중 작은 것을 앞에 (11 · 12 … 66)
on('clicked:emoa', () => post(`${T} {{dice=[[0]]}} {{res=[[0]]}} {{a=[[1d6]]}} {{b=[[1d6]]}}` + field('title', '감정 표A') + field('sub', 'D66'), r => {
  const k = [r.a.result, r.b.result].sort((x, y) => x - y).join('');
  return { dice: k, res: (DATA.emoA.find(e => e[0] === k) || ['', '?'])[1] };
}));
// 감정 표B: D10
on('clicked:emob', () => post(`${T} {{dice=[[0]]}} {{res=[[0]]}} {{roll=[[1d10]]}}` + field('title', '감정 표B') + field('sub', 'D10'), r => {
  const k = String(r.roll.result);
  return { dice: k, res: (DATA.emoB.find(e => e[0] === k) || ['', '?'])[1] };
}));
// 상태이상: 1D6 → 이름 · 효과
on('clicked:status', () => post(`${T} {{dice=[[0]]}} {{res=[[0]]}} {{eff=[[0]]}} {{roll=[[1d6]]}}` + field('title', '상태이상') + field('sub', '1D6'), r => {
  const k = r.roll.result, s = DATA.status[k - 1];
  return { dice: k, res: s[0], eff: s[1] };
}));

// 액션: 채팅에 출력 (이름 · 타입 · 코스트 · 효과)
const rowOf = (e, sec) => { const m = `${e.sourceAttribute || ''} ${e.triggerName || ''}`.match(new RegExp(`repeating_${sec}_([^_\\s]+)_`, 'i')); return m ? `repeating_${sec}_${m[1]}_` : null; };
on('clicked:repeating_actions:use', e => {
  const row = rowOf(e, 'actions'); if (!row) return;
  getAttrs(['name', 'type', 'cost', 'effect'].map(k => row + k).concat('character_name'), v => {
    const g = k => v[row + k] || '';
    post(T + field('title', g('name') || '액션') + field('sub', [g('type'), g('cost') && `코스트 ${g('cost')}`].filter(Boolean).join(' · '))
      + field('who', v.character_name) + field('effect', g('effect')));
  });
});
