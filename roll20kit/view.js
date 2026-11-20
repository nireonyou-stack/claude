// 가상 Roll20 — 프로 계정 없이 시트가 Roll20 에서 어떻게 보이고 굴러가는지 보는 한 장짜리 페이지를 만든다.
//
//   node roll20kit/view.js <시트 폴더> <출력.html> [견본.json]
//
// - 시트는 Roll20 처럼 iframe 안 <div class="charsheet"> 에, Roll20 기본 CSS(흉내 — LESSONS.md 3장의 함정 포함) 위에 그린다
// - 반복 섹션은 Roll20 처럼 fieldset 을 숨기고 .repcontainer > .repitem 으로 펼치고 아래에 Modify · +Add
// - sheet worker 를 그대로 돌린다 (getAttrs · setAttrs · getSectionIDs · generateRowID · removeRepeatingRow · startRoll · finishRoll)
// - 굴림은 ?{…} 를 묻는 창 → 인라인 굴림 → 롤 템플릿({{#}} · {{^}} · rollTotal/Greater/Less/Between · computed::) → 채팅
// - 채팅 문서에는 Roll20 처럼 시트 CSS 중 .sheet-rolltemplate-* 규칙만 넣는다. lint.py 가 '카드 CSS 가 빠질' 문제를 찾으면
//   채팅에 CSS 를 하나도 넣지 않는다 (실제 게임에서 벌어지는 그대로 — LESSONS.md 1장)
// 출력은 Artifact 로 올릴 수 있는 조각(doctype 없음). 로컬에서 볼 때는 <!doctype html> 로 감싸 연다.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [, , dir, out, samplesPath] = process.argv;
if (!dir || !out) { console.error('쓰는 법: node roll20kit/view.js <시트 폴더> <출력.html> [견본.json]'); process.exit(2); }
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'sheet.json'), 'utf8'));
let html = fs.readFileSync(path.join(dir, meta.html), 'utf8');
const css = fs.readFileSync(path.join(dir, meta.css), 'utf8');
const templates = {};
html = html.replace(/<rolltemplate class="sheet-rolltemplate-([a-z0-9-]+)">([\s\S]*?)<\/rolltemplate>/g, (a, n, body) => { templates[n] = body; return ''; });
let worker = '';
html = html.replace(/<script type="text\/worker">([\s\S]*?)<\/script>/g, (a, w) => { worker += w; return ''; });
// 채팅 카드 CSS 를 Roll20 이 실을지: lint.py 의 CSS 오류(1장)가 하나라도 있으면 안 실림
let lintOut = '';
try { lintOut = execFileSync('python3', [path.join(__dirname, 'lint.py'), dir], { encoding: 'utf8' }); } catch (e) { lintOut = String(e.stdout || ''); }
const cardErrs = lintOut.split('\n').filter(l => l.startsWith('ERROR CSS'));
const imports = (css.match(/@import[^;]*;/g) || []).join('\n');
const cardCss = cardErrs.length ? '' : imports + '\n' + (() => {
  const body = css.replace(/@import[^;]*;/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const outRules = []; let depth = 0, start = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}' && --depth === 0) { const r = body.slice(start, i + 1).trim(); if (r.split('{')[0].split(',').every(s => s.trim().startsWith('.sheet-rolltemplate-'))) outRules.push(r); start = i + 1; }
  }
  return outRules.join('\n');
})();
const samples = samplesPath ? JSON.parse(fs.readFileSync(samplesPath, 'utf8')) : [{ name: '새 캐릭터', attrs: {} }];

