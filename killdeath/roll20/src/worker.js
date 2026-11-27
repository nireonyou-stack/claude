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
// 특기 표기 《분야n/특기》 (룰북 표기 — 모술11/유언비어). 특기 리스트에 없는 이름은 《이름》 그대로
const skTag = (s, name) => (s ? `《${FIELD_NAMES[s.f]}${s.r + 2}/${SK[s.f][s.r]}》` : `《${name}》`);
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
// 줄바꿈은 Roll20 의 %NEWLINE% 로 (날 줄바꿈은 채팅 명령을 끊는다)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, '%NEWLINE%').replace(/\{/g, '｛').replace(/\}/g, '｝')
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
const CTX = [...TKEYS, 'roll_display_to', 'fumble', 'special', 'fumble_adj', 'mod', 'charge', 'sheet_type'];
const isPc = v => (v.sheet_type || 'pc') !== 'tg';
const vr = v => (isPc(v) ? ' {{vr=1}}' : '');   // 회수인: 스페셜 시청률 +10% · 펌블 합계 −20% (룰북 1·04)
const withCtx = (extra, cb) => getAttrs([...CTX, ...extra], v => cb(v, targets(v)));

// 판정: 2D6 합(눈) ≥ 스페셜치 → 스페셜, ≤ 펌블치 → 펌블, 아니면 합 + 수정이 목표치 이상이면 성공
//   first: 리스크 1 · 2 어빌리티의 물음 (첫 공격이면 특기 없이 목표치 5 — 룰북 4·08·04). extra: 성공 · 실패 안내 칸
function check(v, { title, sub, target, add = 0, fumble, eff, first, extra = '' }) {
  const fb = fumble == null ? fumOf(v) : fumble, sp = spcOf(v);
  const s = `${prefix(v)}${TPL} {{ok=[[0]]}} {{total=[[0]]}}${first ? ' {{tgx=[[0]]}} {{fa=[[?{공격|첫 공격 (특기 없이 목표치 5),1|반격 (지정특기),0}]]}}' : ''} {{d1=[[1d6]]}} {{d2=[[1d6]]}}`
    + `${add ? field('add', sgn(add)) : ''}${field('title', title)}${field('sub', sub)}${extra}${vr(v)}${field('eff', eff)}`;
  post(s, R => {
    const fa = first && R.fa.result === 1, tg = fa ? 5 : target;
    const n = R.d1.result + R.d2.result, t = n + add;
    const out = { ok: n >= sp ? 1 : n <= fb ? 2 : tg == null ? 0 : t >= tg ? 3 : 4, total: t };
    if (first) out.tgx = fa ? '첫 공격 · 목표치 5' : `반격${tg == null ? ' · 지정특기 없음' : ` · 목표치 ${tg}`}`;
    return out;
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
  withCtx([], (v, T) => check(v, { title: `${skTag(p)} 판정`, sub: (tgs(T[id]) + tail(v)).replace(/^ · /, ''), target: T[id], add: modOf(v) }));
});

// 어빌리티 공격 판정 (룰북 4·08·04): 차지만큼 +, 펌블치 = 【리스크】 + 손 수정 (블록 1회마다 리스크 +1 → 펌블치 ▲), 7 = 킬러 트릭
//   첫 공격은 리스크 1 · 2 어빌리티만, 특기 없이 목표치 5 — 반격은 받은 어빌리티보다 리스크가 1 · 2 높은 어빌리티로 지정특기 판정
//   성공하면 상대가 반격 (킬러 트릭이면 상대가 대미지 · 시청률 +10%), 실패하면 공격한 쪽이 대미지 (회수인은 사망)
const counter = k => (k >= 6 ? '킬러 트릭(리스크 7)' : `리스크 ${k + 1} · ${k + 2}${k + 2 === 7 ? '(킬러 트릭)' : ''} 어빌리티`);
for (let k = 1; k <= 7; k++) {
  const keys = [`ab${k}_name`, `ab${k}_level`, `ab${k}_effect`, `ab${k}_skill`];
  on(`clicked:ab${k}`, () => withCtx(keys, (v, T) => {
    const nm = (v[`ab${k}_name`] || '').trim() || '어빌리티', lv = k === 7 ? '' : (v[`ab${k}_level`] || '').trim();
    const sk = (v[`ab${k}_skill`] || '').replace(/[《》]/g, '').trim(), s = findSkill(sk), t = s ? T[s.id] : null, first = k <= 2;
    const ch = Math.max(0, num(v.charge) || 0), fb = k + (num(v.fumble_adj) || 0);
    const sub = [`리스크 ${k}`, lv && `레벨 ${lv}`, sk && skTag(s, sk)].filter(Boolean).join(' · ') + (first ? '' : tgs(t)) + (ch ? ` · 차지 +${ch}` : '') + tail(v, fb);
    const su = k === 7 ? `킬러 트릭 성공 — 상대가 대미지 (라이프가 있는 NPC 는 라이프 0) · 시청률 +10%` : `상대는 ${counter(k)}로 반격해야 한다`;
    const fa = isPc(v) ? '공격한 쪽이 대미지 — 회수인은 사망' : '공격한 쪽이 대미지 (라이프 −1 · 표적전이면 한 번 다시 굴림)';
    check(v, { title: `【${nm}】 공격 판정`, sub, target: t, add: ch + modOf(v), fumble: fb, eff: v[`ab${k}_effect`], first, extra: field('asu', su) + field('afa', fa) });
  }));
}

// 사망 처리 (회수인, 룰북 4·08·07 · 4·09): 회수인에게 살해되면 소울 방출표(1D6)만큼 소울을 신에 방출 (가진 만큼만),
//   헬 ER 소생 비용(사망 횟수별 50 · 100 · 200 · 400 · 800 · 1600)을 소울에서 내고(마이너스 가능) 같은 양의 헬 슬러그를 얻는다.
//   7번째 사망이면 결과 페이즈까지 부활하지 못하고 소울은 마이너스 무한대
const RELEASE = [100, 200, 200, 200, 300, 300], REVIVE = [50, 100, 200, 400, 800, 1600];
on('clicked:die', () => getAttrs(['soul', 'hell_slug', 'deaths', 'roll_display_to'], v => {
  const s = `${prefix(v)}${TPL} {{drel=[[0]]}} {{dres=[[0]]}} {{kb=[[?{누구에게 살해됐나|회수인 (소울 방출),1|표적 · 호위천사 등 (방출 없음),0}]]}} {{sr=[[1d6]]}}${field('title', '사망')} {{dth=1}}`;
  post(s, R => {
    const soul0 = num(v.soul) || 0, d0 = Math.max(0, num(v.deaths) || 0), slug0 = Math.max(0, num(v.hell_slug) || 0), byPc = R.kb.result === 1;
    const x = RELEASE[R.sr.result - 1], rel = byPc ? Math.max(0, Math.min(soul0, x)) : 0, soul1 = soul0 - rel, n = d0 + 1;
    const out = { drel: `소울 방출 ${x} → 실제 ${rel} (신에 남아 살아남은 회수인이 나눔)` };
    if (n >= 7) {
      setAttrs({ soul: soul1, deaths: 6 });
      return { ...out, dres: '7번째 사망 — 결과 페이즈까지 부활할 수 없고, 소울은 마이너스 무한대' };
    }
    const cost = REVIVE[n - 1];
    setAttrs({ soul: soul1 - cost, hell_slug: slug0 + cost, deaths: n });
    return { ...out, dres: `${n}번째 사망 · 소생 비용 ${cost} · 소울 ${soul0} → ${soul1 - cost} · 헬 슬러그 +${cost}` };
  });
}));

// 행동순 (룰북 4·02 · 4·08·02): D66 (작은 눈이 십의 자리) + 헬 사이버 「행동순 강화 +10 / +20 / +30」
//   메인 페이즈는 작은 순, 전투는 큰 순. 강화 값은 헬 사이버 이름 · 효과에서 찾는다
const initBonus = v => Math.max(0, ...[1, 2, 3, 4, 5].map(i => `${v[`cy${i}_name`] || ''} ${v[`cy${i}_effect`] || ''}`)
  .map(t => { const m = t.match(/행동순\s*강화\s*\+?\s*(10|20|30)/); return m ? +m[1] : 0; }));
on('clicked:init', () => getAttrs(['roll_display_to', ...[1, 2, 3, 4, 5].flatMap(i => [`cy${i}_name`, `cy${i}_effect`])], v => {
  const b = initBonus(v);
  post(`${prefix(v)}${TPL} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}}${field('title', '행동순 D66')}${field('sub', '메인 페이즈는 작은 순 · 전투는 큰 순')}`, R => {
    const a = R.te1.result, c = R.te2.result, d = Math.min(a, c) * 10 + Math.max(a, c);
    return { tres: b ? `${d} + 행동순 강화 ${b} = ${d + b}` : String(d) };
  });
}));

// 신 표 1 · 2 (D66, 룰북 4·03·01) · 서비스 신 표 (1D6 → 1D6, 4·05)
const D66K = [11, 12, 13, 14, 15, 16, 22, 23, 24, 25, 26, 33, 34, 35, 36, 44, 45, 46, 55, 56, 66];
const d66 = (a, b) => Math.min(a, b) * 10 + Math.max(a, b);
const SCENE1 = ['당신이 근거지로 삼던', '당신의 사진으로 벽이 뒤덮인', '아날로그 TV 가 산더미처럼 쌓인', '쓰레기로 가득 찬', '헬', '밀려드는 모래에 파묻힌',
  '값진 물건으로 호화롭게 꾸며진', '감시 장비로 전자 요새가 된', '기묘한 오브제투성이인', '거대한 구멍 가장자리에 아슬아슬하게 걸린', '극채색 벽화로 물든',
  '꺼져 가며 깜빡이는 불빛에 비친', '창백하게 모든 것이 얼어붙은', '붉은 피와 쇠 냄새로 가득한', '태양이 강렬한 빛을 내리쬐는',
  '새가 무수히 모여드는', '타오르는 불길에 비친', '흰 안개로 한 치 앞도 안 보이는', '썩은 시체가 겹겹이 쌓인', '유독한 오수가 잔뜩 고인', '약탈당해 텅 빈'];
const SCENE2 = ['사무실', '제단', '스튜디오', '창고', '버스 정류장', '감옥', '어둠', '역', '옥상', '하수도', '학교', '연구실', '차 안', '숲', '정원', '가게', '농원', '폐허', '묘지', '민가', '들판'];
const SVC = [['탈의계', ['의상 불량', '갈아입기', '탈의 마작', '입욕', '수영복으로 싸우기', '야구권']],
  ['폭력계', ['이긴 뒤의 폭력', '집단 폭력', '폭력을 암시하는 대화', '진 뒤의 폭력', '전혀 무의미한 폭력', '무의미한 폭력']],
  ['여행계', ['이동 수단 소개', '현지 놀이 소개', '현지 동물 소개', '현지 숙소 소개', '기상 몰래카메라', '명물 요리 소개']],
  ['연애계', ['키스 신', '사랑을 깨닫다', '사랑에 고민하다', '데이트 신', '비밀을 고백하다', '러브 신']],
  ['감동계', ['가족의 사랑을 깨닫다', '멋진 말을 하다', '실패해서 침울해하다', '현지 주민과 교류하다', '죽은 사람 이야기를 하다', '높은 곳에서 멋진 말을 하다']],
  ['다른 장르', ['사이코 서스펜스', '스페이스 오페라', '동화', '히로익 판타지', '몬스터 호러', '로봇물']]];
on('clicked:scene', () => getAttrs(['roll_display_to'], v => {
  post(`${prefix(v)}${TPL} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}} {{te3=[[1d6]]}} {{te4=[[1d6]]}}${field('title', '신 표')}`, R => {
    const i = D66K.indexOf(d66(R.te1.result, R.te2.result)), j = D66K.indexOf(d66(R.te3.result, R.te4.result));
    return { tres: `${SCENE1[i]} ${SCENE2[j]}` };
  });
}));
on('clicked:svc', () => getAttrs(['roll_display_to'], v => {
  post(`${prefix(v)}${TPL} {{tres=[[0]]}} {{te1=[[1d6]]}} {{te2=[[1d6]]}}${field('title', '서비스 신 표')}`
    + field('eff', '롤플레이가 끝나면 1D6 으로 분야를 정하고, 상대가 그 분야에서 습득한 특기로 판정.\n성공: 소울 +100 · 시청률 +20% (스페셜 +10% 더) / 실패: 시청률 −10% (펌블 −10% 더)'), R => {
    const [cat, list] = SVC[R.te1.result - 1];
    return { tres: `${cat} · ${list[R.te2.result - 1]}` };
  });
}));

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
    R => { const f = R.te1.result - 1; return { tres: skTag({ f, r: R.te2.result + R.te3.result - 2 }) }; });
}));
[1, 2, 3].forEach(n => on(`clicked:nd${n}`, () => getAttrs(['roll_display_to'], v => {
  const ks = Array.from({ length: n }, (_, i) => `n${i + 1}`);
  post(`${prefix(v)}${TPL} {{total=[[0]]}} ${ks.map(k => `{{${k}=[[1d6]]}}`).join(' ')}${field('title', `${n}D6`)}`, R => ({ total: ks.reduce((a, k) => a + R[k].result, 0) }));
})));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
