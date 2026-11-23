// 시노비가미 sheet worker — 자동 계산 (굴림은 아래 "굴림" 구역). 칸 이름은 중국어 번체 시트와 같음 (FIELDS.md)
'use strict';

// ── 특기 리스트: 열 A~F = 기술 · 체술 · 인술 · 모술 · 전술 · 요술, 특기 칸 A2~F12, 목표치 A2_value~
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FIELD_NAMES = ['기술', '체술', '인술', '모술', '전술', '요술'];
const FIELD_KEYS = ['violence', 'Body', 'Stealth', 'Scheme', 'Strategy_Field', 'Sorcery'];   // 생명력 슬롯 값 @{violence} · @{violence(lost)} · @{violence(dirty)}
const SK = [
  ['기기술', '불의 술', '물의 술', '침술', '암기', '의상술', '포승술', '등반술', '고문술', '손괴술', '굴삭술'],
  ['기승술', '포술', '수리검술', '손놀림', '신체조작', '보법', '주법', '비행술', '격투술', '도검술', '괴력'],
  ['생존술', '잠복술', '도주술', '도청술', '복화술', '은형술', '변장술', '향술', '분신술', '은폐술', '제육감'],
  ['의술', '독술', '함정술', '조사술', '사기술', '대인술', '예능', '미인계', '괴뢰술', '유언비어', '경제력'],
  ['병량술', '동물사역', '야전술', '지형활용', '의지', '용병술', '기억술', '색적술', '암호술', '전달술', '인맥'],
  ['이형화', '소환술', '사령술', '결계술', '봉인술', '언령술', '환술', '동술', '천리안', '빙의술', '주술']];
const GAPS = ['Z', 'A', 'B', 'C', 'D', 'E'];     // 공백: Z = 기술 왼쪽, A~E = 분야 사이 (k 번째 공백은 k 번째 분야 왼쪽)
const SKILL_IDS = COLS.flatMap(c => SK[0].map((_, r) => `${c}${r + 2}`));
const FIELD_ATTRS = COLS.map(c => `Ninpo_${c}_Field`);
const BF = [['flat', '평지'], ['water', '수중'], ['high', '고지대'], ['storm', '악천후'], ['crowd', '혼잡'], ['danger', '위험지대']];
const CONDS = [['koshou', '고장', 0], ['mahi', '마비', 1], ['juushou', '중상', 0], ['yukue', '행방불명', 0], ['boukyaku', '망각', 1], ['noroi', '저주', 1],
  ['saimin', '최면', 0], ['hidaruma', '불덩어리', 1], ['moudoku', '맹독', 1], ['kiga', '기아', 1], ['zanryu', '잔류물', 0], ['yabou', '야망', 0]];
const STACKS = CONDS.filter(c => c[2]).map(c => c[0]);
const NINPO = Array.from({ length: 8 }, (_, i) => `Ninpo_${String(i + 1).padStart(2, '0')}_`);
const PEOPLE = Array.from({ length: 9 }, (_, i) => String(i + 1).padStart(2, '0'));
const BG = ['01', '02', '03', '04', '05'];

const on1 = v => v === '1' || v === 1 || v === 'on';
const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[−－]/g, '-').trim(), 10); return Number.isNaN(n) ? null : n; };
const slotState = v => (/\(lost\)/.test(v || '') ? 'lost' : /\(dirty\)/.test(v || '') ? 'dirty' : '');
const pos = id => ({ f: COLS.indexOf(id[0]), r: +id.slice(1) - 2 });
const findSkill = s => {
  const n = String(s || '').replace(/[《》〈〉<>\s]/g, '');
  for (let f = 0; f < 6; f++) { const r = SK[f].findIndex(x => x.replace(/\s/g, '') === n); if (r >= 0) return { f, r, id: `${COLS[f]}${r + 2}` }; }
  return null;
};

// 반복 섹션의 칸 값을 모두 모은다: cb({행 id: {칸: 값}})
function readSection(section, fields, cb) {
  getSectionIDs(section, ids => {
    const names = ids.flatMap(id => fields.map(f => `repeating_${section}_${id}_${f}`));
    getAttrs(names, v => cb(Object.fromEntries(ids.map(id => [id, Object.fromEntries(fields.map(f => [f, v[`repeating_${section}_${id}_${f}`] || '']))]))));
  });
}

