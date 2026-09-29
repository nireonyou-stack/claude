// 블러드문 sheet worker — 자동 계산 (굴림은 아래 "굴림" 구역)
'use strict';

// ── 특기 리스트: 분야 id 와 2~12 특기. 속성은 sk_<분야><눈> (예: sk_head7 = 《뇌》)
const FIELDS = ['soc', 'head', 'arm', 'body', 'leg', 'env'];
const FIELD_NAMES = { soc: '사회', head: '머리', arm: '팔', body: '동체', leg: '다리', env: '환경' };
const SKILLS = {
  soc: ['두려워하기', '위협하기', '생각하지 않기', '자신감', '침묵하기', '전하기', '속이기', '지위', '웃기', '말하기', '화내기'],
  head: ['듣기', '감각기', '보기', '반응', '생각하기', '뇌', '직감', '예감', '외치기', '입', '물기'],
  arm: ['조이기', '때리기', '베기', '주팔', '쏘기', '조작', '찌르기', '반대팔', '휘두르기', '잡기', '던지기'],
  body: ['막기', '호흡기', '멈추기', '받기', '재기', '심장', '비껴내기', '피하기', '견디기', '소화기', '떨어지기'],
  leg: ['달리기', '다가가기', '차기', '주다리', '뛰어오르기', '설치하기', '밟기', '반대다리', '기어가기', '숙이기', '걷기'],
  env: ['쉬기', '일상', '숨기', '기다리기', '나타나기', '인맥', '포획하기', '열기', '도망치기', '퇴로', '쉬지 않기'],
};
const GAPS = ['a', 'b', 'c', 'd', 'e'];          // gap_a = 사회|머리 사이 … gap_e = 다리|환경 사이
const PANIC = ['soc2', 'arm2', 'leg2', 'soc12', 'arm12', 'leg12'];   // 공황: ▲특기 사용불능
// 부위 대미지 → 그 부위 특기 칸 (십자 모양으로 사용불능)
const PARTS = {
  brain: 'head7', armm: 'arm5', legm: 'leg5', digest: 'body11', sense: 'head3', mouth: 'head11',
  breath: 'body3', lego: 'leg9', armo: 'arm9', heart: 'body7',
  conf: 'soc5', status: 'soc9', daily: 'env3', contact: 'env7', retreat: 'env11',
};
const SKILL_IDS = FIELDS.flatMap(f => SKILLS[f].map((_, r) => `${f}${r + 2}`));
const pos = id => [FIELDS.indexOf(id.match(/^[a-z]+/)[0]), +id.match(/\d+$/)[0]];   // [열, 눈]
const idAt = (c, row) => (c >= 0 && c < 6 && row >= 2 && row <= 12 ? `${FIELDS[c]}${row}` : null);
const skillName = id => { const [c, row] = pos(id); return SKILLS[FIELDS[c]][row - 2]; };
const on1 = v => v === '1' || v === 1 || v === 'on';
const num = v => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; };

// 두 칸 사이 칸 수: 세로 1칸 1, 가로 1열 2(칠한 갭은 1)
function distance(a, b, gaps) {
  const [c1, r1] = pos(a), [c2, r2] = pos(b);
  let d = Math.abs(r1 - r2);
  for (let c = Math.min(c1, c2); c < Math.max(c1, c2); c++) d += gaps[c] ? 1 : 2;
  return d;
}

// 목표치 · 사용불능 · 부위 대미지 합계
// 목표치 = 5 + 가장 가까운 습득 특기까지 칸 수. 사용불능이거나 대용할 특기가 없으면 스페셜(12)만 성공 → 12, 12 초과도 12
function calcSkills() {
  const keys = [...SKILL_IDS.map(id => `sk_${id}`), ...GAPS.map(g => `gap_${g}`), ...Object.keys(PARTS).map(p => `dmg_${p}`), 'cond_panic'];
  getAttrs(keys, v => {
    const gaps = GAPS.map(g => on1(v[`gap_${g}`]));
    const dead = new Set(on1(v.cond_panic) ? PANIC : []);
    let hurt = 0;
    Object.entries(PARTS).forEach(([p, id]) => {
      if (!on1(v[`dmg_${p}`])) return;
      hurt++;
      const [c, row] = pos(id);
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => { const x = idAt(c + dc, row + dr); if (x) dead.add(x); });
    });
    const src = SKILL_IDS.filter(id => on1(v[`sk_${id}`]) && !dead.has(id));
    const out = { dmg_total: hurt };
    SKILL_IDS.forEach(id => {
      const off = dead.has(id);
      out[`sk_${id}_off`] = off ? 1 : 0;
      out[`sk_${id}_tn`] = off || !src.length ? 12 : Math.min(12, 5 + Math.min(...src.map(s => distance(s, id, gaps))));
    });
    setAttrs(out, { silent: true });
  });
}
on([...SKILL_IDS.map(id => `change:sk_${id}`), ...GAPS.map(g => `change:gap_${g}`), ...Object.keys(PARTS).map(p => `change:dmg_${p}`), 'change:cond_panic', 'sheet:opened'].join(' '), calcSkills);

