// 아마데우스 시트 워커 — 능력치 평가 계산 · 생명력 최대치 · 굴림 · 채팅 출력(Custom Roll Parsing)
// DATA(능력치 · 모드 기호 · 생명력 계수 · 부모신의 축복 · 식료 문구)는 build.py 가 아래 줄에 넣는다
// @DATA
const num = v => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };
const KEYS = DATA.abil.map(([k]) => k);
// 랭크 → 굴리는 다이스 수 (D 는 2개 굴려 낮은 눈 — 룰 1·02·01 · 3·03)
const DICE = { S: 4, A: 3, B: 2, C: 1, D: 2 };
const sign = n => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const grade = (r, m) => (r ? r + (m > 0 ? '+'.repeat(m) : m < 0 ? '−'.repeat(-m) : '') : '');

// ── 능력치: 랭크 · 모드 → 평가 글자 · 다이스 수 · 수정 (표시 칸). 열 때마다 다시 채운다 — 가져오기 · API 로 랭크만 바뀐 경우도
const abilAttrs = KEYS.flatMap(k => [`${k}_rank`, `${k}_mode`]);
const shown = v => {
  const out = {};
  KEYS.forEach(k => {
    const r = v[`${k}_rank`], m = num(v[`${k}_mode`]) || 0;
    Object.assign(out, { [`${k}_grade`]: grade(r, m), [`${k}_dice`]: r ? `${DICE[r]}개` : '', [`${k}_low`]: r === 'D' ? '낮은 눈' : '', [`${k}_mod`]: r ? sign(m) : '' });
  });
  return out;
};
on('sheet:opened', () => getAttrs(abilAttrs.concat('sheet_version'), v => {
  setAttrs(Object.assign(shown(v), num(v.sheet_version) >= 1 ? {} : { sheet_version: 1 }), { silent: true });
}));
// 무용 · 영력이 바뀌면 생명력 기본(최대치에서 활력 뺀 값)도 다시 계산
on(abilAttrs.map(a => `change:${a}`).join(' '), e => getAttrs(abilAttrs, v => {
  const out = shown(v);
  const src = (e.sourceAttribute || '').toLowerCase();
  if (/^(war|spi)_/.test(src) && v.war_rank && v.spi_rank) {
    const hp = ['war', 'spi'].reduce((t, k) => t + DATA.hpRank[v[`${k}_rank`]] + (DATA.hpMode[v[`${k}_mode`] || '0'] || 0), 0);
    out.hp_base = Math.max(0, hp);
  }
  setAttrs(out);
}));
// 최대치 = 기본 + 활력 (룰 5·03: 활력은 최대치만 올린다)
on('change:hp_base change:vigor', () => getAttrs(['hp_base', 'vigor'], v => {
  const b = num(v.hp_base);
  setAttrs({ hp_max: b == null ? '' : b + (num(v.vigor) || 0) });
}));
// 현재치 −/+ (0 ~ 최대치)
[['hpup', 1], ['hpdn', -1]].forEach(([btn, d]) => on(`clicked:${btn}`, () => getAttrs(['hp', 'hp_max'], v => {
  const mx = num(v.hp_max), n = Math.max(0, (num(v.hp) || 0) + d);
  setAttrs({ hp: mx == null ? n : Math.min(mx, n) });
})));

// ════════ 굴림 — Custom Roll Parsing (startRoll → finishRoll) ════════
// 채팅 카드는 src/rolltemplate.html. computed 칸은 매크로 앞쪽에 둔다 (roll20kit/LESSONS.md 2장)
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const post = (s, computed) => startRoll(s, r => finishRoll(r.rollId, computed ? computed(r.results) : {}));
const T = '&{template:amadeus}';
const rows = list => list.filter(([, v]) => v).slice(0, 3).map(([k, v], i) => field(`k${i + 1}`, k) + field(`v${i + 1}`, v)).join('');
const rowOf = (e, sec) => { const m = `${e.sourceAttribute || ''} ${e.triggerName || ''}`.match(new RegExp(`repeating_${sec}_([^_\\s]+)_`, 'i')); return m ? `repeating_${sec}_${m[1]}_` : null; };