// ── 목표치 = 5 + 거리 (세로 한 칸 1, 옆 분야 2 · 칠한 공백을 건너면 1, 최대 12)
//   「목련」(MuLian): 2 와 12 가 이어짐 · 「마계공학」(MuoChie): 기술과 요술이 공백 Z 를 건너 이어짐
//   소실 · 부정인 분야의 습득 특기는 출발점이 못 된다 — 요마화 중에는 모두 쓴다
function dist(a, b, gap, wrapC, wrapR) {
  let dy = Math.abs(a.r - b.r);
  if (wrapR) dy = Math.min(dy, 11 - dy);
  const lo = Math.min(a.f, b.f), hi = Math.max(a.f, b.f);
  let direct = 0, around = 0;
  for (let k = 0; k < 6; k++) { if (k > lo && k <= hi) direct += gap[k]; else around += gap[k]; }
  return dy + (wrapC ? Math.min(direct, around) : direct);
}
const TKEYS = [...SKILL_IDS, ...GAPS, ...FIELD_ATTRS, 'yoma', 'MuoChie', 'MuLian'];
function targets(v) {
  const gap = GAPS.map(g => (on1(v[g]) ? 1 : 2)), yoma = on1(v.yoma), wc = on1(v.MuoChie), wr = on1(v.MuLian);
  const src = SKILL_IDS.filter(id => on1(v[id])).map(pos).filter(s => yoma || !slotState(v[FIELD_ATTRS[s.f]]));
  const out = {};
  SKILL_IDS.forEach(id => { const p = pos(id); out[id] = src.length ? Math.min(12, 5 + Math.min(...src.map(s => dist(s, p, gap, wc, wr)))) : null; });
  return out;
}
function calcTargets() {
  getAttrs(TKEYS, v => {
    const t = targets(v), out = {};
    SKILL_IDS.forEach(id => { out[`${id}_value`] = t[id] == null ? '' : t[id]; });
    setAttrs(out, { silent: true });
  });
}
on([...TKEYS.map(k => `change:${k.toLowerCase()}`), 'sheet:opened'].join(' '), calcTargets);

// ── 인법명: 「마계공학」 · 「목련」이 있으면 켜고, 줄마다 이름이 있는지(저주 표시용)
function scanNinpo() {
  getAttrs(NINPO.map(p => `${p}Name`), v => readSection('acitems', ['Ninpo_Name'], rows => {
    const out = {}, names = [];
    NINPO.forEach(p => { const n = (v[`${p}Name`] || '').trim(); names.push(n); out[`${p}on`] = n ? 1 : 0; });
    Object.entries(rows).forEach(([id, r]) => { const n = r.Ninpo_Name.trim(); names.push(n); out[`repeating_acitems_${id}_Ninpo_on`] = n ? 1 : 0; });
    const all = names.join(' ');
    out.MuoChie = /마계공학/.test(all) ? 1 : 0;
    out.MuLian = /목련/.test(all) ? 1 : 0;
    setAttrs(out, { silent: true }, calcTargets);
  }));
}
on([...NINPO.map(p => `change:${p.toLowerCase()}name`), 'change:repeating_acitems:ninpo_name', 'remove:repeating_acitems', 'sheet:opened'].join(' '), scanNinpo);

// ── 배경에 【마인】이 있으면 요마화 칸을 보임 (없어지면 요마화도 끔)
on([...BG.map(k => `change:background_name_${k}`), 'sheet:opened'].join(' '), () => getAttrs([...BG.map(k => `background_name_${k}`), 'yoma'], v => {
  const ok = BG.some(k => /마인/.test(v[`background_name_${k}`] || ''));
  const out = { yoma_ok: ok ? 1 : 0 };
  if (!ok && on1(v.yoma)) out.yoma = 0;
  setAttrs(out, { silent: true }, calcTargets);
}));

// ── 펌블치 = 드라마 장면 2 · 전투 중 플롯치(최소 2) + 혼잡 1(전투 중) + 불덩어리 개수 + 손 수정 · 스페셜치 = 12 + 손 수정
const FKEYS = ['scene', 'plot', 'bf_crowd', 'cond_hidaruma', 'fumble_adj', 'special_adj'];
function fumbleOf(v) {
  const battle = v.scene === 'battle', p = num(v.plot);
  return {
    fumble: (battle && p !== null ? Math.max(2, p) : 2) + (battle && on1(v.bf_crowd) ? 1 : 0) + Math.max(0, num(v.cond_hidaruma) || 0) + (num(v.fumble_adj) || 0),
    special: 12 + (num(v.special_adj) || 0),
  };
}
const calcFumble = () => getAttrs(FKEYS, v => setAttrs(fumbleOf(v), { silent: true }));
on([...FKEYS.map(k => `change:${k}`), 'sheet:opened'].join(' '), calcFumble);
[['fup', 'fumble_adj', 1], ['fdn', 'fumble_adj', -1], ['sup', 'special_adj', 1], ['sdn', 'special_adj', -1]].forEach(([b, k, d]) => {
  on(`clicked:${b}`, () => getAttrs([k], v => setAttrs({ [k]: Math.max(-12, Math.min(12, (num(v[k]) || 0) + d)) })));
});
on('clicked:frs', () => setAttrs({ fumble_adj: 0 }));
on('clicked:srs', () => setAttrs({ special_adj: 0 }));