// Roll20 의 시트 iframe 기본 CSS 흉내 (Bootstrap 2 꼴) — 실제 값과 똑같지는 않다. LESSONS.md 3장의 함정은 넣어 둔다
const BASE = `
body{margin:0;background:#fff;color:#333;font:13px/18px "Helvetica Neue",Helvetica,Arial,sans-serif}
body.sheet-darkmode{background:#1d1d1d;color:#ddd}
.charsheet{padding:10px 20px 20px}
.charsheet label{display:inline-block;width:100%;margin-bottom:5px;font-weight:bold}
.charsheet input[type=text],.charsheet input[type=number],.charsheet select,.charsheet textarea{display:inline-block;height:20px;padding:4px 6px;margin-bottom:10px;font-size:13px;line-height:20px;color:#555;background:#fff;border:1px solid #ccc;border-radius:4px;box-shadow:inset 0 1px 1px rgba(0,0,0,.075);width:165px;vertical-align:middle}
.charsheet select{width:220px;height:30px}
.charsheet textarea{height:auto;width:300px}
.charsheet input[type=checkbox],.charsheet input[type=radio]{margin:4px 0 0;width:auto;height:auto}
.charsheet button{display:inline-block;padding:4px 12px;margin:0;font-size:14px;line-height:20px;color:#333;text-align:center;text-shadow:0 1px 1px rgba(255,255,255,.75);background:linear-gradient(#fff,#e6e6e6);border:1px solid #ccc;border-radius:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 1px 2px rgba(0,0,0,.05)}
.charsheet .mark{background:#fcf8e3;padding:.2em}
.charsheet fieldset{border:0;margin:0;padding:0}
.charsheet .repcontrol{overflow:hidden;margin-top:4px}
/* Roll20 의 Modify · +Add — 블러드문 '.bm .repcontrol button'(0,2,1) 이 실제로 덮였으니 이보다 약하게 둔다 */
.charsheet .repcontrol_edit,.charsheet .repcontrol_add{background:#333;color:#fff;text-shadow:none;border:0;font-size:12px;padding:2px 8px;margin-right:4px}
.charsheet .repitem{position:relative}
.charsheet .repcontainer.editmode .repitem{border:1px dashed #999;margin:2px 0;padding-right:24px}
.charsheet .repcontrol_del{display:none}
.charsheet .repcontainer.editmode .repcontrol_del{display:block;position:absolute;right:2px;top:2px;width:20px;height:20px;padding:0;line-height:18px;background:#c33;color:#fff;border:0;border-radius:50%;font-size:12px}
body.sheet-darkmode .charsheet input[type=text],body.sheet-darkmode .charsheet input[type=number],body.sheet-darkmode .charsheet select,body.sheet-darkmode .charsheet textarea{background:#2a2a2a;color:#ddd;border-color:#555}
`;

