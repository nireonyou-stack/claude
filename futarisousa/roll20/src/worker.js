// 둘이서 수사 시트 워커 — role · 【여유】 ± · 굴림 · 채팅 출력(Custom Roll Parsing)
// DATA(기능 · 기벽 눈 · 감정 표 · 상태이상 · 기본 액션 · 사전 조사 질문)는 build.py 가 아래 줄에 넣는다
// @DATA
const num = v => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };
const ROLE = { det: '탐정', asi: '조수' };

// ── 종류가 정해지거나 바뀔 때: 홈페이지가 읽는 role (탐정 · 조수, 그 밖은 빈 값)
const setup = () => getAttrs(['sheet_type'], v => setAttrs({ role: ROLE[v.sheet_type || 'det'] || '' }, { silent: true }));
on('sheet:opened', () => getAttrs(['sheet_version'], v => {
  if (num(v.sheet_version) >= 1) return;
  setAttrs({ sheet_version: 1 }, { silent: true });
  setup();
}));
on('change:sheet_type', setup);

// ── 【여유】 ▲▼ (0 아래로는 안 내려감)
[['calmup', 1], ['calmdn', -1]].forEach(([btn, d]) => on(`clicked:${btn}`, () => getAttrs(['calm'], v => setAttrs({ calm: Math.max(0, (num(v.calm) || 0) + d) }))));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드는 src/rolltemplate.html. computed 칸은 매크로 앞쪽에 둔다 (roll20kit/LESSONS.md 2장)
// 매크로에 넣는 글: 템플릿 · 인라인 굴림 · 속성 호출을 깨뜨리는 문자를 바꾼다(줄바꿈은 공백)
// 줄바꿈은 Roll20 의 %NEWLINE% 로 (날 줄바꿈은 채팅 명령을 끊는다)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, '%NEWLINE%').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const T = '&{template:futarisousa}';
const rows = list => list.filter(([, v]) => v).slice(0, 5).map(([k, v], i) => field(`k${i + 1}`, k) + field(`v${i + 1}`, v)).join('');

// 기능 판정 (룰 요약 「판정의 흐름」):
//   주사위 수 — 보통 2 · 【유리함】 3 · 【불리함】 1 (둘 다면 2) · 탐정 10면체 · 조수 6면체
//   눈 중 4 이상이 하나라도 → 성공 · 6 이 하나라도 → 스페셜(【여유】+1) · 모두 1 → 펌블(상태이상 · 【마음고생】+1)
//   조수가 4 이상을 냈으면 → 탐정이 조수에 대한 감정 1 · 【여유】+1
//   ok: 1 성공 · 2 실패 · 3 스페셜 · 4 펌블 (카드 도장 색)
const judge = ds => (ds.every(d => d === 1) ? [4, '펌블'] : ds.includes(6) ? [3, '스페셜'] : ds.some(d => d >= 4) ? [1, '성공'] : [2, '실패']);
const MODE = { 1: '불리함', 2: '보통', 3: '유리함' };
DATA.skills.forEach(([group, names], g) => names.forEach((name, i) => {
  const id = `skill_${g + 1}_${i + 1}`;
  on(`clicked:sk${g + 1}${i + 1}`, () => getAttrs(['sheet_type', id, 'character_name'], v => {
    const asi = v.sheet_type === 'asi', die = asi ? 6 : 10;
    post(`${T} {{ok=[[0]]}} {{res=[[0]]}} {{mode=[[0]]}} {{note=[[0]]}} {{hn=[[0]]}} {{d1=[[1d${die}]]}} {{d2=[[1d${die}]]}} {{d3=[[1d${die}]]}}`
      + ` {{n=[[?{판정|보통 (2개),2|유리함 (3개),3|불리함 (1개),1}]]}}`
      + field('title', `${name} 판정`) + field('sub', `${group} · ${asi ? '조수 6면체' : '탐정 10면체'}`)
      + field('who', v.character_name) + (v[id] === '1' ? '' : field('flag', '미습득')),
    r => {
      const n = Math.max(1, Math.min(3, r.n.result)), ds = [r.d1.result, r.d2.result, r.d3.result].slice(0, n), [ok, res] = judge(ds);
      const notes = [ok === 3 && '【여유】+1', ok === 4 && '상태이상 · 【마음고생】+1', asi && ds.some(d => d >= 4) && '탐정이 조수에 대한 감정 1 · 【여유】+1'].filter(Boolean);
      return { ok, res, mode: `${MODE[n]} ${n}D${die}`, note: notes.join(' / '), hn: notes.length ? 1 : 0, d1: r.d1.result, d2: r.d2.result, d3: r.d3.result };
    });
  }));
}));