// ── 전장: 평지를 고르면 다른 전장을 끄고, 다른 전장을 고르면 평지를 끔 (모두 끄면 평지)
on(BF.map(([k]) => `change:bf_${k}`).join(' '), e => {
  if (e.sourceType && e.sourceType !== 'player') return;
  const k = (e.sourceAttribute || '').replace(/^bf_/, '');
  getAttrs(BF.map(([b]) => `bf_${b}`), v => {
    const out = {}, others = BF.slice(1).map(([b]) => b);
    if (k === 'flat' && on1(v.bf_flat)) others.forEach(b => { out[`bf_${b}`] = 0; });
    else out.bf_flat = others.some(b => on1(v[`bf_${b}`])) ? 0 : 1;
    setAttrs(out, { silent: true }, calcFumble);
  });
});

// ── 생명력 슬롯(■): 누를 때마다 빈칸 → 소실 → 부정 → 빈칸. 빈칸에서 벗어나면 생명력 -1, 빈칸으로 돌아오면 +1 (소실 ↔ 부정은 그대로)
COLS.forEach((c, i) => on(`clicked:slot${c.toLowerCase()}`, () => getAttrs([FIELD_ATTRS[i], 'hp', 'hp_max'], v => {
  const was = slotState(v[FIELD_ATTRS[i]]), now = { '': 'lost', lost: 'dirty', dirty: '' }[was];
  const out = { [FIELD_ATTRS[i]]: `@{${FIELD_KEYS[i]}${now ? `(${now})` : ''}}` };
  const hp = num(v.hp) || 0, max = num(v.hp_max);
  if (!was) out.hp = Math.max(0, hp - 1);
  else if (!now) out.hp = max === null ? hp + 1 : Math.min(Math.max(max, hp), hp + 1);
  setAttrs(out);
})));

// ── 생명력 칸: 최대치보다 큰 칸은 흐리게(hp_dim), 10칸 단위로 보이기(hp_slots, 10~50)
on('change:hp_max sheet:opened', () => getAttrs(['hp_max'], v => {
  const m = Math.max(0, Math.min(50, num(v.hp_max) || 0));
  setAttrs({ hp_dim: m, hp_slots: Math.min(50, Math.max(10, Math.ceil(m / 10) * 10)) }, { silent: true });
}));

// ── 상태이상: 누적 수가 있으면 표시(cf_*) — 마비는 습득 특기, 망각은 감정, 저주는 인법명 옆에 아이콘
on([...STACKS.map(k => `change:cond_${k}`), 'sheet:opened'].join(' '), () => getAttrs(STACKS.map(k => `cond_${k}`), v => {
  setAttrs(Object.fromEntries(STACKS.map(k => [`cf_${k}`, (num(v[`cond_${k}`]) || 0) > 0 ? 1 : 0])), { silent: true });
}));
// 인물 칸: 감정이 있는 줄 (망각 아이콘용)
on([...PEOPLE.flatMap(k => [`change:relation_sense_${k}`, `change:relation_sign_${k}`]), 'sheet:opened'].join(' '), () => getAttrs(PEOPLE.flatMap(k => [`relation_sense_${k}`, `relation_sign_${k}`]), v => {
  setAttrs(Object.fromEntries(PEOPLE.map(k => [`relation_emo_${k}`, (v[`relation_sense_${k}`] || '').trim() || (v[`relation_sign_${k}`] || '').trim() ? 1 : 0])), { silent: true });
}));

