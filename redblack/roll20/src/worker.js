// 적과 흑 sheet worker — 카드 패드 · 〔기동〕 계산 (주사위 없음)
'use strict';

const num = v => { const n = parseInt(String(v == null ? '' : v).replace(/[−－]/g, '-').trim(), 10); return Number.isNaN(n) ? null : n; };
const on1 = v => v === '1' || v === 1 || v === 'on';

// ── 카드: 코드 = 색(b 흑 · r 적) + 값(a 2~10 j q k x=광대). 숫자 카드 = 숫자 · 그림 카드 = 10 · A = 15 · 광대 = 15
const RANKS = ['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'x'];
const SLOTS = 10;
const SUIT = { b: ['♠', '♣'], r: ['♥', '♦'] };
const val = k => (k === 'x' || k === 'a' ? 15 : /^[jqk]$/.test(k) ? 10 : +k);
const label = k => (k === 'x' ? 'JK' : k.toUpperCase());
const PC = Array.from({ length: SLOTS }, (_, i) => `pc${i + 1}`);
const parse = code => { const m = String(code || '').match(/^([br])(a|10|[2-9]|j|q|k|x)$/); return m ? { c: m[1], k: m[2] } : null; };
const played = v => PC.map(k => parse(v[k])).filter(Boolean);

// 낸 카드 칸을 다시 씀: 코드 · 표시 글자 · 무늬(같은 색 안에서 ♠♣ / ♥♦ 를 번갈아) · 합계
function writeHand(cards) {
  const out = {}, cnt = { b: 0, r: 0 };
  PC.forEach((k, i) => {
    const c = cards[i];
    if (!c) { out[k] = ''; out[`${k}_k`] = ''; out[`${k}_s`] = ''; return; }
    out[k] = c.c + c.k; out[`${k}_k`] = label(c.k); out[`${k}_s`] = c.k === 'x' ? '★' : SUIT[c.c][cnt[c.c]++ % 2];
  });
  out.sum_b = cards.filter(c => c.c === 'b').reduce((a, c) => a + val(c.k), 0);
  out.sum_r = cards.filter(c => c.c === 'r').reduce((a, c) => a + val(c.k), 0);
  out.sum_n = cards.length;
  setAttrs(out);
}
['b', 'r'].forEach(col => RANKS.forEach(k => on(`clicked:${col}${k}`, () => getAttrs(PC, v => {
  const cards = played(v);
  if (cards.length < SLOTS) writeHand([...cards, { c: col, k }]);
}))));
PC.forEach((_, i) => on(`clicked:pcx${i + 1}`, () => getAttrs(PC, v => {
  const cards = PC.map(k => parse(v[k]));
  if (!cards[i]) return;
  cards.splice(i, 1);
  writeHand(cards.filter(Boolean));
})));
on('clicked:clr', () => writeHand([]));

// ── 새 시트
on('sheet:opened', () => getAttrs(['sheet_version'], v => { if ((num(v.sheet_version) || 0) < 1) setAttrs({ sheet_version: 1, sum_b: 0, sum_r: 0, sum_n: 0 }, { silent: true }); }));

// ════════ 채팅 카드 — startRoll 로 보낸다 (굴림 없음) ════════
const clean = s => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\{/g, '｛').replace(/\}/g, '｝')
  .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]').replace(/([@%&])\{/g, '$1 {').trim();
const field = (k, v) => (v === '' || v == null ? '' : ` {{${k}=${clean(v)}}}`);
const prefix = v => (String(v.roll_display_to || '').trim() ? '/w gm ' : '');
const TPL = '&{template:redblack}';
const post = s => startRoll(s, r => finishRoll(r.rollId, {}));

// 〔기동〕 해석: 「흑：12」 = 흑 합계 12 이상, 「적：5」, 「？：10」 = 색 상관없이 합계 10 이상. 그 밖(「—」, 빈칸) = 조건 없음
function boot(req, cards) {
  const m = String(req || '').replace(/\s/g, '').match(/^(흑|적|？|\?)[：:](\d+)$/);
  if (!m) return null;
  const b = cards.filter(c => c.c === 'b').reduce((a, c) => a + val(c.k), 0), r = cards.filter(c => c.c === 'r').reduce((a, c) => a + val(c.k), 0);
  const col = m[1] === '?' ? '？' : m[1], need = +m[2], have = col === '흑' ? b : col === '적' ? r : b + r;
  return { ok: have >= need, have, need, col };
}
function chips(cards) {
  const cnt = { b: 0, r: 0 };
  return cards.map((c, i) => { const s = c.k === 'x' ? '★' : SUIT[c.c][cnt[c.c]++ % 2]; return ` {{${c.c}k${i + 1}=${label(c.k)}}} {{${c.c}s${i + 1}=${s}}}`; }).join('');
}
// 마법 기동: 조건을 맞췄거나 조건이 없으면 낸 카드를 비운다
function invoke(v, { title, en, head, req, lvx, eff, acc, sup }) {
  const cards = played(v), c = boot(req, cards), r = String(req || '').trim();
  const sb = cards.filter(x => x.c === 'b').reduce((a, x) => a + val(x.k), 0), sr = cards.filter(x => x.c === 'r').reduce((a, x) => a + val(x.k), 0);
  let s = `${prefix(v)}${TPL}${field('title', title)}${field('en', en)}${field('head', head)}${acc ? ' {{acc=1}}' : ''}${sup ? ' {{sup=1}}' : ''}`;
  s += field('req', r || '—') + (/^흑/.test(r) ? ' {{reqb=1}}' : /^적/.test(r) ? ' {{reqr=1}}' : '') + (c ? (c.ok ? ' {{ok=1}}' : ' {{ng=1}}') : '');
  s += cards.length ? `${chips(cards)} {{sb=${sb}}} {{sr=${sr}}} {{sn=${cards.length}}}` : ' {{none=1}}';
  if (c && !c.ok) s += field('note', `${c.col === '？' ? '합계' : `${c.col} 합계`} ${c.have} / 필요 ${c.need}`);
  s += field('lvx', lvx) + field('eff', eff);
  post(s);
  if (!c || c.ok) writeHand([]);
}

// 기본 선언 (이름 · 본문은 인쇄 → 워커가 가진다)
const BASIC = [['현장 재구축', '오브젝트 1개를 대상으로, 대상을 소환해 질문 1개에 답하게 한다. 대상은 자신의 인식으로 증언하고, 진실로 등록한다.\n증언에서는 거짓말을 하지 않지만, 대상의 지성으로는 이해할 수 없는 정보는 증언할 수 없다.'],
  ['인물 재구축', '캐스트 1명을 대상으로, 대상을 소환해 질문 1개에 답하게 한다. 대상은 자신의 인식으로 증언하고, 진실로 등록한다.\n증언에서는 거짓말을 하지 않지만, 모르는 정보는 증언할 수 없고, 오인한 정보도 그대로 말한다.'],
  ['심문 선고', '당신을 대상으로, YES / NO 로 답할 수 있는 질문을 하고, GM 은 답이 YES 면 YES 라고 답하고, 진실로 등록한다.\n답이 NO 인 경우나, 애초에 시나리오 안에 답이 없으면 "불명" 이라고 GM 은 고한다.'],
  ['물질 재변성', '오브젝트 1개를 대상으로, 대상 크기가 손바닥 크기라면, 다른 것으로 바꾼다, 라는 환상으로 등록한다.\n어떤 형상과 기능을 가질지는 자유롭게 정한다.'],
  ['서약 재설정', '캐스트 1명을 대상으로, 대상의 마음을 세뇌해, 지정한 하루, 대상이 "절대 하지 않는 금칙" 을 정해서, 환상으로 등록한다.\n대상이 금칙의 행동을 하지 않는 것이 보장된다.\n대상이 직접 사망하는 룰은 설정할 수 없다.'],
  ['각본 검색', '단어 최대 2개를 대상으로, GM 은 대상 전부를 포함한 미발견 각본을 검색해, 해당한 수가 1건이면 환상으로 등록한다.\n해당이 1건이 아닌 경우, 해당 건수만 알 수 있다.']];
BASIC.forEach(([n, t], i) => {
  const k = `bc${i + 1}`;
  on(`clicked:${k}`, () => getAttrs([...PC, `${k}_lv`, `${k}_boot`, `${k}_lvx`, 'roll_display_to'], v => {
    const lv = num(v[`${k}_lv`]);
    invoke(v, { title: n, en: 'BASIC CALLING', head: `선언 마법${lv ? ` · LV ${lv}` : ''}`, req: v[`${k}_boot`], lvx: lv > 1 ? v[`${k}_lvx`] : '', eff: t });
  }));
});
for (let i = 1; i <= 6; i++) {
  const k = `nc${i}`;
  on(`clicked:${k}`, () => getAttrs([...PC, `${k}_name`, `${k}_lv`, `${k}_boot`, `${k}_text`, 'roll_display_to'], v => {
    const n = (v[`${k}_name`] || '').trim(), lv = num(v[`${k}_lv`]);
    if (n) invoke(v, { title: n, en: 'NOBLE CALLING', head: `선언 마법${lv ? ` · LV ${lv}` : ''}`, req: v[`${k}_boot`], eff: v[`${k}_text`] });
  }));
}
for (let i = 1; i <= 9; i++) {
  const k = `au${i}`;
  on(`clicked:${k}`, () => getAttrs([...PC, `${k}_name`, `${k}_boot`, `${k}_text`, `${k}_acc`, `${k}_sup`, 'roll_display_to'], v => {
    const n = (v[`${k}_name`] || '').trim();
    if (n) invoke(v, { title: n, en: 'BATTLE MAGIC', head: '권한 마법', req: v[`${k}_boot`], eff: v[`${k}_text`], acc: on1(v[`${k}_acc`]), sup: on1(v[`${k}_sup`]) });
  }));
}

// 고발 공격: 위력 × 횟수
on('clicked:atk', () => getAttrs(['acc_power', 'acc_count', 'roll_display_to'], v => {
  const p = Math.max(0, num(v.acc_power) || 0), n = Math.max(0, num(v.acc_count) || 0);
  post(`${prefix(v)}${TPL}${field('title', '고발 공격')} {{en=ACCUSATION}}${field('head', '적대 진영에')} {{big=${p * n}}}${field('how', `위력 ${p} × 횟수 ${n}`)}`);
}));

// GM 귓속말은 시트의 롤 단추(value 가 /w gm 으로 시작)로 보낸다 — 워커를 거치지 않는 Roll20 기본 방식