// 기벽: 1D6 → 그 눈의 기벽
on('clicked:quirk', () => getAttrs([1, 2, 3, 4, 5, 6].map(k => `quirk_${k}`).concat('character_name'), v => {
  post(`${T} {{dice=[[0]]}} {{res=[[0]]}} {{roll=[[1d6]]}}` + field('title', '기벽 발동') + field('sub', '1D6') + field('who', v.character_name), r => {
    const k = r.roll.result;
    return { dice: DATA.faces[k - 1], res: v[`quirk_${k}`] || '(비어 있음)' };
  });
}));
// 표 굴림 한 가지: 결과 눈 · 결과 글 (· 효과 — 효과가 있는 표만 eff 칸을 보낸다: 빈 computed 는 카드에서 가릴 수 없어서)
const tableRoll = (title, sub, rolls, pick, eff) => post(`${T} {{dice=[[0]]}} {{res=[[0]]}}${eff ? ' {{eff=[[0]]}}' : ''} ${rolls}` + field('title', title) + field('sub', sub), r => pick(r));
// 감정 표A: D66 — 두 눈 중 작은 것을 앞에 (11 · 12 … 66)
on('clicked:emoa', () => tableRoll('감정 표A', 'D66', '{{a=[[1d6]]}} {{b=[[1d6]]}}', r => {
  const k = [r.a.result, r.b.result].sort((x, y) => x - y).join('');
  return { dice: k, res: (DATA.emoA.find(e => e[0] === k) || ['', '?'])[1]};
}));
on('clicked:emob', () => tableRoll('감정 표B', 'D10', '{{roll=[[1d10]]}}', r => {
  const k = String(r.roll.result);
  return { dice: k, res: (DATA.emoB.find(e => e[0] === k) || ['', '?'])[1]};
}));
on('clicked:cond', () => tableRoll('상태이상', '1D6', '{{roll=[[1d6]]}}', r => {
  const k = r.roll.result, s = DATA.cond[k - 1];
  return { dice: k, res: s[0], eff: s[1] };
}, true));

// 액션 · 규격 외 액션: 채팅에 출력 (이름 · 타입 · 코스트 · 효과)
const rowOf = (e, sec) => { const m = `${e.sourceAttribute || ''} ${e.triggerName || ''}`.match(new RegExp(`repeating_${sec}_([^_\\s]+)_`, 'i')); return m ? `repeating_${sec}_${m[1]}_` : null; };
[['acts', ''], ['exdet', '탐정 규격 외 · '], ['exasi', '조수 규격 외 · ']].forEach(([sec, pre]) => on(`clicked:repeating_${sec}:use`, e => {
  const row = rowOf(e, sec); if (!row) return;
  getAttrs(['name', 'type', 'cost', 'eff'].map(k => row + k).concat('character_name'), v => {
    const g = k => v[row + k] || '';
    post(T + field('title', g('name') || '액션') + field('sub', pre + [g('type'), g('cost') && `코스트 ${g('cost')}`].filter(Boolean).join(' · '))
      + field('who', v.character_name) + field('effect', g('eff')));
  });
}));
// 감정 한 줄: 마음에 드는 점 · 안 드는 점 (파트너 · 사건 조사 시트 · 괴도 시트) — 부제는 누구에 대한 감정인지
const EMO = [['plike', 1, ''], ['pdislike', 0, ''], ['tjlike', 1, '탐정이 조수에 대해'], ['tjdislike', 0, '탐정이 조수에 대해'],
  ['jtlike', 1, '조수가 탐정에 대해'], ['jtdislike', 0, '조수가 탐정에 대해'], ['tdlike', 1, '탐정에 대해'], ['tddislike', 0, '탐정에 대해'],
  ['talike', 1, '조수에 대해'], ['tadislike', 0, '조수에 대해']];
EMO.forEach(([sec, like, about]) => on(`clicked:repeating_${sec}:send`, e => {
  const row = rowOf(e, sec); if (!row) return;
  getAttrs([row + 'text', 'partner', 'character_name'], v => {
    if (!v[row + 'text']) return;
    post(T + field('title', like ? '마음에 드는 점' : '마음에 안 드는 점') + field('sub', about || (v.partner ? `파트너 · ${v.partner}` : '파트너'))
      + field('who', v.character_name) + field('effect', v[row + 'text']));
  });
}));
// 알고 있었어 카드 · 괴도 카드 공개
[['knew', '알고 있었어 카드', 'You knew.'], ['pcards', '괴도 카드', 'Phantom thief\'s act.'], ['tcards', '괴도 카드', 'Phantom thief\'s act.']].forEach(([sec, name, tag]) => on(`clicked:repeating_${sec}:reveal`, e => {
  const row = rowOf(e, sec); if (!row) return;
  getAttrs([row + 'no', row + 'text'], v => post(T + field('title', `${name}${v[row + 'no'] ? ' ' + v[row + 'no'] : ''}`) + field('sub', tag) + field('effect', v[row + 'text'] || '(비어 있음)')));
}));
// 사전 조사 시트: 체크한 항목(질문 · 적은 글)을 채팅에
on('clicked:preuse', () => getAttrs(['sheet_type', 'character_name'].concat(DATA.pre.flatMap(([n]) => [`pre_c${n}`, `pre_q${n}`])), v => {
  const asi = v.sheet_type === 'asi', picked = DATA.pre.filter(([n, , qd, qa]) => (asi ? qa : qd) && v[`pre_c${n}`] === '1')
    .map(([n, , qd, qa]) => [asi ? qa : qd, v[`pre_q${n}`] || '(비어 있음)']);
  post(T + field('title', `사전 조사 시트 · ${asi ? '조수' : '탐정'}`) + field('sub', '사용') + field('who', v.character_name)
    + (picked.length ? rows(picked) : field('effect', '체크한 항목이 없어요')));
}));