const page = `<title>가상 Roll20 · ${meta.html.replace(/\.html$/, '')}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{--bg:#e7e6e3;--panel:#fff;--ink:#222;--sub:#6b6b6b;--line:#cfcfcf;--accent:#3a6fd8;--warn:#b3261e;--chatbg:#fff}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#151515;--panel:#202020;--ink:#e6e6e6;--sub:#9a9a9a;--line:#3a3a3a;--accent:#7aa2ff;--warn:#ff8a80;--chatbg:#1d1d1d;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#151515;--panel:#202020;--ink:#e6e6e6;--sub:#9a9a9a;--line:#3a3a3a;--accent:#7aa2ff;--warn:#ff8a80;--chatbg:#1d1d1d;color-scheme:dark}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink);font:13px/1.45 system-ui,'Noto Sans KR',sans-serif;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:14px 30px}
.top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-bottom:10px}
.top h1{margin:0;font-size:17px}
.top .sub{color:var(--sub);font-size:12px}
.top label{display:flex;align-items:center;gap:6px;font-size:12px}
.top select,.top button{font:inherit;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:3px 8px}
.warnbar{background:var(--warn);color:#fff;padding:6px 10px;border-radius:4px;margin-bottom:8px;font-size:12px}
.vt{display:flex;gap:12px;align-items:flex-start}
.win{flex:none;background:var(--panel);border:1px solid var(--line);border-radius:6px;overflow:hidden;max-width:100%}
.win .tt{display:flex;align-items:center;gap:8px;padding:6px 10px;background:linear-gradient(#f4f4f4,#dcdcdc);color:#222;font-weight:700;font-size:13px;border-bottom:1px solid #bbb}
.win .tt small{font-weight:400;color:#555}
.frame-wrap{overflow:auto;max-width:100%;max-height:78vh}
iframe{display:block;width:870px;height:1400px;border:0;background:#fff}
#textchat{flex:0 0 300px;background:var(--chatbg);border:1px solid var(--line);border-radius:6px;max-height:84vh;overflow:auto}
#textchat .ct{padding:6px 10px;font-weight:700;border-bottom:1px solid var(--line)}
#textchat .content{padding:6px 4px}
#textchat .message{position:relative;margin:0 0 6px;padding:5px 5px 5px 7px;color:#222;font:13px/1.4 "Helvetica Neue",Helvetica,Arial,sans-serif}
#textchat .message .by{display:block;font-weight:bold;margin-bottom:2px;color:var(--ink)}
#textchat .message .tstamp{float:right;font-size:10px;color:var(--sub)}
/* Roll20 의 인라인 굴림 노란 상자 — 클래스 하나짜리 규칙이라 카드 CSS 의 '.sheet-rolltemplate-x .inlinerollresult' 로 덮인다 */
.inlinerollresult{display:inline-block;min-width:1.5em;text-align:center;font-weight:bold;padding:0 3px 0 3px;border:2px solid #fec;background:#fef68e;color:#000;cursor:help}
.inlinerollresult.fullcrit{border-color:#3fb315}
.inlinerollresult.fullfail{border-color:#b31515}
#textchat .empty{color:var(--sub);font-size:12px;padding:6px}
.q{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9}
.q .qb{background:var(--panel);color:var(--ink);border-radius:6px;padding:14px 16px;min-width:260px;max-width:calc(100vw - 32px);box-shadow:0 8px 30px rgba(0,0,0,.35)}
.q h3{margin:0 0 10px;font-size:14px}
.q .qo{display:flex;flex-direction:column;gap:6px}
.q .qi{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:4px;background:var(--bg);color:var(--ink)}
.q button{font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:4px;background:var(--bg);color:var(--ink);text-align:left;cursor:pointer}
.q button:hover,.q button:focus-visible{border-color:var(--accent)}
@media (max-width: 900px){.vt{flex-direction:column}#textchat{flex-basis:auto;width:100%;max-width:300px}}
</style>
<style id="cardcss">${cardCss.replace(/<\/style/gi, '<\\/style')}</style>
<div class="top">
  <h1>가상 Roll20</h1><span class="sub">${meta.html.replace(/\.html$/, '')} — 프로 계정 없이 보는 시트 · 굴림 · 채팅 카드 (Roll20 기본 CSS 는 흉내)</span>
  <label>캐릭터 <select id="who"></select></label>
  <label><input type="checkbox" id="dark"> Roll20 다크 모드</label>
  <button type="button" id="reset">견본으로 되돌리기</button>
</div>
${cardErrs.length ? `<div class="warnbar">⚠ 실제 Roll20 에서는 채팅 카드 CSS 가 빠집니다 — lint: ${cardErrs.length}개 (${cardErrs[0].replace(/^ERROR /, '').replace(/</g, '&lt;')} …)</div>` : ''}
<div class="vt">
  <div class="win"><div class="tt"><span id="tt">캐릭터</span><small>Character Sheet</small></div><div class="frame-wrap"><iframe id="sheet" title="캐릭터 시트"></iframe></div></div>
  <div id="textchat"><div class="ct">채팅</div><div class="content" id="chat"><div class="empty">시트의 단추를 누르면 여기에 카드가 쌓여요</div></div></div>
</div>
<script>
const SHEET = ${JSON.stringify(html)};
const CSS = ${JSON.stringify(css)};
const BASE = ${JSON.stringify(BASE)};
const TPL = ${JSON.stringify(templates)};
const WORKER = ${JSON.stringify(worker)};
const SAMPLES = ${JSON.stringify(samples)};
${clientCode.toString().replace(/^function clientCode\(\) \{|\}$/g, '')}
</script>`;
fs.writeFileSync(out, page);
console.log(`${out} · ${(page.length / 1024).toFixed(0)}KB · 카드 CSS ${cardErrs.length ? '빠짐 (lint ' + cardErrs.length + ')' : '실림'}`);