// 행위판정 (룰 3·01~3·03):
//   랭크만큼 D6 (D 는 2개 굴려 가장 낮은 눈) · 액션 다이스는 가장 높은 눈(D 는 가장 낮은 눈)으로 자동
//   달성치 = 액션 다이스 + 능력치 수정 + 기타 수정 ≥ 목표치(기본 4) → 성공 · 액션 다이스 6 스페셜(성공) · 1 펌블(실패)
//   무드 다이스(인과)는 다이스 2개 이상 · 랭크D 아님일 때만 — 플레이어가 고르니 눈마다 운명의 수레바퀴 색만 보여 준다
//   ok: 1 성공 · 2 실패 · 3 스페셜 · 4 펌블 (카드 도장)
DATA.abil.forEach(([k, name]) => on(`clicked:${k}`, () => getAttrs([`${k}_rank`, `${k}_mode`, 'character_name', 'st_rage', 'st_corrupt'], v => {
  const r = v[`${k}_rank`], m = num(v[`${k}_mode`]) || 0;
  if (!r) return post(T + field('title', `${name} 판정`) + field('effect', `【${name}】 평가를 먼저 고르세요`) + field('who', v.character_name));
  const n = DICE[r], low = r === 'D';
  post(`${T} {{ok=[[0]]}} {{res=[[0]]}} {{sum=[[0]]}} {{calc=[[0]]}} {{tgt=[[0]]}} {{note=[[0]]}} {{a=[[0]]}} {{m=[[0]]}}`
    + ' {{x1=[[0]]}} {{x2=[[0]]}} {{x3=[[0]]}} {{x4=[[0]]}} {{d1=[[1d6]]}} {{d2=[[1d6]]}} {{d3=[[1d6]]}} {{d4=[[1d6]]}}'
    + ' {{target=[[?{목표치|4}]]}} {{bonus=[[?{기타 수정|0}]]}}'
    + field('title', `${name} 판정`) + field('sub', `${grade(r, m)} · ${low ? '2D6 낮은 눈' : `${n}D6`}`) + field('who', v.character_name)
    + (v.st_rage === '1' ? field('st1', '분노: 가장 낮은 눈을 무드 다이스로') : '') + (v.st_corrupt === '1' ? field('st2', '타락: 무드 다이스를 고르려면 【생명력】 1점 감소') : ''),
  x => {
    const ds = [1, 2, 3, 4].map(i => x[`d${i}`].result), use = ds.slice(0, n);
    const ai = use.indexOf(low ? Math.min(...use) : Math.max(...use)), act = use[ai];
    const bonus = x.bonus.result || 0, tgt = x.target.result, sum = act + m + bonus;
    const ok = act === 6 ? 3 : act === 1 ? 4 : sum >= tgt ? 1 : 2, mood = !low && n >= 2;
    const calc = [`액션 다이스 ${act}`, m && `수정 ${sign(m)}`, bonus && `기타 ${sign(bonus)}`].filter(Boolean).join(' ');
    const out = { ok, res: ['', '성공', '실패', '스페셜', '펌블'][ok], sum, calc, tgt, a: ai + 1, m: mood ? 1 : 0,
      note: mood ? '무드 다이스 하나를 골라 그 색 영역에 인과 1개 (6 은 아무 곳)' : low ? '랭크D — 인과 없음' : '다이스 1개 — 인과 없음' };
    ds.forEach((d, i) => { out[`d${i + 1}`] = d; out[`x${i + 1}`] = i < n && i !== ai ? 1 : 0; });
    return out;
  });
})));

// 활력: [레벨]D6 → 활력 칸에 넣고 최대치를 알린다 (룰 5·03)
on('clicked:vigor', () => getAttrs(['level', 'hp_base', 'character_name'], v => {
  const lv = Math.max(1, num(v.level) || 1), b = num(v.hp_base);
  post(`${T} {{dice=[[0]]}} {{res=[[0]]}} {{roll=[[${lv}d6]]}}` + field('title', '활력') + field('sub', `레벨 ${lv} · ${lv}D6`) + field('who', v.character_name), x => {
    const t = x.roll.result;
    setAttrs({ vigor: t });
    return { dice: t, res: b == null ? '생명력 최대치 + ' + t : `생명력 최대치 ${b} → ${b + t}` };
  });
}));

// 부모신의 축복(인쇄된 첫 줄) · 기프트 · 아이템: 채팅에 출력
on('clicked:blessing', () => getAttrs(['blessing_seal', 'character_name'], v => {
  const [name, cat, cond, chk, eff] = DATA.blessing;
  post(T + field('title', name) + field('sub', `${cat} · 조건 ${cond}`) + rows([['판정', chk]]) + field('effect', eff)
    + field('who', v.character_name) + (v.blessing_seal === '1' ? field('flag', '봉인') : ''));
}));
on('clicked:repeating_gifts:use', e => {
  const row = rowOf(e, 'gifts'); if (!row) return;
  getAttrs(['seal', 'name', 'cat', 'cond', 'check', 'tag', 'eff'].map(f => row + f).concat('character_name'), v => {
    const g = f => v[row + f] || '';
    post(T + field('title', g('name') || '기프트') + field('sub', [g('cat'), g('cond') && `조건 ${g('cond')}`].filter(Boolean).join(' · '))
      + rows([['판정', g('check')], ['태그', g('tag')]]) + field('effect', g('eff')) + field('who', v.character_name) + (g('seal') === '1' ? field('flag', '봉인') : ''));
  });
});
on('clicked:repeating_items:use', e => {
  const row = rowOf(e, 'items'); if (!row) return;
  getAttrs(['name', 'kind', 'power', 'spec'].map(f => row + f).concat('character_name'), v => {
    const g = f => v[row + f] || '';
    post(T + field('title', g('name') || '아이템') + field('sub', [{ p: '상비품', c: '소비품' }[g('kind')], g('power') && `위력 ${g('power')}`].filter(Boolean).join(' · '))
      + field('effect', g('spec')) + field('who', v.character_name));
  });
});
// 식료: 1개 써서 생명력 1점 회복 (최대치까지)
on('clicked:eat', () => getAttrs(['food', 'hp', 'hp_max', 'character_name'], v => {
  const f = num(v.food) || 0; if (f <= 0) return;
  const hp = num(v.hp) || 0, mx = num(v.hp_max), nh = mx == null ? hp + 1 : Math.min(mx, hp + 1);
  setAttrs({ food: f - 1, hp: nh });
  post(T + field('title', '식료') + field('sub', `식료 ${f} → ${f - 1}`) + field('effect', `${DATA.food} 【생명력】 ${hp} → ${nh}`) + field('who', v.character_name));
}));