// 반복 섹션의 한 칸 값을 모두 모은다: cb({행 id: {칸: 값}})
function readSection(section, fields, cb) {
  getSectionIDs(section, ids => {
    const names = ids.flatMap(id => fields.map(f => `repeating_${section}_${id}_${f}`));
    getAttrs(names, v => cb(Object.fromEntries(ids.map(id => [id, Object.fromEntries(fields.map(f => [f, v[`repeating_${section}_${id}_${f}`]]))]))));
  });
}

// 내구력 = 기본치(입력) + 강도 합계 (헌터: 행복·배덕, 몬스터: 지배력). 행복이 파괴되거나 줄을 지우면 그만큼 내려간다
function calcDurability() {
  getAttrs(['sheet_type', 'dur_base'], v => readSection('happiness', ['power'], hap => readSection('dominance', ['power'], dom => {
    const sum = rows => Object.values(rows).reduce((a, r) => a + (num(r.power) || 0), 0);
    const h = sum(hap), d = sum(dom), n = v.sheet_type === 'monster' ? d : h, base = num(v.dur_base);
    setAttrs({ power_total: h, dominance_total: d, dur_sum: n, durability: base === null ? '—' : base + n }, { silent: true });
  })));
}
on('change:sheet_type change:dur_base change:repeating_happiness:power remove:repeating_happiness change:repeating_dominance:power remove:repeating_dominance sheet:opened', calcDurability);

// 상주 타입 어빌리티의 코스트 합계
function calcPassiveCost() {
  readSection('abilities', ['type', 'cost'], rows => {
    setAttrs({ passive_cost: Object.values(rows).filter(r => r.type === '상주').reduce((a, r) => a + (num(r.cost) || 0), 0) }, { silent: true });
  });
}
on('change:repeating_abilities:type change:repeating_abilities:cost remove:repeating_abilities sheet:opened', calcPassiveCost);

// 팔로워 (룰북 3.02): 판정치 [10 − 레벨](최저 5), 내구력 [2 + 레벨]
const followerTn = lv => (lv === null ? '—' : Math.max(5, 10 - lv));
const followerHp = lv => (lv === null ? '—' : 2 + lv);
function calcFollowers() {
  readSection('followers', ['lv'], rows => {
    const out = {};
    Object.entries(rows).forEach(([id, r]) => { const lv = num(r.lv); out[`repeating_followers_${id}_tn`] = followerTn(lv); out[`repeating_followers_${id}_hp`] = followerHp(lv); });
    setAttrs(out, { silent: true });
  });
}
on('change:repeating_followers:lv sheet:opened', calcFollowers);

// 몬스터 행동 횟수: 1·2사이클 [헌터 수 − 2]회, 3사이클 [헌터 수 − 1]회
on('change:hunters sheet:opened', () => getAttrs(['hunters'], v => {
  const p = num(v.hunters), f = k => (p === null ? '—' : Math.max(0, p - k));
  setAttrs({ acts1: f(2), acts2: f(2), acts3: f(1) }, { silent: true });
}));

// 여유 · 혈량 ▲▼
[['reserve', 'reserveup', 1], ['reserve', 'reservedn', -1], ['blood', 'bloodup', 1], ['blood', 'blooddn', -1]].forEach(([attr, btn, d]) => {
  on(`clicked:${btn}`, () => getAttrs([attr], v => setAttrs({ [attr]: Math.max(0, (num(v[attr]) || 0) + d) })));
});

// 어빌리티: 광기 그룹(헌터 전용) 줄 추가
[['addmild', '경증광기'], ['addsevere', '중증광기']].forEach(([btn, name]) => {
  on(`clicked:${btn}`, () => {
    const p = `repeating_abilities_${generateRowID()}_`;
    setAttrs({ [`${p}name`]: name, [`${p}type`]: '상주', [`${p}cost`]: '×', [`${p}skill`]: '없음' });
  });
});

// 새 캐릭터: 아이템 3칸을 펼쳐 둔다(값은 비움 — 숨은 row 칸으로 줄만 만든다)
on('sheet:opened', () => getAttrs(['sheet_version'], v => {
  if (v.sheet_version) return;
  getSectionIDs('items', ids => {
    const out = { sheet_version: 1 };
    if (!ids.length) for (let i = 0; i < 3; i++) out[`repeating_items_${generateRowID()}_row`] = 1;
    setAttrs(out, { silent: true });
  });
}));