// ── 시트를 열 때: 접는 곳을 접는다 · 버전
on('sheet:opened', () => getAttrs(['sheet_version'], v => {
  const out = { fold_open: 0 };
  if ((num(v.sheet_version) || 0) < 1) out.sheet_version = 1;
  setAttrs(out, { silent: true });
}));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드 템플릿은 src/rolltemplate.html. computed 칸(ok · total · hi · tres)은 매크로 앞쪽에 둔다.
// 공개: roll_display_to 가 "/w gm " 이면 GM 에게 귓속말 (중국어 시트와 같은 값)

// 매크로에 넣는 글: 템플릿 · 인라인 굴림 · 속성 호출을 깨뜨리는 문자를 바꾼다(줄바꿈은 공백)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
// 그림: Roll20 은 확장자가 그림인 주소만 그림으로 보이므로 없으면 #.png 를 붙인다
const imgUrl = u => { const s = String(u || '').trim().replace(/\s/g, '%20').replace(/\)/g, '%29'); return !/^https?:\/\//i.test(s) ? '' : /\.(png|jpe?g|gif|webp)([?#].*)?$/i.test(s) ? s : `${s}#.png`; };
const imgField = (k, u, alt) => { const s = imgUrl(u); return s ? ` {{${k}=[${alt}](${s})}}` : ''; };
const crest = v => imgField('crest', v.crest_url, '문장');
const prefix = v => (String(v.roll_display_to || '').trim() ? '/w gm ' : '');
const TPL = '&{template:shinobigami}';
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const pairs = rows => rows.slice(0, 4).map((r, i) => {
  const k = `g${i + 1}`, s = r.sname || r.seff, w = r.wname || r.weff;
  return (s ? field(`${k}s`, s) + field(`${k}se`, r.sname ? r.seff : '') : '') + (w ? field(`${k}w`, w) + field(`${k}we`, r.wname ? r.weff : '') : '');
}).join('');
// 굴림 없는 카드
const info = (v, { title, sub, img, eff, fl, set, gm, ougi, to }) => post(`${to || prefix(v)}${TPL}${field('title', title)}${field('sub', sub)}${imgField('img', img, title || '그림')}${crest(v)}`
  + `${field('set', set)}${field('eff', eff)}${gm ? pairs(gm) : ''}${field('fl', fl)}${ougi ? ' {{ougi=1}}' : ''}`);

// 판정 카드 둘째 줄 꼬리: 펌블치 · 스페셜치(기본값이 아니면) · 전장(전투 중) · 걸린 상태이상
const fumOf = v => { const f = num(v.fumble); return f === null ? 2 : f; };
const spcOf = v => { const s = num(v.special); return s === null ? 12 : s; };
const battleOn = (v, k) => v.scene === 'battle' && on1(v[`bf_${k}`]);
function tail(v) {
  const parts = [], f = fumOf(v), s = spcOf(v);
  if (f !== 2) parts.push(`펌블치 ${f}`);
  if (s !== 12) parts.push(`스페셜치 ${s}`);
  BF.slice(1).forEach(([k, n]) => { if (battleOn(v, k)) parts.push(n); });
  CONDS.forEach(([k, n, stack]) => {
    if (stack) { const c = num(v[`cond_${k}`]) || 0; if (c > 0) parts.push(`${n} ${c}`); } else if (on1(v[`cond_${k}`])) parts.push(n);
  });
  return parts.map(p => ` · ${p}`).join('');
}
const tgs = t => (t == null ? '' : ` · 목표치 ${t}`);
const slotTag = (v, f) => ({ lost: ' · 소실', dirty: ' · 부정' }[slotState(v[FIELD_ATTRS[f]])] || '') + (on1(v.yoma) ? ' · 요마화' : '');
const CTX = [...TKEYS, 'roll_display_to', 'crest_url', 'character_name', 'fumble', 'special', 'scene', ...BF.map(([k]) => `bf_${k}`), ...CONDS.map(([k]) => `cond_${k}`)];
const withCtx = (extra, cb) => getAttrs([...CTX, ...extra], v => cb(v, targets(v)));

// 판정: 2D6 합 ≥ 스페셜치 → 스페셜, ≤ 펌블치 → 펌블, 아니면 목표치와 견줘 성공 · 실패 (only = 스페셜 · 펌블만, 파훼 판정)
function check(v, { title, sub, target, only, img, eff, fl }) {
  const high = battleOn(v, 'high');
  const s = `${prefix(v)}${TPL} {{ok=[[0]]}} {{total=[[0]]}} {{hi=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}}${field('title', title)}${field('sub', sub)}`
    + `${imgField('img', img, title || '그림')}${crest(v)}${field('note', battleOn(v, 'water') ? '수중 · 회피 판정 -2' : '')}${field('note2', battleOn(v, 'danger') ? '위험지대' : '')}`
    + `${field('eff', eff)}${field('fl', fl)}`;
  post(s, R => {
    const t = R.d1.result + R.d2.result, f = fumOf(v), sp = spcOf(v);
    const ok = t >= sp ? 1 : t <= f ? 2 : only || target == null ? 0 : t >= target ? 3 : 4;
    return { ok, total: t, hi: ok === 2 && high ? 1 : 0 };
  });
}