// ───────── 브라우저 쪽 (문자열로 페이지에 들어간다) ─────────
function clientCode() {
  const $ = s => document.querySelector(s);
  const frame = $('#sheet');
  let chars = [], cur = null, seq = 0, rid = 0;
  const pending = new Map();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const genId = () => { const A = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'; let t = Date.now() + (++seq), s = ''; for (let i = 0; i < 8; i++) { s = A[t % 64] + s; t = Math.floor(t / 64); } for (let i = 0; i < 12; i++) s += A[Math.floor(Math.random() * 64)]; return s.replace(/_/g, 'Z'); };
  const later = f => setTimeout(f, 0);

  // 시트 HTML 의 기본값 (Roll20 은 아직 없는 속성에 시트의 기본값을 돌려준다)
  const tmp = document.createElement('div'); tmp.innerHTML = SHEET;
  const defaults = {}, repDefaults = {};
  tmp.querySelectorAll('[name^="attr_"]').forEach(el => {
    const f = el.getAttribute('name').slice(5).toLowerCase(), fs2 = el.closest('fieldset'), bag = fs2 ? (repDefaults[fs2.className.split(' ')[0].toLowerCase()] ||= {}) : defaults;
    if (el.type === 'radio') { if (el.hasAttribute('checked') || !(f in bag)) bag[f] = el.getAttribute('value') || ''; return; }
    if (el.type === 'checkbox') { if (!(f in bag)) bag[f] = el.hasAttribute('checked') ? el.getAttribute('value') : '0'; return; }
    if (el.tagName === 'SELECT') { if (!(f in bag)) bag[f] = (el.querySelector('option[selected]') || el.querySelector('option'))?.value || ''; return; }
    if (el.tagName === 'TEXTAREA') { if (!(f in bag)) bag[f] = el.textContent; return; }
    if (el.tagName === 'INPUT' && !(f in bag)) bag[f] = el.getAttribute('value') || '';
  });
  const defOf = k => { const m = k.match(/^(repeating_[a-z0-9]+)_[^_]+_(.+)$/); return m ? repDefaults[m[1]]?.[m[2]] ?? '' : defaults[k] ?? ''; };

  // ── 캐릭터 하나 = 속성 저장소 + 워커 한 벌
  function makeChar(sample) {
    const ch = { name: sample.name, attrs: new Map(), handlers: {}, opened: false };
    Object.entries(sample.attrs || {}).forEach(([k, v]) => ch.attrs.set(k.toLowerCase(), String(v)));
    Object.entries(sample.rows || {}).forEach(([sec, rows]) => rows.forEach(r => { const id = genId().toLowerCase(); Object.entries(r).forEach(([f, v]) => ch.attrs.set(`repeating_${sec}_${id}_${f}`.toLowerCase(), String(v))); }));
    const get = k => { k = k.toLowerCase(); return ch.attrs.has(k) ? ch.attrs.get(k) : defOf(k); };
    const fire = (ev, info) => (ch.handlers[ev] || []).forEach(f => later(() => f(info)));
    const changed = (k, prev, val, src) => {
      const info = { sourceAttribute: k, sourceType: src, previousValue: prev, newValue: val, triggerName: 'change:' + k };
      const m = k.match(/^repeating_([a-z0-9]+)_([^_]+)_(.+)$/);
      if (m) { fire(`change:repeating_${m[1]}:${m[3]}`, info); fire(`change:repeating_${m[1]}`, info); } else fire('change:' + k, info);
    };
    const set = (k, v, src, silent) => { k = k.toLowerCase(); const prev = get(k); ch.attrs.set(k, String(v)); if (cur === ch) paint(k); if (!silent && String(prev) !== String(v)) changed(k, prev, String(v), src); };
    const ids = sec => { const p = `repeating_${sec.toLowerCase()}_`; const out = []; for (const k of ch.attrs.keys()) if (k.startsWith(p)) { const id = k.slice(p.length).split('_')[0]; if (!out.includes(id)) out.push(id); } return out; };
    const api = {
      on: (evs, f) => evs.trim().split(/\s+/).forEach(e => (ch.handlers[e.toLowerCase()] ||= []).push(f)),
      getAttrs: (ks, cb) => later(() => cb(Object.fromEntries(ks.map(k => [k, get(k)])))),
      setAttrs: (o, opt, cb) => { if (typeof opt === 'function') { cb = opt; opt = {}; } later(() => { const newRows = Object.keys(o).some(k => /^repeating_/.test(k) && !ch.attrs.has(k.toLowerCase())); Object.entries(o).forEach(([k, v]) => set(k, v, 'sheetworker', opt && opt.silent)); if (newRows && cur === ch) render(); cb && cb(); }); },
      getSectionIDs: (sec, cb) => later(() => cb(ids(sec))),
      generateRowID: genId,
      removeRepeatingRow: row => later(() => { row = row.toLowerCase(); for (const k of [...ch.attrs.keys()]) if (k.startsWith(row + '_')) ch.attrs.delete(k); if (cur === ch) render(); }),
      startRoll: (macro, cb) => startRoll(ch, macro, cb),
      finishRoll: (id, computed) => finishRoll(id, computed),
      getTranslationByKey: k => k, getTranslationLanguage: () => 'ko', setDefaultToken: () => {}, getActiveCharacterId: () => ch.name,
      console,
    };
    try { new Function(...Object.keys(api), WORKER)(...Object.values(api)); } catch (e) { console.error('워커 오류', e); chatNote('⚠ 워커 오류: ' + e.message); }
    Object.assign(ch, { get, set, fire, ids });
    return ch;
  }

  // ── 시트 그리기 (Roll20 처럼: fieldset 은 숨기고 .repcontainer 로 펼침)
  let doc = null;
  function render() {
    const scroll = doc ? doc.scrollingElement.scrollTop : 0;
    frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>' + BASE + '</style><style>' + CSS + '</style></head><body' + ($('#dark').checked ? ' class="sheet-darkmode"' : '') + '><div class="charsheet">' + SHEET + '</div></body></html>';
    frame.onload = () => {
      doc = frame.contentDocument;
      doc.querySelectorAll('fieldset[class^="repeating_"]').forEach(fsl => {
        const sec = fsl.className.split(' ')[0].toLowerCase().replace('repeating_', '');
        fsl.style.display = 'none';
        const box = doc.createElement('div'); box.className = 'repcontainer'; box.dataset.groupname = 'repeating_' + sec;
        cur.ids(sec).forEach(id => { const it = doc.createElement('div'); it.className = 'repitem'; it.dataset.reprowid = id; it.innerHTML = '<button class="repcontrol_del" title="지우기">×</button>' + fsl.innerHTML; box.append(it); });
        const ctl = doc.createElement('div'); ctl.className = 'repcontrol'; ctl.dataset.groupname = 'repeating_' + sec;
        ctl.innerHTML = '<button class="btn repcontrol_edit">Modify</button><button class="btn repcontrol_add">+Add</button>';
        fsl.after(box, ctl);
      });
      paintAll();
      bind();
      doc.scrollingElement.scrollTop = scroll;
      frame.style.height = Math.max(600, doc.documentElement.scrollHeight + 20) + 'px';
      if (!cur.opened) { cur.opened = true; cur.fire('sheet:opened', { triggerName: 'sheet:opened' }); }
    };
  }
  const nameOf = el => { const a = el.getAttribute('name').slice(5).toLowerCase(), it = el.closest('.repitem'); return it ? `${it.parentElement.dataset.groupname}_${it.dataset.reprowid}_${a}`.toLowerCase() : a; };
  function paintEl(el) {
    const v = cur.get(nameOf(el));
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = String(el.value) === String(v);
    else if (el.tagName === 'SPAN' || el.tagName === 'DIV') el.textContent = v;
    else if (el.tagName === 'IMG') { if (v) el.setAttribute('src', v); else el.removeAttribute('src'); }
    else { el.value = v; if (el.type === 'hidden' || el.tagName === 'INPUT') el.setAttribute('value', v); }
  }
  function paintAll() { doc.querySelectorAll('[name^="attr_"]').forEach(paintEl); frameHeight(); }
  function paint(k) { if (!doc) return; doc.querySelectorAll('[name^="attr_"]').forEach(el => { if (nameOf(el) === k) paintEl(el); }); frameHeight(); }
  const frameHeight = () => later(() => { if (doc) frame.style.height = Math.max(600, doc.documentElement.scrollHeight + 20) + 'px'; });
  function bind() {
    doc.addEventListener('change', e => {
      const el = e.target; if (!el.getAttribute || !(el.getAttribute('name') || '').startsWith('attr_')) return;
      const v = el.type === 'checkbox' ? (el.checked ? el.value : '0') : el.value;
      if (el.type === 'radio' && !el.checked) return;
      cur.set(nameOf(el), v, 'player');
    });
    doc.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('repcontrol_add')) { const sec = b.parentElement.dataset.groupname.replace('repeating_', ''), id = genId().toLowerCase(); const d = repDefaults['repeating_' + sec] || {}; Object.keys(d).forEach(f => cur.attrs.set(`repeating_${sec}_${id}_${f}`, d[f])); if (!Object.keys(d).length) cur.attrs.set(`repeating_${sec}_${id}_row`, ''); render(); return; }
      if (b.classList.contains('repcontrol_edit')) { const box = b.parentElement.previousElementSibling; const on = box.classList.toggle('editmode'); b.textContent = on ? 'Done' : 'Modify'; return; }
      if (b.classList.contains('repcontrol_del')) { const it = b.closest('.repitem'), sec = it.parentElement.dataset.groupname.replace('repeating_', ''), row = `repeating_${sec}_${it.dataset.reprowid}`; for (const k of [...cur.attrs.keys()]) if (k.startsWith(row + '_')) cur.attrs.delete(k); cur.fire(`remove:repeating_${sec}`, { sourceAttribute: row, triggerName: 'remove:' + row }); render(); return; }
      if (b.getAttribute('type') !== 'action') return;
      const n = (b.getAttribute('name') || '').replace(/^act_/, '').toLowerCase(), it = b.closest('.repitem');
      if (it) { const sec = it.parentElement.dataset.groupname, full = `${sec}_${it.dataset.reprowid}_${n}`; cur.fire(`clicked:${sec}:${n}`, { triggerName: 'clicked:' + full, sourceAttribute: full }); }
      else cur.fire('clicked:' + n, { triggerName: 'clicked:' + n });
    });
  }

  // ── 굴림: ?{…} 묻기 → 인라인 굴림 → (워커 finishRoll) → 롤 템플릿 → 채팅
  const ask = (label, opts) => new Promise(ok => {
    const box = document.createElement('div'); box.className = 'q';
    // ?{문구|기본값} 처럼 선택지가 하나뿐이면 Roll20 은 기본값이 든 입력칸을 띄운다
    const free = opts.length === 1 && !opts[0].comma;
    box.innerHTML = '<div class="qb" role="dialog" aria-label="' + esc(label) + '"><h3>' + esc(label) + '</h3><div class="qo">'
      + (free ? '<input type="text" class="qi" value="' + esc(opts[0][1]) + '" aria-label="' + esc(label) + '"><button type="button" data-ok>확인</button>'
        : opts.map((o, i) => '<button type="button" data-i="' + i + '">' + esc(o[0]) + '</button>').join('')) + '</div></div>';
    const done = v => { box.remove(); ok(v); };
    box.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) done(opts[+b.dataset.i][1]); if (e.target.closest('[data-ok]')) done(box.querySelector('.qi').value); });
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && free) done(box.querySelector('.qi').value); });
    document.body.append(box); (box.querySelector('.qi') || box.querySelector('button')).focus();
  });
  async function startRoll(ch, macro, cb) {
    const qs = [...new Set([...macro.matchAll(/\?\{([^|}]*)\|([^}]*)\}/g)].map(m => m[0]))], ans = {};
    for (const q of qs) { const m = q.match(/\?\{([^|}]*)\|([^}]*)\}/); ans[q] = await ask(m[1], m[2].split('|').map(o => { const p = o.split(','), r = [p[0], p.length > 1 ? p[p.length - 1] : p[0]]; r.comma = p.length > 1; return r; })); }
    let s = macro; Object.entries(ans).forEach(([q, v]) => { s = s.split(q).join(v); });
    const tm = s.match(/&\{template:([a-z0-9-]+)\}/), fields = {}, results = {};
    for (const m of s.matchAll(/\{\{([^=}]+)=([\s\S]*?)\}\}/g)) {
      const key = m[1].trim(); let dice = [], val = m[2];
      const rolls = [];
      val = val.replace(/\[\[([\s\S]*?)\]\]/g, (a, expr) => {
        const ds = []; const ex = expr.replace(/(\d*)d(\d+)/gi, (x, n, sides) => { let t = 0; for (let i = 0; i < (+n || 1); i++) { const d = 1 + Math.floor(Math.random() * +sides); ds.push({ d, sides: +sides }); t += d; } return t; });
        let r = 0; try { r = /^[\d+\-*/(). ]+$/.test(ex) ? Function('return (' + ex + ')')() : NaN; } catch (e) { r = NaN; }
        rolls.push({ r, ds }); dice = ds; return '\u0000' + (rolls.length - 1) + '\u0000';
      });
      fields[key] = { text: val, rolls };
      if (rolls.length) results[key] = { result: rolls[0].r, dice: rolls[0].ds.map(x => x.d), expression: m[2] };
    }
    const id = 'roll' + (++rid);
    pending.set(id, { ch, tpl: tm ? tm[1] : null, fields, results, by: ch.get('character_name') || ch.name });
    later(() => cb({ rollId: id, results }));
    // finishRoll 이 안 오면(계산 없는 굴림) 조금 뒤에 그대로 낸다
    setTimeout(() => { if (pending.has(id)) finishRoll(id, {}); }, 400);
  }
  function finishRoll(id, computed) {
    const p = pending.get(id); if (!p) return; pending.delete(id);
    const comp = Object.fromEntries(Object.entries(computed || {}).map(([k, v]) => [k, v]));
    const rollSpan = (roll, shown) => { const ds = roll.ds, crit = ds.length && ds.every(x => x.d === x.sides), fail = ds.length && ds.every(x => x.d === 1); return '<span class="inlinerollresult showtip tipsy-n-right' + (crit ? ' fullcrit' : fail ? ' fullfail' : '') + '">' + esc(shown) + '</span>'; };
    const show = k => { const f = p.fields[k]; if (!f) return ''; return esc(f.text).replace(/\u0000(\d+)\u0000/g, (a, i) => rollSpan(f.rolls[+i], f.rolls[+i].r)); };
    const showComputed = k => { const f = p.fields[k]; const v = k in comp ? comp[k] : f && f.rolls[0] ? f.rolls[0].r : ''; return f && f.rolls[0] ? rollSpan(f.rolls[0], v) : esc(v); };
    const valOf = arg => { const m = arg.match(/^computed::(.+)$/); if (m) return Number(comp[m[1]]); const f = p.fields[arg]; return f && f.rolls[0] ? Number(f.rolls[0].r) : NaN; };
    const truthy = k => { const f = p.fields[k]; return !!f && f.text !== ''; };
    const helper = tag => { const m = tag.match(/^(rollTotal|rollGreater|rollLess|rollBetween)\(\)\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/); if (!m) return null; const v = valOf(m[2]), a = Number(m[3]), b = Number(m[4]); return { rollTotal: v === a, rollGreater: v > a, rollLess: v < a, rollBetween: v >= a && v <= b }[m[1]]; };
    const renderT = t => {
      let outHtml = '', i = 0;
      while (i < t.length) {
        const o = t.indexOf('{{', i);
        if (o < 0) { outHtml += t.slice(i); break; }
        outHtml += t.slice(i, o);
        const c = t.indexOf('}}', o); const tag = t.slice(o + 2, c).trim();
        if (tag[0] === '#' || tag[0] === '^') {
          const inv = tag[0] === '^' || tag.startsWith('#^'), name = tag.replace(/^#\^|^[#^]/, '');
          // 도우미 뒤집기 {{#^rollTotal() …}} 는 {{/^rollTotal() …}} 로 닫는다 (Roll20 롤 템플릿 문서)
          const helperInv = tag.startsWith('#^'), closeTag = '{{/' + (helperInv ? '^' : '') + name + '}}'; let depth = 1, j = c + 2, end = -1;
          const openRe = new RegExp('\\{\\{' + (helperInv ? '#\\^' : '[#^]') + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}\\}', 'g');
          while (j < t.length) { const nc = t.indexOf(closeTag, j); if (nc < 0) break; openRe.lastIndex = j; let mo, opens = 0; while ((mo = openRe.exec(t)) && mo.index < nc) opens++; depth += opens - 1; if (depth === 0) { end = nc; break; } j = nc + closeTag.length; }
          if (end < 0) { outHtml += '[템플릿 오류: ' + esc(name) + ' 닫힘 없음]'; break; }
          const h = helper(name), on = h === null ? truthy(name) : h;
          if (on !== inv) outHtml += renderT(t.slice(c + 2, end));
          i = end + closeTag.length; continue;
        }
        if (tag.startsWith('computed::')) outHtml += showComputed(tag.slice(10));
        else outHtml += show(tag);
        i = c + 2;
      }
      return outHtml;
    };
    const body = p.tpl && TPL[p.tpl] ? '<div class="sheet-rolltemplate-' + p.tpl + ($('#dark').checked ? ' sheet-rolltemplate-darkmode' : '') + '">' + renderT(TPL[p.tpl]) + '</div>' : esc(Object.keys(p.fields).join(' '));
    const chat = $('#chat'); chat.querySelector('.empty')?.remove();
    const t = new Date(), msg = document.createElement('div'); msg.className = 'message rollresult';
    msg.innerHTML = '<span class="tstamp">' + t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0') + '</span><span class="by">' + esc(p.by) + ':</span>' + body;
    chat.append(msg); chat.parentElement.scrollTop = chat.parentElement.scrollHeight;
  }
  const chatNote = s => { const c = $('#chat'); c.insertAdjacentHTML('beforeend', '<div class="message"><b>' + esc(s) + '</b></div>'); };

  // ── 캐릭터 고르기 · 다크 모드 · 되돌리기
  const load = () => { chars = SAMPLES.map(makeChar); $('#who').innerHTML = chars.map((c, i) => '<option value="' + i + '">' + esc(c.name) + '</option>').join(''); select(0); };
  const select = i => { cur = chars[i]; $('#tt').textContent = cur.name; render(); };
  $('#who').addEventListener('change', e => select(+e.target.value));
  $('#dark').addEventListener('change', render);
  $('#reset').addEventListener('click', () => { const i = +$('#who').value; chars[i] = makeChar(SAMPLES[i]); select(i); });
  window.R20 = { get chars() { return chars; }, get cur() { return cur; }, select };
  load();
}