// 특기 칸 이름 → 그 특기로 판정
on(SKILL_IDS.map(id => `clicked:r${id.toLowerCase()}`).join(' '), e => {
  const m = (e.triggerName || '').match(/clicked:r([a-f])(\d+)$/i);
  if (!m) return;
  const id = m[1].toUpperCase() + m[2], p = pos(id);
  withCtx([], (v, T) => check(v, { title: `《${SK[p.f][p.r]}》 판정`, sub: FIELD_NAMES[p.f] + tgs(T[id]) + slotTag(v, p.f) + tail(v), target: T[id] }));
});

// 인법: 지정 특기가 특기 리스트에 있으면 판정, 없으면 효과만. 악천후(전투 중)면 공격 인법 간격 +1
const TYPE_NAMES = { '@{Tool}': '공격', '@{support}': '서포트', '@{equip}': '장비' };
function rollNinpo(v, T, a) {
  const tyN = TYPE_NAMES[a.Types] || '', s = findSkill(a.Assigned_Skill), t = s ? T[s.id] : null;
  const rg = a.Range && (tyN === '공격' && battleOn(v, 'storm') ? `간격 ${a.Range}+1` : `간격 ${a.Range}`);
  const sk = a.Assigned_Skill.replace(/[《》]/g, '').trim();
  const sub = [tyN, rg, a.Cost && `코스트 ${a.Cost}`, sk && `《${sk}》`].filter(Boolean).join(' · ') + (s ? tgs(t) + tail(v) : '');
  const title = `【${a.Name || '인법'}】`;
  if (!s) return info(v, { title, sub, img: a.Img, eff: a.Effect, fl: a.Flavor });
  check(v, { title, sub, target: t, img: a.Img, eff: a.Effect, fl: a.Flavor });
}
const NP_FIELDS = ['Name', 'Types', 'Range', 'Cost', 'Assigned_Skill', 'Effect', 'Img', 'Flavor'];
NINPO.forEach((p, i) => on(`clicked:np${String(i + 1).padStart(2, '0')}`, () => withCtx(NP_FIELDS.map(f => p + f), (v, T) => {
  rollNinpo(v, T, Object.fromEntries(NP_FIELDS.map(f => [f, v[p + f] || ''])));
})));
const rowOf = (e, sec) => { const m = `${e.sourceAttribute || ''} ${e.triggerName || ''}`.match(new RegExp(`repeating_${sec}_([^_\\s]+)_`, 'i')); return m ? `repeating_${sec}_${m[1]}_` : null; };
on('clicked:repeating_acitems:use', e => {
  const row = rowOf(e, 'acitems');
  if (row) withCtx(NP_FIELDS.map(f => `${row}Ninpo_${f}`), (v, T) => rollNinpo(v, T, Object.fromEntries(NP_FIELDS.map(f => [f, v[`${row}Ninpo_${f}`] || '']))));
});
// 파훼 판정 (인물 칸의 오의 지정특기): 오의마다 수정치가 달라 성공 · 실패는 찍지 않고 스페셜 · 펌블만
PEOPLE.forEach(k => on(`clicked:brk${k}`, () => withCtx([`relation_name_${k}`, `relation_ougi_${k}`], (v, T) => {
  const who = (v[`relation_name_${k}`] || '').trim(), sk = (v[`relation_ougi_${k}`] || '').replace(/[《》]/g, '').trim(), s = findSkill(sk), t = s ? T[s.id] : null;
  const sub = ([who && `${who}의 오의`, s && FIELD_NAMES[s.f] + tgs(t) + slotTag(v, s.f)].filter(Boolean).join(' · ') + tail(v)).replace(/^ · /, '');
  check(v, { title: sk ? `《${sk}》 파훼 판정` : '파훼 판정', sub, target: t, only: true });
})));

// 오의 (강점 · 결점은 한 쌍씩 카드에) · 진실 · 배경: 채팅에 출력
[[1, 'ougia'], [2, 'ougib']].forEach(([i, sec]) => on(`clicked:ougi${i}`, () => getAttrs([`Ougi${i}_name`, `Ougi${i}_skill`, `Ougi${i}`, `Ougi${i}_img`, 'roll_display_to', 'crest_url'], v => {
  readSection(sec, ['sname', 'seff', 'wname', 'weff'], rows => {
    const sk = (v[`Ougi${i}_skill`] || '').replace(/[《》]/g, '').trim();
    info(v, { title: v[`Ougi${i}_name`] || '오의', ougi: 1, sub: '오의' + (sk ? ` · 《${sk}》` : ''), img: v[`Ougi${i}_img`], eff: v[`Ougi${i}`], gm: Object.values(rows) });
  });
})));
[1, 2, 3].forEach(i => on(`clicked:truth${i}`, () => getAttrs([`truth_name_${i}`, `truth_set_${i}`, `truth_eff_${i}`, 'roll_display_to', 'crest_url'], v => {
  info(v, { title: `【진실】 ${v[`truth_name_${i}`] || ''}`.trim(), ougi: 1, set: v[`truth_set_${i}`], eff: v[`truth_eff_${i}`] });
})));
BG.forEach(k => on(`clicked:bg${k}`, () => getAttrs([`background_name_${k}`, `background_${k}`, 'roll_display_to', 'crest_url'], v => {
  info(v, { title: `【배경】 ${v[`background_name_${k}`] || ''}`.trim(), eff: v[`background_${k}`] });
})));

// 닌자도구 사용: 개수 1 줄이고, 모두에게(공개 설정대로)는 사용 카드(효과)만, 남은 개수는 GM 에게만 귓속말
const GEAR = [['01', '병량환', '자신의 【생명력】이 1점 이상이라면 언제든지 사용할 수 있다. 이 아이템을 사용하면 자신의 【생명력】 1점이나 상태이상 하나를 회복할 수 있다.'],
  ['02', '신통환', '자신이 행동 판정의 주사위를 굴렸을 때 사용할 수 있다. 그 주사위를 다시 굴릴 수 있다.'],
  ['03', '둔갑부', '자신 이외의 누군가가 행동 판정의 주사위를 굴렸을 때 사용할 수 있다. 그 주사위를 다시 굴리게 할 수 있다.']];
function useGear(v, name, eff, key) {
  const cur = Math.max(0, num(v[key]) || 0);
  if (!cur) return info(v, { title: name, sub: '남은 개수 0', to: '/w gm ' });
  setAttrs({ [key]: cur - 1 });
  info(v, { title: `${name} 사용`, eff });
  info(v, { title: name, sub: `남은 개수 ${cur} → ${cur - 1}`, to: '/w gm ' });
}
GEAR.forEach(([k, n, e], i) => on(`clicked:gear${i + 1}`, () => getAttrs([`gear_${k}`, 'roll_display_to', 'crest_url'], v => useGear(v, n, e, `gear_${k}`))));
on('clicked:repeating_gear:use', e => {
  const row = rowOf(e, 'gear');
  if (row) getAttrs([`${row}name`, `${row}effect`, `${row}count`, 'roll_display_to', 'crest_url'], v => useGear(v, v[`${row}name`] || '특수 닌자도구', v[`${row}effect`], `${row}count`));
});

// 굴림표 (장면 · 펌블 · 감정 · 상태이상 표는 TRPG Club 한국어판 플레이 서머리 문구, 신념 · 전장 · 전국 상태이상 표는 중국어 시트 한국어 번역)
const TABLES = [
  ['장면 표', 2, { 2: '주위에 피 냄새가 진동한다. 누군가가 싸운 흔적. 아니, 아직 싸움은 계속되고 있는 것인가?', 3: '이것은…… 꿈? 이미 지나간 과거. 하지만 그것을 잊을 수는 없다.',
    4: '눈앞에 펼쳐진 거리의 풍경을 바라본다. 여기라면 한 눈에 거리를 내려다볼 수 있지만…….', 5: '세계의 끝을 연상케 하는 어둠. 어둠 속에서 당신들은 은밀하게 속삭인다.',
    6: '평화로운 시간이 흘러간다. 그림자의 세계를 잊어버릴 것만 같다.', 7: '맑은 기운이 감도는 숲 속. 새가 지저귀는 소리와 나무 사이로 산들바람이 부는 소리가 들려온다.',
    8: '엄청나게 혼잡하고 떠들썩하다. 그림자의 세계를 모르는 순진한 이들이 자기자랑이며 잡담을 나누는 소리로 시끌벅적하다.', 9: '세찬 비가 내린다. 사람들은 비를 피할 곳을 찾아 황급히 달려가고 있다.',
    10: '강한 바람이 휘몰아친다. 머리카락과 옷이 크게 휘날린다. 무언가가 일어날 듯한 예감…….', 11: '주정뱅이의 노성. 호객꾼들의 외침. 여자들의 교성. 평소와 다를 것이 없는 번화가의 모습이지만…….',
    12: '태양의 미소가 당신을 감싼다. 그림자 속에서 살아가는 이들에게 그 미소는 너무나 눈부시다.' }],
  ['감정 표', 1, { 1: '공감(플러스) / 불신(마이너스)', 2: '우정(플러스) / 분노(마이너스)', 3: '애정(플러스) / 질투(마이너스)', 4: '충성(플러스) / 모멸(마이너스)', 5: '동경(플러스) / 열등감(마이너스)', 6: '광신(플러스) / 살의(마이너스)' }],
  ['신념 표', 1, { 1: '흉(凶): 사회나 자기자신을 파괴, 투쟁, 붕괴로 몰아 넣으려고 한다.', 2: '율(律): 모순이나 나약함을 용납하지 못하고, 교정하려고 한다.', 3: '아(我): 돈이나 명예, 힘, 자신의 이상, 안전을 손에 넣으려고 한다.',
    4: '정(情): 가족이나 벗, 연인 등 가까운 누군가를 사랑하고, 지키려고 한다.', 5: '충(忠): 자기가 속한 유파나 어떠한 사상, 인물에게 공감하여 목숨 바쳐 따른다.', 6: '화(和): 많은 사람들이 행복해질 수 있는 미래를 믿고, 서로 이해할 수 있는 길을 모색한다.' }],
  ['펌블 표', 1, { 1: '뭔가 상태가 이상하다. 그 사이클 동안 모든 행동 판정에 -1의 수정치를 적용한다.', 2: '아뿔싸! 아무거나 닌자도구를 하나 잃어버린다.',
    3: '정보가 새어나갔다! 당신을 제외한 다른 캐릭터들은 당신이 가지고 있는 【비밀】이나 【거처】 중에서 원하는 것을 하나씩 알아낼 수 있다.', 4: '방심했다! 술법의 제어에 실패해서 【생명력】을 아무거나 1점 잃는다.',
    5: '적의 음모인가? 함정에 걸려서 무작위로 상태이상 한 종류에 걸린다. 상태이상은 상태이상 표로 결정한다.', 6: '휴우. 하마터면 큰일 날 뻔 했다. 아무 일도 일어나지 않는다.' }],
  ['전장 표', 1, { 1: '평지. 특별한 효과 없음.', 2: '수중. 바다나 강, 수영장, 피 연못 지옥 등. 회피 판정에 -2의 수정치를 적용한다.', 3: '고지대. 빌딩 사이나 나무 위, 깎아지른 절벽 등. 이 전장에서 펌블을 내면 접근전 대미지 1점을 입는다.',
    4: '악천후. 폭풍이나 눈보라, 미사일의 비 등. 이 전장에서는 모든 공격 인법의 간격이 1 상승한다.', 5: '혼잡. 사람이 우글거리는 거리나 교실, 정체 중인 차도 등. 이 전장에서는 행동 판정을 할 때의 펌블치가 1 상승한다.',
    6: '위험지대. 우주나 심해, 용암, 마계 등. 게임 마스터는 라운드가 끝날 때 1D6을 굴린다. 주사위 눈이 전투가 시작하고 경과한 라운드 수 이하인 경우, 이 전장에 있는 캐릭터들은 접근전 대미지 1점을 입는다. 이 전장에서 탈락한 자는 1D6을 굴려서 상태이상 표를 적용한다.' }],
  ['상태이상 표', 1, { 1: '고장. 모든 닌자도구를 사용할 수 없게 된다. 이 효과는 누적되지 않는다. 각 사이클을 종료할 때 《기기술》로 행동 판정을 해서 성공하면 이 상태이상은 무효가 된다.',
    2: '마비. 습득하고 있는 특기 중에서 무작위로 하나를 고른다. 그 특기를 사용할 수 없게 된다. 이 효과는 습득하고 있는 특기의 수만큼 누적된다. 각 사이클을 종료할 때 《신체조작》으로 행동 판정을 해서 성공하면 이 상태이상은 모두 무효가 된다.',
    3: '중상. 명중 판정, 정보 판정, 감정 판정을 할 때마다 접근전 대미지 1점을 입는다. 이 효과는 누적되지 않는다. 각 사이클을 종료할 때 《생존술》로 행동 판정을 해서 성공하면 이 상태이상은 무효가 된다.',
    4: '행방불명. 메인 페이즈 동안 자기 이외의 플레이어가 장면 플레이어인 장면에 등장할 수 없게 된다. 이 효과는 누적되지 않는다. 각 사이클을 종료할 때 《경제력》으로 행동 판정을 해서 성공하면 이 상태이상은 무효가 된다.',
    5: '망각. 획득한 【감정】 중에서 무작위로 하나를 고른다. 그 【감정】을 가지고 있지 않은 것으로 간주한다. 이 효과는 획득한 【감정】의 수만큼 누적된다. 각 사이클을 종료할 때 《기억술》로 행동 판정을 해서 성공하면 이 상태이상은 모두 무효가 된다.',
    6: '저주. 습득하고 있는 인법 중에서 무작위로 하나를 고른다. 그 인법을 사용할 수 없게 된다. 이 효과는 습득하고 있는 인법의 수만큼 누적된다. 각 사이클을 종료할 때 《주술》로 행동 판정을 해서 성공하면 이 상태이상은 모두 무효가 된다.' }],
  ['전국 상태이상 표', 1, { 1: '최면. 이 상태 이상에 걸린 이가 전투에 참가했다면, 전투가 시작되는 시점 또는 이 상태이상에 걸린 시점에서 【생명력】을 1점 감소하지 않으면 그 전투에서 자동적으로 탈락한다. 이 효과는 누적되지 않는다. 사이클을 종료할 때 《의지》 판정을 해서 성공하면 이 효과는 무효가 된다.',
    2: '불덩어리. 이 상태이상에 걸린 이는 펌블치가 1 상승하며, 펌블을 발생시키면 1점의 접근전 대미지를 입는다. 이 효과는 누적된다. 장면을 종료할 때 이 효과는 무효가 된다.',
    3: '맹독. 이 상태이상에 걸린 이가 전투에 참가했다면, 라운드를 종료할 때 주사위를 1개 굴린다. 그 눈이 홀수라면 【생명력】이 1점 감소한다. 이 효과는 누적된다. 사이클을 종료할 때 《독술》 판정을 해서 성공하면 이 효과는 무효가 된다.',
    4: '기아. 이 상태이상에 걸린 이가 전투에 참가했다면, 라운드를 종료할 때 주사위를 1개 굴린다. 그 눈이 짝수라면 【생명력】이 1점 감소한다. 이 효과는 누적된다. 사이클을 종료할 때 《병량술》 판정을 해서 성공하면 이 효과는 무효가 된다.',
    5: '잔류물. 이 상태이상에 걸린 이는 회복 판정이나 인법, 닌자도구의 효과로 【생명력】을 회복할 수 없게 된다(상태이상은 회복할 수 있다). 이 효과는 누적되지 않는다. 사이클을 종료할 때 《고문술》 판정을 해서 성공하면 이 효과는 무효가 된다.',
    6: '야망. 이 상태이상에 걸린 이는 명중 판정에 +1, 그 외의 모든 행동 판정에 -1의 수정치를 적용한다. 이 효과는 누적되지 않는다. 사이클을 종료할 때 《빙의술》 판정을 해서 성공하면 이 효과는 무효가 된다.' }]];
TABLES.forEach(([n, d, tab], i) => on(`clicked:rt${i + 1}`, () => getAttrs(['roll_display_to', 'crest_url'], v => {
  post(`${prefix(v)}${TPL} {{tres=[[0]]}} {{te1=[[1d6]]}}${d === 2 ? ' {{te2=[[1d6]]}}' : ''}${field('title', n)}${crest(v)}`, R => ({ tres: tab[R.te1.result + (d === 2 ? R.te2.result : 0)] || '' }));
})));
[1, 2, 3].forEach(n => on(`clicked:nd${n}`, () => getAttrs(['roll_display_to', 'crest_url'], v => {
  const ks = Array.from({ length: n }, (_, i) => `n${i + 1}`);
  post(`${prefix(v)}${TPL} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${field('title', `${n}D6`)}${crest(v)}`, R => ({ total: ks.reduce((a, k) => a + R[k].result, 0) }));
})));

// 플롯 · GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
